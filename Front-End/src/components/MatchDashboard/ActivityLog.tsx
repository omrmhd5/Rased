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
} from "lucide-react";
import { Violation, AuditLogEntry } from "./types";
import React from "react";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string | React.ReactNode; // Allow ReactNode for highlighted descriptions
  platform?: string;
  timestamp?: number; // For sorting
}

type ActivityFilter =
  | "all"
  | "added"
  | "deleted"
  | "status_change"
  | "notes"
  | "notes_added"
  | "notes_changed"
  | "notes_edited"
  | "url_changed"
  | "account_changed"
  | "content_type_changed"
  | "views_changed"
  | "time_added_changed"
  | "blocked_at_changed"
  | "blocked_at_added"
  | "blocked_at_removed";

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
}: ActivityLogProps) {
  // Convert violation audit logs to ActivityLogItem format
  const auditLogItems: ActivityLogItem[] = [];

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
        const timeAgo = formatTimeAgo(timestamp);

        let type: string = entry.action;
        let description: string | React.ReactNode = "";
        let badge = "";

        switch (entry.action) {
          case "created": {
            type = "added";
            badge = "Added";
            description = `Violation created on ${
              violation.platformName || "platform"
            }`;
            break;
          }
          case "status_changed": {
            type = "status_change";
            badge = "Status Change";
            const oldStatus = String(entry.oldValue || "");
            const newStatus = String(entry.newValue || "");

            // Check if blockedAt was added or removed
            if (entry.changes?.blockedAtAdded) {
              const blockedAtTime =
                entry.changes.blockedAtAdded &&
                (typeof entry.changes.blockedAtAdded === "string" ||
                  typeof entry.changes.blockedAtAdded === "number")
                  ? new Date(entry.changes.blockedAtAdded).toLocaleString()
                  : "";
              description = (
                <>
                  Status changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldStatus}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newStatus}
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Blocked at time added:{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {blockedAtTime}
                    </code>
                  </div>
                </>
              );
            } else if (entry.changes?.blockedAtRemoved) {
              description = (
                <>
                  Status changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldStatus}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newStatus}
                  </code>
                  <div className="mt-1 text-xs text-muted-foreground">
                    Blocked at time removed
                  </div>
                </>
              );
            } else {
              description = `Status changed from "${oldStatus}" to "${newStatus}"`;
            }
            break;
          }
          case "note_added": {
            type = "notes_added";
            badge = "Note Added";
            const addedNotes =
              entry.changes?.added ||
              (Array.isArray(entry.newValue) && Array.isArray(entry.oldValue)
                ? (entry.newValue as string[]).filter(
                    (n: string) => !(entry.oldValue as string[])?.includes(n)
                  )
                : []) ||
              [];
            description = `Note${
              addedNotes.length > 1 ? "s" : ""
            } added: ${addedNotes.join(", ")}`;
            break;
          }
          case "field_updated": {
            if (entry.field === "violationUrl") {
              type = "url_changed";
              badge = "URL Changed";
              const oldUrl = String(entry.oldValue || "");
              const newUrl = String(entry.newValue || "");
              description = (
                <>
                  Violation URL changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                    {oldUrl}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono break-all">
                    {newUrl}
                  </code>
                </>
              );
            } else if (entry.field === "accountChannel") {
              type = "account_changed";
              badge = "Account Changed";
              const oldChannel = String(entry.oldValue || "");
              const newChannel = String(entry.newValue || "");
              description = (
                <>
                  Account channel changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldChannel}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newChannel}
                  </code>
                </>
              );
            } else if (entry.field === "contentType") {
              type = "content_type_changed";
              badge = "Content Type Changed";
              const oldType = String(entry.oldValue || "");
              const newType = String(entry.newValue || "");
              description = (
                <>
                  Content type changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldType}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newType}
                  </code>
                </>
              );
            } else if (entry.field === "views") {
              type = "views_changed";
              badge = "Views Changed";
              const oldViews = String(entry.oldValue ?? "");
              const newViews = String(entry.newValue ?? "");
              description = (
                <>
                  Views changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldViews}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newViews}
                  </code>
                </>
              );
            } else if (entry.field === "timeAdded") {
              type = "time_added_changed";
              badge = "Time Added Changed";
              const oldTime =
                entry.oldValue && typeof entry.oldValue === "string"
                  ? new Date(entry.oldValue).toLocaleString()
                  : entry.oldValue && typeof entry.oldValue === "number"
                  ? new Date(entry.oldValue).toLocaleString()
                  : "";
              const newTime =
                entry.newValue && typeof entry.newValue === "string"
                  ? new Date(entry.newValue).toLocaleString()
                  : entry.newValue && typeof entry.newValue === "number"
                  ? new Date(entry.newValue).toLocaleString()
                  : "";
              description = (
                <>
                  Time added changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldTime}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newTime}
                  </code>
                </>
              );
            } else if (entry.field === "blockedAt") {
              const action = entry.changes?.action;
              if (action === "added") {
                type = "blocked_at_added";
                badge = "Blocked At Added";
                const newBlocked =
                  entry.newValue &&
                  (typeof entry.newValue === "string" ||
                    typeof entry.newValue === "number")
                    ? new Date(entry.newValue).toLocaleString()
                    : "";
                description = (
                  <>
                    Blocked at time added:{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {newBlocked}
                    </code>
                  </>
                );
              } else if (action === "removed") {
                type = "blocked_at_removed";
                badge = "Blocked At Removed";
                description = "Blocked at removed";
              } else {
                // action === "changed" or no action (fallback)
                type = "blocked_at_changed";
                badge = "Blocked At Changed";
                const oldBlocked =
                  entry.oldValue &&
                  (typeof entry.oldValue === "string" ||
                    typeof entry.oldValue === "number")
                    ? new Date(entry.oldValue).toLocaleString()
                    : "undefined";
                const newBlocked =
                  entry.newValue &&
                  (typeof entry.newValue === "string" ||
                    typeof entry.newValue === "number")
                    ? new Date(entry.newValue).toLocaleString()
                    : "undefined";
                description = (
                  <>
                    Blocked at changed from{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {oldBlocked}
                    </code>{" "}
                    to{" "}
                    <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                      {newBlocked}
                    </code>
                  </>
                );
              }
            } else if (entry.field === "notes") {
              type = "notes_changed";
              badge = "Notes Changed";
              description = "Notes changed";
            } else {
              type = "field_updated";
              badge = "Updated";
              const fieldName = entry.field
                ? entry.field
                    .replace(/([A-Z])/g, " $1")
                    .trim()
                    .toLowerCase()
                : "field";
              const oldVal = String(entry.oldValue ?? "");
              const newVal = String(entry.newValue ?? "");
              description = (
                <>
                  {fieldName} changed from{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {oldVal}
                  </code>{" "}
                  to{" "}
                  <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                    {newVal}
                  </code>
                </>
              );
            }
            break;
          }
          case "deleted":
            type = "deleted";
            badge = "Deleted";
            const violationId = violation._id || violation.id?.toString();
            const platformName =
              violation.platformName ||
              (violationId ? violationToPlatformMap.get(violationId) : null) ||
              "platform";
            description = `Violation deleted from ${platformName}`;
            break;
          default:
            type = entry.action;
            badge = "Updated";
            description = "Violation updated";
        }

        // Get platform name from the violation or find it from platformOperations map
        const violationId = violation._id || violation.id?.toString();
        const platformName =
          violation.platformName ||
          (violationId ? violationToPlatformMap.get(violationId) : null) ||
          "Unknown Platform";

        auditLogItems.push({
          type,
          time: `${formattedDate} at ${formattedTime} • ${timeAgo}`,
          badge,
          badgeVariant:
            type === "deleted"
              ? "destructive"
              : type === "status_change"
              ? "secondary"
              : "default",
          description,
          platform: platformName,
          timestamp: timestamp.getTime(), // Store timestamp for sorting
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

  const filteredLog = allLogItems.filter((item) => {
    if (filter === "all") return true;
    if (filter === "notes") {
      // Show all note-related activities
      return (
        item.type === "notes_added" ||
        item.type === "notes_changed" ||
        item.type === "notes_edited"
      );
    }
    // Map filter to log item type
    const filterTypeMap: Record<ActivityFilter, string> = {
      all: "",
      added: "added",
      deleted: "deleted",
      status_change: "status_change",
      notes: "",
      notes_added: "notes_added",
      notes_changed: "notes_changed",
      notes_edited: "notes_edited",
      url_changed: "url_changed",
      account_changed: "account_changed",
      content_type_changed: "content_type_changed",
      views_changed: "views_changed",
      time_added_changed: "time_added_changed",
      blocked_at_changed: "blocked_at_changed",
      blocked_at_added: "blocked_at_added",
      blocked_at_removed: "blocked_at_removed",
    };
    return item.type === filterTypeMap[filter];
  });

  return (
    <Card className="p-6 lg:col-span-2">
      <h3 className="font-semibold mb-4">Match Activity Log</h3>

      <div className="mb-4">
        <Select
          value={filter}
          onValueChange={(value) => onFilterChange(value as ActivityFilter)}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter activity" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] p-1">
            <SelectItem value="all" className="text-xs py-1.5">
              All Activity
            </SelectItem>
            <SelectItem value="added" className="text-xs py-1.5">
              Violation Added
            </SelectItem>
            <SelectItem value="deleted" className="text-xs py-1.5">
              Violation Deleted
            </SelectItem>
            <SelectItem value="status_change" className="text-xs py-1.5">
              Status Change
            </SelectItem>
            <SelectItem value="notes" className="text-xs py-1.5">
              Notes (All)
            </SelectItem>
            <SelectItem value="notes_added" className="text-xs py-1.5">
              Notes - Added
            </SelectItem>
            <SelectItem value="notes_changed" className="text-xs py-1.5">
              Notes - Changed
            </SelectItem>
            <SelectItem value="notes_edited" className="text-xs py-1.5">
              Notes - Edited
            </SelectItem>
            <SelectItem value="url_changed" className="text-xs py-1.5">
              URL Changed
            </SelectItem>
            <SelectItem value="account_changed" className="text-xs py-1.5">
              Account Changed
            </SelectItem>
            <SelectItem value="content_type_changed" className="text-xs py-1.5">
              Content Type Changed
            </SelectItem>
            <SelectItem value="views_changed" className="text-xs py-1.5">
              Views Changed
            </SelectItem>
            <SelectItem value="time_added_changed" className="text-xs py-1.5">
              Time Added Changed
            </SelectItem>
            <SelectItem value="blocked_at_changed" className="text-xs py-1.5">
              Blocked At Changed
            </SelectItem>
            <SelectItem value="blocked_at_added" className="text-xs py-1.5">
              Blocked At Added
            </SelectItem>
            <SelectItem value="blocked_at_removed" className="text-xs py-1.5">
              Blocked At Removed
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[320px]">
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
                  className="flex items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group">
                  <div className="shrink-0 mt-0.5">
                    <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center group-hover:bg-muted/80 transition-colors">
                      <EventIcon className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <p className="text-xs text-muted-foreground">
                        {item.time}
                      </p>
                      <Badge
                        variant={item.badgeVariant}
                        className="text-xs px-2 py-0.5 h-5">
                        {item.badge}
                      </Badge>
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
    </Card>
  );
}

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}
