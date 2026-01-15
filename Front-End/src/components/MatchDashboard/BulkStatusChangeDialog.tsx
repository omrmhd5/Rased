import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLanguage } from "@/contexts/LanguageContext";
import { Badge } from "@/components/ui/badge";
import { getKSATime } from "./utils";

interface BulkStatusChangeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationCount: number;
  selectedStatus: "Active" | "Blocked" | "Removed" | "Under Review";
  onStatusChange: (
    status: "Active" | "Blocked" | "Removed" | "Under Review"
  ) => void;
  blockedAt: string;
  onBlockedAtChange: (time: string) => void;
  onConfirm: () => void;
}

export function BulkStatusChangeDialog({
  open,
  onOpenChange,
  violationCount,
  selectedStatus,
  onStatusChange,
  blockedAt,
  onBlockedAtChange,
  onConfirm,
}: BulkStatusChangeDialogProps) {
  const { t, isRTL } = useLanguage();

  const handleStatusChange = (value: string) => {
    const validStatus = value as
      | "Active"
      | "Blocked"
      | "Removed"
      | "Under Review";
    onStatusChange(validStatus);

    // Auto-set blockedAt when Blocked is selected
    if (value === "Blocked" && !blockedAt) {
      onBlockedAtChange(getKSATime());
    } else if (
      value === "Removed" ||
      value === "Active" ||
      value === "Under Review"
    ) {
      // Clear blockedAt for other statuses
      onBlockedAtChange("");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("matchDashboard.bulk.statusChange.title") ||
              "Change Status for All"}
          </DialogTitle>
          <DialogDescription>
            {t("matchDashboard.bulk.statusChange.description", {
              count: violationCount,
            }) || `Change the status for all ${violationCount} violations.`}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="bulk-status">
              {t("matchDashboard.addViolationSheet.status") || "Status"}
            </Label>
            <Select value={selectedStatus} onValueChange={handleStatusChange}>
              <SelectTrigger id="bulk-status">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-red-500/10 text-red-600 dark:text-red-400">
                      {t("dashboard.active")}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="Blocked">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-green-500/10 text-green-600 dark:text-green-400">
                      {t("dashboard.blocked")}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="Removed">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-purple-500/10 text-purple-600 dark:text-purple-400">
                      {t("dashboard.removed")}
                    </Badge>
                  </div>
                </SelectItem>
                <SelectItem value="Under Review">
                  <div className="flex items-center gap-2">
                    <Badge className="bg-yellow-500/10 text-yellow-600 dark:text-yellow-400">
                      {t("dashboard.underReview")}
                    </Badge>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          {selectedStatus === "Blocked" && (
            <div className="space-y-2">
              <Label htmlFor="bulk-blocked-at">
                {t("matchDashboard.addViolationSheet.blockedAt") ||
                  "Blocked At"}
              </Label>
              <Input
                id="bulk-blocked-at"
                type="datetime-local"
                value={blockedAt}
                onChange={(e) => onBlockedAtChange(e.target.value)}
                className={isRTL ? "flex-row-reverse" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("matchDashboard.addViolationSheet.blockedAtHint") ||
                  "Set the time when the violation was blocked"}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("matchDashboard.bulk.statusChange.cancel") || "Cancel"}
          </Button>
          <Button onClick={onConfirm}>
            {t("matchDashboard.bulk.statusChange.confirm") || "Change Status"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
