import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BulkActivityLogDetailsModal } from "./BulkActivityLogDetailsModal";
import { BulkDeleteConfirmDialog } from "./BulkDeleteConfirmDialog";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string | React.ReactNode;
  platform?: string;
  timestamp?: number;
  userName?: string;
  violationId?: string;
  logEntryId?: string;
  deletedLogId?: string;
  accountChannel?: string;
  violationUrl?: string;
  bulkId?: string;
}

interface BulkActivityLogItemProps {
  bulkId: string;
  logs: ActivityLogItem[];
  getPlatformColor: (platform: string | null) => string;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  onDeleteLog?: (item: ActivityLogItem) => void;
  onDeleteAll?: (bulkId: string, logs: ActivityLogItem[]) => void;
  isSuperAdmin?: boolean;
}

// Helper function to get event icon based on type
const getEventIcon = (type: string) => {
  switch (type) {
    case "added":
      return Plus;
    case "deleted":
      return Trash2;
    case "status_change":
      return RefreshCw;
    default:
      return RefreshCw;
  }
};

export function BulkActivityLogItem({
  bulkId,
  logs,
  getPlatformColor,
  getPlatformIcon,
  onDeleteLog,
  onDeleteAll,
  isSuperAdmin = false,
}: BulkActivityLogItemProps) {
  const { t, isRTL } = useLanguage();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Get the first log for summary display
  const firstLog = logs[0];
  const count = logs.length;

  // Get the event icon
  const EventIcon = getEventIcon(firstLog.type);

  // Determine badge variant and color based on type
  const getBadgeVariant = () => {
    if (firstLog.type === "added") return "default";
    if (firstLog.type === "deleted") return "destructive";
    if (firstLog.type === "status_change") return "secondary";
    return firstLog.badgeVariant;
  };

  const getBadgeClassName = () => {
    if (firstLog.type === "added") {
      return "bg-success text-white border-success/20";
    } else if (firstLog.type === "deleted") {
      return "bg-destructive text-white border-destructive/20";
    } else if (firstLog.type === "status_change") {
      return "bg-cyan-500 text-white border-cyan-500/20";
    }
    return "";
  };

  return (
    <>
      <div
        className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-start gap-3 p-3 rounded-lg border-2 ${
          firstLog.type === "added"
            ? "border-l-4 border-l-success bg-success/5 hover:bg-success/10"
            : firstLog.type === "deleted"
              ? "border-l-4 border-l-destructive bg-destructive/5 hover:bg-destructive/10"
              : firstLog.type === "status_change"
                ? "border-l-4 border-l-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10"
                : "border-border/50 hover:border-border hover:bg-muted/30"
        } transition-all group relative cursor-pointer shadow-sm hover:shadow-md`}
        onClick={() => setIsDetailsModalOpen(true)}>
        {/* Icon with colored background */}
        <div className="shrink-0 mt-0.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              firstLog.type === "added"
                ? "bg-success/20 text-success group-hover:bg-success/30"
                : firstLog.type === "deleted"
                  ? "bg-destructive/20 text-destructive group-hover:bg-destructive/30"
                  : firstLog.type === "status_change"
                    ? "bg-cyan-500/20 text-cyan-500 group-hover:bg-cyan-500/30"
                    : "bg-muted/60 text-muted-foreground group-hover:bg-muted/80"
            }`}>
            <EventIcon className="h-5 w-5" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`flex items-center gap-2 mb-2 flex-wrap ${
              isRTL ? "flex-row-reverse justify-start" : ""
            }`}>
            <p
              className={`text-xs text-muted-foreground font-medium ${
                isRTL ? "text-left" : ""
              }`}>
              {firstLog.time}
            </p>
            <Badge
              variant={getBadgeVariant()}
              className={`text-xs px-2.5 py-0.5 h-6 font-semibold ${getBadgeClassName()} ${
                isRTL ? "text-left" : ""
              }`}>
              {firstLog.badge}
            </Badge>
            <Badge
              variant="outline"
              className="bg-primary/10 text-primary border-primary/30 text-xs px-2.5 py-0.5 h-6 font-semibold">
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.bulk.violations")}
              </div>
            </Badge>
            {firstLog.userName && (
              <div
                className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/70 ${
                  isRTL ? "text-left" : ""
                }`}>
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={`text-xs text-muted-foreground font-semibold ${
                    isRTL ? "text-left" : ""
                  }`}>
                  {firstLog.userName}
                </span>
              </div>
            )}
            {/* Delete All Button - Visible on hover for super admins */}
            {isSuperAdmin && onDeleteAll && (
              <button
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsDeleteConfirmOpen(true);
                }}
                title={t("matchDashboard.activityLog.actions.deleteLogEntry")}>
                <Trash2 className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Bulk description */}
          <div className="text-sm text-left leading-relaxed text-foreground break-words mb-2 font-medium">
            {firstLog.type === "added" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.activityLog.bulk.violationsCreated")}
              </div>
            )}
            {firstLog.type === "deleted" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.activityLog.bulk.violationsDeleted")}
              </div>
            )}
            {firstLog.type === "status_change" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count}{" "}
                {t("matchDashboard.activityLog.bulk.violationsStatusChanged")}
              </div>
            )}
          </div>
        </div>

        {/* Platform icon with enhanced styling */}
        {firstLog.platform && (
          <div className="shrink-0 mt-0.5 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border-2 border-border/70 group-hover:bg-muted/70 group-hover:border-border transition-all shadow-sm">
              {getPlatformIcon(firstLog.platform)}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <BulkActivityLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bulkId={bulkId}
        logs={logs}
        getPlatformColor={getPlatformColor}
        getPlatformIcon={getPlatformIcon}
        onDeleteLog={onDeleteLog}
        isSuperAdmin={isSuperAdmin}
      />

      {/* Delete Confirm Modal */}
      {isDeleteConfirmOpen && onDeleteAll && (
        <BulkDeleteConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          violationCount={0}
          title={t("matchDashboard.activityLog.actions.deleteLogEntry")}
          description={
            t("matchDashboard.activityLog.deleteConfirm.description") ||
            "Are you sure you want to delete these log entries? This will verify that the history of this bulk action is removed."
          }
          confirmText={t("matchDashboard.activityLog.actions.delete")}
          onConfirm={() => {
            onDeleteAll(bulkId, logs);
            setIsDeleteConfirmOpen(false);
          }}
        />
      )}
    </>
  );
}
