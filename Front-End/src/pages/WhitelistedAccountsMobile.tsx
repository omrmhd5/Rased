import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  CheckCircle2,
  AlertTriangle,
  Edit2,
  Trash2,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { getInitialPlatformOperations } from "@/components/MatchDashboard/constants";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";
import { useNavigate } from "react-router-dom";

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
  expandedAccounts: Set<string>;
  isSuperAdmin: boolean;
  onToggleExpanded: (accountId: string) => void;
  onEdit: (account: WhitelistedAccount) => void;
  onDelete: (account: WhitelistedAccount) => void;
  getAccountNameForPlatform: (account: WhitelistedAccount, platformId: string) => string;
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

// Convert backend status to statusBadge format
const getStatusBadge = (status: string): string => {
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
  expandedAccounts,
  isSuperAdmin,
  onToggleExpanded,
  onEdit,
  onDelete,
  getAccountNameForPlatform,
}: WhitelistedAccountsMobileProps) {
  const navigate = useNavigate();
  const platformOperations = getInitialPlatformOperations();

  return (
    <div className="space-y-3">
      {accounts.map((account) => {
        const violations = accountViolations[account._id] || [];
        const isLoading = loadingViolations[account._id] || false;
        const isExpanded = expandedAccounts.has(account._id);
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
                    className="h-7 w-7 text-destructive hover:text-destructive touch-manipulation">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              )}
            </div>

            {/* Platforms */}
            <div className="mb-3">
              <p className="text-[10px] text-muted-foreground mb-1.5">Platforms</p>
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
                    account.platformNames &&
                    account.platformNames[platformId];
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
              <p className="text-[10px] text-muted-foreground mb-1.5">Violations</p>
              <div className="flex items-center gap-2">
                {isLoading ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />
                    <span className="text-xs text-muted-foreground">
                      Loading...
                    </span>
                  </>
                ) : violationCount > 0 ? (
                  <Collapsible
                    open={isExpanded}
                    onOpenChange={() => onToggleExpanded(account._id)}>
                    <CollapsibleTrigger asChild>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto p-1.5 text-xs font-normal text-amber-600 hover:text-amber-700 touch-manipulation">
                        <AlertTriangle className="h-3.5 w-3.5 mr-1" />
                        {violationCount} violation{violationCount !== 1 ? "s" : ""}
                        {isExpanded ? (
                          <ChevronUp className="h-3 w-3 ml-1" />
                        ) : (
                          <ChevronDown className="h-3 w-3 ml-1" />
                        )}
                      </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      <div className="mt-2 space-y-2 max-h-48 overflow-y-auto">
                        {violations.map((violation) => {
                          const matchId =
                            (typeof violation.matchId === "object" &&
                              violation.matchId?.externalMatchId) ||
                            violation.externalMatchId ||
                            (typeof violation.matchId === "string"
                              ? violation.matchId
                              : null);

                          return (
                            <div
                              key={violation._id}
                              className={cn(
                                "flex flex-col gap-2 p-2.5 border rounded-lg bg-background cursor-pointer transition-colors touch-manipulation",
                                "active:bg-accent/50 active:border-primary/50"
                              )}
                              onClick={() => {
                                if (matchId) {
                                  navigate(`/match/${matchId}`);
                                } else {
                                  window.open(
                                    violation.violationUrl,
                                    "_blank"
                                  );
                                }
                              }}>
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <Badge
                                  variant="outline"
                                  className="text-[9px] flex items-center gap-1 px-1.5 py-0">
                                  {getPlatformIcon(violation.platformId) && (
                                    <span>
                                      {getPlatformIcon(violation.platformId)}
                                    </span>
                                  )}
                                  {violation.platformName}
                                </Badge>
                                <Badge
                                  variant="outline"
                                  className={cn(
                                    "text-[9px] px-1.5 py-0",
                                    (getStatusBadge(violation.status) === "Active" ||
                                      getStatusBadge(violation.status) === "Reported") &&
                                      "bg-red-100 text-red-700 hover:bg-red-200 border-red-300 dark:bg-red-900/30 dark:text-red-400",
                                    getStatusBadge(violation.status) === "Blocked" &&
                                      "bg-green-100 text-green-700 hover:bg-green-200 border-green-300 dark:bg-green-900/30 dark:text-green-400",
                                    getStatusBadge(violation.status) === "Removed" &&
                                      "bg-cyan-100 text-cyan-700 hover:bg-cyan-200 border-cyan-300 dark:bg-cyan-900/30 dark:text-cyan-400",
                                    (getStatusBadge(violation.status) === "Review" ||
                                      getStatusBadge(violation.status) === "Under Review") &&
                                      "bg-yellow-100 text-yellow-700 hover:bg-yellow-200 border-yellow-300 dark:bg-yellow-900/30 dark:text-yellow-400"
                                  )}>
                                  {getStatusBadge(violation.status)}
                                </Badge>
                                <Badge variant="outline" className="text-[9px] px-1.5 py-0">
                                  {violation.contentType}
                                </Badge>
                              </div>
                              {violation.matchName && (
                                <p className="text-xs text-muted-foreground line-clamp-1">
                                  {violation.matchName}
                                </p>
                              )}
                              <p className="text-[9px] text-muted-foreground">
                                Added: {new Date(violation.timeAdded).toLocaleString()}
                              </p>
                            </div>
                          );
                        })}
                      </div>
                    </CollapsibleContent>
                  </Collapsible>
                ) : (
                  <span className="text-xs text-muted-foreground">
                    No violations
                  </span>
                )}
              </div>
            </div>

            {/* Notes */}
            {account.notes && (
              <div className="mb-3">
                <p className="text-[10px] text-muted-foreground mb-1">Notes</p>
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {account.notes}
                </p>
              </div>
            )}

            {/* Created Date */}
            <div className="pt-2 border-t border-border/40">
              <p className="text-[9px] text-muted-foreground">
                Created:{" "}
                {account.createdAt
                  ? new Date(account.createdAt).toLocaleDateString()
                  : "N/A"}
              </p>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

