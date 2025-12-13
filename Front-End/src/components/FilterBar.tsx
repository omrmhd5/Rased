import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface FilterBarProps {
  timeframe?: string;
  onTimeframeChange?: (value: string) => void;
  platform?: string;
  onPlatformChange?: (value: string) => void;
  match?: string;
  onMatchChange?: (value: string) => void;
  contentType?: string;
  onContentTypeChange?: (value: string) => void;
  searchQuery?: string;
  onSearchChange?: (value: string) => void;
}

export function FilterBar({
  timeframe = "current-week",
  onTimeframeChange,
  platform = "all",
  onPlatformChange,
  match = "all",
  onMatchChange,
  contentType = "all",
  onContentTypeChange,
  searchQuery = "",
  onSearchChange,
}: FilterBarProps) {
  return (
    <div className="flex flex-wrap items-center gap-3 p-4 bg-card rounded-lg border mb-6">
      <Select value={timeframe} onValueChange={onTimeframeChange}>
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Timeframe" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="current-week">Current Week</SelectItem>
          <SelectItem value="week-11">Week 11</SelectItem>
          <SelectItem value="week-10">Week 10</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="season">This Season</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>

      <Select value={platform} onValueChange={onPlatformChange}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Platform" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Platforms</SelectItem>
          <SelectItem value="twitter">X/Twitter</SelectItem>
          <SelectItem value="youtube">YouTube</SelectItem>
          <SelectItem value="facebook">Facebook</SelectItem>
          <SelectItem value="tiktok">TikTok</SelectItem>
          <SelectItem value="instagram">Instagram</SelectItem>
          <SelectItem value="telegram">Telegram</SelectItem>
          <SelectItem value="iptv">IPTV</SelectItem>
          <SelectItem value="website">Website</SelectItem>
        </SelectContent>
      </Select>

      <Select value={match} onValueChange={onMatchChange}>
        <SelectTrigger className="w-[200px]">
          <SelectValue placeholder="Match" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Matches</SelectItem>
          <SelectItem value="1">NEOM vs Al Ettifaq</SelectItem>
          <SelectItem value="2">Al Hilal vs Al Nassr</SelectItem>
          <SelectItem value="4">Al Taawoun vs Damac</SelectItem>
        </SelectContent>
      </Select>

      <Select value={contentType} onValueChange={onContentTypeChange}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Content Type" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Types</SelectItem>
          <SelectItem value="live">Live</SelectItem>
          <SelectItem value="highlights">Highlights</SelectItem>
          <SelectItem value="other">Other</SelectItem>
        </SelectContent>
      </Select>

      <div className="relative flex-1 min-w-[200px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search violations, accounts, posts..."
          value={searchQuery}
          onChange={(e) => onSearchChange?.(e.target.value)}
          className="pl-9"
        />
      </div>
    </div>
  );
}
