import { Card } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
} from "recharts";
import { formatViews } from "./utils";

interface ContentSplitData {
  name: string;
  value: number;
  violations: number;
  color: string;
}

interface ContentSplitChartProps {
  data: ContentSplitData[];
}

export function ContentSplitChart({ data }: ContentSplitChartProps) {
  return (
    <Card className="p-6 lg:col-span-3">
      <h3 className="font-semibold mb-6">Live Stream vs Highlights</h3>

      <div className="flex items-center justify-center mb-6">
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={90}
              paddingAngle={2}
              dataKey="value">
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <RechartsTooltip
              formatter={(value: number) => formatViews(value)}
              contentStyle={{
                background: "hsl(var(--popover))",
                border: "1px solid hsl(var(--border))",
                borderRadius: "8px",
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: data[0].color,
              }}
            />
            <span className="font-medium">Live</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              {formatViews(data[0].value)} views
            </p>
            <p className="text-xs text-muted-foreground">
              {data[0].violations} violations
            </p>
          </div>
        </div>

        <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
          <div className="flex items-center gap-3">
            <div
              className="w-3 h-3 rounded-full"
              style={{
                backgroundColor: data[1].color,
              }}
            />
            <span className="font-medium">Highlights</span>
          </div>
          <div className="text-right">
            <p className="font-bold text-lg">
              {formatViews(data[1].value)} views
            </p>
            <p className="text-xs text-muted-foreground">
              {data[1].violations} violations
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}


