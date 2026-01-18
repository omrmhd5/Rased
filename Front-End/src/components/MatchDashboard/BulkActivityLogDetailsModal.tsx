import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { X, Trash2, Users, UserCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

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

interface BulkActivityLogDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  bulkId: string;
  logs: ActivityLogItem[];
  getPlatformColor: (platform: string | null) => string;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  onDeleteLog?: (item: ActivityLogItem) => void;
  isSuperAdmin?: boolean;
}

export function BulkActivityLogDetailsModal({
  isOpen,
  onClose,
  bulkId,
  logs,
  getPlatformColor,
  getPlatformIcon,
  onDeleteLog,
  isSuperAdmin = false,
}: BulkActivityLogDetailsModalProps) {
  const { t, isRTL } = useLanguage();

  const firstLog = logs[0];

  const getActionTitle = () => {
    if (firstLog.type === "added") {
      return t("matchDashboard.activityLog.bulk.bulkCreation");
    } else if (firstLog.type === "deleted") {
      return t("matchDashboard.activityLog.bulk.bulkDeletion");
    } else if (firstLog.type === "status_change") {
      return t("matchDashboard.activityLog.bulk.bulkStatusChange");
    }
    return t("matchDashboard.activityLog.bulk.bulkAction");
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

  const getBadgeVariant = () => {
    if (firstLog.type === "added") return "default";
    if (firstLog.type === "deleted") return "destructive";
    if (firstLog.type === "status_change") return "secondary";
    return firstLog.badgeVariant;
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-4 border-b">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3 flex-1">
              <div
                className="p-2 rounded-lg"
                style={{
                  backgroundColor: firstLog.platform
                    ? `${getPlatformColor(firstLog.platform)}20`
                    : "#6366f120",
                }}>
                <Users
                  className="w-5 h-5"
                  style={{ color: getPlatformColor(firstLog.platform || "") }}
                />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-xl font-semibold mb-2">
                  {getActionTitle()}
                </DialogTitle>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="outline" className="bg-primary/5">
                    {logs.length} {t("matchDashboard.bulk.violations")}
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
                  {firstLog.platform && (
                    <div className="flex items-center gap-1.5">
                      {getPlatformIcon(firstLog.platform)}
                      <span className="text-xs font-medium text-muted-foreground">
                        {firstLog.platform}
                      </span>
                    </div>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {firstLog.time}
                </p>
              </div>
            </div>
          </div>
        </DialogHeader>

        <ScrollArea className="flex-1 px-6">
          <div className="py-4 space-y-3">
            {logs.map((log, index) => (
              <div
                key={index}
                className="p-4 rounded-lg border bg-card hover:bg-accent/5 transition-colors">
                <div className="flex flex-row-reverse items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-row-reverse items-center gap-2 flex-wrap mb-2">
                      <Badge
                        variant={getBadgeVariant()}
                        className={`text-xs px-2 py-0.5 h-5 font-medium ${getBadgeClassName()} ${
                          isRTL ? "text-left" : ""
                        }`}>
                        {log.badge}{" "}
                      </Badge>
                      {log.accountChannel && (
                        <code className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded font-mono">
                          {log.accountChannel}
                        </code>
                      )}
                    </div>
                    <div className="text-sm">{log.description}</div>
                    {log.violationUrl && (
                      <div className="mt-2 text-xs text-muted-foreground text-left">
                        <a
                          href={log.violationUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="hover:underline break-all">
                          {log.violationUrl}
                        </a>
                      </div>
                    )}
                  </div>
                  {isSuperAdmin && onDeleteLog && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteLog(log);
                      }}
                      className="flex-shrink-0 text-destructive hover:text-destructive hover:bg-destructive/10">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="px-6 py-4 border-t bg-muted/30">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              {t("matchDashboard.activityLog.bulk.totalLogs", {
                count: logs.length,
              })}
            </p>
            <Button onClick={onClose}>{t("whitelistedAccounts.closed")}</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
