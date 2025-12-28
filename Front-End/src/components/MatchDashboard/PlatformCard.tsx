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
import {
  Plus,
  Search,
  AlertCircle,
  Eye,
  AlertTriangle,
  Shield,
  Clock,
  TrendingUp,
  FileQuestion,
  XCircle,
} from "lucide-react";
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

  // Use backend metrics from platform object (no local calculations)
  const violations = platform.violations;
  const totalViolations = platform.totalViolations; // From backend
  const activeCount = platform.activeViolations; // From backend
  const blockedCount = platform.blockedCount; // From backend (ONLY blocked, NOT removed)
  const removedCount = platform.removedCount ?? 0; // From backend (ONLY removed, separate from blocked)
  const underReviewCount = platform.underReviewCount ?? 0; // From backend
  const blockSuccessRate = platform.blockSuccessRate ?? 0; // From backend (0-100)
  // Calculate blockedOrRemovedCount from backend values (for display only)
  const blockedOrRemovedCount = blockedCount + removedCount;

  // Calculate content type counts (only for display under platform name)
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
    <Card id={`platform-card-${platform.id}`} className="p-5 transition-all">
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
            Live: {liveCount} • Highlights: {highlightsCount} • Others:{" "}
            {othersCount}
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
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
        {/* Total views */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-chart-4/10 to-chart-4/5 border border-chart-4/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-4/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-chart-4/20 group-hover:bg-chart-4/30 transition-colors">
              <Eye className="h-2.5 w-2.5 text-chart-4" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Total views
            </p>
          </div>
          <p className="text-lg font-bold text-chart-4 transition-transform duration-300 group-hover:scale-110">
            {platform.totalViews}
          </p>
        </div>

        {/* Total violations */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-chart-1/10 to-chart-1/5 border border-chart-1/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-chart-1/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-chart-1/20 group-hover:bg-chart-1/30 transition-colors">
              <AlertTriangle className="h-2.5 w-2.5 text-chart-1" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Total violations
            </p>
          </div>
          <p className="text-lg font-bold text-chart-1 transition-transform duration-300 group-hover:scale-110">
            {totalViolations}
          </p>
        </div>

        {/* Active */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-destructive/10 to-destructive/5 border border-destructive/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-destructive/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-destructive/20 group-hover:bg-destructive/30 transition-colors">
              <AlertTriangle className="h-2.5 w-2.5 text-destructive" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Active
            </p>
          </div>
          <p className="text-lg font-bold text-destructive transition-transform duration-300 group-hover:scale-110">
            {activeCount}
          </p>
        </div>

        {/* Blocked */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-success/20 group-hover:bg-success/30 transition-colors">
              <Shield className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Blocked
            </p>
          </div>
          <p className="text-lg font-bold text-success transition-transform duration-300 group-hover:scale-110">
            {blockedCount}
          </p>
        </div>

        {/* Avg block time */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-success/10 to-success/5 border border-success/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-success/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-success/20 group-hover:bg-success/30 transition-colors">
              <Clock className="h-2.5 w-2.5 text-success" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Avg block time
            </p>
          </div>
          <p className="text-lg font-bold text-success transition-transform duration-300 group-hover:scale-110">
            {platform.avgBlockTime}
          </p>
        </div>

        {/* Removed */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-cyan-500/10 to-cyan-500/5 border border-cyan-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-cyan-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-cyan-500/20 group-hover:bg-cyan-500/30 transition-colors">
              <XCircle className="h-2.5 w-2.5 text-cyan-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Removed
            </p>
          </div>
          <p className="text-lg font-bold text-cyan-500 transition-transform duration-300 group-hover:scale-110">
            {removedCount}
          </p>
        </div>

        {/* Block success rate */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-green-500/10 to-green-500/5 border border-green-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-green-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-green-500/20 group-hover:bg-green-500/30 transition-colors">
              <TrendingUp className="h-2.5 w-2.5 text-green-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Block success rate
            </p>
          </div>
          <p className="text-lg font-bold text-green-600 dark:text-green-400 transition-transform duration-300 group-hover:scale-110">
            {totalViolations > 0
              ? Math.round((blockedCount / totalViolations) * 100)
              : 0}
            %
          </p>
          <p className="text-[9px] text-muted-foreground/70 mt-1">
            {blockedCount} of {totalViolations}
          </p>
        </div>

        {/* Under review */}
        <div className="p-3 rounded-xl bg-gradient-to-br from-yellow-500/10 to-yellow-500/5 border border-yellow-500/20 transition-all duration-300 hover:scale-105 hover:shadow-lg hover:shadow-yellow-500/20 cursor-pointer group">
          <div className="flex items-center gap-1.5 mb-2">
            <div className="p-0.5 rounded bg-yellow-500/20 group-hover:bg-yellow-500/30 transition-colors">
              <FileQuestion className="h-2.5 w-2.5 text-yellow-500" />
            </div>
            <p className="text-[10px] font-medium text-muted-foreground">
              Under review
            </p>
          </div>
          <p className="text-lg font-bold text-yellow-600 dark:text-yellow-400 transition-transform duration-300 group-hover:scale-110">
            {underReviewCount}
          </p>
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
