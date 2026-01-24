import { useParams, useNavigate } from "react-router-dom";
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
import { useTheme } from "next-themes";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { useSocket } from "@/hooks/useSocket";
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
  fetchPlatformsFromBackend,
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
  type BulkViolation,
  type DeletedViolationLog,
  API_URL,
  BASE_URL,
} from "@/components/MatchDashboard";
import { PlatformComparisonMobile } from "@/components/MatchDashboard/PlatformComparisonMobile";

export default function MatchDashboard() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user, leagues } = useAuth();
  const { t, isRTL } = useLanguage();
  const { theme } = useTheme();
  const isDarkMode = theme === "dark";
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
    getInitialContentSplitData(),
  );
  const [activityLog, setActivityLog] = useState(getInitialActivityLog());

  // Platform operations state
  const [platformOperations, setPlatformOperations] = useState<PlatformData[]>(
    getInitialPlatformOperations(),
  );

  // Deleted violation logs state
  const [deletedViolationLogs, setDeletedViolationLogs] = useState<
    DeletedViolationLog[]
  >([]);

  // Bulk violations state
  const [bulkViolations, setBulkViolations] = useState<BulkViolation[]>([]);

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
          `${API_URL}/violations?matchId=${matchData.externalMatchId}`,
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
            `${API_URL}/platform-by-match?matchId=${matchData.externalMatchId}`,
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
              },
            );
          }

          // Update platform operations with violations and backend stats
          setPlatformOperations((prev) =>
            prev.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];

              // Convert backend violations to frontend format
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v),
              );

              // Get backend aggregated stats from PlatformByMatch
              const backendStats = platformStatsMap[platform.id] || {};

              // Use backend stats (from PlatformByMatch) instead of calculating
              const totalViolations =
                backendStats.totalViolations ?? convertedViolations.length;
              const activeViolations =
                backendStats.activeCount ??
                convertedViolations.filter(
                  (v) => v.status === "Active" || v.status === "Under Review",
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
              // Get content type counts from backend
              const liveCount = (backendStats as any).liveCount ?? 0;
              const highlightsCount =
                (backendStats as any).highlightsCount ?? 0;
              const othersCount = (backendStats as any).othersCount ?? 0;

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
                liveCount,
                highlightsCount,
                othersCount,
              };
            }),
          );

          // Save/update stats to PlatformByMatch for all platforms (calculate and save)
          if (matchData.externalMatchId) {
            // Get initial platform operations to save stats for all platforms
            const initialPlatforms = getInitialPlatformOperations();
            initialPlatforms.forEach((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v),
              );
              // Stats are now updated by the backend - no frontend calculation needed
            });

            // NOTE: topPlatformId and mostViews are now calculated by the backend in platformStatsHelper.js
            // DO NOT call calculateAndSaveTopPlatform here as it would overwrite the correct backend value!
            // The backend calculates this whenever violations are added/deleted/updated.
          }

          // Chart will update automatically via useEffect when match/platformOperations change
        }

        // Fetch bulk violations for this match
        try {
          const bulkViolationsResponse = await fetch(
            `${API_URL}/violations/bulk?matchId=${matchData.externalMatchId}`,
          );
          if (bulkViolationsResponse.ok) {
            const bulkViolationsData = await bulkViolationsResponse.json();
            setBulkViolations(bulkViolationsData || []);
          }
        } catch (error) {
          console.error("Error fetching bulk violations:", error);
        }

        // Fetch deleted violation logs for this match
        try {
          const deletedLogsResponse = await fetch(
            `${API_URL}/violations/deleted-logs/${matchData.externalMatchId}`,
            {
              credentials: "include",
            },
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
    [id],
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

  // Scroll to violation when hash fragment is present in URL
  useEffect(() => {
    if (!loading && platformOperations.length > 0) {
      const hash = window.location.hash;
      if (hash && hash.startsWith("#violation-")) {
        const violationIdFromHash = hash.replace("#violation-", "");
        // Wait a bit for DOM to render violations
        const scrollTimeout = setTimeout(() => {
          // Try to find the violation element by ID
          // The ID could be the _id or id field, so we need to check both formats
          let violationElement = document.getElementById(
            `violation-${violationIdFromHash}`,
          );

          // If not found, try to find by checking all violation elements
          if (!violationElement) {
            // Get all violations from platformOperations and find matching one
            const allViolations = platformOperations.flatMap(
              (p) => p.violations,
            );
            const matchingViolation = allViolations.find((v) => {
              const vId = String(v._id || v.id || "");
              return vId === violationIdFromHash;
            });

            if (matchingViolation) {
              const actualId = String(
                matchingViolation._id || matchingViolation.id || "",
              );
              violationElement = document.getElementById(
                `violation-${actualId}`,
              );
            }
          }

          if (violationElement) {
            violationElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
            });
            // Highlight the violation briefly
            violationElement.classList.add(
              "ring-2",
              "ring-primary",
              "ring-offset-2",
            );
            setTimeout(() => {
              violationElement?.classList.remove(
                "ring-2",
                "ring-primary",
                "ring-offset-2",
              );
            }, 2000);
          }
        }, 500); // Increased timeout to ensure violations are rendered
        return () => clearTimeout(scrollTimeout);
      }
    }
  }, [loading, platformOperations]);

  // Helper function to trigger refetch (call this after any violation change)
  const triggerRefetch = useCallback(() => {
    setRefetchTrigger((prev) => prev + 1);
  }, []);

  // Socket event handlers for real-time updates
  const handleViolationUpdated = useCallback(
    (data: any) => {
      // Update local state optimistically
      setPlatformOperations((prev) =>
        prev.map((platform) => {
          if (platform.id === data.violation?.platformId) {
            return {
              ...platform,
              violations: platform.violations.map((v) =>
                v.id === data.violation.id || v._id === data.violation._id
                  ? convertBackendViolationToFrontend(data.violation)
                  : v,
              ),
            };
          }
          return platform;
        }),
      );

      // Show toast notification
      toast({
        title: t("matchDashboard.success.violationUpdated"),
        description: "Updated by another user",
      });

      // Refetch to ensure consistency
      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  const handleViolationDeleted = useCallback(
    (data: any) => {
      // Remove from local state
      setPlatformOperations((prev) =>
        prev.map((platform) => {
          if (platform.id === data.platformId) {
            return {
              ...platform,
              violations: platform.violations.filter(
                (v) => v.id !== data.violationId && v._id !== data.violationId,
              ),
            };
          }
          return platform;
        }),
      );

      toast({
        title: t("matchDashboard.success.violationDeleted"),
        description: "Deleted by another user",
      });

      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  const handleViolationCreated = useCallback(
    (data: any) => {
      toast({
        title: t("matchDashboard.success.violationAdded"),
        description: "Added by another user",
      });

      // Refetch to get new violation
      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  const handleBulkViolationsAdded = useCallback(
    (data: any) => {
      toast({
        title: t("matchDashboard.success.violationAdded"),
        description: t("matchDashboard.success.multipleViolationsAdded", {
          count: data.count?.toString() || "0",
        }),
      });

      // Refetch to get new violations
      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  const handleBulkViolationsDeleted = useCallback(
    (data: any) => {
      toast({
        title: t("matchDashboard.success.violationDeleted"),
        description: t("matchDashboard.success.multipleViolationsRemoved", {
          count: data.count?.toString() || "0",
        }),
      });

      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  const handleBulkStatusChanged = useCallback(
    (data: any) => {
      toast({
        title: t("matchDashboard.success.statusChanged"),
        description: t("matchDashboard.success.multipleViolationsUpdated", {
          count: data.count?.toString() || "0",
        }),
      });

      triggerRefetch();
    },
    [toast, t, triggerRefetch],
  );

  // Initialize WebSocket connection
  useSocket(id, {
    "violation-created": handleViolationCreated,
    "violation-updated": handleViolationUpdated,
    "violation-deleted": handleViolationDeleted,
    "bulk-violations-added": handleBulkViolationsAdded,
    "bulk-violations-deleted": handleBulkViolationsDeleted,
    "bulk-status-changed": handleBulkStatusChanged,
  });

  // Fetch platforms from backend on mount
  useEffect(() => {
    const loadPlatforms = async () => {
      const platforms = await fetchPlatformsFromBackend();
      setPlatformOperations(platforms);
    };
    loadPlatforms();
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
          `${API_URL}/violations?matchId=${matchData.externalMatchId}`,
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
            `${API_URL}/platform-by-match?matchId=${matchData.externalMatchId}`,
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
              },
            );
          }

          // Update platform operations with violations and backend stats
          setPlatformOperations((prev) =>
            prev.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];

              // Convert backend violations to frontend format
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v),
              );

              // Get backend aggregated stats from PlatformByMatch
              const backendStats = platformStatsMap[platform.id] || {};

              // Use backend stats (from PlatformByMatch) instead of calculating
              const totalViolations =
                backendStats.totalViolations ?? convertedViolations.length;
              const activeViolations =
                backendStats.activeCount ??
                convertedViolations.filter(
                  (v) => v.status === "Active" || v.status === "Under Review",
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
              // Get content type counts from backend
              const liveCount = (backendStats as any).liveCount ?? 0;
              const highlightsCount =
                (backendStats as any).highlightsCount ?? 0;
              const othersCount = (backendStats as any).othersCount ?? 0;

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
                liveCount,
                highlightsCount,
                othersCount,
              };
            }),
          );

          // Save stats to PlatformByMatch for all platforms
          if (matchData.externalMatchId) {
            const updatedPlatforms = platformOperations.map((platform) => {
              const platformViolations =
                violationsByPlatform[platform.id] || [];
              const convertedViolations = platformViolations.map((v) =>
                convertBackendViolationToFrontend(v),
              );
              return { platform, violations: convertedViolations };
            });

            // Save stats for each platform
            updatedPlatforms.forEach(({ platform, violations }) => {
              // Stats are now updated by the backend - no frontend calculation needed
            });

            // NOTE: topPlatformId calculation now happens on backend only!
          }

          // Chart will update automatically via useEffect when match/platformOperations change
        }

        // Fetch bulk violations for this match
        try {
          const bulkViolationsResponse = await fetch(
            `${API_URL}/violations/bulk?matchId=${matchData.externalMatchId}`,
          );
          if (bulkViolationsResponse.ok) {
            const bulkViolationsData = await bulkViolationsResponse.json();
            setBulkViolations(bulkViolationsData || []);
          }
        } catch (error) {
          console.error("Error fetching bulk violations:", error);
        }

        // Fetch deleted violation logs for this match
        try {
          const deletedLogsResponse = await fetch(
            `${API_URL}/violations/deleted-logs/${matchData.externalMatchId}`,
            {
              credentials: "include",
            },
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

      // Calculate views from SINGLE violations only
      // Bulk violations don't have individual view counts, but have aggregated totalViews
      const singleViolations = platformOperations.flatMap((p) => p.violations);
      const singleLiveViews = singleViolations
        .filter((v) => (v.contentType || v.type) === "Live")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      const singleHighlightsViews = singleViolations
        .filter((v) => (v.contentType || v.type) === "Highlights")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      const singleOthersViews = singleViolations
        .filter((v) => (v.contentType || v.type) === "Other")
        .reduce((sum, v) => {
          if (!v.views || v.views === "0") return sum;
          const viewsStr = v.views || "0";
          const numStr = viewsStr.replace(/[^0-9,]/g, "").replace(/,/g, "");
          return sum + (parseFloat(numStr) || 0);
        }, 0);

      // Add bulk violation views (they have totalViews aggregated)
      const bulkLiveViews = bulkViolations
        .filter((b) => b.contentType === "Live")
        .reduce((sum, b) => sum + (b.totalViews || 0), 0);

      const bulkHighlightsViews = bulkViolations
        .filter((b) => b.contentType === "Highlights")
        .reduce((sum, b) => sum + (b.totalViews || 0), 0);

      const bulkOthersViews = bulkViolations
        .filter((b) => b.contentType === "Other")
        .reduce((sum, b) => sum + (b.totalViews || 0), 0);

      // Combine single and bulk views
      const liveViews = singleLiveViews + bulkLiveViews;
      const highlightsViews = singleHighlightsViews + bulkHighlightsViews;
      const othersViews = singleOthersViews + bulkOthersViews;

      const totalViews = liveViews + highlightsViews + othersViews;

      // Use violation counts for bar heights (not views, since views might not be filled)
      // If views are available, use them; otherwise use violation counts
      const hasViews = totalViews > 0;
      const totalValue = hasViews ? totalViews : totalViolations;
      const liveValue = hasViews ? liveViews : liveCount;
      const highlightsValue = hasViews ? highlightsViews : highlightsCount;
      const othersValue = hasViews ? othersViews : othersCount;

      setContentSplitData([
        {
          name: "Total Violations",
          value: totalValue,
          violations: totalViolations, // From backend
          color: "hsl(var(--chart-4))",
        },
        {
          name: "Live",
          value: liveValue,
          violations: liveCount, // From backend
          color: "hsl(var(--chart-1))",
        },
        {
          name: "Highlights",
          value: highlightsValue,
          violations: highlightsCount, // From backend
          color: "hsl(var(--chart-2))",
        },
        {
          name: "Others",
          value: othersValue,
          violations: othersCount, // From backend
          color: "hsl(var(--chart-3))",
        },
      ]);
    }
    // Depend on match, platformOperations, and bulkViolations to recalculate when any change
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [match, platformOperations, bulkViolations]);

  // Platform slot system (max 2 platforms visible)
  const [selectedSlots, setSelectedSlots] = useState<string[]>(() => {
    // Try to get saved slots from localStorage
    const savedSlots = localStorage.getItem("matchDashboard_selectedSlots");
    if (savedSlots) {
      try {
        const parsed = JSON.parse(savedSlots);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        console.error("Failed to parse saved platform slots", e);
      }
    }
    // Default to twitter and youtube if no saved slots
    return ["twitter", "youtube"];
  });

  // Save selected platforms to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem(
      "matchDashboard_selectedSlots",
      JSON.stringify(selectedSlots),
    );
  }, [selectedSlots]);

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
    null,
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
    "current",
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
  // Helper to get platform color
  const getPlatformColor = (platformName: string | null) => {
    if (!platformName) return "hsl(var(--muted-foreground))";
    const platform = platformOperations.find((p) => p.name === platformName);
    return platform ? platform.color : "hsl(var(--muted-foreground))";
  };

  // Helper to get platform icon
  // Helper to get platform icon
  const getPlatformIcon = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) return <Activity className="h-3.5 w-3.5" />;

    if (platform.iconUrl) {
      const src = platform.iconUrl.startsWith("http")
        ? platform.iconUrl
        : `${BASE_URL}${platform.iconUrl}`;
      return (
        <img
          src={src}
          alt={platform.name}
          className="h-3.5 w-3.5 object-contain"
        />
      );
    }

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
    (p) => !selectedSlots.includes(p.id),
  );

  // Get filtered violations for a platform card
  const getFilteredViolations = (
    platformId: string,
    violations: Violation[],
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
          (v.accountHandle && v.accountHandle.toLowerCase().includes(query)),
      );
    }

    // Apply card filter (All/Active/Blocked/Removed/Review)
    if (cardFilter !== "all") {
      if (cardFilter === "active") {
        filtered = filtered.filter((v) =>
          ["Reported", "Active", "Pending"].includes(v.statusBadge),
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
        (v) => v.type.toLowerCase() === contentTypeFilter,
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
    violation: Violation,
  ) => {
    setSelectedPlatformForAdd(platformId);
    setIsEditMode(true);
    setEditingViolation(violation);
    // Pre-fill form
    setFormUrl(violation.violationUrl || violation.url || "");
    setFormAccountHandle(
      violation.accountChannel || violation.accountHandle || "",
    );
    setFormContentType(
      (violation.contentType || violation.type || "live").toLowerCase(),
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
        : getKSATime(),
    );
    // Convert blockedAt from UTC to KSA time for datetime-local input
    setFormBlockedAt(
      violation.blockedAt ? convertUTCToKSATime(violation.blockedAt) : "",
    );
    setFormStillActive(
      violation.active !== undefined
        ? violation.active
        : violation.stillActive || false,
    );
    setFormNotes(
      Array.isArray(violation.notes)
        ? violation.notes
        : violation.notes
          ? [violation.notes]
          : [],
    );
    setIsAddViolationOpen(true);
  };

  // Toggle violation status (quick block/unblock)
  const toggleViolationStatus = (
    platformId: string,
    violationId: number | string,
  ) => {
    const platform = platformOperations.find((p) => p.id === platformId);
    if (!platform) return;

    const violation = platform.violations.find(
      (v) => v.id === violationId || v._id === violationId,
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
            },
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
            (p) => p.id === platformId,
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
            }),
          );

          // Stats are now updated by the backend - no frontend calculation needed
          if (match?.externalMatchId) {
            // The backend will automatically update topPlatformId via the cascade update
            // Just trigger a refetch to get the latest values
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
        },
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
        (p) => p.id === platformId,
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
        }),
      );

      // Save stats to PlatformByMatch - use the updatedViolations we just calculated
      if (match?.externalMatchId) {
        // Stats are now updated by the backend - no frontend calculation needed
      }

      // Trigger refetch of all data
      triggerRefetch();

      toast({
        title: t("matchDashboard.success.violationBlocked"),
        description: t("matchDashboard.success.violationBlockedAt", {
          time: new Date(blockTime).toLocaleString(isRTL ? "ar-SA" : "en-US"),
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
    platformId: string,
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
    editingViolation: Violation | null,
  ) => {
    if (!match) return;

    const platform = platformOperations.find(
      (p) => p.id === violationData.platformId,
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
          }),
        );

        // Save stats to PlatformByMatch
        if (match?.externalMatchId) {
          const updatedPlatform = platformOperations.find(
            (p) => p.id === selectedPlatformForAdd,
          );
          if (updatedPlatform) {
            // Stats are now updated by the backend - no frontend calculation needed
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
          }),
        );

        // Save stats to PlatformByMatch
        if (match?.externalMatchId) {
          const updatedPlatform = platformOperations.find(
            (p) => p.id === selectedPlatformForAdd,
          );
          if (updatedPlatform) {
            const platformViolations = [
              frontendViolation,
              ...updatedPlatform.violations,
            ];
            // Stats are now updated by the backend - no frontend calculation needed
          }
        }

        // Trigger refetch of all data
        triggerRefetch();

        toast({
          title: t("matchDashboard.success.violationAdded"),
          description: t("matchDashboard.success.violationAddedTo", {
            platformName: violationData.platformName,
          }),
        });

        // Scroll logic removed as requested
        /*
        // Navigate to the newly added violation
        const violationId = frontendViolation._id || frontendViolation.id;
        if (violationId && id) {
          // Update URL hash and scroll to violation after a delay to ensure it's rendered
          setTimeout(() => {
            const violationIdStr = String(violationId);
            window.location.hash = `violation-${violationIdStr}`;

            // Manually trigger scroll after hash update
            setTimeout(() => {
              const violationElement = document.getElementById(
                `violation-${violationIdStr}`
              );
              if (violationElement) {
                violationElement.scrollIntoView({
                  behavior: "smooth",
                  block: "center",
                });
                // Highlight the violation briefly
                violationElement.classList.add(
                  "ring-2",
                  "ring-primary",
                  "ring-offset-2"
                );
                setTimeout(() => {
                  violationElement.classList.remove(
                    "ring-2",
                    "ring-primary",
                    "ring-offset-2"
                  );
                }, 2000);
              }
            }, 300);
          }, 500);
        }
        */
      }

      setIsAddViolationOpen(false);
    } catch (error) {
      console.error("Error saving violation:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description:
          error instanceof Error
            ? error.message
            : t("matchDashboard.error.failedToSave"),
        variant: "destructive",
      });
    }
  };

  // Save violation (add or edit) - with whitelist check
  const saveViolation = async () => {
    if (!formUrl) {
      toast({
        title: t("matchDashboard.error.validationError"),
        description: t("matchDashboard.error.violationUrlRequired"),
        variant: "destructive",
      });
      return;
    }

    // Account/Channel is now optional - no validation required

    if (!match) {
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.matchNotFound"),
        variant: "destructive",
      });
      return;
    }

    const platform = platformOperations.find(
      (p) => p.id === selectedPlatformForAdd,
    );
    if (!platform) return;

    // Parse URLs - split by newlines and filter out empty lines
    const urls = formUrl
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length === 0) {
      toast({
        title: t("matchDashboard.error.validationError"),
        description: t("matchDashboard.error.violationUrlRequired"),
        variant: "destructive",
      });
      return;
    }

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

    // If editing, only allow single URL
    if (isEditMode && urls.length > 1) {
      toast({
        title: t("matchDashboard.error.validationError"),
        description:
          "Cannot edit multiple violations at once. Please provide a single URL.",
        variant: "destructive",
      });
      return;
    }

    // For edit mode, use the single URL
    if (isEditMode) {
      const violationData = {
        matchId: match.externalMatchId,
        matchName: `${match.team1} vs ${match.team2}`,
        platformId: platform.id,
        platformName: platform.name,
        violationUrl: urls[0],
        accountChannel: formAccountHandle || "N/A", // Use N/A if empty
        contentType,
        status,
        views: formViews
          ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
          : undefined,
        timeAdded: convertKSATimeToUTC(formTimeAdded),
        blockedAt: blockedAtValue,
        notes: formNotes.filter((note) => note.trim() !== ""),
      };

      // Check if account is whitelisted (only if account is provided)
      if (
        formAccountHandle &&
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
      return;
    }

    // For add mode, create multiple violations if multiple URLs
    try {
      // Check if account is whitelisted (only if account is provided)
      if (
        formAccountHandle &&
        checkWhitelistedAccount(formAccountHandle, platform.id)
      ) {
        // For violations with whitelisted account, show warning
        setPendingViolationData({
          violationData: {
            matchId: match.externalMatchId,
            matchName: `${match.team1} vs ${match.team2}`,
            platformId: platform.id,
            platformName: platform.name,
            violationUrl: urls.join("\n"), // Store all URLs for batch processing
            accountChannel: formAccountHandle || "N/A",
            contentType,
            status,
            views: formViews
              ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
              : undefined,
            timeAdded: convertKSATimeToUTC(formTimeAdded),
            blockedAt: blockedAtValue,
            notes: formNotes.filter((note) => note.trim() !== ""),
          },
          isEditMode: false,
          editingViolation: null,
        });
        setIsWhitelistConfirmOpen(true);
        return;
      }

      // Use bulk endpoint for multiple URLs, single endpoint for one URL
      if (urls.length > 1) {
        // Bulk creation
        const response = await fetch(`${API_URL}/violations/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            matchId: match.externalMatchId,
            matchName: `${match.team1} vs ${match.team2}`,
            platformId: platform.id,
            platformName: platform.name,
            violationUrls: urls, // Send array of URLs
            accountChannel: formAccountHandle || "N/A",
            contentType,
            status,
            views: formViews
              ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
              : undefined,
            timeAdded: convertKSATimeToUTC(formTimeAdded),
            blockedAt: blockedAtValue,
            notes: formNotes.filter((note) => note.trim() !== ""),
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to add violations");
        }

        const result = await response.json();
        const { bulkId, count, violations: newViolations } = result;

        // Convert backend violations to frontend format
        const frontendViolations = newViolations.map((v: BackendViolation) =>
          convertBackendViolationToFrontend(v),
        );

        // Update local state with all new violations
        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = [...frontendViolations, ...p.violations];

            return {
              ...p,
              violations: updatedViolations,
            };
          }),
        );

        // Stats are now updated by the backend - no frontend calculation needed
        if (match?.externalMatchId) {
          // No need to calculate stats anymore
        }

        // Trigger refetch
        triggerRefetch();

        toast({
          title: t("matchDashboard.success.violationAdded"),
          description: t("matchDashboard.success.multipleViolationsAdded", {
            count: count.toString(),
          }),
        });

        // Close the sheet
        setIsAddViolationOpen(false);
      } else {
        // Single URL - use existing single endpoint
        const violationData = {
          matchId: match.externalMatchId,
          matchName: `${match.team1} vs ${match.team2}`,
          platformId: platform.id,
          platformName: platform.name,
          violationUrl: urls[0],
          accountChannel: formAccountHandle || "N/A",
          contentType,
          status,
          views: formViews
            ? parseInt(formViews.replace(/,/g, "")).toLocaleString("en-US")
            : undefined,
          timeAdded: convertKSATimeToUTC(formTimeAdded),
          blockedAt: blockedAtValue,
          notes: formNotes.filter((note) => note.trim() !== ""),
        };

        await actuallySaveViolation(violationData, false, null);
      }
    } catch (error) {
      console.error("Error saving violations:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.unexpectedErrorSaving"),
        variant: "destructive",
      });
    }
  };

  // Confirm whitelist violation save
  const confirmWhitelistSave = async () => {
    if (!pendingViolationData) return;

    setIsWhitelistConfirmOpen(false);

    // Check if there are multiple URLs (separated by newlines)
    const urls = pendingViolationData.violationData.violationUrl
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url.length > 0);

    if (urls.length > 1) {
      // Multiple URLs - use bulk endpoint
      try {
        const response = await fetch(`${API_URL}/violations/bulk`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            ...pendingViolationData.violationData,
            violationUrls: urls, // Send array of URLs
            violationUrl: undefined, // Remove single URL field
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || "Failed to add violations");
        }

        const result = await response.json();
        const { bulkId, count, violations: newViolations } = result;

        // Convert backend violations to frontend format
        const frontendViolations = newViolations.map((v: BackendViolation) =>
          convertBackendViolationToFrontend(v),
        );

        // Update local state with all new violations
        setPlatformOperations((prev) =>
          prev.map((p) => {
            if (p.id !== selectedPlatformForAdd) return p;

            const updatedViolations = [...frontendViolations, ...p.violations];

            return {
              ...p,
              violations: updatedViolations,
            };
          }),
        );

        // Trigger refetch
        triggerRefetch();

        toast({
          title: t("matchDashboard.success.violationAdded"),
          description: t("matchDashboard.success.multipleViolationsAdded", {
            count: count.toString(),
          }),
        });

        // Close the sheet
        setIsAddViolationOpen(false);
      } catch (error) {
        console.error("Error saving violations:", error);
        toast({
          title: t("matchDashboard.error.title"),
          description: t("matchDashboard.error.unexpectedErrorSaving"),
          variant: "destructive",
        });
      }
    } else {
      // Single URL - save normally
      await actuallySaveViolation(
        pendingViolationData.violationData,
        pendingViolationData.isEditMode,
        pendingViolationData.editingViolation,
      );
    }

    setPendingViolationData(null);
  };

  // Delete violation - show confirmation dialog
  const deleteViolation = (
    platformId: string,
    violationId: number | string,
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
      (v) => v.id === violationId || v._id === violationId,
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
            (v) => v.id !== violationId && v._id !== violationId,
          );

          // Just update violations, keep existing metrics (will be updated by refetch)
          return {
            ...p,
            violations: updatedViolations,
          };
        }),
      );

      // Save stats to PlatformByMatch
      if (match?.externalMatchId) {
        const updatedPlatform = platformOperations.find(
          (p) => p.id === platformId,
        );
        if (updatedPlatform) {
          const platformViolations = updatedPlatform.violations.filter(
            (v) => v.id !== violationId && v._id !== violationId,
          );
          // Stats are now updated by the backend endpoint - no need for frontend calculation
        }
      }

      // Trigger refetch of all data
      triggerRefetch();

      toast({
        title: t("matchDashboard.success.violationDeleted"),
        description: t("matchDashboard.success.violationRemoved"),
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

  // Bulk delete violations
  const handleBulkDelete = async (
    platformId: string,
    violations: Violation[],
  ) => {
    try {
      // Generate a unique bulkId for this bulk operation
      const bulkId = `bulk_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await Promise.all(
        violations.map(async (violation) => {
          let violationId: string;
          if (typeof violation._id === "string") {
            violationId = violation._id;
          } else if (
            violation._id &&
            typeof violation._id === "object" &&
            "$oid" in violation._id
          ) {
            violationId = (violation._id as { $oid: string }).$oid;
          } else {
            violationId = String(violation.id);
          }

          // Attempt to delete creation log if exists (cleanup history)
          if (violation.auditLog) {
            const createdLog = violation.auditLog.find(
              (l) => l.action === "created",
            );
            // safe cast to access _id if it exists
            const logId = (createdLog as any)?._id || (createdLog as any)?.id;

            if (createdLog && logId) {
              await fetch(
                `${API_URL}/violations/${violationId}/audit-log/${logId}`,
                {
                  method: "DELETE",
                  headers: {
                    "Content-Type": "application/json",
                  },
                  credentials: "include",
                },
              ).catch((e) =>
                console.warn(
                  `Failed to delete creation log for ${violationId}`,
                  e,
                ),
              );
            }
          }

          const response = await fetch(
            `${API_URL}/violations/${violationId}?bulkId=${encodeURIComponent(
              bulkId,
            )}`,
            {
              method: "DELETE",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to delete violation ${violationId}`);
          }
        }),
      );

      // Update local state - remove deleted violations
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          // Get IDs of deleted violations
          const deletedIds = violations.map((v) => {
            if (typeof v._id === "string") return v._id;
            if (v._id && typeof v._id === "object" && "$oid" in v._id)
              return (v._id as { $oid: string }).$oid;
            return String(v.id);
          });

          const updatedViolations = p.violations.filter((v) => {
            const vId =
              typeof v._id === "string"
                ? v._id
                : v._id && typeof v._id === "object" && "$oid" in v._id
                  ? (v._id as { $oid: string }).$oid
                  : String(v.id);
            return !deletedIds.includes(vId);
          });

          return {
            ...p,
            violations: updatedViolations,
          };
        }),
      );

      // Save stats
      if (match?.externalMatchId) {
        const currentPlatform = platformOperations.find(
          (p) => p.id === platformId,
        );
        if (currentPlatform) {
          const deletedIds = violations.map((v) => {
            if (typeof v._id === "string") return v._id;
            if (v._id && typeof v._id === "object" && "$oid" in v._id)
              return (v._id as { $oid: string }).$oid;
            return String(v.id);
          });
          const updatedViolations = currentPlatform.violations.filter((v) => {
            const vId =
              typeof v._id === "string"
                ? v._id
                : v._id && typeof v._id === "object" && "$oid" in v._id
                  ? (v._id as { $oid: string }).$oid
                  : String(v.id);
            return !deletedIds.includes(vId);
          });
          // Stats are now updated by the backend - no frontend calculation needed
        }
      }

      triggerRefetch();

      toast({
        title: t("matchDashboard.success.violationDeleted"),
        description: t("matchDashboard.success.multipleViolationsRemoved", {
          count: violations.length,
        }),
      });
    } catch (error) {
      console.error("Error deleting violations:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.failedToDelete"),
        variant: "destructive",
      });
    }
  };

  // Bulk status change
  const handleBulkStatusChange = async (
    platformId: string,
    violations: Violation[],
    status: "Active" | "Blocked" | "Removed" | "Under Review",
    blockedAt?: string,
  ) => {
    try {
      // Generate a unique bulkId for this bulk operation
      const bulkId = `bulk_${Date.now()}_${Math.random()
        .toString(36)
        .substring(2, 9)}`;

      await Promise.all(
        violations.map(async (violation) => {
          let violationId: string;
          if (typeof violation._id === "string") {
            violationId = violation._id;
          } else if (
            violation._id &&
            typeof violation._id === "object" &&
            "$oid" in violation._id
          ) {
            violationId = (violation._id as { $oid: string }).$oid;
          } else {
            violationId = String(violation.id);
          }

          const body: { status: string; blockedAt?: string } = { status };
          if (status === "Blocked" && blockedAt) {
            // Check if blockedAt is already in UTC or not
            // Assuming it comes from the dialog as KSA time string (e.g. "YYYY-MM-DDTHH:mm")
            // We should use convertKSATimeToUTC
            body.blockedAt = convertKSATimeToUTC(blockedAt);
          }

          const response = await fetch(
            `${API_URL}/violations/${violationId}/status?bulkId=${encodeURIComponent(bulkId)}`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify(body),
            },
          );

          if (!response.ok) {
            throw new Error(`Failed to update violation ${violationId}`);
          }
        }),
      );

      // Update local state
      setPlatformOperations((prev) =>
        prev.map((p) => {
          if (p.id !== platformId) return p;

          const updatedIds = violations.map((v) => {
            if (typeof v._id === "string") return v._id;
            if (v._id && typeof v._id === "object" && "$oid" in v._id)
              return (v._id as { $oid: string }).$oid;
            return String(v.id);
          });

          const updatedViolations = p.violations.map((v) => {
            const vId =
              typeof v._id === "string"
                ? v._id
                : v._id && typeof v._id === "object" && "$oid" in v._id
                  ? (v._id as { $oid: string }).$oid
                  : String(v.id);
            if (updatedIds.includes(vId)) {
              return {
                ...v,
                status: status,
                statusBadge:
                  status === "Under Review"
                    ? ("Review" as const)
                    : (status as
                        | "Active"
                        | "Blocked"
                        | "Removed"
                        | "Reported"
                        | "Pending"
                        | "Review"),
                blockedAt:
                  status === "Blocked" && blockedAt
                    ? convertKSATimeToUTC(blockedAt)
                    : status !== "Blocked"
                      ? undefined
                      : v.blockedAt,
              };
            }
            return v;
          });

          return {
            ...p,
            violations: updatedViolations,
          };
        }),
      );

      // Save stats
      if (match?.externalMatchId) {
        const currentPlatform = platformOperations.find(
          (p) => p.id === platformId,
        );
        if (currentPlatform) {
          const updatedIds = violations.map((v) => {
            if (typeof v._id === "string") return v._id;
            if (v._id && typeof v._id === "object" && "$oid" in v._id)
              return (v._id as { $oid: string }).$oid;
            return String(v.id);
          });

          const updatedViolationsList = currentPlatform.violations.map((v) => {
            const vId =
              typeof v._id === "string"
                ? v._id
                : v._id && typeof v._id === "object" && "$oid" in v._id
                  ? (v._id as { $oid: string }).$oid
                  : String(v.id);
            if (updatedIds.includes(vId)) {
              return {
                ...v,
                status: status,
                statusBadge:
                  status === "Under Review"
                    ? ("Review" as const)
                    : (status as
                        | "Active"
                        | "Blocked"
                        | "Removed"
                        | "Reported"
                        | "Pending"
                        | "Review"),
                blockedAt:
                  status === "Blocked" && blockedAt
                    ? convertKSATimeToUTC(blockedAt)
                    : status !== "Blocked"
                      ? undefined
                      : v.blockedAt,
              };
            }
            return v;
          });

          // Stats are now updated by the backend - no frontend calculation needed
        }
      }

      triggerRefetch();

      toast({
        title: t("matchDashboard.success.statusChanged"),
        description: t("matchDashboard.success.multipleViolationsUpdated", {
          count: violations.length,
        }),
      });
    } catch (error) {
      console.error("Error updating violations:", error);
      toast({
        title: t("matchDashboard.error.title"),
        description: t("matchDashboard.error.failedToUpdate"),
        variant: "destructive",
      });
    }
  };

  // Copy violation URL
  const copyViolationUrl = (url: string) => {
    navigator.clipboard.writeText(url);
    toast({
      title: t("matchDashboard.success.urlCopied"),
      description: t("matchDashboard.success.urlCopiedToClipboard"),
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
        }),
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

      // Determine background color based on theme
      const backgroundColor = isDarkMode ? "#0F172A" : "#ffffff";
      const textColor = isDarkMode ? "#F8FAFC" : "#1a1a1a";
      const secondaryTextColor = isDarkMode ? "#CBD5E1" : "#666";

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
        background-color: ${backgroundColor};
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
        <h1 style="font-size: 32px; font-weight: bold; margin: 0 0 16px 0; color: ${textColor};">
          ${match.team1} ${t("matchDashboard.report.vs")} ${match.team2}
        </h1>
        <div style="font-size: 18px; color: ${secondaryTextColor}; line-height: 1.8;">
          <p style="margin: 0 0 8px 0;"><strong>${t(
            "matchDashboard.report.league",
          )}</strong> ${competitionName || "N/A"}</p>
          <p style="margin: 0 0 8px 0;"><strong>${weekOrStageLabel}:</strong> ${weekOrStage}</p>
          <p style="margin: 0;"><strong>${t(
            "matchDashboard.report.dateTime",
          )}</strong> ${matchDateTime || "N/A"}</p>
            </div>
      `;

      // Temporarily add to DOM for capture
      document.body.appendChild(headerDiv);

      // Wait for rendering
      await new Promise((resolve) => setTimeout(resolve, 100));

      // Capture header
      const headerImage = await htmlToImage.toPng(headerDiv, {
        backgroundColor: backgroundColor,
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
          backgroundColor: backgroundColor,
          quality: 1,
          pixelRatio: 2,
        });
        images.push(dataUrl);
      }

      // Capture Status Breakdown
      if (statusBreakdownRef.current) {
        const dataUrl = await htmlToImage.toPng(statusBreakdownRef.current, {
          backgroundColor: backgroundColor,
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
          backgroundColor: backgroundColor,
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
          },
        );

        images.push(dataUrl);
      }

      // Capture Platform Comparison
      if (platformComparisonRef.current) {
        const dataUrl = await htmlToImage.toPng(platformComparisonRef.current, {
          backgroundColor: backgroundColor,
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
        0,
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
        const label = isSuperCup
          ? t("matchDashboard.report.stage")
          : t("matchDashboard.report.week");
        link.download = `Match-Report-${label}-${weekOrStageFormatted}-${
          match.team1
        }-${t("matchDashboard.report.vs")}-${match.team2}-${dateFormatted}.png`;
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
          error instanceof Error
            ? error.message
            : t("matchDashboard.error.failedToGenerateReport"),
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
                platform.violations,
              );

              // Filter bulk violations for this platform
              const platformBulkViolations = bulkViolations.filter(
                (bulk) => bulk.platformId === platform.id,
              );

              return (
                <PlatformCard
                  key={platform.id}
                  platform={platform}
                  filteredViolations={filteredViolations}
                  bulkViolations={platformBulkViolations}
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
                  onBulkDelete={handleBulkDelete}
                  onBulkStatusChange={handleBulkStatusChange}
                  getPlatformIcon={getPlatformIcon}
                  canModifyViolations={canModifyViolations}
                  onRefetch={triggerRefetch}
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
            description={t(
              "matchDashboard.sections.platformComparisonDescription",
            )}
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
            title={t("matchDashboard.sections.platformComparison")}
            description={t(
              "matchDashboard.sections.platformComparisonDescription",
            )}
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
            "-",
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
                (v) => (v.contentType || v.type) === "Live",
              );
              return liveViolations.length > 0;
            })
            .map((platform) => {
              const IconComponent = platform.icon;
              const liveViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Live",
              );
              const detected = liveViolations.length;
              const blocked = liveViolations.filter(
                (v) => v.status === "Blocked" || v.statusBadge === "Blocked",
              ).length;
              const successRate =
                detected > 0 ? Math.round((blocked / detected) * 100) : 0;

              // Calculate avg block time for live violations
              const blockedViolations = liveViolations.filter(
                (v) =>
                  v.blockedAt &&
                  (v.status === "Blocked" || v.statusBadge === "Blocked"),
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
                  totalBlockTime / blockedViolations.length,
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
                icon: platform.iconUrl ? (
                  <img
                    src={
                      platform.iconUrl.startsWith("http")
                        ? platform.iconUrl
                        : `${BASE_URL}${platform.iconUrl}`
                    }
                    alt={platform.name}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
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
                (v) => (v.contentType || v.type) === "Highlights",
              );
              return highlightsViolations.length > 0;
            })
            .map((platform) => {
              const IconComponent = platform.icon;
              const highlightsViolations = platform.violations.filter(
                (v) => (v.contentType || v.type) === "Highlights",
              );
              const detected = highlightsViolations.length;
              const blocked = highlightsViolations.filter(
                (v) => v.status === "Blocked" || v.statusBadge === "Blocked",
              ).length;
              const successRate =
                detected > 0 ? Math.round((blocked / detected) * 100) : 0;

              // Calculate avg block time for highlights violations
              const blockedViolations = highlightsViolations.filter(
                (v) =>
                  v.blockedAt &&
                  (v.status === "Blocked" || v.statusBadge === "Blocked"),
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
                  totalBlockTime / blockedViolations.length,
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
                icon: platform.iconUrl ? (
                  <img
                    src={
                      platform.iconUrl.startsWith("http")
                        ? platform.iconUrl
                        : `${BASE_URL}${platform.iconUrl}`
                    }
                    alt={platform.name}
                    className="h-4 w-4 object-contain"
                  />
                ) : (
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
