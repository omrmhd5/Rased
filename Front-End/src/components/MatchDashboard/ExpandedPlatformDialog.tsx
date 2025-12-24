import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Search } from "lucide-react";
import { PlatformData, Violation } from "./types";
import { ViolationItem } from "./ViolationItem";

interface ExpandedPlatformDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  platform: PlatformData | null;
  filteredViolations: Violation[];
  cardFilter: string;
  searchQuery: string;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
}

export function ExpandedPlatformDialog({
  open,
  onOpenChange,
  platform,
  filteredViolations,
  cardFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
}: ExpandedPlatformDialogProps) {
  if (!platform) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between gap-4">
            <DialogTitle>{platform.name} - All Violations</DialogTitle>
            <div className="relative w-64">
              <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search URLs or accounts..."
                value={searchQuery}
                onChange={(e) => onSearchChange(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
          <DialogDescription>
            Viewing all violations for this platform in this match
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          <div className="flex items-center justify-between gap-4 py-3 px-4 bg-muted/30 rounded-lg">
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Total views</p>
              <p className="text-sm font-bold">{platform.totalViews}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Avg block time
              </p>
              <p className="text-sm font-bold">{platform.avgBlockTime}</p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Blocked</p>
              <p className="text-sm font-bold">{platform.blockedCount ?? 0}</p>
              <p className="text-[10px] text-muted-foreground/70 mt-0.5">
                {platform.blockedSuccess} success rate
              </p>
            </div>
            <div className="h-8 w-px bg-border" />
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">Still active</p>
              <p className="text-sm font-bold">{platform.stillActive}</p>
            </div>
          </div>

          <div className="flex gap-2">
            <Badge
              variant={cardFilter === "all" || !cardFilter ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("all")}>
              All
            </Badge>
            <Badge
              variant={cardFilter === "active" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("active")}>
              Active
            </Badge>
            <Badge
              variant={cardFilter === "blocked" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("blocked")}>
              Blocked
            </Badge>
            <Badge
              variant={cardFilter === "removed" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("removed")}>
              Removed
            </Badge>
            <Badge
              variant={cardFilter === "review" ? "default" : "outline"}
              className="cursor-pointer text-xs"
              onClick={() => onFilterChange("review")}>
              Review
            </Badge>
          </div>

          <ScrollArea className="flex-1">
            <div className="space-y-2 pr-4">
              {filteredViolations.map((violation) => (
                <ViolationItem
                  key={violation.id}
                  violation={violation}
                  platform={platform}
                  onEdit={onEdit}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  onCopyUrl={onCopyUrl}
                  onAddNote={onAddNote}
                  getPlatformIcon={getPlatformIcon}
                />
              ))}
            </div>
          </ScrollArea>
        </div>
      </DialogContent>
    </Dialog>
  );
}

