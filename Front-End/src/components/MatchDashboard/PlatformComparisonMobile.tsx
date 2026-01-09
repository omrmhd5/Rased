import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { PlatformData } from "./types";
import { formatViews } from "./utils";
import { ChevronDown, ChevronUp } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

type SortColumn =
  | "views"
  | "violations"
  | "active"
  | "blocked"
  | "removed"
  | "avgBlockTime"
  | "underReview";

interface PlatformComparisonMobileProps {
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

export function PlatformComparisonMobile({
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
}: PlatformComparisonMobileProps) {
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

  const handleCardClick = (platformId: string) => {
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

  const SortButton = ({
    sortKey,
    label,
    className = "",
  }: {
    sortKey: SortColumn;
    label: string;
    className?: string;
  }) => {
    const isActive = comparisonSort === sortKey;
    return (
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          if (isActive) {
            onSortDirectionChange(
              comparisonSortDirection === "desc" ? "asc" : "desc"
            );
          } else {
            onSortChange(sortKey);
            onSortDirectionChange("desc");
          }
        }}
        className={cn(
          "h-8 text-xs touch-manipulation",
          isActive
            ? "bg-primary/10 text-primary font-semibold"
            : "text-muted-foreground",
          className
        )}>
        {label}
        {isActive &&
          (comparisonSortDirection === "desc" ? (
            <ChevronDown className="h-3 w-3 ml-1" />
          ) : (
            <ChevronUp className="h-3 w-3 ml-1" />
          ))}
      </Button>
    );
  };

  const content = (
    <>
      {showCard && (
        <div className="mb-4">
          <h3 className="text-lg font-semibold mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      )}

      {/* Sort Buttons */}
      <div className="flex flex-wrap gap-2 mb-4">
        <SortButton sortKey="views" label="Views" />
        <SortButton sortKey="violations" label="Violations" />
        <SortButton sortKey="active" label="Active" />
        <SortButton sortKey="blocked" label="Blocked" />
        <SortButton sortKey="avgBlockTime" label="Block Time" />
        <SortButton sortKey="removed" label="Removed" />
        <SortButton sortKey="underReview" label="Review" />
      </div>

      {/* Platform Cards */}
      <div className="space-y-3">
        {sortedMetrics.map((metrics) => {
          const { platform } = metrics;
          const IconComponent = platform.icon;

          // Match MatchOverview logic: <= targetMins = success, > targetMins = destructive
          const isWithinTarget = metrics.avgBlockTimeMinutes <= targetMins;
          const statusText = isWithinTarget
            ? "Within target"
            : "Over target";

          const minutes =
            metrics.avgBlockTimeMinutes % 1 === 0
              ? metrics.avgBlockTimeMinutes
              : metrics.avgBlockTimeMinutes.toFixed(1);
          const hours = metrics.avgBlockTimeMinutes / 60;

          return (
            <Card
              key={platform.id}
              onClick={() => handleCardClick(platform.id)}
              className="p-4 cursor-pointer hover:bg-muted/50 transition-colors touch-manipulation active:scale-[0.98]">
              {/* Platform Header */}
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: platform.color }}
                  />
                  <span className="font-semibold text-base">
                    {platform.name}
                  </span>
                </div>
                <Badge
                  className={`text-xs transition-all duration-300 ${
                    isWithinTarget
                      ? "bg-success/20 text-success border-success/30"
                      : "bg-destructive/20 text-destructive border-destructive/30"
                  }`}>
                  {statusText}
                </Badge>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.views")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "views" && "font-semibold text-primary"
                    )}>
                    {formatViews(metrics.totalViews)}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.violations")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "violations" &&
                        "font-semibold text-primary"
                    )}>
                    {metrics.totalViolations}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.active")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "active" &&
                        "font-semibold text-primary"
                    )}>
                    {metrics.activeCount}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.blocked")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "blocked" &&
                        "font-semibold text-primary"
                    )}>
                    {metrics.blockedCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {metrics.blockSuccessRate}% {t("dashboard.success")}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    {t("dashboard.avgBlockTime")}
                  </p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "avgBlockTime" &&
                        "font-semibold text-primary"
                    )}>
                    {minutes} {t("dashboard.min")}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)} {t("dashboard.hrs")})
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.removed")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "removed" &&
                        "font-semibold text-primary"
                    )}>
                    {metrics.removedCount}
                  </p>
                </div>

                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">{t("dashboard.underReview")}</p>
                  <p
                    className={cn(
                      "text-sm font-medium",
                      comparisonSort === "underReview" &&
                        "font-semibold text-primary"
                    )}>
                    {metrics.underReviewCount}
                  </p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </>
  );

  if (showCard) {
    return (
      <div className="mt-6">
        <Card className="p-4 sm:p-6">{content}</Card>
      </div>
    );
  }

  return <div className="mt-6">{content}</div>;
}

