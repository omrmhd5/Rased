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
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { PlatformData, BASE_URL } from "@/components/MatchDashboard/types";

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
  platformOperations: PlatformData[];
}

// Format views helper (pure numbers with commas, no abbreviations)

// Format views helper (pure numbers with commas, no abbreviations)
const formatViewsForDisplay = (views: number) => {
  return views.toLocaleString("en-US");
};

type ChartView = "views" | "violations" | "blocked";

export function PlatformsOverview({
  platforms,
  statsLoading,
  platformOperations,
}: PlatformsOverviewProps) {
  const { t, isRTL } = useLanguage();

  const renderPlatformIcon = (
    platformName: string,
    className: string = "h-4 w-4",
  ) => {
    const platform = platformOperations.find((p) => p.name === platformName);

    if (!platform) {
      return <Eye className={className} />;
    }

    if (platform.iconUrl) {
      const src = platform.iconUrl.startsWith("http")
        ? platform.iconUrl
        : `${BASE_URL}${platform.iconUrl}`;
      return (
        <img
          src={src}
          alt={platform.name}
          className={`${className} object-contain`}
        />
      );
    }

    const IconComponent = platform.icon;
    return (
      <IconComponent className={className} style={{ color: platform.color }} />
    );
  };

  const getPlatformColor = (platformName: string) => {
    const platform = platformOperations.find((p) => p.name === platformName);
    return platform ? platform.color : "hsl(var(--muted-foreground))";
  };

  // Load saved chart view from localStorage, default to "violations"
  const [chartView, setChartView] = useState<ChartView>(() => {
    const saved = localStorage.getItem("platformsOverviewChartView");
    if (saved && ["views", "violations", "blocked"].includes(saved)) {
      return saved as ChartView;
    }
    return "violations";
  });

  // Save to localStorage when chartView changes
  useEffect(() => {
    localStorage.setItem("platformsOverviewChartView", chartView);
  }, [chartView]);

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
          current.views > top.views ? current : top,
        )
      : null;

  // Find fastest platform (lowest avg block time, excluding zeros)
  const fastestPlatform =
    platforms.length > 0
      ? platforms
          .filter((p) => p.avgBlockTime > 0)
          .reduce(
            (fastest, current) =>
              current.avgBlockTime < fastest.avgBlockTime ? current : fastest,
            platforms.find((p) => p.avgBlockTime > 0) || platforms[0],
          )
      : null;

  if (statsLoading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          {isRTL ? (
            <>
              <div className="text-sm text-muted-foreground text-right">
                {t("dashboard.platformsOverview.loadingPlatformData")}
              </div>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground ml-2" />
            </>
          ) : (
            <>
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground mr-2" />
              <div className="text-sm text-muted-foreground text-left">
                {t("dashboard.platformsOverview.loadingPlatformData")}
              </div>
            </>
          )}
        </div>
      </Card>
    );
  }

  if (platforms.length === 0) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center py-12">
          <p
            className={`text-sm text-muted-foreground ${isRTL ? "text-right" : "text-left"}`}>
            {t("dashboard.platformsOverview.noPlatformData")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      {/* Header with Toggle */}
      <div className="flex items-center justify-between mb-4">
        <div className="text-left">
          <h3 className="font-semibold text-left">
            {t("dashboard.platformsOverview.title")}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5 text-left">
            {t("dashboard.platformsOverview.subtitle")}
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-1">
          <button
            onClick={() => setChartView("violations")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-left ${
              chartView === "violations"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t("dashboard.platformsOverview.violations")}
          </button>
          <button
            onClick={() => setChartView("blocked")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-left ${
              chartView === "blocked"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t("dashboard.platformsOverview.blockedVsActive")}
          </button>
          <button
            onClick={() => setChartView("views")}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors text-left ${
              chartView === "views"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            {t("dashboard.platformsOverview.views")}
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
              {renderPlatformIcon(topViewsPlatform.name, "h-4 w-4")}
            </div>
            <div
              className={`flex-1 min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p
                className={`text-xs font-medium text-muted-foreground text-left`}>
                {t("dashboard.platformsOverview.topPlatformByViews")}
              </p>
              <p className={`text-sm font-semibold truncate text-left`}>
                {topViewsPlatform.name}{" "}
                {t("dashboard.platformsOverview.leadsWith")}{" "}
                {formatViewsForDisplay(topViewsPlatform.views)}{" "}
                {t("dashboard.platformsOverview.views")}
              </p>
            </div>
          </div>
        )}

        {fastestPlatform && fastestPlatform.avgBlockTime > 0 && (
          <div className="flex items-center gap-2 p-3 rounded-lg bg-muted/30">
            <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-4 w-4 text-success" />
            </div>
            <div
              className={`flex-1 min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p
                className={`text-xs font-medium text-muted-foreground text-left`}>
                {t("dashboard.platformsOverview.fastestResponse")}
              </p>
              <p className={`text-sm font-semibold truncate text-left`}>
                {fastestPlatform.name} {t("dashboard.platformsOverview.with")}{" "}
                {fastestPlatform.avgBlockTime}{" "}
                {t("dashboard.platformsOverview.minAvg")}
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
            formatter={(value: number | string, name: string) => {
              if (
                name.includes("Views") ||
                name === "views" ||
                name.includes(t("dashboard.platformsOverview.views"))
              ) {
                return [formatViewsForDisplay(Number(value)), name];
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
                name={t("dashboard.platformsOverview.liveViolations")}
                fill="hsl(var(--chart-1))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="highlightsViolations"
                name={t("dashboard.platformsOverview.highlightsViolations")}
                fill="hsl(var(--chart-2))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="othersViolations"
                name={t("dashboard.platformsOverview.othersViolations")}
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
                name={t("dashboard.platformsOverview.liveViews")}
                fill="hsl(var(--chart-3))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="highlightsViews"
                name={t("dashboard.platformsOverview.highlightsViews")}
                fill="hsl(var(--chart-4))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="othersViews"
                name={t("dashboard.platformsOverview.othersViews")}
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
                name={t("dashboard.platformsOverview.blocked")}
                fill="hsl(var(--success))"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Bar
                dataKey="activeCount"
                name={t("dashboard.platformsOverview.active")}
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
        <h4 className={`text-sm font-semibold mb-3 text-left`}>
          {t("dashboard.platformsOverview.platformDetails")}
        </h4>
        <div className="space-y-2">
          {platforms.map((platform) => {
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
                    {renderPlatformIcon(platform.name, "h-4 w-4")}
                  </div>
                  <div
                    className={`flex-1 min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                    <p className={`text-sm font-semibold text-left`}>
                      {platform.name}
                    </p>
                    <p className={`text-xs text-muted-foreground text-left`}>
                      {platform.matchesAffected}{" "}
                      {platform.matchesAffected !== 1
                        ? t("dashboard.platformsOverview.matches")
                        : t("dashboard.platformsOverview.match")}{" "}
                      {t("dashboard.platformsOverview.affected")}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-6 text-sm">
                  <div className="text-right">
                    <p className="font-semibold text-left">
                      {platform.violations}
                    </p>
                    <p className="text-xs text-muted-foreground text-left">
                      {t("dashboard.violations")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-left">
                      {formatViewsForDisplay(platform.views)}
                    </p>
                    <p className="text-xs text-muted-foreground text-left">
                      {t("dashboard.views")}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-success text-left">
                      {platform.successRate}%
                    </p>
                    <p className="text-xs text-muted-foreground text-left">
                      {t("dashboard.platformsOverview.success")}
                    </p>
                  </div>
                  {platform.avgBlockTime > 0 && (
                    <div className="text-right">
                      <p className="font-semibold text-left">
                        {platform.avgBlockTime} {t("dashboard.min")}
                      </p>
                      <p className="text-xs text-muted-foreground text-left">
                        {t("dashboard.platformsOverview.avgBlockTime")}
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
