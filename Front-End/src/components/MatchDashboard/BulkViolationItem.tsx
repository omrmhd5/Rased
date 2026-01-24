import { Violation, PlatformData, BulkViolation, API_URL } from "./types";
import { convertKSATimeToUTC } from "./utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Layers, Edit, Trash2 } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { BulkViolationDetailsModal } from "./BulkViolationDetailsModal";
import { BulkDeleteConfirmDialog } from "./BulkDeleteConfirmDialog";
import { BulkStatusChangeDialog } from "./BulkStatusChangeDialog";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { toast } from "@/hooks/use-toast";

interface BulkViolationItemProps {
  bulkViolation: BulkViolation; // Backend bulk violation object with pre-computed stats
  platformId: string;
  platform: PlatformData;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  canModifyViolations: boolean;
  onRefetch?: () => void; // Callback to refetch data after bulk operations
  onBulkDelete?: (platformId: string, violations: Violation[]) => void;
  onBulkStatusChange?: (
    platformId: string,
    violations: Violation[],
    status: "Active" | "Blocked" | "Removed" | "Under Review",
    blockedAt?: string,
  ) => void;
}

export function BulkViolationItem({
  bulkViolation,
  platformId,
  platform,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
  canModifyViolations,
  onRefetch,
  onBulkDelete,
  onBulkStatusChange,
}: BulkViolationItemProps) {
  const { t, isRTL } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    "Active" | "Blocked" | "Removed" | "Under Review"
  >("Active");
  const [blockedAt, setBlockedAt] = useState("");

  // Use backend-calculated stats from BulkViolation model
  const count = bulkViolation.totalCount;
  const activeCount = bulkViolation.activeCount;
  const blockedCount = bulkViolation.blockedCount;
  const removedCount = bulkViolation.removedCount;
  const underReviewCount = bulkViolation.underReviewCount;

  // For now, set views to 0 (can be added to BulkViolation model later)
  const formattedTotalViews = "0";

  // Format time created and time ago
  const formatTimeWithPeriod = (timeString: string): string => {
    if (!timeString) return "";
    try {
      const utcDate = new Date(timeString);
      if (isNaN(utcDate.getTime())) return "";

      // Shift to KSA (UTC+3)
      const ksaDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);

      const hours = ksaDate.getUTCHours();
      const minutes = ksaDate.getUTCMinutes().toString().padStart(2, "0");
      const isAM = hours < 12;
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      if (isRTL) {
        const timePeriod = isAM ? "صباحا" : "مساءا";
        return `${hour12}:${minutes} ${timePeriod}`;
      } else {
        const timePeriod = isAM ? "AM" : "PM";
        return `${hour12}:${minutes} ${timePeriod}`;
      }
    } catch {
      return "";
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const utcDate = new Date(dateString);
      if (isNaN(utcDate.getTime())) return "";

      // Shift to KSA (UTC+3)
      const ksaDate = new Date(utcDate.getTime() + 3 * 60 * 60 * 1000);

      return ksaDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      });
    } catch {
      return "";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      const agoText = t("matchDashboard.violationItem.timeUnits.ago");
      const mText = t("matchDashboard.violationItem.timeUnits.m");
      const hText = t("matchDashboard.violationItem.timeUnits.h");
      const dText = t("matchDashboard.violationItem.timeUnits.d");

      if (diffMins < 1) {
        return t("matchDashboard.violationItem.justNow");
      } else if (diffMins < 60) {
        return isRTL
          ? `${agoText} ${diffMins}${mText}`
          : `${diffMins}${mText} ${agoText}`;
      } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        return isRTL
          ? `${agoText} ${hours}${hText}`
          : `${hours}${hText} ${agoText}`;
      } else {
        const days = Math.floor(diffMins / 1440);
        return isRTL
          ? `${agoText} ${days}${dText}`
          : `${days}${dText} ${agoText}`;
      }
    } catch {
      return "";
    }
  };

  const timeCreated = formatTimeWithPeriod(bulkViolation.timeAdded);
  const dateCreated = formatDate(bulkViolation.timeAdded);
  const timeAgo = formatTimeAgo(bulkViolation.timeAdded);

  // Handle bulk delete
  const handleBulkDelete = () => {
    // For bulk delete, we need to fetch the actual violations or use bulkId
    // For now, trigger refetch after deletion
    if (onRefetch) {
      onRefetch();
    }
    setDeleteDialogOpen(false);
  };

  // Handle bulk status change
  const handleBulkStatusChange = () => {
    // For bulk status change, we need to fetch the actual violations or use bulkId
    // For now, trigger refetch after status change
    if (onRefetch) {
      onRefetch();
    }
    setStatusDialogOpen(false);
  };

  // Open status dialog
  const openStatusDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setStatusDialogOpen(true);
  };

  // Open delete dialog
  const openDeleteDialog = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDeleteDialogOpen(true);
  };

  return (
    <>
      <div className="group border rounded-lg overflow-hidden bg-card hover:bg-accent/50 transition-colors">
        {/* Bulk Header */}
        <div
          className={cn(
            "p-3 flex items-center gap-3 cursor-pointer",
            isRTL && "flex-row-reverse",
          )}
          onClick={() => setIsModalOpen(true)}>
          <div
            className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-center gap-2 shrink-0`}>
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Badge
              variant="secondary"
              className="font-mono text-xs flex flex-row-reverse">
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.bulk.violations")}
              </div>
            </Badge>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 flex-wrap flex-1",
              isRTL && "flex-row-reverse",
            )}>
            {activeCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                <div dir={isRTL ? "rtl" : "ltr"}>
                  {activeCount} {t("dashboard.active")}
                </div>
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                <div dir={isRTL ? "rtl" : "ltr"}>
                  {blockedCount} {t("dashboard.blocked")}
                </div>
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">
                <div dir={isRTL ? "rtl" : "ltr"}>
                  {removedCount} {t("dashboard.removed")}
                </div>
              </Badge>
            )}
            {underReviewCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                <div dir={isRTL ? "rtl" : "ltr"}>
                  {underReviewCount} {t("dashboard.underReview")}
                </div>
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          {canModifyViolations && (
            <div
              className={`${
                isRTL ? "flex-row-reverse" : ""
              } flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0`}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                    onClick={openStatusDialog}>
                    <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("matchDashboard.bulk.changeStatus") || "Change Status"}
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0 text-destructive hover:text-destructive"
                    onClick={openDeleteDialog}>
                    <Trash2 className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("matchDashboard.bulk.deleteAll") || "Delete All"}
                </TooltipContent>
              </Tooltip>
            </div>
          )}

          <div
            className={cn(
              "text-xs text-muted-foreground shrink-0",
              isRTL && "text-right",
            )}>
            {bulkViolation.accountChannel}
          </div>
        </div>

        {/* Time and Views Info */}
        <div
          className={cn(
            "px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap",
            isRTL && "flex-row-reverse",
          )}>
          <span dir={isRTL ? "rtl" : "ltr"}>{timeCreated}</span>
          <span>•</span>
          <span>{dateCreated}</span>
          <span>•</span>
          <span>{timeAgo}</span>
        </div>
      </div>

      {/* Bulk Violations Details Modal */}
      <BulkViolationDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bulkId={bulkViolation.bulkId}
        violations={[]}
        platform={platform}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onCopyUrl={onCopyUrl}
        onAddNote={onAddNote}
        getPlatformIcon={getPlatformIcon}
        canModifyViolations={canModifyViolations}
        onOpenBulkStatusDialog={openStatusDialog}
        onOpenBulkDeleteDialog={openDeleteDialog}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        violationCount={bulkViolation.totalCount}
        onConfirm={handleBulkDelete}
      />

      {/* Bulk Status Change Dialog */}
      <BulkStatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        violationCount={bulkViolation.totalCount}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        blockedAt={blockedAt}
        onBlockedAtChange={setBlockedAt}
        onConfirm={handleBulkStatusChange}
      />
    </>
  );
}
