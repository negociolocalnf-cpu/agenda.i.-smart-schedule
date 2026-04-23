import { LucideIcon, TrendingUp, TrendingDown } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: { value: string; up: boolean };
  accent?: "primary" | "accent" | "success" | "warning";
}

const accents = {
  primary: "bg-primary-soft text-primary",
  accent: "bg-accent-soft text-accent",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning",
};

export const StatCard = ({
  label,
  value,
  icon: Icon,
  trend,
  accent = "primary",
}: StatCardProps) => {
  return (
    <div className="rounded-2xl border border-border bg-card p-6 shadow-soft transition-smooth hover:shadow-elevated">
      <div className="flex items-start justify-between">
        <div className={cn("flex h-11 w-11 items-center justify-center rounded-xl", accents[accent])}>
          <Icon className="h-5 w-5" />
        </div>
        {trend && (
          <span
            className={cn(
              "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold",
              trend.up ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"
            )}
          >
            {trend.up ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
            {trend.value}
          </span>
        )}
      </div>
      <p className="mt-4 text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-3xl font-extrabold tracking-tight">{value}</p>
    </div>
  );
};
