import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, RefreshCw, UserCircle } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
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
  count?: number;
  status?: string;
  accountChannel?: string;
}

interface BulkActivityLogItemProps {
  bulkId: string;
  log: ActivityLogItem;
  getPlatformColor: (platform: string | null) => string;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  onDeleteLog?: (item: ActivityLogItem) => void;
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
  log,
  getPlatformColor,
  getPlatformIcon,
  onDeleteLog,
  isSuperAdmin = false,
}: BulkActivityLogItemProps) {
  const { t, isRTL } = useLanguage();
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);

  // Translate status badge
  const translateStatus = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "active") return t("dashboard.active");
    if (statusLower === "blocked") return t("dashboard.blocked");
    if (statusLower === "removed") return t("dashboard.removed");
    if (statusLower === "review" || statusLower === "under review")
      return t("dashboard.underReview");
    if (statusLower === "reported") return t("dashboard.reported");
    return status;
  };

  // Get the event icon
  const EventIcon = getEventIcon(log.type);

  // Determine badge variant and color based on type
  const getBadgeVariant = () => {
    if (log.type === "added") return "default";
    if (log.type === "deleted") return "destructive";
    if (log.type === "status_change") return "secondary";
    return log.badgeVariant;
  };

  const getBadgeClassName = () => {
    if (log.type === "added") {
      return "bg-success text-white border-success/20";
    } else if (log.type === "deleted") {
      return "bg-destructive text-white border-destructive/20";
    } else if (log.type === "status_change") {
      return "bg-cyan-500 text-white border-cyan-500/20";
    }
    return "";
  };

  return (
    <>
      <div
        className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-start gap-3 p-3 rounded-lg border-2 ${
          log.type === "added"
            ? "border-l-4 border-l-success bg-success/5 hover:bg-success/10"
            : log.type === "deleted"
              ? "border-l-4 border-l-destructive bg-destructive/5 hover:bg-destructive/10"
              : log.type === "status_change"
                ? "border-l-4 border-l-cyan-500 bg-cyan-500/5 hover:bg-cyan-500/10"
                : "border-border/50 hover:border-border hover:bg-muted/30"
        } transition-all group relative shadow-sm hover:shadow-md`}>
        {/* Icon with colored background */}
        <div className="shrink-0 mt-0.5">
          <div
            className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
              log.type === "added"
                ? "bg-success/20 text-success group-hover:bg-success/30"
                : log.type === "deleted"
                  ? "bg-destructive/20 text-destructive group-hover:bg-destructive/30"
                  : log.type === "status_change"
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
              {log.time}
            </p>
            <Badge
              variant={getBadgeVariant()}
              className={`text-xs px-2.5 py-0.5 h-6 font-semibold ${getBadgeClassName()} ${
                isRTL ? "text-left" : ""
              }`}>
              {log.badge}
            </Badge>
            {/* Count Badge */}
            {log.count && (
              <Badge
                variant="outline"
                className="text-xs px-2.5 py-0.5 h-6 font-semibold bg-primary/10 text-primary border-primary/20">
                {log.count} {t("matchDashboard.violations")}
              </Badge>
            )}
            {log.userName && (
              <div
                className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-center gap-1.5 px-2.5 py-1 rounded-md bg-muted/50 border border-border/70 ${
                  isRTL ? "text-left" : ""
                }`}>
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={`text-xs text-muted-foreground font-semibold ${
                    isRTL ? "text-left" : ""
                  }`}>
                  {log.userName}
                </span>
              </div>
            )}
            {/* Delete Button - Visible on hover for super admins */}
            {isSuperAdmin && onDeleteLog && (
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

          {/* Description */}
          <div
            className="text-sm leading-relaxed text-foreground break-words mb-2 font-medium"
            dir={isRTL ? "rtl" : "ltr"}>
            {log.type === "added" && (
              <div>
                {log.count}{" "}
                {t("matchDashboard.activityLog.bulk.violationsCreated")}{" "}
                {log.accountChannel && (
                  <>
                    {t("matchDashboard.violationItem.forChannelUser")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {log.accountChannel}
                    </code>{" "}
                  </>
                )}
                {log.status && (
                  <>
                    {t("matchDashboard.violationItem.withStatus")}{" "}
                    <code
                      className={`text-xs px-1.5 py-0.5 rounded font-mono ${
                        log.status.toLowerCase() === "active" ||
                        log.status.toLowerCase() === "reported"
                          ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                          : log.status.toLowerCase() === "blocked"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                            : log.status.toLowerCase() === "removed"
                              ? "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
                              : log.status.toLowerCase() === "under review" ||
                                  log.status.toLowerCase() === "review"
                                ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                                : "bg-primary/10 text-primary"
                      }`}>
                      {translateStatus(log.status)}
                    </code>
                  </>
                )}
              </div>
            )}
            {log.type === "deleted" && (
              <div>
                {log.count}{" "}
                {t("matchDashboard.activityLog.bulk.violationsDeleted")}
              </div>
            )}
            {log.type === "status_change" && (
              <div>
                {log.count}{" "}
                {t("matchDashboard.activityLog.bulk.violationsStatusChanged")}
              </div>
            )}
          </div>
        </div>

        {/* Platform icon with enhanced styling */}
        {log.platform && (
          <div className="shrink-0 mt-0.5 flex flex-col items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-muted/50 flex items-center justify-center border-2 border-border/70 group-hover:bg-muted/70 group-hover:border-border transition-all shadow-sm">
              {getPlatformIcon(log.platform)}
            </div>
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {isDeleteConfirmOpen && onDeleteLog && (
        <BulkDeleteConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={setIsDeleteConfirmOpen}
          violationCount={1}
          title={t("matchDashboard.activityLog.actions.deleteLogEntry")}
          description={
            t("matchDashboard.activityLog.deleteConfirm.description") ||
            "Are you sure you want to delete this log entry? This action cannot be undone."
          }
          confirmText={t("matchDashboard.activityLog.actions.delete")}
          onConfirm={() => {
            onDeleteLog(log);
            setIsDeleteConfirmOpen(false);
          }}
        />
      )}
    </>
  );
}
