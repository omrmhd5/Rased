import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Shield, Activity, TrendingUp } from "lucide-react";
import { Match, PlatformData } from "./types";

interface MatchOverviewProps {
  match: Match;
  totalViolations: number;
  totalBlocked: number;
  totalActive: number;
  blockedRate: number;
  formattedTotalViews: string;
  avgBlockTime: string;
  topPlatform: PlatformData | null;
}

export function MatchOverview({
  match,
  totalViolations,
  totalBlocked,
  totalActive,
  blockedRate,
  formattedTotalViews,
  avgBlockTime,
  topPlatform,
}: MatchOverviewProps) {
  const formatMatchDateTime = () => {
    const dateStr = match.date;
    const timeStr = match.time || "";
    if (!dateStr) return "";

    try {
      const date = new Date(dateStr);
      const formattedDate = date.toLocaleDateString("en-US", {
        day: "numeric",
        month: "short",
        year: "numeric",
      });
      return timeStr ? `${formattedDate} – ${timeStr}` : formattedDate;
    } catch {
      return dateStr + (timeStr ? ` – ${timeStr}` : "");
    }
  };

  const getCompetitionName = () => {
    if (typeof match.competition === "object" && match.competition !== null) {
      return (match.competition as { name?: string }).name || "";
    }
    return typeof match.competition === "string" ? match.competition : "";
  };

  const getStatusBadge = () => {
    const status = match.status;
    if (status === "live") {
      return (
        <Badge variant="destructive" className="text-xs">
          LIVE
        </Badge>
      );
    } else if (status === "finished") {
      return (
        <Badge variant="secondary" className="text-xs">
          COMPLETED
        </Badge>
      );
    } else if (status === "postponed") {
      return (
        <Badge
          variant="outline"
          className="text-xs bg-yellow-500/10 text-yellow-600 border-yellow-500/30">
          POSTPONED
        </Badge>
      );
    } else if (status === "cancelled") {
      return (
        <Badge variant="outline" className="text-xs">
          CANCELLED
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-xs">
          UPCOMING
        </Badge>
      );
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h1 className="text-xl font-bold mb-1">
            {match.team1} vs {match.team2}
          </h1>
          <p className="text-xs text-muted-foreground">
            Week {match.week || "N/A"} • {getCompetitionName() || "N/A"} •{" "}
            {match.stadium || "N/A"}
          </p>
        </div>
        <div className="text-right">
          <p className="text-xs font-medium mb-1.5">
            {formatMatchDateTime()}
          </p>
          {getStatusBadge()}
        </div>
      </div>

      <div className="flex gap-4 mb-4">
        <div className="flex items-center gap-2.5 flex-1">
          <div className="p-2 rounded-full bg-chart-1/10 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5 text-chart-1" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1">
              {totalViolations}
            </p>
            <p className="text-xs text-muted-foreground">Total Violations</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              all platforms
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="p-2 rounded-full bg-success/10 shrink-0">
            <Shield className="h-3.5 w-3.5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1">
              {totalBlocked}
            </p>
            <p className="text-xs text-muted-foreground">
              Blocked Successfully
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {blockedRate}% success rate
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <Activity className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1">
              {totalActive}
            </p>
            <p className="text-xs text-muted-foreground">Still Active</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              needs action
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-1">
          <div className="p-2 rounded-full bg-chart-2/10 shrink-0">
            <TrendingUp className="h-3.5 w-3.5 text-chart-2" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1">
              {topPlatform ? topPlatform.totalViews : "0"}
            </p>
            <p className="text-xs text-muted-foreground">Top Platform</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              {topPlatform ? `${topPlatform.name} • biggest source` : "N/A"}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-chart-4/5 to-chart-4/10 border border-chart-4/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Total Views (This Match)
            </p>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">
            {formattedTotalViews}
          </p>
          <p className="text-xs text-muted-foreground">
            Across all platforms
          </p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-medium text-muted-foreground">
              Avg Block Time (This Match)
            </p>
            <Badge className="text-xs bg-success/20 text-success border-success/30">
              {parseFloat(avgBlockTime) <= 15
                ? "Within target"
                : "Over target"}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1">
            {avgBlockTime}
            <span className="text-base text-muted-foreground ml-1">min</span>
          </p>
          <p className="text-xs text-muted-foreground">Target: 15 min SLA</p>
        </div>
      </div>
    </Card>
  );
}

