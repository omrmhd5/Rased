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
      "Final": t("problematicAccounts.stages.final"),
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
      return leagueInfo?.arabicName || leagueInfo?.knownName || leagueInfo?.name || league;
    }
    return leagueInfo?.knownName || leagueInfo?.name || leagueInfo?.arabicName || league;
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
          <h1 className="text-xl sm:text-2xl font-bold">
            {t("problematicAccounts.title")}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground mt-1">
            {t("problematicAccounts.subtitle")}
          </p>
          {!loadingThresholds && (
            <p className="text-[10px] sm:text-xs text-muted-foreground mt-1">
              {t("problematicAccounts.showingAccounts", {
                viewsThreshold: viewsThreshold.toLocaleString("en-US"),
                violationsThreshold: violationsThreshold,
              })}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="flex items-center gap-2 flex-shrink-0">
            <Filter className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-muted-foreground" />
            <span className="text-xs sm:text-sm font-medium">{t("problematicAccounts.filters")}</span>
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
                            ? (leagueInfo.arabicName ||
                                leagueInfo.knownName ||
                                leagueInfo.name ||
                                leagueSlug)
                            : (leagueInfo.knownName ||
                                leagueInfo.name ||
                                leagueInfo.arabicName ||
                                leagueSlug)}
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
                      <SelectValue placeholder={t("problematicAccounts.stageFilter")} />
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
                        <SelectValue placeholder={t("problematicAccounts.stage")} />
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
                          <SelectValue placeholder={t("problematicAccounts.startStage")} />
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
                          <SelectValue placeholder={t("problematicAccounts.endStage")} />
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
                      <SelectValue placeholder={t("problematicAccounts.weekFilter")} />
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
                        <SelectValue placeholder={t("problematicAccounts.week")} />
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
                          <SelectValue placeholder={t("problematicAccounts.startWeek")} />
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
                          <SelectValue placeholder={t("problematicAccounts.endWeek")} />
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
                              {account.activeCount} {t("problematicAccounts.active")}
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[9px] sm:text-[10px] px-1 sm:px-1.5 py-0">
                              {account.blockedCount} {t("problematicAccounts.blocked")}
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
                            <span>{account.blockedCount} {t("problematicAccounts.blocked")}</span>
                            <span>•</span>
                            <span>{account.removedCount} {t("problematicAccounts.removed")}</span>
                            <span>•</span>
                            <span>{account.underReviewCount} {t("problematicAccounts.review")}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3 sm:p-4 text-right">
                        <div className="flex flex-col items-end gap-0.5 sm:gap-1 text-[9px] sm:text-[10px]">
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">{t("problematicAccounts.live")}</span>
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
      </Card>
    </div>
  );
}
