import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformData } from "./types";
import { formatViews, calculateBlockDuration } from "./utils";
import { useLanguage } from "@/contexts/LanguageContext";

type SortColumn =
  | "views"
  | "violations"
  | "active"
  | "blocked"
  | "removed"
  | "avgBlockTime"
  | "underReview";

interface PlatformComparisonProps {
  platformOperations: PlatformData[];
  contentTypeFilter?: string;
  comparisonSort: SortColumn;
  comparisonSortDirection: "desc" | "asc";
  selectedSlots?: string[];
  onSortChange: (sort: SortColumn) => void;
  onSortDirectionChange: (direction: "desc" | "asc") => void;
  onSelectedSlotsChange?: (slots: string[]) => void;
  targetMins?: number;
  title?: string;
  description?: string;
  showCard?: boolean;
}

export function PlatformComparison({
  platformOperations,
  contentTypeFilter = "",
  comparisonSort,
  comparisonSortDirection,
  selectedSlots = [],
  onSortChange,
  onSortDirectionChange,
  onSelectedSlotsChange,
  targetMins = 15,
  title = "Platform Comparison (This Match)",
  description = "Compare platforms for this match",
  showCard = true,
}: PlatformComparisonProps) {
  const { t } = useLanguage();
  
  const platformMetrics = platformOperations.map((platform) => {
    // Always use backend data directly from platform object (ignore content type filter)
    const totalViolations = platform.totalViolations ?? 0;
    const blockedCount = platform.blockedCount ?? 0;
    // Parse totalViews from string format (e.g., "1,234" or "20") to number
    const totalViewsStr = platform.totalViews?.replace(/[^0-9.]/g, "") || "0";
    const totalViews = parseInt(totalViewsStr) || 0;
    const activeCount = platform.activeViolations ?? 0;
    const removedCount = platform.removedCount ?? 0;
    const underReviewCount = platform.underReviewCount ?? 0;
    // Parse avgBlockTime from string format (e.g., "21 min", "2h", "1d") to minutes
    const avgBlockTimeStr = platform.avgBlockTime || "0 min";
    let avgBlockTimeMinutes = 0;
    if (avgBlockTimeStr.includes("d")) {
      const days = parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
      avgBlockTimeMinutes = days * 1440;
    } else if (avgBlockTimeStr.includes("h")) {
      const hours = parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
      avgBlockTimeMinutes = hours * 60;
    } else {
      const minutes = parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
      avgBlockTimeMinutes = minutes;
    }
    // Use backend blockSuccessRate (0-100)
    const blockSuccessRate = platform.blockSuccessRate ?? 0;

    return {
      platform,
      totalViolations,
      blockedCount,
      totalViews,
      activeCount,
      removedCount,
      underReviewCount,
      avgBlockTimeMinutes,
      blockSuccessRate,
    };
  });

  const sortedMetrics = [...platformMetrics].sort((a, b) => {
    let compareResult = 0;
    switch (comparisonSort) {
      case "views":
        compareResult = b.totalViews - a.totalViews;
        break;
      case "violations":
        compareResult = b.totalViolations - a.totalViolations;
        break;
      case "active":
        compareResult = b.activeCount - a.activeCount;
        break;
      case "blocked":
        compareResult = b.blockedCount - a.blockedCount;
        break;
      case "removed":
        compareResult = b.removedCount - a.removedCount;
        break;
      case "avgBlockTime":
        compareResult = b.avgBlockTimeMinutes - a.avgBlockTimeMinutes;
        break;
      case "underReview":
        compareResult = b.underReviewCount - a.underReviewCount;
        break;
      default:
        compareResult = 0;
    }
    return comparisonSortDirection === "desc" ? compareResult : -compareResult;
  });

  const handleRowClick = (platformId: string) => {
    if (!onSelectedSlotsChange) return;
    
    if (selectedSlots.includes(platformId)) {
      const element = document.getElementById(`platform-card-${platformId}`);
      if (element) {
        element.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
        element.classList.add("ring-2", "ring-primary", "ring-offset-2");
        setTimeout(() => {
          element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
        }, 2000);
      }
    } else {
      if (selectedSlots.length === 0) {
        onSelectedSlotsChange([platformId]);
      } else if (selectedSlots.length === 1) {
        onSelectedSlotsChange([selectedSlots[0], platformId]);
      } else {
        onSelectedSlotsChange([selectedSlots[0], platformId]);
      }

      setTimeout(() => {
        const element = document.getElementById(`platform-card-${platformId}`);
        if (element) {
          element.scrollIntoView({
            behavior: "smooth",
            block: "center",
          });
          element.classList.add("ring-2", "ring-primary", "ring-offset-2");
          setTimeout(() => {
            element.classList.remove("ring-2", "ring-primary", "ring-offset-2");
          }, 2000);
        }
      }, 100);
    }
  };

  const content = (
    <>
      {showCard && (
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      )}

        <div className="mt-6 border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  {t("dashboard.platform")}
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "views") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("views");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "views"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.views")}
                    {comparisonSort === "views" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "violations") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("violations");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "violations"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.violations")}
                    {comparisonSort === "violations" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "active") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("active");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "active"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.active")}
                    {comparisonSort === "active" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "blocked") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("blocked");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "blocked"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.blocked")}
                    {comparisonSort === "blocked" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "avgBlockTime") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("avgBlockTime");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "avgBlockTime"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.avgBlockTime")}
                    {comparisonSort === "avgBlockTime" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "removed") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("removed");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "removed"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.removed")}
                    {comparisonSort === "removed" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonSort === "underReview") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onSortChange("underReview");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonSort === "underReview"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    {t("dashboard.underReview")}
                    {comparisonSort === "underReview" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  {t("dashboard.targetStatus")}
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((metrics) => {
                const { platform } = metrics;
                const IconComponent = platform.icon;

                // Match MatchOverview logic: <= targetMins = success, > targetMins = destructive
                const isWithinTarget = metrics.avgBlockTimeMinutes <= targetMins;
                const statusText = isWithinTarget
                  ? t("dashboard.withinTarget")
                  : t("dashboard.overTarget");

                return (
                  <tr
                    key={platform.id}
                    onClick={() => handleRowClick(platform.id)}
                    className="border-b last:border-b-0 hover:bg-muted/50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <IconComponent
                          className="h-4 w-4"
                          style={{ color: platform.color }}
                        />
                        <span className="text-sm font-medium">
                          {platform.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "views"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {formatViews(metrics.totalViews)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "violations"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.totalViolations}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "active"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.activeCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <span
                          className={cn(
                            "text-sm",
                            comparisonSort === "blocked"
                              ? "font-semibold"
                              : "font-medium"
                          )}>
                          {metrics.blockedCount}
                        </span>
                        <p className="text-xs text-muted-foreground">
                          {metrics.blockSuccessRate}% {t("dashboard.successRate")}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "avgBlockTime"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {(() => {
                          const minutes =
                            metrics.avgBlockTimeMinutes % 1 === 0
                              ? metrics.avgBlockTimeMinutes
                              : metrics.avgBlockTimeMinutes.toFixed(1);
                          const hours = metrics.avgBlockTimeMinutes / 60;
                          return (
                            <>
                              {minutes}{" "}
                              <span className="text-xs text-muted-foreground">
                                {t("dashboard.min")}{" "}
                                <span className="text-medium text-muted-foreground">
                                  ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}{t("dashboard.hrs")})
                                </span>
                              </span>
                            </>
                          );
                        })()}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "removed"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.removedCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonSort === "underReview"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.underReviewCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        className={`text-xs transition-all duration-300 ${
                          isWithinTarget
                            ? "bg-success/20 text-success border-success/30"
                            : "bg-destructive/20 text-destructive border-destructive/30"
                        }`}>
                        {statusText}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </>
  );

  if (showCard) {
    return (
      <div className="mt-6">
        <Card className="p-6">{content}</Card>
      </div>
    );
  }

  return <div className="mt-6">{content}</div>;
}
