import { ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { ArrowUp, ArrowDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  change?: number;
  icon?: ReactNode;
  iconBg?: string;
  sparkline?: ReactNode;
  className?: string;
}

export function StatCard({ title, value, change, icon, iconBg, sparkline, className }: StatCardProps) {
  const isPositive = change && change > 0;
  const isNegative = change && change < 0;

  return (
    <Card className={`p-6 ${className}`}>
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <h3 className="text-3xl font-bold">{value}</h3>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {isPositive && (
                <>
                  <ArrowUp className="h-4 w-4 text-success" />
                  <span className="text-sm font-medium text-success">{change}%</span>
                </>
              )}
              {isNegative && (
                <>
                  <ArrowDown className="h-4 w-4 text-destructive" />
                  <span className="text-sm font-medium text-destructive">{Math.abs(change)}%</span>
                </>
              )}
            </div>
          )}
        </div>
        {icon && (
          <div className={`p-3 rounded-full ${iconBg || 'bg-primary/10'}`}>
            {icon}
          </div>
        )}
      </div>
      {sparkline && <div className="mt-4">{sparkline}</div>}
    </Card>
  );
}
