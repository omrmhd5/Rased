import React from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Violation } from "./types";
import { MessageSquare } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddNoteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: Violation | null;
  onSave: (note: string) => void;
}

export function AddNoteDialog({
  open,
  onOpenChange,
  violation,
  onSave,
}: AddNoteDialogProps) {
  const { t } = useLanguage();
  const [note, setNote] = React.useState("");

  React.useEffect(() => {
    if (open) {
      setNote("");
    }
  }, [open]);

  const handleSave = () => {
    if (note.trim()) {
      onSave(note.trim());
      setNote("");
      onOpenChange(false);
    }
  };

  if (!violation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            {t("matchDashboard.addNoteDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("matchDashboard.addNoteDialog.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="note">{t("matchDashboard.addNoteDialog.note")}</Label>
            <Textarea
              id="note"
              placeholder={t("matchDashboard.addNoteDialog.notePlaceholder")}
              rows={4}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  handleSave();
                }
              }}
            />
          </div>

          {/* Display existing notes */}
          {violation.notes && violation.notes.length > 0 && (
            <div className="space-y-2">
              <Label>{t("matchDashboard.addNoteDialog.existingNotes")}</Label>
              <div className="rounded-lg border bg-muted/30 p-3 space-y-2 max-h-[200px] overflow-y-auto">
                {violation.notes.map((existingNote, index) => (
                  <div
                    key={index}
                    className="text-sm text-muted-foreground border-b border-border/50 pb-2 last:border-b-0 last:pb-0">
                    {existingNote}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("matchDashboard.addNoteDialog.cancel")}
          </Button>
          <Button onClick={handleSave} disabled={!note.trim()}>
            {t("matchDashboard.addNoteDialog.addNote")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

