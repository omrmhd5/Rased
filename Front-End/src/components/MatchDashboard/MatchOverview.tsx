import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Shield,
  TrendingUp,
  Eye,
  Clock,
  Award,
  XCircle,
  FileQuestion,
  Download,
  Loader2,
  BarChart3,
} from "lucide-react";
import { Match, PlatformData } from "./types";
import {
  HoverCard,
  HoverCardContent,
  HoverCardTrigger,
} from "@/components/ui/hover-card";

interface MatchOverviewProps {
  match: Match;
  totalViolations: number;
  totalBlocked: number;
  totalActive: number;
  blockedRate: number;
  formattedTotalViews: string;
  avgBlockTime: string;
  topPlatform: PlatformData | null;
  // Additional stats from match object
  totalViews?: number;
  activeCount?: number;
  blockedCount?: number;
  removedCount?: number;
  underReviewCount?: number;
  avgBlockTimeNumber?: number;
  blockSuccessRate?: number;
  targetMins?: number;
  onDownloadReport?: () => void;
  isDownloading?: boolean;
  onRoundReport?: () => void;
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
  totalViews,
  activeCount,
  blockedCount,
  removedCount,
  underReviewCount,
  avgBlockTimeNumber,
  blockSuccessRate,
  targetMins = 15,
  onDownloadReport,
  isDownloading = false,
  onRoundReport,
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
      return <Badge className="bg-red-500 text-white text-xs">● LIVE</Badge>;
    } else if (status === "finished") {
      return (
        <Badge className="bg-green-500 text-white text-xs">COMPLETED</Badge>
      );
    } else if (status === "postponed") {
      return (
        <Badge className="bg-yellow-500 text-white text-xs">POSTPONED</Badge>
      );
    } else if (status === "cancelled") {
      return (
        <Badge className="bg-gray-500 text-white text-xs">CANCELLED</Badge>
      );
    } else {
      return <Badge className="bg-blue-500 text-white text-xs">UPCOMING</Badge>;
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
        <div className="text-right flex flex-col items-end gap-2">
          <div className="flex items-center gap-2">
            <p className="text-xs font-medium">{formatMatchDateTime()}</p>
            {(onDownloadReport || onRoundReport) && (
              <HoverCard openDelay={100} closeDelay={200}>
                <HoverCardTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isDownloading}
                    className="h-7 px-2 text-xs bg-blue-600 hover:bg-blue-700 text-white">
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3 w-3 mr-1.5 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 mr-1.5" />
                        Download
                      </>
                    )}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent 
                  align="end" 
                  className="w-48 p-1"
                  sideOffset={5}>
                  <div className="flex flex-col">
                    {onDownloadReport && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-9 text-xs font-normal"
                        onClick={onDownloadReport}
                        disabled={isDownloading}>
                        <Download className="mr-2 h-4 w-4" />
                        Download Report
                      </Button>
                    )}
                    {onRoundReport && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-9 text-xs font-normal"
                        onClick={onRoundReport}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        Round Report
                      </Button>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
          {getStatusBadge()}
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 mb-4">
        {/* Total Violations */}
        <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-chart-1/5 rounded-lg p-2 -m-2 cursor-pointer">
          <div className="p-2 rounded-full bg-chart-1/10 shrink-0 transition-transform duration-300 hover:scale-110">
            <AlertTriangle className="h-3.5 w-3.5 text-chart-1" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
              {match.totalViolations !== undefined &&
              match.totalViolations !== null
                ? match.totalViolations
                : totalViolations}
            </p>
            <p className="text-xs text-muted-foreground">Total Violations</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              all platforms
            </p>
          </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-destructive/5 rounded-lg p-2 -m-2 cursor-pointer">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0 transition-transform duration-300 hover:scale-110">
            <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
              {activeCount !== undefined && activeCount !== null
                ? activeCount
                : totalActive}
            </p>
            <p className="text-xs text-muted-foreground">Active</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              needs action
            </p>
          </div>
        </div>

        {/* Blocked Successfully */}
        <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-success/5 rounded-lg p-2 -m-2 cursor-pointer">
          <div className="p-2 rounded-full bg-success/10 shrink-0 transition-transform duration-300 hover:scale-110">
            <Shield className="h-3.5 w-3.5 text-success" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
              {(() => {
                const blocked =
                  blockedCount !== undefined && blockedCount !== null
                    ? blockedCount
                    : 0;
                return blocked;
              })()}
            </p>
            <p className="text-xs text-muted-foreground">
              {blockSuccessRate !== undefined && blockSuccessRate !== null
                ? `${blockSuccessRate}%`
                : `${blockedRate}%`}{" "}
              success rate
            </p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              Blocked Successfully
            </p>
          </div>
        </div>

        {/* Removed */}
        <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-cyan-500/5 rounded-lg p-2 -m-2 cursor-pointer">
          <div className="p-2 rounded-full bg-cyan-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
            <XCircle className="h-3.5 w-3.5 text-cyan-500" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
              {removedCount !== undefined && removedCount !== null
                ? removedCount
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Removed</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              removed violations
            </p>
          </div>
        </div>

        {/* Under Review */}
        <div className="flex items-center gap-2.5 transition-all duration-300 hover:scale-105 hover:bg-yellow-500/5 rounded-lg p-2 -m-2 cursor-pointer">
          <div className="p-2 rounded-full bg-yellow-500/10 shrink-0 transition-transform duration-300 hover:scale-110">
            <FileQuestion className="h-3.5 w-3.5 text-yellow-500" />
          </div>
          <div>
            <p className="text-xl font-bold leading-none mb-1 transition-transform duration-300 hover:scale-105">
              {underReviewCount !== undefined && underReviewCount !== null
                ? underReviewCount
                : 0}
            </p>
            <p className="text-xs text-muted-foreground">Under Review</p>
            <p className="text-[10px] text-muted-foreground/70 mt-0.5">
              pending review
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="p-4 rounded-lg bg-gradient-to-br from-chart-4/5 to-chart-4/10 border border-chart-4/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-4/20 cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-chart-4 transition-transform duration-300 hover:scale-110" />
              <p className="text-xs font-medium text-muted-foreground">
                Total Views (This Match)
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1 transition-transform duration-300 hover:scale-105">
            {totalViews !== undefined && totalViews !== null
              ? totalViews.toLocaleString("en-US")
              : formattedTotalViews}
          </p>
          <p className="text-xs text-muted-foreground">Across all platforms</p>
        </div>

        <div className="p-4 rounded-lg bg-gradient-to-br from-success/5 to-success/10 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-success transition-transform duration-300 hover:scale-110" />
              <p className="text-xs font-medium text-muted-foreground">
                Avg Block Time (This Match)
              </p>
            </div>
            <Badge
              className={`text-xs transition-all duration-300 ${
                (avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                  ? avgBlockTimeNumber
                  : parseFloat(avgBlockTime)) <= targetMins
                  ? "bg-success/20 text-success border-success/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}>
              {(avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                ? avgBlockTimeNumber
                : parseFloat(avgBlockTime)) <= targetMins
                ? "Within target"
                : "Over target"}
            </Badge>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1 transition-transform duration-300 hover:scale-105">
            {(() => {
              const minutes =
                avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                  ? avgBlockTimeNumber
                  : parseFloat(avgBlockTime) || 0;
              const hours = minutes / 60;
              return (
                <>
                  {minutes}
                  <span className="text-base text-muted-foreground ml-1">
                    min{" "}
                    <span className="text-medium text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}hrs)
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
          <p className="text-sm text-muted-foreground">
            Target: {targetMins}{" "}
            <span className="text-xs text-muted-foreground">
              min{" "}
              <span className="text-medium text-muted-foreground">
                ({(targetMins / 60).toFixed(2)}hrs)
              </span>
            </span>
          </p>
        </div>

        {/* Top Platform */}
        <div className="p-4 rounded-lg bg-gradient-to-br from-chart-2/5 to-chart-2/10 border border-chart-2/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-2/20 cursor-pointer">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-4 w-4 text-chart-2 transition-transform duration-300 hover:scale-110" />
              <p className="text-xs font-medium text-muted-foreground">
                Top Platform
              </p>
            </div>
          </div>
          <p className="text-3xl font-bold text-foreground mb-1 transition-transform duration-300 hover:scale-105">
            {match.mostViews !== undefined && match.mostViews !== null
              ? match.mostViews.toLocaleString("en-US")
              : topPlatform
              ? topPlatform.totalViews
              : "0"}
            <span className="text-base text-muted-foreground ml-1">views</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {topPlatform ? `${topPlatform.name} • biggest source` : "N/A"}
          </p>
        </div>
      </div>
    </Card>
  );
}
