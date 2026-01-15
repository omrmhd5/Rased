import { Violation, PlatformData } from "./types";
import { Badge } from "@/components/ui/badge";
import { Layers } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";
import { cn } from "@/lib/utils";
import { BulkViolationDetailsModal } from "./BulkViolationDetailsModal";

interface BulkViolationItemProps {
  bulkId: string;
  violations: Violation[];
  platformId: string;
  platform: PlatformData;
  onEdit: (platformId: string, violation: Violation) => void;
  onToggleStatus: (platformId: string, violationId: number | string) => void;
  onDelete: (platformId: string, violationId: number | string) => void;
  onCopyUrl: (url: string) => void;
  onAddNote: (platformId: string, violation: Violation) => void;
  getPlatformIcon: (platformName: string) => React.ReactNode;
  canModifyViolations: boolean;
}

export function BulkViolationItem({
  bulkId,
  violations,
  platformId,
  platform,
  onEdit,
  onToggleStatus,
  onDelete,
  onCopyUrl,
  onAddNote,
  getPlatformIcon,
  canModifyViolations,
}: BulkViolationItemProps) {
  const { t, isRTL } = useLanguage();
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (violations.length === 0) return null;

  // Use the first violation as the representative for time
  const representative = violations[0];
  const count = violations.length;

  // Calculate aggregate stats
  const activeCount = violations.filter((v) => v.status === "Active").length;
  const blockedCount = violations.filter((v) => v.status === "Blocked").length;
  const removedCount = violations.filter((v) => v.status === "Removed").length;
  const underReviewCount = violations.filter(
    (v) => v.status === "Under Review"
  ).length;

  // Calculate total views
  const totalViews = violations.reduce((sum, v) => {
    if (!v.views || v.views === "0") return sum;
    const viewsStr = v.views.replace(/[^0-9,]/g, "").replace(/,/g, "");
    return sum + (parseFloat(viewsStr) || 0);
  }, 0);
  const formattedTotalViews = totalViews.toLocaleString("en-US");

  // Format time created and time ago
  const formatTimeWithPeriod = (timeString: string): string => {
    if (!timeString) return "";
    try {
      const date = new Date(timeString);
      if (isNaN(date.getTime())) return "";

      const hours = date.getHours();
      const minutes = date.getMinutes().toString().padStart(2, "0");
      const isAM = hours < 12;
      const hour12 = hours === 0 ? 12 : hours > 12 ? hours - 12 : hours;

      if (isRTL) {
        const timePeriod = isAM ? "صباحا" : "مساءا";
        return `${timePeriod} ${hour12}:${minutes}`;
      } else {
        const timePeriod = isAM ? "AM" : "PM";
        return `${hour12}:${minutes} ${timePeriod}`;
      }
    } catch {
      return "";
    }
  };

  const formatDate = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return "";

      return date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });
    } catch {
      return "";
    }
  };

  const formatTimeAgo = (dateString: string): string => {
    if (!dateString) return "";
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);

      const agoText = t("matchDashboard.violationItem.timeUnits.ago");
      const mText = t("matchDashboard.violationItem.timeUnits.m");
      const hText = t("matchDashboard.violationItem.timeUnits.h");
      const dText = t("matchDashboard.violationItem.timeUnits.d");

      if (diffMins < 1) {
        return t("matchDashboard.violationItem.justNow");
      } else if (diffMins < 60) {
        return isRTL
          ? `${agoText} ${diffMins}${mText}`
          : `${diffMins}${mText} ${agoText}`;
      } else if (diffMins < 1440) {
        const hours = Math.floor(diffMins / 60);
        return isRTL
          ? `${agoText} ${hours}${hText}`
          : `${hours}${hText} ${agoText}`;
      } else {
        const days = Math.floor(diffMins / 1440);
        return isRTL
          ? `${agoText} ${days}${dText}`
          : `${days}${dText} ${agoText}`;
      }
    } catch {
      return "";
    }
  };

  const timeCreated = formatTimeWithPeriod(representative.timeAdded);
  const dateCreated = formatDate(representative.timeAdded);
  const timeAgo = formatTimeAgo(representative.timeAdded);

  return (
    <>
      <div
        className="border rounded-lg overflow-hidden bg-card cursor-pointer hover:bg-accent/50 transition-colors"
        onClick={() => setIsModalOpen(true)}>
        {/* Bulk Header */}
        <div
          className={cn(
            "p-3 flex items-center gap-3",
            isRTL && "flex-row-reverse"
          )}>
          <div className="flex items-center gap-2 shrink-0">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <Badge variant="secondary" className="font-mono text-xs">
              {count} {t("matchDashboard.bulk.violations")}
            </Badge>
          </div>

          <div
            className={cn(
              "flex items-center gap-2 flex-wrap flex-1",
              isRTL && "flex-row-reverse"
            )}>
            {activeCount > 0 && (
              <Badge className="bg-red-500/10 text-red-600 dark:text-red-400 text-xs">
                {activeCount} {t("dashboard.active")}
              </Badge>
            )}
            {blockedCount > 0 && (
              <Badge className="bg-green-500/10 text-green-600 dark:text-green-400 text-xs">
                {blockedCount} {t("dashboard.blocked")}
              </Badge>
            )}
            {removedCount > 0 && (
              <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400 text-xs">
                {removedCount} {t("dashboard.removed")}
              </Badge>
            )}
            {underReviewCount > 0 && (
              <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400 text-xs">
                {underReviewCount} {t("dashboard.underReview")}
              </Badge>
            )}
          </div>

          <div
            className={cn(
              "text-xs text-muted-foreground shrink-0",
              isRTL && "text-right"
            )}>
            {representative.accountChannel}
          </div>
        </div>

        {/* Time and Views Info */}
        <div
          className={cn(
            "px-3 pb-3 flex items-center gap-2 text-xs text-muted-foreground flex-wrap",
            isRTL && "flex-row-reverse"
          )}>
          <span>{timeCreated}</span>
          <span>•</span>
          <span>{dateCreated}</span>
          <span>•</span>
          <span>{timeAgo}</span>
          {totalViews > 0 && (
            <>
              <span>•</span>
              <span className="font-medium">
                {formattedTotalViews} {t("dashboard.views")}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Bulk Violations Details Modal */}
      <BulkViolationDetailsModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        bulkId={bulkId}
        violations={violations}
        platform={platform}
        onEdit={onEdit}
        onToggleStatus={onToggleStatus}
        onDelete={onDelete}
        onCopyUrl={onCopyUrl}
        onAddNote={onAddNote}
        getPlatformIcon={getPlatformIcon}
        canModifyViolations={canModifyViolations}
      />
    </>
  );
}
