import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  Eye,
  Loader2,
} from "lucide-react";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";

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
}

// Format views (pure numbers with commas, no abbreviations)
const formatViews = (views: number) => {
  return views.toLocaleString("en-US");
};

export function ProblematicAccountsMobile({
  accounts,
  loading,
  sortBy,
}: ProblematicAccountsMobileProps) {
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

  if (loading) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <Loader2 className="h-5 w-5 sm:h-6 sm:w-6 animate-spin text-muted-foreground mr-2" />
          <span className="text-xs sm:text-sm text-muted-foreground">
            Loading accounts...
          </span>
        </div>
      </Card>
    );
  }

  if (accounts.length === 0) {
    return (
      <Card className="p-4 sm:p-6">
        <div className="flex items-center justify-center py-8 sm:py-12">
          <p className="text-xs sm:text-sm text-muted-foreground">No accounts found</p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {accounts.map((account, index) => {
        const PlatformIcon = getPlatformIconComponent(account.platformName);
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
          <Card key={`${account.accountChannel}-${account.platformId}`} className="p-4">
            {/* Header with Rank and Account Info */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <div className="flex-shrink-0">
                  <Badge variant="outline" className="text-[10px] sm:text-xs font-bold">
                    #{index + 1}
                  </Badge>
                </div>
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  <span className="text-sm font-semibold truncate">
                    {account.accountChannel}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <PlatformIcon
                  className="h-4 w-4 flex-shrink-0"
                  style={{ color: platformColor }}
                />
                <span className="text-xs text-muted-foreground truncate max-w-[80px]">
                  {account.platformName}
                </span>
              </div>
            </div>

            {/* Main Metrics Grid */}
            <div className="grid grid-cols-2 gap-3 mb-3">
              {/* Violations */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Violations</p>
                <p className="text-lg font-bold">
                  {account.totalViolations.toLocaleString()}
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge
                    variant="destructive"
                    className="text-[9px] px-1.5 py-0">
                    {account.activeCount} Active
                  </Badge>
                  <Badge
                    variant="secondary"
                    className="text-[9px] px-1.5 py-0">
                    {account.blockedCount} Blocked
                  </Badge>
                </div>
              </div>

              {/* Views */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Total Views</p>
                <div className="flex items-center gap-1">
                  <Eye className="h-3.5 w-3.5 text-muted-foreground" />
                  <p className="text-lg font-bold">
                    {formatViews(account.totalViews)}
                  </p>
                </div>
              </div>

              {/* Matches Affected */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Matches</p>
                <p className="text-lg font-bold">
                  {account.matchesAffected}
                </p>
              </div>

              {/* Success Rate */}
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">Success Rate</p>
                <Badge
                  variant={successRate >= 80 ? "default" : "secondary"}
                  className="text-[10px] px-2 py-0.5">
                  {successRate}%
                </Badge>
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="pt-3 border-t border-border/40">
              <p className="text-[10px] text-muted-foreground mb-2">Status Breakdown</p>
              <div className="flex items-center gap-2 flex-wrap text-[9px] text-muted-foreground">
                <span>{account.blockedCount} Blocked</span>
                <span>•</span>
                <span>{account.removedCount} Removed</span>
                <span>•</span>
                <span>{account.underReviewCount} Review</span>
              </div>
            </div>

            {/* Content Type Breakdown */}
            <div className="pt-2 border-t border-border/40 mt-2">
              <p className="text-[10px] text-muted-foreground mb-2">Content Type</p>
              <div className="grid grid-cols-3 gap-2 text-[9px]">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Live</span>
                  <span className="font-medium">{account.liveCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Highlights</span>
                  <span className="font-medium">{account.highlightsCount}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Others</span>
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

