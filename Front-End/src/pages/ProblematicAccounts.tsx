import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
} from "@/components/ui/pagination";
import * as XLSX from "xlsx-js-style";
import {
  AlertTriangle,
  Eye,
  TrendingUp,
  Loader2,
  ExternalLink,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
  Download,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { ProblematicAccountsMobile } from "./ProblematicAccountsMobile";

type League = string | null;
type WeekFilterType = "all" | "single" | "range";

interface ProblematicAccount {
  accountChannel: string;
  platformName: string;
  platformId: string;
  totalViolations: number;
  totalViews: number;
  activeCount: number;
  blockedCount: number;
  removedCount: number;
  underReviewCount: number;
  liveCount: number;
  highlightsCount: number;
  othersCount: number;
  matchesAffected: number;
  latestViolation: string;
}

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function ProblematicAccounts() {
  const navigate = useNavigate();
  const { user, leagues, loadingLeagues } = useAuth();
  const { t, isRTL } = useLanguage();

  // Get available leagues based on user role (memoized to prevent infinite loops)
  const availableLeagues = useMemo((): League[] => {
    if (!user || !leagues) return [];

    // Filter out hidden leagues
    const visibleLeagues = leagues.filter((l) => !l.isHidden);

    // SuperAdmin and Viewer can access all visible leagues
    if (user.role === "superAdmin" || user.role === "viewer") {
      return visibleLeagues
        .map((l) => l.league as League)
        .filter((l): l is string => Boolean(l));
    }

    // Employees can only access their assigned leagues (that are visible)
    if (user.role === "employee" && user.leagues) {
      return visibleLeagues
        .filter((l) => user.leagues?.includes(l.league) && l.league)
        .map((l) => l.league as League)
        .filter((l): l is string => Boolean(l));
    }

    return [];
  }, [user, leagues]);

  // Validate user's league access on mount and when user/leagues change
  useEffect(() => {
    // Wait until leagues are loaded before validating
    if (!user || loadingLeagues) {
      return;
    }

    // If leagues array is empty after loading, something went wrong - but don't redirect yet
    if (leagues.length === 0) {
      return;
    }

    // Get available leagues based on user role
    const visibleLeagues = leagues.filter((l) => !l.isHidden);
    let availableLeaguesList: League[] = [];
    if (user.role === "superAdmin" || user.role === "viewer") {
      availableLeaguesList = visibleLeagues.map((l) => l.league);
    } else if (user.role === "employee" && user.leagues) {
      availableLeaguesList = visibleLeagues
        .filter((l) => user.leagues?.includes(l.league))
        .map((l) => l.league);
    }

    // For employees: if they have no available leagues, redirect to home
    if (user.role === "employee" && availableLeaguesList.length === 0) {
      navigate("/");
      return;
    }

    // Validate saved league from localStorage (if exists)
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    if (savedLeague) {
      const leagueInfo = leagues.find((l) => l.league === savedLeague);

      // For employees: check if saved league is still in their assigned leagues
      if (user.role === "employee") {
        const isInAssignedLeagues =
          user.leagues && user.leagues.includes(savedLeague);
        const isVisible = leagueInfo && !leagueInfo.isHidden;

        if (!isInAssignedLeagues || !isVisible) {
          // Saved league is no longer valid - redirect to home to select new league
          navigate("/");
        }
        // If valid, do nothing - let the page continue
      } else {
        // For superAdmin/viewer: check if saved league is still valid
        if (
          !leagueInfo ||
          leagueInfo.isHidden ||
          !availableLeaguesList.includes(savedLeague)
        ) {
          // Saved league is no longer valid - redirect to home
          navigate("/");
        }
        // If valid, do nothing - let the page continue
      }
    }
    // Only run validation when user role, leagues finish loading, or leagues array changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.role, user?.id, loadingLeagues, leagues?.length]);

  // Filters
  const [league, setLeague] = useState<League>(null);
  const [weekFilterType, setWeekFilterType] = useState<WeekFilterType>("all");
  const [singleWeek, setSingleWeek] = useState<string>("1");
  const [weekRangeStart, setWeekRangeStart] = useState<string>("1");
  const [weekRangeEnd, setWeekRangeEnd] = useState<string>("12");

  // Stage filtering for Super Cups
  const [stageFilterType, setStageFilterType] = useState<WeekFilterType>("all");
  const [singleStage, setSingleStage] = useState<string>("");
  const [stageRangeStart, setStageRangeStart] = useState<string>("");
  const [stageRangeEnd, setStageRangeEnd] = useState<string>("");

  // Hardcoded stages for Super Cups (similar to weeks for regular leagues)
  // Backend expects English values, but we display translated versions
  const availableStages = [
    "16th Finals",
    "8th Finals",
    "Quarter-finals",
    "Semi-finals",
    "Final",
  ];

  const getStageDisplayName = (stage: string): string => {
    const stageMap: Record<string, string> = {
      "16th Finals": t("problematicAccounts.stages.16thFinals"),
      "8th Finals": t("problematicAccounts.stages.8thFinals"),
      "Quarter-finals": t("problematicAccounts.stages.quarterFinals"),
      "Semi-finals": t("problematicAccounts.stages.semiFinals"),
      Final: t("problematicAccounts.stages.final"),
    };
    return stageMap[stage] || stage;
  };

  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  // Data
  const [accounts, setAccounts] = useState<ProblematicAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"violations" | "views" | "matches">(
    "violations"
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;
  const [isExporting, setIsExporting] = useState(false);

  // Thresholds from settings
  const [viewsThreshold, setViewsThreshold] = useState<number>(1000);
  const [violationsThreshold, setViolationsThreshold] = useState<number>(5);
  const [loadingThresholds, setLoadingThresholds] = useState(true);

  // Get platform operations for icons
  const platformOperations = getInitialPlatformOperations();

  const getPlatformIconComponent = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    if (!platform) {
      return AlertTriangle;
    }
    return platform.icon;
  };

  const getPlatformColor = (platformName: string): string => {
    const platform = platformOperations.find((p) => p.name === platformName);
    return platform ? platform.color : "hsl(var(--muted-foreground))";
  };

  // Fetch thresholds from settings
  useEffect(() => {
    const fetchThresholds = async () => {
      try {
        const response = await fetch(`${API_URL}/settings`, {
          credentials: "include",
        });

        if (response.ok) {
          const settings = await response.json();
          setViewsThreshold(settings.viewsThreshold ?? 1000);
          setViolationsThreshold(settings.violationsThreshold ?? 5);
        }
      } catch (error) {
        console.error("Error fetching thresholds:", error);
        // Use defaults if API fails
        setViewsThreshold(1000);
        setViolationsThreshold(5);
      } finally {
        setLoadingThresholds(false);
      }
    };

    fetchThresholds();
  }, []);

  // Fetch problematic accounts
  useEffect(() => {
    const fetchProblematicAccounts = async () => {
      setLoading(true);
      try {
        // For employees, when "All Leagues" is selected, fetch from all their assigned leagues
        const leaguesToFetch: League[] = [];
        if (league) {
          // Single league selected
          leaguesToFetch.push(league);
        } else if (user?.role === "employee" && availableLeagues.length > 0) {
          // "All Leagues" selected for employee - use all their assigned leagues
          leaguesToFetch.push(...availableLeagues);
        } else if (user?.role === "superAdmin" || user?.role === "viewer") {
          // "All Leagues" selected for superAdmin/viewer - fetch all visible leagues
          const visibleLeagues =
            leagues?.filter((l) => !l.isHidden && l.league) || [];
          leaguesToFetch.push(
            ...visibleLeagues
              .map((l) => l.league as League)
              .filter((l): l is string => Boolean(l))
          );
        }

        // If no leagues to fetch, return empty array
        if (leaguesToFetch.length === 0) {
          setAccounts([]);
          setLoading(false);
          return;
        }

        // Fetch accounts for each league and combine results
        const allAccounts: ProblematicAccount[] = [];
        const accountMap = new Map<string, ProblematicAccount>();

        for (const leagueToFetch of leaguesToFetch) {
          // Check if league is a Cup using competitionType from backend
          const leagueInfo = leagues?.find((l) => l.league === leagueToFetch);
          const isSuperCup = leagueInfo?.competitionType === "cup";
          const params = new URLSearchParams();
          params.append("league", leagueToFetch);
          if (selectedPlatform && selectedPlatform !== "all") {
            params.append("platformId", selectedPlatform);
          }

          if (isSuperCup) {
            // Use stage filtering for Super Cups
            if (stageFilterType !== "all") {
              params.append("stageFilter", stageFilterType);
              if (stageFilterType === "single") {
                params.append("stage", singleStage);
              } else if (stageFilterType === "range") {
                params.append("stageStart", stageRangeStart);
                params.append("stageEnd", stageRangeEnd);
              }
            }
          } else {
            // Use week filtering for regular leagues
            if (weekFilterType !== "all") {
              params.append("weekFilter", weekFilterType);
              if (weekFilterType === "single") {
                params.append("week", singleWeek);
              } else if (weekFilterType === "range") {
                params.append("weekStart", weekRangeStart);
                params.append("weekEnd", weekRangeEnd);
              }
            }
          }
          params.append("limit", "100");

          const response = await fetch(
            `${API_URL}/violations/problematic-accounts?${params.toString()}`,
            {
              credentials: "include",
            }
          );

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(
              errorData.error ||
                `Failed to fetch problematic accounts: ${response.status}`
            );
          }

          const data = await response.json();

          // Combine accounts by accountChannel + platformId
          // If same account appears in multiple leagues, aggregate the stats
          (data || []).forEach((account: ProblematicAccount) => {
            const key = `${account.accountChannel}-${account.platformId}`;
            const existing = accountMap.get(key);

            if (existing) {
              // Aggregate stats for the same account across leagues
              existing.totalViolations += account.totalViolations;
              existing.totalViews += account.totalViews;
              existing.activeCount += account.activeCount;
              existing.blockedCount += account.blockedCount;
              existing.removedCount += account.removedCount;
              existing.underReviewCount += account.underReviewCount;
              existing.liveCount += account.liveCount;
              existing.highlightsCount += account.highlightsCount;
              existing.othersCount += account.othersCount;
              existing.matchesAffected += account.matchesAffected;
              // Keep the latest violation date
              if (account.latestViolation > existing.latestViolation) {
                existing.latestViolation = account.latestViolation;
              }
            } else {
              accountMap.set(key, { ...account });
            }
          });
        }

        // Convert map to array
        const combinedAccounts = Array.from(accountMap.values());

        // Filter accounts based on thresholds
        // An account is problematic if it has views >= viewsThreshold OR violations >= violationsThreshold
        const filteredData = combinedAccounts.filter(
          (account: ProblematicAccount) => {
            return (
              account.totalViews >= viewsThreshold ||
              account.totalViolations >= violationsThreshold
            );
          }
        );

        setAccounts(filteredData);
      } catch (error) {
        console.error("Error fetching problematic accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    if (!loadingThresholds) {
      fetchProblematicAccounts();
    }
    // Only depend on availableLeagues length and user role, not the full arrays
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    league,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    stageFilterType,
    singleStage,
    stageRangeStart,
    stageRangeEnd,
    selectedPlatform,
    viewsThreshold,
    violationsThreshold,
    loadingThresholds,
    user?.role,
    availableLeagues.length,
  ]);

  // Filter accounts by search query (account name only)
  const filteredAccounts = accounts.filter((account) => {
    if (!searchQuery.trim()) return true;
    const searchLower = searchQuery.toLowerCase();
    return account.accountChannel.toLowerCase().includes(searchLower);
  });

  // Sort accounts
  const sortedAccounts = [...filteredAccounts].sort((a, b) => {
    if (sortBy === "violations") {
      return b.totalViolations - a.totalViolations;
    } else if (sortBy === "views") {
      return b.totalViews - a.totalViews;
    } else {
      return b.matchesAffected - a.matchesAffected;
    }
  });

  // Pagination logic
  const totalPages = Math.ceil(sortedAccounts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedAccounts = sortedAccounts.slice(startIndex, endIndex);

  // Create array of pages to display for pagination
  const pagesToShow: (number | string)[] = [];
  if (totalPages > 1) {
    for (let page = 1; page <= totalPages; page++) {
      if (
        page === 1 ||
        page === totalPages ||
        (page >= currentPage - 1 && page <= currentPage + 1)
      ) {
        pagesToShow.push(page);
      } else if (page === currentPage - 2 || page === currentPage + 2) {
        pagesToShow.push("...");
      }
    }
  }
  // Reverse for RTL
  const displayPages = isRTL ? [...pagesToShow].reverse() : pagesToShow;

  // Reset to page 1 when filters or search changes
  useEffect(() => {
    setCurrentPage(1);
  }, [
    league,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    stageFilterType,
    singleStage,
    stageRangeStart,
    stageRangeEnd,
    selectedPlatform,
    searchQuery,
  ]);

  // Format views (pure numbers with commas, no abbreviations)
  const formatViews = (views: number) => {
    return views.toLocaleString("en-US");
  };

  // Helper to get league icon path
  const getLeagueIcon = (league: League): string => {
    if (!league) return "";
    const leagueInfo = leagues?.find((l) => l.league === league);
    if (leagueInfo?.iconUrl) {
      // Use iconUrl from database, prepend API URL if it's a relative path
      if (leagueInfo.iconUrl.startsWith("/")) {
        return `${API_URL.replace("/api", "")}${leagueInfo.iconUrl}`;
      }
      return leagueInfo.iconUrl;
    }
    return "";
  };

  // Helper to get league name
  const getLeagueName = (league: League): string => {
    if (!league) return "";
    const leagueInfo = leagues?.find((l) => l.league === league);
    if (isRTL) {
      return (
        leagueInfo?.arabicName ||
        leagueInfo?.knownName ||
        leagueInfo?.name ||
        league
      );
    }
    return (
      leagueInfo?.knownName ||
      leagueInfo?.name ||
      leagueInfo?.arabicName ||
      league
    );
  };

  // Auto-select first available league for employees if they have only one league
  useEffect(() => {
    if (user?.role === "employee" && availableLeagues.length === 1 && !league) {
      setLeague(availableLeagues[0]);
    }
  }, [user, availableLeagues, league]);

  // Export to Excel function with styling
  const handleExportToExcel = () => {
    setIsExporting(true);
    try {
      // Create headers
      const headers = isRTL
        ? [
            "الترتيب",
            "الحساب",
            "المنصة",
            "إجمالي المشاهدات",
            "عدد الانتهاكات",
            "نشط",
            "محظور",
            "معدل نجاح الحظر",
            "محذوف",
            "قيد المراجعة",
          ]
        : [
            "Rank",
            "Account",
            "Platform",
            "Total Views",
            "Violations Count",
            "Active Count",
            "Blocked Count",
            "Block Success Rate",
            "Removed Count",
            "Under Review Count",
          ];

      // Create data rows
      const data = sortedAccounts.map((account, index) => {
        const successRate =
          account.totalViolations > 0
            ? Math.round(
                ((account.blockedCount + account.removedCount) /
                  account.totalViolations) *
                  100
              )
            : 0;

        return {
          [headers[0]]: index + 1,
          [headers[1]]: account.accountChannel,
          [headers[2]]: account.platformName,
          [headers[3]]: account.totalViews,
          [headers[4]]: account.totalViolations,
          [headers[5]]: account.activeCount,
          [headers[6]]: account.blockedCount,
          [headers[7]]: `${successRate}%`,
          [headers[8]]: account.removedCount,
          [headers[9]]: account.underReviewCount,
        };
      });

      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data);

      // Set column widths
      const columnWidths = [
        { wch: 8 }, // Rank
        { wch: 30 }, // Account
        { wch: 15 }, // Platform
        { wch: 15 }, // Total Views
        { wch: 18 }, // Violations Count
        { wch: 13 }, // Active Count
        { wch: 15 }, // Blocked Count
        { wch: 20 }, // Block Success Rate
        { wch: 15 }, // Removed Count
        { wch: 18 }, // Under Review Count
      ];
      worksheet["!cols"] = columnWidths;

      // Style the header row (first row)
      const range = XLSX.utils.decode_range(worksheet["!ref"] || "A1");
      for (let col = range.s.c; col <= range.e.c; col++) {
        const cellAddress = XLSX.utils.encode_cell({ r: 0, c: col });
        if (!worksheet[cellAddress]) continue;

        // Header styling
        worksheet[cellAddress].s = {
          font: {
            bold: true,
            color: { rgb: "FFFFFF" },
            sz: 12,
          },
          fill: {
            fgColor: { rgb: "4F46E5" }, // Indigo color
          },
          alignment: {
            horizontal: "center",
            vertical: "center",
          },
          border: {
            top: { style: "thin", color: { rgb: "000000" } },
            bottom: { style: "thin", color: { rgb: "000000" } },
            left: { style: "thin", color: { rgb: "000000" } },
            right: { style: "thin", color: { rgb: "000000" } },
          },
        };
      }

      // Style data rows with alternating colors
      for (let row = range.s.r + 1; row <= range.e.r; row++) {
        const isEvenRow = row % 2 === 0;
        for (let col = range.s.c; col <= range.e.c; col++) {
          const cellAddress = XLSX.utils.encode_cell({ r: row, c: col });
          if (!worksheet[cellAddress]) continue;

          worksheet[cellAddress].s = {
            font: {
              sz: 11,
            },
            fill: {
              fgColor: { rgb: isEvenRow ? "F3F4F6" : "FFFFFF" }, // Alternating gray/white
            },
            alignment: {
              horizontal: col === 0 ? "center" : "left", // Center rank, left-align others
              vertical: "center",
            },
            border: {
              top: { style: "thin", color: { rgb: "E5E7EB" } },
              bottom: { style: "thin", color: { rgb: "E5E7EB" } },
              left: { style: "thin", color: { rgb: "E5E7EB" } },
              right: { style: "thin", color: { rgb: "E5E7EB" } },
            },
          };

          // Special styling for specific columns
          // Active Count - Red background
          if (col === 5) {
            worksheet[cellAddress].s.fill = {
              fgColor: { rgb: "FEE2E2" }, // Light red
            };
            worksheet[cellAddress].s.font = {
              ...worksheet[cellAddress].s.font,
              color: { rgb: "991B1B" }, // Dark red
              bold: true,
            };
          }
          // Blocked Count - Green background
          else if (col === 6) {
            worksheet[cellAddress].s.fill = {
              fgColor: { rgb: "D1FAE5" }, // Light green
            };
            worksheet[cellAddress].s.font = {
              ...worksheet[cellAddress].s.font,
              color: { rgb: "065F46" }, // Dark green
              bold: true,
            };
          }
          // Success Rate - Blue background
          else if (col === 7) {
            worksheet[cellAddress].s.fill = {
              fgColor: { rgb: "DBEAFE" }, // Light blue
            };
            worksheet[cellAddress].s.font = {
              ...worksheet[cellAddress].s.font,
              color: { rgb: "1E40AF" }, // Dark blue
              bold: true,
            };
            worksheet[cellAddress].s.alignment = {
              horizontal: "center",
              vertical: "center",
            };
          }
        }
      }

      // Create workbook
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        isRTL ? "الحسابات الإشكالية" : "Problematic Accounts"
      );

      // Generate Excel file
      XLSX.writeFile(
        workbook,
        `problematic-accounts-${new Date().toISOString().split("T")[0]}.xlsx`,
        { cellStyles: true }
      );

      toast({
        title: t("problematicAccounts.exportSuccess"),
        description: t("problematicAccounts.exportSuccessDescription"),
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: t("problematicAccounts.exportError"),
        description: t("problematicAccounts.exportErrorDescription"),
        variant: "destructive",
      });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("problematicAccounts.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("problematicAccounts.subtitle")}
          </p>
          {!loadingThresholds && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {isRTL ? (
                <>
                  عرض الحسابات التي لديها مشاهدات{" "}
                  <span dir="ltr" className="inline">
                    ≥ {viewsThreshold.toLocaleString("en-US")}
                  </span>{" "}
                  أو انتهاكات{" "}
                  <span dir="ltr" className="inline">
                    ≥ {violationsThreshold}
                  </span>
                </>
              ) : (
                t("problematicAccounts.showingAccounts", {
                  viewsThreshold: viewsThreshold.toLocaleString("en-US"),
                  violationsThreshold: violationsThreshold,
                })
              )}
            </p>
          )}
        </div>
        {/* Export Button */}
        <Button
          onClick={handleExportToExcel}
          disabled={isExporting || loading || sortedAccounts.length === 0}
          className="h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
          {isExporting ? (
            <>
              <Loader2 className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2 animate-spin" />
              {t("problematicAccounts.exporting")}
            </>
          ) : (
            <>
              <Download className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" />
              {t("problematicAccounts.exportToExcel")}
            </>
          )}
        </Button>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4 ">
        {/* Search Bar */}
        <div className="relative mb-6">
          <Search
            className={`absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ${
              isRTL ? "right-3" : "left-3"
            }`}
          />
          <Input
            type="text"
            placeholder={t("problematicAccounts.searchAccounts")}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`h-10 text-sm text-left placeholder:text-left ${
              isRTL ? "pr-10 pl-3" : "pl-10 pr-3"
            }`}
          />
        </div>
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">
              {t("problematicAccounts.filters")}
            </span>
          </div>

          {/* League Filter */}
          {availableLeagues.length === 0 ? (
            <div className="text-xs sm:text-sm text-muted-foreground">
              {t("problematicAccounts.noLeaguesAvailable")}
            </div>
          ) : (
            <Select
              value={
                league ||
                (availableLeagues.length === 1 ? availableLeagues[0] : "all")
              }
              onValueChange={(value) => {
                if (value === "all") {
                  // Only allow "all" if user has access to multiple leagues
                  if (availableLeagues.length > 1) {
                    setLeague(null);
                  }
                } else {
                  setLeague(value as League);
                }
              }}>
              <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                <div className="flex items-center gap-2">
                  <SelectValue placeholder={t("problematicAccounts.league")} />
                </div>
              </SelectTrigger>
              <SelectContent>
                {/* Show "All Leagues" only if user has access to multiple leagues */}
                {availableLeagues.length > 1 && (
                  <SelectItem value="all" className="text-xs sm:text-sm">
                    {t("problematicAccounts.allLeagues")}
                  </SelectItem>
                )}
                {availableLeagues.map((leagueSlug) => {
                  const leagueInfo = leagues?.find(
                    (l) => l.league === leagueSlug
                  );
                  if (!leagueInfo) return null;
                  const iconUrl = leagueInfo.iconUrl
                    ? leagueInfo.iconUrl.startsWith("/")
                      ? `${API_URL.replace("/api", "")}${leagueInfo.iconUrl}`
                      : leagueInfo.iconUrl
                    : null;
                  return (
                    <SelectItem
                      key={leagueSlug}
                      value={leagueSlug}
                      className="text-xs sm:text-sm">
                      <div className="flex items-center gap-2">
                        {iconUrl && (
                          <img
                            src={iconUrl}
                            alt={
                              leagueInfo.knownName ||
                              leagueInfo.name ||
                              leagueInfo.arabicName ||
                              leagueSlug
                            }
                            className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0"
                          />
                        )}
                        <span>
                          {isRTL
                            ? leagueInfo.arabicName ||
                              leagueInfo.knownName ||
                              leagueInfo.name ||
                              leagueSlug
                            : leagueInfo.knownName ||
                              leagueInfo.name ||
                              leagueInfo.arabicName ||
                              leagueSlug}
                        </span>
                      </div>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          )}

          {/* Platform Filter */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              <SelectValue placeholder={t("problematicAccounts.platform")} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs sm:text-sm">
                {t("problematicAccounts.allPlatforms")}
              </SelectItem>
              {platformOperations.map((platform) => (
                <SelectItem
                  key={platform.id}
                  value={platform.id}
                  className="text-xs sm:text-sm">
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Week/Stage Filter Type */}
          {(() => {
            // Check if selected league is a Cup using competitionType from backend
            const leagueInfo = leagues?.find((l) => l.league === league);
            const isSuperCup = leagueInfo?.competitionType === "cup";

            if (isSuperCup) {
              // Stage filters for Super Cups
              return (
                <>
                  <Select
                    value={stageFilterType}
                    onValueChange={(value) =>
                      setStageFilterType(value as WeekFilterType)
                    }>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      <SelectValue
                        placeholder={t("problematicAccounts.stageFilter")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">
                        {t("problematicAccounts.allStages")}
                      </SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">
                        {t("problematicAccounts.singleStage")}
                      </SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">
                        {t("problematicAccounts.stageRange")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Stage */}
                  {stageFilterType === "single" && (
                    <Select value={singleStage} onValueChange={setSingleStage}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue
                          placeholder={t("problematicAccounts.stage")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStages.map((stage) => (
                          <SelectItem
                            key={stage}
                            value={stage}
                            className="text-xs sm:text-sm">
                            {getStageDisplayName(stage)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Stage Range */}
                  {stageFilterType === "range" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Select
                        value={stageRangeStart}
                        onValueChange={setStageRangeStart}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue
                            placeholder={t("problematicAccounts.startStage")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem
                              key={stage}
                              value={stage}
                              className="text-xs sm:text-sm">
                              {getStageDisplayName(stage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                        {t("problematicAccounts.to")}
                      </span>
                      <Select
                        value={stageRangeEnd}
                        onValueChange={setStageRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue
                            placeholder={t("problematicAccounts.endStage")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem
                              key={stage}
                              value={stage}
                              className="text-xs sm:text-sm">
                              {getStageDisplayName(stage)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              );
            } else {
              // Week filters for regular leagues
              return (
                <>
                  <Select
                    value={weekFilterType}
                    onValueChange={(value) =>
                      setWeekFilterType(value as WeekFilterType)
                    }>
                    <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                      <SelectValue
                        placeholder={t("problematicAccounts.weekFilter")}
                      />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">
                        {t("problematicAccounts.allWeeks")}
                      </SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">
                        {t("problematicAccounts.singleWeek")}
                      </SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">
                        {t("problematicAccounts.weekRange")}
                      </SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Week */}
                  {weekFilterType === "single" && (
                    <Select value={singleWeek} onValueChange={setSingleWeek}>
                      <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue
                          placeholder={t("problematicAccounts.week")}
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 38 }, (_, i) => i + 1).map(
                          (week) => (
                            <SelectItem
                              key={week}
                              value={week.toString()}
                              className="text-xs sm:text-sm">
                              {t("problematicAccounts.week")} {week}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                  )}

                  {/* Week Range */}
                  {weekFilterType === "range" && (
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <Select
                        value={weekRangeStart}
                        onValueChange={setWeekRangeStart}>
                        <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue
                            placeholder={t("problematicAccounts.startWeek")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem
                                key={week}
                                value={week.toString()}
                                className="text-xs sm:text-sm">
                                {t("problematicAccounts.week")} {week}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">
                        {t("problematicAccounts.to")}
                      </span>
                      <Select
                        value={weekRangeEnd}
                        onValueChange={setWeekRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue
                            placeholder={t("problematicAccounts.endWeek")}
                          />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem
                                key={week}
                                value={week.toString()}
                                className="text-xs sm:text-sm">
                                {t("problematicAccounts.week")} {week}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </>
              );
            }
          })()}

          {/* Sort By */}
          <div className="w-full sm:w-auto sm:ml-auto flex items-center gap-2">
            <span className="text-xs sm:text-sm text-muted-foreground">
              {t("problematicAccounts.sortBy")}
            </span>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violations" className="text-xs sm:text-sm">
                  {t("problematicAccounts.violations")}
                </SelectItem>
                <SelectItem value="views" className="text-xs sm:text-sm">
                  {t("problematicAccounts.views")}
                </SelectItem>
                <SelectItem value="matches" className="text-xs sm:text-sm">
                  {t("problematicAccounts.matches")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      {/* Mobile Version */}
      <div className="md:hidden">
        <ProblematicAccountsMobile
          accounts={paginatedAccounts}
          loading={loading}
          sortBy={sortBy}
        />
        {/* Mobile Pagination */}
        {!loading && sortedAccounts.length > 0 && totalPages > 1 && (
          <div className="mt-4">
            <Pagination>
              <PaginationContent
                className={`flex-wrap justify-center gap-1 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}>
                {isRTL ? (
                  <>
                    {/* RTL: Next on left, Previous on right */}
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="gap-1 pr-2.5 h-9 text-xs">
                        <span>{t("dashboard.pagination.next")}</span>
                        <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                      </Button>
                    </PaginationItem>

                    {displayPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          </PaginationItem>
                        );
                      }
                      const page = item as number;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer min-w-[32px] h-8 text-xs">
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="gap-1 pl-2.5 h-9 text-xs">
                        <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                        <span>{t("dashboard.pagination.previous")}</span>
                      </Button>
                    </PaginationItem>
                  </>
                ) : (
                  <>
                    {/* LTR: Previous on left, Next on right */}
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="gap-1 pl-2.5 h-9 text-xs">
                        <ChevronLeft className="h-4 w-4" />
                        <span>{t("dashboard.pagination.previous")}</span>
                      </Button>
                    </PaginationItem>

                    {displayPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          </PaginationItem>
                        );
                      }
                      const page = item as number;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer min-w-[32px] h-8 text-xs">
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="gap-1 pr-2.5 h-9 text-xs">
                        <span>{t("dashboard.pagination.next")}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </div>

      {/* Desktop Version */}
      <Card className="hidden md:block p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              {t("problematicAccounts.loadingAccounts")}
            </span>
          </div>
        ) : sortedAccounts.length === 0 ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <p className="text-xs sm:text-sm text-muted-foreground">
              {t("problematicAccounts.noAccountsFound")}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[800px]">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.rank")}
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.accountChannel")}
                  </th>
                  <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.platform")}
                  </th>
                  <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.violations")}
                  </th>
                  <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.totalViews")}
                  </th>
                  <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.matches")}
                  </th>
                  <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.status")}
                  </th>
                  <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                    {t("problematicAccounts.contentType")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {paginatedAccounts.map((account, index) => {
                  const PlatformIcon = getPlatformIconComponent(
                    account.platformName
                  );
                  const platformColor = getPlatformColor(account.platformName);
                  const successRate =
                    account.totalViolations > 0
                      ? Math.round(
                          ((account.blockedCount + account.removedCount) /
                            account.totalViolations) *
                            100
                        )
                      : 0;

                  return (
                    <tr
                      key={`${account.accountChannel}-${account.platformId}`}
                      className="border-b border-border/40 hover:bg-muted/20 transition-colors">
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-muted-foreground">
                            #{startIndex + index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive dark:text-red-400 flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-medium truncate">
                            {account.accountChannel}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <PlatformIcon
                            className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
                            style={{ color: platformColor }}
                          />
                          <span className="text-xs sm:text-sm truncate">
                            {account.platformName}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-sm sm:text-base font-bold">
                            {account.totalViolations.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-1.5 sm:gap-2 mt-1 flex-wrap justify-end">
                            <Badge
                              variant="destructive"
                              className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0 dark:bg-red-500 dark:text-white">
                              {account.activeCount}{" "}
                              {t("problematicAccounts.active")}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                              {account.blockedCount}{" "}
                              {t("problematicAccounts.blocked")}
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-muted-foreground flex-shrink-0" />
                          <span className="text-xs sm:text-sm font-semibold">
                            {formatViews(account.totalViews)}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <span className="text-xs sm:text-sm font-medium">
                          {account.matchesAffected}
                        </span>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={
                              successRate >= 80 ? "default" : "secondary"
                            }
                            className="text-[9px] sm:text-[10px] px-1.5 sm:px-2 py-0">
                            {successRate}% {t("problematicAccounts.success")}
                          </Badge>
                          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground flex-wrap justify-end">
                            <span>
                              {account.blockedCount}{" "}
                              {t("problematicAccounts.blocked")}
                            </span>
                            <span>•</span>
                            <span>
                              {account.removedCount}{" "}
                              {t("problematicAccounts.removed")}
                            </span>
                            <span>•</span>
                            <span>
                              {account.underReviewCount}{" "}
                              {t("problematicAccounts.review")}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end gap-0.5 sm:gap-1 text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {t("problematicAccounts.live")}
                            </span>
                            <span className="font-medium">
                              {account.liveCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {t("problematicAccounts.highlights")}
                            </span>
                            <span className="font-medium">
                              {account.highlightsCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              {t("problematicAccounts.others")}
                            </span>
                            <span className="font-medium">
                              {account.othersCount}
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {/* Desktop Pagination */}
        {!loading && sortedAccounts.length > 0 && totalPages > 1 && (
          <div className="border-t border-border p-4">
            <Pagination>
              <PaginationContent
                className={`flex-wrap justify-center gap-1 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}>
                {isRTL ? (
                  <>
                    {/* RTL: Next on left, Previous on right */}
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="gap-1 pr-2.5 h-9 text-xs">
                        <span>{t("dashboard.pagination.next")}</span>
                        <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                      </Button>
                    </PaginationItem>

                    {displayPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          </PaginationItem>
                        );
                      }
                      const page = item as number;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer min-w-[32px] h-8 text-xs">
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="gap-1 pl-2.5 h-9 text-xs">
                        <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                        <span>{t("dashboard.pagination.previous")}</span>
                      </Button>
                    </PaginationItem>
                  </>
                ) : (
                  <>
                    {/* LTR: Previous on left, Next on right */}
                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage > 1) {
                            setCurrentPage(currentPage - 1);
                          }
                        }}
                        disabled={currentPage === 1}
                        className="gap-1 pl-2.5 h-9 text-xs">
                        <ChevronLeft className="h-4 w-4" />
                        <span>{t("dashboard.pagination.previous")}</span>
                      </Button>
                    </PaginationItem>

                    {displayPages.map((item, index) => {
                      if (item === "...") {
                        return (
                          <PaginationItem key={`ellipsis-${index}`}>
                            <span className="px-2 text-muted-foreground">
                              ...
                            </span>
                          </PaginationItem>
                        );
                      }
                      const page = item as number;
                      return (
                        <PaginationItem key={page}>
                          <PaginationLink
                            href="#"
                            onClick={(e) => {
                              e.preventDefault();
                              setCurrentPage(page);
                            }}
                            isActive={currentPage === page}
                            className="cursor-pointer min-w-[32px] h-8 text-xs">
                            {page}
                          </PaginationLink>
                        </PaginationItem>
                      );
                    })}

                    <PaginationItem>
                      <Button
                        variant="ghost"
                        size="default"
                        onClick={() => {
                          if (currentPage < totalPages) {
                            setCurrentPage(currentPage + 1);
                          }
                        }}
                        disabled={currentPage === totalPages}
                        className="gap-1 pr-2.5 h-9 text-xs">
                        <span>{t("dashboard.pagination.next")}</span>
                        <ChevronRight className="h-4 w-4" />
                      </Button>
                    </PaginationItem>
                  </>
                )}
              </PaginationContent>
            </Pagination>
          </div>
        )}
      </Card>
    </div>
  );
}
