import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Plus,
  Search,
  AlertCircle,
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  FileQuestion,
  XCircle,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { PlatformData, Violation, BASE_URL, BulkViolation } from "./types";
import { ViolationItem } from "./ViolationItem";
import { BulkViolationItem } from "./BulkViolationItem";
import { groupViolationsByBulkId, isPartOfBulkGroup } from "./utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useState, useEffect } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PlatformCardProps {
  platform: PlatformData;
  filteredViolations: Violation[];
  bulkViolations?: BulkViolation[]; // Bulk violation items for this platform
  cardFilter: string;
  searchQuery: string;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onAddViolation: () => void;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string, violation?: Violation) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  canModifyViolations?: boolean; // Whether user can modify violations
  onRefetch?: () => void; // Callback to refetch data
  onBulkDelete?: (platformId: string, violations: Violation[]) => void;
  onBulkStatusChange?: (
    platformId: string,
    violations: Violation[],
    status: "Active" | "Blocked" | "Removed" | "Under Review",
    blockedAt?: string,
  ) => void;
}

export function PlatformCard({
  platform,
  filteredViolations,
  bulkViolations = [], // Bulk violation items from backend
  cardFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onAddViolation,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
  canModifyViolations = false,
  onRefetch,
  onBulkDelete,
  onBulkStatusChange,
}: PlatformCardProps) {
  const { t, isRTL } = useLanguage();
  const [isMaximized, setIsMaximized] = useState(false);
  const [violationsPage, setViolationsPage] = useState(1);
  const [viewMetaFilter, setViewMetaFilter] = useState<
    "all" | "bulk" | "individual"
  >("all");
  const violationsPerPage = 5;
  const IconComponent = platform.icon;

  // Use stats from backend (no calculations needed)
  const violations = platform.violations; // Single violations only
  const totalViolations = platform.totalViolations || 0;
  const activeCount = platform.activeViolations || 0;
  const blockedCount = platform.blockedCount || 0;
  const removedCount = platform.removedCount || 0;
  const underReviewCount = platform.underReviewCount || 0;
  const blockSuccessRate = platform.blockSuccessRate || 0;

  // Parse content type counts from platform stats or use defaults
  const liveCount = platform.liveCount || 0;
  const highlightsCount = platform.highlightsCount || 0;
  const othersCount = platform.othersCount || 0;

  // Build display items from singles (filteredViolations) and bulk items (bulkViolations from backend)
  const allDisplayItems: Array<{
    type: "bulk" | "individual";
    bulkViolation?: BulkViolation; // Backend bulk violation item
    violation?: Violation; // Individual violation
  }> = [];

  // Add individual violations (singles only - no bulkId)
  filteredViolations.forEach((violation) => {
    // Apply View Type Filter
    if (viewMetaFilter === "bulk") return; // Skip singles if only showing bulks

    allDisplayItems.push({
      type: "individual",
      violation: violation,
    });
  });

  // Add bulk violation items from backend
  bulkViolations.forEach((bulkViolation) => {
    // Apply View Type Filter
    if (viewMetaFilter === "individual") return; // Skip bulks if only showing singles

    allDisplayItems.push({
      type: "bulk",
      bulkViolation: bulkViolation,
    });
  });

  // Pagination for display items (treating bulk as one item)
  const totalViolationsPages = Math.ceil(
    allDisplayItems.length / violationsPerPage,
  );
  const startViolationsIndex = (violationsPage - 1) * violationsPerPage;
  const endViolationsIndex = startViolationsIndex + violationsPerPage;

  // These are the items to actually render
  const processedViolations = allDisplayItems.slice(
    startViolationsIndex,
    endViolationsIndex,
  );

  // Create array of pages to display for pagination
  const violationsPagesToShow: (number | string)[] = [];
  if (totalViolationsPages > 1) {
    for (let page = 1; page <= totalViolationsPages; page++) {
      if (
        page === 1 ||
        page === totalViolationsPages ||
        (page >= violationsPage - 1 && page <= violationsPage + 1)
      ) {
        violationsPagesToShow.push(page);
      } else if (page === violationsPage - 2 || page === violationsPage + 2) {
        violationsPagesToShow.push("...");
      }
    }
  }
  // Reverse for RTL
  const displayViolationsPages = isRTL
    ? [...violationsPagesToShow].reverse()
    : violationsPagesToShow;

  // Reset to page 1 when filter or search changes
  useEffect(() => {
    setViolationsPage(1);
  }, [cardFilter, searchQuery, viewMetaFilter]);

  // Render the platform card content (used in both normal and maximized views)
  const renderCardContent = (isFullScreen?: boolean) => (
    <>
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Total views */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-chart-4/10 to-chart-4/5 border border-chart-4/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-4/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-chart-4/20 group-hover:bg-chart-4/30 transition-colors">
              <Eye className="h-2.5 w-2.5 text-chart-4" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.totalViews")}
            </p>
          </div>
          <p className="text-lg font-bold text-chart-4 transition-transform duration-300 group-hover:scale-110">
            {platform.totalViews}
          </p>
        </div>

        {/* Total violations */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-chart-1/10 to-chart-1/5 border border-chart-1/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-1/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-chart-1/20 group-hover:bg-chart-1/30 transition-colors">
              <AlertTriangle className="h-2.5 w-2.5 text-chart-1" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.totalViolations")}
            </p>
          </div>
          <p className="text-lg font-bold text-chart-1 transition-transform duration-300 group-hover:scale-110">
            {totalViolations}
          </p>
        </div>

        {/* Active */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-destructive/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-destructive/20 group-hover:bg-destructive/30 transition-colors">
              <AlertTriangle className="h-2.5 w-2.5 text-destructive dark:text-red-400" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.active")}
            </p>
          </div>
          <p className="text-lg font-bold text-destructive dark:text-red-400 transition-transform duration-300 group-hover:scale-110">
            {activeCount}
          </p>
        </div>

        {/* Blocked */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-success/20 group-hover:bg-success/30 transition-colors">
              <Shield className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.blocked")}
            </p>
          </div>
          <p className="text-lg font-bold text-success transition-transform duration-300 group-hover:scale-110">
            {blockedCount}
          </p>
        </div>

        {/* Avg block time */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-success/20 group-hover:bg-success/30 transition-colors">
              <Clock className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.avgBlockTime")}
            </p>
          </div>
          <p className="text-lg font-bold text-success transition-transform duration-300 group-hover:scale-110">
            {(() => {
              // Parse avgBlockTime string (could be "10 min", "10h", "1d", etc.) to minutes
              const avgBlockTimeStr = platform.avgBlockTime || "0 min";
              let minutes = 0;
              if (avgBlockTimeStr.includes("d")) {
                const days =
                  parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
                minutes = days * 1440;
              } else if (avgBlockTimeStr.includes("h")) {
                const hours =
                  parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
                minutes = hours * 60;
              } else {
                minutes =
                  parseFloat(avgBlockTimeStr.replace(/[^0-9.]/g, "")) || 0;
              }
              const hours = minutes / 60;
              return (
                <>
                  {minutes % 1 === 0 ? minutes : minutes.toFixed(1)}
                  <span className="text-xs text-muted-foreground ml-1">
                    {t("matchDashboard.platformCard.min")}{" "}
                    <span className="text-xs text-muted-foreground">
                      ({hours < 1 ? hours.toFixed(2) : hours.toFixed(1)}
                      {t("matchDashboard.platformCard.hrs")})
                    </span>
                  </span>
                </>
              );
            })()}
          </p>
        </div>

        {/* Removed */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
              <XCircle className="h-2.5 w-2.5 text-cyan-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.removed")}
            </p>
          </div>
          <p className="text-lg font-bold text-cyan-500 transition-transform duration-300 group-hover:scale-110">
            {removedCount}
          </p>
        </div>

        {/* Block success rate */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <TrendingUp className="h-2.5 w-2.5 text-green-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.blockSuccessRate")}
            </p>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400 transition-transform duration-300 group-hover:scale-110">
            {totalViolations > 0
              ? Math.round((blockedCount / totalViolations) * 100)
              : 0}
            %
          </p>
          <p className="text-[9px] text-muted-foreground/70 mt-1">
            {blockedCount} of {totalViolations}
          </p>
        </div>

        {/* Under review */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
              <FileQuestion className="h-2.5 w-2.5 text-yellow-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              {t("matchDashboard.platformCard.underReview")}
            </p>
          </div>
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 transition-transform duration-300 group-hover:scale-110">
            {underReviewCount}
          </p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex gap-1">
          <Badge
            variant={cardFilter === "all" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("all")}>
            {t("matchDashboard.expandedPlatformDialog.filters.all")}
          </Badge>
          <Badge
            variant={cardFilter === "active" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("active")}>
            {t("matchDashboard.expandedPlatformDialog.filters.active")}
          </Badge>
          <Badge
            variant={cardFilter === "blocked" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("blocked")}>
            {t("matchDashboard.expandedPlatformDialog.filters.blocked")}
          </Badge>
          <Badge
            variant={cardFilter === "removed" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("removed")}>
            {t("matchDashboard.expandedPlatformDialog.filters.removed")}
          </Badge>
          <Badge
            variant={cardFilter === "review" ? "default" : "outline"}
            className="cursor-pointer text-xs"
            onClick={() => onFilterChange("review")}>
            {t("matchDashboard.expandedPlatformDialog.filters.review")}
          </Badge>
        </div>

        {/* View Type Filter */}
        <div className="flex gap-1 pt-2 border-t mt-1">
          <Badge
            variant={viewMetaFilter === "all" ? "secondary" : "outline"}
            className="cursor-pointer text-[10px]"
            onClick={() => setViewMetaFilter("all")}>
            {isRTL ? "الكل" : "All Items"}
          </Badge>
          <Badge
            variant={viewMetaFilter === "bulk" ? "secondary" : "outline"}
            className="cursor-pointer text-[10px]"
            onClick={() => setViewMetaFilter("bulk")}>
            {isRTL ? "مجمعة فقط" : "Bulks Only"}
          </Badge>
          <Badge
            variant={viewMetaFilter === "individual" ? "secondary" : "outline"}
            className="cursor-pointer text-[10px]"
            onClick={() => setViewMetaFilter("individual")}>
            {isRTL ? "فردية فقط" : "Singles Only"}
          </Badge>
        </div>

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder={t(
              "matchDashboard.expandedPlatformDialog.searchPlaceholder",
            )}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {isFullScreen ? (
        <div className="flex flex-col">
          {filteredViolations.length === 0 && bulkViolations.length === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-12">
              <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm text-muted-foreground mb-4">
                {t("matchDashboard.violationItem.noViolationsFound")}
              </p>
              {canModifyViolations && (
                <Button size="sm" variant="outline" onClick={onAddViolation}>
                  <Plus className="h-3 w-3 mr-1.5" />
                  {t("matchDashboard.platformCard.addViolation")}
                </Button>
              )}
            </div>
          ) : (
            <>
              <div className="space-y-2 flex-1" dir={isRTL ? "ltr" : ""}>
                {processedViolations.map((item, index) => {
                  if (item.type === "bulk" && item.bulkViolation) {
                    return (
                      <BulkViolationItem
                        key={`bulk-${item.bulkViolation.bulkId}`}
                        bulkViolation={item.bulkViolation}
                        platformId={platform.id}
                        platform={platform}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                        onAddNote={onAddNote}
                        getPlatformIcon={getPlatformIcon}
                        canModifyViolations={canModifyViolations}
                        onRefetch={onRefetch}
                        onBulkDelete={onBulkDelete}
                        onBulkStatusChange={onBulkStatusChange}
                      />
                    );
                  } else if (item.type === "individual" && item.violation) {
                    return (
                      <ViolationItem
                        key={item.violation.id}
                        violation={item.violation}
                        platform={platform}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                        onAddNote={onAddNote}
                        getPlatformIcon={getPlatformIcon}
                        canModifyViolations={canModifyViolations}
                      />
                    );
                  }
                  return null;
                })}
              </div>
              {/* Pagination Controls */}
              {(filteredViolations.length > 0 || bulkViolations.length > 0) &&
                totalViolationsPages > 1 && (
                  <div className="flex-shrink-0 pt-4 mt-4 border-t border-border/40">
                    <Pagination>
                      <PaginationContent
                        className={`flex-wrap justify-center gap-1 ${
                          isRTL ? "flex-row-reverse" : ""
                        }`}>
                        {isRTL ? (
                          <>
                            {/* RTL: Next on left, Previous on right */}
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (violationsPage < totalViolationsPages) {
                                    setViolationsPage(violationsPage + 1);
                                  }
                                }}
                                disabled={
                                  violationsPage === totalViolationsPages
                                }
                                className="gap-1 pr-2.5 h-9 text-xs">
                                <span>{t("dashboard.pagination.next")}</span>
                                <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                              </Button>
                            </PaginationItem>

                            {displayViolationsPages.map((item, index) => {
                              if (item === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-${index}`}>
                                    <span className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  </PaginationItem>
                                );
                              }
                              const page = item as number;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setViolationsPage(page);
                                    }}
                                    isActive={violationsPage === page}
                                    className="cursor-pointer min-w-[32px] h-8 text-xs">
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}

                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (violationsPage > 1) {
                                    setViolationsPage(violationsPage - 1);
                                  }
                                }}
                                disabled={violationsPage === 1}
                                className="gap-1 pl-2.5 h-9 text-xs">
                                <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                                <span>
                                  {t("dashboard.pagination.previous")}
                                </span>
                              </Button>
                            </PaginationItem>
                          </>
                        ) : (
                          <>
                            {/* LTR: Previous on left, Next on right */}
                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (violationsPage > 1) {
                                    setViolationsPage(violationsPage - 1);
                                  }
                                }}
                                disabled={violationsPage === 1}
                                className="gap-1 pl-2.5 h-9 text-xs">
                                <ChevronLeft className="h-4 w-4" />
                                <span>
                                  {t("dashboard.pagination.previous")}
                                </span>
                              </Button>
                            </PaginationItem>

                            {displayViolationsPages.map((item, index) => {
                              if (item === "...") {
                                return (
                                  <PaginationItem key={`ellipsis-${index}`}>
                                    <span className="px-2 text-muted-foreground">
                                      ...
                                    </span>
                                  </PaginationItem>
                                );
                              }
                              const page = item as number;
                              return (
                                <PaginationItem key={page}>
                                  <PaginationLink
                                    href="#"
                                    onClick={(e) => {
                                      e.preventDefault();
                                      setViolationsPage(page);
                                    }}
                                    isActive={violationsPage === page}
                                    className="cursor-pointer min-w-[32px] h-8 text-xs">
                                    {page}
                                  </PaginationLink>
                                </PaginationItem>
                              );
                            })}

                            <PaginationItem>
                              <Button
                                variant="ghost"
                                size="default"
                                onClick={() => {
                                  if (violationsPage < totalViolationsPages) {
                                    setViolationsPage(violationsPage + 1);
                                  }
                                }}
                                disabled={
                                  violationsPage === totalViolationsPages
                                }
                                className="gap-1 pr-2.5 h-9 text-xs">
                                <span>{t("dashboard.pagination.next")}</span>
                                <ChevronRight className="h-4 w-4" />
                              </Button>
                            </PaginationItem>
                          </>
                        )}
                      </PaginationContent>
                    </Pagination>
                  </div>
                )}
            </>
          )}
        </div>
      ) : (
        <div className="flex flex-col">
          <ScrollArea className="h-[280px] flex-1">
            {filteredViolations.length === 0 && bulkViolations.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground mb-4">
                  {t("matchDashboard.violationItem.noViolationsFound")}
                </p>
                {canModifyViolations && (
                  <Button size="sm" variant="outline" onClick={onAddViolation}>
                    <Plus className="h-3 w-3 mr-1.5" />
                    {t("matchDashboard.platformCard.addViolation")}
                  </Button>
                )}
              </div>
            ) : (
              <div className="space-y-2">
                {processedViolations.map((item, index) => {
                  if (item.type === "bulk" && item.bulkViolation) {
                    return (
                      <BulkViolationItem
                        key={`bulk-${item.bulkViolation.bulkId}`}
                        bulkViolation={item.bulkViolation}
                        platformId={platform.id}
                        platform={platform}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                        onAddNote={onAddNote}
                        getPlatformIcon={getPlatformIcon}
                        canModifyViolations={canModifyViolations}
                        onRefetch={onRefetch}
                        onBulkDelete={onBulkDelete}
                        onBulkStatusChange={onBulkStatusChange}
                      />
                    );
                  } else if (item.type === "individual" && item.violation) {
                    return (
                      <ViolationItem
                        key={item.violation.id}
                        violation={item.violation}
                        platform={platform}
                        onEdit={onEdit}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        onCopyUrl={onCopyUrl}
                        onAddNote={onAddNote}
                        getPlatformIcon={getPlatformIcon}
                        canModifyViolations={canModifyViolations}
                      />
                    );
                  }
                  return null;
                })}
              </div>
            )}
          </ScrollArea>
          {/* Pagination Controls */}
          {(filteredViolations.length > 0 || bulkViolations.length > 0) &&
            totalViolationsPages > 1 && (
              <div className="flex-shrink-0 pt-2 mt-2 border-t border-border/40">
                <Pagination>
                  <PaginationContent
                    className={`flex-wrap justify-center gap-1 ${
                      isRTL ? "flex-row-reverse" : ""
                    }`}>
                    {isRTL ? (
                      <>
                        {/* RTL: Next on left, Previous on right */}
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="default"
                            onClick={() => {
                              if (violationsPage < totalViolationsPages) {
                                setViolationsPage(violationsPage + 1);
                              }
                            }}
                            disabled={violationsPage === totalViolationsPages}
                            className="gap-1 pr-2.5 h-9 text-xs">
                            <span>{t("dashboard.pagination.next")}</span>
                            <ChevronRight className="h-4 w-4 scale-x-[-1]" />
                          </Button>
                        </PaginationItem>

                        {displayViolationsPages.map((item, index) => {
                          if (item === "...") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <span className="px-2 text-muted-foreground">
                                  ...
                                </span>
                              </PaginationItem>
                            );
                          }
                          const page = item as number;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setViolationsPage(page);
                                }}
                                isActive={violationsPage === page}
                                className="cursor-pointer min-w-[32px] h-8 text-xs">
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="default"
                            onClick={() => {
                              if (violationsPage > 1) {
                                setViolationsPage(violationsPage - 1);
                              }
                            }}
                            disabled={violationsPage === 1}
                            className="gap-1 pl-2.5 h-9 text-xs">
                            <ChevronLeft className="h-4 w-4 scale-x-[-1]" />
                            <span>{t("dashboard.pagination.previous")}</span>
                          </Button>
                        </PaginationItem>
                      </>
                    ) : (
                      <>
                        {/* LTR: Previous on left, Next on right */}
                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="default"
                            onClick={() => {
                              if (violationsPage > 1) {
                                setViolationsPage(violationsPage - 1);
                              }
                            }}
                            disabled={violationsPage === 1}
                            className="gap-1 pl-2.5 h-9 text-xs">
                            <ChevronLeft className="h-4 w-4" />
                            <span>{t("dashboard.pagination.previous")}</span>
                          </Button>
                        </PaginationItem>

                        {displayViolationsPages.map((item, index) => {
                          if (item === "...") {
                            return (
                              <PaginationItem key={`ellipsis-${index}`}>
                                <span className="px-2 text-muted-foreground">
                                  ...
                                </span>
                              </PaginationItem>
                            );
                          }
                          const page = item as number;
                          return (
                            <PaginationItem key={page}>
                              <PaginationLink
                                href="#"
                                onClick={(e) => {
                                  e.preventDefault();
                                  setViolationsPage(page);
                                }}
                                isActive={violationsPage === page}
                                className="cursor-pointer min-w-[32px] h-8 text-xs">
                                {page}
                              </PaginationLink>
                            </PaginationItem>
                          );
                        })}

                        <PaginationItem>
                          <Button
                            variant="ghost"
                            size="default"
                            onClick={() => {
                              if (violationsPage < totalViolationsPages) {
                                setViolationsPage(violationsPage + 1);
                              }
                            }}
                            disabled={violationsPage === totalViolationsPages}
                            className="gap-1 pr-2.5 h-9 text-xs">
                            <span>{t("dashboard.pagination.next")}</span>
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </PaginationItem>
                      </>
                    )}
                  </PaginationContent>
                </Pagination>
              </div>
            )}
        </div>
      )}
    </>
  );

  return (
    <>
      <Card id={`platform-card-${platform.id}`} className="p-5 transition-all">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1.5">
              {platform.iconUrl ? (
                <img
                  src={
                    platform.iconUrl.startsWith("http")
                      ? platform.iconUrl
                      : `${BASE_URL}${platform.iconUrl}`
                  }
                  alt={platform.name}
                  className="h-5 w-5 object-contain"
                />
              ) : (
                <IconComponent
                  className="h-5 w-5"
                  style={{ color: platform.color }}
                />
              )}
              <h3 className="font-semibold">{platform.name}</h3>
            </div>
            <p className="text-xs text-muted-foreground ml-7">
              {t("matchDashboard.platformCard.live")} {liveCount} •{" "}
              {t("matchDashboard.platformCard.highlights")} {highlightsCount} •{" "}
              {t("matchDashboard.platformCard.others")} {othersCount}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsMaximized(true)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
              title="Maximize">
              <Maximize2 className="h-4 w-4" />
            </button>
            {canModifyViolations && (
              <Button size="sm" className="text-xs" onClick={onAddViolation}>
                <Plus className="h-3 w-3 mr-1.5" />
                {t("matchDashboard.platformCard.addViolation")}
              </Button>
            )}
          </div>
        </div>

        {renderCardContent()}
      </Card>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 translate-x-[-50%] translate-y-[-50%] left-[50%] top-[50%] [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {platform.iconUrl ? (
                  <img
                    src={
                      platform.iconUrl.startsWith("http")
                        ? platform.iconUrl
                        : `${BASE_URL}${platform.iconUrl}`
                    }
                    alt={platform.name}
                    className="h-5 w-5 object-contain"
                  />
                ) : (
                  <IconComponent
                    className="h-5 w-5"
                    style={{ color: platform.color }}
                  />
                )}
                <DialogTitle>{platform.name}</DialogTitle>
              </div>
              <div className="flex items-center gap-2">
                {canModifyViolations && (
                  <Button
                    size="sm"
                    className="text-xs"
                    onClick={onAddViolation}>
                    <Plus className="h-3 w-3 mr-1.5" />
                    {t("matchDashboard.platformCard.addViolation")}
                  </Button>
                )}
                <button
                  onClick={() => setIsMaximized(false)}
                  className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                  title="Minimize">
                  <Minimize2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-y-auto px-6 pb-6 pt-4">
            {renderCardContent(true)}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
