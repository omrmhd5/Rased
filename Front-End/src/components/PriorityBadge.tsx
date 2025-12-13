import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface PriorityBadgeProps {
  priority: 'low' | 'medium' | 'high';
  className?: string;
}

export function PriorityBadge({ priority, className }: PriorityBadgeProps) {
  const config = {
    high: { label: 'High', className: 'bg-destructive/10 text-destructive hover:bg-destructive/20' },
    medium: { label: 'Medium', className: 'bg-warning/10 text-warning hover:bg-warning/20' },
    low: { label: 'Low', className: 'bg-muted text-muted-foreground hover:bg-muted/80' },
  };

  const { label, className: priorityClass } = config[priority];

  return (
    <Badge variant="outline" className={cn(priorityClass, className)}>
      {label}
    </Badge>
  );
}
