import { Card } from "@/components/ui/card";
import {
  Eye,
  Twitter,
  Youtube,
  Facebook,
  Instagram,
  TrendingUp,
  Loader2,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useLanguage } from "@/contexts/LanguageContext";

interface TopMatchByViolationsProps {
  topMatch: {
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
  } | null;
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

export function TopMatchByViolations({
  topMatch,
  statsLoading,
}: TopMatchByViolationsProps) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (!topMatch) {
    return null;
  }

  return (
    <div className="grid grid-cols-1 gap-4">
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold">{t("dashboard.topMatchByViolations")}</h3>
          <button
            onClick={() => navigate(`/match/${topMatch.externalMatchId}`)}
            className="text-[10px] text-primary hover:underline flex items-center gap-1 px-2.5 py-1 rounded-md bg-primary/5 hover:bg-primary/10 transition-colors">
            {t("dashboard.viewMatch")}
            <Eye className="h-3 w-3" />
          </button>
        </div>

        {statsLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
            <div className="text-xs text-muted-foreground">
              {t("dashboard.loadingMatchData")}
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 p-3 rounded-lg bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground mb-0.5">
                {t("dashboard.match")}
              </p>
              <p className="font-semibold text-base">{topMatch.teams}</p>
              <div className="flex items-baseline gap-1.5 mt-2">
                <p className="text-2xl font-bold">
                  {formatViewsForDisplay(topMatch.totalViews)}
                </p>
                <p className="text-xs text-muted-foreground">{t("dashboard.totalViewsLower")}</p>
              </div>
              <div className="flex items-baseline gap-1.5 mt-2">
                <p className="text-2xl font-bold">{topMatch.violations}</p>
                <p className="text-xs text-muted-foreground">
                  {t("dashboard.totalViolationsLower")}
                </p>
              </div>
            </div>

            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wide mb-3">
                {t("dashboard.breakdownByPlatform")}
              </p>
              {topMatch.platforms && topMatch.platforms.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {topMatch.platforms.map((platform) => {
                    const PlatformIcon = getPlatformIcon(platform.name);
                    const platformColor = getPlatformColor(platform.name);
                    const contentTypeLabel =
                      platform.violations === 1 ? t("dashboard.violation") : t("dashboard.violations");
                    const blockedCount = Math.round(
                      (platform.violations * platform.successRate) / 100
                    );

                    return (
                      <div
                        key={platform.name}
                        className="p-3 rounded-lg bg-background border border-border hover:shadow-md transition-all duration-200">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0"
                            style={{
                              backgroundColor: `${platformColor}10`,
                            }}>
                            <PlatformIcon
                              className="h-3.5 w-3.5"
                              style={{ color: platformColor }}
                            />
                          </div>
                          <p className="font-semibold text-sm">
                            {platform.name}
                          </p>
                        </div>
                        <p className="text-xs text-muted-foreground mb-2">
                          <span className="text-base font-bold text-foreground">
                            {formatViewsForDisplay(platform.views)}
                          </span>{" "}
                          {t("dashboard.views")} •{" "}
                          <span className="text-base font-bold text-foreground">
                            {platform.violations}
                          </span>{" "}
                          {contentTypeLabel}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          <span className="text-base font-bold text-success">
                            {blockedCount}
                          </span>{" "}
                          {t("dashboard.blockedWith")}{" "}
                          <span className="text-base font-bold text-success">
                            {platform.successRate}%
                          </span>{" "}
                          {t("dashboard.success")}
                        </p>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-6 text-xs text-muted-foreground">
                  {t("dashboard.platformsOverview.noPlatformData")}
                </div>
              )}
            </div>
          </>
        )}
      </Card>
    </div>
  );
}
