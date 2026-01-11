import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Activity,
  Plus,
  Trash2,
  Link,
  User,
  Film,
  Eye,
  Clock,
  Shield,
  UserCircle,
  X,
  Maximize2,
  Minimize2,
} from "lucide-react";
import {
  Violation,
  AuditLogEntry,
  DeletedViolationLog,
  API_URL,
} from "./types";
import { formatViewsString } from "./utils";
import { DeleteConfirmDialog } from "./DeleteConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import React, { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string | React.ReactNode; // Allow ReactNode for highlighted descriptions
  platform?: string;
  timestamp?: number; // For sorting
  userName?: string; // Username who performed the action
  violationId?: string; // Violation ID for audit log entries
  logEntryId?: string; // Audit log entry ID
  deletedLogId?: string; // Deleted violation log ID
}

type ActivityFilter =
  | "all"
  | "added"
  | "deleted"
  | "url_changed"
  | "account_changed"
  | "content_type_changed"
  | "status_change"
  | "views_changed"
  | "time_added_changed"
  | "blocked_at_changed"
  | "notes_added"
  | "notes_edited"
  | "notes_changed";

interface ActivityLogProps {
  log: ActivityLogItem[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  getPlatformColor: (platform: string | null) => string;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  violations?: Violation[]; // All violations with audit logs
  platformOperations?: Array<{
    id: string;
    name: string;
    violations: Violation[];
  }>; // Platform operations to get platform names
  deletedViolationLogs?: DeletedViolationLog[]; // Deleted violation logs from separate collection
  onRefetch?: () => void; // Callback to refetch data after deletion
  platformFilter?: string; // Platform filter value
  onPlatformFilterChange?: (platform: string) => void; // Platform filter change handler
  userFilter?: string; // User filter value
  onUserFilterChange?: (user: string) => void; // User filter change handler
  isSuperAdmin?: boolean; // Whether the current user is a superAdmin
}

const getEventIcon = (type: string) => {
  switch (type) {
    case "match":
      return Zap;
    case "added":
      return Plus;
    case "deleted":
      return Trash2;
    case "status_change":
      return RefreshCw;
    case "notes":
    case "notes_added":
    case "notes_changed":
    case "notes_edited":
      return MessageSquare;
    case "url_changed":
      return Link;
    case "account_changed":
      return User;
    case "content_type_changed":
      return Film;
    case "views_changed":
      return Eye;
    case "time_added_changed":
      return Clock;
    case "blocked_at_changed":
      return Shield;
    case "violation":
      return AlertTriangle;
    default:
      return Activity;
  }
};

export function ActivityLog({
  log,
  filter,
  onFilterChange,
  getPlatformColor,
  getPlatformIcon,
  violations = [],
  platformOperations = [],
  deletedViolationLogs = [],
  onRefetch,
  platformFilter = "all",
  onPlatformFilterChange,
  userFilter = "all",
  onUserFilterChange,
  isSuperAdmin = false,
}: ActivityLogProps) {
  const { t, isRTL } = useLanguage();
  const [deleteConfirmItem, setDeleteConfirmItem] =
    useState<ActivityLogItem | null>(null);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isMaximized, setIsMaximized] = useState(false);

  const handleDeleteLog = (item: ActivityLogItem) => {
    setDeleteConfirmItem(item);
    setIsDeleteConfirmOpen(true);
  };

  const confirmDeleteLog = async () => {
    if (!deleteConfirmItem) return;

    try {
      let response;
      if (deleteConfirmItem.deletedLogId) {
        // Delete from DeletedViolationLog collection
        response = await fetch(
          `${API_URL}/violations/deleted-logs/${deleteConfirmItem.deletedLogId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
      } else if (
        deleteConfirmItem.violationId &&
        deleteConfirmItem.logEntryId
      ) {
        // Delete audit log entry from violation
        response = await fetch(
          `${API_URL}/violations/${deleteConfirmItem.violationId}/audit-log/${deleteConfirmItem.logEntryId}`,
          {
            method: "DELETE",
            credentials: "include",
          }
        );
      } else {
        console.error("Cannot delete: missing required IDs");
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to delete log entry");
      }

      // Refetch data to update the UI
      if (onRefetch) {
        onRefetch();
      }

      setIsDeleteConfirmOpen(false);
      setDeleteConfirmItem(null);
    } catch (error) {
      console.error("Error deleting log entry:", error);
      alert(t("matchDashboard.activityLog.error.failedToDelete"));
    }
  };
  // Convert violation audit logs to ActivityLogItem format
  const auditLogItems: ActivityLogItem[] = [];

  // Process deleted violation logs from separate collection
  deletedViolationLogs.forEach((deletedLog) => {
    const timestamp = new Date(deletedLog.timestamp);
    const formattedDate = timestamp.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    const formattedTime = timestamp.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
    });
    const timeAgo = formatTimeAgoHelper(timestamp, t);

    const platformName = deletedLog.changes?.platformName || t("matchDashboard.activityLog.descriptions.platform");
    const accountName = deletedLog.changes?.accountChannel || "";
    const status = deletedLog.changes?.status || "";
    const views = deletedLog.changes?.views || "0";

    auditLogItems.push({
      type: "deleted",
      time: `${formattedDate} ${t("matchDashboard.activityLog.dateTime.at")} ${formattedTime} • ${timeAgo}`,
      badge: t("matchDashboard.activityLog.badges.deleted"),
      badgeVariant: "destructive",
      description: (
        <div className="text-left">
          {isRTL ? (
            <>
              {views && views !== "0" && status && (
                <>
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {status}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.andStatus")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.with")}{" "}
                </>
              )}
              {views && views !== "0" && !status && (
                <>
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.with")}{" "}
                </>
              )}
              {!views && status && (
                <>
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {status}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.withStatus")}{" "}
                </>
              )}
              {accountName && (
                <>
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {accountName}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.forChannelUser")}{" "}
                </>
              )}
              <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                {platformName}
              </code>{" "}
              {t("matchDashboard.activityLog.descriptions.violationDeletedFrom")}
            </>
          ) : (
            <>
              {t("matchDashboard.activityLog.descriptions.violationDeletedFrom")}{" "}
              <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                {platformName}
              </code>
              {accountName && (
                <>
                  {" "}
                  {t("matchDashboard.activityLog.descriptions.forChannelUser")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {accountName}
                  </code>
                </>
              )}
              {views && views !== "0" && status && (
                <>
                  {" "}
                  {t("matchDashboard.activityLog.descriptions.with")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.andStatus")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {status}
                  </code>
                </>
              )}
              {views && views !== "0" && !status && (
                <>
                  {" "}
                  {t("matchDashboard.activityLog.descriptions.with")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                  </code>
                </>
              )}
              {!views && status && (
                <>
                  {" "}
                  {t("matchDashboard.activityLog.descriptions.withStatus")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {status}
                  </code>
                </>
              )}
            </>
          )}
        </div>
      ),
      platform: platformName,
      timestamp: timestamp.getTime(),
      userName: deletedLog.userName,
      deletedLogId: deletedLog._id,
    });
  });

  // Create a map of violation IDs to platform names
  const violationToPlatformMap = new Map<string, string>();
  platformOperations.forEach((platform) => {
    platform.violations.forEach((v) => {
      const violationId = v._id || v.id?.toString();
      if (violationId) {
        violationToPlatformMap.set(violationId, platform.name);
      }
    });
  });

  violations.forEach((violation) => {
    if (violation.auditLog && violation.auditLog.length > 0) {
      violation.auditLog.forEach((entry: AuditLogEntry) => {
        const timestamp = new Date(entry.timestamp);
        const formattedDate = timestamp.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const formattedTime = timestamp.toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
        });
        const timeAgo = formatTimeAgoHelper(timestamp, t);

        let type: string = entry.action;
        let description: string | React.ReactNode = "";
        let badge = "";

        switch (entry.action) {
          case "created": {
            type = "added";
            badge = t("matchDashboard.activityLog.badges.added");
            const platformName = violation.platformName || t("matchDashboard.activityLog.descriptions.platform");
            const accountName =
              violation.accountChannel || violation.accountHandle || "";
            const views = violation.views || "0";
            const status = violation.status || "";
            
            // Helper function to translate status values
            const translateStatus = (status: string): string => {
              const statusLower = status.toLowerCase();
              if (statusLower === "active") return t("dashboard.active");
              if (statusLower === "blocked") return t("dashboard.blocked");
              if (statusLower === "removed") return t("dashboard.removed");
              if (statusLower === "under review") return t("dashboard.underReview");
              if (statusLower === "reported") return t("dashboard.reported");
              return status;
            };
            
            description = (
              <div className="text-left">
                {isRTL ? (
                  <>
                    {views && views !== "0" && status && (
                      <>
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {translateStatus(status)}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.andStatus")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.with")}{" "}
                      </>
                    )}
                    {views && views !== "0" && !status && (
                      <>
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.with")}{" "}
                      </>
                    )}
                    {!views && status && (
                      <>
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {translateStatus(status)}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.withStatus")}{" "}
                      </>
                    )}
                    {accountName && (
                      <>
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {accountName}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.forChannelUser")}{" "}
                      </>
                    )}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {platformName}
                    </code>{" "}
                    {t("matchDashboard.activityLog.descriptions.violationCreatedOn")}
                  </>
                ) : (
                  <>
                    {t("matchDashboard.activityLog.descriptions.violationCreatedOn")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {platformName}
                    </code>
                    {accountName && (
                      <>
                        {" "}
                        {t("matchDashboard.activityLog.descriptions.forChannelUser")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {accountName}
                        </code>
                      </>
                    )}
                    {views && views !== "0" && status && (
                      <>
                        {" "}
                        {t("matchDashboard.activityLog.descriptions.with")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                        </code>{" "}
                        {t("matchDashboard.activityLog.descriptions.andStatus")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {translateStatus(status)}
                        </code>
                      </>
                    )}
                    {views && views !== "0" && !status && (
                      <>
                        {" "}
                        {t("matchDashboard.activityLog.descriptions.with")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {formatViewsString(views)} {t("matchDashboard.activityLog.descriptions.views")}
                        </code>
                      </>
                    )}
                    {!views && status && (
                      <>
                        {" "}
                        {t("matchDashboard.activityLog.descriptions.withStatus")}{" "}
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {translateStatus(status)}
                        </code>
                      </>
                    )}
                  </>
                )}
              </div>
            );
            break;
          }
          case "status_changed": {
            type = "status_change";
            badge = t("matchDashboard.activityLog.badges.statusChange");
            const oldStatus = String(entry.oldValue || "");
            const newStatus = String(entry.newValue || "");

            // Helper function to get status color classes
            const getStatusColorClasses = (status: string) => {
              const statusLower = status.toLowerCase();
              if (statusLower === "active") {
                return "bg-destructive/10 text-destructive";
              } else if (statusLower === "blocked") {
                return "bg-success/10 text-success";
              } else if (statusLower === "removed") {
                return "bg-cyan-500/10 text-cyan-500";
              } else if (statusLower === "under review") {
                return "bg-yellow-500/10 text-yellow-500";
              }
              return "bg-primary/10 text-primary";
            };

            // Helper function to translate status values
            const translateStatus = (status: string): string => {
              const statusLower = status.toLowerCase();
              if (statusLower === "active") return t("dashboard.active");
              if (statusLower === "blocked") return t("dashboard.blocked");
              if (statusLower === "removed") return t("dashboard.removed");
              if (statusLower === "under review") return t("dashboard.underReview");
              if (statusLower === "reported") return t("dashboard.reported");
              return status;
            };

            // Check if blockedAt was added or removed
            if (entry.changes?.blockedAtAdded) {
              const blockedAtTime =
                entry.changes.blockedAtAdded &&
                (typeof entry.changes.blockedAtAdded === "string" ||
                  typeof entry.changes.blockedAtAdded === "number")
                  ? new Date(entry.changes.blockedAtAdded).toLocaleString("en-US")
                  : "";
              description = (
                <div className="text-left">
                  {t("matchDashboard.activityLog.descriptions.statusChangedFrom")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      oldStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(oldStatus)}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.to")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      newStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(newStatus)}
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("matchDashboard.activityLog.descriptions.blockedAtTimeAdded")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {blockedAtTime}
                    </code>
                  </div>
                </div>
              );
            } else if (entry.changes?.blockedAtRemoved) {
              description = (
                <div className="text-left">
                  {t("matchDashboard.activityLog.descriptions.statusChangedFrom")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      oldStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(oldStatus)}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.to")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      newStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(newStatus)}
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {t("matchDashboard.activityLog.descriptions.blockedAtTimeRemoved")}
                  </div>
                </div>
              );
            } else {
              description = (
                <div className="text-left">
                  {t("matchDashboard.activityLog.descriptions.statusChangedFrom")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      oldStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(oldStatus)}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.to")}{" "}
                  <code
                    className={`text-xs ${getStatusColorClasses(
                      newStatus
                    )} px-1.5 py-0.5 rounded font-mono`}>
                    {translateStatus(newStatus)}
                  </code>
                </div>
              );
            }
            break;
          }
          case "note_added": {
            type = "notes_added";
            badge = t("matchDashboard.activityLog.badges.noteAdded");
            const addedNotes =
              entry.changes?.added ||
              (Array.isArray(entry.newValue) && Array.isArray(entry.oldValue)
                ? (entry.newValue as string[]).filter(
                    (n: string) => !(entry.oldValue as string[])?.includes(n)
                  )
                : []) ||
              [];
            description = addedNotes.join(", ");
            break;
          }
          case "field_updated": {
            if (entry.field === "violationUrl") {
              type = "url_changed";
              badge = t("matchDashboard.activityLog.badges.urlChanged");
              const oldUrl = String(entry.oldValue || "");
              const newUrl = String(entry.newValue || "");
              description = (
                <div className="text-left">
                  {isRTL ? (
                    <>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                        {newUrl}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                        {oldUrl}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.violationUrlChangedFrom")}
                    </>
                  ) : (
                    <>
                      {t("matchDashboard.activityLog.descriptions.violationUrlChangedFrom")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                        {oldUrl}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                        {newUrl}
                      </code>
                    </>
                  )}
                </div>
              );
            } else if (entry.field === "accountChannel") {
              type = "account_changed";
              badge = t("matchDashboard.activityLog.badges.accountChanged");
              const oldChannel = String(entry.oldValue || "");
              const newChannel = String(entry.newValue || "");
              description = (
                <div className="text-left">
                  {isRTL ? (
                    <>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newChannel}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldChannel}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.accountChannelChangedFrom")}
                    </>
                  ) : (
                    <>
                      {t("matchDashboard.activityLog.descriptions.accountChannelChangedFrom")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldChannel}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newChannel}
                      </code>
                    </>
                  )}
                </div>
              );
            } else if (entry.field === "contentType") {
              type = "content_type_changed";
              badge = t("matchDashboard.activityLog.badges.contentTypeChanged");
              const oldType = String(entry.oldValue || "");
              const newType = String(entry.newValue || "");
              description = (
                <div className="text-left">
                  {isRTL ? (
                    <>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newType}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldType}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.contentTypeChangedFrom")}
                    </>
                  ) : (
                    <>
                      {t("matchDashboard.activityLog.descriptions.contentTypeChangedFrom")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldType}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newType}
                      </code>
                    </>
                  )}
                </div>
              );
            } else if (entry.field === "views") {
              type = "views_changed";
              badge = t("matchDashboard.activityLog.badges.viewsChanged");
              const oldViews = String(entry.oldValue ?? "");
              const newViews = String(entry.newValue ?? "");
              description = (
                <div className="text-left">
                  {t("matchDashboard.activityLog.descriptions.viewsChangedFrom")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldViews}
                  </code>{" "}
                  {t("matchDashboard.activityLog.descriptions.to")}{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newViews}
                  </code>
                </div>
              );
            } else if (entry.field === "timeAdded") {
              type = "time_added_changed";
              badge = t("matchDashboard.activityLog.badges.timeAddedChanged");
              const timeOptions: Intl.DateTimeFormatOptions = {
                month: "2-digit",
                day: "2-digit",
                year: "numeric",
                hour: "numeric",
                minute: "2-digit",
                hour12: true,
              };
              const oldTime =
                entry.oldValue && typeof entry.oldValue === "string"
                  ? new Date(entry.oldValue).toLocaleString(
                      "en-US",
                      timeOptions
                    )
                  : entry.oldValue && typeof entry.oldValue === "number"
                  ? new Date(entry.oldValue).toLocaleString(
                      "en-US",
                      timeOptions
                    )
                  : "";
              const newTime =
                entry.newValue && typeof entry.newValue === "string"
                  ? new Date(entry.newValue).toLocaleString(
                      "en-US",
                      timeOptions
                    )
                  : entry.newValue && typeof entry.newValue === "number"
                  ? new Date(entry.newValue).toLocaleString(
                      "en-US",
                      timeOptions
                    )
                  : "";
              description = (
                <div className="text-left">
                  {isRTL ? (
                    <>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newTime}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldTime}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.timeAddedChangedFrom")}
                    </>
                  ) : (
                    <>
                      {t("matchDashboard.activityLog.descriptions.timeAddedChangedFrom")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldTime}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newTime}
                      </code>
                    </>
                  )}
                </div>
              );
            } else if (entry.field === "blockedAt") {
              const action = entry.changes?.action;
              if (action === "added") {
                type = "blocked_at_added";
                badge = t("matchDashboard.activityLog.badges.blockedAtAdded");
                const newBlocked =
                  entry.newValue &&
                  (typeof entry.newValue === "string" ||
                    typeof entry.newValue === "number")
                    ? new Date(entry.newValue).toLocaleString("en-US")
                    : "";
                description = (
                  <div className="text-left">
                    {t("matchDashboard.activityLog.descriptions.blockedAtTimeAdded")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {newBlocked}
                    </code>
                  </div>
                );
              } else if (action === "removed") {
                type = "blocked_at_removed";
                badge = t("matchDashboard.activityLog.badges.blockedAtRemoved");
                description = t("matchDashboard.activityLog.descriptions.blockedAtTimeRemoved");
              } else if (action === "changed" || !action) {
                // action === "changed" or no action (fallback) - this is when time is explicitly changed
                type = "blocked_at_changed";
                badge = t("matchDashboard.activityLog.badges.blockedAtChanged");
                const timeOptions: Intl.DateTimeFormatOptions = {
                  month: "2-digit",
                  day: "2-digit",
                  year: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                  hour12: true,
                };
                const oldBlocked =
                  entry.oldValue &&
                  (typeof entry.oldValue === "string" ||
                    typeof entry.oldValue === "number")
                    ? new Date(entry.oldValue).toLocaleString(
                        "en-US",
                        timeOptions
                      )
                    : "undefined";
                const newBlocked =
                  entry.newValue &&
                  (typeof entry.newValue === "string" ||
                    typeof entry.newValue === "number")
                    ? new Date(entry.newValue).toLocaleString(
                        "en-US",
                        timeOptions
                      )
                    : "undefined";
                description = (
                  <div className="text-left">
                    {t("matchDashboard.activityLog.descriptions.blockedAtChangedFrom")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {oldBlocked}
                    </code>{" "}
                    {t("matchDashboard.activityLog.descriptions.to")}{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {newBlocked}
                    </code>
                  </div>
                );
              }
            } else if (entry.field === "notes") {
              // Check if it's a note deletion, edit, or other change
              if (
                entry.changes?.action === "deleted" &&
                entry.changes?.removed
              ) {
                // Note was deleted
                type = "notes_edited";
                badge = t("matchDashboard.activityLog.badges.noteDeleted");
                const removedNotes = entry.changes.removed;
                description = removedNotes.join(", ");
              } else if (
                entry.changes?.action === "changed" &&
                entry.changes?.edited
              ) {
                // Note was edited - show "from X to Y" format
                type = "notes_changed";
                badge = t("matchDashboard.activityLog.badges.noteChanged");
                const edited = entry.changes.edited as Array<{
                  old: string;
                  new: string;
                }>;
                if (edited && Array.isArray(edited) && edited.length > 0) {
                  const firstEdit = edited[0];
                  description = (
                    <div className="text-left">
                      {isRTL ? (
                        <>
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {firstEdit.new}
                          </code>{" "}
                          {t("matchDashboard.activityLog.descriptions.to")}{" "}
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {firstEdit.old}
                          </code>{" "}
                          {t("matchDashboard.activityLog.descriptions.noteChangedFrom")}
                        </>
                      ) : (
                        <>
                          {t("matchDashboard.activityLog.descriptions.noteChangedFrom")}{" "}
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {firstEdit.old}
                          </code>{" "}
                          {t("matchDashboard.activityLog.descriptions.to")}{" "}
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {firstEdit.new}
                          </code>
                        </>
                      )}
                    </div>
                  );
                } else {
                  description = t("matchDashboard.activityLog.descriptions.notesChanged");
                }
              } else {
                // Other note changes
                type = "notes_changed";
                badge = t("matchDashboard.activityLog.badges.noteChanged");
                description = t("matchDashboard.activityLog.descriptions.notesChanged");
              }
            } else {
              type = "field_updated";
              badge = t("matchDashboard.activityLog.badges.updated");
              const fieldName = entry.field
                ? entry.field
                    .replace(/([A-Z])/g, " $1")
                    .trim()
                    .toLowerCase()
                : "field";
              const oldVal = String(entry.oldValue ?? "");
              const newVal = String(entry.newValue ?? "");
              description = (
                <div className="text-left">
                  {isRTL ? (
                    <>
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newVal}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldVal}
                      </code>{" "}
                      {fieldName} {t("matchDashboard.activityLog.descriptions.changedFrom")}
                    </>
                  ) : (
                    <>
                      {fieldName} {t("matchDashboard.activityLog.descriptions.changedFrom")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {oldVal}
                      </code>{" "}
                      {t("matchDashboard.activityLog.descriptions.to")}{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {newVal}
                      </code>
                    </>
                  )}
                </div>
              );
            }
            break;
          }
          case "deleted": {
            type = "deleted";
            badge = t("matchDashboard.activityLog.badges.deleted");
            const violationId = violation._id || violation.id?.toString();
            const platformName =
              violation.platformName ||
              (violationId ? violationToPlatformMap.get(violationId) : null) ||
              t("matchDashboard.activityLog.descriptions.platform");
            description = `${t("matchDashboard.activityLog.descriptions.violationDeletedFrom")} ${platformName}`;
            break;
          }
          default:
            type = entry.action;
            badge = t("matchDashboard.activityLog.badges.updated");
            description = t("matchDashboard.activityLog.descriptions.violationUpdated");
        }

        // Get platform name from the violation or find it from platformOperations map
        const violationId = violation._id || violation.id?.toString();
        const platformName =
          violation.platformName ||
          (violationId ? violationToPlatformMap.get(violationId) : null) ||
          t("matchDashboard.activityLog.descriptions.unknownPlatform");

        auditLogItems.push({
          type,
          time: `${formattedDate} ${t("matchDashboard.activityLog.dateTime.at")} ${formattedTime} • ${timeAgo}`,
          badge,
          badgeVariant:
            type === "deleted"
              ? "destructive"
              : type === "status_change"
              ? "secondary"
              : type === "added"
              ? "default"
              : "default",
          description,
          platform: platformName,
          timestamp: timestamp.getTime(), // Store timestamp for sorting
          userName: entry.userName,
          violationId: violation._id || violation.id?.toString(),
          logEntryId:
            entry && typeof entry === "object" && "_id" in entry
              ? String((entry as { _id: unknown })._id)
              : undefined,
        });
      });
    }
  });

  // Combine existing log items with audit log items, sort by timestamp (newest first)
  const allLogItems = [...log, ...auditLogItems].sort((a, b) => {
    // Use stored timestamp if available (from audit log), otherwise parse time string
    if (a.timestamp && b.timestamp) {
      return b.timestamp - a.timestamp; // Newest first
    }
    // Fallback to parsing time string for existing log items
    try {
      const timeA = a.time.includes(" at ")
        ? new Date(
            a.time.split(" at ")[0] +
              " " +
              a.time.split(" at ")[1].split(" •")[0]
          ).getTime()
        : a.timestamp || 0;
      const timeB = b.time.includes(" at ")
        ? new Date(
            b.time.split(" at ")[0] +
              " " +
              b.time.split(" at ")[1].split(" •")[0]
          ).getTime()
        : b.timestamp || 0;
      return timeB - timeA; // Newest first
    } catch {
      return 0;
    }
  });

  // Extract unique platforms and users from all log items
  const uniquePlatforms = Array.from(
    new Set(allLogItems.map((item) => item.platform).filter(Boolean))
  ).sort();

  const uniqueUsers = Array.from(
    new Set(allLogItems.map((item) => item.userName).filter(Boolean))
  ).sort();

  const filteredLog = allLogItems.filter((item) => {
    // Filter by activity type
    if (filter !== "all") {
      const filterTypeMap: Record<ActivityFilter, string> = {
        all: "",
        added: "added",
        deleted: "deleted",
        url_changed: "url_changed",
        account_changed: "account_changed",
        content_type_changed: "content_type_changed",
        status_change: "status_change",
        views_changed: "views_changed",
        time_added_changed: "time_added_changed",
        blocked_at_changed: "blocked_at_changed",
        notes_added: "notes_added",
        notes_edited: "notes_edited",
        notes_changed: "notes_changed",
      };
      if (item.type !== filterTypeMap[filter]) {
        return false;
      }
    }

    // Filter by platform
    if (platformFilter !== "all" && item.platform !== platformFilter) {
      return false;
    }

    // Filter by user
    if (userFilter !== "all" && item.userName !== userFilter) {
      return false;
    }

    return true;
  });

  // Render the log content (used in both normal and maximized views)
  const renderLogContent = (scrollHeight?: string) => (
    <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Select
          value={filter}
          onValueChange={(value) => onFilterChange(value as ActivityFilter)}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
            <SelectValue placeholder={t("matchDashboard.activityLog.filters.allActivity")} />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] p-1">
            <SelectItem value="all" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.allActivity")}
            </SelectItem>
            <SelectItem value="added" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.violationAdded")}
            </SelectItem>
            <SelectItem value="deleted" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.violationDeleted")}
            </SelectItem>
            <SelectItem value="url_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.urlChanged")}
            </SelectItem>
            <SelectItem value="account_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.accountChanged")}
            </SelectItem>
            <SelectItem value="content_type_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.contentTypeChanged")}
            </SelectItem>
            <SelectItem value="status_change" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.statusChange")}
            </SelectItem>
            <SelectItem value="views_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.viewsChanged")}
            </SelectItem>
            <SelectItem value="time_added_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.timeAddedChanged")}
            </SelectItem>
            <SelectItem value="blocked_at_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.blockedAtChanged")}
            </SelectItem>
            <SelectItem value="notes_added" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.notesAdded")}
            </SelectItem>
            <SelectItem value="notes_edited" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.notesEdited")}
            </SelectItem>
            <SelectItem value="notes_changed" className="text-xs py-1.5">
              {t("matchDashboard.activityLog.filters.notesChanged")}
            </SelectItem>
          </SelectContent>
        </Select>

        {/* Platform Filter */}
        {onPlatformFilterChange && (
          <Select value={platformFilter} onValueChange={onPlatformFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
              <SelectValue placeholder={t("matchDashboard.activityLog.platformFilter.placeholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] p-1">
              <SelectItem value="all" className="text-xs py-1.5">
                {t("matchDashboard.activityLog.platformFilter.allPlatforms")}
              </SelectItem>
              {uniquePlatforms.map((platform) => (
                <SelectItem
                  key={platform}
                  value={platform}
                  className="text-xs py-1.5">
                  {platform}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* User Filter */}
        {onUserFilterChange && (
          <Select value={userFilter} onValueChange={onUserFilterChange}>
            <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
              <SelectValue placeholder={t("matchDashboard.activityLog.userFilter.placeholder")} />
            </SelectTrigger>
            <SelectContent className="max-h-[300px] p-1">
              <SelectItem value="all" className="text-xs py-1.5">
                {t("matchDashboard.activityLog.userFilter.allUsers")}
              </SelectItem>
              {uniqueUsers.map((user) => (
                <SelectItem key={user} value={user} className="text-xs py-1.5">
                  {user}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <ScrollArea className={scrollHeight || "h-[320px]"}>
        <div className="space-y-2">
          {filteredLog.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <Activity className="h-8 w-8 text-muted-foreground/50 mb-2" />
              <p className="text-sm text-muted-foreground">No activity found</p>
              <p className="text-xs text-muted-foreground/70 mt-1">
                {violations.length === 0
                  ? "No violations yet"
                  : "Try changing the filter"}
              </p>
            </div>
          ) : (
            filteredLog.map((item, i) => {
              const EventIcon = getEventIcon(item.type);
              return (
                <div
                  key={i}
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group relative">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <EventIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {item.time}
                      </p>
                      <Badge
                        variant={item.badgeVariant}
                        className={`text-xs px-2 py-0.5 h-5 font-medium ${
                          item.type === "added"
                            ? "bg-success text-white border-success/20"
                            : item.type === "notes_added"
                            ? "bg-success text-white border-success/20"
                            : item.type === "notes_changed"
                            ? "bg-yellow-500 text-white border-yellow-500/20"
                            : item.type === "notes_edited"
                            ? "bg-destructive text-white border-destructive/20"
                            : item.type === "status_change" ||
                              item.type === "content_type_changed"
                            ? "bg-cyan-500 text-white border-cyan-500/20"
                            : item.type === "views_changed" ||
                              item.type === "time_added_changed" ||
                              item.type === "blocked_at_changed"
                            ? "bg-purple-500 text-white border-purple-500/20"
                            : item.type === "url_changed" ||
                              item.type === "account_changed"
                            ? "bg-yellow-500 text-white border-yellow-500/20"
                            : ""
                        }`}>
                        {item.badge}
                      </Badge>
                      {item.userName && (
                        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/50">
                          <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                          <span className="text-xs text-muted-foreground font-medium">
                            {item.userName}
                          </span>
                        </div>
                      )}
                      {/* Delete button - appears on hover, after userName - only for superAdmin */}
                      {isSuperAdmin &&
                        (item.deletedLogId ||
                          (item.violationId && item.logEntryId)) && (
                          <button
                            onClick={() => handleDeleteLog(item)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive"
                            title={t("matchDashboard.activityLog.actions.deleteLogEntry")}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                    </div>
                    <div className="text-sm leading-relaxed text-foreground break-words">
                      {item.description}
                    </div>
                  </div>

                  {item.platform && (
                    <div className="shrink-0 mt-0.5">
                      <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border/50 group-hover:bg-muted/60 transition-colors">
                        {getPlatformIcon(item.platform)}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </ScrollArea>
    </>
  );

  return (
    <>
      <Card className="p-6 lg:col-span-2">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold">{t("matchDashboard.activityLog.title")}</h3>
          <button
            onClick={() => setIsMaximized(true)}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            title={t("matchDashboard.activityLog.actions.maximize")}>
            <Maximize2 className="h-4 w-4" />
          </button>
        </div>

        {renderLogContent()}

        <DeleteConfirmDialog
          open={isDeleteConfirmOpen}
          onOpenChange={(open) => {
            setIsDeleteConfirmOpen(open);
            if (!open) setDeleteConfirmItem(null);
          }}
          onConfirm={confirmDeleteLog}
          title={t("matchDashboard.activityLog.deleteDialog.title")}
          description={t("matchDashboard.activityLog.deleteDialog.description")}
        />
      </Card>

      <Dialog open={isMaximized} onOpenChange={setIsMaximized}>
        <DialogContent className="max-w-[95vw] max-h-[95vh] w-[95vw] h-[95vh] flex flex-col p-0 translate-x-[-50%] translate-y-[-50%] left-[50%] top-[50%] [&>button]:hidden">
          <DialogHeader className="px-6 pt-6 pb-4 border-b flex-shrink-0">
            <div className="flex items-center justify-between">
              <DialogTitle>{t("matchDashboard.activityLog.title")}</DialogTitle>
              <button
                onClick={() => setIsMaximized(false)}
                className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
                title={t("matchDashboard.activityLog.actions.minimize")}>
                <Minimize2 className="h-4 w-4" />
              </button>
            </div>
          </DialogHeader>
          <div className="flex-1 overflow-hidden px-6 pb-6 pt-4">
            {renderLogContent("h-[calc(95vh-140px)]")}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

// formatTimeAgo function needs to be called from within component to access t()
// So we'll create it as a helper that takes t as parameter
const formatTimeAgoHelper = (date: Date, t: (key: string, params?: Record<string, string | number>) => string): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t("matchDashboard.activityLog.timeAgo.justNow");
  if (diffMins < 60) return t("matchDashboard.activityLog.timeAgo.minutesAgo", { minutes: diffMins });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t("matchDashboard.activityLog.timeAgo.hoursAgo", { hours: diffHours });
  const diffDays = Math.floor(diffHours / 24);
  return t("matchDashboard.activityLog.timeAgo.daysAgo", { days: diffDays });
};
