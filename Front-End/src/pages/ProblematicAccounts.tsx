import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Eye,
  TrendingUp,
  Loader2,
  ExternalLink,
  Filter,
} from "lucide-react";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { useAuth } from "@/contexts/AuthContext";
import { ProblematicAccountsMobile } from "./ProblematicAccountsMobile";

type League = "saudi" | "saudi-super-cup" | "spanish-super-cup" | null;
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
  const { user } = useAuth();

  // Get available leagues based on user role (memoized to prevent infinite loops)
  const availableLeagues = useMemo((): League[] => {
    if (!user) return [];

    // SuperAdmin and Viewer can access all leagues
    if (user.role === "superAdmin" || user.role === "viewer") {
      return ["saudi", "saudi-super-cup", "spanish-super-cup"];
    }

    // Employees can only access their assigned leagues
    if (user.role === "employee" && user.leagues) {
      return user.leagues;
    }

    return [];
  }, [user]);

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
  const availableStages = [
    "16th Finals",
    "8th Finals",
    "Quarter-finals",
    "Semi-finals",
    "Final",
  ];

  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  // Data
  const [accounts, setAccounts] = useState<ProblematicAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"violations" | "views" | "matches">(
    "violations"
  );

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
          // "All Leagues" selected for superAdmin/viewer - fetch all leagues
          leaguesToFetch.push("saudi", "saudi-super-cup", "spanish-super-cup");
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
          const isSuperCup =
            leagueToFetch === "saudi-super-cup" ||
            leagueToFetch === "spanish-super-cup";
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
    availableLeagues,
  ]);

  // Sort accounts
  const sortedAccounts = [...accounts].sort((a, b) => {
    if (sortBy === "violations") {
      return b.totalViolations - a.totalViolations;
    } else if (sortBy === "views") {
      return b.totalViews - a.totalViews;
    } else {
      return b.matchesAffected - a.matchesAffected;
    }
  });

  // Format views (pure numbers with commas, no abbreviations)
  const formatViews = (views: number) => {
    return views.toLocaleString("en-US");
  };

  // Helper to get league icon path
  const getLeagueIcon = (league: League): string => {
    switch (league) {
      case "saudi":
        return "/icons/Saudi_League.svg";
      case "saudi-super-cup":
        return "/icons/Saudi_Cup.png";
      case "spanish-super-cup":
        return "/icons/Spanish_Cup.svg";
      default:
        return "";
    }
  };

  // Helper to get league name
  const getLeagueName = (league: League): string => {
    switch (league) {
      case "saudi":
        return "Saudi Pro League";
      case "saudi-super-cup":
        return "Saudi Super Cup";
      case "spanish-super-cup":
        return "Spanish Super Cup";
      default:
        return "";
    }
  };

  // Auto-select first available league for employees if they have only one league
  useEffect(() => {
    if (user?.role === "employee" && availableLeagues.length === 1 && !league) {
      setLeague(availableLeagues[0]);
    }
  }, [user, availableLeagues, league]);

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold">Most Problematic Accounts</h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            Accounts and channels with the most violations
          </p>
          {!loadingThresholds && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              Showing accounts with views ≥{" "}
              {viewsThreshold.toLocaleString("en-US")} or violations ≥{" "}
              {violationsThreshold}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">Filters:</span>
          </div>

          {/* League Filter */}
          {availableLeagues.length === 0 ? (
            <div className="text-xs sm:text-sm text-muted-foreground">
              No leagues available
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
                  <SelectValue placeholder="League" />
                </div>
              </SelectTrigger>
              <SelectContent>
                {/* Show "All Leagues" only if user has access to multiple leagues */}
                {availableLeagues.length > 1 && (
                  <SelectItem value="all" className="text-xs sm:text-sm">All Leagues</SelectItem>
                )}
                {availableLeagues.includes("saudi") && (
                  <SelectItem value="saudi" className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <img
                        src="/icons/Saudi_League.svg"
                        alt="Saudi Pro League"
                        className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0"
                      />
                      <span>Saudi Pro League</span>
                    </div>
                  </SelectItem>
                )}
                {availableLeagues.includes("saudi-super-cup") && (
                  <SelectItem value="saudi-super-cup" className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <img
                        src="/icons/Saudi_Cup.png"
                        alt="Saudi Super Cup"
                        className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0 rounded"
                      />
                      <span>Saudi Super Cup</span>
                    </div>
                  </SelectItem>
                )}
                {availableLeagues.includes("spanish-super-cup") && (
                  <SelectItem value="spanish-super-cup" className="text-xs sm:text-sm">
                    <div className="flex items-center gap-2">
                      <img
                        src="/icons/Spanish_Cup.svg"
                        alt="Spanish Super Cup"
                        className="h-5 w-5 sm:h-6 sm:w-6 object-contain flex-shrink-0"
                      />
                      <span>Spanish Super Cup</span>
                    </div>
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          )}

          {/* Platform Filter */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-full sm:w-[160px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs sm:text-sm">All Platforms</SelectItem>
              {platformOperations.map((platform) => (
                <SelectItem key={platform.id} value={platform.id} className="text-xs sm:text-sm">
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Week/Stage Filter Type */}
          {(() => {
            const isSuperCup =
              league === "saudi-super-cup" || league === "spanish-super-cup";

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
                      <SelectValue placeholder="Stage Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">All Stages</SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">Single Stage</SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">Stage Range</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Stage */}
                  {stageFilterType === "single" && (
                    <Select value={singleStage} onValueChange={setSingleStage}>
                      <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue placeholder="Stage" />
                      </SelectTrigger>
                      <SelectContent>
                        {availableStages.map((stage) => (
                          <SelectItem key={stage} value={stage} className="text-xs sm:text-sm">
                            {stage}
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
                          <SelectValue placeholder="Start Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem key={stage} value={stage} className="text-xs sm:text-sm">
                              {stage}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">to</span>
                      <Select
                        value={stageRangeEnd}
                        onValueChange={setStageRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[180px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="End Stage" />
                        </SelectTrigger>
                        <SelectContent>
                          {availableStages.map((stage) => (
                            <SelectItem key={stage} value={stage} className="text-xs sm:text-sm">
                              {stage}
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
                      <SelectValue placeholder="Week Filter" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all" className="text-xs sm:text-sm">All Weeks</SelectItem>
                      <SelectItem value="single" className="text-xs sm:text-sm">Single Week</SelectItem>
                      <SelectItem value="range" className="text-xs sm:text-sm">Week Range</SelectItem>
                    </SelectContent>
                  </Select>

                  {/* Single Week */}
                  {weekFilterType === "single" && (
                    <Select value={singleWeek} onValueChange={setSingleWeek}>
                      <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                        <SelectValue placeholder="Week" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 38 }, (_, i) => i + 1).map(
                          (week) => (
                            <SelectItem key={week} value={week.toString()} className="text-xs sm:text-sm">
                              Week {week}
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
                          <SelectValue placeholder="Start Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem key={week} value={week.toString()} className="text-xs sm:text-sm">
                                Week {week}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground text-xs sm:text-sm text-center sm:text-left">to</span>
                      <Select
                        value={weekRangeEnd}
                        onValueChange={setWeekRangeEnd}>
                        <SelectTrigger className="w-full sm:w-[100px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                          <SelectValue placeholder="End Week" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 38 }, (_, i) => i + 1).map(
                            (week) => (
                              <SelectItem key={week} value={week.toString()} className="text-xs sm:text-sm">
                                Week {week}
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
            <span className="text-xs sm:text-sm text-muted-foreground">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-full sm:w-[140px] h-9 sm:h-10 text-xs sm:text-sm touch-manipulation">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violations" className="text-xs sm:text-sm">Violations</SelectItem>
                <SelectItem value="views" className="text-xs sm:text-sm">Views</SelectItem>
                <SelectItem value="matches" className="text-xs sm:text-sm">Matches</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      {/* Mobile Version */}
      <div className="md:hidden">
        <ProblematicAccountsMobile
          accounts={sortedAccounts}
          loading={loading}
          sortBy={sortBy}
        />
      </div>

      {/* Desktop Version */}
      <Card className="hidden md:block p-0">
        {loading ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-xs sm:text-sm text-muted-foreground">
              Loading accounts...
            </span>
          </div>
        ) : sortedAccounts.length === 0 ? (
          <div className="flex items-center justify-center py-8 sm:py-12">
            <p className="text-xs sm:text-sm text-muted-foreground">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto w-full">
            <table className="w-full min-w-[800px]">
                <thead className="border-b border-border bg-muted/30">
                  <tr>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">Rank</th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Account/Channel
                    </th>
                    <th className="text-left p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Platform
                    </th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Violations
                    </th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Total Views
                    </th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Matches
                    </th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Status
                    </th>
                    <th className="text-right p-3 sm:p-4 text-xs sm:text-sm font-semibold">
                      Content Type
                    </th>
                  </tr>
                </thead>
              <tbody>
                {sortedAccounts.map((account, index) => {
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
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <AlertTriangle className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-destructive flex-shrink-0" />
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
                              className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                              {account.activeCount} Active
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                              {account.blockedCount} Blocked
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
                            {successRate}% Success
                          </Badge>
                          <div className="flex items-center gap-1 text-[9px] sm:text-[10px] text-muted-foreground flex-wrap justify-end">
                            <span>{account.blockedCount} Blocked</span>
                            <span>•</span>
                            <span>{account.removedCount} Removed</span>
                            <span>•</span>
                            <span>{account.underReviewCount} Review</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end gap-0.5 sm:gap-1 text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">Live:</span>
                            <span className="font-medium">
                              {account.liveCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Highlights:
                            </span>
                            <span className="font-medium">
                              {account.highlightsCount}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">
                              Others:
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
      </Card>
    </div>
  );
}
