import { useParams } from "react-router-dom";
import {
  AlertCircle,
  RefreshCw,
  Activity,
  Download,
  Loader2,
  BarChart3,
} from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";
import { RoundReport } from "@/components/RoundReport";
import * as htmlToImage from "html-to-image";
import {
  MatchOverview,
  MatchViolationsStatusBreakdown,
  ContentSplitChart,
  ActivityLog,
  PlatformCard,
  PlatformFilters,
  PlatformComparison,
  AddViolationSheet,
  BlockConfirmDialog,
  DeleteConfirmDialog,
  AddNoteDialog,
  getInitialContentSplitData,
  getInitialActivityLog,
  getInitialPlatformOperations,
  formatViews,
  formatViewsString,
  getKSATime,
  convertKSATimeToUTC,
  convertUTCToKSATime,
  calculateTotalViews,
  convertBackendViolationToFrontend,
  calculateAndSavePlatformStats,
  calculateAndSaveTopPlatform,
  type Violation,
  type PlatformData,
  type Match,
  type BackendViolation,
  type DeletedViolationLog,
  API_URL,
} from "@/components/MatchDashboard";
import { PlatformComparisonMobile } from "@/components/MatchDashboard/PlatformComparisonMobile";

export default function MatchDashboard() {
  const { id } = useParams<{ id: string }>();
  const { user, leagues } = useAuth();
  const { t, isRTL } = useLanguage();
  const isSuperAdmin = user?.role === "superAdmin";
  const canModifyViolations =
    user?.role === "superAdmin" || user?.role === "employee";
  const [logFilter, setLogFilter] = useState<
    | "all"
    | "added"
    | "deleted"
    | "url_changed"
    | "account_changed"
    | "content_type_changed"
    | "status_change"
    | "views_changed"
    | "time_added_changed"
    | "blocked_at_changed"
    | "notes_added"
    | "notes_edited"
    | "notes_changed"
  >("all");
  const [platformFilter, setPlatformFilter] = useState<string>("all");
  const [userFilter, setUserFilter] = useState<string>("all");
  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [contentSplitData, setContentSplitData] = useState(
    getInitialContentSplitData()
  );
  const [activityLog, setActivityLog] = useState(getInitialActivityLog());

  // Platform operations state
  const [platformOperations, setPlatformOperations] = useState<PlatformData[]>(
    getInitialPlatformOperations()
  );

  // Deleted violation logs state
  const [deletedViolationLogs, setDeletedViolationLogs] = useState<
    DeletedViolationLog[]
  >([]);

  // Settings state
  const [targetMins, setTargetMins] = useState<number>(15);

  // Refs for report components
  const matchOverviewRef = useRef<HTMLDivElement>(null);
  const statusBreakdownRef = useRef<HTMLDivElement>(null);
  const contentSplitRef = useRef<HTMLDivElement>(null);
  const platformComparisonRef = useRef<HTMLDivElement>(null);

  // Download state
  const [isDownloading, setIsDownloading] = useState(false);
  const [isRoundReportOpen, setIsRoundReportOpen] = useState(false);

  // Refetch trigger - increment this to trigger a full data refetch
  const [refetchTrigger, setRefetchTrigger] = useState(0);

  // Comprehensive function to refetch ALL data (match + violations + platform stats)
  // silent: if true, refetch without showing loading animation
  const refetchAllData = useCallback(
    async (silent: boolean = true) => {
      if (!id) return;

      // Save current scroll position
      const scrollPosition =
        window.scrollY || document.documentElement.scrollTop;

      try {
        // Only show loading animation on initial load, not on silent refetches
        if (!silent) {
          setLoading(true);
        }

        // Fetch match data
        const matchResponse = await fetch(`${API_URL}/matches/${id}`, {
          credentials: "include",
        });
        if (!matchResponse.ok) {
          throw new Error("Failed to fetch match");
        }
        const matchData = await matchResponse.json();

        // Format date if needed
        const formattedMatch: Match = {
          ...matchData,
          date: matchData.date
            ? typeof matchData.date === "string"
              ? matchData.date
              : new Date(matchData.date).toISOString().split("T")[0]
            : "",
        };

        setMatch(formattedMatch);

        // Fetch violations for this match using externalMatchId
        const violationsResponse = await fetch(
          `${API_URL}/violations?matchId=${matchData.externalMatchId}`
        );
        if (violationsResponse.ok) {
          const violations = await violationsResponse.json();

          // Group violations by platform
          const violationsByPlatform: { [key: string]: BackendViolation[] } =
            {};
          violations.forEach((violation: BackendViolation) => {
            const platformId = violation.platformId;
            if (!violationsByPlatform[platformId]) {
              violationsByPlatform[platformId] = [];
            }
            violationsByPlatform[platformId].push(violation);
          });

          // Fetch PlatformByMatch data for all platforms (backend aggregated stats)
          const platformStatsResponse = await fetch(
            `${API_URL}/platform-by-match?matchId=${matchData.externalMatchId}`
          );
          const platformStatsMap: {
            [key: string]: {
              totalViolations?: number;
              activeCount?: number;
              blockedCount?: number;
              removedCount?: number;
              underReviewCount?: number;
              totalViews?: number;
              avgBlockTime?: number;
              blockSuccessRate?: number;
            };
          } = {};
          if (platformStatsResponse.ok) {
            const platformStats = await platformStatsResponse.json();
            platformStats.forEach(
              (stat: {
                platformId: string;
                totalViolations?: number;
                activeCount?: number;
                blockedCount?: number;
                removedCount?: number;
                underReviewCount?: number;
                totalViews?: number;
                avgBlockTime?: number;
                blockSuccessRate?: number;
              }) => {
                platformStatsMap[stat.platformId] = stat;
              }
            );
          }

          // Update platform operations with violations and backend stats
          setPlatformOperations((prev) =>
            prev.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];

              // Convert backend violations to frontend format
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v)
              );

              // Get backend aggregated stats from PlatformByMatch
              const backendStats = platformStatsMap[platform.id] || {};

              // Use backend stats (from PlatformByMatch) instead of calculating
              const totalViolations =
                backendStats.totalViolations ?? convertedViolations.length;
              const activeViolations =
                backendStats.activeCount ??
                convertedViolations.filter(
                  (v) => v.status === "Active" || v.status === "Under Review"
                ).length;
              const blockedCount = backendStats.blockedCount ?? 0;
              const blockedRate =
                totalViolations > 0
                  ? Math.round((blockedCount / totalViolations) * 100)
                  : 0;
              // Format totalViews from backend (it's a number, convert to string format)
              const totalViewsNumber = backendStats.totalViews ?? 0;
              const totalViews = formatViews(totalViewsNumber);
              // Format avgBlockTime from backend (it's in minutes)
              const avgBlockTimeMinutes = backendStats.avgBlockTime ?? 0;
              const avgBlockTime =
                avgBlockTimeMinutes > 0
                  ? avgBlockTimeMinutes < 60
                    ? `${avgBlockTimeMinutes} min`
                    : avgBlockTimeMinutes < 1440
                    ? `${Math.round(avgBlockTimeMinutes / 60)}h`
                    : `${Math.round(avgBlockTimeMinutes / 1440)}d`
                  : "0 min";
              // Use blockSuccessRate directly from backend (0-100)
              const blockSuccessRate = backendStats.blockSuccessRate ?? 0;
              const blockedSuccess = `${blockSuccessRate}%`;
              // Still active count from backend
              const stillActive = backendStats.activeCount ?? 0;
              // Get removed and under review counts from backend
              const removedCount = backendStats.removedCount ?? 0;
              const underReviewCount = backendStats.underReviewCount ?? 0;

              return {
                ...platform,
                violations: convertedViolations,
                totalViolations,
                activeViolations,
                blockedCount,
                removedCount,
                underReviewCount,
                blockedRate,
                totalViews,
                avgBlockTime,
                blockedSuccess,
                blockSuccessRate,
                stillActive,
              };
            })
          );

          // Save/update stats to PlatformByMatch for all platforms (calculate and save)
          if (matchData.externalMatchId) {
            // Get initial platform operations to save stats for all platforms
            const initialPlatforms = getInitialPlatformOperations();
            initialPlatforms.forEach((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v)
              );
              // Calculate and save stats for each platform (this updates the DB)
              calculateAndSavePlatformStats(
                platform.id,
                matchData.externalMatchId,
                convertedViolations
              );
            });

            // Calculate and save top platform (platform with most views)
            if (matchData.externalMatchId) {
              calculateAndSaveTopPlatform(
                matchData.externalMatchId,
                platformOperations
              );
            }
          }

          // Chart will update automatically via useEffect when match/platformOperations change
        }

        // Fetch deleted violation logs for this match
        try {
          const deletedLogsResponse = await fetch(
            `${API_URL}/violations/deleted-logs/${matchData.externalMatchId}`,
            {
              credentials: "include",
            }
          );
          if (deletedLogsResponse.ok) {
            const deletedLogs = await deletedLogsResponse.json();
            setDeletedViolationLogs(deletedLogs || []);
          }
        } catch (error) {
          console.error("Error fetching deleted violation logs:", error);
        }

        // Restore scroll position after state updates are complete
        // Use requestAnimationFrame to ensure DOM has updated
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              top: scrollPosition,
              behavior: "instant" as ScrollBehavior,
            });
          }, 50);
        });
      } catch (error) {
        console.error("Error refetching all data:", error);
        toast({
          title: t("matchDashboard.error.title"),
          description: t("matchDashboard.error.failedToRefetch"),
          variant: "destructive",
        });
        // Restore scroll position even on error
        requestAnimationFrame(() => {
          setTimeout(() => {
            window.scrollTo({
              top: scrollPosition,
              behavior: "instant" as ScrollBehavior,
            });
          }, 50);
        });
      } finally {
        // Only hide loading animation if it was shown
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [id]
  );

  // General listener: refetch all data when refetchTrigger changes
  useEffect(() => {
    if (refetchTrigger > 0 && id) {
      // Add a small delay to ensure backend operations are complete
      const timeoutId = setTimeout(() => {
        refetchAllData(true); // Silent refetch (no loading animation)
      }, 500); // 500ms delay to ensure all writes are done

      return () => clearTimeout(timeoutId);
    }
  }, [refetchTrigger, id, refetchAllData]);

  // Helper function to trigger refetch (call this after any violation change)
  const triggerRefetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  // Fetch settings on mount
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`, {
          credentials: "include",
        });

        if (response.ok) {
          const settings = await response.json();
          setTargetMins(settings.targetMins || 15);
        }
      } catch (error) {
        console.error("Error fetching settings:", error);
        // Use default value if API fails
        setTargetMins(15);
      }
    };

    fetchSettings();
  }, []);

  // Fetch whitelisted accounts on mount
  useEffect(() => {
    const fetchWhitelistedAccounts = async () => {
      try {
        const response = await fetch(`${API_URL}/whitelisted-accounts`, {
          credentials: "include",
        });

        if (response.ok) {
          const accounts = await response.json();
          setWhitelistedAccounts(accounts || []);
        }
      } catch (error) {
        console.error("Error fetching whitelisted accounts:", error);
      }
    };

    fetchWhitelistedAccounts();
  }, []);

  // Fetch match data
  useEffect(() => {
    const fetchMatch = async () => {
      if (!id) return;

      setLoading(true);
      try {
        const response = await fetch(`${API_URL}/matches/${id}`, {
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error("Failed to fetch match");
        }
        const matchData = await response.json();

        // Format date if needed
        const formattedMatch: Match = {
          ...matchData,
          date: matchData.date
            ? typeof matchData.date === "string"
              ? matchData.date
              : new Date(matchData.date).toISOString().split("T")[0]
            : "",
        };

        setMatch(formattedMatch);

        // Fetch violations for this match using externalMatchId
        const violationsResponse = await fetch(
          `${API_URL}/violations?matchId=${matchData.externalMatchId}`
        );
        if (violationsResponse.ok) {
          const violations = await violationsResponse.json();

          // Group violations by platform
          const violationsByPlatform: { [key: string]: BackendViolation[] } =
            {};
          violations.forEach((violation: BackendViolation) => {
            const platformId = violation.platformId;
            if (!violationsByPlatform[platformId]) {
              violationsByPlatform[platformId] = [];
            }
            violationsByPlatform[platformId].push(violation);
          });

          // Fetch PlatformByMatch data for all platforms (backend aggregated stats)
          const platformStatsResponse = await fetch(
            `${API_URL}/platform-by-match?matchId=${matchData.externalMatchId}`
          );
          const platformStatsMap: {
            [key: string]: {
              totalViolations?: number;
              activeCount?: number;
              blockedCount?: number;
              removedCount?: number;
              underReviewCount?: number;
              totalViews?: number;
              avgBlockTime?: number;
              blockSuccessRate?: number;
            };
          } = {};
          if (platformStatsResponse.ok) {
            const platformStats = await platformStatsResponse.json();
            platformStats.forEach(
              (stat: {
                platformId: string;
                totalViolations?: number;
                activeCount?: number;
                blockedCount?: number;
                removedCount?: number;
                underReviewCount?: number;
                totalViews?: number;
                avgBlockTime?: number;
                blockSuccessRate?: number;
              }) => {
                platformStatsMap[stat.platformId] = stat;
              }
            );
          }

          // Update platform operations with violations and backend stats
          setPlatformOperations((prev) =>
            prev.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];

              // Convert backend violations to frontend format
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v)
              );

              // Get backend aggregated stats from PlatformByMatch
              const backendStats = platformStatsMap[platform.id] || {};

              // Use backend stats (from PlatformByMatch) instead of calculating
              const totalViolations =
                backendStats.totalViolations ?? convertedViolations.length;
              const activeViolations =
                backendStats.activeCount ??
                convertedViolations.filter(
                  (v) => v.status === "Active" || v.status === "Under Review"
                ).length;
              const blockedCount = backendStats.blockedCount ?? 0;
              const blockedRate =
                totalViolations > 0
                  ? Math.round((blockedCount / totalViolations) * 100)
                  : 0;
              // Format totalViews from backend (it's a number, convert to string format)
              const totalViewsNumber = backendStats.totalViews ?? 0;
              const totalViews = formatViews(totalViewsNumber);
              // Format avgBlockTime from backend (it's in minutes)
              const avgBlockTimeMinutes = backendStats.avgBlockTime ?? 0;
              const avgBlockTime =
                avgBlockTimeMinutes > 0
                  ? avgBlockTimeMinutes < 60
                    ? `${avgBlockTimeMinutes} min`
                    : avgBlockTimeMinutes < 1440
                    ? `${Math.round(avgBlockTimeMinutes / 60)}h`
                    : `${Math.round(avgBlockTimeMinutes / 1440)}d`
                  : "0 min";
              // Use blockSuccessRate directly from backend (0-100)
              const blockSuccessRate = backendStats.blockSuccessRate ?? 0;
              const blockedSuccess = `${blockSuccessRate}%`;
              // Still active count from backend
              const stillActive = backendStats.activeCount ?? 0;
              // Get removed and under review counts from backend
              const removedCount = backendStats.removedCount ?? 0;
              const underReviewCount = backendStats.underReviewCount ?? 0;

              return {
                ...platform,
                violations: convertedViolations,
                totalViolations,
                activeViolations,
                blockedCount,
                removedCount,
                underReviewCount,
                blockedRate,
                totalViews,
                avgBlockTime,
                blockedSuccess,
                blockSuccessRate,
                stillActive,
              };
            })
          );

          // Save stats to PlatformByMatch for all platforms
          if (matchData.externalMatchId) {
            const updatedPlatforms = platformOperations.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v)
              );
              return { platform, violations: convertedViolations };
            });

            // Save stats for each platform
            updatedPlatforms.forEach(({ platform, violations }) => {
              calculateAndSavePlatformStats(
                platform.id,
                matchData.externalMatchId,
                violations
              );
            });

            // Calculate and save top platform
            if (matchData.externalMatchId) {
              calculateAndSaveTopPlatform(
                matchData.externalMatchId,
                platformOperations
              );
            }
          }

          // Chart will update automatically via useEffect when match/platformOperations change
        }

        // Fetch deleted violation logs for this match
        try {
          const deletedLogsResponse = await fetch(
            `${API_URL}/violations/deleted-logs/${matchData.externalMatchId}`,
            {
              credentials: "include",
            }
          );
          if (deletedLogsResponse.ok) {
            const deletedLogs = await deletedLogsResponse.json();
            setDeletedViolationLogs(deletedLogs || []);
          }
        } catch (error) {
          console.error("Error fetching deleted violation logs:", error);
        }
      } catch (error) {
        console.error("Error fetching match:", error);
        toast({
          title: t("matchDashboard.error.title"),
          description: t("matchDashboard.error.failedToLoad"),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    fetchMatch();
  }, [id]);

  // Update chart when match data changes (using backend aggregated data)
  useEffect(() => {
    if (match) {
      // Use backend aggregated counts for violations
      const totalViolations = match.totalViolations || 0;
      const liveCount = match.liveCount || 0;
      const highlightsCount = match.highlightsCount || 0;
      const othersCount = match.othersCount || 0;

      // Calculate views from violations (backend doesn't store views per content type)
      // This is the only frontend calculation needed for the chart
      const allViolations = platformOperations.flatMap((p) => p.violations);
      const liveViews = allViolations
        .filter((v) => (v.contentType || v.type) === "Live")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          // Remove all non-numeric characters except commas, then parse
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      const highlightsViews = allViolations
        .filter((v) => (v.contentType || v.type) === "Highlights")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          // Remove all non-numeric characters except commas, then parse
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      const othersViews = allViolations
        .filter((v) => (v.contentType || v.type) === "Other")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          // Remove all non-numeric characters except commas, then parse
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      const totalViews = liveViews + highlightsViews + othersViews;

      setContentSplitData([
        {
          name: "Total Violations",
          value: totalViews,
          violations: totalViolations, // From backend
          color: "hsl(var(--chart-4))",
        },
        {
          name: "Live",
          value: liveViews,
          violations: liveCount, // From backend
          color: "hsl(var(--chart-1))",
        },
        {
          name: "Highlights",
          value: highlightsViews,
          violations: highlightsCount, // From backend
          color: "hsl(var(--chart-2))",
        },
        {
          name: "Others",
          value: othersViews,
          violations: othersCount, // From backend
          color: "hsl(var(--chart-3))",
        },
      ]);
    }
    // Depend on match and platformOperations to recalculate when violations change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, platformOperations]);

  // Platform slot system (max 2 platforms visible)
  const [selectedSlots, setSelectedSlots] = useState<string[]>([
    "twitter",
    "youtube",
  ]);
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [platformCardFilter, setPlatformCardFilter] = useState<{
    [key: string]: string;
  }>({});
  const [platformSearchQuery, setPlatformSearchQuery] = useState<{
    [key: string]: string;
  }>({});

  // Add/Edit violation state
  const [isAddViolationOpen, setIsAddViolationOpen] = useState(false);
  const [selectedPlatformForAdd, setSelectedPlatformForAdd] =
    useState<string>("");
  const [editingViolation, setEditingViolation] = useState<Violation | null>(
    null
  );
  const [isEditMode, setIsEditMode] = useState(false);

  // Form state
  const [formUrl, setFormUrl] = useState("");
  const [formAccountHandle, setFormAccountHandle] = useState("");
  const [formContentType, setFormContentType] = useState("live");
  const [formStatus, setFormStatus] = useState<
    "Active" | "Blocked" | "Removed" | "Under Review"
  >("Active");
  const [formViews, setFormViews] = useState("");
  const [formTimeAdded, setFormTimeAdded] = useState(getKSATime());
  const [formBlockedAt, setFormBlockedAt] = useState("");
  const [formStillActive, setFormStillActive] = useState(false);
  const [formNotes, setFormNotes] = useState<string[]>([]);

  // Block confirmation dialog state
  const [isBlockConfirmOpen, setIsBlockConfirmOpen] = useState(false);
  const [blockConfirmViolation, setBlockConfirmViolation] = useState<{
    platformId: string;
    violationId: number | string;
    violation: Violation;
  } | null>(null);
  const [blockTimeChoice, setBlockTimeChoice] = useState<"current" | "custom">(
    "current"
  );
  const [customBlockTime, setCustomBlockTime] = useState(getKSATime());

  // Delete confirmation dialog state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deleteConfirmViolation, setDeleteConfirmViolation] = useState<{
    platformId: string;
    violationId: number | string;
  } | null>(null);

  // Add note dialog state
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteViolation, setNoteViolation] = useState<{
    platformId: string;
    violation: Violation;
  } | null>(null);

  // Whitelist confirmation dialog state
  const [isWhitelistConfirmOpen, setIsWhitelistConfirmOpen] = useState(false);
  const [pendingViolationData, setPendingViolationData] = useState<{
    violationData: {
      matchId: string;
      matchName: string;
      platformId: string;
      platformName: string;
      violationUrl: string;
      accountChannel: string;
      contentType: "Live" | "Highlights" | "Other";
      status: "Active" | "Blocked" | "Removed" | "Under Review";
      views?: string;
      timeAdded: string;
      blockedAt?: string | null;
      notes: string[];
    };
    isEditMode: boolean;
    editingViolation: Violation | null;
  } | null>(null);
  const [whitelistedAccounts, setWhitelistedAccounts] = useState<
    Array<{
      accountChannel: string;
      platforms: string[];
      platformNames?: { [key: string]: string };
    }>
  >([]);

  // Platform comparison state
  const [comparisonSort, setComparisonSort] = useState<
    | "views"
    | "violations"
    | "active"
    | "blocked"
    | "removed"
    | "avgBlockTime"
    | "underReview"
  >("views");
  const [comparisonSortDirection, setComparisonSortDirection] = useState<
    "desc" | "asc"
  >("desc");

  // Match report state

  // Helper to get competition name
  const getCompetitionName = () => {
    if (!match) return "";
    if (typeof match.competition === "object" && match.competition !== null) {
      return (
        (match.competition as { knownName?: string; name?: string })
          .knownName ||
        (match.competition as { name?: string }).name ||
        ""
      );
    }
    return typeof match.competition === "string" ? match.competition : "";
  };

  // Helper to get platform color
  const getPlatformColor = (platform: string | null) => {
    switch (platform) {
      case "Twitter":
        return "hsl(203 89% 53%)";
      case "YouTube":
        return "hsl(0 100% 50%)";
      case "Facebook":
        return "hsl(221 44% 41%)";
      case "TikTok":
        return "hsl(0 0% 0%)";
      case "Instagram":
        return "hsl(329 100% 50%)";
      case "Telegram":
        return "hsl(200 100% 48%)";
      default:
        return "hsl(var(--muted-foreground))";
    }
  };

  // Helper to get platform icon
  const getPlatformIcon = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) return <Activity className="h-3.5 w-3.5" />;
    const IconComponent = platform.icon;
    return (
      <IconComponent
        className="h-3.5 w-3.5"
        style={{ color: platform.color }}
      />
    );
  };

  // Add platform to slot
  const addPlatformToSlot = (platformId: string) => {
    if (selectedSlots.length < 2) {
      setSelectedSlots([...selectedSlots, platformId]);
    } else {
      // Replace the second slot
      setSelectedSlots([selectedSlots[0], platformId]);
    }
  };

  // Remove platform from slot
  const removePlatformFromSlot = (platformId: string) => {
    setSelectedSlots(selectedSlots.filter((id) => id !== platformId));
  };

  // Available platforms (not in slots)
  const availablePlatforms = platformOperations.filter(
    (p) => !selectedSlots.includes(p.id)
  );

  // Get filtered violations for a platform card
  const getFilteredViolations = (
    platformId: string,
    violations: Violation[]
  ) => {
    const cardFilter = platformCardFilter[platformId] || "all";
    const searchQuery = platformSearchQuery[platformId] || "";
    let filtered = violations;

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (v) =>
          v.url.toLowerCase().includes(query) ||
          (v.accountHandle && v.accountHandle.toLowerCase().includes(query))
      );
    }

    // Apply card filter (All/Active/Blocked/Removed/Review)
    if (cardFilter !== "all") {
      if (cardFilter === "active") {
        filtered = filtered.filter((v) =>
          ["Reported", "Active", "Pending"].includes(v.statusBadge)
        );
      } else if (cardFilter === "removed") {
        filtered = filtered.filter((v) => v.statusBadge === "Removed");
      } else {
        // Map lowercase filter to capitalized statusBadge
        const statusMap: Record<string, string> = {
          blocked: "Blocked",
          review: "Review",
        };
        const statusBadge = statusMap[cardFilter] || cardFilter;
        filtered = filtered.filter((v) => v.statusBadge === statusBadge);
      }
    }

    // Apply content type filter
    if (contentTypeFilter !== "all") {
      filtered = filtered.filter(
        (v) => v.type.toLowerCase() === contentTypeFilter
      );
    }

    // Sort by timeAdded (most recent first)
    filtered = filtered.sort((a, b) => {
      const timeA = a.timeAdded ? new Date(a.timeAdded).getTime() : 0;
      const timeB = b.timeAdded ? new Date(b.timeAdded).getTime() : 0;
      return timeB - timeA; // Descending order (most recent first)
    });

    return filtered;
  };

  // Open add violation drawer
  const openAddViolationDrawer = (platformId: string) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(false);
    setEditingViolation(null);
    // Reset form
    setFormUrl("");
    setFormAccountHandle("");
    setFormContentType("live");
    setFormStatus("Active");
    setFormViews("");
    setFormTimeAdded(getKSATime());
    setFormBlockedAt("");
    setFormStillActive(false);
    setFormNotes([]);
    setIsAddViolationOpen(true);
  };

  // Open edit violation drawer
  const openEditViolationDrawer = (
    platformId: string,
    violation: Violation
  ) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(true);
    setEditingViolation(violation);
    // Pre-fill form
    setFormUrl(violation.violationUrl || violation.url || "");
    setFormAccountHandle(
      violation.accountChannel || violation.accountHandle || ""
    );
    setFormContentType(
      (violation.contentType || violation.type || "live").toLowerCase()
    );
    // Map old status values to new ones
    const statusMap: Record<
      string,
      "Active" | "Blocked" | "Removed" | "Under Review"
    > = {
      reported: "Active",
      active: "Active",
      Active: "Active",
      blocked: "Blocked",
      Blocked: "Blocked",
      removed: "Removed",
      Removed: "Removed",
      review: "Under Review",
      "under review": "Under Review",
      "Under Review": "Under Review",
      pending: "Active",
    };
    setFormStatus(statusMap[violation.status] || "Active");
    // Remove all non-numeric characters except commas
    setFormViews(violation.views.replace(/[^0-9,]/g, ""));
    // Convert timeAdded from UTC to KSA time for datetime-local input
    setFormTimeAdded(
      violation.timeAdded
        ? convertUTCToKSATime(violation.timeAdded)
        : getKSATime()
    );
    // Convert blockedAt from UTC to KSA time for datetime-local input
    setFormBlockedAt(
      violation.blockedAt ? convertUTCToKSATime(violation.blockedAt) : ""
    );
    setFormStillActive(
      violation.active !== undefined
        ? violation.active
        : violation.stillActive || false
    );
    setFormNotes(
      Array.isArray(violation.notes)
        ? violation.notes
        : violation.notes
        ? [violation.notes]
        : []
    );
    setIsAddViolationOpen(true);
  };

  // Toggle violation status (quick block/unblock)
  const toggleViolationStatus = (
    platformId: string,
    violationId: number | string
  ) => {
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    const violation = platform.violations.find(
      (v) => v.id === violationId || v._id === violationId
    );
    if (!violation) return;

    const isCurrentlyBlocked = violation.status === "Blocked";
    const isCurrentlyRemoved = violation.status === "Removed";

    if (isCurrentlyBlocked || isCurrentlyRemoved) {
      // Directly set to Active (Blocked -> Active or Removed -> Active)
      const setToActive = async () => {
        try {
          const violationDbId =
            (violation as Violation & { _id?: string })._id ||
            violation.id.toString();

          // Update status in backend
          const response = await fetch(
            `${API_URL}/violations/${violationDbId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                status: "Active",
              }),
            }
          );

          if (!response.ok) {
            throw new Error("Failed to update violation status");
          }

          // Get the updated violation from the response
          const updatedViolationData = await response.json();
          const convertedViolation =
            convertBackendViolationToFrontend(updatedViolationData);

          // Find current platform and calculate updated violations
          const currentPlatform = platformOperations.find(
            (p) => p.id === platformId
          );
          if (!currentPlatform) {
            throw new Error("Platform not found");
          }

          const updatedViolations = currentPlatform.violations.map((v) => {
            if (v.id !== violationId) return v;

            return {
              ...v,
              status: "Active" as const,
              statusBadge: "Active" as const,
              blockedAt: undefined, // Clear blockedAt when unblocking
            };
          });

          // Update local state - only update violations list, metrics will come from backend refetch
          setPlatformOperations((prev) =>
            prev.map((p) => {
              if (p.id !== platformId) return p;
              // Just update violations, keep existing metrics (will be updated by refetch)
              return {
                ...p,
                violations: updatedViolations,
              };
            })
          );

          // Save stats to PlatformByMatch
          if (match?.externalMatchId) {
            calculateAndSavePlatformStats(
              platformId,
              match.externalMatchId,
              updatedViolations
            );
            // Update top platform
            calculateAndSaveTopPlatform(
              match.externalMatchId,
              platformOperations
            );
          }

          // Trigger refetch of all data
          triggerRefetch();

          toast({
            title: t("matchDashboard.success.statusChangedToActive"),
            description: t("matchDashboard.success.violationNowActive"),
          });
        } catch (error) {
          console.error("Error setting violation to active:", error);
          toast({
            title: t("matchDashboard.error.title"),
            description: t("matchDashboard.error.failedToChangeStatus"),
            variant: "destructive",
          });
        }
      };

      setToActive();
    } else {
      // Show confirmation dialog for Active/Under Review -> Blocked
      setBlockConfirmViolation({ platformId, violationId, violation });
      setBlockTimeChoice("current");
      setCustomBlockTime(getKSATime());
      setIsBlockConfirmOpen(true);
    }
  };

  // Confirm block with chosen time
  const confirmBlock = async () => {
    if (!blockConfirmViolation) return;

    const { platformId, violationId, violation } = blockConfirmViolation;
    // Convert block time to UTC (customBlockTime is in KSA time from datetime-local input)
    const blockTime =
      blockTimeChoice === "current"
        ? new Date().toISOString() // Current time is already in UTC
        : customBlockTime
        ? convertKSATimeToUTC(customBlockTime) // Convert KSA time to UTC
        : new Date().toISOString();

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      // Update status in backend
      const response = await fetch(
        `${API_URL}/violations/${violationDbId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            status: "Blocked",
            blockedAt: blockTime,
          }),
        }
      );

      if (!response.ok) {
        throw new Error("Failed to update violation status");
      }

      // Get the updated violation from the response
      const updatedViolationData = await response.json();
      const convertedViolation =
        convertBackendViolationToFrontend(updatedViolationData);

      // Find the current platform to calculate updated violations
      const currentPlatform = platformOperations.find(
        (p) => p.id === platformId
      );
      if (!currentPlatform) {
        throw new Error("Platform not found");
      }

      // Calculate updated violations
      const updatedViolations = currentPlatform.violations.map((v) => {
        if (v.id !== violationId && v._id !== violationId) return v;

        return {
          ...v,
          status: "Blocked" as const,
          statusBadge: "Blocked" as const,
          blockedAt: convertedViolation.blockedAt || blockTime,
        };
      });

      // Update local state - only update violations list, metrics will come from backend refetch
      setPlatformOperations((prev) =>
        prev.map((platform) => {
          if (platform.id !== platformId) return platform;
          // Just update violations, keep existing metrics (will be updated by refetch)
          return {
            ...platform,
            violations: updatedViolations,
          };
        })
      );

      // Save stats to PlatformByMatch - use the updatedViolations we just calculated
      if (match?.externalMatchId) {
        calculateAndSavePlatformStats(
          platformId,
          match.externalMatchId,
          updatedViolations
        );
      }

      // Trigger refetch of all data
      triggerRefetch();

      toast({
        title: t("matchDashboard.success.violationBlocked"),
        description: t("matchDashboard.success.violationBlockedAt", {
          time: new Date(blockTime).toLocaleString(isRTL ? "ar-SA" : "en-US")
        }),
      });

      setIsBlockConfirmOpen(false);
      setBlockConfirmViolation(null);
    } catch (error) {
      console.error("Error blocking violation:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.failedToBlock"),
        variant: "destructive",
      });
    }
  };

  // Check if account is whitelisted (exact match only, no contains/substring)
  // If platform-specific name exists, ONLY check that name for that platform
  // Otherwise, check the main account name
  const checkWhitelistedAccount = (
    accountChannel: string,
    platformId: string
  ): boolean => {
    const normalizedInput = accountChannel.trim().toLowerCase();

    return whitelistedAccounts.some((account) => {
      if (!account.platforms.includes(platformId)) {
        return false;
      }

      // If platform-specific name exists, ONLY check that name (not the main name)
      if (account.platformNames && account.platformNames[platformId]) {
        const platformName = account.platformNames[platformId]
          .trim()
          .toLowerCase();
        return platformName === normalizedInput;
      }

      // No platform-specific name, check main account name
      const mainName = account.accountChannel.trim().toLowerCase();
      return mainName === normalizedInput;
    });
  };

  // Actually save the violation (called after whitelist confirmation or if not whitelisted)
  const actuallySaveViolation = async (
    violationData: {
      matchId: string;
      matchName: string;
      platformId: string;
      platformName: string;
      violationUrl: string;
      accountChannel: string;
      contentType: "Live" | "Highlights" | "Other";
      status: "Active" | "Blocked" | "Removed" | "Under Review";
      views?: string;
      timeAdded: string;
      blockedAt?: string | null;
      notes: string[];
    },
    isEditMode: boolean,
    editingViolation: Violation | null
  ) => {
    if (!match) return;

    const platform = platformOperations.find(
      (p) => p.id === violationData.platformId
    );
    if (!platform) return;

    try {
      if (isEditMode && editingViolation) {
        // Update existing violation - use _id if available, otherwise id
        const violationId =
          (editingViolation as Violation & { _id?: string })._id ||
          editingViolation.id.toString();
        const response = await fetch(`${API_URL}/violations/${violationId}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(violationData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to update violation");
        }

        const updatedViolation = await response.json();

        // Update local state - convert backend format to frontend display format
        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = p.violations.map((v) => {
              if (
                v.id === editingViolation.id ||
                v._id === editingViolation._id
              ) {
                return convertBackendViolationToFrontend(updatedViolation);
              }
              return v;
            });

            // Just update violations, keep existing metrics (will be updated by refetch)
            return {
              ...p,
              violations: updatedViolations,
            };
          })
        );

        // Save stats to PlatformByMatch
        if (match?.externalMatchId) {
          const updatedPlatform = platformOperations.find(
            (p) => p.id === selectedPlatformForAdd
          );
          if (updatedPlatform) {
            const platformViolations = updatedPlatform.violations.map((v) => {
              if (
                v.id === editingViolation.id ||
                v._id === editingViolation._id
              ) {
                return convertBackendViolationToFrontend(updatedViolation);
              }
              return v;
            });
            calculateAndSavePlatformStats(
              selectedPlatformForAdd,
              match.externalMatchId,
              platformViolations
            );
          }
        }

        // Trigger refetch of all data
        triggerRefetch();

        toast({
          title: t("matchDashboard.success.violationUpdated"),
          description: t("matchDashboard.success.changesSaved"),
        });
      } else {
        // Add new violation
        const response = await fetch(`${API_URL}/violations`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify(violationData),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to add violation");
        }

        const newViolation = await response.json();

        // Convert backend violation to frontend format
        const frontendViolation =
          convertBackendViolationToFrontend(newViolation);

        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = [frontendViolation, ...p.violations];

            // Just update violations, keep existing metrics (will be updated by refetch)
            return {
              ...p,
              violations: updatedViolations,
            };
          })
        );

        // Save stats to PlatformByMatch
        if (match?.externalMatchId) {
          const updatedPlatform = platformOperations.find(
            (p) => p.id === selectedPlatformForAdd
          );
          if (updatedPlatform) {
            const platformViolations = [
              frontendViolation,
              ...updatedPlatform.violations,
            ];
            calculateAndSavePlatformStats(
              selectedPlatformForAdd,
              match.externalMatchId,
              platformViolations
            );
          }
        }

        // Trigger refetch of all data
        triggerRefetch();

        toast({
          title: "Violation added",
          description: `New violation added to ${violationData.platformName}`,
        });
      }

      setIsAddViolationOpen(false);
    } catch (error) {
      console.error("Error saving violation:", error);
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : t("matchDashboard.error.failedToSave"),
        variant: "destructive",
      });
    }
  };

  // Save violation (add or edit) - with whitelist check
  const saveViolation = async () => {
    if (!formUrl) {
      toast({
        title: "Validation Error",
        description: "Violation URL is required",
        variant: "destructive",
      });
      return;
    }

    if (!formAccountHandle) {
      toast({
        title: "Validation Error",
        description: "Account / Channel is required",
        variant: "destructive",
      });
      return;
    }

    if (!match) {
      toast({
        title: "Error",
        description: "Match not found",
        variant: "destructive",
      });
      return;
    }

    const platform = platformOperations.find(
      (p) => p.id === selectedPlatformForAdd
    );
    if (!platform) return;

    // Map contentType to match backend schema exactly: "Live", "Highlights", or "Other"
    let contentType: "Live" | "Highlights" | "Other" = "Other";
    if (formContentType.toLowerCase() === "live") {
      contentType = "Live";
    } else if (formContentType.toLowerCase() === "highlights") {
      contentType = "Highlights";
    }

    // Map status to match backend schema exactly: "Active", "Blocked", "Removed", "Under Review"
    const status: "Active" | "Blocked" | "Removed" | "Under Review" =
      formStatus;

    // Handle blockedAt:
    let blockedAtValue: string | null | undefined = undefined;
    if (formStatus === "Blocked") {
      blockedAtValue = formBlockedAt
        ? convertKSATimeToUTC(formBlockedAt)
        : undefined;
    } else if (
      formStatus === "Active" ||
      formStatus === "Removed" ||
      formStatus === "Under Review"
    ) {
      blockedAtValue = null;
    }

    const violationData = {
      matchId: match.externalMatchId,
      matchName: `${match.team1} vs ${match.team2}`,
      platformId: platform.id,
      platformName: platform.name,
      violationUrl: formUrl,
      accountChannel: formAccountHandle,
      contentType,
      status,
      views: formViews
        ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
        : undefined,
      timeAdded: convertKSATimeToUTC(formTimeAdded),
      blockedAt: blockedAtValue,
      notes: formNotes.filter((note) => note.trim() !== ""),
    };

    // Check if account is whitelisted (only for new violations, not edits)
    if (
      !isEditMode &&
      checkWhitelistedAccount(formAccountHandle, platform.id)
    ) {
      // Show confirmation dialog
      setPendingViolationData({
        violationData,
        isEditMode,
        editingViolation,
      });
      setIsWhitelistConfirmOpen(true);
      return;
    }

    // Not whitelisted or editing, proceed with save
    await actuallySaveViolation(violationData, isEditMode, editingViolation);
  };

  // Confirm whitelist violation save
  const confirmWhitelistSave = async () => {
    if (!pendingViolationData) return;

    setIsWhitelistConfirmOpen(false);
    await actuallySaveViolation(
      pendingViolationData.violationData,
      pendingViolationData.isEditMode,
      pendingViolationData.editingViolation
    );
    setPendingViolationData(null);
  };

  // Delete violation - show confirmation dialog
  const deleteViolation = (
    platformId: string,
    violationId: number | string
  ) => {
    setDeleteConfirmViolation({ platformId, violationId });
    setIsDeleteConfirmOpen(true);
  };

  // Confirm delete violation
  const confirmDeleteViolation = async () => {
    if (!deleteConfirmViolation) return;

    const { platformId, violationId } = deleteConfirmViolation;
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    const violation = platform.violations.find(
      (v) => v.id === violationId || v._id === violationId
    );
    if (!violation) return;

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      const response = await fetch(`${API_URL}/violations/${violationDbId}`, {
        method: "DELETE",
        credentials: "include",
      });

      if (!response.ok) {
        throw new Error(t("matchDashboard.error.failedToDelete"));
      }

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          const updatedViolations = p.violations.filter(
            (v) => v.id !== violationId && v._id !== violationId
          );

          // Just update violations, keep existing metrics (will be updated by refetch)
          return {
            ...p,
            violations: updatedViolations,
          };
        })
      );

      // Save stats to PlatformByMatch
      if (match?.externalMatchId) {
        const updatedPlatform = platformOperations.find(
          (p) => p.id === platformId
        );
        if (updatedPlatform) {
          const platformViolations = updatedPlatform.violations.filter(
            (v) => v.id !== violationId && v._id !== violationId
          );
          calculateAndSavePlatformStats(
            platformId,
            match.externalMatchId,
            platformViolations
          );
        }
      }

      // Trigger refetch of all data
      triggerRefetch();

      toast({
        title: "Violation deleted",
        description: "Violation has been removed successfully",
      });

      setIsDeleteConfirmOpen(false);
      setDeleteConfirmViolation(null);
    } catch (error) {
      console.error("Error deleting violation:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.failedToDelete"),
        variant: "destructive",
      });
    }
  };

  // Copy violation URL
  const copyViolationUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: "URL copied",
      description: "Violation URL copied to clipboard",
    });
  };

  // Open add note dialog
  const openAddNoteDialog = (platformId: string, violation: Violation) => {
    setNoteViolation({ platformId, violation });
    setIsAddNoteOpen(true);
  };

  // Save note to violation
  const saveNote = async (note: string) => {
    if (!noteViolation) return;

    const { platformId, violation } = noteViolation;
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    try {
      const violationDbId =
        (violation as Violation & { _id?: string })._id ||
        violation.id.toString();

      // Get current notes and add the new one
      const currentNotes = Array.isArray(violation.notes)
        ? violation.notes
        : [];
      const updatedNotes = [...currentNotes, note];

      // Update violation with new note
      const response = await fetch(`${API_URL}/violations/${violationDbId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          notes: updatedNotes,
        }),
      });

      if (!response.ok) {
        throw new Error(t("matchDashboard.error.failedToAddNote"));
      }

      const updatedViolation = await response.json();

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          const updatedViolations = p.violations.map((v) => {
            if (v.id === violation.id || v._id === violation._id) {
              return convertBackendViolationToFrontend(updatedViolation);
            }
            return v;
          });

          return {
            ...p,
            violations: updatedViolations,
            // Metrics will be updated by refetch from backend
          };
        })
      );

      // Trigger refetch of all data
      triggerRefetch();

      toast({
        title: t("matchDashboard.success.noteAdded"),
        description: t("matchDashboard.success.noteAddedSuccess"),
      });

      setIsAddNoteOpen(false);
      setNoteViolation(null);
    } catch (error) {
      console.error("Error adding note:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.failedToAddNote"),
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <RefreshCw className="h-6 w-6 sm:h-8 sm:w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.loading")}
          </p>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
      <div className="flex items-center justify-center h-48 sm:h-64">
        <div className="text-center">
          <AlertCircle className="h-6 w-6 sm:h-8 sm:w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.matchNotFound")}
          </p>
        </div>
      </div>
    );
  }

  // Calculate KPIs from platform operations
  // Use stats directly from match object (aggregated from backend)
  const totalViolations = match.totalViolations || 0;
  const totalActive = match.activeCount || 0;
  const totalBlocked = match.blockedCount || 0;
  const totalRemoved = match.removedCount || 0;
  const totalUnderReview = match.underReviewCount || 0;
  const blockSuccessRate = match.blockSuccessRate || 0;
  const blockedRate = blockSuccessRate;
  const totalViews = match.totalViews || 0;
  const formattedTotalViews = totalViews.toLocaleString("en-US");
  const avgBlockTimeNumber = match.avgBlockTime || 0;
  const avgBlockTime =
    avgBlockTimeNumber > 0 ? avgBlockTimeNumber.toFixed(1) : "0";

  // Find top platform from backend or fallback to calculation
  let topPlatform: PlatformData | null = null;
  if (match.topPlatformId) {
    // Use backend topPlatformId to find the platform
    topPlatform =
      platformOperations.find((p) => p.id === match.topPlatformId) || null;
  }
  // Fallback: calculate from platformOperations if backend doesn't have it
  if (!topPlatform && platformOperations.length > 0) {
    topPlatform = platformOperations.reduce((top, p) => {
      const pViews = parseInt(p.totalViews.replace(/[^0-9]/g, "")) || 0;
      const topViews =
        parseInt((top?.totalViews || "0").replace(/[^0-9]/g, "")) || 0;
      return pViews > topViews ? p : top;
    }, platformOperations[0] || null);
  }

  // Download report as PNG
  const handleDownloadReport = async () => {
    if (!match) {
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.matchDataNotAvailable"),
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);
    try {
      const images: string[] = [];

      // Get target width from MatchOverview to match all components
      let targetWidth = 1200; // Default width
      if (matchOverviewRef.current) {
        const overviewRect = matchOverviewRef.current.getBoundingClientRect();
        targetWidth = overviewRect.width;
      }

      // Create and capture header with match details
      const headerDiv = document.createElement("div");
      headerDiv.style.cssText = `
        width: ${targetWidth}px;
        padding: 40px;
        background-color: #ffffff;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      `;

      // Get match details
      const getCompetitionName = () => {
        if (
          typeof match.competition === "object" &&
          match.competition !== null
        ) {
          return (
            (match.competition as { knownName?: string; name?: string })
              .knownName ||
            (match.competition as { name?: string }).name ||
            ""
          );
        }
        return typeof match.competition === "string" ? match.competition : "";
      };

      const formatMatchDateTime = () => {
        const dateStr = match.date;
        const timeStr = match.time || "";
        if (!dateStr) return "";

        try {
          const date = new Date(dateStr);
          const formattedDate = date.toLocaleDateString("en-US", {
            day: "numeric",
            month: "long",
            year: "numeric",
          });
          return timeStr ? `${formattedDate} at ${timeStr}` : formattedDate;
        } catch {
          return dateStr + (timeStr ? ` at ${timeStr}` : "");
        }
      };

      const competitionName = getCompetitionName();
      const matchDateTime = formatMatchDateTime();
      // Check if league is a cup using competitionType from backend
      const leagueInfo = leagues?.find((l) => l.league === match.league);
      const isSuperCup = leagueInfo?.competitionType === "cup";
      const weekOrStage = isSuperCup
        ? match.stage || "N/A"
        : match.week || "N/A";
      const weekOrStageLabel = isSuperCup ? "Stage" : "Week";

      headerDiv.innerHTML = `
        <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 16px 0; color: #1a1a1a;">
          ${match.team1} ${t("matchDashboard.report.vs")} ${match.team2}
        </h1>
        <div style="font-size: 18px; color: #666; line-height: 1.8;">
          <p style="margin: 0 0 8px 0;"><strong>${t("matchDashboard.report.league")}</strong> ${
            competitionName || "N/A"
          }</p>
          <p style="margin: 0 0 8px 0;"><strong>${weekOrStageLabel}:</strong> ${weekOrStage}</p>
          <p style="margin: 0;"><strong>${t("matchDashboard.report.dateTime")}</strong> ${
            matchDateTime || "N/A"
          }</p>
            </div>
      `;

      // Temporarily add to DOM for capture
      document.body.appendChild(headerDiv);

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture header
      const headerImage = await htmlToImage.toPng(headerDiv, {
        backgroundColor: "#ffffff",
        quality: 1,
        pixelRatio: 2,
        width: targetWidth,
      });

      // Remove from DOM
      document.body.removeChild(headerDiv);

      images.push(headerImage);

      // Capture MatchOverview
      if (matchOverviewRef.current) {
        const dataUrl = await htmlToImage.toPng(matchOverviewRef.current, {
          backgroundColor: "#ffffff",
          quality: 1,
          pixelRatio: 2,
        });
        images.push(dataUrl);
      }

      // Capture Status Breakdown
      if (statusBreakdownRef.current) {
        const dataUrl = await htmlToImage.toPng(statusBreakdownRef.current, {
          backgroundColor: "#ffffff",
          quality: 1,
          pixelRatio: 2,
        });
        images.push(dataUrl);
      }

      // Capture Content Split Chart - make it full width but match other components' width
      if (contentSplitRef.current) {
        // First, get the width from MatchOverview to match it
        let targetWidth = 1200; // Default width
        if (matchOverviewRef.current) {
          const overviewRect = matchOverviewRef.current.getBoundingClientRect();
          targetWidth = overviewRect.width;
        }

        const element = contentSplitRef.current;
        const originalStyle = element.style.cssText;

        // Find and modify the grid parent container
        const gridParent = element.closest(".grid");
        const originalGridStyle = gridParent
          ? (gridParent as HTMLElement).style.cssText
          : "";
        const originalGridClass = gridParent ? gridParent.className : "";

        // Store all parent styles to restore later
        const parentStyles: Array<{
          element: HTMLElement;
          originalStyle: string;
        }> = [];
        let currentParent = element.parentElement;
        while (currentParent) {
          parentStyles.push({
            element: currentParent,
            originalStyle: currentParent.style.cssText,
          });
          currentParent = currentParent.parentElement;
        }

        // Make element match the target width
        element.style.width = `${targetWidth}px`;
        element.style.maxWidth = "none";
        element.style.margin = "0";

        // Modify grid parent to single column and match width
        if (gridParent) {
          (gridParent as HTMLElement).style.display = "block";
          (gridParent as HTMLElement).style.width = `${targetWidth}px`;
          (gridParent as HTMLElement).style.maxWidth = "none";
          (gridParent as HTMLElement).style.gridTemplateColumns = "none";
        }

        // Modify all parent containers
        parentStyles.forEach(({ element: parentEl }) => {
          parentEl.style.width = `${targetWidth}px`;
          parentEl.style.maxWidth = "none";
        });

        // Wait for styles to apply
        await new Promise((resolve) => setTimeout(resolve, 200));

        const dataUrl = await htmlToImage.toPng(element, {
          backgroundColor: "#ffffff",
          quality: 1,
          pixelRatio: 2,
          width: targetWidth,
        });

        // Restore original styles
        element.style.cssText = originalStyle;
        if (gridParent) {
          (gridParent as HTMLElement).style.cssText = originalGridStyle;
          gridParent.className = originalGridClass;
        }
        parentStyles.forEach(
          ({ element: parentEl, originalStyle: origStyle }) => {
            parentEl.style.cssText = origStyle;
          }
        );

        images.push(dataUrl);
      }

      // Capture Platform Comparison
      if (platformComparisonRef.current) {
        const dataUrl = await htmlToImage.toPng(platformComparisonRef.current, {
          backgroundColor: "#ffffff",
          quality: 1,
          pixelRatio: 2,
        });
        images.push(dataUrl);
      }

      if (images.length === 0) {
        throw new Error(t("matchDashboard.error.noComponentsFound"));
      }

      // Create a canvas to combine all images
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        throw new Error(t("matchDashboard.error.couldNotGetCanvasContext"));
      }

      // Load all images and calculate total height
      const imagePromises = images.map((url) => {
        return new Promise<HTMLImageElement>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve(img);
          img.onerror = reject;
          img.src = url;
        });
      });

      const loadedImages = await Promise.all(imagePromises);
      const maxWidth = Math.max(...loadedImages.map((img) => img.width));
      const totalHeight = loadedImages.reduce(
        (sum, img) => sum + img.height,
        0
      );

      // Set canvas dimensions
      canvas.width = maxWidth;
      canvas.height = totalHeight;

      // Draw all images vertically
      let currentY = 0;
      loadedImages.forEach((img) => {
        ctx.drawImage(img, 0, currentY);
        currentY += img.height;
      });

      // Convert to blob and download
      canvas.toBlob((blob) => {
        if (!blob) {
          throw new Error(t("matchDashboard.error.failedToCreateImageBlob"));
        }

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;

        // Format filename with week or stage
        const leagueInfo = leagues?.find((l) => l.league === match.league);
        const isSuperCup = leagueInfo?.competitionType === "cup";
        const weekOrStage = isSuperCup
          ? match.stage || "N/A"
          : match.week || "N/A";
        const weekOrStageFormatted = weekOrStage
          .toString()
          .replace(/\s+/g, "-");
        const dateFormatted = new Date().toISOString().split("T")[0];
        const label = isSuperCup ? t("matchDashboard.report.stage") : t("matchDashboard.report.week");
        link.download = `Match-Report-${label}-${weekOrStageFormatted}-${match.team1}-${t("matchDashboard.report.vs")}-${match.team2}-${dateFormatted}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        toast({
          title: t("matchDashboard.success.reportDownloaded"),
          description: t("matchDashboard.success.reportDownloadedSuccess"),
        });
      }, "image/png");
    } catch (error) {
      console.error("Error generating report:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description:
          error instanceof Error ? error.message : t("matchDashboard.error.failedToGenerateReport"),
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      <div ref={matchOverviewRef}>
        <MatchOverview
          match={match}
          totalViolations={totalViolations}
          totalBlocked={totalBlocked}
          totalActive={totalActive}
          blockedRate={blockedRate}
          formattedTotalViews={formattedTotalViews}
          avgBlockTime={avgBlockTime}
          topPlatform={topPlatform}
          totalViews={totalViews}
          activeCount={totalActive}
          blockedCount={totalBlocked}
          removedCount={totalRemoved}
          underReviewCount={totalUnderReview}
          avgBlockTimeNumber={avgBlockTimeNumber}
          blockSuccessRate={blockSuccessRate}
          targetMins={targetMins}
          onDownloadReport={handleDownloadReport}
          isDownloading={isDownloading}
          onRoundReport={() => setIsRoundReportOpen(true)}
        />
      </div>

      <div ref={statusBreakdownRef}>
        <MatchViolationsStatusBreakdown
          totalViolations={totalViolations}
          activeCount={totalActive}
          blockedCount={totalBlocked}
          removedCount={totalRemoved}
          underReviewCount={totalUnderReview}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        <div ref={contentSplitRef} className="lg:col-span-1">
          <ContentSplitChart data={contentSplitData} />
        </div>
        <div className="lg:col-span-2">
          <ActivityLog
            log={activityLog}
            filter={logFilter}
            onFilterChange={setLogFilter}
            getPlatformColor={getPlatformColor}
            getPlatformIcon={getPlatformIcon}
            violations={platformOperations.flatMap((p) => p.violations)}
            platformOperations={platformOperations}
            deletedViolationLogs={deletedViolationLogs}
            onRefetch={() => refetchAllData(true)}
            platformFilter={platformFilter}
            onPlatformFilterChange={setPlatformFilter}
            userFilter={userFilter}
            onUserFilterChange={setUserFilter}
            isSuperAdmin={isSuperAdmin}
          />
        </div>
      </div>

      <BlockConfirmDialog
        open={isBlockConfirmOpen}
        onOpenChange={setIsBlockConfirmOpen}
        blockConfirmViolation={blockConfirmViolation}
        platformOperations={platformOperations}
        blockTimeChoice={blockTimeChoice}
        onBlockTimeChoiceChange={setBlockTimeChoice}
        customBlockTime={customBlockTime}
        onCustomBlockTimeChange={setCustomBlockTime}
        onConfirm={confirmBlock}
      />

      {/* Platform Operations Section */}
      <div className="space-y-3 sm:space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base sm:text-lg font-semibold">
            {t("matchDashboard.sections.platformOperations")}
          </h2>
        </div>

        <PlatformFilters
          selectedSlots={selectedSlots}
          allPlatforms={platformOperations}
          contentTypeFilter={contentTypeFilter}
          onRemovePlatform={removePlatformFromSlot}
          onAddPlatform={addPlatformToSlot}
          onContentTypeFilterChange={setContentTypeFilter}
        />

        <div
          className={
            selectedSlots.length === 1
              ? "grid grid-cols-1 gap-4 sm:gap-6"
              : "grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6"
          }>
          {platformOperations
            .filter((platform) => selectedSlots.includes(platform.id))
            .map((platform) => {
              const cardFilter = platformCardFilter[platform.id] || "all";
              const filteredViolations = getFilteredViolations(
                platform.id,
                platform.violations
              );

              return (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  filteredViolations={filteredViolations}
                  cardFilter={cardFilter}
                  searchQuery={platformSearchQuery[platform.id] || ""}
                  onFilterChange={(filter) =>
                    setPlatformCardFilter({
                      ...platformCardFilter,
                      [platform.id]: filter,
                    })
                  }
                  onSearchChange={(query) =>
                    setPlatformSearchQuery({
                      ...platformSearchQuery,
                      [platform.id]: query,
                    })
                  }
                  onAddViolation={() => openAddViolationDrawer(platform.id)}
                  onEdit={openEditViolationDrawer}
                  onToggleStatus={toggleViolationStatus}
                  onDelete={deleteViolation}
                  onCopyUrl={copyViolationUrl}
                  onAddNote={openAddNoteDialog}
                  getPlatformIcon={getPlatformIcon}
                  canModifyViolations={canModifyViolations}
                />
              );
            })}
        </div>
      </div>

      <div ref={platformComparisonRef}>
        {/* Mobile Version */}
        <div className="md:hidden">
          <PlatformComparisonMobile
            platformOperations={platformOperations}
            contentTypeFilter={contentTypeFilter}
            comparisonSort={comparisonSort}
            comparisonSortDirection={comparisonSortDirection}
            selectedSlots={selectedSlots}
            onSortChange={setComparisonSort}
            onSortDirectionChange={setComparisonSortDirection}
            onSelectedSlotsChange={setSelectedSlots}
            targetMins={targetMins}
            title={t("matchDashboard.sections.platformComparison")}
            description={t("matchDashboard.sections.platformComparisonDescription")}
            showCard={true}
          />
        </div>
        {/* Desktop Version */}
        <div className="hidden md:block">
          <PlatformComparison
            platformOperations={platformOperations}
            contentTypeFilter={contentTypeFilter}
            comparisonSort={comparisonSort}
            comparisonSortDirection={comparisonSortDirection}
            selectedSlots={selectedSlots}
            onSortChange={setComparisonSort}
            onSortDirectionChange={setComparisonSortDirection}
            onSelectedSlotsChange={setSelectedSlots}
            targetMins={targetMins}
          />
        </div>
      </div>

      <AddViolationSheet
        open={isAddViolationOpen}
        onOpenChange={setIsAddViolationOpen}
        isEditMode={isEditMode}
        match={match}
        platformOperations={platformOperations}
        selectedPlatformForAdd={selectedPlatformForAdd}
        formUrl={formUrl}
        onFormUrlChange={setFormUrl}
        formAccountHandle={formAccountHandle}
        onFormAccountHandleChange={setFormAccountHandle}
        formContentType={formContentType}
        onFormContentTypeChange={setFormContentType}
        formStatus={formStatus}
        onFormStatusChange={setFormStatus}
        formViews={formViews}
        onFormViewsChange={setFormViews}
        formTimeAdded={formTimeAdded}
        onFormTimeAddedChange={setFormTimeAdded}
        formBlockedAt={formBlockedAt}
        onFormBlockedAtChange={setFormBlockedAt}
        formNotes={formNotes}
        onFormNotesChange={setFormNotes}
        onNoteChange={(index, note) => {
          const updated = [...formNotes];
          updated[index] = note;
          setFormNotes(updated);
        }}
        onAddNote={() => {
          setFormNotes([...formNotes, ""]);
        }}
        onDeleteNote={(index) => {
          setFormNotes(formNotes.filter((_, i) => i !== index));
        }}
        onSave={saveViolation}
      />

      <DeleteConfirmDialog
        open={isDeleteConfirmOpen}
        onOpenChange={(open) => {
          setIsDeleteConfirmOpen(open);
          if (!open) setDeleteConfirmViolation(null);
        }}
        onConfirm={confirmDeleteViolation}
      />

      <AddNoteDialog
        open={isAddNoteOpen}
        onOpenChange={(open) => {
          setIsAddNoteOpen(open);
          if (!open) setNoteViolation(null);
        }}
        violation={noteViolation?.violation || null}
        onSave={saveNote}
      />

      {/* Whitelist Confirmation Dialog */}
      <Dialog
        open={isWhitelistConfirmOpen}
        onOpenChange={setIsWhitelistConfirmOpen}>
        <DialogContent className="w-[95vw] sm:w-full sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="text-lg sm:text-xl text-destructive">
              {t("matchDashboard.whitelistWarning.title")}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {t("matchDashboard.whitelistWarning.description")}
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col sm:flex-row justify-end gap-2 sm:gap-3 mt-4">
            <Button
              variant="outline"
              onClick={() => {
                setIsWhitelistConfirmOpen(false);
                setPendingViolationData(null);
              }}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation w-full sm:w-auto">
              {t("matchDashboard.whitelistWarning.cancel")}
            </Button>
            <Button
              variant="destructive"
              onClick={confirmWhitelistSave}
              className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation w-full sm:w-auto">
              {t("matchDashboard.whitelistWarning.confirm")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Round Report Modal */}
      {match && (
        <RoundReport
          open={isRoundReportOpen}
          onClose={() => setIsRoundReportOpen(false)}
          week={(() => {
            const leagueInfo = leagues?.find((l) => l.league === match.league);
            const isSuperCup = leagueInfo?.competitionType === "cup";
            return isSuperCup
              ? `Stage ${match.stage || "N/A"}`
              : `Week ${match.week || "N/A"}`;
          })()}
          competition={getCompetitionName() || "N/A"}
          fileName={`Round-Report-${getCompetitionName().replace(
            /\s+/g,
            "-"
          )}-${(() => {
            const leagueInfo = leagues?.find((l) => l.league === match.league);
            const isSuperCup = leagueInfo?.competitionType === "cup";
            return isSuperCup
              ? `Stage-${match.stage || "N/A"}`
              : `Week-${match.week || "N/A"}`;
          })()}-${match.team1}-vs-${match.team2}-${
            new Date().toISOString().split("T")[0]
          }.png`}
          liveMetrics={platformOperations
            .filter((platform) => {
              const liveViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Live"
              );
              return liveViolations.length > 0;
            })
            .map((platform) => {
              const IconComponent = platform.icon;
              const liveViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Live"
              );
              const detected = liveViolations.length;
              const blocked = liveViolations.filter(
                (v) => v.status === "Blocked" || v.statusBadge === "Blocked"
              ).length;
              const successRate =
                detected > 0 ? Math.round((blocked / detected) * 100) : 0;

              // Calculate avg block time for live violations
              const blockedViolations = liveViolations.filter(
                (v) =>
                  v.blockedAt &&
                  (v.status === "Blocked" || v.statusBadge === "Blocked")
              );
              let avgBlockTime = 0;
              if (blockedViolations.length > 0) {
                const totalBlockTime = blockedViolations.reduce((sum, v) => {
                  if (v.blockedAt && v.timeAdded) {
                    const diffMs =
                      new Date(v.blockedAt).getTime() -
                      new Date(v.timeAdded).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    return sum + Math.max(0, diffMins);
                  }
                  return sum;
                }, 0);
                avgBlockTime = Math.round(
                  totalBlockTime / blockedViolations.length
                );
              }

              // Calculate views for live violations
              const views = liveViolations.reduce((sum, v) => {
                if (!v.views || v.views === "0") return sum;
                const viewsStr = v.views || "0";
                // Remove all non-numeric characters except commas, then parse
                const numStr = viewsStr
                  .replace(/[^0-9,]/g, "")
                  .replace(/,/g, "");
                return sum + (parseFloat(numStr) || 0);
              }, 0);

              return {
                platform: platform.name,
                icon: (
                  <IconComponent
                    className="h-4 w-4"
                    style={{ color: platform.color }}
                  />
                ),
                detected: detected,
                blocked: blocked,
                successRate: successRate,
                avgBlockTime: avgBlockTime,
                views: views,
              };
            })}
          highlightsMetrics={platformOperations
            .filter((platform) => {
              const highlightsViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Highlights"
              );
              return highlightsViolations.length > 0;
            })
            .map((platform) => {
              const IconComponent = platform.icon;
              const highlightsViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Highlights"
              );
              const detected = highlightsViolations.length;
              const blocked = highlightsViolations.filter(
                (v) => v.status === "Blocked" || v.statusBadge === "Blocked"
              ).length;
              const successRate =
                detected > 0 ? Math.round((blocked / detected) * 100) : 0;

              // Calculate avg block time for highlights violations
              const blockedViolations = highlightsViolations.filter(
                (v) =>
                  v.blockedAt &&
                  (v.status === "Blocked" || v.statusBadge === "Blocked")
              );
              let avgBlockTime = 0;
              if (blockedViolations.length > 0) {
                const totalBlockTime = blockedViolations.reduce((sum, v) => {
                  if (v.blockedAt && v.timeAdded) {
                    const diffMs =
                      new Date(v.blockedAt).getTime() -
                      new Date(v.timeAdded).getTime();
                    const diffMins = Math.floor(diffMs / 60000);
                    return sum + Math.max(0, diffMins);
                  }
                  return sum;
                }, 0);
                avgBlockTime = Math.round(
                  totalBlockTime / blockedViolations.length
                );
              }

              // Calculate views for highlights violations
              const views = highlightsViolations.reduce((sum, v) => {
                if (!v.views || v.views === "0") return sum;
                const viewsStr = v.views || "0";
                // Remove all non-numeric characters except commas, then parse
                const numStr = viewsStr
                  .replace(/[^0-9,]/g, "")
                  .replace(/,/g, "");
                return sum + (parseFloat(numStr) || 0);
              }, 0);

              return {
                platform: platform.name,
                icon: (
                  <IconComponent
                    className="h-4 w-4"
                    style={{ color: platform.color }}
                  />
                ),
                detected: detected,
                blocked: blocked,
                successRate: successRate,
                avgBlockTime: avgBlockTime,
                views: views,
              };
            })}
        />
      )}
    </div>
  );
}
