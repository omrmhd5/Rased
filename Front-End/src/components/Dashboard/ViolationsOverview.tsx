import { Card } from "@/components/ui/card";
import {
  AlertTriangle,
  Shield,
  XCircle,
  FileQuestion,
  Loader2,
} from "lucide-react";
import { MatchViolationsStatusBreakdown } from "@/components/MatchDashboard/MatchViolationsStatusBreakdown";
import { useLanguage } from "@/contexts/LanguageContext";

interface ViolationsOverviewProps {
  totalViolations: number;
  stillActive: number;
  blocked: number;
  removed: number;
  underReview: number;
  statsLoading: boolean;
}

export function ViolationsOverview({
  totalViolations,
  stillActive,
  blocked,
  removed,
  underReview,
  statsLoading,
}: ViolationsOverviewProps) {
  const { t, isRTL } = useLanguage();

  return (
    <Card className="p-4 sm:p-5 bg-gradient-to-br from-background to-muted/20">
      <h3 className={`text-base sm:text-lg font-bold mb-3 sm:mb-4 text-left`}>
        {t("dashboard.violationsOverview.title")}
      </h3>

      {/* Violations Metrics */}
      {statsLoading ? (
        <div className="flex items-center justify-center py-6 sm:py-8">
          {isRTL ? (
            <>
              <div className="text-xs sm:text-sm text-muted-foreground text-right">
                {t("dashboard.violationsOverview.loadingStats")}
              </div>
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground ml-2" />
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-muted-foreground mr-2" />
              <div className="text-xs sm:text-sm text-muted-foreground text-left">
                {t("dashboard.violationsOverview.loadingStats")}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4">
          {/* Total Violations */}
          <div
            className={`flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:bg-chart-1/5 rounded-lg p-2 -m-2 cursor-pointer touch-manipulation ${
              isRTL ? "" : ""
            }`}>
            <div className="p-1.5 sm:p-2 rounded-full bg-chart-1/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-chart-1" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {totalViolations.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate text-left">
                {t("dashboard.violationsOverview.totalViolations")}
              </p>
            </div>
          </div>

          {/* Active */}
          <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:bg-destructive/5 rounded-lg p-2 -m-2 cursor-pointer touch-manipulation">
            <div className="p-1.5 sm:p-2 rounded-full bg-destructive/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {stillActive.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate text-left">
                {t("dashboard.violationsOverview.active")}
              </p>
              <p className={`text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.violationsOverview.needsAction")}
              </p>
            </div>
          </div>

          {/* Blocked Successfully */}
          <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:bg-success/5 rounded-lg p-2 -m-2 cursor-pointer touch-manipulation">
            <div className="p-1.5 sm:p-2 rounded-full bg-success/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {blocked.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate text-left">
                {totalViolations > 0
                  ? Math.round((blocked / totalViolations) * 100)
                  : 0}
                {t("dashboard.violationsOverview.success")}
              </p>
              <p className={`text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.violationsOverview.blockedSuccessfully")}
              </p>
            </div>
          </div>

          {/* Removed */}
          <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:bg-cyan-500/5 rounded-lg p-2 -m-2 cursor-pointer touch-manipulation">
            <div className="p-1.5 sm:p-2 rounded-full bg-cyan-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-500" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {removed.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate text-left">
                {t("dashboard.violationsOverview.removed")}
              </p>
              <p className={`text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.violationsOverview.removedViolations")}
              </p>
            </div>
          </div>

          {/* Under Review */}
          <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 hover:scale-105 active:scale-[0.98] hover:bg-yellow-500/5 rounded-lg p-2 -m-2 cursor-pointer touch-manipulation">
            <div className="p-1.5 sm:p-2 rounded-full bg-yellow-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <FileQuestion className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {underReview.toLocaleString()}
              </p>
              <p className="text-[10px] sm:text-xs text-muted-foreground truncate text-left">
                {t("dashboard.violationsOverview.underReview")}
              </p>
              <p className={`text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.violationsOverview.pendingReview")}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Violations Status Breakdown */}
      <div className="mt-3 sm:mt-4">
        <MatchViolationsStatusBreakdown
          totalViolations={totalViolations}
          activeCount={stillActive}
          blockedCount={blocked}
          removedCount={removed}
          underReviewCount={underReview}
        />
      </div>
    </Card>
  );
}
