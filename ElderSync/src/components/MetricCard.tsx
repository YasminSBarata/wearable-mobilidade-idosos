import type { ReactNode } from "react";
import { Info } from "lucide-react";
import { Card } from "./ui/card";
import { Badge } from "./ui/badge";
import { cn } from "@/utils/cn";

interface MetricCardProps {
  title: string;
  value: string;
  unit: string;
  icon: ReactNode;
  color: "primary" | "warning";
  progress?: number;
  alert?: boolean;
  description?: string;
}

const iconColorClasses = {
  primary: "bg-[#29D68B]/10 text-[#29D68B]",
  warning: "bg-amber-100 text-amber-600",
};

const progressColors = {
  primary: "bg-[#29D68B]",
  warning: "bg-amber-600",
};

export function MetricCard({
  title,
  value,
  unit,
  icon,
  color,
  progress,
  alert,
  description,
}: MetricCardProps) {
  return (
    <Card
      className={cn(
        "relative overflow-hidden group shadow-sm p-6",
        alert && "border-red-300",
      )}
    >
      {alert && (
        <div className="absolute top-2 right-2">
          <Badge variant="destructive">Alerta</Badge>
        </div>
      )}

      <div className="flex items-center gap-3 mb-3">
        <div className={cn("p-2 rounded-lg", iconColorClasses[color])}>
          {icon}
        </div>
        <p className="text-sm font-medium text-gray-600">{title}</p>
      </div>

      <div className="flex items-baseline gap-1">
        <p className="text-3xl font-bold text-gray-900">{value}</p>
        <p className="text-sm text-gray-500">{unit}</p>
      </div>

      {progress !== undefined && (
        <div className="mt-3">
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className={cn(
                "h-2 rounded-full transition-all duration-300",
                progressColors[color],
              )}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {description && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-start gap-2">
            <Info className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
            <p className="text-xs text-gray-500 leading-relaxed">
              {description}
            </p>
          </div>
        </div>
      )}
    </Card>
  );
}
