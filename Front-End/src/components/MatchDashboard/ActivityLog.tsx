import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Zap,
  AlertTriangle,
  RefreshCw,
  MessageSquare,
  Activity,
} from "lucide-react";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string;
  platform?: string;
}

interface ActivityLogProps {
  log: ActivityLogItem[];
  filter: "all" | "violations" | "status" | "notes";
  onFilterChange: (filter: "all" | "violations" | "status" | "notes") => void;
  getPlatformColor: (platform: string | null) => string;
}

const getEventIcon = (type: string) => {
  switch (type) {
    case "match":
      return Zap;
    case "violation":
      return AlertTriangle;
    case "status":
      return RefreshCw;
    case "note":
      return MessageSquare;
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
    if (filter === "violations") return item.type === "violation";
    if (filter === "status") return item.type === "status";
    if (filter === "notes") return item.type === "note";
    return true;
  });

  return (
    <Card className="p-6 lg:col-span-2">
      <h3 className="font-semibold mb-4">Match Activity Log</h3>

      <div className="flex gap-2 mb-4 flex-wrap">
        <Badge
          variant={filter === "all" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onFilterChange("all")}>
          All
        </Badge>
        <Badge
          variant={filter === "violations" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onFilterChange("violations")}>
          Violations
        </Badge>
        <Badge
          variant={filter === "status" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onFilterChange("status")}>
          Status changes
        </Badge>
        <Badge
          variant={filter === "notes" ? "default" : "outline"}
          className="cursor-pointer text-xs"
          onClick={() => onFilterChange("notes")}>
          Notes
        </Badge>
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

