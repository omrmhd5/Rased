import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";
import { PlatformData } from "./types";
import { formatViews, calculateBlockDuration } from "./utils";

interface PlatformComparisonProps {
  platformOperations: PlatformData[];
  contentTypeFilter: string;
  comparisonMetric:
    | "violations"
    | "views"
    | "blocked"
    | "response"
    | "active";
  comparisonSort: "violations" | "views" | "response" | "active";
  comparisonSortDirection: "desc" | "asc";
  selectedSlots: string[];
  onMetricChange: (
    metric: "violations" | "views" | "blocked" | "response" | "active"
  ) => void;
  onSortChange: (sort: "violations" | "views" | "response" | "active") => void;
  onSortDirectionChange: (direction: "desc" | "asc") => void;
  onSelectedSlotsChange: (slots: string[]) => void;
  onReportOpen: () => void;
}

export function PlatformComparison({
  platformOperations,
  contentTypeFilter,
  comparisonMetric,
  comparisonSort,
  comparisonSortDirection,
  selectedSlots,
  onMetricChange,
  onSortChange,
  onSortDirectionChange,
  onSelectedSlotsChange,
  onReportOpen,
}: PlatformComparisonProps) {
  const platformMetrics = platformOperations.map((platform) => {
    const filteredViolations =
      contentTypeFilter === "all"
        ? platform.violations
        : platform.violations.filter(
            (v) => v.type.toLowerCase() === contentTypeFilter
          );

    const totalViolations = filteredViolations.length;
    const blockedViolations = filteredViolations.filter(
      (v) => v.status === "Blocked" || v.status === "Removed"
    );
    const blockedCount = blockedViolations.length;
    const blockedPercent =
      totalViolations > 0
        ? Math.round((blockedCount / totalViolations) * 100)
        : 0;

    const totalViews = filteredViolations.reduce((sum, v) => {
      const viewsStr = v.views?.replace(/[^0-9.]/g, "") || "0";
      const views = parseFloat(viewsStr) * (v.views?.toUpperCase().includes("K") ? 1000 : 1);
      return sum + views;
    }, 0);

    const activeCount = filteredViolations.filter((v) =>
      ["reported", "active", "pending", "review"].includes(
        v.status.toLowerCase()
      )
    ).length;

    const avgBlockTimeMinutes =
      blockedViolations.length > 0
        ? blockedViolations.reduce((sum, v) => {
            const blockInfo = calculateBlockDuration(v);
            return sum + (blockInfo?.duration ?? 0);
          }, 0) / blockedViolations.length
        : 0;

    return {
      platform,
      totalViolations,
      blockedCount,
      blockedPercent,
      totalViews,
      activeCount,
      avgBlockTimeMinutes,
    };
  });

  const sortedMetrics = [...platformMetrics].sort((a, b) => {
    let compareResult = 0;
    switch (comparisonSort) {
      case "violations":
        compareResult = b.totalViolations - a.totalViolations;
        break;
      case "views":
        compareResult = b.totalViews - a.totalViews;
        break;
      case "response":
        compareResult = b.avgBlockTimeMinutes - a.avgBlockTimeMinutes;
        break;
      case "active":
        compareResult = b.activeCount - a.activeCount;
        break;
      default:
        compareResult = 0;
    }
    return comparisonSortDirection === "desc"
      ? compareResult
      : -compareResult;
  });

  const slaThreshold = 10;

  const handleRowClick = (platformId: string) => {
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

  const handleSortChange = (v: string) => {
    const validSort = v as "violations" | "views" | "response" | "active";
    onSortChange(validSort);
    if (v === "violations") onMetricChange("violations");
    else if (v === "views") onMetricChange("views");
    else if (v === "response") onMetricChange("response");
    else if (v === "active") onMetricChange("active");
    onSortDirectionChange("desc");
  };

  return (
    <div className="mt-6">
      <Card className="p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold mb-1">
              Platform Comparison (This Match)
            </h3>
            <p className="text-sm text-muted-foreground">
              Compare platforms for this match
            </p>
            <p className="text-xs text-muted-foreground/70 mt-2">
              Metrics respect the current content filter (
              {contentTypeFilter === "all"
                ? "All types"
                : contentTypeFilter === "live"
                ? "Live"
                : contentTypeFilter === "highlights"
                ? "Highlights"
                : "Other"}
              )
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={onReportOpen}
              size="sm"
              variant="default"
              className="gap-2">
              <BarChart3 className="h-4 w-4" />
              تقرير المباراة
            </Button>

            <Select value={comparisonSort} onValueChange={handleSortChange}>
              <SelectTrigger className="w-[180px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="violations">Most violations</SelectItem>
                <SelectItem value="views">Highest views</SelectItem>
                <SelectItem value="response">Slowest response</SelectItem>
                <SelectItem value="active">Most active</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="mt-6 border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-muted/30 border-b">
              <tr>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Platform
                </th>
                <th
                  onClick={() => {
                    if (comparisonMetric === "violations") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onMetricChange("violations");
                      onSortChange("violations");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonMetric === "violations"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    Violations
                    {comparisonMetric === "violations" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonMetric === "blocked") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onMetricChange("blocked");
                      onSortChange("violations");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonMetric === "blocked"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    Blocked
                    {comparisonMetric === "blocked" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonMetric === "views") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onMetricChange("views");
                      onSortChange("views");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonMetric === "views"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    Views
                    {comparisonMetric === "views" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonMetric === "active") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onMetricChange("active");
                      onSortChange("active");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonMetric === "active"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    Still active
                    {comparisonMetric === "active" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => {
                    if (comparisonMetric === "response") {
                      onSortDirectionChange(
                        comparisonSortDirection === "desc" ? "asc" : "desc"
                      );
                    } else {
                      onMetricChange("response");
                      onSortChange("response");
                      onSortDirectionChange("desc");
                    }
                  }}
                  className={cn(
                    "text-left text-xs px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors select-none",
                    comparisonMetric === "response"
                      ? "font-semibold text-foreground border-b-2 border-primary"
                      : "font-medium text-muted-foreground"
                  )}>
                  <div className="flex items-center gap-1">
                    Avg block time
                    {comparisonMetric === "response" && (
                      <span className="text-[10px]">
                        {comparisonSortDirection === "desc" ? "↓" : "↑"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="text-left text-xs font-medium text-muted-foreground px-4 py-3">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMetrics.map((metrics) => {
                const { platform } = metrics;
                const IconComponent = platform.icon;

                let statusVariant: "default" | "secondary" | "destructive" =
                  "default";
                let statusText = "Within target";
                if (metrics.avgBlockTimeMinutes > slaThreshold * 1.5) {
                  statusVariant = "destructive";
                  statusText = "Slow";
                } else if (metrics.avgBlockTimeMinutes > slaThreshold) {
                  statusVariant = "secondary";
                  statusText = "Slightly slow";
                }

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
                          comparisonMetric === "violations"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.totalViolations}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        <p
                          className={cn(
                            "text-sm",
                            comparisonMetric === "blocked"
                              ? "font-semibold"
                              : "font-medium"
                          )}>
                          {metrics.blockedCount} blocked
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {metrics.blockedPercent}% success
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonMetric === "views"
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
                          comparisonMetric === "active"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.activeCount}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={cn(
                          "text-sm",
                          comparisonMetric === "response"
                            ? "font-semibold"
                            : "font-medium"
                        )}>
                        {metrics.avgBlockTimeMinutes.toFixed(1)} min
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusVariant} className="text-xs">
                        {statusText}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

