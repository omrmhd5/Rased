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
  onFormStatusChange: (status: "Active" | "Blocked" | "Removed" | "Under Review") => void;
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
    if (
      (value === "Blocked" || value === "Removed") &&
      !formBlockedAt
    ) {
      onFormBlockedAtChange(getKSATime());
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
            {isEditMode ? "Edit Violation" : "Add Violation"}
          </SheetTitle>
          <SheetDescription>
            {isEditMode
              ? "Update violation details"
              : "Add a new violation for this match and platform"}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Match</Label>
            <Input
              value={match ? `${match.team1} vs ${match.team2}` : ""}
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label>Platform</Label>
            <Input
              value={
                platformOperations.find(
                  (p) => p.id === selectedPlatformForAdd
                )?.name || ""
              }
              disabled
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="violation-url">Violation URL *</Label>
            <Input
              id="violation-url"
              placeholder="https://x.com/..."
              value={formUrl}
              onChange={(e) => handleUrlChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="account-handle">Account / Channel *</Label>
            <Input
              id="account-handle"
              placeholder="@username or channel name"
              value={formAccountHandle}
              onChange={(e) => onFormAccountHandleChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="content-type">Content Type *</Label>
            <Select value={formContentType} onValueChange={onFormContentTypeChange}>
              <SelectTrigger id="content-type">
                <SelectValue placeholder="Select content type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">Live</SelectItem>
                <SelectItem value="highlights">Highlights</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select value={formStatus} onValueChange={handleStatusChange}>
              <SelectTrigger id="status">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Blocked">Blocked</SelectItem>
                <SelectItem value="Removed">Removed</SelectItem>
                <SelectItem value="Under Review">Under Review</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="views">Views (optional)</Label>
            <Input
              id="views"
              type="text"
              placeholder="0"
              value={formViews}
              onChange={(e) => handleViewsChange(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="time-added">Time Added *</Label>
            <Input
              id="time-added"
              type="datetime-local"
              value={formTimeAdded}
              onChange={(e) => onFormTimeAddedChange(e.target.value)}
            />
          </div>

          {(formStatus === "Blocked" ||
            formStatus === "Removed" ||
            (isEditMode && formBlockedAt)) && (
            <div className="space-y-2">
              <Label htmlFor="blocked-at">Blocked at (optional)</Label>
              <Input
                id="blocked-at"
                type="datetime-local"
                value={formBlockedAt}
                onChange={(e) => onFormBlockedAtChange(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Leave empty or adjust the auto-filled time
              </p>
            </div>
          )}

          {/* Notes Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Notes (optional)</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
                onClick={onAddNote}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add note
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
                    placeholder="Enter note..."
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
                  No notes yet. Click "Add note" to add one.
                </div>
              )}
            </div>
          </div>
        </div>

        <SheetFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onSave}>
            {isEditMode ? "Save changes" : "Save Violation"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

