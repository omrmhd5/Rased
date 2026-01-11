import { Card } from "@/components/ui/card";
import {
  Activity,
  CheckCircle2,
  Play,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface MatchStatsOverviewProps {
  matchStats: {
    total: number;
    completed: number;
    live: number;
    upcoming: number;
    postponed: number;
  };
  statsLoading: boolean;
}

export function MatchStatsOverview({
  matchStats,
  statsLoading,
}: MatchStatsOverviewProps) {
  const { t, isRTL } = useLanguage();
  
  return (
    <Card className="p-5 bg-gradient-to-br from-background to-muted/20">
      <h3 className="text-lg font-bold mb-4 text-left">{t("dashboard.matchStatsOverview.title")}</h3>

      {statsLoading ? (
        <div className="flex items-center justify-center py-4">
          {isRTL ? (
            <>
              <div className="text-sm text-muted-foreground text-right">
                {t("dashboard.matchStatsOverview.loadingMatchStats")}
              </div>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground ml-2" />
            </>
          ) : (
            <>
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
              <div className="text-sm text-muted-foreground text-left">
                {t("dashboard.matchStatsOverview.loadingMatchStats")}
              </div>
            </>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-chart-1/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-chart-1/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <Activity className="h-3.5 w-3.5 text-chart-1" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {matchStats.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground text-left">
                {t("dashboard.matchStatsOverview.totalMatches")}
              </p>
            </div>
          </div>

          {/* Completed Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-success/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-success/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {matchStats.completed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground text-left">
                {t("dashboard.matchStatsOverview.completed")}
              </p>
              <p className={`text-[10px] text-muted-foreground/70 mt-0.5 ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.matchStatsOverview.finishedMatches")}
              </p>
            </div>
          </div>

          {/* Live Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-destructive/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-destructive/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <Play className="h-3.5 w-3.5 text-destructive dark:text-red-400" />
            </div>
            <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105 text-left">
                {matchStats.live.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground text-left">
                {t("dashboard.matchStatsOverview.live")}
              </p>
              <p className={`text-[10px] text-muted-foreground/70 mt-0.5 ${isRTL ? "text-right" : "text-left"}`}>
                {t("dashboard.matchStatsOverview.currentlyPlaying")}
              </p>
            </div>
          </div>

          {/* Upcoming Matches */}
          {matchStats.upcoming > 0 && (
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-blue-500/5 rounded-lg p-2 -m-2 cursor-pointer">
              <div className="p-2 rounded-full bg-blue-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105 text-left">
                  {matchStats.upcoming.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground text-left">
                  {t("dashboard.matchStatsOverview.upcoming")}
                </p>
                <p className={`text-[10px] text-muted-foreground/70 mt-0.5 ${isRTL ? "text-right" : "text-left"}`}>
                  {t("dashboard.matchStatsOverview.scheduledMatches")}
                </p>
              </div>
            </div>
          )}

          {/* Postponed Matches */}
          {matchStats.postponed > 0 && (
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-yellow-500/5 rounded-lg p-2 -m-2 cursor-pointer">
              <div className="p-2 rounded-full bg-yellow-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
                <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" />
              </div>
              <div className={`min-w-0 ${isRTL ? "text-right" : "text-left"}`}>
                <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105 text-left">
                  {matchStats.postponed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground text-left">
                  {t("dashboard.matchStatsOverview.postponed")}
                </p>
                <p className={`text-[10px] text-muted-foreground/70 mt-0.5 ${isRTL ? "text-right" : "text-left"}`}>
                  {t("dashboard.matchStatsOverview.delayedMatches")}
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

