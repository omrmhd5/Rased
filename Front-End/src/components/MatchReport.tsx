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
  platformArabic: string;
  icon: React.ReactNode;
  detected: number;
  blocked: number;
  successRate: number;
  avgBlockTime: number;
  views: number;
}

interface MatchReportProps {
  open: boolean;
  onClose: () => void;
  matchName: string;
  week: string;
  competition: string;
  stadium: string;
  date: string;
  time: string;
  status: "live" | "finished";
  liveMetrics: PlatformMetrics[];
  highlightsMetrics: PlatformMetrics[];
  matchId: string;
}

export const MatchReport = ({
  open,
  onClose,
  matchName,
  week,
  competition,
  stadium,
  date,
  time,
  status,
  liveMetrics,
  highlightsMetrics,
  matchId,
}: MatchReportProps) => {
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

      // Create download link
      const link = document.createElement("a");
      link.download = `anti-piracy-match-report-${matchId}.png`;
      link.href = dataUrl;
      link.click();

      toast({
        title: "تم حفظ التقرير",
        description: "تم حفظ تقرير المباراة كصورة بنجاح",
      });
    } catch (error) {
      console.error("Error exporting image:", error);
      toast({
        title: "خطأ",
        description: "حدث خطأ أثناء حفظ التقرير",
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
    if (minutes === 0) return "غير متاح";
    if (minutes >= 60) {
      const hours = (minutes / 60).toFixed(1);
      return `${hours} ساعة`;
    }
    return `${minutes.toFixed(1)} د`;
  };

  const formatViews = (views: number) => {
    return views.toLocaleString("en-US");
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] w-[1280px] max-h-[95vh] overflow-y-auto p-0">
        <div className="sticky top-0 z-10 bg-background border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">تقرير المباراة</h2>
          <div className="flex items-center gap-2">
            <Button onClick={handleExportImage} size="sm" variant="default">
              <Download className="h-4 w-4 mr-2" />
              حفظ كصورة
            </Button>
            <Button onClick={onClose} size="sm" variant="ghost">
              <X className="h-4 w-4 mr-2" />
              إغلاق
            </Button>
          </div>
        </div>

        <div className="p-6">
          <div
            ref={reportRef}
            className="bg-gradient-to-br from-background via-muted/20 to-background rounded-2xl shadow-2xl p-8 space-y-8"
            dir="rtl"
          >
            {/* Header */}
            <div className="text-center space-y-3 pb-6 border-b">
              <h1 className="text-3xl font-bold">التقرير الأسبوعي لمكافحة القرصنة لهذه المباراة</h1>
              <p className="text-lg text-muted-foreground">
                {matchName} – {week} • {competition} • {stadium}
              </p>
              <div className="flex items-center justify-center gap-3 mt-3">
                <span className="text-sm font-medium">{date} – {time}</span>
                <Badge variant={status === "live" ? "destructive" : "default"}>
                  {status === "live" ? "مباشر" : "منتهية"}
                </Badge>
              </div>
            </div>

            {/* Live Stream Section */}
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-center">البث المباشر للمباراة</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-right text-sm font-semibold px-4 py-3">المنصة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">المكتشفة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">تمت الإزالة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">نسبة الإزالة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">متوسط الوقت</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">المشاهدات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {liveMetrics.map((metric, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">{metric.platformArabic}</span>
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
                                {metric.successRate}٪
                              </span>
                              <span className="text-xs">↗</span>
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
              <h2 className="text-xl font-bold text-center">لقطات المباراة</h2>
              <Card className="overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted/50 border-b">
                      <tr>
                        <th className="text-right text-sm font-semibold px-4 py-3">المنصة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">المكتشفة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">تمت الإزالة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">نسبة الإزالة</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">متوسط الوقت</th>
                        <th className="text-center text-sm font-semibold px-4 py-3">المشاهدات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {highlightsMetrics.map((metric, index) => (
                        <tr key={index} className="border-b last:border-b-0 hover:bg-muted/30 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {metric.icon}
                              <span className="text-sm font-medium">{metric.platformArabic}</span>
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
                                {metric.successRate}٪
                              </span>
                              <span className="text-xs">↗</span>
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
