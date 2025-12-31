import { Card } from "@/components/ui/card";
import { StatCard } from "@/components/StatCard";
import { MiniSparkline } from "@/components/MiniSparkline";
import {
  ShoppingCart,
  DollarSign,
  Bell,
  CreditCard,
  Eye,
  Shield,
  AlertTriangle,
  TrendingUp,
  Twitter,
  Facebook,
  Youtube,
  Instagram,
  Clock,
  Zap,
  CheckCircle,
  ExternalLink,
  UserPlus,
  AlertOctagon,
  Hash,
  CheckCircle2,
  Activity,
  Users,
  Link,
  BarChart3,
  Trophy,
  Loader2,
  XCircle,
  FileQuestion,
  Play,
} from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { mockMatches, mockViolations, Violation } from "@/data/mockData";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { RoundReport } from "@/components/RoundReport";
import { ViolationsOverview } from "@/components/Dashboard/ViolationsOverview";
import { MatchStatsOverview } from "@/components/Dashboard/MatchStatsOverview";
import { TopMatchByViolations } from "@/components/Dashboard/TopMatchByViolations";
import { ContentSplitChart } from "@/components/MatchDashboard/ContentSplitChart";
import { PlatformsOverview } from "@/components/Dashboard/PlatformsOverview";

type League = "saudi" | "italian" | "spanish" | null;
type WeekFilterType = "all" | "single" | "range";

const platformData = [
  {
    name: "X/Twitter",
    violations: 234,
    views: 45600,
    liveViolations: 156,
    highlightsViolations: 78,
    liveViews: 28900,
    highlightsViews: 16700,
    color: "hsl(203 89% 53%)",
    successRate: 91,
    avgBlockTime: 9.2,
    blockedCount: 213,
    activeCount: 21,
  },
  {
    name: "YouTube",
    violations: 189,
    views: 78900,
    liveViolations: 134,
    highlightsViolations: 55,
    liveViews: 52300,
    highlightsViews: 26600,
    color: "hsl(0 100% 50%)",
    successRate: 89,
    avgBlockTime: 11.4,
    blockedCount: 168,
    activeCount: 21,
  },
  {
    name: "Facebook",
    violations: 156,
    views: 34200,
    liveViolations: 98,
    highlightsViolations: 58,
    liveViews: 21400,
    highlightsViews: 12800,
    color: "hsl(221 44% 41%)",
    successRate: 88,
    avgBlockTime: 10.8,
    blockedCount: 137,
    activeCount: 19,
  },
  {
    name: "TikTok",
    violations: 145,
    views: 56700,
    liveViolations: 89,
    highlightsViolations: 56,
    liveViews: 35200,
    highlightsViews: 21500,
    color: "hsl(0 0% 0%)",
    successRate: 93,
    avgBlockTime: 6.1,
    blockedCount: 135,
    activeCount: 10,
  },
  {
    name: "Instagram",
    violations: 98,
    views: 23400,
    liveViolations: 62,
    highlightsViolations: 36,
    liveViews: 14800,
    highlightsViews: 8600,
    color: "hsl(329 100% 50%)",
    successRate: 90,
    avgBlockTime: 8.5,
    blockedCount: 88,
    activeCount: 10,
  },
  {
    name: "Telegram",
    violations: 87,
    views: 12300,
    liveViolations: 64,
    highlightsViolations: 23,
    liveViews: 9100,
    highlightsViews: 3200,
    color: "hsl(200 100% 48%)",
    successRate: 67,
    avgBlockTime: 18.3,
    blockedCount: 58,
    activeCount: 29,
  },
  {
    name: "IPTV",
    violations: 67,
    views: 89000,
    liveViolations: 51,
    highlightsViolations: 16,
    liveViews: 71200,
    highlightsViews: 17800,
    color: "hsl(271 76% 53%)",
    successRate: 85,
    avgBlockTime: 14.2,
    blockedCount: 57,
    activeCount: 10,
  },
  {
    name: "Websites",
    violations: 54,
    views: 34500,
    liveViolations: 38,
    highlightsViolations: 16,
    liveViews: 22300,
    highlightsViews: 12200,
    color: "hsl(142 71% 45%)",
    successRate: 82,
    avgBlockTime: 15.7,
    blockedCount: 44,
    activeCount: 10,
  },
];
// Detect current week
const now = new Date();
const upcomingMatches = mockMatches.filter((m) => new Date(m.date) >= now);
const liveMatches = mockMatches.filter((m) => m.status === "live");
const currentWeek =
  liveMatches.length > 0
    ? liveMatches[0].week
    : upcomingMatches.length > 0
    ? upcomingMatches[0].week
    : Math.max(...mockMatches.map((m) => m.week));

// Get all matches for current week
const currentWeekMatches = mockMatches
  .filter((m) => m.week === currentWeek)
  .sort((a, b) => b.violations - a.violations); // Sort by violations desc

// Helper to format views
const formatViews = (views: number) => {
  if (views >= 1000) return `${Math.round(views / 1000)}K`;
  return views.toString();
};

// Helper to calculate avg block time per match (mock calculation)
const getAvgBlockTime = (matchId: number) => {
  const times = [8.2, 9.4, 10.1, 11.5, 7.8, 12.3, 9.9];
  return times[matchId % times.length];
};
export default function Dashboard() {
  const navigate = useNavigate();
  const [platformSort, setPlatformSort] = useState<
    "violations" | "response" | "active" | "success"
  >("violations");
  const [isRoundReportOpen, setIsRoundReportOpen] = useState(false);

  // League and week filtering
  const [selectedLeague, setSelectedLeague] = useState<League>(null);
  const [weekFilterType, setWeekFilterType] = useState<WeekFilterType>("all");
  const [singleWeek, setSingleWeek] = useState<string>("12");
  const [weekRangeStart, setWeekRangeStart] = useState<string>("1");
  const [weekRangeEnd, setWeekRangeEnd] = useState<string>("12");

  // Dashboard stats
  const [dashboardStats, setDashboardStats] = useState({
    totalViolations: 0,
    blocked: 0,
    stillActive: 0,
    removed: 0,
    underReview: 0,
    totalViews: 0,
    avgBlockTime: 0,
    topPlatform: null as {
      id: string;
      name: string;
      violations: number;
    } | null,
    topMatch: null as {
      teams: string;
      week: string;
      violations: number;
      totalViews: number;
      externalMatchId: string;
      platforms: Array<{
        name: string;
        violations: number;
        views: number;
        successRate: number;
      }>;
    } | null,
    matchStats: {
      total: 0,
      completed: 0,
      live: 0,
      upcoming: 0,
      postponed: 0,
    },
    contentSplit: {
      live: { views: 0, violations: 0 },
      highlights: { views: 0, violations: 0 },
      others: { views: 0, violations: 0 },
    },
    platforms: [] as Array<{
      id: string;
      name: string;
      violations: number;
      views: number;
      successRate: number;
      avgBlockTime: number;
      statusBreakdown: {
        active: number;
        blocked: number;
        removed: number;
        underReview: number;
      };
      contentSplit: {
        live: { violations: number; views: number };
        highlights: { violations: number; views: number };
        others: { violations: number; views: number };
      };
      matchesAffected: number;
    }>,
  });
  const [statsLoading, setStatsLoading] = useState(true); // Start with true to show loading initially

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

  // Load selected league from localStorage on mount
  useEffect(() => {
    const savedLeague = localStorage.getItem("selectedLeague") as League;
    if (savedLeague && ["saudi", "italian", "spanish"].includes(savedLeague)) {
      setSelectedLeague(savedLeague);
    } else {
      // If no league is selected, redirect to home
      navigate("/");
    }
  }, [navigate]);

  // Fetch dashboard stats when league or week filters change
  useEffect(() => {
    if (!selectedLeague) {
      setStatsLoading(false);
      return;
    }

    const fetchDashboardStats = async () => {
      setStatsLoading(true);
      try {
        const params = new URLSearchParams({
          league: selectedLeague,
          weekFilter: weekFilterType,
        });

        if (weekFilterType === "single" && singleWeek) {
          params.append("week", singleWeek);
        } else if (
          weekFilterType === "range" &&
          weekRangeStart &&
          weekRangeEnd
        ) {
          params.append("weekStart", weekRangeStart);
          params.append("weekEnd", weekRangeEnd);
        }

        const response = await fetch(
          `${API_URL}/matches/dashboard/stats?${params.toString()}`,
          {
            credentials: "include",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to fetch dashboard stats");
        }

        const data = await response.json();
        setDashboardStats({
          totalViolations: data.totalViolations || 0,
          blocked: data.blocked || 0,
          stillActive: data.stillActive || 0,
          removed: data.removed || 0,
          underReview: data.underReview || 0,
          totalViews: data.totalViews || 0,
          avgBlockTime: data.avgBlockTime || 0,
          topPlatform: data.topPlatform || null,
          topMatch: data.topMatch || null,
          matchStats: data.matchStats || {
            total: 0,
            completed: 0,
            live: 0,
            upcoming: 0,
            postponed: 0,
          },
          contentSplit: data.contentSplit || {
            live: { views: 0, violations: 0 },
            highlights: { views: 0, violations: 0 },
            others: { views: 0, violations: 0 },
          },
          platforms: data.platforms || [],
        });
        // Only set loading to false after successful fetch
        setStatsLoading(false);
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Set to 0 on error but keep loading false to show error state
        setDashboardStats({
          totalViolations: 0,
          blocked: 0,
          stillActive: 0,
          removed: 0,
          underReview: 0,
          totalViews: 0,
          avgBlockTime: 0,
          topPlatform: null,
          topMatch: null,
          matchStats: {
            total: 0,
            completed: 0,
            live: 0,
            upcoming: 0,
            postponed: 0,
          },
          contentSplit: {
            live: { views: 0, violations: 0 },
            highlights: { views: 0, violations: 0 },
            others: { views: 0, violations: 0 },
          },
          platforms: [],
        });
        setStatsLoading(false);
      }
    };

    fetchDashboardStats();
  }, [
    selectedLeague,
    weekFilterType,
    singleWeek,
    weekRangeStart,
    weekRangeEnd,
    API_URL,
  ]);

  // Calculate match views data for sparkline (showing total views per match in thousands)
  const matchViewsData = mockMatches
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
    .map((match) => Math.round(match.totalViews / 1000)); // Convert to thousands for better visualization

  // Find top platform by views and fastest platform by block time
  const topViewsPlatform = platformData.reduce(
    (max, platform) => (platform.views > max.views ? platform : max),
    platformData[0]
  );
  const fastestPlatform = platformData.reduce(
    (min, platform) =>
      platform.avgBlockTime < min.avgBlockTime ? platform : min,
    platformData[0]
  );

  // Get platform icon
  const getPlatformIcon = (name: string) => {
    switch (name) {
      case "X/Twitter":
      case "Twitter":
        return Twitter;
      case "YouTube":
        return Youtube;
      case "Facebook":
        return Facebook;
      case "Instagram":
        return Instagram;
      case "Telegram":
        return TrendingUp;
      case "TikTok":
        return Eye;
      default:
        return Eye;
    }
  };

  // Calculate time since added and sort active violations
  const getTimeSinceAdded = (reportedAt: string): string => {
    const now = new Date();
    const detected = new Date(reportedAt);
    const diffMs = now.getTime() - detected.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  // Format URL for display (shortened)
  const formatUrlForDisplay = (url: string): string => {
    const maxLength = 45;
    if (url.length <= maxLength) return url;
    return url.substring(0, maxLength - 3) + "...";
  };
  const currentWeekMatchIds = currentWeekMatches.map((m) => m.id);
  const currentWeekViolations = mockViolations.filter(
    (v) =>
      currentWeekMatchIds.includes(v.matchId || 0) &&
      (v.status === "active" ||
        v.status === "reported" ||
        v.status === "review")
  );
  const violationsWithMinutes = currentWeekViolations.map((v) => ({
    ...v,
    minutesSinceAdded: Math.floor(
      (new Date().getTime() - new Date(v.reportedAt).getTime()) / 60000
    ),
  }));
  const currentWeekMinutesSinceAdded = violationsWithMinutes
    .map((v) => v.minutesSinceAdded)
    .sort((a, b) => a - b);
  const percentile80Idx = Math.floor(currentWeekMinutesSinceAdded.length * 0.8);
  const percentile80Value = currentWeekMinutesSinceAdded[percentile80Idx] || 0;
  const getWarningLevelForViolation = (
    minutes: number,
    distribution: number[]
  ): "none" | "warning" | "urgent" => {
    const p80 = distribution[Math.floor(distribution.length * 0.8)] || 0;
    if (minutes >= p80 * 1.5) return "urgent";
    if (minutes >= p80) return "warning";
    return "none";
  };
  const sortedActiveViolations = [...violationsWithMinutes].sort((a, b) => {
    const statusWeight = {
      active: 3,
      review: 2,
      reported: 1,
    };
    const statusScore =
      (statusWeight[b.status as keyof typeof statusWeight] || 0) -
      (statusWeight[a.status as keyof typeof statusWeight] || 0);
    if (statusScore !== 0) return statusScore;
    const viewsScore = b.views - a.views;
    if (viewsScore !== 0) return viewsScore;
    return b.minutesSinceAdded - a.minutesSinceAdded;
  });

  // Sort platforms based on selected criteria
  const sortedPlatforms = [...platformData].sort((a, b) => {
    switch (platformSort) {
      case "violations":
        return b.violations - a.violations;
      case "response":
        return b.avgBlockTime - a.avgBlockTime;
      case "active":
        return b.activeCount - a.activeCount;
      case "success":
        return a.successRate - b.successRate;
      default:
        return 0;
    }
  });
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            {weekFilterType === "all"
              ? "All Weeks Overview"
              : weekFilterType === "single"
              ? `Week ${singleWeek} Overview`
              : `Weeks ${weekRangeStart} - ${weekRangeEnd} Overview`}
          </p>
        </div>

        {/* League and Week Filters */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* League Display */}
          {selectedLeague && (
            <Badge
              variant="secondary"
              className="text-sm flex items-center gap-2">
              <Trophy className="h-3 w-3" />
              {selectedLeague === "saudi"
                ? "Saudi Pro League"
                : selectedLeague === "italian"
                ? "Italian Serie A"
                : selectedLeague === "spanish"
                ? "Spanish La Liga"
                : "No League"}
            </Badge>
          )}

          {/* Week Filter Type */}
          <Select
            value={weekFilterType}
            onValueChange={(value) =>
              setWeekFilterType(value as WeekFilterType)
            }>
            <SelectTrigger className="w-[140px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Weeks</SelectItem>
              <SelectItem value="single">Single Week</SelectItem>
              <SelectItem value="range">Week Range</SelectItem>
            </SelectContent>
          </Select>

          {/* Single Week Selector */}
          {weekFilterType === "single" && (
            <Select value={singleWeek} onValueChange={setSingleWeek}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
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

          {/* Week Range Selectors */}
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
        </div>
      </div>

      {/* Row 1: Main Overview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-[2.5fr_1fr] gap-4 items-start">
        {/* Left: Violations Overview and Match Stats Overview */}
        <div className="flex flex-col gap-4">
          {/* Violations Overview Component */}
          <ViolationsOverview
            totalViolations={dashboardStats.totalViolations}
            stillActive={dashboardStats.stillActive}
            blocked={dashboardStats.blocked}
            removed={dashboardStats.removed}
            underReview={dashboardStats.underReview}
            statsLoading={statsLoading}
          />

          {/* Match Stats Overview Component */}
          <MatchStatsOverview
            matchStats={dashboardStats.matchStats}
            statsLoading={statsLoading}
          />
        </div>

        {/* Right Column: Stacked Small Cards (30% width) */}
        <div className="flex flex-col gap-3">
          {/* Total Views Card (Small) */}
          <Card className="p-4 bg-gradient-to-br from-chart-4/5 to-chart-4/10 border border-chart-4/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-4/20 cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Total Views
              </p>
              <Eye className="h-3.5 w-3.5 text-chart-4" />
            </div>

            {statsLoading ? (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <div className="flex items-baseline gap-1.5">
                <p className="text-2xl font-bold text-foreground">
                  {dashboardStats.totalViews >= 1000
                    ? `${(dashboardStats.totalViews / 1000).toFixed(1)}K`
                    : dashboardStats.totalViews.toLocaleString()}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  Across All Platforms
                </p>
              </div>
            )}
          </Card>

          {/* Avg Block Time Card */}
          <Card className="p-4 bg-gradient-to-br from-success/5 to-success/10 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] font-medium text-muted-foreground">
                Avg Block Time
              </p>
              <Clock className="h-3.5 w-3.5 text-success" />
            </div>
            {statsLoading ? (
              <div className="flex items-center justify-center py-3">
                <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <p className="text-xl font-bold text-foreground">
                {(() => {
                  const minutes = dashboardStats.avgBlockTime || 0;
                  const hours = minutes / 60;
                  return (
                    <>
                      {minutes}
                      <span className="text-sm text-muted-foreground ml-1">
                        min{" "}
                        <span className="text-medium text-muted-foreground">
                          ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}hrs)
                        </span>
                      </span>
                    </>
                  );
                })()}
              </p>
            )}
          </Card>

          {/* Top Platform Card */}
          {dashboardStats.topPlatform && (
            <Card className="p-4 bg-gradient-to-br from-chart-2/5 to-chart-2/10 border border-chart-2/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-2/20 cursor-pointer">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Top Platform
                </p>
                {(() => {
                  const Icon = getPlatformIcon(dashboardStats.topPlatform.name);
                  return <Icon className="h-3.5 w-3.5 text-chart-2" />;
                })()}
              </div>
              <p className="text-base font-bold text-foreground mb-0.5">
                {dashboardStats.topPlatform.name}
              </p>
              <p className="text-[11px] text-muted-foreground">
                {dashboardStats.topPlatform.violations} violations
              </p>
            </Card>
          )}

          {/* Top Match Card */}
          {dashboardStats.topMatch && (
            <Card className="p-4 bg-gradient-to-br from-orange-500/5 to-orange-500/10 border border-orange-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-orange-500/20 cursor-pointer">
              <div className="flex items-center justify-between mb-1.5">
                <p className="text-[11px] font-medium text-muted-foreground">
                  Top Match
                </p>
                <Trophy className="h-3.5 w-3.5 text-orange-600" />
              </div>
              <p className="text-base font-bold text-foreground mb-0.5">
                {dashboardStats.topMatch.teams}
              </p>
              <p className="text-[11px] text-muted-foreground">
                Week {dashboardStats.topMatch.week} •{" "}
                {dashboardStats.topMatch.violations} violations
              </p>
            </Card>
          )}

          {/* Content Split Chart */}
          <div className="mt-4">
            {(() => {
              // Calculate total views for Total Violations entry
              const totalViews =
                dashboardStats.contentSplit.live.views +
                dashboardStats.contentSplit.highlights.views +
                dashboardStats.contentSplit.others.views;

              const contentSplitData = [
                {
                  name: "Total Violations",
                  value: totalViews,
                  violations: dashboardStats.totalViolations,
                  color: "hsl(var(--chart-4))",
                },
                {
                  name: "Live",
                  value: dashboardStats.contentSplit.live.views,
                  violations: dashboardStats.contentSplit.live.violations,
                  color: "hsl(var(--chart-1))",
                },
                {
                  name: "Highlights",
                  value: dashboardStats.contentSplit.highlights.views,
                  violations: dashboardStats.contentSplit.highlights.violations,
                  color: "hsl(var(--chart-2))",
                },
                {
                  name: "Others",
                  value: dashboardStats.contentSplit.others.views,
                  violations: dashboardStats.contentSplit.others.violations,
                  color: "hsl(var(--chart-3))",
                },
              ];

              return (
                <ContentSplitChart data={contentSplitData} compact={true} />
              );
            })()}
          </div>
        </div>
      </div>

      {/* Row 2: Top Match Card (Full Width) */}
      <TopMatchByViolations
        topMatch={dashboardStats.topMatch}
        statsLoading={statsLoading}
      />

      {/* Row 3: Violations & Views by Platform */}
      <PlatformsOverview
        platforms={dashboardStats.platforms}
        statsLoading={statsLoading}
      />


      {/* Row 4: Matches Leaderboard, Platform Performance, Active Trouble List */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Platform Performance - Now takes 2 columns (wider) */}
        <Card className="lg:col-span-2 h-[340px] flex flex-col p-4">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <h3 className="text-[15px] font-semibold">Platform Performance</h3>
            <Select
              value={platformSort}
              onValueChange={(value) => setPlatformSort(value as any)}>
              <SelectTrigger className="w-[140px] h-[26px] text-[11px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violations">Most Violations</SelectItem>
                <SelectItem value="response">Slowest Response</SelectItem>
                <SelectItem value="active"> For Highlights </SelectItem>
                <SelectItem value="success">Lowest Success</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {sortedPlatforms.map((platform) => {
              const livePercent = Math.round(
                (platform.liveViolations / platform.violations) * 100
              );
              const highlightsPercent = 100 - livePercent;
              return (
                <div
                  key={platform.name}
                  className="flex items-center justify-between py-3 px-3 rounded-lg border border-border/40 hover:bg-muted/20 transition-colors cursor-pointer min-h-[52px]">
                  {/* Platform Identity */}
                  <div className="flex items-center gap-2.5 flex-shrink-0 min-w-[120px]">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{
                        backgroundColor: platform.color,
                      }}
                    />
                    <span className="text-[13px] font-semibold truncate">
                      {platform.name}
                    </span>
                  </div>

                  {/* Key Metrics Cluster */}
                  <div className="flex items-center gap-3 flex-1 min-w-0 px-4">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-medium tabular-nums">
                        {platform.violations}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Violations
                      </span>
                    </div>
                    <span className="text-muted-foreground/40">•</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-medium tabular-nums">
                        {platform.successRate}%
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Blocked
                      </span>
                    </div>
                    <span className="text-muted-foreground/40">•</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-medium tabular-nums">
                        {platform.avgBlockTime.toFixed(1)}m
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Avg Time
                      </span>
                    </div>
                    <span className="text-muted-foreground/40">•</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[14px] font-medium tabular-nums">
                        {platform.activeCount}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Active
                      </span>
                    </div>
                  </div>

                  {/* Content Split Chips */}
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full border border-border/40 bg-background text-[10px] font-medium text-muted-foreground">
                      Live {livePercent}%
                    </span>
                    <span className="inline-flex items-center h-[22px] px-2 rounded-full border border-border/40 bg-background text-[10px] font-medium text-muted-foreground">
                      Highlights {highlightsPercent}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Matches Leaderboard - Modern Redesign */}
        <Card className="h-[340px] flex flex-col p-4">
          <div className="flex-shrink-0 mb-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-[15px] font-semibold">
                  Matches Leaderboard
                </h3>
                <p className="text-[11px] text-muted-foreground mt-1">
                  Current week matches ranked by violations
                </p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  onClick={() => setIsRoundReportOpen(true)}
                  size="sm"
                  variant="default"
                  className="h-7 text-[11px]">
                  <BarChart3 className="h-3.5 w-3.5 mr-1.5" />
                  تقرير الجولة
                </Button>
                <Badge variant="secondary" className="h-5 px-2 text-[10px]">
                  Week {currentWeek}
                </Badge>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2">
            {currentWeekMatches.map((match) => {
              const matchViolations = mockViolations.filter(
                (v) => v.matchId === match.id
              );
              const violations = matchViolations.length;
              const totalViews = matchViolations.reduce(
                (sum, v) => sum + v.views,
                0
              );
              return (
                <div
                  key={match.id}
                  className="flex items-center justify-between p-4 rounded-lg border border-border/40 hover:border-primary/30 hover:bg-muted/20 transition-all cursor-pointer"
                  onClick={() => navigate(`/match/${match.id}`)}>
                  {/* Match Title */}
                  <h4 className="text-[14px] font-semibold flex-1 min-w-0 truncate pr-4">
                    {match.description}
                  </h4>

                  {/* Metrics */}
                  <div className="flex items-center gap-4 flex-shrink-0">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[16px] font-bold tabular-nums">
                        {violations}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Violations
                      </span>
                    </div>
                    <span className="text-muted-foreground/30">•</span>
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[16px] font-bold tabular-nums">
                        {formatViews(totalViews)}
                      </span>
                      <span className="text-[11px] text-muted-foreground">
                        Views
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        {/* Active Trouble List */}
        <Card className="lg:col-span-3 h-[340px] flex flex-col p-4">
          <div className="flex items-center justify-between mb-3 flex-shrink-0">
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-semibold">
                Active Trouble List (Live)
              </h3>
              <Badge
                variant="secondary"
                className="h-5 px-2 bg-chart-1/10 text-chart-1 border-0">
                <div className="w-1.5 h-1.5 rounded-full bg-chart-1 animate-pulse mr-1.5" />
                {sortedActiveViolations.length} active
              </Badge>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-1.5">
            {sortedActiveViolations.map((violation) => {
              const timeSinceAdded = getTimeSinceAdded(violation.reportedAt);
              const warningLevel = getWarningLevelForViolation(
                violation.minutesSinceAdded,
                currentWeekMinutesSinceAdded
              );
              const PlatformIcon =
                violation.platform === "twitter"
                  ? Twitter
                  : violation.platform === "youtube"
                  ? Youtube
                  : violation.platform === "facebook"
                  ? Facebook
                  : violation.platform === "instagram"
                  ? Instagram
                  : violation.platform === "tiktok"
                  ? TrendingUp
                  : Eye;
              return (
                <div
                  key={violation.id}
                  className="group flex items-center gap-3 h-[42px] border-b border-border/40 last:border-0 hover:bg-muted/30 transition-colors px-2">
                  {/* Platform & Account - Fixed width */}
                  <div className="flex items-center gap-2 w-[180px] flex-shrink-0">
                    <PlatformIcon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="text-[13px] font-medium truncate capitalize">
                        {violation.platform}
                      </span>
                      <span className="text-[11px] text-muted-foreground truncate">
                        {violation.account}
                      </span>
                    </div>
                  </div>

                  {/* Link of Post - Fixed width in center */}
                  <div className="w-[380px] flex-shrink-0">
                    <a
                      href={violation.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 h-[26px] px-3 rounded-md bg-muted/40 hover:bg-muted/60 border border-border/40 hover:border-primary/30 text-[11px] font-medium text-foreground/70 hover:text-primary transition-all w-full"
                      title={violation.url}>
                      <Link className="h-3 w-3 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate flex-1">
                        {formatUrlForDisplay(violation.url)}
                      </span>
                      <ExternalLink className="h-3 w-3 flex-shrink-0 opacity-50" />
                    </a>
                  </div>

                  {/* Metrics - Right side */}
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-muted/40 text-[12px] font-medium tabular-nums">
                      <Eye className="h-3 w-3 text-muted-foreground" />
                      <span>{formatViews(violation.views)}</span>
                    </span>
                    <span className="inline-flex items-center gap-1 h-[22px] px-2 rounded-full bg-muted/40 text-[12px] font-medium">
                      <Clock className="h-3 w-3 text-muted-foreground" />
                      <span>{timeSinceAdded}</span>
                    </span>
                    <Badge
                      variant={
                        violation.status === "active"
                          ? "destructive"
                          : violation.status === "review"
                          ? "default"
                          : "secondary"
                      }
                      className="h-[18px] text-[10px] px-1.5">
                      {violation.status}
                    </Badge>
                    {warningLevel === "urgent" && (
                      <Badge
                        variant="destructive"
                        className="h-[18px] text-[10px] px-1.5">
                        overdue
                      </Badge>
                    )}
                    {warningLevel === "warning" && (
                      <Badge
                        variant="secondary"
                        className="h-[18px] text-[10px] px-1.5 bg-amber-500/10 text-amber-700 border-amber-500/20">
                        slower
                      </Badge>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[26px] px-2"
                      title="Mark Blocked">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[26px] px-2"
                      title="Open Link"
                      onClick={() => window.open(violation.url, "_blank")}>
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[26px] px-2"
                      title="Assign Operator">
                      <Users className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-[26px] px-2"
                      title="Escalate">
                      <AlertTriangle className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Round Report Modal */}
      <RoundReport
        open={isRoundReportOpen}
        onClose={() => setIsRoundReportOpen(false)}
        week={currentWeek.toString()}
        competition="Saudi Pro League"
        dateRange="15 – 21 مايو 2026"
        liveMetrics={platformData.map((p) => ({
          platform: p.name,
          platformArabic:
            p.name === "X/Twitter"
              ? "إكس/تويتر"
              : p.name === "YouTube"
              ? "يوتيوب"
              : p.name === "Facebook"
              ? "فيسبوك"
              : p.name === "TikTok"
              ? "تيك توك"
              : p.name === "Instagram"
              ? "إنستغرام"
              : p.name === "Telegram"
              ? "تيليغرام"
              : p.name === "IPTV"
              ? "IPTV"
              : "مواقع الويب",
          icon: (() => {
            const Icon = getPlatformIcon(p.name);
            return <Icon className="h-4 w-4" style={{ color: p.color }} />;
          })(),
          detected: p.liveViolations,
          blocked: Math.round(p.liveViolations * (p.successRate / 100)),
          successRate: p.successRate,
          avgBlockTime: p.avgBlockTime,
          views: p.liveViews,
        }))}
        highlightsMetrics={platformData.map((p) => ({
          platform: p.name,
          platformArabic:
            p.name === "X/Twitter"
              ? "إكس/تويتر"
              : p.name === "YouTube"
              ? "يوتيوب"
              : p.name === "Facebook"
              ? "فيسبوك"
              : p.name === "TikTok"
              ? "تيك توك"
              : p.name === "Instagram"
              ? "إنستغرام"
              : p.name === "Telegram"
              ? "تيليغرام"
              : p.name === "IPTV"
              ? "IPTV"
              : "مواقع الويب",
          icon: (() => {
            const Icon = getPlatformIcon(p.name);
            return <Icon className="h-4 w-4" style={{ color: p.color }} />;
          })(),
          detected: p.highlightsViolations,
          blocked: Math.round(p.highlightsViolations * (p.successRate / 100)),
          successRate: p.successRate,
          avgBlockTime: p.avgBlockTime * 1.2, // Highlights typically take longer
          views: p.highlightsViews,
        }))}
      />
    </div>
  );
}
