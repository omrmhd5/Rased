import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/contexts/LanguageContext";
import { AlertTriangle } from "lucide-react";

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationCount: number;
  onConfirm: () => void;
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  violationCount,
  onConfirm,
}: BulkDeleteConfirmDialogProps) {
  const { t } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-full bg-destructive/10">
              <AlertTriangle className="h-5 w-5 text-destructive" />
            </div>
            <div>
              <DialogTitle>
                {t("matchDashboard.bulk.deleteConfirm.title") ||
                  "Delete All Violations"}
              </DialogTitle>
              <DialogDescription>
                {t("matchDashboard.bulk.deleteConfirm.description") ||
                  "This action cannot be undone."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {t("matchDashboard.bulk.deleteConfirm.message", {
              count: violationCount,
            }) ||
              `Are you sure you want to delete all ${violationCount} violations? This will permanently remove them from the system.`}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("matchDashboard.bulk.deleteConfirm.cancel") || "Cancel"}
          </Button>
          <Button variant="destructive" onClick={onConfirm}>
            {t("matchDashboard.bulk.deleteConfirm.confirm") || "Delete All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
