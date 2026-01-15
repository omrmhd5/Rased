import { Violation, PlatformData, API_URL } from "./types";
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

interface BulkViolationItemProps {
  bulkId: string;
  violations: Violation[];
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
}

export function BulkViolationItem({
  bulkId,
  violations,
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
}: BulkViolationItemProps) {
  const { t, isRTL } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [statusDialogOpen, setStatusDialogOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<
    "Active" | "Blocked" | "Removed" | "Under Review"
  >("Active");
  const [blockedAt, setBlockedAt] = useState("");

  if (violations.length === 0) return null;

  // Use the first violation as the representative for time
  const representative = violations[0];
  const count = violations.length;

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
        return `${timePeriod} ${hour12}:${minutes}`;
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

  const timeCreated = formatTimeWithPeriod(representative.timeAdded);
  const dateCreated = formatDate(representative.timeAdded);
  const timeAgo = formatTimeAgo(representative.timeAdded);

  // Handle bulk delete - call API directly
  const handleBulkDelete = async () => {
    try {
      // Delete each violation via API
      await Promise.all(
        violations.map(async (violation) => {
          // Ensure we use the string _id from MongoDB
          // Handle both string _id and MongoDB extended JSON format { $oid: "..." }
          let violationId: string;
          if (typeof violation._id === "string") {
            violationId = violation._id;
          } else if (
            violation._id &&
            typeof violation._id === "object" &&
            "$oid" in violation._id
          ) {
            violationId = (violation._id as { $oid: string }).$oid;
          } else {
            violationId = String(violation.id);
          }

          console.log(
            "Deleting violation with ID:",
            violationId,
            "Full violation:",
            violation
          );

          console.log(
            "Making DELETE request to:",
            `${API_URL}/violations/${violationId}`
          );

          const response = await fetch(`${API_URL}/violations/${violationId}`, {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
            },
            credentials: "include",
          });

          console.log(
            "DELETE Response status:",
            response.status,
            response.statusText
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Failed to delete violation ${violationId}:`,
              "Status:",
              response.status,
              "Error:",
              errorText
            );
            throw new Error(`Failed to delete violation ${violationId}`);
          }

          console.log(`Successfully deleted violation ${violationId}`);
        })
      );

      setDeleteDialogOpen(false);
      // Trigger data refetch instead of page reload
      if (onRefetch) {
        onRefetch();
      }
    } catch (error) {
      console.error("Error deleting violations:", error);
      alert("Failed to delete some violations. Please try again.");
    }
  };

  // Handle bulk status change - call API directly
  const handleBulkStatusChange = async () => {
    try {
      // Update each violation's status via API
      await Promise.all(
        violations.map(async (violation) => {
          // Ensure we use the string _id from MongoDB
          // Handle both string _id and MongoDB extended JSON format { $oid: "..." }
          let violationId: string;
          if (typeof violation._id === "string") {
            violationId = violation._id;
          } else if (
            violation._id &&
            typeof violation._id === "object" &&
            "$oid" in violation._id
          ) {
            violationId = (violation._id as { $oid: string }).$oid;
          } else {
            violationId = String(violation.id);
          }

          console.log(
            "Updating violation with ID:",
            violationId,
            "to status:",
            selectedStatus
          );

          console.log(
            "Making PATCH request to:",
            `${API_URL}/violations/${violationId}/status`
          );
          console.log(
            "Request body:",
            JSON.stringify({
              status: selectedStatus,
              ...(selectedStatus === "Blocked" && blockedAt
                ? { blockedAt: convertKSATimeToUTC(blockedAt) }
                : {}),
            })
          );

          const response = await fetch(
            `${API_URL}/violations/${violationId}/status`,
            {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              credentials: "include",
              body: JSON.stringify({
                status: selectedStatus,
                ...(selectedStatus === "Blocked" && blockedAt
                  ? { blockedAt: convertKSATimeToUTC(blockedAt) }
                  : {}),
              }),
            }
          );

          console.log(
            "PATCH Response status:",
            response.status,
            response.statusText
          );

          if (!response.ok) {
            const errorText = await response.text();
            console.error(
              `Failed to update violation ${violationId}:`,
              "Status:",
              response.status,
              "Error:",
              errorText
            );
            throw new Error(`Failed to update violation ${violationId}`);
          }

          console.log(`Successfully updated violation ${violationId}`);
        })
      );

      setStatusDialogOpen(false);
      // Trigger data refetch instead of page reload
      if (onRefetch) {
        onRefetch();
      }
    } catch (error) {
      console.error("Error updating violations:", error);
      alert("Failed to update some violations. Please try again.");
    }
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
            isRTL && "flex-row-reverse"
          )}
          onClick={() => setIsModalOpen(true)}>
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Badge
              variant="secondary"
              className="font-mono text-xs flex flex-row-reverse">
              {count} {t("matchDashboard.bulk.violations")}
            </Badge>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 flex-wrap flex-1",
              isRTL && "flex-row-reverse"
            )}>
            {activeCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                {activeCount} {t("dashboard.active")}
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                {blockedCount} {t("dashboard.blocked")}
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">
                {removedCount} {t("dashboard.removed")}
              </Badge>
            )}
            {underReviewCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                {underReviewCount} {t("dashboard.underReview")}
              </Badge>
            )}
          </div>

          {/* Action Buttons */}
          {canModifyViolations && (
            <div className="flex items-center gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
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
              isRTL && "text-right"
            )}>
            {representative.accountChannel}
          </div>
        </div>

        {/* Time and Views Info */}
        <div
          className={cn(
            "px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap",
            isRTL && "flex-row-reverse"
          )}>
          <span>{timeCreated}</span>
          <span>•</span>
          <span>{dateCreated}</span>
          <span>•</span>
          <span>{timeAgo}</span>
          {totalViews > 0 && (
            <>
              <span>•</span>
              <span className="font-medium">
                {formattedTotalViews} {t("dashboard.views")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bulk Violations Details Modal */}
      <BulkViolationDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bulkId={bulkId}
        violations={violations}
        platform={platform}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onCopyUrl={onCopyUrl}
        onAddNote={onAddNote}
        getPlatformIcon={getPlatformIcon}
        canModifyViolations={canModifyViolations}
      />

      {/* Bulk Delete Confirmation Dialog */}
      <BulkDeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        violationCount={violations.length}
        onConfirm={handleBulkDelete}
      />

      {/* Bulk Status Change Dialog */}
      <BulkStatusChangeDialog
        open={statusDialogOpen}
        onOpenChange={setStatusDialogOpen}
        violationCount={violations.length}
        selectedStatus={selectedStatus}
        onStatusChange={setSelectedStatus}
        blockedAt={blockedAt}
        onBlockedAtChange={setBlockedAt}
        onConfirm={handleBulkStatusChange}
      />
    </>
  );
}
