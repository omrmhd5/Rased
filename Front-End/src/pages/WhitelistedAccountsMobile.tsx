import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Loader2,
  UserCircle,
} from "lucide-react";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { useLanguage } from "@/contexts/LanguageContext";

interface WhitelistedAccount {
  _id: string;
  accountChannel: string;
  platforms: string[];
  platformNames?: { [key: string]: string };
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

interface Violation {
  _id: string;
  violationUrl: string;
  platformId: string;
  platformName: string;
  status: string;
  contentType: string;
  views: string;
  timeAdded: string;
  matchName?: string;
  accountChannel?: string;
  createdBy?: {
    username?: string;
    _id?: string;
  };
  matchId?:
    | {
        _id?: string;
        externalMatchId?: string;
      }
    | string;
  externalMatchId?: string;
}

interface WhitelistedAccountsMobileProps {
  accounts: WhitelistedAccount[];
  accountViolations: { [key: string]: Violation[] };
  loadingViolations: { [key: string]: boolean };
  isSuperAdmin: boolean;
  onViewViolations: (account: WhitelistedAccount) => void;
  onEdit: (account: WhitelistedAccount) => void;
  onDelete: (account: WhitelistedAccount) => void;
  getAccountNameForPlatform: (
    account: WhitelistedAccount,
    platformId: string
  ) => string;
}

// Get platform name by ID
const getPlatformName = (platformId: string): string => {
  const platformOperations = getInitialPlatformOperations();
  const platform = platformOperations.find((p) => p.id === platformId);
  return platform ? platform.name : platformId;
};

// Get platform icon by ID
const getPlatformIcon = (platformId: string) => {
  const platformOperations = getInitialPlatformOperations();
  const platform = platformOperations.find((p) => p.id === platformId);
  if (!platform) return null;
  const IconComponent = platform.icon;
  return (
    <IconComponent className="h-3 w-3" style={{ color: platform.color }} />
  );
};

// Convert backend status to statusBadge format (for comparison - keep English)
const getStatusBadgeKey = (status: string): string => {
  const statusLower = status.toLowerCase();
  if (statusLower === "removed") return "Removed";
  if (statusLower === "under review") return "Review";
  if (statusLower === "active") return "Active";
  if (statusLower === "blocked") return "Blocked";
  return status;
};

export function WhitelistedAccountsMobile({
  accounts,
  accountViolations,
  loadingViolations,
  isSuperAdmin,
  onViewViolations,
  onEdit,
  onDelete,
  getAccountNameForPlatform,
}: WhitelistedAccountsMobileProps) {
  const { t } = useLanguage();
  const platformOperations = getInitialPlatformOperations();

  // Convert backend status to translated display text
  const getStatusBadge = (status: string): string => {
    const statusLower = status.toLowerCase();
    if (statusLower === "removed") return t("problematicAccounts.removed");
    if (statusLower === "under review") return t("dashboard.underReview");
    if (statusLower === "active") return t("dashboard.active");
    if (statusLower === "blocked") return t("dashboard.blocked");
    return status;
  };

  // Convert content type to translated display text
  const getContentTypeBadge = (contentType: string): string => {
    const contentTypeLower = contentType.toLowerCase();
    if (contentTypeLower === "live") return t("dashboard.live");
    if (contentTypeLower === "highlights") return t("dashboard.highlights");
    if (contentTypeLower === "others") return t("dashboard.others");
    return contentType;
  };

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const violations = accountViolations[account._id] || [];
        const isLoading = loadingViolations[account._id] || false;
        const violationCount = violations.length;

        return (
          <Card key={account._id} className="p-4">
            {/* Header */}
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2 flex-1 min-w-0">
                <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                <span className="text-sm font-semibold truncate">
                  {account.accountChannel}
                </span>
              </div>
              {isSuperAdmin && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEdit(account)}
                    className="h-7 w-7 touch-manipulation">
                    <Edit2 className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onDelete(account)}
                    className="h-7 w-7 text-destructive hover:text-destructive dark:text-red-400 dark:hover:text-red-300 touch-manipulation">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Platforms */}
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                {t("whitelistedAccounts.platforms")}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {account.platforms.map((platformId) => {
                  const platform = platformOperations.find(
                    (p) => p.id === platformId
                  );
                  const PlatformIcon = platform?.icon;
                  const accountNameForPlatform = getAccountNameForPlatform(
                    account,
                    platformId
                  );
                  const hasCustomName =
                    account.platformNames && account.platformNames[platformId];
                  return (
                    <Badge
                      key={platformId}
                      variant="secondary"
                      className="flex items-center gap-1 text-[10px] px-2 py-0.5">
                      {PlatformIcon && (
                        <PlatformIcon
                          className="h-3 w-3"
                          style={{ color: platform.color }}
                        />
                      )}
                      <span className="truncate max-w-[60px]">
                        {getPlatformName(platformId)}
                      </span>
                      {hasCustomName && (
                        <span className="text-[9px] opacity-70 ml-0.5 truncate max-w-[40px]">
                          ({accountNameForPlatform})
                        </span>
                      )}
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Violations */}
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">
                {t("whitelistedAccounts.violations")}
              </p>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      {t("whitelistedAccounts.loading")}
                    </span>
                  </>
                ) : violationCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewViolations(account)}
                    className="h-auto p-1.5 text-xs font-normal text-amber-600 hover:text-amber-700 touch-manipulation">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    {violationCount}{" "}
                    {violationCount !== 1
                      ? t("whitelistedAccounts.violations")
                      : t("whitelistedAccounts.violation")}
                  </Button>
                ) : violationCount > 0 ? (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onViewViolations(account)}
                    className="h-auto p-1.5 text-xs font-normal text-amber-600 hover:text-amber-700 touch-manipulation">
                    <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                    {violationCount}{" "}
                    {violationCount !== 1
                      ? t("whitelistedAccounts.violations")
                      : t("whitelistedAccounts.violation")}
                  </Button>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    {t("whitelistedAccounts.noViolations")}
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            {account.notes && (
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-1">
                  {t("whitelistedAccounts.notes")}
                </p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {account.notes}
                </p>
              </div>
            )}

            {/* Created Date */}
            <div className="pt-2 border-t border-border/40">
              <p className="text-[9px] text-muted-foreground">
                {t("whitelistedAccounts.created")}:{" "}
                {account.createdAt
                  ? new Date(account.createdAt).toLocaleDateString()
                  : t("whitelistedAccounts.nA")}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
