import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";

interface PlatformMetrics {
  platform: string;
  icon: React.ReactNode;
  detected: number;
  blocked: number;
  successRate: number;
  avgBlockTime: number;
  views: number;
}

interface RoundReportProps {
  open: boolean;
  onClose: () => void;
  week: string;
  competition: string;
  dateRange?: string;
  liveMetrics: PlatformMetrics[];
  highlightsMetrics: PlatformMetrics[];
  fileName?: string;
}

export const RoundReport = ({
  open,
  onClose,
  week,
  competition,
  dateRange,
  liveMetrics,
  highlightsMetrics,
  fileName,
}: RoundReportProps) => {
  const reportRef = useRef<HTMLDivElement>(null);

  const handleExportImage = async () => {
    if (!reportRef.current) return;

    try {
      const dataUrl = await toPng(reportRef.current, {
        quality: 1,
        pixelRatio: 2,
        width: 1200,
        backgroundColor: "#ffffff",
      });

      // Generate a nice filename
      const defaultFileName = fileName || `Round-Report-${competition.replace(/\s+/g, "-")}-Week-${week}-${new Date().toISOString().split("T")[0]}.png`;
      const sanitizedFileName = defaultFileName.replace(/[^a-zA-Z0-9.-]/g, "-");

      const link = document.createElement("a");
      link.download = sanitizedFileName;
      link.href = dataUrl;
      link.click();

      toast({
        title: "Report Saved",
        description: "Round report has been saved as an image successfully",
      });
    } catch (error) {
      console.error("Error exporting image:", error);
      toast({
        title: "Error",
        description: "An error occurred while saving the report",
        variant: "destructive",
      });
    }
  };

  const getSuccessRateColor = (rate: number) => {
    if (rate >= 80) return "text-green-600";
    if (rate >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const formatBlockTime = (minutes: number) => {
    if (minutes === 0) return "N/A";
    if (minutes >= 1440) {
      const days = Math.round(minutes / 1440);
      return `${days}d`;
    }
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      return `${hours}h`;
    }
    return `${Math.round(minutes)}min`;
  };

  const formatViews = (views: number) => {
    if (views >= 1000000) {
      return `${(views / 1000000).toFixed(1)}M`;
    }
    if (views >= 1000) {
      return `${(views / 1000).toFixed(1)}K`;
    }
    return views.toString();
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1280px] max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Round Report</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportImage} size="sm" variant="default">
              <Download className="h-4 w-4 mr-2" />
              Download as Image
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4 mr-2" />
              Close
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div
            ref={reportRef}
            className="bg-gradient-to-br from-background via-muted/20 to-background rounded-2xl shadow-2xl p-8 space-y-8"
          >
            {/* Header */}
            <div className="text-center space-y-3 pb-6 border-b">
              <h1 className="text-3xl font-bold">Anti-Piracy Round Report</h1>
              <p className="text-lg text-muted-foreground">
                {competition} – Week {week}
              </p>
              {dateRange && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-sm font-medium">{dateRange}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                Data includes all matches in the current week/round
              </p>
            </div>

            {/* Live Stream Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Live Stream Violations</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left text-sm font-semibold px-4 py-3">Platform</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Detected</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Blocked</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Success Rate</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Avg Block Time</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveMetrics.map((metric, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">{metric.platform}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {metric.detected}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium">{metric.blocked}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-bold ${getSuccessRateColor(metric.successRate)}`}>
                                {metric.successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">{formatBlockTime(metric.avgBlockTime)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {formatViews(metric.views)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Highlights Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">Highlights Violations</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left text-sm font-semibold px-4 py-3">Platform</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Detected</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Blocked</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Success Rate</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Avg Block Time</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">Views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highlightsMetrics.map((metric, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">{metric.platform}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {metric.detected}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium">{metric.blocked}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span className={`text-sm font-bold ${getSuccessRateColor(metric.successRate)}`}>
                                {metric.successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">{formatBlockTime(metric.avgBlockTime)}</span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {formatViews(metric.views)}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
