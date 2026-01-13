import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import React from "react";
import { Match, PlatformData } from "./types";
import { getKSATime, extractAccountHandleFromUrl } from "./utils";
import { Plus, X } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface AddViolationSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isEditMode: boolean;
  match: Match | null;
  platformOperations: PlatformData[];
  selectedPlatformForAdd: string;
  formUrl: string;
  onFormUrlChange: (url: string) => void;
  formAccountHandle: string;
  onFormAccountHandleChange: (handle: string) => void;
  formContentType: string;
  onFormContentTypeChange: (type: string) => void;
  formStatus: "Active" | "Blocked" | "Removed" | "Under Review";
  onFormStatusChange: (
    status: "Active" | "Blocked" | "Removed" | "Under Review"
  ) => void;
  formViews: string;
  onFormViewsChange: (views: string) => void;
  formTimeAdded: string;
  onFormTimeAddedChange: (time: string) => void;
  formBlockedAt: string;
  onFormBlockedAtChange: (time: string) => void;
  formNotes: string[];
  onFormNotesChange: (notes: string[]) => void;
  onNoteChange: (index: number, note: string) => void;
  onAddNote: () => void;
  onDeleteNote: (index: number) => void;
  onSave: () => void;
}

export function AddViolationSheet({
  open,
  onOpenChange,
  isEditMode,
  match,
  platformOperations,
  selectedPlatformForAdd,
  formUrl,
  onFormUrlChange,
  formAccountHandle,
  onFormAccountHandleChange,
  formContentType,
  onFormContentTypeChange,
  formStatus,
  onFormStatusChange,
  formViews,
  onFormViewsChange,
  formTimeAdded,
  onFormTimeAddedChange,
  formBlockedAt,
  onFormBlockedAtChange,
  formNotes,
  onFormNotesChange,
  onNoteChange,
  onAddNote,
  onDeleteNote,
  onSave,
}: AddViolationSheetProps) {
  const { t, isRTL } = useLanguage();

  const handleUrlChange = (url: string) => {
    onFormUrlChange(url);
    const extractedHandle = extractAccountHandleFromUrl(url);
    if (extractedHandle) {
      onFormAccountHandleChange(extractedHandle);
    }
  };

  const handleStatusChange = (value: string) => {
    const validStatus = value as
      | "Active"
      | "Blocked"
      | "Removed"
      | "Under Review";
    onFormStatusChange(validStatus);
    // Only set blockedAt for "Blocked" status, NOT "Removed" (they are different statuses)
    if (value === "Blocked" && !formBlockedAt) {
      onFormBlockedAtChange(getKSATime());
    } else if (
      value === "Removed" ||
      value === "Active" ||
      value === "Under Review"
    ) {
      // Clear blockedAt when changing to Removed, Active, or Under Review
      onFormBlockedAtChange("");
    }
  };

  const handleViewsChange = (value: string) => {
    const cleaned = value.replace(/,/g, "");
    if (cleaned === "" || /^\d+$/.test(cleaned)) {
      const formatted =
        cleaned === "" ? "" : parseInt(cleaned).toLocaleString("en-US");
      onFormViewsChange(formatted);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
        <SheetHeader>
          <SheetTitle>
            {isEditMode
              ? t("matchDashboard.addViolationSheet.title.edit")
              : t("matchDashboard.addViolationSheet.title.add")}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? t("matchDashboard.addViolationSheet.description.edit")
              : t("matchDashboard.addViolationSheet.description.add")}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>{t("matchDashboard.addViolationSheet.match")}</Label>
            <Input
              value={match ? `${match.team1} vs ${match.team2}` : ""}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>{t("matchDashboard.addViolationSheet.platform")}</Label>
            <Input
              value={
                platformOperations.find((p) => p.id === selectedPlatformForAdd)
                  ?.name || ""
              }
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="violation-url">
              {t("matchDashboard.addViolationSheet.violationUrl")}
            </Label>
            <Input
              id="violation-url"
              placeholder={t(
                "matchDashboard.addViolationSheet.violationUrlPlaceholder"
              )}
              value={formUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-handle">
              {t("matchDashboard.addViolationSheet.accountChannel")}
            </Label>
            <Input
              id="account-handle"
              placeholder={t(
                "matchDashboard.addViolationSheet.accountChannelPlaceholder"
              )}
              value={formAccountHandle}
              onChange={(e) => onFormAccountHandleChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content-type">
              {t("matchDashboard.addViolationSheet.contentType")}
            </Label>
            <Select
              value={formContentType}
              onValueChange={onFormContentTypeChange}>
              <SelectTrigger id="content-type">
                <SelectValue
                  placeholder={t(
                    "matchDashboard.addViolationSheet.contentTypePlaceholder"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">{t("dashboard.live")}</SelectItem>
                <SelectItem value="highlights">
                  {t("dashboard.highlights")}
                </SelectItem>
                <SelectItem value="other">{t("dashboard.other")}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">
              {t("matchDashboard.addViolationSheet.status")}
            </Label>
            <Select value={formStatus} onValueChange={handleStatusChange}>
              <SelectTrigger id="status">
                <SelectValue
                  placeholder={t(
                    "matchDashboard.addViolationSheet.statusPlaceholder"
                  )}
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">{t("dashboard.active")}</SelectItem>
                <SelectItem value="Blocked">
                  {t("dashboard.blocked")}
                </SelectItem>
                <SelectItem value="Removed">
                  {t("dashboard.removed")}
                </SelectItem>
                <SelectItem value="Under Review">
                  {t("dashboard.underReview")}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="views">
              {t("matchDashboard.addViolationSheet.views")}
            </Label>
            <Input
              id="views"
              type="text"
              placeholder={t(
                "matchDashboard.addViolationSheet.viewsPlaceholder"
              )}
              value={formViews}
              onChange={(e) => handleViewsChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-added">
              {t("matchDashboard.addViolationSheet.timeAdded")}
            </Label>
            <Input
              id="time-added"
              type="datetime-local"
              value={formTimeAdded}
              onChange={(e) => onFormTimeAddedChange(e.target.value)}
              className={isRTL ? "flex-row-reverse" : ""}
            />
          </div>

          {formStatus === "Blocked" && (
            <div className="space-y-2">
              <Label htmlFor="blocked-at">
                {t("matchDashboard.addViolationSheet.blockedAt")}
              </Label>
              <Input
                id="blocked-at"
                type="datetime-local"
                value={formBlockedAt}
                onChange={(e) => onFormBlockedAtChange(e.target.value)}
                className={isRTL ? "flex-row-reverse" : ""}
              />
              <p className="text-xs text-muted-foreground">
                {t("matchDashboard.addViolationSheet.blockedAtHint")}
              </p>
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{t("matchDashboard.addViolationSheet.notes")}</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onAddNote}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                {t("matchDashboard.addViolationSheet.addNote")}
              </Button>
            </div>
            <div className="space-y-2">
              {formNotes.map((note, index) => (
                <div
                  key={index}
                  className="flex items-start gap-2 p-2.5 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
                  <Input
                    value={note}
                    onChange={(e) => onNoteChange(index, e.target.value)}
                    placeholder={t(
                      "matchDashboard.addViolationSheet.notePlaceholder"
                    )}
                    className="flex-1 border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-offset-0"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive"
                    onClick={() => onDeleteNote(index)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {formNotes.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 border border-dashed rounded-lg">
                  {t("matchDashboard.addViolationSheet.noNotes")}
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("matchDashboard.addViolationSheet.cancel")}
          </Button>
          <Button onClick={onSave}>
            {isEditMode
              ? t("matchDashboard.addViolationSheet.save.edit")
              : t("matchDashboard.addViolationSheet.save.add")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
