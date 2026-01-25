import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Layers,
  Eye,
  ChevronLeft,
  ChevronRight,
  Search,
  Edit,
  Trash2,
  Loader2,
  RotateCw,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Violation, PlatformData, BulkViolation } from "./types";
import { ViolationItem } from "./ViolationItem";
import { convertBackendViolationToFrontend } from "./utils";
import { useLanguage } from "@/contexts/LanguageContext";
import { API_URL } from "./types";
import { cn } from "@/lib/utils";
import { useState, useEffect, useCallback, useRef } from "react";
interface BulkViolationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  bulkId: string;
  bulkViolation: BulkViolation; // Pre-computed stats from backend
  violations: Violation[]; // Now unused - will fetch from backend
  platform: PlatformData;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (
    platformId: string,
    violationId: number | string,
    violation?: Violation,
  ) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  canModifyViolations: boolean;
  onOpenBulkStatusDialog: (e: React.MouseEvent) => void;
  onOpenBulkDeleteDialog: (e: React.MouseEvent) => void;
  onRefetch?: () => void; // Callback to refetch parent data after modifications
}

export function BulkViolationDetailsModal({
  open,
  onOpenChange,
  bulkId,
  bulkViolation,
  violations: _violations, // Not used anymore
  platform,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
  canModifyViolations,
  onOpenBulkStatusDialog,
  onOpenBulkDeleteDialog,
  onRefetch,
}: BulkViolationDetailsModalProps) {
  const { t, isRTL } = useLanguage();

  // Backend pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [violations, setViolations] = useState<Violation[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const itemsPerPage = 10;

  // Fetch violations from backend when page or filters change
  useEffect(() => {
    if (!open || !bulkId) return;

    const fetchViolations = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const params = new URLSearchParams({
          page: currentPage.toString(),
          limit: itemsPerPage.toString(),
        });

        const response = await fetch(
          `${API_URL}/violations/bulk/${bulkId}/violations?${params}`,
          {
            credentials: "include",
          },
        );

        if (!response.ok) {
          throw new Error("Failed to fetch bulk violations");
        }

        const data = await response.json();

        // Transform backend data using the conversion function
        const transformedViolations = data.violations.map((v: any) =>
          convertBackendViolationToFrontend(v),
        );

        setViolations(transformedViolations);
        setTotalCount(data.pagination.totalCount);
        setTotalPages(data.pagination.totalPages);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An error occurred");
        setViolations([]);
      } finally {
        setIsLoading(false);
      }
    };

    fetchViolations();
  }, [open, bulkId, currentPage]);

  // Refetch violations when bulkViolation stats change (meaning parent refetched)
  const prevBulkViolationRef = useRef(bulkViolation);
  useEffect(() => {
    const prev = prevBulkViolationRef.current;
    const curr = bulkViolation;

    // Check if any stats changed (meaning parent refetched)
    if (
      open &&
      prev &&
      (prev.activeCount !== curr.activeCount ||
        prev.blockedCount !== curr.blockedCount ||
        prev.removedCount !== curr.removedCount ||
        prev.underReviewCount !== curr.underReviewCount ||
        prev.totalCount !== curr.totalCount ||
        prev.totalViews !== curr.totalViews ||
        prev.liveCount !== curr.liveCount ||
        prev.highlightsCount !== curr.highlightsCount ||
        prev.othersCount !== curr.othersCount)
    ) {
      // Parent data changed, refetch modal's violations to stay in sync
      const refetch = async () => {
        if (!bulkId) return;

        try {
          const params = new URLSearchParams({
            page: currentPage.toString(),
            limit: itemsPerPage.toString(),
          });

          const response = await fetch(
            `${API_URL}/violations/bulk/${bulkId}/violations?${params}`,
            {
              credentials: "include",
            },
          );

          if (!response.ok) return;

          const data = await response.json();
          const transformedViolations = data.violations.map((v: any) =>
            convertBackendViolationToFrontend(v),
          );

          setViolations(transformedViolations);
          setTotalCount(data.pagination.totalCount);
          setTotalPages(data.pagination.totalPages);
        } catch (err) {
          // Silently fail - parent data is still updated
        }
      };

      refetch();
    }

    prevBulkViolationRef.current = curr;
  }, [open, bulkId, bulkViolation, currentPage]);

  // Reset to page 1 when modal opens
  const handleOpenChange = (newOpen: boolean) => {
    if (newOpen) {
      setCurrentPage(1);
      setSearchQuery("");
      setFilter("all");
    } else {
      setViolations([]);
      setError(null);
    }
    onOpenChange(newOpen);
  };

  // Wrapper functions - call parent callbacks and trigger delayed refetch
  // Delay ensures backend finishes updating violation + bulkViolation + platformByMatch
  const handleEdit = useCallback(
    (platformId: string, violation: Violation) => {
      onEdit(platformId, violation);
      // Wait for backend to update all documents (violation + bulk + platform)
      setTimeout(() => {
        onRefetch?.();
      }, 200);
    },
    [onEdit, onRefetch],
  );

  const handleToggleStatus = useCallback(
    (
      platformId: string,
      violationId: number | string,
      violation?: Violation,
    ) => {
      onToggleStatus(platformId, violationId, violation);
      // Wait for backend to update all documents (violation + bulk + platform)
      setTimeout(() => {
        onRefetch?.();
      }, 200);
    },
    [onToggleStatus, onRefetch],
  );

  const handleDelete = useCallback(
    (platformId: string, violationId: number | string) => {
      onDelete(platformId, violationId);
      // Wait for backend to update all documents (violation + bulk + platform)
      setTimeout(() => {
        onRefetch?.();
      }, 200);
    },
    [onDelete, onRefetch],
  );

  const handleAddNote = useCallback(
    (platformId: string, violation: Violation) => {
      onAddNote(platformId, violation);
      // Wait for backend to update all documents (violation + bulk + platform)
      setTimeout(() => {
        onRefetch?.();
      }, 200);
    },
    [onAddNote, onRefetch],
  );

  // Manual refetch function
  const handleManualRefetch = useCallback(async () => {
    if (!bulkId) return;

    try {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: itemsPerPage.toString(),
      });

      const response = await fetch(
        `${API_URL}/violations/bulk/${bulkId}/violations?${params}`,
        {
          credentials: "include",
        },
      );

      if (!response.ok) {
        throw new Error("Failed to fetch bulk violations");
      }

      const data = await response.json();

      // Transform backend data using the conversion function
      const transformedViolations = data.violations.map((v: any) =>
        convertBackendViolationToFrontend(v),
      );

      setViolations(transformedViolations);
      setTotalCount(data.pagination.totalCount);
      setTotalPages(data.pagination.totalPages);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  }, [bulkId, currentPage]);

  // Client-side filtering of fetched violations
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

  // Calculate stats from current page violations
  const activeCount = bulkViolation.activeCount;
  const blockedCount = bulkViolation.blockedCount;
  const removedCount = bulkViolation.removedCount;
  const underReviewCount = bulkViolation.underReviewCount;

  // Calculate total views from bulkViolation
  const totalViews = bulkViolation.totalViews;
  const formattedTotalViews = totalViews.toLocaleString("en-US");

  // Calculate content type counts from bulkViolation
  const liveCount = bulkViolation.liveCount;
  const highlightsCount = bulkViolation.highlightsCount;
  const otherCount = bulkViolation.othersCount;

  // Reset to page 1 when search or filter changes
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    // Note: Client-side search doesn't reset page since we have all data for this page
  };

  const handleFilterChange = (newFilter: string) => {
    setFilter(newFilter);
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
                {bulkViolation.totalCount} {t("matchDashboard.bulk.violations")}
              </DialogTitle>
              <DialogDescription className="mt-1 text-left">
                {platform.name} • {bulkViolation.accountChannel || "N/A"}
              </DialogDescription>
            </div>
          </div>

          {/* Bulk Actions - Top Right */}
          {canModifyViolations && (
            <div
              className={`flex items-center gap-1 absolute top-6 ${
                isRTL ? "left-6" : "right-6"
              }`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={handleManualRefetch}
                    disabled={isLoading}>
                    <RotateCw
                      className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                    />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("common.refresh") || "Refresh"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={onOpenBulkStatusDialog}>
                    <Edit className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("matchDashboard.bulk.changeStatus") || "Change Status"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-destructive hover:text-destructive"
                    onClick={onOpenBulkDeleteDialog}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("matchDashboard.bulk.deleteAll") || "Delete All"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

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
          </div>
        </DialogHeader>

        {/* Search and Filters */}
        <div className="px-6 py-3 border-b space-y-3 flex-shrink-0">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder={t(
                "matchDashboard.expandedPlatformDialog.searchPlaceholder",
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

        <div className="flex-1 overflow-y-auto min-h-0">
          <div className="px-6 pb-6 pt-4">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 text-primary animate-spin mr-2" />
                <span className="text-muted-foreground">
                  {t("common.loading") || "Loading..."}
                </span>
              </div>
            ) : error ? (
              <div className="text-center py-12 text-destructive">
                <p className="text-sm">{error}</p>
              </div>
            ) : filteredViolations.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                {t("matchDashboard.violationItem.noViolationsFound")}
              </div>
            ) : (
              <div className="space-y-3">
                {filteredViolations.map((violation, index) => {
                  const globalIndex =
                    (currentPage - 1) * itemsPerPage + index + 1;
                  return (
                    <div key={violation.id} className="relative">
                      {/* Violation Item */}
                      <div
                        className={isRTL ? "pr-10" : "pl-10"}
                        dir={isRTL ? "ltr" : ""}>
                        <ViolationItem
                          violation={violation}
                          platform={platform}
                          onEdit={handleEdit}
                          onToggleStatus={handleToggleStatus}
                          onDelete={handleDelete}
                          onCopyUrl={onCopyUrl}
                          onAddNote={handleAddNote}
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
                })}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 pb-4 pt-2 border-t flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              {t("pagination.showing", {
                start: (currentPage - 1) * itemsPerPage + 1,
                end: Math.min(currentPage * itemsPerPage, totalCount),
                total: totalCount,
              })}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1 || isLoading}
                className="gap-1">
                {isRTL ? (
                  <ChevronRight className="h-4 w-4" />
                ) : (
                  <ChevronLeft className="h-4 w-4" />
                )}
                {t("pagination.previous")}
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
                          disabled={isLoading}
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
                  },
                )}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setCurrentPage((p) => Math.min(totalPages, p + 1))
                }
                disabled={currentPage === totalPages || isLoading}
                className="gap-1">
                {t("pagination.next")}
                {isRTL ? (
                  <ChevronLeft className="h-4 w-4" />
                ) : (
                  <ChevronRight className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
