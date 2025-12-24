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
            variant={
              violation.statusBadge === "Removed"
                ? "destructive"
                : violation.statusBadge === "Active" ||
                  violation.statusBadge === "Reported"
                ? "default"
                : violation.statusBadge === "Review"
                ? "secondary"
                : "outline"
            }
            className={cn(
              "text-xs",
              (violation.statusBadge === "Active" ||
                violation.statusBadge === "Reported") &&
                "bg-success text-success-foreground hover:bg-success/80",
              violation.statusBadge === "Blocked" &&
                "bg-muted text-muted-foreground hover:bg-muted/80 border-muted-foreground/20",
              violation.statusBadge === "Review" &&
                "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500 hover:bg-yellow-500/20 border-yellow-500/20"
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
                onClick={() => onCopyUrl(violation.violationUrl || violation.url || "")}>
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
              {violation.status === "Blocked"
                ? "Mark as active"
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
              <DropdownMenuItem onClick={() => onAddNote(platform.id, violation)}>
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
    </div>
  );
}

