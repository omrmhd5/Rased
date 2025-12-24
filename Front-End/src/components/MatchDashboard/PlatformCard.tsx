import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Plus, Search, AlertCircle } from "lucide-react";
import { PlatformData, Violation } from "./types";
import { ViolationItem } from "./ViolationItem";

interface PlatformCardProps {
  platform: PlatformData;
  filteredViolations: Violation[];
  cardFilter: string;
  searchQuery: string;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onAddViolation: () => void;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
}

export function PlatformCard({
  platform,
  filteredViolations,
  cardFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onAddViolation,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
}: PlatformCardProps) {
  const IconComponent = platform.icon;

  // Calculate metrics from violations
  const violations = platform.violations;
  const totalViolations = violations.length;
  const activeCount = violations.filter((v) => v.status === "Active").length;
  const blockedCount = violations.filter((v) => v.status === "Blocked").length;
  const removedCount = violations.filter((v) => v.status === "Removed").length;
  const underReviewCount = violations.filter(
    (v) => v.status === "Under Review"
  ).length;
  const blockedOrRemovedCount = blockedCount + removedCount;
  const blockRemovalSuccessRate =
    totalViolations > 0
      ? Math.round((blockedOrRemovedCount / totalViolations) * 100)
      : 0;

  // Calculate content type counts
  const highlightsCount = violations.filter(
    (v) => (v.contentType || v.type) === "Highlights"
  ).length;
  const liveCount = violations.filter(
    (v) => (v.contentType || v.type) === "Live"
  ).length;
  const othersCount = violations.filter(
    (v) => (v.contentType || v.type) === "Other"
  ).length;

  return (
    <Card
      id={`platform-card-${platform.id}`}
      className="p-5 transition-all">
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1.5">
            <IconComponent
              className="h-5 w-5"
              style={{ color: platform.color }}
            />
            <h3 className="font-semibold">{platform.name}</h3>
          </div>
          <p className="text-xs text-muted-foreground ml-7">
            Live: {liveCount} • Highlights: {highlightsCount} • Others: {othersCount}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button size="sm" className="text-xs" onClick={onAddViolation}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add violation
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-4">
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total views</p>
          <p className="text-sm font-bold">{platform.totalViews}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Total violations</p>
          <p className="text-sm font-bold">{totalViolations}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Active</p>
          <p className="text-sm font-bold">{activeCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Blocked</p>
          <p className="text-sm font-bold">{blockedCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Removed</p>
          <p className="text-sm font-bold">{removedCount}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Avg block time</p>
          <p className="text-sm font-bold">{platform.avgBlockTime}</p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">
            Block/removal success rate
          </p>
          <p className="text-sm font-bold">{blockRemovalSuccessRate}%</p>
          <p className="text-[9px] text-muted-foreground/70 mt-0.5">
            {blockedOrRemovedCount} of {totalViolations}
          </p>
        </div>
        <div className="p-2 rounded-lg bg-muted/30 border border-border">
          <p className="text-[10px] text-muted-foreground mb-0.5">Under review</p>
          <p className="text-sm font-bold">{underReviewCount}</p>
        </div>
      </div>

      <div className="space-y-2 mb-3">
        <div className="flex gap-1">
          <Badge
            variant={cardFilter === "all" ? "default" : "outline"}
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

        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <Input
            placeholder="Search URLs or accounts..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      <ScrollArea className="h-[280px]">
        {filteredViolations.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-12">
            <AlertCircle className="h-8 w-8 text-muted-foreground mb-2" />
            <p className="text-sm text-muted-foreground mb-4">
              No violations found matching your filters.
            </p>
            <Button size="sm" variant="outline" onClick={onAddViolation}>
              <Plus className="h-3 w-3 mr-1.5" />
              Add violation
            </Button>
          </div>
        ) : (
          <div className="space-y-2">
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
        )}
      </ScrollArea>
    </Card>
  );
}

