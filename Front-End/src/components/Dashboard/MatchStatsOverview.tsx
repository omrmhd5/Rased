import { Card } from "@/components/ui/card";
import {
  Activity,
  CheckCircle2,
  Play,
  Clock,
  AlertTriangle,
  Loader2,
} from "lucide-react";

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
  return (
    <Card className="p-5 bg-gradient-to-br from-background to-muted/20">
      <h3 className="text-lg font-bold mb-4">Match Stats Overview</h3>

      {statsLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground mr-2" />
          <div className="text-sm text-muted-foreground">
            Loading match stats...
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {/* Total Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-chart-1/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-chart-1/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <Activity className="h-3.5 w-3.5 text-chart-1" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
                {matchStats.total.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Total Matches</p>
            </div>
          </div>

          {/* Completed Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-success/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-success/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
                {matchStats.completed.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Completed</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                finished matches
              </p>
            </div>
          </div>

          {/* Live Matches */}
          <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-destructive/5 rounded-lg p-2 -m-2 cursor-pointer">
            <div className="p-2 rounded-full bg-destructive/10 shrink-0 transition-transform duration-300 hover:scale-110">
              <Play className="h-3.5 w-3.5 text-destructive" />
            </div>
            <div>
              <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
                {matchStats.live.toLocaleString()}
              </p>
              <p className="text-xs text-muted-foreground">Live</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                currently playing
              </p>
            </div>
          </div>

          {/* Upcoming Matches */}
          {matchStats.upcoming > 0 && (
            <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-blue-500/5 rounded-lg p-2 -m-2 cursor-pointer">
              <div className="p-2 rounded-full bg-blue-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
                <Clock className="h-3.5 w-3.5 text-blue-500" />
              </div>
              <div>
                <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
                  {matchStats.upcoming.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Upcoming</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  scheduled matches
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
              <div>
                <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
                  {matchStats.postponed.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Postponed</p>
                <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                  delayed matches
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

