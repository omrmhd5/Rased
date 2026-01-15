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
import { useLanguage } from "@/contexts/LanguageContext";
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
  canModifyViolations?: boolean; // Whether user can modify violations
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
  canModifyViolations = true,
}: ViolationItemProps) {
  const { t, isRTL } = useLanguage();
  // Force re-render every minute to update time displays
  const [, setRefresh] = useState(0);
  const [isAuditLogOpen, setIsAuditLogOpen] = useState(false);

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

  useEffect(() => {
    const interval = setInterval(() => {
      setRefresh((prev) => prev + 1);
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Helper function to format time to 12-hour format with Arabic/English period (UI only)
  const formatTimeWithPeriod = (timeString: string): string => {
    if (!timeString) return timeString;

    try {
      // Try to parse the time string as a Date
      let date: Date;

      // Check if it's already in 12-hour format with Arabic period
      if (timeString.includes("صباحا") || timeString.includes("مساءا")) {
        // Extract time part and period
        const parts = timeString.split(" ");
        const timePart = parts[0]; // e.g., "2:30"
        const period = parts[1]; // "صباحا" or "مساءا"
        const [hours, minutes] = timePart.split(":").map(Number);

        // Convert to 24-hour format
        let hour24 = hours;
        if (period === "مساءا" && hours !== 12) hour24 = hours + 12;
        if (period === "صباحا" && hours === 12) hour24 = 0;

        const now = new Date();
        date = new Date(
          now.getFullYear(),
          now.getMonth(),
          now.getDate(),
          hour24,
          minutes
        );
      } else if (timeString.match(/^\d{1,2}:\d{2}/)) {
        // Time-only format (e.g., "14:30" or "2:30 PM" or "2:30 AM")
        const now = new Date();
        const parts = timeString.split(" ");
        const timePart = parts[0];
        const period = parts[1];
        const [hours, minutes] = timePart.split(":").map(Number);

        if (
          period &&
          (period.toUpperCase() === "AM" || period.toUpperCase() === "PM")
        ) {
          // Already 12-hour format
          let hour24 = hours;
          if (period.toUpperCase() === "PM" && hours !== 12)
            hour24 = hours + 12;
          if (period.toUpperCase() === "AM" && hours === 12) hour24 = 0;
          date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hour24,
            minutes
          );
        } else {
          // 24-hour format
          date = new Date(
            now.getFullYear(),
            now.getMonth(),
            now.getDate(),
            hours,
            minutes
          );
        }
      } else if (timeString.includes("T") || timeString.includes(" ")) {
        // ISO format or date-time string
        date = new Date(timeString);
      } else {
        // Try parsing as Date directly
        date = new Date(timeString);
      }

      if (isNaN(date.getTime())) {
        // If parsing fails, return original string
        return timeString;
      }

      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const isAM = hours < 12;
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      if (isRTL) {
        const timePeriod = isAM ? "صباحا" : "مساءا";
        return `${timePeriod} ${hour12}:${minutes}`;
      } else {
        const timePeriod = isAM ? "AM" : "PM";
        return `${hour12}:${minutes} ${timePeriod}`;
      }
    } catch (error) {
      // If any error occurs, return original string
      return timeString;
    }
  };

  // Helper function to format date with Arabic AM/PM (صباحا/مساءا) for RTL, AM/PM for LTR
  const formatDateWithArabicTime = (dateValue: string | number): string => {
    if (!dateValue) return "";
    const date = new Date(dateValue);
    const dateStr = date.toLocaleDateString("en-US", {
      month: "2-digit",
      day: "2-digit",
      year: "numeric",
    });
    const hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const seconds = date.getSeconds().toString().padStart(2, "0");
    const isAM = hours < 12;
    const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

    if (isRTL) {
      const timePeriod = isAM ? "صباحا" : "مساءا";
      return `${dateStr}, ${hour12}:${minutes}:${seconds} ${timePeriod}`;
    } else {
      const timePeriod = isAM ? "AM" : "PM";
      return `${dateStr}, ${hour12}:${minutes}:${seconds} ${timePeriod}`;
    }
  };

  // Truncate URL for display - shorter on mobile
  const url = violation.violationUrl || violation.url || "";
  const truncatedUrl = url.length > 50 ? url.slice(0, 50) + "..." : url;

  // Get violation ID for scrolling - ensure it's a string
  const violationId = violation._id
    ? String(violation._id)
    : violation.id
    ? String(violation.id)
    : "";

  return (
    <div
      id={violationId ? `violation-${violationId}` : undefined}
      className="group rounded-md border bg-card p-2 sm:p-2.5 hover:bg-accent/50 transition-colors overflow-hidden">
      {/* Line 1: Status icon + time + status pill + actions */}
      {isRTL ? (
        <div className="flex items-start justify-between gap-2 min-w-0">
          {/* Action buttons (left side in RTL) - reversed order: MoreHorizontal, Lock, Edit, Copy */}
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
            {/* MoreHorizontal (first in RTL) */}
            {canModifyViolations && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0">
                    <MoreHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align={isRTL ? "start" : "end"}
                  className="w-48 sm:w-56">
                  <DropdownMenuItem
                    onClick={() => onAddNote(platform.id, violation)}
                    className="text-xs sm:text-sm touch-manipulation">
                    <FileEdit className="mr-2 h-4 w-4" />
                    {t("matchDashboard.violationItem.addNote")}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive text-xs sm:text-sm touch-manipulation"
                    onClick={() => onDelete(platform.id, violation.id)}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    {t("matchDashboard.violationItem.delete")}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Lock (second in RTL) */}
            {canModifyViolations && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                    onClick={() => onToggleStatus(platform.id, violation.id)}>
                    <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {violation.status === "Blocked" ||
                  violation.status === "Removed"
                    ? t("matchDashboard.violationItem.setToActive")
                    : t("matchDashboard.violationItem.markAsBlocked")}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Edit (third in RTL) */}
            {canModifyViolations && (
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                    onClick={() => onEdit(platform.id, violation)}>
                    <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {t("matchDashboard.violationItem.edit")}
                </TooltipContent>
              </Tooltip>
            )}

            {/* Copy (last in RTL) */}
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                  onClick={() =>
                    onCopyUrl(violation.violationUrl || violation.url || "")
                  }>
                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("matchDashboard.violationItem.copyLink")}
              </TooltipContent>
            </Tooltip>
          </div>
          {/* Status icon + time + status badge (right side in RTL) - reversed order */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 justify-end flex-row-reverse">
            <div className="text-muted-foreground flex-shrink-0">
              {getStatusIcon(violation.statusBadge || "Active")}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatTimeWithPeriod(violation.time || "")}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] sm:text-xs px-1.5 sm:px-2 py-0 flex-shrink-0",
                (violation.statusBadge === "Active" ||
                  violation.statusBadge === "Reported") &&
                  "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                violation.statusBadge === "Blocked" &&
                  "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
                violation.statusBadge === "Removed" &&
                  "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
                violation.statusBadge === "Review" &&
                  "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}>
              {translateStatus(violation.statusBadge || "Active")}
            </Badge>
          </div>
        </div>
      ) : (
        <div className="flex items-start justify-between gap-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <div className="text-muted-foreground flex-shrink-0">
              {getStatusIcon(violation.statusBadge || "Active")}
            </div>
            <span className="text-[10px] sm:text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
              {formatTimeWithPeriod(violation.time || "")}
            </span>
            <Badge
              variant="outline"
              className={cn(
                "text-[9px] sm:text-xs px-1.5 sm:px-2 py-0 flex-shrink-0",
                (violation.statusBadge === "Active" ||
                  violation.statusBadge === "Reported") &&
                  "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                violation.statusBadge === "Blocked" &&
                  "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
                violation.statusBadge === "Removed" &&
                  "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
                violation.statusBadge === "Review" &&
                  "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
              )}>
              {translateStatus(violation.statusBadge || "Active")}
            </Badge>
          </div>
          <div className="flex items-center gap-0.5 sm:gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                  onClick={() =>
                    onCopyUrl(violation.violationUrl || violation.url || "")
                  }>
                  <Copy className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                {t("matchDashboard.violationItem.copyLink")}
              </TooltipContent>
            </Tooltip>

            {canModifyViolations && (
              <>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                      onClick={() => onEdit(platform.id, violation)}>
                      <Edit className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {t("matchDashboard.violationItem.edit")}
                  </TooltipContent>
                </Tooltip>

                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0"
                      onClick={() => onToggleStatus(platform.id, violation.id)}>
                      <Lock className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    {violation.status === "Blocked" ||
                    violation.status === "Removed"
                      ? t("matchDashboard.violationItem.setToActive")
                      : t("matchDashboard.violationItem.markAsBlocked")}
                  </TooltipContent>
                </Tooltip>

                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 sm:h-7 sm:w-7 touch-manipulation p-0">
                      <MoreHorizontal className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 sm:w-56">
                    <DropdownMenuItem
                      onClick={() => onAddNote(platform.id, violation)}
                      className="text-xs sm:text-sm touch-manipulation">
                      <FileEdit className="mr-2 h-4 w-4" />
                      {t("matchDashboard.violationItem.addNote")}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="text-destructive text-xs sm:text-sm touch-manipulation"
                      onClick={() => onDelete(platform.id, violation.id)}>
                      <Trash2 className="mr-2 h-4 w-4" />
                      {t("matchDashboard.violationItem.delete")}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}
          </div>
        </div>
      )}

      {/* Line 2: Platform icon + account handle + URL + views */}
      {isRTL ? (
        <div className="flex items-center gap-2 mt-1.5 min-w-0">
          {/* Views (right side) */}
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground shrink-0">
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium whitespace-nowrap">
              {formatViewsString(violation.views || "0")}
            </span>
          </div>
          {/* Big space */}
          <div className="flex-1"></div>
          {/* Link */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={() =>
                  window.open(
                    violation.violationUrl || violation.url || "",
                    "_blank"
                  )
                }
                className="flex items-center gap-1 sm:gap-1.5 min-w-0 hover:text-foreground transition-colors rounded px-1 sm:px-1.5 py-0.5 hover:bg-accent touch-manipulation overflow-hidden text-left">
                <LinkIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                <span className="truncate min-w-0 max-w-[120px] xs:max-w-[180px] sm:max-w-none text-[10px] sm:text-xs text-muted-foreground">
                  {truncatedUrl}
                </span>
                <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 opacity-0 sm:group-hover:opacity-100" />
              </button>
            </TooltipTrigger>
            <TooltipContent className="text-xs max-w-xs break-all">
              {violation.url}
            </TooltipContent>
          </Tooltip>
          {/* Platform (left side) */}
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 text-[10px] sm:text-xs text-muted-foreground overflow-hidden text-right">
            <span className="shrink-0">{getPlatformIcon(platform.name)}</span>
            {(violation.accountChannel || violation.accountHandle) && (
              <>
                <span className="font-medium shrink-0 truncate max-w-[50px] xs:max-w-[80px] sm:max-w-none">
                  {violation.accountChannel || violation.accountHandle}
                </span>
                <span className="shrink-0 hidden sm:inline">•</span>
              </>
            )}
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-2 mt-1.5 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1 text-[10px] sm:text-xs text-muted-foreground overflow-hidden">
            <span className="shrink-0">{getPlatformIcon(platform.name)}</span>
            {(violation.accountChannel || violation.accountHandle) && (
              <>
                <span className="font-medium shrink-0 truncate max-w-[50px] xs:max-w-[80px] sm:max-w-none">
                  {violation.accountChannel || violation.accountHandle}
                </span>
                <span className="shrink-0 hidden sm:inline">•</span>
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
                  className="flex items-center gap-1 sm:gap-1.5 min-w-0 flex-1 hover:text-foreground transition-colors rounded px-1 sm:px-1.5 py-0.5 hover:bg-accent touch-manipulation overflow-hidden max-w-full">
                  <LinkIcon className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0" />
                  <span className="truncate min-w-0 max-w-[120px] xs:max-w-[180px] sm:max-w-none">
                    {truncatedUrl}
                  </span>
                  <ExternalLink className="h-2.5 w-2.5 sm:h-3 sm:w-3 shrink-0 opacity-0 sm:group-hover:opacity-100" />
                </button>
              </TooltipTrigger>
              <TooltipContent className="text-xs max-w-xs break-all">
                {violation.url}
              </TooltipContent>
            </Tooltip>
          </div>
          <div className="flex items-center gap-1 text-[10px] sm:text-xs text-muted-foreground shrink-0">
            <Eye className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span className="font-medium whitespace-nowrap">
              {formatViewsString(violation.views || "0")}
            </span>
          </div>
        </div>
      )}

      {/* Line 3: Meta text */}
      <div
        className={`text-[10px] sm:text-xs text-muted-foreground mt-1 break-words overflow-wrap-anywhere ${
          isRTL
            ? "flex flex-row-reverse flex-wrap gap-1 items-center"
            : "text-left"
        }`}>
        {(() => {
          const text = formatBlockedViolationText(violation, t, isRTL);
          if (isRTL) {
            // Split by • and reverse the order for RTL
            const parts = text.split(" • ");
            return parts.map((part, index) => (
              <span key={index} className="whitespace-nowrap">
                {part}
                {index < parts.length - 1 && <span className="mx-1">•</span>}
              </span>
            ));
          }
          return text;
        })()}
      </div>

      {/* Line 4: Notes */}
      {violation.notes && violation.notes.length > 0 && (
        <div className="mt-2 pt-2 border-t border-border/50">
          <div className="space-y-1">
            {violation.notes.map((note, index) => (
              <p
                key={index}
                className="text-[10px] sm:text-xs text-muted-foreground flex items-start gap-1.5">
                <span className="text-muted-foreground/50 shrink-0">•</span>
                <span className="flex-1 break-words">{note}</span>
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
          <CollapsibleTrigger className="flex items-center gap-2 w-full text-[10px] sm:text-xs text-muted-foreground hover:text-foreground transition-colors touch-manipulation">
            <History className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
            <span>
              {t("matchDashboard.violationItem.changeHistory")} (
              {violation.auditLog.length})
            </span>
            {isAuditLogOpen ? (
              <ChevronUp className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-auto" />
            ) : (
              <ChevronDown className="h-3 w-3 sm:h-3.5 sm:w-3.5 ml-auto" />
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
              const timeAgo = formatTimeAgo(timestamp, t);

              let description: string | React.ReactNode = "";
              switch (entry.action) {
                case "created": {
                  const platformName = violation.platformName || "platform";
                  const accountName =
                    violation.accountChannel || violation.accountHandle || "";
                  const views = violation.views || "0";
                  const status = violation.status || "";

                  description = (
                    <div className="text-left">
                      {isRTL ? (
                        <>
                          {status && (
                            <>
                              {t("matchDashboard.violationItem.andStatus")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {translateStatus(status)}
                              </code>{" "}
                            </>
                          )}
                          {views && views !== "0" && (
                            <>
                              {t("matchDashboard.violationItem.with")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>{" "}
                            </>
                          )}
                          {accountName && (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {accountName}
                              </code>{" "}
                              {t("matchDashboard.violationItem.forChannelUser")}{" "}
                            </>
                          )}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {platformName}
                          </code>{" "}
                          {t("matchDashboard.violationItem.violationCreatedOn")}
                        </>
                      ) : (
                        <>
                          {t("matchDashboard.violationItem.violationCreatedOn")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {platformName}
                          </code>
                          {accountName && (
                            <>
                              {" "}
                              {t(
                                "matchDashboard.violationItem.forChannelUser"
                              )}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {accountName}
                              </code>
                            </>
                          )}
                          {views && views !== "0" && status && (
                            <>
                              {" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>{" "}
                              {t("matchDashboard.violationItem.andStatus")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {translateStatus(status)}
                              </code>
                            </>
                          )}
                          {views && views !== "0" && !status && (
                            <>
                              {" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>
                            </>
                          )}
                          {!views && status && (
                            <>
                              {" "}
                              {t(
                                "matchDashboard.violationItem.withStatus"
                              )}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
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
                        ? formatDateWithArabicTime(entry.changes.blockedAtAdded)
                        : "";
                    description = (
                      <div className="text-left">
                        {t("matchDashboard.violationItem.statusChangedFrom")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            oldStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(oldStatus)}
                        </code>{" "}
                        {t("matchDashboard.violationItem.to")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            newStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(newStatus)}
                        </code>
                        <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          {t("matchDashboard.violationItem.blockedAtTimeAdded")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {blockedAtTime}
                          </code>
                        </div>
                      </div>
                    );
                  } else if (entry.changes?.blockedAtRemoved) {
                    description = (
                      <div className="text-left">
                        {t("matchDashboard.violationItem.statusChangedFrom")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            oldStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(oldStatus)}
                        </code>{" "}
                        {t("matchDashboard.violationItem.to")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            newStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(newStatus)}
                        </code>
                        <div className="mt-1 text-[10px] sm:text-xs text-muted-foreground">
                          {t(
                            "matchDashboard.violationItem.blockedAtTimeRemoved"
                          )}
                        </div>
                      </div>
                    );
                  } else {
                    description = (
                      <div className="text-left">
                        {t("matchDashboard.violationItem.statusChangedFrom")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            oldStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(oldStatus)}
                        </code>{" "}
                        {t("matchDashboard.violationItem.to")}{" "}
                        <code
                          className={`text-[9px] sm:text-xs ${getStatusColorClasses(
                            newStatus
                          )} px-1 sm:px-1.5 py-0.5 rounded font-mono`}>
                          {translateStatus(newStatus)}
                        </code>
                      </div>
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
                  description = (
                    <div className="text-left">
                      {addedNotes.length > 1
                        ? t("matchDashboard.violationItem.notesAdded")
                        : t("matchDashboard.violationItem.noteAdded")}{" "}
                      {t("matchDashboard.violationItem.added")}{" "}
                      {addedNotes.join(", ")}
                    </div>
                  );
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
                        <div className="text-left">
                          {t(
                            "matchDashboard.violationItem.violationUrlChangedFrom"
                          )}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono break-all">
                            {oldUrl}
                          </code>{" "}
                          {t("matchDashboard.violationItem.to")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono break-all">
                            {newUrl}
                          </code>
                        </div>
                      );
                    } else if (entry.field === "accountChannel") {
                      const oldChannel = String(entry.oldValue || "");
                      const newChannel = String(entry.newValue || "");
                      description = (
                        <div className="text-left">
                          {t(
                            "matchDashboard.violationItem.accountChannelChangedFrom"
                          )}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {oldChannel}
                          </code>{" "}
                          {t("matchDashboard.violationItem.to")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {newChannel}
                          </code>
                        </div>
                      );
                    } else if (entry.field === "contentType") {
                      const oldType = String(entry.oldValue || "");
                      const newType = String(entry.newValue || "");
                      description = (
                        <div className="text-left">
                          {t(
                            "matchDashboard.violationItem.contentTypeChangedFrom"
                          )}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {oldType}
                          </code>{" "}
                          {t("matchDashboard.violationItem.to")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {newType}
                          </code>
                        </div>
                      );
                    } else if (entry.field === "views") {
                      const oldViews = String(entry.oldValue ?? "");
                      const newViews = String(entry.newValue ?? "");
                      description = (
                        <div className="text-left">
                          {t("matchDashboard.violationItem.viewsChangedFrom")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {oldViews}
                          </code>{" "}
                          {t("matchDashboard.violationItem.to")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {newViews}
                          </code>
                        </div>
                      );
                    } else if (entry.field === "timeAdded") {
                      const timeOptions: Intl.DateTimeFormatOptions = {
                        month: "2-digit",
                        day: "2-digit",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      };
                      const oldTime =
                        entry.oldValue &&
                        (typeof entry.oldValue === "string" ||
                          typeof entry.oldValue === "number")
                          ? new Date(entry.oldValue).toLocaleString(
                              "en-US",
                              timeOptions
                            )
                          : "";
                      const newTime =
                        entry.newValue &&
                        (typeof entry.newValue === "string" ||
                          typeof entry.newValue === "number")
                          ? new Date(entry.newValue).toLocaleString(
                              "en-US",
                              timeOptions
                            )
                          : "";
                      description = (
                        <div className="text-left">
                          {t(
                            "matchDashboard.violationItem.timeAddedChangedFrom"
                          )}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {oldTime}
                          </code>{" "}
                          {t("matchDashboard.violationItem.to")}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {newTime}
                          </code>
                        </div>
                      );
                    } else if (entry.field === "blockedAt") {
                      const action = entry.changes?.action;
                      if (action === "added") {
                        const newBlocked =
                          entry.newValue &&
                          (typeof entry.newValue === "string" ||
                            typeof entry.newValue === "number")
                            ? formatDateWithArabicTime(entry.newValue)
                            : "";
                        description = (
                          <div className="text-left">
                            {t(
                              "matchDashboard.violationItem.blockedAtTimeAddedLabel"
                            )}{" "}
                            <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                              {newBlocked}
                            </code>
                          </div>
                        );
                      } else if (action === "removed") {
                        description = (
                          <div className="text-left">
                            {t("matchDashboard.violationItem.blockedAtRemoved")}
                          </div>
                        );
                      } else if (action === "changed" || !action) {
                        // action === "changed" or no action (fallback) - this is when time is explicitly changed
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
                            {t(
                              "matchDashboard.violationItem.blockedAtChangedFrom"
                            )}{" "}
                            <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                              {oldBlocked}
                            </code>{" "}
                            {t("matchDashboard.violationItem.to")}{" "}
                            <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
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
                        const removedNotes = entry.changes.removed;
                        description = (
                          <div className="text-left">
                            {removedNotes.length > 1
                              ? t("matchDashboard.violationItem.notesDeleted")
                              : t(
                                  "matchDashboard.violationItem.noteDeleted"
                                )}{" "}
                            {t("matchDashboard.violationItem.deleted")}{" "}
                            {removedNotes.join(", ")}
                          </div>
                        );
                      } else if (
                        entry.changes?.action === "changed" &&
                        entry.changes?.edited
                      ) {
                        // Note was edited - show "from X to Y" format
                        const edited = entry.changes.edited;
                        if (Array.isArray(edited) && edited.length > 0) {
                          const firstEdit = edited[0];
                          description = (
                            <div className="text-left">
                              {isRTL ? (
                                <>
                                  <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                    {firstEdit.new}
                                  </code>{" "}
                                  {t("matchDashboard.violationItem.to")}{" "}
                                  <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                    {firstEdit.old}
                                  </code>{" "}
                                  {t(
                                    "matchDashboard.violationItem.noteChangedFrom"
                                  )}
                                </>
                              ) : (
                                <>
                                  {t(
                                    "matchDashboard.violationItem.noteChangedFrom"
                                  )}{" "}
                                  <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                    {firstEdit.old}
                                  </code>{" "}
                                  {t("matchDashboard.violationItem.to")}{" "}
                                  <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                    {firstEdit.new}
                                  </code>
                                </>
                              )}
                            </div>
                          );
                        } else {
                          description = (
                            <div className="text-left">
                              {t("matchDashboard.violationItem.notesChanged")}
                            </div>
                          );
                        }
                      } else {
                        description = (
                          <div className="text-left">
                            {t("matchDashboard.violationItem.notesChanged")}
                          </div>
                        );
                      }
                    } else {
                      const oldVal = String(entry.oldValue ?? "");
                      const newVal = String(entry.newValue ?? "");
                      description = (
                        <div className="text-left">
                          {isRTL ? (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {newVal}
                              </code>{" "}
                              {t("matchDashboard.violationItem.to")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {oldVal}
                              </code>{" "}
                              {fieldName}{" "}
                              {t(
                                "matchDashboard.activityLog.descriptions.changedFrom"
                              )}
                            </>
                          ) : (
                            <>
                              {fieldName}{" "}
                              {t(
                                "matchDashboard.activityLog.descriptions.changedFrom"
                              )}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {oldVal}
                              </code>{" "}
                              {t("matchDashboard.violationItem.to")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {newVal}
                              </code>
                            </>
                          )}
                        </div>
                      );
                    }
                  } else {
                    description = (
                      <div className="text-left">
                        {t("matchDashboard.violationItem.fieldUpdated")}
                      </div>
                    );
                  }
                  break;
                }
                case "deleted": {
                  const platformName = violation.platformName || "platform";
                  const accountName =
                    violation.accountChannel || violation.accountHandle || "";
                  const views = violation.views || "0";
                  const status = violation.status || "";

                  description = (
                    <div className="text-left">
                      {isRTL ? (
                        <>
                          {views && views !== "0" && status && (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {translateStatus(status)}
                              </code>{" "}
                              {t("matchDashboard.violationItem.andStatus")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>{" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                            </>
                          )}
                          {views && views !== "0" && !status && (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>{" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                            </>
                          )}
                          {!views && status && (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {translateStatus(status)}
                              </code>{" "}
                              {t("matchDashboard.violationItem.withStatus")}{" "}
                            </>
                          )}
                          {accountName && (
                            <>
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {accountName}
                              </code>{" "}
                              {t("matchDashboard.violationItem.forChannelUser")}{" "}
                            </>
                          )}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {platformName}
                          </code>{" "}
                          {t(
                            "matchDashboard.activityLog.descriptions.violationDeletedFrom"
                          )}
                        </>
                      ) : (
                        <>
                          {t(
                            "matchDashboard.activityLog.descriptions.violationDeletedFrom"
                          )}{" "}
                          <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                            {platformName}
                          </code>
                          {accountName && (
                            <>
                              {" "}
                              {t(
                                "matchDashboard.violationItem.forChannelUser"
                              )}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {accountName}
                              </code>
                            </>
                          )}
                          {views && views !== "0" && status && (
                            <>
                              {" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>{" "}
                              {t("matchDashboard.violationItem.andStatus")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {translateStatus(status)}
                              </code>
                            </>
                          )}
                          {views && views !== "0" && !status && (
                            <>
                              {" "}
                              {t("matchDashboard.violationItem.with")}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
                                {formatViewsString(views)}{" "}
                                {t("matchDashboard.violationItem.views")}
                              </code>
                            </>
                          )}
                          {!views && status && (
                            <>
                              {" "}
                              {t(
                                "matchDashboard.violationItem.withStatus"
                              )}{" "}
                              <code className="text-[9px] sm:text-xs bg-primary/10 text-primary px-1 sm:px-1.5 py-0.5 rounded font-mono">
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
                default:
                  description = (
                    <div className="text-left">
                      {t("matchDashboard.violationItem.updated")}
                    </div>
                  );
              }

              return (
                <div
                  key={index}
                  className="text-[10px] sm:text-xs bg-muted/30 rounded-md p-2 space-y-1">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 sm:gap-0">
                    <div className="flex items-center gap-1.5">
                      <User className="h-2.5 w-2.5 sm:h-3 sm:w-3 text-muted-foreground" />
                      <span className="font-medium text-foreground">
                        {entry.userName}
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-xs text-muted-foreground/70">
                      {formattedDate}{" "}
                      {t("matchDashboard.activityLog.dateTime.at")}{" "}
                      {formattedTime} • {timeAgo}
                    </span>
                  </div>
                  <div className="text-[10px] sm:text-xs text-muted-foreground break-words">
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

function formatTimeAgo(
  date: Date,
  t: (key: string, params?: Record<string, string | number>) => string
): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);

  if (diffMins < 1) return t("matchDashboard.activityLog.timeAgo.justNow");
  if (diffMins < 60)
    return t("matchDashboard.activityLog.timeAgo.minutesAgo", {
      minutes: diffMins,
    });
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24)
    return t("matchDashboard.activityLog.timeAgo.hoursAgo", {
      hours: diffHours,
    });
  const diffDays = Math.floor(diffHours / 24);
  return t("matchDashboard.activityLog.timeAgo.daysAgo", { days: diffDays });
}
