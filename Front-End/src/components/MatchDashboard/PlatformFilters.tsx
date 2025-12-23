import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  TooltipProvider,
} from "@/components/ui/tooltip";
import { Plus, X, ChevronDown } from "lucide-react";
import { PlatformData } from "./types";

interface PlatformFiltersProps {
  selectedSlots: string[];
  allPlatforms: PlatformData[];
  contentTypeFilter: string;
  onRemovePlatform: (platformId: string) => void;
  onAddPlatform: (platformId: string) => void;
  onContentTypeFilterChange: (filter: string) => void;
}

export function PlatformFilters({
  selectedSlots,
  allPlatforms,
  contentTypeFilter,
  onRemovePlatform,
  onAddPlatform,
  onContentTypeFilterChange,
}: PlatformFiltersProps) {
  const availablePlatforms = allPlatforms.filter(
    (p) => !selectedSlots.includes(p.id)
  );

  return (
    <div className="flex items-center justify-between gap-4 flex-wrap">
      <div className="flex gap-2 items-center">
        <TooltipProvider>
          {selectedSlots.map((platformId) => {
            const platform = allPlatforms.find(
              (p) => p.id === platformId
            ) || ({} as PlatformData);
            if (!platform.id) return null;

            const IconComponent = platform.icon;
            return (
              <Badge
                key={platformId}
                variant="default"
                className="cursor-pointer px-3 py-1.5 flex items-center gap-2">
                <IconComponent
                  className="h-3.5 w-3.5"
                  style={{ color: platform.color }}
                />
                <span>{platform.name}</span>
                <X
                  className="h-3 w-3 ml-1 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemovePlatform(platformId);
                  }}
                />
              </Badge>
            );
          })}
        </TooltipProvider>

        {availablePlatforms.length > 0 && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5">
                <Plus className="h-3.5 w-3.5" />
                Add platform
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start">
              {availablePlatforms.map((platform) => {
                const IconComponent = platform.icon;
                return (
                  <DropdownMenuItem
                    key={platform.id}
                    onClick={() => onAddPlatform(platform.id)}
                    className="gap-2">
                    <IconComponent
                      className="h-4 w-4"
                      style={{ color: platform.color }}
                    />
                    {platform.name}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>

      <div className="flex gap-2">
        <Badge
          variant={contentTypeFilter === "all" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onContentTypeFilterChange("all")}>
          All types
        </Badge>
        <Badge
          variant={contentTypeFilter === "live" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onContentTypeFilterChange("live")}>
          Live
        </Badge>
        <Badge
          variant={
            contentTypeFilter === "highlights" ? "default" : "outline"
          }
          className="cursor-pointer text-xs"
          onClick={() => onContentTypeFilterChange("highlights")}>
          Highlights
        </Badge>
        <Badge
          variant={contentTypeFilter === "other" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onContentTypeFilterChange("other")}>
          Other
        </Badge>
      </div>
    </div>
  );
}

