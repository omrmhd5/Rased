import { Card } from "@/components/ui/card";
import { formatViews } from "./utils";
import { Play, Film, MoreHorizontal, BarChart3 } from "lucide-react";

interface ContentSplitData {
  name: string;
  value: number;
  violations: number;
  color: string;
}

interface ContentSplitChartProps {
  data: ContentSplitData[];
}

// Icon mapping for each content type
const getIcon = (name: string) => {
  switch (name.toLowerCase()) {
    case "total violations":
      return <BarChart3 className="h-4 w-4" />;
    case "live":
      return <Play className="h-4 w-4" />;
    case "highlights":
      return <Film className="h-4 w-4" />;
    case "others":
      return <MoreHorizontal className="h-4 w-4" />;
    default:
      return <MoreHorizontal className="h-4 w-4" />;
  }
};

export function ContentSplitChart({ data }: ContentSplitChartProps) {
  // Calculate max value for percentage calculation
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className="p-6 lg:col-span-1">
      <h3 className="font-semibold mb-6 text-lg">
        Live Stream vs Highlights vs Others
      </h3>

      <div className="space-y-4">
        {data.map((entry, index) => {
          const percentage = maxValue > 0 ? (entry.value / maxValue) * 100 : 0;

          return (
            <div
              key={index}
              className="flex items-center gap-4 group transition-all duration-300 hover:scale-[1.02] hover:bg-muted/30 rounded-lg p-3 -m-3 cursor-pointer">
              {/* Icon */}
              <div
                className="flex items-center justify-center w-10 h-10 rounded-full shrink-0 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
                style={{
                  backgroundColor: `${entry.color}20`,
                  border: `2px solid ${entry.color}`,
                }}>
                <div
                  style={{ color: entry.color }}
                  className="transition-transform duration-300 group-hover:scale-110">
                  {getIcon(entry.name)}
                </div>
              </div>

              {/* Name and Bar Container */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm uppercase tracking-wide transition-colors duration-300 group-hover:text-foreground">
                    {entry.name}
                  </span>
                  <div className="text-right ml-4">
                    <p className="font-bold text-base leading-tight transition-transform duration-300 group-hover:scale-105">
                      {formatViews(entry.value)}{" "}
                      <span className="text-xs font-normal text-muted-foreground">
                        views
                      </span>
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight transition-transform duration-300 group-hover:scale-105">
                      {entry.violations} violations
                    </p>
                  </div>
                </div>

                {/* Horizontal Progress Bar */}
                <div className="relative w-full h-3 bg-muted rounded-full overflow-hidden transition-all duration-300 group-hover:shadow-md">
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
