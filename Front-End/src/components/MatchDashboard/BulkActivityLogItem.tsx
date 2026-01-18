import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  RefreshCw,
  UserCircle,
} from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { BulkActivityLogDetailsModal } from "./BulkActivityLogDetailsModal";

interface ActivityLogItem {
  type: string;
  time: string;
  badge: string;
  badgeVariant: "default" | "secondary" | "destructive" | "outline";
  description: string | React.ReactNode;
  platform?: string;
  timestamp?: number;
  userName?: string;
  violationId?: string;
  logEntryId?: string;
  deletedLogId?: string;
  accountChannel?: string;
  violationUrl?: string;
  bulkId?: string;
}

interface BulkActivityLogItemProps {
  bulkId: string;
  logs: ActivityLogItem[];
  getPlatformColor: (platform: string | null) => string;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  onDeleteLog?: (item: ActivityLogItem) => void;
  isSuperAdmin?: boolean;
}

// Helper function to get event icon based on type
const getEventIcon = (type: string) => {
  switch (type) {
    case "added":
      return Plus;
    case "deleted":
      return Trash2;
    case "status_change":
      return RefreshCw;
    default:
      return RefreshCw;
  }
};

export function BulkActivityLogItem({
  bulkId,
  logs,
  getPlatformColor,
  getPlatformIcon,
  onDeleteLog,
  isSuperAdmin = false,
}: BulkActivityLogItemProps) {
  const { t, isRTL } = useLanguage();
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Get the first log for summary display
  const firstLog = logs[0];
  const count = logs.length;

  // Get the event icon
  const EventIcon = getEventIcon(firstLog.type);

  // Determine badge variant and color based on type
  const getBadgeVariant = () => {
    if (firstLog.type === "added") return "default";
    if (firstLog.type === "deleted") return "destructive";
    if (firstLog.type === "status_change") return "secondary";
    return firstLog.badgeVariant;
  };

  const getBadgeClassName = () => {
    if (firstLog.type === "added") {
      return "bg-success text-white border-success/20";
    } else if (firstLog.type === "deleted") {
      return "bg-destructive text-white border-destructive/20";
    } else if (firstLog.type === "status_change") {
      return "bg-cyan-500 text-white border-cyan-500/20";
    }
    return "";
  };

  return (
    <>
      <div
        className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-start gap-3 p-3 rounded-lg border border-border/50 hover:border-border hover:bg-muted/30 transition-all group relative cursor-pointer`}
        onClick={() => setIsDetailsModalOpen(true)}>
        {/* Icon */}
        <div className="shrink-0 mt-0.5">
          <div className="w-8 h-8 rounded-lg bg-muted/60 flex items-center justify-center group-hover:bg-muted/80 transition-colors">
            <EventIcon className="h-4 w-4 text-muted-foreground" />
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`flex items-center gap-2 mb-2 flex-wrap ${
              isRTL ? "flex-row-reverse justify-start" : ""
            }`}>
            <p
              className={`text-xs text-muted-foreground ${
                isRTL ? "text-left" : ""
              }`}>
              {firstLog.time}
            </p>
            <Badge
              variant={getBadgeVariant()}
              className={`text-xs px-2 py-0.5 h-5 font-medium ${getBadgeClassName()} ${
                isRTL ? "text-left" : ""
              }`}>
              {firstLog.badge}
            </Badge>
            <Badge
              variant="outline"
              className="bg-primary/5 text-xs px-2 py-0.5 h-5">
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.bulk.violations")}
              </div>
            </Badge>
            {firstLog.userName && (
              <div
                className={`flex ${isRTL ? "flex-row-reverse" : "flex-row"} items-center gap-1.5 px-2 py-0.5 rounded-md bg-muted/40 border border-border/50 ${
                  isRTL ? "text-left" : ""
                }`}>
                <UserCircle className="h-3.5 w-3.5 text-muted-foreground" />
                <span
                  className={`text-xs text-muted-foreground font-medium ${
                    isRTL ? "text-left" : ""
                  }`}>
                  {firstLog.userName}
                </span>
              </div>
            )}
          </div>

          {/* Bulk description */}
          <div className="text-sm text-left leading-relaxed text-foreground break-words mb-2">
            {firstLog.type === "added" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.activityLog.bulk.violationsCreated")}
              </div>
            )}
            {firstLog.type === "deleted" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count} {t("matchDashboard.activityLog.bulk.violationsDeleted")}
              </div>
            )}
            {firstLog.type === "status_change" && (
              <div dir={isRTL ? "rtl" : "ltr"}>
                {count}{" "}
                {t("matchDashboard.activityLog.bulk.violationsStatusChanged")}
              </div>
            )}
          </div>
        </div>

        {/* Platform icon */}
        {firstLog.platform && (
          <div className="shrink-0 mt-0.5">
            <div className="w-8 h-8 rounded-lg bg-muted/40 flex items-center justify-center border border-border/50 group-hover:bg-muted/60 transition-colors">
              {getPlatformIcon(firstLog.platform)}
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
      <BulkActivityLogDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        bulkId={bulkId}
        logs={logs}
        getPlatformColor={getPlatformColor}
        getPlatformIcon={getPlatformIcon}
        onDeleteLog={onDeleteLog}
        isSuperAdmin={isSuperAdmin}
      />
    </>
  );
}
