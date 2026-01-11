import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X, Download } from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toPng } from "html-to-image";
import { toast } from "@/hooks/use-toast";
import { useRef } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

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
  const { t } = useLanguage();
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
      const defaultFileName =
        fileName ||
        `Round-Report-${competition.replace(/\s+/g, "-")}-Week-${week}-${
          new Date().toISOString().split("T")[0]
        }.png`;
      const sanitizedFileName = defaultFileName.replace(/[^a-zA-Z0-9.-]/g, "-");

      const link = document.createElement("a");
      link.download = sanitizedFileName;
      link.href = dataUrl;
      link.click();

      toast({
        title: t("roundReport.toast.reportSaved"),
        description: t("roundReport.toast.reportSavedDescription"),
      });
    } catch (error) {
      console.error("Error exporting image:", error);
      toast({
        title: t("roundReport.toast.error"),
        description: t("roundReport.toast.errorDescription"),
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
    if (minutes === 0) return t("roundReport.timeFormats.na");
    if (minutes >= 1440) {
      const days = Math.round(minutes / 1440);
      return `${days}${t("roundReport.timeFormats.days")}`;
    }
    if (minutes >= 60) {
      const hours = Math.round(minutes / 60);
      return `${hours}${t("roundReport.timeFormats.hours")}`;
    }
    return `${Math.round(minutes)}${t("roundReport.timeFormats.minutes")}`;
  };

  const formatViews = (views: number) => {
    return views.toLocaleString("en-US");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1280px] max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">{t("roundReport.title")}</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportImage} size="sm" variant="default">
              <Download className="h-4 w-4 mr-2" />
              {t("roundReport.downloadAsImage")}
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4 mr-2" />
              {t("roundReport.close")}
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div
            ref={reportRef}
            className="bg-gradient-to-br from-background via-muted/20 to-background rounded-2xl shadow-2xl p-8 space-y-8">
            {/* Header */}
            <div className="text-center space-y-3 pb-6 border-b">
              <h1 className="text-3xl font-bold">
                {t("roundReport.mainTitle")}
              </h1>
              <p className="text-lg text-muted-foreground">
                {competition} – {t("roundReport.week")} {week}
              </p>
              {dateRange && (
                <div className="flex items-center justify-center gap-3 mt-3">
                  <span className="text-sm font-medium">{dateRange}</span>
                </div>
              )}
              <p className="text-xs text-muted-foreground mt-2">
                {t("roundReport.dataIncludes")}
              </p>
            </div>

            {/* Live Stream Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">
                {t("roundReport.liveStreamViolations")}
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.platform")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.detected")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.blocked")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.successRate")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.avgBlockTime")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.views")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveMetrics.map((metric, index) => (
                        <tr
                          key={index}
                          className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">
                                {metric.platform}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {metric.detected}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium">
                              {metric.blocked}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`text-sm font-bold ${getSuccessRateColor(
                                  metric.successRate
                                )}`}>
                                {metric.successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">
                              {formatBlockTime(metric.avgBlockTime)}
                            </span>
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
              <h2 className="text-xl font-bold text-center">
                {t("roundReport.highlightsViolations")}
              </h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-left text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.platform")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.detected")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.blocked")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.successRate")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.avgBlockTime")}
                        </th>
                        <th className="text-center text-sm font-semibold px-4 py-3">
                          {t("roundReport.tableHeaders.views")}
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {highlightsMetrics.map((metric, index) => (
                        <tr
                          key={index}
                          className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">
                                {metric.platform}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center justify-center px-3 py-1 bg-primary/10 text-primary rounded-md text-sm font-semibold">
                              {metric.detected}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm font-medium">
                              {metric.blocked}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              <span
                                className={`text-sm font-bold ${getSuccessRateColor(
                                  metric.successRate
                                )}`}>
                                {metric.successRate}%
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-sm">
                              {formatBlockTime(metric.avgBlockTime)}
                            </span>
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
