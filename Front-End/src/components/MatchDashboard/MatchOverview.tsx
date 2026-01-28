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
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";

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
  liveAvgBlockTime?: number;
  highlightsAvgBlockTime?: number;
  othersAvgBlockTime?: number;
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
  liveAvgBlockTime,
  highlightsAvgBlockTime,
  othersAvgBlockTime,
  onDownloadReport,
  isDownloading = false,
  onRoundReport,
}: MatchOverviewProps) {
  const { t, isRTL } = useLanguage();
  const { leagues } = useAuth();

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
      const competition = match.competition as {
        knownName?: string;
        name?: string;
        arabicName?: string;
      };
      if (isRTL && competition.arabicName) {
        return competition.arabicName;
      }
      return competition.knownName || competition.name || "";
    }
    return typeof match.competition === "string" ? match.competition : "";
  };

  const getStatusBadge = () => {
    const status = match.status;
    if (status === "live") {
      return (
        <Badge className="bg-red-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
          {t("matchDashboard.matchOverview.status.live")}
        </Badge>
      );
    } else if (status === "finished") {
      return (
        <Badge className="bg-green-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
          {t("matchDashboard.matchOverview.status.completed")}
        </Badge>
      );
    } else if (status === "postponed") {
      return (
        <Badge className="bg-yellow-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
          {t("matchDashboard.matchOverview.status.postponed")}
        </Badge>
      );
    } else if (status === "cancelled") {
      return (
        <Badge className="bg-gray-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
          {t("matchDashboard.matchOverview.status.cancelled")}
        </Badge>
      );
    } else {
      return (
        <Badge className="bg-blue-500 text-white text-[10px] sm:text-xs px-2 sm:px-2.5 py-0.5 sm:py-1">
          {t("matchDashboard.matchOverview.status.upcoming")}
        </Badge>
      );
    }
  };

  return (
    <Card className="p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
        <div className="flex-1 min-w-0">
          <h1 className="text-lg sm:text-xl font-bold mb-1 break-words">
            {match.team1} {t("matchDashboard.matchOverview.vs")} {match.team2}
          </h1>
          <p className="text-[10px] sm:text-xs text-muted-foreground break-words">
            {(() => {
              const leagueInfo = leagues?.find(
                (l) => l.league === match.league,
              );
              const isSuperCup = leagueInfo?.competitionType === "cup";
              if (isSuperCup) {
                return `${t("matchDashboard.matchOverview.stage")} ${match.stage || t("matchDashboard.matchOverview.nA")}`;
              }
              return `${t("matchDashboard.matchOverview.week")} ${match.week || t("matchDashboard.matchOverview.nA")}`;
            })()}{" "}
            • {getCompetitionName() || t("matchDashboard.matchOverview.nA")} •{" "}
            {match.stadium || t("matchDashboard.matchOverview.nA")}
          </p>
        </div>
        <div className="flex flex-row sm:flex-col sm:text-right sm:items-end gap-2 sm:gap-2 w-full sm:w-auto">
          <div className="flex items-center gap-2 flex-1 sm:flex-initial">
            <p className="text-[10px] sm:text-xs font-medium">
              {formatMatchDateTime()}
            </p>
            {(onDownloadReport || onRoundReport) && (
              <HoverCard openDelay={100} closeDelay={200}>
                <HoverCardTrigger asChild>
                  <Button
                    variant="default"
                    size="sm"
                    disabled={isDownloading}
                    className="h-7 sm:h-8 px-2 sm:px-3 text-[10px] sm:text-xs bg-blue-600 hover:bg-blue-700 text-white touch-manipulation">
                    {isDownloading ? (
                      <>
                        <Loader2 className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5 animate-spin" />
                        <span className="hidden xs:inline">
                          {t(
                            "matchDashboard.matchOverview.download.generating",
                          )}
                        </span>
                        <span className="xs:hidden">...</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-3 w-3 sm:h-3.5 sm:w-3.5 mr-1 sm:mr-1.5" />
                        <span className="hidden xs:inline">
                          {t("matchDashboard.matchOverview.download.download")}
                        </span>
                        <span className="xs:hidden">
                          {t("matchDashboard.matchOverview.download.dl")}
                        </span>
                      </>
                    )}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent
                  align="end"
                  className="w-48 sm:w-56 p-1"
                  sideOffset={5}>
                  <div className="flex flex-col">
                    {onDownloadReport && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-9 text-xs font-normal touch-manipulation"
                        onClick={onDownloadReport}
                        disabled={isDownloading}>
                        <Download className="mr-2 h-4 w-4" />
                        {t(
                          "matchDashboard.matchOverview.download.downloadReport",
                        )}
                      </Button>
                    )}
                    {onRoundReport && (
                      <Button
                        variant="ghost"
                        className="w-full justify-start h-9 text-xs font-normal touch-manipulation"
                        onClick={onRoundReport}>
                        <BarChart3 className="mr-2 h-4 w-4" />
                        {t("matchDashboard.matchOverview.download.roundReport")}
                      </Button>
                    )}
                  </div>
                </HoverCardContent>
              </HoverCard>
            )}
          </div>
          <div className="flex-shrink-0">{getStatusBadge()}</div>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 mb-3 sm:mb-4">
        {/* Total Violations */}
        <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] active:bg-chart-1/10 rounded-lg p-1.5 sm:p-2 -m-1.5 sm:-m-2 cursor-pointer touch-manipulation">
          <div className="p-1.5 sm:p-2 rounded-full bg-chart-1/20 shrink-0 transition-transform duration-300">
            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-chart-1" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1">
              {match.totalViolations !== undefined &&
              match.totalViolations !== null
                ? match.totalViolations
                : totalViolations}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("matchDashboard.matchOverview.stats.totalViolations")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {t("matchDashboard.matchOverview.stats.allPlatforms")}
            </p>
          </div>
        </div>

        {/* Active */}
        <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] active:bg-destructive/10 rounded-lg p-1.5 sm:p-2 -m-1.5 sm:-m-2 cursor-pointer touch-manipulation">
          <div className="p-1.5 sm:p-2 rounded-full bg-destructive/20 shrink-0 transition-transform duration-300">
            <AlertTriangle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-destructive dark:text-red-400" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1">
              {activeCount !== undefined && activeCount !== null
                ? activeCount
                : totalActive}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("matchDashboard.matchOverview.stats.active")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {t("matchDashboard.matchOverview.stats.needsAction")}
            </p>
          </div>
        </div>

        {/* Blocked Successfully */}
        <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] active:bg-success/10 rounded-lg p-1.5 sm:p-2 -m-1.5 sm:-m-2 cursor-pointer touch-manipulation">
          <div className="p-1.5 sm:p-2 rounded-full bg-success/20 shrink-0 transition-transform duration-300">
            <Shield className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-success" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1">
              {(() => {
                const blocked =
                  blockedCount !== undefined && blockedCount !== null
                    ? blockedCount
                    : 0;
                return blocked;
              })()}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {blockSuccessRate !== undefined && blockSuccessRate !== null
                ? `${blockSuccessRate}%`
                : `${blockedRate}%`}{" "}
              <span className="hidden sm:inline">
                {t("matchDashboard.matchOverview.stats.successRate")}
              </span>
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {t("matchDashboard.matchOverview.stats.blockedSuccessfully")}
            </p>
          </div>
        </div>

        {/* Removed */}
        <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] active:bg-cyan-500/10 rounded-lg p-1.5 sm:p-2 -m-1.5 sm:-m-2 cursor-pointer touch-manipulation">
          <div className="p-1.5 sm:p-2 rounded-full bg-cyan-500/20 shrink-0 transition-transform duration-300">
            <XCircle className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-cyan-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1">
              {removedCount !== undefined && removedCount !== null
                ? removedCount
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("matchDashboard.matchOverview.stats.removed")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {t("matchDashboard.matchOverview.stats.removedViolations")}
            </p>
          </div>
        </div>

        {/* Under Review */}
        <div className="flex items-center gap-2 sm:gap-2.5 transition-all duration-300 active:scale-[0.98] active:bg-yellow-500/5 rounded-lg p-1.5 sm:p-2 -m-1.5 sm:-m-2 cursor-pointer touch-manipulation">
          <div className="p-1.5 sm:p-2 rounded-full bg-yellow-500/10 shrink-0 transition-transform duration-300">
            <FileQuestion className="h-3 w-3 sm:h-3.5 sm:w-3.5 text-yellow-500" />
          </div>
          <div className="min-w-0">
            <p className="text-lg sm:text-xl font-bold leading-none mb-0.5 sm:mb-1">
              {underReviewCount !== undefined && underReviewCount !== null
                ? underReviewCount
                : 0}
            </p>
            <p className="text-[10px] sm:text-xs text-muted-foreground">
              {t("matchDashboard.matchOverview.stats.underReview")}
            </p>
            <p className="text-[9px] sm:text-[10px] text-muted-foreground/70 mt-0.5 hidden sm:block">
              {t("matchDashboard.matchOverview.stats.pendingReview")}
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-chart-4/20 to-chart-4/30 border border-chart-4/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-chart-4/30 cursor-pointer touch-manipulation">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Eye className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-4" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.totalViews")}
              </p>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {totalViews !== undefined && totalViews !== null
              ? totalViews.toLocaleString("en-US")
              : formattedTotalViews}
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {t("matchDashboard.matchOverview.stats.acrossAllPlatforms")}
          </p>
        </div>

        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-success/20 to-success/30 border border-success/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-success/30 cursor-pointer touch-manipulation">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-success" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.avgBlockTime")}
              </p>
            </div>
            <Badge
              className={`text-[9px] sm:text-xs transition-all duration-300 ${
                (avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                  ? avgBlockTimeNumber
                  : parseFloat(avgBlockTime)) <= targetMins
                  ? "bg-success/20 text-success border-success/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}>
              {(avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                ? avgBlockTimeNumber
                : parseFloat(avgBlockTime)) <= targetMins
                ? t("matchDashboard.matchOverview.stats.withinTarget")
                : t("matchDashboard.matchOverview.stats.overTarget")}
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {(() => {
              const minutes =
                avgBlockTimeNumber !== undefined && avgBlockTimeNumber !== null
                  ? avgBlockTimeNumber
                  : parseFloat(avgBlockTime) || 0;
              const hours = minutes / 60;
              return (
                <>
                  {minutes}
                  <span className="text-sm sm:text-base text-muted-foreground ml-1">
                    {t("matchDashboard.matchOverview.stats.min")}{" "}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}
                      {t("matchDashboard.matchOverview.stats.hrs")})
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.matchOverview.stats.target")} {targetMins}{" "}
            <span className="text-[10px] sm:text-xs text-muted-foreground">
              {t("matchDashboard.matchOverview.stats.min")}{" "}
              <span className="text-[9px] sm:text-xs text-muted-foreground">
                ({(targetMins / 60).toFixed(2)}
                {t("matchDashboard.matchOverview.stats.hrs")})
              </span>
            </span>
          </p>
        </div>

        {/* Live Avg Block Time */}
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-red-500/20 to-red-500/30 border border-red-500/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-red-500/30 cursor-pointer touch-manipulation">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-red-500" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.liveAvgBlockTime")}
              </p>
            </div>
            <Badge
              className={`text-[9px] sm:text-xs transition-all duration-300 ${
                (liveAvgBlockTime !== undefined && liveAvgBlockTime !== null
                  ? liveAvgBlockTime
                  : 0) <= targetMins
                  ? "bg-success/20 text-success border-success/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}>
              {(liveAvgBlockTime !== undefined && liveAvgBlockTime !== null
                ? liveAvgBlockTime
                : 0) <= targetMins
                ? t("matchDashboard.matchOverview.stats.withinTarget")
                : t("matchDashboard.matchOverview.stats.overTarget")}
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {(() => {
              const minutes = liveAvgBlockTime || 0;
              const hours = minutes / 60;
              return (
                <>
                  {minutes}
                  <span className="text-sm sm:text-base text-muted-foreground ml-1">
                    {t("matchDashboard.matchOverview.stats.min")}{" "}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}
                      {t("matchDashboard.matchOverview.stats.hrs")})
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.matchOverview.stats.liveContent")}
          </p>
        </div>

        {/* Highlights Avg Block Time */}
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-blue-500/20 to-blue-500/30 border border-blue-500/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-blue-500/30 cursor-pointer touch-manipulation">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-blue-500" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.highlightsAvgBlockTime")}
              </p>
            </div>
            <Badge
              className={`text-[9px] sm:text-xs transition-all duration-300 ${
                (highlightsAvgBlockTime !== undefined &&
                highlightsAvgBlockTime !== null
                  ? highlightsAvgBlockTime
                  : 0) <= targetMins
                  ? "bg-success/20 text-success border-success/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}>
              {(highlightsAvgBlockTime !== undefined &&
              highlightsAvgBlockTime !== null
                ? highlightsAvgBlockTime
                : 0) <= targetMins
                ? t("matchDashboard.matchOverview.stats.withinTarget")
                : t("matchDashboard.matchOverview.stats.overTarget")}
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {(() => {
              const minutes = highlightsAvgBlockTime || 0;
              const hours = minutes / 60;
              return (
                <>
                  {minutes}
                  <span className="text-sm sm:text-base text-muted-foreground ml-1">
                    {t("matchDashboard.matchOverview.stats.min")}{" "}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}
                      {t("matchDashboard.matchOverview.stats.hrs")})
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.matchOverview.stats.highlightsContent")}
          </p>
        </div>

        {/* Others Avg Block Time */}
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-purple-500/20 to-purple-500/30 border border-purple-500/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-purple-500/30 cursor-pointer touch-manipulation">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Clock className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-purple-500" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.othersAvgBlockTime")}
              </p>
            </div>
            <Badge
              className={`text-[9px] sm:text-xs transition-all duration-300 ${
                (othersAvgBlockTime !== undefined && othersAvgBlockTime !== null
                  ? othersAvgBlockTime
                  : 0) <= targetMins
                  ? "bg-success/20 text-success border-success/30"
                  : "bg-destructive/20 text-destructive border-destructive/30"
              }`}>
              {(othersAvgBlockTime !== undefined && othersAvgBlockTime !== null
                ? othersAvgBlockTime
                : 0) <= targetMins
                ? t("matchDashboard.matchOverview.stats.withinTarget")
                : t("matchDashboard.matchOverview.stats.overTarget")}
            </Badge>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {(() => {
              const minutes = othersAvgBlockTime || 0;
              const hours = minutes / 60;
              return (
                <>
                  {minutes}
                  <span className="text-sm sm:text-base text-muted-foreground ml-1">
                    {t("matchDashboard.matchOverview.stats.min")}{" "}
                    <span className="text-xs sm:text-sm text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}
                      {t("matchDashboard.matchOverview.stats.hrs")})
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
          <p className="text-xs sm:text-sm text-muted-foreground">
            {t("matchDashboard.matchOverview.stats.othersContent")}
          </p>
        </div>

        {/* Top Platform */}
        <div className="p-3 sm:p-4 rounded-lg bg-gradient-to-br from-chart-2/20 to-chart-2/30 border border-chart-2/50 transition-all duration-300 active:scale-[0.98] active:shadow-lg active:shadow-chart-2/30 cursor-pointer touch-manipulation sm:col-span-2 md:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Award className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-chart-2" />
              <p className="text-[10px] sm:text-xs font-medium text-muted-foreground">
                {t("matchDashboard.matchOverview.stats.topPlatform")}
              </p>
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-bold text-foreground mb-1">
            {match.mostViews !== undefined && match.mostViews !== null
              ? match.mostViews.toLocaleString("en-US")
              : topPlatform
                ? topPlatform.totalViews
                : "0"}
            <span className="text-sm sm:text-base text-muted-foreground ml-1">
              {t("matchDashboard.matchOverview.stats.views")}
            </span>
          </p>
          <p className="text-[10px] sm:text-xs text-muted-foreground">
            {topPlatform
              ? `${topPlatform.name} • ${t("matchDashboard.matchOverview.stats.biggestSource")}`
              : t("matchDashboard.matchOverview.nA")}
          </p>
        </div>
      </div>
    </Card>
  );
}
