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
import { AlertTriangle, Loader2 } from "lucide-react";

interface BulkDeleteConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violationCount: number;
  onConfirm: () => void;
  title?: string;
  description?: string;
  confirmText?: string;
  isLoading?: boolean; // Loading state while deleting
}

export function BulkDeleteConfirmDialog({
  open,
  onOpenChange,
  violationCount,
  onConfirm,
  title,
  description,
  confirmText,
  isLoading = false,
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
                {title ||
                  t("matchDashboard.bulk.deleteConfirm.title") ||
                  "Delete All Violations"}
              </DialogTitle>
              <DialogDescription>
                {description ||
                  t("matchDashboard.bulk.deleteConfirm.description") ||
                  "This action cannot be undone."}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            {violationCount > 0
              ? t("matchDashboard.bulk.deleteConfirm.message", {
                  count: violationCount,
                }) ||
                `Are you sure you want to delete all ${violationCount} violations? This will permanently remove them from the system.`
              : t("matchDashboard.bulk.deleteConfirm.messageGeneric") ||
                "Are you sure you want to delete these items? This will permanently remove them from the system."}
          </p>
        </div>

        <DialogFooter className="gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={(e) => {
              e.preventDefault();
              onOpenChange(false);
            }}
            disabled={isLoading}>
            {t("matchDashboard.bulk.deleteConfirm.cancel") || "Cancel"}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={(e) => {
              e.preventDefault();
              onConfirm();
            }}
            disabled={isLoading}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {confirmText ||
              t("matchDashboard.bulk.deleteConfirm.confirm") ||
              "Delete All"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
