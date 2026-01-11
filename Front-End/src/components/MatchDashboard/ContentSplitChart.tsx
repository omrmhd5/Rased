import { Card } from "@/components/ui/card";
import { formatViews } from "./utils";
import { Play, Film, MoreHorizontal, BarChart3 } from "lucide-react";
import { useLanguage } from "@/contexts/LanguageContext";

interface ContentSplitData {
  name: string;
  value: number;
  violations: number;
  color: string;
}

interface ContentSplitChartProps {
  data: ContentSplitData[];
  compact?: boolean;
  title?: string;
}

// Icon mapping for each content type
const getIcon = (name: string, compact: boolean = false) => {
  const iconSize = compact ? "h-3 w-3" : "h-4 w-4";
  const nameLower = name.toLowerCase();
  // Check for both English and Arabic names
  if (nameLower === "total violations" || nameLower === "إجمالي الانتهاكات") {
    return <BarChart3 className={iconSize} />;
  } else if (nameLower === "live" || nameLower === "مباشر") {
    return <Play className={iconSize} />;
  } else if (nameLower === "highlights" || nameLower === "أبرز اللحظات") {
    return <Film className={iconSize} />;
  } else if (nameLower === "others" || nameLower === "أخرى") {
    return <MoreHorizontal className={iconSize} />;
  }
  return <MoreHorizontal className={iconSize} />;
};

// Translate content type names
const translateContentTypeName = (name: string, t: (key: string) => string): string => {
  const nameLower = name.toLowerCase();
  if (nameLower === "total violations") {
    return t("dashboard.totalViolations");
  } else if (nameLower === "live") {
    return t("dashboard.live");
  } else if (nameLower === "highlights") {
    return t("dashboard.highlights");
  } else if (nameLower === "others") {
    return t("dashboard.others");
  }
  return name;
};

export function ContentSplitChart({
  data,
  compact = false,
  title,
}: ContentSplitChartProps) {
  const { t, isRTL } = useLanguage();
  // Calculate max value for percentage calculation
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  // Use compact styles if compact prop is true
  const cardPadding = compact ? "p-4" : "p-6";
  const titleMargin = compact ? "mb-3" : "mb-6";
  const titleSize = compact ? "text-base" : "text-lg";
  const spacing = compact ? "space-y-2.5" : "space-y-4";
  const itemGap = compact ? "gap-3" : "gap-4";
  const itemPadding = compact ? "p-2" : "p-3";
  const iconSize = compact ? "w-8 h-8" : "w-10 h-10";
  const iconInnerSize = compact ? "h-3 w-3" : "h-4 w-4";
  const nameSize = compact ? "text-xs" : "text-sm";
  const valueSize = compact ? "text-sm" : "text-base";
  const viewsLabelSize = compact ? "text-[10px]" : "text-xs";
  const violationsSize = compact ? "text-[10px]" : "text-xs";
  const marginBottom = compact ? "mb-1.5" : "mb-2";
  const barHeight = compact ? "h-2" : "h-3";

  const chartTitle = title || t("dashboard.contentSplitTitle");

  return (
    <Card className={`${cardPadding} lg:col-span-1`}>
      <h3 className={`font-semibold ${titleMargin} ${titleSize} text-left`}>
        {chartTitle}
      </h3>

      <div className={spacing}>
        {data.map((entry, index) => {
          const percentage = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;

          return (
            <div
              key={index}
              className={`flex items-center ${itemGap} group transition-all duration-300 hover:scale-[1.02] hover:bg-muted/30 rounded-lg ${itemPadding} -m-2 cursor-pointer`}>
              {/* Icon */}
              <div
                className={`flex items-center justify-center ${iconSize} rounded-full shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg`}
                style={{
                  backgroundColor: `${entry.color}20`,
                  border: `2px solid ${entry.color}`,
                }}>
                <div
                  style={{ color: entry.color }}
                  className="transition-transform duration-300 group-hover:scale-110">
                  {getIcon(entry.name, compact)}
                </div>
              </div>

              {/* Name and Bar Container */}
              <div className="flex-1 min-w-0">
                {isRTL ? (
                  <div
                    className={`flex items-center justify-between ${marginBottom} flex-row`}>
                    <span
                      className={`font-semibold ${nameSize} uppercase tracking-wide transition-colors duration-300 group-hover:text-foreground text-right`}>
                      {translateContentTypeName(entry.name, t)}
                    </span>
                    <div className={`text-right ${compact ? "mr-3" : "mr-4"}`}>
                      <p
                        className={`font-bold ${valueSize} leading-tight transition-transform duration-300 group-hover:scale-105 text-left`}>
                        {formatViews(entry.value)}{" "}
                        <span
                          className={`${viewsLabelSize} font-normal text-muted-foreground`}>
                          {t("dashboard.views")}
                        </span>
                      </p>
                      <p
                        className={`${violationsSize} text-muted-foreground leading-tight transition-transform duration-300 group-hover:scale-105 text-right`}>
                        {entry.violations} {t("dashboard.violations")}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div
                    className={`flex items-center justify-between ${marginBottom}`}>
                    <span
                      className={`font-semibold ${nameSize} uppercase tracking-wide transition-colors duration-300 group-hover:text-foreground text-left`}>
                      {translateContentTypeName(entry.name, t)}
                    </span>
                    <div className={`text-right ${compact ? "ml-3" : "ml-4"}`}>
                      <p
                        className={`font-bold ${valueSize} leading-tight transition-transform duration-300 group-hover:scale-105 text-right`}>
                        {formatViews(entry.value)}{" "}
                        <span
                          className={`${viewsLabelSize} font-normal text-muted-foreground`}>
                          {t("dashboard.views")}
                        </span>
                      </p>
                      <p
                        className={`${violationsSize} text-muted-foreground leading-tight transition-transform duration-300 group-hover:scale-105 text-right`}>
                        {entry.violations} {t("dashboard.violations")}
                      </p>
                    </div>
                  </div>
                )}

                {/* Horizontal Progress Bar */}
                <div
                  className={`relative w-full ${barHeight} bg-muted rounded-full overflow-hidden transition-all duration-300 group-hover:shadow-md`}>
                  <div
                    className="h-full rounded-full transition-all duration-500 ease-out group-hover:shadow-lg"
                    style={{
                      width: `${percentage}%`,
                      backgroundColor: entry.color,
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}
