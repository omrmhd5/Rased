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
import { Maximize2, Plus, Search, AlertCircle } from "lucide-react";
import { PlatformData, Violation } from "./types";
import { ViolationItem } from "./ViolationItem";

interface PlatformCardProps {
  platform: PlatformData;
  filteredViolations: Violation[];
  cardFilter: string;
  searchQuery: string;
  onFilterChange: (filter: string) => void;
  onSearchChange: (query: string) => void;
  onExpand: () => void;
  onAddViolation: () => void;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
}

export function PlatformCard({
  platform,
  filteredViolations,
  cardFilter,
  searchQuery,
  onFilterChange,
  onSearchChange,
  onExpand,
  onAddViolation,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  getPlatformIcon,
}: PlatformCardProps) {
  const IconComponent = platform.icon;

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
          <p className="text-xs text-muted-foreground">
            {platform.totalViolations} violations •{" "}
            {platform.activeViolations} active •{" "}
            {platform.blockedCount || 0} blocked (
            {platform.blockedRate}% success)
          </p>
        </div>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={onExpand}>
                  <Maximize2 className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Expand to full width</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <Button size="sm" className="text-xs" onClick={onAddViolation}>
            <Plus className="h-3 w-3 mr-1.5" />
            Add violation
          </Button>
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 mb-4 py-2.5 px-3 bg-muted/30 rounded-lg">
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">Total views</p>
          <p className="text-sm font-bold">{platform.totalViews}</p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">
            Avg block time
          </p>
          <p className="text-sm font-bold">{platform.avgBlockTime}</p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">Blocked</p>
          <p className="text-sm font-bold">{platform.blockedCount ?? 0}</p>
          <p className="text-[10px] text-muted-foreground/70 mt-0.5">
            {platform.blockedSuccess} success rate
          </p>
        </div>
        <div className="h-6 w-px bg-border" />
        <div className="text-center flex-1">
          <p className="text-xs text-muted-foreground mb-0.5">Still active</p>
          <p className="text-sm font-bold">{platform.stillActive}</p>
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
                getPlatformIcon={getPlatformIcon}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </Card>
  );
}

