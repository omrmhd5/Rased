import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface SLABadgeProps {
  minutes: number;
  threshold?: number;
  showIcon?: boolean;
  className?: string;
}

export function SLABadge({ minutes, threshold = 15, showIcon = true, className }: SLABadgeProps) {
  const isBreached = minutes > threshold;
  const isWarning = minutes > threshold * 0.7 && minutes <= threshold;
  
  const variant = isBreached ? "destructive" : isWarning ? "secondary" : "outline";
  const shouldPulse = isBreached && minutes > threshold * 1.5;

  return (
    <Badge 
      variant={variant} 
      className={cn(
        shouldPulse && "animate-pulse",
        className
      )}
    >
      {isBreached && showIcon && <AlertTriangle className="h-3 w-3 mr-1" />}
      {minutes}m
      {isBreached && " SLA"}
    </Badge>
  );
}
