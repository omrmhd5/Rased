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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Confirm block time</DialogTitle>
          <DialogDescription>
            You are marking this violation as blocked. Choose the exact block
            time to record for this post.
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
              <span>{blockConfirmViolation.violation.type}</span>
              <span className="text-muted-foreground">•</span>
              <span className="font-medium">
                {formatViewsString(blockConfirmViolation.violation.views || "0")}{" "}
                views
              </span>
              <span className="text-muted-foreground">•</span>
              <span className="text-xs text-muted-foreground">
                added {blockConfirmViolation.violation.addedAgo}
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
            <div
              className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onBlockTimeChoiceChange("current")}>
              <RadioGroupItem
                value="current"
                id="current"
                className="mt-0.5"
              />
              <div className="flex-1">
                <Label htmlFor="current" className="font-medium cursor-pointer">
                  Use current time
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  Block time = now
                </p>
              </div>
            </div>

            <div
              className="flex items-start space-x-3 p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors cursor-pointer"
              onClick={() => onBlockTimeChoiceChange("custom")}>
              <RadioGroupItem value="custom" id="custom" className="mt-0.5" />
              <div className="flex-1">
                <Label htmlFor="custom" className="font-medium cursor-pointer">
                  Set custom block time
                </Label>
                {blockTimeChoice === "custom" && (
                  <Input
                    type="datetime-local"
                    value={customBlockTime}
                    onChange={(e) => onCustomBlockTimeChange(e.target.value)}
                    className="mt-2"
                  />
                )}
              </div>
            </div>
          </RadioGroup>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={onConfirm}>Confirm block</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

