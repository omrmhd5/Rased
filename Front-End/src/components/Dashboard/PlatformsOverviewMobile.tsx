import { Card } from "@/components/ui/card";
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

interface PlatformsOverviewMobileProps {
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

// Format views helper (pure numbers with commas, no abbreviations)
const formatViewsForDisplay = (views: number) => {
  return views.toLocaleString("en-US");
};

type ChartView = "views" | "violations" | "blocked";

export function PlatformsOverviewMobile({
  platforms,
  statsLoading,
}: PlatformsOverviewMobileProps) {
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
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground mr-2" />
          <div className="text-xs sm:text-sm text-muted-foreground">
            Loading platform data...
          </div>
        </div>
      </Card>
    );
  }

  if (platforms.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <p className="text-xs sm:text-sm text-muted-foreground">
            No platform data available
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 sm:p-6">
      {/* Header with Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-3 sm:mb-4 gap-3">
        <div>
          <h3 className="text-sm sm:text-base font-semibold">Violations & Views by Platform</h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-0.5">
            Platform performance overview
          </p>
        </div>
        <div className="inline-flex rounded-lg bg-muted p-0.5 sm:p-1 w-full sm:w-auto">
          <button
            onClick={() => setChartView("violations")}
            className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors touch-manipulation ${
              chartView === "violations"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Violations
          </button>
          <button
            onClick={() => setChartView("blocked")}
            className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors touch-manipulation ${
              chartView === "blocked"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Blocked
          </button>
          <button
            onClick={() => setChartView("views")}
            className={`flex-1 sm:flex-none px-2 sm:px-3 py-1.5 text-[10px] sm:text-xs font-medium rounded-md transition-colors touch-manipulation ${
              chartView === "views"
                ? "bg-background shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}>
            Views
          </button>
        </div>
      </div>

      {/* Compact Insight Pills */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 mb-3 sm:mb-4">
        {topViewsPlatform && (
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/30">
            <div
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{
                backgroundColor: `${getPlatformColor(topViewsPlatform.name)}15`,
              }}>
              {(() => {
                const Icon = getPlatformIcon(topViewsPlatform.name);
                return (
                  <Icon
                    className="h-3.5 w-3.5 sm:h-4 sm:w-4"
                    style={{
                      color: getPlatformColor(topViewsPlatform.name),
                    }}
                  />
                );
              })()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                Top Platform by Views
              </p>
              <p className="text-xs sm:text-sm font-semibold truncate">
                {topViewsPlatform.name} leads with{" "}
                {formatViewsForDisplay(topViewsPlatform.views)} views
              </p>
            </div>
          </div>
        )}

        {fastestPlatform && fastestPlatform.avgBlockTime > 0 && (
          <div className="flex items-center gap-2 p-2.5 sm:p-3 rounded-lg bg-muted/30">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-success/10 flex items-center justify-center flex-shrink-0">
              <Zap className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                Fastest Response
              </p>
              <p className="text-xs sm:text-sm font-semibold truncate">
                {fastestPlatform.name} with {fastestPlatform.avgBlockTime} min
                avg
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Platform Cards */}
      <div className="space-y-2 sm:space-y-3">
        {platforms.map((platform) => {
          const PlatformIcon = getPlatformIcon(platform.name);
          const platformColor = getPlatformColor(platform.name);
          const totalBlocked =
            platform.statusBreakdown.blocked +
            platform.statusBreakdown.removed;

          return (
            <Card
              key={platform.id}
              className="p-3 sm:p-4 hover:bg-muted/50 transition-colors">
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-0">
                  <div
                    className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center flex-shrink-0"
                    style={{
                      backgroundColor: `${platformColor}15`,
                    }}>
                    <PlatformIcon
                      className="h-4 w-4 sm:h-5 sm:w-5"
                      style={{ color: platformColor }}
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm sm:text-base font-semibold truncate">
                      {platform.name}
                    </p>
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      {platform.matchesAffected} match
                      {platform.matchesAffected !== 1 ? "es" : ""} affected
                    </p>
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-2 sm:gap-3">
                {/* Violations */}
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Violations
                  </p>
                  <p className="text-base sm:text-lg font-bold">
                    {platform.violations}
                  </p>
                  {chartView === "violations" && (
                    <div className="space-y-0.5 mt-1">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Live:</span>
                        <span className="font-medium">
                          {platform.contentSplit.live.violations}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Highlights:</span>
                        <span className="font-medium">
                          {platform.contentSplit.highlights.violations}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Others:</span>
                        <span className="font-medium">
                          {platform.contentSplit.others.violations}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Views */}
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Views
                  </p>
                  <p className="text-base sm:text-lg font-bold">
                    {formatViewsForDisplay(platform.views)}
                  </p>
                  {chartView === "views" && (
                    <div className="space-y-0.5 mt-1">
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Live:</span>
                        <span className="font-medium">
                          {formatViewsForDisplay(platform.contentSplit.live.views)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Highlights:</span>
                        <span className="font-medium">
                          {formatViewsForDisplay(platform.contentSplit.highlights.views)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[9px] sm:text-[10px]">
                        <span className="text-muted-foreground">Others:</span>
                        <span className="font-medium">
                          {formatViewsForDisplay(platform.contentSplit.others.views)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Success Rate */}
                <div className="space-y-1">
                  <p className="text-[10px] sm:text-xs text-muted-foreground">
                    Success Rate
                  </p>
                  <p className="text-base sm:text-lg font-bold text-success">
                    {platform.successRate}%
                  </p>
                </div>

                {/* Blocked vs Active */}
                {chartView === "blocked" ? (
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Blocked
                    </p>
                    <p className="text-base sm:text-lg font-bold text-success">
                      {platform.statusBreakdown.blocked}
                    </p>
                    <p className="text-[9px] sm:text-[10px] text-muted-foreground mt-1">
                      Active: {platform.statusBreakdown.active}
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs text-muted-foreground">
                      Avg Block Time
                    </p>
                    {platform.avgBlockTime > 0 ? (
                      <p className="text-base sm:text-lg font-bold">
                        {platform.avgBlockTime} min
                      </p>
                    ) : (
                      <p className="text-xs sm:text-sm text-muted-foreground">
                        N/A
                      </p>
                    )}
                  </div>
                )}

                {/* Additional Status Info */}
                <div className="col-span-2 space-y-1 pt-2 border-t border-border/40">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                        Removed
                      </p>
                      <p className="text-xs sm:text-sm font-medium">
                        {platform.statusBreakdown.removed}
                      </p>
                    </div>
                    <div>
                      <p className="text-[9px] sm:text-[10px] text-muted-foreground">
                        Under Review
                      </p>
                      <p className="text-xs sm:text-sm font-medium">
                        {platform.statusBreakdown.underReview}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </Card>
  );
}

