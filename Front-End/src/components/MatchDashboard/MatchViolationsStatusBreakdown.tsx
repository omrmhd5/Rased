import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
} from "recharts";
import { AlertTriangle, Shield, FileQuestion, XCircle } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "next-themes";
import { useEffect, useState } from "react";

interface MatchViolationsStatusBreakdownProps {
  totalViolations: number;
  activeCount: number;
  blockedCount: number;
  removedCount: number;
  underReviewCount: number;
}

interface ChartData {
  name: string;
  value: number;
  percentage: number;
  color: string;
  icon: React.ReactNode;
}

export function MatchViolationsStatusBreakdown({
  totalViolations,
  activeCount,
  blockedCount,
  removedCount,
  underReviewCount,
}: MatchViolationsStatusBreakdownProps) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Calculate percentages
  const calculatePercentage = (value: number) => {
    if (totalViolations === 0) return 0;
    return Math.round((value / totalViolations) * 100);
  };

  // Use brighter red in dark mode
  const activeColor =
    mounted && theme === "dark"
      ? "hsl(0 84% 60%)" // Brighter red for dark mode
      : "hsl(var(--destructive))"; // Original destructive color for light mode

  // Prepare chart data - colors match MatchOverview component
  const chartData: ChartData[] = [
    {
      name: t("dashboard.violationsOverview.active"),
      value: activeCount,
      percentage: calculatePercentage(activeCount),
      color: activeColor, // Matches MatchOverview Active (destructive)
      icon: <AlertTriangle className="h-3 w-3" />,
    },
    {
      name: t("dashboard.violationsOverview.statusBreakdown.blocked"),
      value: blockedCount,
      percentage: calculatePercentage(blockedCount),
      color: "hsl(var(--success))", // Matches MatchOverview Blocked Successfully (success)
      icon: <Shield className="h-3 w-3" />,
    },
    {
      name: t("dashboard.violationsOverview.removed"),
      value: removedCount,
      percentage: calculatePercentage(removedCount),
      color: "hsl(188 94% 43%)", // Matches MatchOverview Removed (cyan-500)
      icon: <XCircle className="h-3 w-3" />,
    },
    {
      name: t("dashboard.violationsOverview.underReview"),
      value: underReviewCount,
      percentage: calculatePercentage(underReviewCount),
      color: "hsl(48 96% 50%)", // Matches MatchOverview Under Review (yellow-500)
      icon: <FileQuestion className="h-3 w-3" />,
    },
  ].filter((item) => item.value > 0); // Only show segments with values > 0

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload as ChartData;
      return (
        <div className="bg-card border border-border rounded-lg p-3 shadow-lg">
          <div className="flex items-center gap-2 mb-2">
            <div
              className="w-3 h-3 rounded-full"
              style={{ backgroundColor: data.color }}
            />
            <p className="font-semibold text-sm">{data.name}</p>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.violationsOverview.statusBreakdown.count")}{" "}
            <span className="font-semibold">{data.value}</span>
          </p>
          <p className="text-xs text-muted-foreground">
            {t("dashboard.violationsOverview.statusBreakdown.percentage")}{" "}
            <span className="font-semibold">{data.percentage}%</span>
          </p>
        </div>
      );
    }
    return null;
  };

  // Custom legend
  const renderCustomLegend = (props: any) => {
    const { payload } = props;
    return (
      <div className="flex flex-wrap items-center justify-center gap-4 mt-4">
        {payload.map((entry: any, index: number) => {
          const data = chartData.find((d) => d.name === entry.value);
          if (!data) return null;
          return (
            <div
              key={index}
              className="flex items-center gap-2 group cursor-pointer transition-all duration-300 hover:scale-105">
              <div
                className="w-3 h-3 rounded-full transition-all duration-300 group-hover:scale-110"
                style={{ backgroundColor: entry.color }}
              />
              <span className="text-xs font-medium text-muted-foreground">
                {entry.value}
              </span>
              <span className="text-xs font-bold">{data.percentage}%</span>
            </div>
          );
        })}
      </div>
    );
  };

  // If no violations, show empty state
  if (totalViolations === 0) {
    return (
      <Card className="p-4">
        <h3 className="font-semibold mb-4 text-base text-left">
          {t("dashboard.violationsOverview.statusBreakdown.title")}
        </h3>
        <div className="flex items-center justify-center h-32">
          <p className="text-sm text-muted-foreground text-left">
            {t("dashboard.violationsOverview.statusBreakdown.noViolations")}
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-4 transition-all duration-300 hover:shadow-lg">
      <h3 className="font-semibold mb-4 text-base text-left">
        {t("dashboard.violationsOverview.statusBreakdown.title")}
      </h3>

      <div className="flex flex-col lg:flex-row items-center gap-3">
        {/* Pie Chart */}
        <div className="w-full lg:w-1/2">
          <ResponsiveContainer width="100%" height={180}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={60}
                fill="#8884d8"
                dataKey="value"
                stroke="hsl(var(--background))"
                strokeWidth={2}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Legend with details */}
        <div className="w-full lg:w-1/2 space-y-2">
          {chartData.map((item, index) => (
            <div
              key={index}
              className="flex items-center justify-between p-2 rounded-lg bg-muted/30 border border-border transition-all duration-300 hover:scale-[1.02] hover:bg-muted/50 cursor-pointer group">
              <div className="flex items-center gap-2">
                <div
                  className="p-1.5 rounded-lg transition-all duration-300 group-hover:scale-110"
                  style={{
                    backgroundColor: `${item.color}20`,
                    border: `2px solid ${item.color}`,
                  }}>
                  <div style={{ color: item.color }}>{item.icon}</div>
                </div>
                <div>
                  <p className="font-semibold text-xs">{item.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {item.value}{" "}
                    {item.value !== 1
                      ? t(
                          "dashboard.violationsOverview.statusBreakdown.violations"
                        )
                      : t(
                          "dashboard.violationsOverview.statusBreakdown.violation"
                        )}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p
                  className="text-base font-bold"
                  style={{ color: item.color }}>
                  {item.percentage}%
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}
