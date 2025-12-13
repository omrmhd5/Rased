import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ExternalLink, Eye, Clock, User } from "lucide-react";
import { PriorityBadge } from "./PriorityBadge";
import { SLABadge } from "./SLABadge";
import { Violation } from "@/data/mockData";

interface ViolationDetailsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  violation: Violation | null;
}

export function ViolationDetailsModal({ open, onOpenChange, violation }: ViolationDetailsModalProps) {
  if (!violation) return null;

  const minutesSinceReported = violation.reportedAt 
    ? Math.floor((new Date().getTime() - new Date(violation.reportedAt).getTime()) / 60000)
    : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <span className="capitalize">{violation.platform}</span>
            <span className="text-muted-foreground">•</span>
            <span className="text-muted-foreground font-normal">{violation.account}</span>
            <Badge variant={violation.status === 'blocked' ? 'default' : violation.status === 'active' ? 'destructive' : 'secondary'}>
              {violation.status}
            </Badge>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Violation Info */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground mb-1">Post ID</p>
              <p className="text-sm font-medium">{violation.postId}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Content Type</p>
              <Badge variant="secondary" className="capitalize">{violation.contentType}</Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Priority</p>
              <PriorityBadge priority={violation.priority} />
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Views</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Eye className="h-3 w-3" />
                {violation.views.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground mb-1">Reported At</p>
              <p className="text-sm font-medium flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(violation.reportedAt).toLocaleString()}
              </p>
            </div>
            {violation.blockedAt && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Blocked At</p>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {new Date(violation.blockedAt).toLocaleString()}
                </p>
              </div>
            )}
            {violation.minutesToBlock && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Time to Block</p>
                <SLABadge minutes={violation.minutesToBlock} showIcon={false} />
              </div>
            )}
            {!violation.blockedAt && (
              <div>
                <p className="text-sm text-muted-foreground mb-1">Active For</p>
                <SLABadge minutes={minutesSinceReported} />
              </div>
            )}
          </div>

          {violation.url && (
            <div>
              <p className="text-sm text-muted-foreground mb-2">URL</p>
              <a 
                href={violation.url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-primary hover:underline flex items-center gap-1"
              >
                {violation.url}
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          )}

          <Separator />

          {/* Status History Timeline */}
          <div>
            <h4 className="font-semibold mb-3">Status History</h4>
            <div className="space-y-3">
              {violation.blockedAt && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2 h-2 rounded-full bg-success" />
                    <div className="w-px h-full bg-border mt-1" />
                  </div>
                  <div className="flex-1 pb-3">
                    <p className="text-sm font-medium">Blocked</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(violation.blockedAt).toLocaleString()} • Operator B
                    </p>
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-warning" />
                  <div className="w-px h-full bg-border mt-1" />
                </div>
                <div className="flex-1 pb-3">
                  <p className="text-sm font-medium">Reported</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(violation.reportedAt).toLocaleString()} • Operator A
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="flex flex-col items-center">
                  <div className="w-2 h-2 rounded-full bg-muted" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium">Created</p>
                  <p className="text-xs text-muted-foreground">
                    {new Date(violation.reportedAt).toLocaleString()} • Auto-detected
                  </p>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Audit Log */}
          <div>
            <h4 className="font-semibold mb-3">Audit Log</h4>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <User className="h-3 w-3" />
                <span className="text-xs">{new Date(violation.reportedAt).toLocaleString()}</span>
                <span>Operator A created violation</span>
              </div>
              {violation.blockedAt && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <User className="h-3 w-3" />
                  <span className="text-xs">{new Date(violation.blockedAt).toLocaleString()}</span>
                  <span>Operator B marked as blocked</span>
                </div>
              )}
            </div>
          </div>

          {/* Evidence Gallery */}
          {violation.evidence && violation.evidence.length > 0 && (
            <>
              <Separator />
              <div>
                <h4 className="font-semibold mb-3">Evidence</h4>
                <div className="grid grid-cols-3 gap-2">
                  {violation.evidence.map((evidence, i) => (
                    <div key={i} className="aspect-video bg-muted rounded-md flex items-center justify-center">
                      <span className="text-xs text-muted-foreground">Screenshot {i + 1}</span>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Quick Edits */}
          <div>
            <h4 className="font-semibold mb-3">Quick Edits</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Status</Label>
                <Select defaultValue={violation.status}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="reported">Reported</SelectItem>
                    <SelectItem value="review">Under Review</SelectItem>
                    <SelectItem value="blocked">Blocked</SelectItem>
                    <SelectItem value="removed">Removed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Priority</Label>
                <Select defaultValue={violation.priority}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Views</Label>
                <Input type="number" defaultValue={violation.views} />
              </div>
            </div>
            <div className="mt-4">
              <Label>Notes</Label>
              <Textarea 
                placeholder="Add notes..." 
                defaultValue={violation.notes}
                rows={3}
              />
            </div>
            <div className="flex gap-2 mt-4">
              <Button className="flex-1">Save Changes</Button>
              <Button variant="outline" onClick={() => window.open(violation.url, '_blank')}>
                <ExternalLink className="h-4 w-4 mr-2" />
                Open URL
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
