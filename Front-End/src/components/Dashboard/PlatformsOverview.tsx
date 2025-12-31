import { Card } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import {
  Twitter,
  Youtube,
  Facebook,
  Instagram,
  TrendingUp,
  Eye,
  Zap,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface Platform {
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
}

interface PlatformsOverviewProps {
  platforms: Platform[];
  statsLoading: boolean;
}

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

// Get platform color
const getPlatformColor = (name: string) => {
  switch (name) {
    case "X/Twitter":
    case "Twitter":
      return "hsl(203,89%,53%)";
    case "YouTube":
      return "hsl(0,100%,50%)";
    case "Facebook":
      return "hsl(221,44%,41%)";
    case "TikTok":
      return "hsl(0,0%,0%)";
    case "Instagram":
      return "hsl(329,100%,50%)";
    case "Telegram":
      return "hsl(200,100%,48%)";
    default:
      return "hsl(var(--muted-foreground))";
  }
};

// Format views helper
const formatViewsForDisplay = (views: number) => {
  if (views >= 1000000) {
    return `${(views / 1000000).toFixed(1)}M`;
  }
  if (views >= 1000) {
    return `${(views / 1000).toFixed(1)}K`;
  }
  return views.toString();
};

type ChartView = "views" | "violations" | "blocked";

export function PlatformsOverview({
  platforms,
  statsLoading,
}: PlatformsOverviewProps) {
  const [chartView, setChartView] = useState<ChartView>("violations");

  // Prepare chart data
  const chartData = platforms.map((platform) => ({
    name: platform.name,
    violations: platform.violations,
    views: platform.views,
    liveViolations: platform.contentSplit.live.violations,
    highlightsViolations: platform.contentSplit.highlights.violations,
    othersViolations: platform.contentSplit.others.violations,
    liveViews: platform.contentSplit.live.views,
    highlightsViews: platform.contentSplit.highlights.views,
    othersViews: platform.contentSplit.others.views,
    blockedCount: platform.statusBreakdown.blocked,
    activeCount: platform.statusBreakdown.active,
    removedCount: platform.statusBreakdown.removed,
    underReviewCount: platform.statusBreakdown.underReview,
    successRate: platform.successRate,
    avgBlockTime: platform.avgBlockTime,
    matchesAffected: platform.matchesAffected,
    color: getPlatformColor(platform.name),
  }));

  // Find top platform by views
  const topViewsPlatform =
    platforms.length > 0
      ? platforms.reduce((top, current) =>
          current.views > top.views ? current : top
        )
      : null;

  // Find fastest platform (lowest avg block time, excluding zeros)
  const fastestPlatform =
    platforms.length > 0
      ? platforms
          .filter((p) => p.avgBlockTime > 0)
          .reduce((fastest, current) =>
            current.avgBlockTime < fastest.avgBlockTime ? current : fastest,
            platforms.find((p) => p.avgBlockTime > 0) || platforms[0]
          )
      : null;

  if (statsLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
          <div className="text-sm text-muted-foreground">
            Loading platform data...
          </div>
        </div>
      </Card>
    );
  }

  if (platforms.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <p className="text-sm text-muted-foreground">
            No platform data available
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-semibold">Violations & Views by Platform</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Platform performance overview
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setChartView("views")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              chartView === "views"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Views
          </button>
          <button
            onClick={() => setChartView("violations")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              chartView === "violations"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Violations
          </button>
          <button
            onClick={() => setChartView("blocked")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              chartView === "blocked"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Blocked vs Active
          </button>
        </div>
      </div>

      {/* Compact Insight Pills */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {topViewsPlatform && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${getPlatformColor(topViewsPlatform.name)}15`,
              }}>
              {(() => {
                const Icon = getPlatformIcon(topViewsPlatform.name);
                return (
                  <Icon
                    className="h-4 w-4"
                    style={{
                      color: getPlatformColor(topViewsPlatform.name),
                    }}
                  />
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Top Platform by Views
              </p>
              <p className="text-sm font-semibold truncate">
                {topViewsPlatform.name} leads with{" "}
                {formatViewsForDisplay(topViewsPlatform.views)} views
              </p>
            </div>
          </div>
        )}

        {fastestPlatform && fastestPlatform.avgBlockTime > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Fastest Response
              </p>
              <p className="text-sm font-semibold truncate">
                {fastestPlatform.name} with {fastestPlatform.avgBlockTime} min
                avg
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={320}>
        <BarChart
          data={chartData}
          margin={{
            top: 10,
            right: 10,
            left: 0,
            bottom: 30,
          }}
          barGap={8}
          barCategoryGap="20%">
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="hsl(var(--border))"
            opacity={0.3}
            vertical={false}
          />
          <XAxis
            dataKey="name"
            tick={{
              fontSize: 12,
              fill: "hsl(var(--muted-foreground))",
            }}
            axisLine={{
              stroke: "hsl(var(--border))",
            }}
            tickLine={false}
          />
          <YAxis
            tick={{
              fontSize: 11,
              fill: "hsl(var(--muted-foreground))",
            }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            cursor={{
              fill: "hsl(var(--muted))",
              opacity: 0.1,
            }}
            contentStyle={{
              backgroundColor: "hsl(var(--background))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "8px",
              padding: "8px 12px",
              fontSize: "12px",
            }}
            formatter={(value: any, name: string) => {
              if (name.includes("Views") || name === "views") {
                return [formatViewsForDisplay(value), name];
              }
              return [value, name];
            }}
          />
          <Legend
            verticalAlign="bottom"
            height={36}
            iconType="circle"
            iconSize={8}
            wrapperStyle={{
              paddingTop: "16px",
              fontSize: "12px",
            }}
          />
          {chartView === "violations" && (
            <>
              <Bar
                dataKey="liveViolations"
                name="Live Violations"
                fill="hsl(var(--chart-1))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="highlightsViolations"
                name="Highlights Violations"
                fill="hsl(var(--chart-2))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="othersViolations"
                name="Others Violations"
                fill="hsl(var(--chart-3))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </>
          )}
          {chartView === "views" && (
            <>
              <Bar
                dataKey="liveViews"
                name="Live Views"
                fill="hsl(var(--chart-3))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="highlightsViews"
                name="Highlights Views"
                fill="hsl(var(--chart-4))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="othersViews"
                name="Others Views"
                fill="hsl(var(--chart-1))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </>
          )}
          {chartView === "blocked" && (
            <>
              <Bar
                dataKey="blockedCount"
                name="Blocked"
                fill="hsl(var(--success))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="activeCount"
                name="Active"
                fill="hsl(var(--destructive))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
            </>
          )}
        </BarChart>
      </ResponsiveContainer>

      {/* Platform Details Table */}
      <div className="mt-6 border-t pt-4">
        <h4 className="text-sm font-semibold mb-3">Platform Details</h4>
        <div className="space-y-2">
          {platforms.map((platform) => {
            const PlatformIcon = getPlatformIcon(platform.name);
            const platformColor = getPlatformColor(platform.name);
            const totalBlocked =
              platform.statusBreakdown.blocked +
              platform.statusBreakdown.removed;

            return (
              <div
                key={platform.id}
                className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
                <div className="flex items-center gap-3 flex-1">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${platformColor}15`,
                    }}>
                    <PlatformIcon
                      className="h-4 w-4"
                      style={{ color: platformColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold">{platform.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {platform.matchesAffected} match
                      {platform.matchesAffected !== 1 ? "es" : ""} affected
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-semibold">{platform.violations}</p>
                    <p className="text-xs text-muted-foreground">Violations</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold">
                      {formatViewsForDisplay(platform.views)}
                    </p>
                    <p className="text-xs text-muted-foreground">Views</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success">
                      {platform.successRate}%
                    </p>
                    <p className="text-xs text-muted-foreground">Success</p>
                  </div>
                  {platform.avgBlockTime > 0 && (
                    <div className="text-right">
                      <p className="font-semibold">
                        {platform.avgBlockTime} min
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Avg Block Time
                      </p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Card>
  );
}

