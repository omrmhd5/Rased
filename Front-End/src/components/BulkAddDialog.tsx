import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { parseUrl } from "@/utils/urlParsers";
import { CheckCircle, XCircle, AlertCircle } from "lucide-react";

interface BulkAddDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ParsedViolation {
  url: string;
  platform: string | null;
  postId: string | null;
  accountId: string | null;
  status: 'success' | 'partial' | 'failed';
  isDuplicate?: boolean;
}

export function BulkAddDialog({ open, onOpenChange }: BulkAddDialogProps) {
  const [urls, setUrls] = useState("");
  const [parsed, setParsed] = useState<ParsedViolation[]>([]);
  const [isParsed, setIsParsed] = useState(false);

  const handleParse = () => {
    const urlList = urls.split('\n').filter(url => url.trim());
    const results: ParsedViolation[] = urlList.map(url => {
      const parsed = parseUrl(url.trim());
      let status: 'success' | 'partial' | 'failed' = 'failed';
      
      if (parsed.platform && parsed.postId && parsed.accountId) {
        status = 'success';
      } else if (parsed.platform || parsed.postId || parsed.accountId) {
        status = 'partial';
      }

      return {
        url: url.trim(),
        ...parsed,
        status,
        isDuplicate: Math.random() > 0.8, // Mock duplicate detection
      };
    });

    setParsed(results);
    setIsParsed(true);
  };

  const handleSubmit = () => {
    // Here you would submit the violations
    console.log("Submitting violations:", parsed);
    onOpenChange(false);
    setUrls("");
    setParsed([]);
    setIsParsed(false);
  };

  const handleReset = () => {
    setIsParsed(false);
    setParsed([]);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'partial':
        return <AlertCircle className="h-4 w-4 text-warning" />;
      default:
        return <XCircle className="h-4 w-4 text-destructive" />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Violations</DialogTitle>
          <DialogDescription>
            Paste multiple URLs (one per line) to add violations in bulk. We'll auto-detect platform, post ID, and account.
          </DialogDescription>
        </DialogHeader>

        {!isParsed ? (
          <div className="space-y-4">
            <div>
              <Label>URLs (one per line)</Label>
              <Textarea
                placeholder="https://twitter.com/account/status/123456&#10;https://youtube.com/watch?v=abc123&#10;https://t.me/channel/456"
                value={urls}
                onChange={(e) => setUrls(e.target.value)}
                rows={12}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Supported platforms: Twitter/X, YouTube, Facebook, TikTok, Instagram, Telegram
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleParse} disabled={!urls.trim()}>
                Parse URLs ({urls.split('\n').filter(u => u.trim()).length})
              </Button>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <CheckCircle className="h-4 w-4 text-success" />
                <span>{parsed.filter(p => p.status === 'success').length} successful</span>
              </div>
              <div className="flex items-center gap-1">
                <AlertCircle className="h-4 w-4 text-warning" />
                <span>{parsed.filter(p => p.status === 'partial').length} partial</span>
              </div>
              <div className="flex items-center gap-1">
                <XCircle className="h-4 w-4 text-destructive" />
                <span>{parsed.filter(p => p.status === 'failed').length} failed</span>
              </div>
              {parsed.some(p => p.isDuplicate) && (
                <div className="flex items-center gap-1">
                  <AlertCircle className="h-4 w-4 text-warning" />
                  <span>{parsed.filter(p => p.isDuplicate).length} duplicates</span>
                </div>
              )}
            </div>

            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Status</TableHead>
                    <TableHead>Platform</TableHead>
                    <TableHead>Account</TableHead>
                    <TableHead>Post ID</TableHead>
                    <TableHead>URL</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsed.map((item, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(item.status)}
                          {item.isDuplicate && (
                            <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
                              Duplicate
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary" className="capitalize">
                          {item.platform || '—'}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{item.accountId || '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{item.postId || '—'}</TableCell>
                      <TableCell className="max-w-[200px] truncate text-xs text-muted-foreground">
                        {item.url}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            <div className="flex gap-2">
              <Button 
                onClick={handleSubmit}
                disabled={parsed.filter(p => p.status !== 'failed').length === 0}
              >
                Add {parsed.filter(p => p.status !== 'failed').length} Violations
              </Button>
              <Button variant="outline" onClick={handleReset}>
                Back to Edit
              </Button>
              <Button variant="ghost" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
