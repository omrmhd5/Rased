import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Layers, Eye, ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Violation, PlatformData } from "./types";
import { ViolationItem } from "./ViolationItem";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { useState } from "react";
interface BulkViolationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkId: string;
  violations: Violation[];
  platform: PlatformData;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  canModifyViolations: boolean;
}

export function BulkViolationDetailsModal({
  open,
  onOpenChange,
  bulkId,
  violations,
  platform,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
  canModifyViolations,
}: BulkViolationDetailsModalProps) {
  const { t, isRTL } = useLanguage();
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const itemsPerPage = 10;

  if (violations.length === 0) return null;

  // Calculate aggregate stats
  const activeCount = violations.filter((v) => v.status === "Active").length;
  const blockedCount = violations.filter((v) => v.status === "Blocked").length;
  const removedCount = violations.filter((v) => v.status === "Removed").length;
  const underReviewCount = violations.filter(
    (v) => v.status === "Under Review"
  ).length;

  // Calculate total views
  const totalViews = violations.reduce((sum, v) => {
    if (!v.views || v.views === "0") return sum;
    const viewsStr = v.views.replace(/[^0-9,]/g, "").replace(/,/g, "");
    return sum + (parseFloat(viewsStr) || 0);
  }, 0);
  const formattedTotalViews = totalViews.toLocaleString("en-US");

  // Calculate content type counts
  const liveCount = violations.filter((v) => v.contentType === "Live").length;
  const highlightsCount = violations.filter(
    (v) => v.contentType === "Highlights"
  ).length;
  const otherCount = violations.filter((v) => v.contentType === "Other").length;

  // Filter violations based on search and filter
  const filteredViolations = violations.filter((violation) => {
    // Filter by status
    const statusMatch =
      filter === "all" ||
      (filter === "active" && violation.status === "Active") ||
      (filter === "blocked" && violation.status === "Blocked") ||
      (filter === "removed" && violation.status === "Removed") ||
      (filter === "review" && violation.status === "Under Review");

    // Filter by search query
    const searchLower = searchQuery.toLowerCase();
    const searchMatch =
      !searchQuery ||
      violation.violationUrl?.toLowerCase().includes(searchLower) ||
      violation.accountChannel?.toLowerCase().includes(searchLower) ||
      violation.views?.toLowerCase().includes(searchLower);

    return statusMatch && searchMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filteredViolations.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedViolations = filteredViolations.slice(startIndex, endIndex);

  // Reset to page 1 when modal opens, search changes, or filter changes
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentPage(1);
      setSearchQuery("");
      setFilter("all");
    }
    onOpenChange(newOpen);
  };

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
    setCurrentPage(1);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
          {/* Header - Always LTR */}
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1">
              <DialogTitle className="text-xl text-left">
                {violations.length} {t("matchDashboard.bulk.violations")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-left">
                {platform.name} • {violations[0]?.accountChannel || "N/A"}
              </DialogDescription>
            </div>
          </div>

          {/* Stats Row 1: Status Badges */}
          <div className="flex items-center gap-2 flex-wrap mt-4">
            {activeCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
                {activeCount} {t("dashboard.active")}
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                {blockedCount} {t("dashboard.blocked")}
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                {removedCount} {t("dashboard.removed")}
              </Badge>
            )}
            {underReviewCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                {underReviewCount} {t("dashboard.underReview")}
              </Badge>
            )}
          </div>

          {/* Stats Row 2: Views and Content Types */}
          <div className="flex items-center gap-4 flex-wrap mt-3 text-sm text-muted-foreground">
            {/* Total Views */}
            <div className="flex items-center gap-1.5">
              <Eye className="h-4 w-4" />
              <span className="font-medium">{formattedTotalViews}</span>
              <span>{t("dashboard.views")}</span>
            </div>

            {/* Content Types */}
            <div className="flex items-center gap-3">
              {liveCount > 0 && (
                <span>
                  {t("matchDashboard.platformCard.live")}{" "}
                  <span className="font-medium">{liveCount}</span>
                </span>
              )}
              {highlightsCount > 0 && (
                <span>
                  {t("matchDashboard.platformCard.highlights")}{" "}
                  <span className="font-medium">{highlightsCount}</span>
                </span>
              )}
              {otherCount > 0 && (
                <span>
                  {t("matchDashboard.platformCard.others")}{" "}
                  <span className="font-medium">{otherCount}</span>
                </span>
              )}
            </div>

            {/* Bulk ID */}
            <Badge variant="outline" className="font-mono text-xs ml-auto">
              ID: {bulkId.split("_")[1]}
            </Badge>
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-3 border-b space-y-3 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t(
                "matchDashboard.expandedPlatformDialog.searchPlaceholder"
              )}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="h-8 pl-8 text-xs"
            />
          </div>

          {/* Filter Badges */}
          <div className="flex gap-1">
            <Badge
              variant={filter === "all" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleFilterChange("all")}>
              {t("matchDashboard.expandedPlatformDialog.filters.all")}
            </Badge>
            <Badge
              variant={filter === "active" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleFilterChange("active")}>
              {t("matchDashboard.expandedPlatformDialog.filters.active")}
            </Badge>
            <Badge
              variant={filter === "blocked" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleFilterChange("blocked")}>
              {t("matchDashboard.expandedPlatformDialog.filters.blocked")}
            </Badge>
            <Badge
              variant={filter === "removed" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleFilterChange("removed")}>
              {t("matchDashboard.expandedPlatformDialog.filters.removed")}
            </Badge>
            <Badge
              variant={filter === "review" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => handleFilterChange("review")}>
              {t("matchDashboard.expandedPlatformDialog.filters.review")}
            </Badge>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <ScrollArea className="h-full">
            <div className="px-6 pb-6 pt-4">
              <div className="space-y-3">
                {paginatedViolations.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    {t("matchDashboard.violationItem.noViolationsFound")}
                  </div>
                ) : (
                  paginatedViolations.map((violation, index) => {
                    const globalIndex = startIndex + index + 1;
                    return (
                      <div key={violation.id} className="relative">
                        {/* Violation Item */}
                        <div className={isRTL ? "pr-10" : "pl-10"}>
                          <ViolationItem
                            violation={violation}
                            platform={platform}
                            onEdit={onEdit}
                            onToggleStatus={onToggleStatus}
                            onDelete={onDelete}
                            onCopyUrl={onCopyUrl}
                            onAddNote={onAddNote}
                            getPlatformIcon={getPlatformIcon}
                            canModifyViolations={canModifyViolations}
                          />
                        </div>

                        {/* Violation Number Badge - Much More Visible */}
                        <div
                          className={
                            isRTL
                              ? "absolute -right-3 top-1/2 -translate-y-1/2 z-10"
                              : "absolute -left-3 top-1/2 -translate-y-1/2 z-10"
                          }>
                          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-gradient-to-br from-primary to-primary/80 text-primary-foreground text-base font-black shadow-xl border-4 border-background ring-2 ring-primary/20">
                            {globalIndex}
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </ScrollArea>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 pb-4 pt-2 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {startIndex + 1}-
              {Math.min(endIndex, filteredViolations.length)} of{" "}
              {filteredViolations.length}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}>
                <ChevronLeft className="h-4 w-4 mr-1" />
                Previous
              </Button>
              <div className="flex items-center gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(
                  (page) => {
                    // Show first, last, current, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <Button
                          key={page}
                          variant={page === currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => setCurrentPage(page)}
                          className="min-w-[36px]">
                          {page}
                        </Button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return (
                        <span key={page} className="px-1">
                          ...
                        </span>
                      );
                    }
                    return null;
                  }
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages}>
                Next
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
