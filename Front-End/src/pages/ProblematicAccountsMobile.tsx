import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Eye, Loader2 } from "lucide-react";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { BASE_URL, PlatformData } from "@/components/MatchDashboard/types";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface ProblematicAccountsMobileProps {
  accounts: ProblematicAccount[];
  loading: boolean;
  sortBy: "violations" | "views" | "matches";
  platformOperations: PlatformData[];
}

// Format views (pure numbers with commas, no abbreviations)
const formatViews = (views: number) => {
  return views.toLocaleString("en-US");
};

export function ProblematicAccountsMobile({
  accounts,
  loading,
  sortBy,
  platformOperations,
}: ProblematicAccountsMobileProps) {
  const { t } = useLanguage();

  const getPlatformIcon = (
    platformId: string,
    platformName: string,
    className = "h-4 w-4",
  ) => {
    // Try finding by ID first
    let platform = platformOperations.find((p) => p.id === platformId);
    // Fallback to name match if needed
    if (!platform) {
      platform = platformOperations.find((p) => p.name === platformName);
    }

    if (!platform) {
      return <AlertTriangle className={className} />;
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

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            {t("problematicAccounts.loadingAccounts")}
          </span>
        </div>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("problematicAccounts.noAccountsFound")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account, index) => {
        const successRate =
          account.totalViolations > 0
            ? Math.round(
                ((account.blockedCount + account.removedCount) /
                  account.totalViolations) *
                  100,
              )
            : 0;

        return (
          <Card
            key={`${account.accountChannel}-${account.platformId}`}
            className="p-4">
            {/* Header with Rank and Account Info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Badge
                    variant="outline"
                    className="text-[10px] sm:text-xs font-bold">
                    #{index + 1}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-destructive dark:text-red-400 flex-shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    {account.accountChannel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                {getPlatformIcon(
                  account.platformId,
                  account.platformName,
                  "h-4 w-4 flex-shrink-0",
                )}
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {account.platformName}
                </span>
              </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Violations */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  {t("problematicAccounts.violations")}
                </p>
                <p className="text-lg font-bold">
                  {account.totalViolations.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="destructive"
                    className="text-[9px] px-1.5 py-0 dark:bg-red-500 dark:text-white">
                    {account.activeCount} {t("problematicAccounts.active")}
                  </Badge>
                  <Badge variant="secondary" className="text-[9px] px-1.5 py-0">
                    {account.blockedCount} {t("problematicAccounts.blocked")}
                  </Badge>
                </div>
              </div>

              {/* Views */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  {t("problematicAccounts.totalViews")}
                </p>
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-lg font-bold">
                    {formatViews(account.totalViews)}
                  </p>
                </div>
              </div>

              {/* Matches Affected */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  {t("problematicAccounts.matches")}
                </p>
                <p className="text-lg font-bold">{account.matchesAffected}</p>
              </div>

              {/* Success Rate */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  {t("problematicAccounts.successRate")}
                </p>
                <Badge
                  variant={successRate >= 80 ? "default" : "secondary"}
                  className="text-[10px] px-2 py-0.5">
                  {successRate}%
                </Badge>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground mb-2">
                {t("problematicAccounts.statusBreakdown")}
              </p>
              <div className="flex items-center gap-2 flex-wrap text-[9px] text-muted-foreground">
                <span>
                  {account.blockedCount} {t("problematicAccounts.blocked")}
                </span>
                <span>•</span>
                <span>
                  {account.removedCount} {t("problematicAccounts.removed")}
                </span>
                <span>•</span>
                <span>
                  {account.underReviewCount} {t("problematicAccounts.review")}
                </span>
              </div>
            </div>

            {/* Content Type Breakdown */}
            <div className="pt-2 border-t border-border/40 mt-2">
              <p className="text-[10px] text-muted-foreground mb-2">
                {t("problematicAccounts.contentType")}
              </p>
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">
                    {t("dashboard.live")}
                  </span>
                  <span className="font-medium">{account.liveCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">
                    {t("dashboard.highlights")}
                  </span>
                  <span className="font-medium">{account.highlightsCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">
                    {t("dashboard.others")}
                  </span>
                  <span className="font-medium">{account.othersCount}</span>
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
