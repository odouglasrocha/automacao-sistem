import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

interface KpiCardProps {
  label: string;
  value: string;
  unit?: string;
  delta?: number;
  icon: LucideIcon;
  tone?: "primary" | "success" | "warning" | "danger" | "info";
  sub?: string;
}

const TONE: Record<NonNullable<KpiCardProps["tone"]>, string> = {
  primary: "text-primary border-primary/40",
  success: "text-success border-success/40",
  warning: "text-warning border-warning/40",
  danger: "text-danger border-danger/40",
  info: "text-info border-info/40",
};

export function KpiCard({ label, value, unit, delta, icon: Icon, tone = "primary", sub }: KpiCardProps) {
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="hud-panel p-4 relative overflow-hidden group">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="flex items-start justify-between gap-3">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </div>
        <div className={`p-1.5 rounded-md border ${TONE[tone]} bg-background/30`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <div className="mt-3 flex items-baseline gap-1.5 mono">
        <div className={`text-3xl font-semibold tabular-nums ${TONE[tone].split(" ")[0]}`}>
          {value}
        </div>
        {unit && <div className="text-sm text-muted-foreground">{unit}</div>}
      </div>
      <div className="mt-1 flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{sub}</span>
        {typeof delta === "number" && (
          <span
            className={`inline-flex items-center gap-0.5 mono ${
              positive ? "text-success" : "text-danger"
            }`}
          >
            {positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(1)}%
          </span>
        )}
      </div>
    </div>
  );
}