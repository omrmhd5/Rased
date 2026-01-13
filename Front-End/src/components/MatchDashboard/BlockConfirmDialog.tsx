import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Violation, PlatformData } from "./types";
import { formatViewsString } from "./utils";
import { useLanguage } from "@/contexts/LanguageContext";

// Helper function to translate addedAgo string (e.g., "8d ago" -> "8د منذ")
const translateAddedAgo = (
  addedAgo: string,
  t: (key: string) => string
): string => {
  if (!addedAgo || addedAgo === "just now") {
    return t("matchDashboard.violationItem.justNow");
  }

  // Parse formats like "8d ago", "5h ago", "30m ago"
  const match = addedAgo.match(/(\d+)([mhd])\s+ago/);
  if (match) {
    const [, number, unit] = match;
    const mText = t("matchDashboard.violationItem.timeUnits.m");
    const hText = t("matchDashboard.violationItem.timeUnits.h");
    const dText = t("matchDashboard.violationItem.timeUnits.d");
    const agoText = t("matchDashboard.violationItem.timeUnits.ago");

    let unitText = "";
    if (unit === "m") unitText = mText;
    else if (unit === "h") unitText = hText;
    else if (unit === "d") unitText = dText;

    return `${number}${unitText} ${agoText}`;
  }

  return addedAgo;
};

interface BlockConfirmDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  blockConfirmViolation: {
    platformId: string;
    violationId: number | string;
    violation: Violation;
  } | null;
  platformOperations: PlatformData[];
  blockTimeChoice: "current" | "custom";
  onBlockTimeChoiceChange: (choice: "current" | "custom") => void;
  customBlockTime: string;
  onCustomBlockTimeChange: (time: string) => void;
  onConfirm: () => void;
}

export function BlockConfirmDialog({
  open,
  onOpenChange,
  blockConfirmViolation,
  platformOperations,
  blockTimeChoice,
  onBlockTimeChoiceChange,
  customBlockTime,
  onCustomBlockTimeChange,
  onConfirm,
}: BlockConfirmDialogProps) {
  const { t, isRTL } = useLanguage();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t("matchDashboard.blockConfirmDialog.title")}
          </DialogTitle>
          <DialogDescription>
            {t("matchDashboard.blockConfirmDialog.description")}
          </DialogDescription>
        </DialogHeader>

        {blockConfirmViolation && (
          <div className="py-3 px-4 rounded-lg bg-muted/30 border border-border">
            <div className="flex items-center gap-2 text-sm">
              <Badge variant="secondary" className="text-xs">
                {
                  platformOperations.find(
                    (p) => p.id === blockConfirmViolation.platformId
                  )?.name
                }
              </Badge>
              <span className="text-muted-foreground">•</span>
              <span>
                {(() => {
                  const contentType =
                    blockConfirmViolation.violation.type ||
                    blockConfirmViolation.violation.contentType ||
                    "Other";
                  const contentTypeLower = contentType.toLowerCase();
                  if (contentTypeLower === "live") return t("dashboard.live");
                  if (contentTypeLower === "highlights")
                    return t("dashboard.highlights");
                  if (
                    contentTypeLower === "other" ||
                    contentTypeLower === "others"
                  )
                    return t("dashboard.other");
                  return contentType;
                })()}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">
                {formatViewsString(
                  blockConfirmViolation.violation.views || "0"
                )}{" "}
                {t("matchDashboard.blockConfirmDialog.views")}
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                {t("matchDashboard.blockConfirmDialog.added")}{" "}
                {translateAddedAgo(
                  blockConfirmViolation.violation.addedAgo || "",
                  t
                )}
              </span>
            </div>
          </div>
        )}

        <div className="space-y-4 py-4">
          <RadioGroup
            value={blockTimeChoice}
            onValueChange={(value) =>
              onBlockTimeChoiceChange(value as "current" | "custom")
            }>
            {isRTL ? (
              <>
                <div
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onBlockTimeChoiceChange("current")}>
                  <div className="flex-1 text-left">
                    <Label
                      htmlFor="current"
                      className="font-medium cursor-pointer">
                      {t("matchDashboard.blockConfirmDialog.useCurrentTime")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("matchDashboard.blockConfirmDialog.currentTimeHint")}
                    </p>
                  </div>
                  <RadioGroupItem
                    value="current"
                    id="current"
                    className="mt-0.5"
                  />
                </div>

                <div
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onBlockTimeChoiceChange("custom")}>
                  <div className="flex-1 text-left">
                    <Label
                      htmlFor="custom"
                      className="font-medium cursor-pointer">
                      {t("matchDashboard.blockConfirmDialog.setCustomTime")}
                    </Label>
                    {blockTimeChoice === "custom" && (
                      <Input
                        type="datetime-local"
                        value={customBlockTime}
                        onChange={(e) =>
                          onCustomBlockTimeChange(e.target.value)
                        }
                        className="mt-2 flex-row-reverse"
                      />
                    )}
                  </div>
                  <RadioGroupItem
                    value="custom"
                    id="custom"
                    className="mt-0.5"
                  />
                </div>
              </>
            ) : (
              <>
                <div
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onBlockTimeChoiceChange("current")}>
                  <RadioGroupItem
                    value="current"
                    id="current"
                    className="mt-0.5"
                  />
                  <div className="flex-1 text-left">
                    <Label
                      htmlFor="current"
                      className="font-medium cursor-pointer">
                      {t("matchDashboard.blockConfirmDialog.useCurrentTime")}
                    </Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {t("matchDashboard.blockConfirmDialog.currentTimeHint")}
                    </p>
                  </div>
                </div>

                <div
                  className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
                  onClick={() => onBlockTimeChoiceChange("custom")}>
                  <RadioGroupItem
                    value="custom"
                    id="custom"
                    className="mt-0.5"
                  />
                  <div className="flex-1 text-left">
                    <Label
                      htmlFor="custom"
                      className="font-medium cursor-pointer">
                      {t("matchDashboard.blockConfirmDialog.setCustomTime")}
                    </Label>
                    {blockTimeChoice === "custom" && (
                      <Input
                        type="datetime-local"
                        value={customBlockTime}
                        onChange={(e) =>
                          onCustomBlockTimeChange(e.target.value)
                        }
                        className="mt-2"
                      />
                    )}
                  </div>
                </div>
              </>
            )}
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {t("matchDashboard.blockConfirmDialog.cancel")}
          </Button>
          <Button onClick={onConfirm}>
            {t("matchDashboard.blockConfirmDialog.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
