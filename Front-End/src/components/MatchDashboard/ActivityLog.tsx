import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Activity,
  Plus,
  Trash2,
  Link,
  User,
  Film,
  Eye,
  Clock,
  Shield,
} from "lucide-react";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string;
  platform?: string;
}

type ActivityFilter =
  | "all"
  | "added"
  | "deleted"
  | "status_change"
  | "notes"
  | "notes_added"
  | "notes_changed"
  | "notes_edited"
  | "url_changed"
  | "account_changed"
  | "content_type_changed"
  | "views_changed"
  | "time_added_changed"
  | "blocked_at_changed";

interface ActivityLogProps {
  log: ActivityLogItem[];
  filter: ActivityFilter;
  onFilterChange: (filter: ActivityFilter) => void;
  getPlatformColor: (platform: string | null) => string;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case "match":
      return Zap;
    case "added":
      return Plus;
    case "deleted":
      return Trash2;
    case "status_change":
      return RefreshCw;
    case "notes":
    case "notes_added":
    case "notes_changed":
    case "notes_edited":
      return MessageSquare;
    case "url_changed":
      return Link;
    case "account_changed":
      return User;
    case "content_type_changed":
      return Film;
    case "views_changed":
      return Eye;
    case "time_added_changed":
      return Clock;
    case "blocked_at_changed":
      return Shield;
    case "violation":
      return AlertTriangle;
    default:
      return Activity;
  }
};

export function ActivityLog({
  log,
  filter,
  onFilterChange,
  getPlatformColor,
}: ActivityLogProps) {
  const filteredLog = log.filter((item) => {
    if (filter === "all") return true;
    if (filter === "notes") {
      // Show all note-related activities
      return (
        item.type === "notes_added" ||
        item.type === "notes_changed" ||
        item.type === "notes_edited"
      );
    }
    // Map filter to log item type
    const filterTypeMap: Record<ActivityFilter, string> = {
      all: "",
      added: "added",
      deleted: "deleted",
      status_change: "status_change",
      notes: "",
      notes_added: "notes_added",
      notes_changed: "notes_changed",
      notes_edited: "notes_edited",
      url_changed: "url_changed",
      account_changed: "account_changed",
      content_type_changed: "content_type_changed",
      views_changed: "views_changed",
      time_added_changed: "time_added_changed",
      blocked_at_changed: "blocked_at_changed",
    };
    return item.type === filterTypeMap[filter];
  });

  return (
    <Card className="p-6 lg:col-span-2">
      <h3 className="font-semibold mb-4">Match Activity Log</h3>

      <div className="mb-4">
        <Select value={filter} onValueChange={(value) => onFilterChange(value as ActivityFilter)}>
          <SelectTrigger className="w-full sm:w-[180px] h-8 text-xs">
            <SelectValue placeholder="Filter activity" />
          </SelectTrigger>
          <SelectContent className="max-h-[300px] p-1">
            <SelectItem value="all" className="text-xs py-1.5">All Activity</SelectItem>
            <SelectItem value="added" className="text-xs py-1.5">Violation Added</SelectItem>
            <SelectItem value="deleted" className="text-xs py-1.5">Violation Deleted</SelectItem>
            <SelectItem value="status_change" className="text-xs py-1.5">Status Change</SelectItem>
            <SelectItem value="notes" className="text-xs py-1.5">Notes (All)</SelectItem>
            <SelectItem value="notes_added" className="text-xs py-1.5">Notes - Added</SelectItem>
            <SelectItem value="notes_changed" className="text-xs py-1.5">Notes - Changed</SelectItem>
            <SelectItem value="notes_edited" className="text-xs py-1.5">Notes - Edited</SelectItem>
            <SelectItem value="url_changed" className="text-xs py-1.5">URL Changed</SelectItem>
            <SelectItem value="account_changed" className="text-xs py-1.5">Account Changed</SelectItem>
            <SelectItem value="content_type_changed" className="text-xs py-1.5">Content Type Changed</SelectItem>
            <SelectItem value="views_changed" className="text-xs py-1.5">Views Changed</SelectItem>
            <SelectItem value="time_added_changed" className="text-xs py-1.5">Time Added Changed</SelectItem>
            <SelectItem value="blocked_at_changed" className="text-xs py-1.5">Blocked At Changed</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <ScrollArea className="h-[320px]">
        <div className="space-y-2">
          {filteredLog.map((item, i) => {
            const EventIcon = getEventIcon(item.type);
            return (
              <div
                key={i}
                className="flex items-start gap-2 p-2.5 rounded hover:bg-muted/50 transition-colors group">
                <div className="shrink-0 mt-0.5">
                  <div className="w-6 h-6 rounded-full bg-muted/50 flex items-center justify-center">
                    <EventIcon className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="text-xs text-muted-foreground font-mono">
                      {item.time}
                    </p>
                    <Badge variant={item.badgeVariant} className="text-xs">
                      {item.badge}
                    </Badge>
                  </div>
                  <p className="text-xs leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {item.platform && (
                  <div className="shrink-0">
                    <Badge
                      variant="outline"
                      className="text-xs"
                      style={{
                        borderColor: getPlatformColor(item.platform),
                        color: getPlatformColor(item.platform),
                      }}>
                      {item.platform}
                    </Badge>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </Card>
  );
}



