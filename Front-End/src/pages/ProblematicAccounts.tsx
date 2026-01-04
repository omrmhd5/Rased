import { useState, useEffect } from "react";
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

export default function ProblematicAccounts() {
  const navigate = useNavigate();
  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Filters
  const [league, setLeague] = useState<League>(null);
  const [weekFilterType, setWeekFilterType] = useState<WeekFilterType>("all");
  const [singleWeek, setSingleWeek] = useState<string>("1");
  const [weekRangeStart, setWeekRangeStart] = useState<string>("1");
  const [weekRangeEnd, setWeekRangeEnd] = useState<string>("12");
  const [selectedPlatform, setSelectedPlatform] = useState<string>("all");

  // Data
  const [accounts, setAccounts] = useState<ProblematicAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState<"violations" | "views" | "matches">(
    "violations"
  );

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

  // Fetch problematic accounts
  useEffect(() => {
    const fetchProblematicAccounts = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (league) params.append("league", league);
        if (selectedPlatform && selectedPlatform !== "all") {
          params.append("platformId", selectedPlatform);
        }
        if (weekFilterType !== "all") {
          params.append("weekFilter", weekFilterType);
          if (weekFilterType === "single") {
            params.append("week", singleWeek);
          } else if (weekFilterType === "range") {
            params.append("weekStart", weekRangeStart);
            params.append("weekEnd", weekRangeEnd);
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
        setAccounts(data || []);
      } catch (error) {
        console.error("Error fetching problematic accounts:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProblematicAccounts();
  }, [
    league,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    selectedPlatform,
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

  // Format views
  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    } else if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toLocaleString();
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Most Problematic Accounts</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Accounts and channels with the most violations
          </p>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Filters:</span>
          </div>

          {/* League Filter */}
          <Select
            value={league || "all"}
            onValueChange={(value) =>
              setLeague(value === "all" ? null : (value as League))
            }>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="League" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Leagues</SelectItem>
              <SelectItem value="saudi">Saudi Pro League</SelectItem>
              <SelectItem value="saudi-super-cup">Saudi Super Cup</SelectItem>
              <SelectItem value="spanish-super-cup">
                Spanish Super Cup
              </SelectItem>
            </SelectContent>
          </Select>

          {/* Platform Filter */}
          <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              {platformOperations.map((platform) => (
                <SelectItem key={platform.id} value={platform.id}>
                  {platform.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Week Filter Type */}
          <Select
            value={weekFilterType}
            onValueChange={(value) =>
              setWeekFilterType(value as WeekFilterType)
            }>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Week Filter" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              <SelectItem value="single">Single Week</SelectItem>
              <SelectItem value="range">Week Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Single Week */}
          {weekFilterType === "single" && (
            <Select value={singleWeek} onValueChange={setSingleWeek}>
              <SelectTrigger className="w-[100px]">
                <SelectValue placeholder="Week" />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: 38 }, (_, i) => i + 1).map((week) => (
                  <SelectItem key={week} value={week.toString()}>
                    Week {week}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Week Range */}
          {weekFilterType === "range" && (
            <div className="flex items-center gap-2">
              <Select value={weekRangeStart} onValueChange={setWeekRangeStart}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="Start Week" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <span className="text-muted-foreground">to</span>
              <Select value={weekRangeEnd} onValueChange={setWeekRangeEnd}>
                <SelectTrigger className="w-[100px]">
                  <SelectValue placeholder="End Week" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 38 }, (_, i) => i + 1).map((week) => (
                    <SelectItem key={week} value={week.toString()}>
                      Week {week}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Sort By */}
          <div className="ml-auto flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Sort by:</span>
            <Select
              value={sortBy}
              onValueChange={(value) => setSortBy(value as typeof sortBy)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violations">Violations</SelectItem>
                <SelectItem value="views">Views</SelectItem>
                <SelectItem value="matches">Matches</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </Card>

      {/* Accounts Table */}
      <Card className="p-0">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mr-2" />
            <span className="text-sm text-muted-foreground">
              Loading accounts...
            </span>
          </div>
        ) : sortedAccounts.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-sm text-muted-foreground">No accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="border-b border-border bg-muted/30">
                <tr>
                  <th className="text-left p-4 text-sm font-semibold">Rank</th>
                  <th className="text-left p-4 text-sm font-semibold">
                    Account/Channel
                  </th>
                  <th className="text-left p-4 text-sm font-semibold">
                    Platform
                  </th>
                  <th className="text-right p-4 text-sm font-semibold">
                    Violations
                  </th>
                  <th className="text-right p-4 text-sm font-semibold">
                    Total Views
                  </th>
                  <th className="text-right p-4 text-sm font-semibold">
                    Matches
                  </th>
                  <th className="text-right p-4 text-sm font-semibold">
                    Status
                  </th>
                  <th className="text-right p-4 text-sm font-semibold">
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
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-destructive" />
                          <span className="text-sm font-medium">
                            {account.accountChannel}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <PlatformIcon
                            className="h-4 w-4"
                            style={{ color: platformColor }}
                          />
                          <span className="text-sm">
                            {account.platformName}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end">
                          <span className="text-base font-bold">
                            {account.totalViolations.toLocaleString()}
                          </span>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge
                              variant="destructive"
                              className="text-[10px] px-1.5 py-0">
                              {account.activeCount} Active
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="text-[10px] px-1.5 py-0">
                              {account.blockedCount} Blocked
                            </Badge>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-sm font-semibold">
                            {formatViews(account.totalViews)}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <span className="text-sm font-medium">
                          {account.matchesAffected}
                        </span>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1">
                          <Badge
                            variant={
                              successRate >= 80 ? "default" : "secondary"
                            }
                            className="text-[10px] px-2 py-0">
                            {successRate}% Success
                          </Badge>
                          <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                            <span>{account.blockedCount} Blocked</span>
                            <span>•</span>
                            <span>{account.removedCount} Removed</span>
                            <span>•</span>
                            <span>{account.underReviewCount} Review</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex flex-col items-end gap-1 text-[10px]">
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
