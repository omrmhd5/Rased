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
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
  const availablePlatforms = allPlatforms.filter(
    (p) => !selectedSlots.includes(p.id)
  );

  return (
    <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 sm:gap-4">
      <div className="flex gap-2 items-center flex-wrap">
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
                className="cursor-pointer px-2.5 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1.5 sm:gap-2 text-xs sm:text-sm touch-manipulation active:scale-[0.98]">
                <IconComponent
                  className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0"
                  style={{ color: platform.color }}
                />
                <span className="truncate max-w-[80px] sm:max-w-none">{platform.name}</span>
                <X
                  className="h-3 w-3 ml-0.5 sm:ml-1 hover:text-destructive flex-shrink-0 touch-manipulation"
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
              <Button variant="outline" size="sm" className="gap-1 sm:gap-1.5 h-8 sm:h-9 text-xs sm:text-sm touch-manipulation">
                <Plus className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden xs:inline">{t("matchDashboard.addPlatform")}</span>
                <span className="xs:hidden">{t("matchDashboard.add")}</span>
                <ChevronDown className="h-3 w-3" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-48 sm:w-56">
              {availablePlatforms.map((platform) => {
                const IconComponent = platform.icon;
                return (
                  <DropdownMenuItem
                    key={platform.id}
                    onClick={() => onAddPlatform(platform.id)}
                    className="gap-2 text-xs sm:text-sm touch-manipulation">
                    <IconComponent
                      className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0"
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

      <div className="flex gap-1.5 sm:gap-2 flex-wrap">
        <Badge
          variant={contentTypeFilter === "all" ? "default" : "outline"}
          className="cursor-pointer text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 touch-manipulation active:scale-[0.98]"
          onClick={() => onContentTypeFilterChange("all")}>
          {t("dashboard.allTypes")}
        </Badge>
        <Badge
          variant={contentTypeFilter === "live" ? "default" : "outline"}
          className="cursor-pointer text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 touch-manipulation active:scale-[0.98]"
          onClick={() => onContentTypeFilterChange("live")}>
          {t("dashboard.live")}
        </Badge>
        <Badge
          variant={
            contentTypeFilter === "highlights" ? "default" : "outline"
          }
          className="cursor-pointer text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 touch-manipulation active:scale-[0.98]"
          onClick={() => onContentTypeFilterChange("highlights")}>
          {t("dashboard.highlights")}
        </Badge>
        <Badge
          variant={contentTypeFilter === "other" ? "default" : "outline"}
          className="cursor-pointer text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 touch-manipulation active:scale-[0.98]"
          onClick={() => onContentTypeFilterChange("other")}>
          {t("dashboard.other")}
        </Badge>
      </div>
    </div>
  );
}

