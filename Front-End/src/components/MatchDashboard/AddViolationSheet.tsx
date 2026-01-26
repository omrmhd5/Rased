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
import { Alert, AlertDescription } from "@/components/ui/alert";
import React from "react";
import { Match, PlatformData } from "./types";
import { getKSATime, extractAccountHandleFromUrl } from "./utils";
import { Plus, X, Loader2, AlertTriangle } from "lucide-react";
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
    status: "Active" | "Blocked" | "Removed" | "Under Review",
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
  isLoading?: boolean; // Loading state while saving
  allowDuplicates?: boolean; // Whether duplicates are allowed
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
  isLoading = false,
  allowDuplicates = false,
}: AddViolationSheetProps) {
  const { t, isRTL } = useLanguage();

  // Check for duplicate URLs
  const getDuplicateUrls = () => {
    const urls = formUrl
      .split("\n")
      .map((url) => url.trim())
      .filter((url) => url !== "");

    const seen = new Set<string>();
    const duplicates = new Set<string>();

    urls.forEach((url) => {
      if (seen.has(url)) {
        duplicates.add(url);
      } else {
        seen.add(url);
      }
    });

    return Array.from(duplicates);
  };

  const duplicateUrls = getDuplicateUrls();
  const hasDuplicates = duplicateUrls.length > 0;
  const isDuplicateBlocked = hasDuplicates && !allowDuplicates;

  const handleUrlChange = (url: string) => {
    onFormUrlChange(url);
    // Extract account handle from the first URL only
    const firstUrl = url.split("\n")[0].trim();
    if (firstUrl) {
      const extractedHandle = extractAccountHandleFromUrl(firstUrl);
      if (extractedHandle) {
        onFormAccountHandleChange(extractedHandle);
      }
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
            <Textarea
              id="violation-url"
              placeholder={t(
                "matchDashboard.addViolationSheet.violationUrlPlaceholder",
              )}
              value={formUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
              className="min-h-[80px] resize-y"
            />
            <div
              className={`flex items-center justify-between mt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
              <p className="text-xs text-muted-foreground">
                {t("matchDashboard.addViolationSheet.multipleUrlsHint")}
              </p>
              <p className="text-xs font-medium">
                {t("matchDashboard.addViolationSheet.urlCount", {
                  count: formUrl
                    .split("\n")
                    .filter((line) => line.trim() !== "")
                    .length.toString(),
                })}
              </p>
            </div>

            {/* Duplicate URLs Warning */}
            {hasDuplicates && (
              <Alert
                className={
                  isDuplicateBlocked
                    ? "border-destructive bg-destructive/5"
                    : "border-yellow-600 bg-yellow-50 dark:bg-yellow-950/20"
                }>
                <AlertTriangle
                  className={`h-4 w-4 ${isDuplicateBlocked ? "text-destructive" : "text-yellow-600 dark:text-yellow-400"}`}
                />
                <AlertDescription
                  className={
                    isDuplicateBlocked
                      ? "text-destructive"
                      : "text-yellow-800 dark:text-yellow-200"
                  }>
                  {isDuplicateBlocked
                    ? t(
                        "matchDashboard.addViolationSheet.duplicatesNotAllowed",
                        {
                          count: duplicateUrls.length.toString(),
                        },
                      )
                    : t("matchDashboard.addViolationSheet.duplicatesAllowed", {
                        count: duplicateUrls.length.toString(),
                      })}
                </AlertDescription>
              </Alert>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-handle">
              {t("matchDashboard.addViolationSheet.accountChannel")}
              <span className="text-xs text-muted-foreground ml-2">
                {""} ({t("matchDashboard.addViolationSheet.optional")})
              </span>
            </Label>
            <Input
              id="account-handle"
              placeholder={t(
                "matchDashboard.addViolationSheet.accountChannelPlaceholder",
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
                    "matchDashboard.addViolationSheet.contentTypePlaceholder",
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
                    "matchDashboard.addViolationSheet.statusPlaceholder",
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
                "matchDashboard.addViolationSheet.viewsPlaceholder",
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
                      "matchDashboard.addViolationSheet.notePlaceholder",
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
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}>
            {t("matchDashboard.addViolationSheet.cancel")}
          </Button>
          <Button onClick={onSave} disabled={isLoading || isDuplicateBlocked}>
            {isLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditMode
              ? t("matchDashboard.addViolationSheet.save.edit")
              : t("matchDashboard.addViolationSheet.save.add")}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
