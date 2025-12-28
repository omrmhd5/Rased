import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  AlertTriangle,
  Shield,
  Clock,
  AlertCircle,
  XCircle,
  ExternalLink,
  Edit,
  Lock,
  MoreHorizontal,
  Copy,
  FileEdit,
  Trash2,
  Link as LinkIcon,
  Eye,
  History,
  ChevronDown,
  ChevronUp,
  Plus,
  User,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { Violation, PlatformData } from "./types";
import { formatViewsString, formatBlockedViolationText } from "./utils";
import { useState, useEffect } from "react";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

interface ViolationItemProps {
  violation: Violation;
  platform: PlatformData;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "Active":
    case "Reported":
      return <AlertTriangle className="h-4 w-4 text-muted-foreground" />;
    case "Blocked":
      return <Shield className="h-4 w-4 text-muted-foreground" />;
    case "Removed":
      return <XCircle className="h-4 w-4 text-muted-foreground" />;
    case "Review":
      return <Clock className="h-4 w-4 text-muted-foreground" />;
    default:
      return <AlertCircle className="h-4 w-4 text-muted-foreground" />;
  }
};

export function ViolationItem({
  violation,
  platform,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
}: ViolationItemProps) {
  // Force re-render every minute to update time displays
  const [, setRefresh] = useState(0);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh((prev) => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  const truncatedUrl =
    (violation.violationUrl || violation.url) &&
    (violation.violationUrl || violation.url)!.length > 45
      ? (violation.violationUrl || violation.url)!.slice(0, 42) + "..."
      : violation.violationUrl || violation.url || "";

  return (
    <div className="group rounded-md border bg-card p-2.5 hover:bg-accent/50 transition-colors">
      {/* Line 1: Status icon + time + status pill + actions */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="text-muted-foreground">
            {getStatusIcon(violation.statusBadge || "Active")}
          </div>
          <span className="text-xs text-muted-foreground">
            {violation.time}
          </span>
          <Badge
            variant="outline"
            className={cn(
              "text-xs",
              (violation.statusBadge === "Active" ||
                violation.statusBadge === "Reported") &&
                "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
              violation.statusBadge === "Blocked" &&
                "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
              violation.statusBadge === "Removed" &&
                "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
              (violation.statusBadge === "Review" ||
                violation.statusBadge === "Under Review") &&
                "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
            )}>
            {violation.statusBadge}
          </Badge>
        </div>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() =>
                  onCopyUrl(violation.violationUrl || violation.url || "")
                }>
                <Copy className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Copy link</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onEdit(platform.id, violation)}>
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Edit</TooltipContent>
          </Tooltip>

          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => onToggleStatus(platform.id, violation.id)}>
                <Lock className="h-3.5 w-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              {violation.status === "Blocked" || violation.status === "Removed"
                ? "Set to Active"
                : "Mark as blocked"}
            </TooltipContent>
          </Tooltip>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7">
                <MoreHorizontal className="h-3.5 w-3.5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => onAddNote(platform.id, violation)}>
                <FileEdit className="mr-2 h-4 w-4" />
                Add note
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(platform.id, violation.id)}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Line 2: Platform icon + account handle + URL + views */}
      <div className="flex items-center justify-between gap-2 mt-1.5">
        <div className="flex items-center gap-2 min-w-0 flex-1 text-xs text-muted-foreground">
          <span className="shrink-0">{getPlatformIcon(platform.name)}</span>
          {(violation.accountChannel || violation.accountHandle) && (
            <>
              <span className="font-medium shrink-0">
                {violation.accountChannel || violation.accountHandle}
              </span>
              <span className="shrink-0">•</span>
            </>
          )}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  window.open(
                    violation.violationUrl || violation.url || "",
                    "_blank"
                  )
                }
                className="flex items-center gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1.5 py-0.5 hover:bg-accent">
                <LinkIcon className="h-3 w-3 shrink-0" />
                <span className="truncate">{truncatedUrl}</span>
                <ExternalLink className="h-3 w-3 shrink-0 opacity-0 group-hover:opacity-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent>{violation.url}</TooltipContent>
          </Tooltip>
        </div>
        <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0">
          <Eye className="h-3.5 w-3.5" />
          <span className="font-medium">
            {formatViewsString(violation.views || "0")}
          </span>
        </div>
      </div>

      {/* Line 3: Meta text */}
      <p className="text-xs text-muted-foreground mt-1">
        {formatBlockedViolationText(violation)}
      </p>

      {/* Line 4: Notes */}
      {violation.notes && violation.notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="space-y-1">
            {violation.notes.map((note, index) => (
              <p
                key={index}
                className="text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-muted-foreground/50 shrink-0">•</span>
                <span className="flex-1">{note}</span>
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Line 5: Audit Log */}
      {violation.auditLog && violation.auditLog.length > 0 && (
        <Collapsible
          open={isAuditLogOpen}
          onOpenChange={setIsAuditLogOpen}
          className="mt-2 pt-2 border-t border-border/50">
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
            <History className="h-3.5 w-3.5" />
            <span>Change History ({violation.auditLog.length})</span>
            {isAuditLogOpen ? (
              <ChevronUp className="h-3.5 w-3.5 ml-auto" />
            ) : (
              <ChevronDown className="h-3.5 w-3.5 ml-auto" />
            )}
          </CollapsibleTrigger>
          <CollapsibleContent className="mt-2 space-y-2">
            {[...violation.auditLog].reverse().map((entry, index) => {
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

              let description: string | React.ReactNode = "";
              switch (entry.action) {
                case "created": {
                  const platformName = violation.platformName || "platform";
                  const accountName = violation.accountChannel || violation.accountHandle || "";
                  description = (
                    <>
                      Violation created on{" "}
                      <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                        {platformName}
                      </code>
                      {accountName && (
                        <>
                          {" "}for channel/user{" "}
                          <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                            {accountName}
                          </code>
                        </>
                      )}
                    </>
                  );
                  break;
                }
                case "status_changed": {
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

                  // Check if blockedAt was added or removed
                  if (entry.changes?.blockedAtAdded) {
                    const blockedAtTime =
                      entry.changes.blockedAtAdded &&
                      (typeof entry.changes.blockedAtAdded === "string" ||
                        typeof entry.changes.blockedAtAdded === "number")
                        ? new Date(
                            entry.changes.blockedAtAdded
                          ).toLocaleString()
                        : "";
                    description = (
                      <>
                        Status changed from{" "}
                        <code className={`text-xs ${getStatusColorClasses(oldStatus)} px-1.5 py-0.5 rounded font-mono`}>
                          {oldStatus}
                        </code>{" "}
                        to{" "}
                        <code className={`text-xs ${getStatusColorClasses(newStatus)} px-1.5 py-0.5 rounded font-mono`}>
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
                        <code className={`text-xs ${getStatusColorClasses(oldStatus)} px-1.5 py-0.5 rounded font-mono`}>
                          {oldStatus}
                        </code>{" "}
                        to{" "}
                        <code className={`text-xs ${getStatusColorClasses(newStatus)} px-1.5 py-0.5 rounded font-mono`}>
                          {newStatus}
                        </code>
                        <div className="mt-1 text-xs text-muted-foreground">
                          Blocked at time removed
                        </div>
                      </>
                    );
                  } else {
                    description = (
                      <>
                        Status changed from{" "}
                        <code className={`text-xs ${getStatusColorClasses(oldStatus)} px-1.5 py-0.5 rounded font-mono`}>
                          {oldStatus}
                        </code>{" "}
                        to{" "}
                        <code className={`text-xs ${getStatusColorClasses(newStatus)} px-1.5 py-0.5 rounded font-mono`}>
                          {newStatus}
                        </code>
                      </>
                    );
                  }
                  break;
                }
                case "note_added": {
                  const addedNotes =
                    entry.changes?.added ||
                    (Array.isArray(entry.newValue) &&
                    Array.isArray(entry.oldValue)
                      ? (entry.newValue as string[]).filter(
                          (n: string) =>
                            !(entry.oldValue as string[])?.includes(n)
                        )
                      : []) ||
                    [];
                  description = `Note${
                    addedNotes.length > 1 ? "s" : ""
                  } added: ${addedNotes.join(", ")}`;
                  break;
                }
                case "field_updated": {
                  if (entry.field) {
                    const fieldName = entry.field
                      .replace(/([A-Z])/g, " $1")
                      .trim()
                      .split(" ")
                      .map(
                        (word) =>
                          word.charAt(0).toUpperCase() +
                          word.slice(1).toLowerCase()
                      )
                      .join(" ");

                    if (entry.field === "violationUrl") {
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
                      const oldChannel = String(entry.oldValue || "");
                      const newChannel = String(entry.newValue || "");
                      description = (
                        <>
                          Account Channel changed from{" "}
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
                      const oldType = String(entry.oldValue || "");
                      const newType = String(entry.newValue || "");
                      description = (
                        <>
                          Content Type changed from{" "}
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
                      const oldTime =
                        entry.oldValue &&
                        (typeof entry.oldValue === "string" ||
                          typeof entry.oldValue === "number")
                          ? new Date(entry.oldValue).toLocaleString()
                          : "";
                      const newTime =
                        entry.newValue &&
                        (typeof entry.newValue === "string" ||
                          typeof entry.newValue === "number")
                          ? new Date(entry.newValue).toLocaleString()
                          : "";
                      description = (
                        <>
                          Time Added changed from{" "}
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
                        const newBlocked =
                          entry.newValue &&
                          (typeof entry.newValue === "string" ||
                            typeof entry.newValue === "number")
                            ? new Date(entry.newValue).toLocaleString()
                            : "";
                        description = (
                          <>
                            Blocked At time added:{" "}
                            <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                              {newBlocked}
                            </code>
                          </>
                        );
                      } else if (action === "removed") {
                        description = "Blocked At removed";
                      } else {
                        // action === "changed" or no action (fallback)
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
                            Blocked At changed from{" "}
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
                    } else {
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
                  } else {
                    description = "Field updated";
                  }
                  break;
                }
                case "deleted":
                  description = "Violation deleted";
                  break;
                default:
                  description = "Updated";
              }

              return (
                <div
                  key={index}
                  className="text-xs bg-muted/30 rounded-md p-2 space-y-1">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3 w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {entry.userName}
                      </span>
                    </div>
                    <span className="text-muted-foreground/70">
                      {formattedDate} at {formattedTime} • {timeAgo}
                    </span>
                  </div>
                  <div className="text-muted-foreground break-words">
                    {description}
                  </div>
                </div>
              );
            })}
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
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
