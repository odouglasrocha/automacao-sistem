import { Thermometer, Zap, Gauge } from "lucide-react";
import { STATUS_META, type Machine } from "@/lib/simulation";

export function MachineTile({ m }: { m: Machine }) {
  const meta = STATUS_META[m.status];
  const progress = Math.min(100, (m.producedHour / m.target) * 100);

  return (
    <div className={`hud-panel p-3 border ${meta.bg} relative overflow-hidden`}>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] mono text-muted-foreground truncate">{m.id} · {m.line}</div>
          <div className="font-semibold text-foreground truncate">{m.name}</div>
        </div>
        <span
          className={`text-[10px] uppercase tracking-widest px-2 py-0.5 rounded-sm border ${meta.bg} ${meta.color} whitespace-nowrap`}
        >
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-current mr-1 align-middle" />
          {meta.label}
        </span>
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2 text-xs mono">
        <div className="flex flex-col">
          <span className="text-muted-foreground flex items-center gap-1"><Gauge className="h-3 w-3" />RPM</span>
          <span className="text-foreground tabular-nums">{m.rpm.toFixed(0)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground flex items-center gap-1"><Thermometer className="h-3 w-3" />°C</span>
          <span className="text-foreground tabular-nums">{m.temperature.toFixed(1)}</span>
        </div>
        <div className="flex flex-col">
          <span className="text-muted-foreground flex items-center gap-1"><Zap className="h-3 w-3" />A</span>
          <span className="text-foreground tabular-nums">{m.current.toFixed(1)}</span>
        </div>
      </div>

      <div className="mt-3">
        <div className="flex items-center justify-between text-[11px] mono mb-1">
          <span className="text-muted-foreground">OEE</span>
          <span className="text-foreground tabular-nums">{m.oee.toFixed(1)}%</span>
        </div>
        <div className="h-1.5 rounded-full bg-background/60 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${m.oee}%`,
              background:
                m.oee >= 80
                  ? "var(--color-success)"
                  : m.oee >= 60
                    ? "var(--color-warning)"
                    : "var(--color-danger)",
            }}
          />
        </div>
      </div>

      <div className="mt-2 flex items-center justify-between text-[11px] mono">
        <span className="text-muted-foreground">Descargas/h (produção real)</span>
        <span className="text-foreground tabular-nums">
          {m.producedHour}/{m.target}
        </span>
      </div>
      <div className="h-1 mt-1 rounded-full bg-background/60 overflow-hidden">
        <div className="h-full bg-primary transition-all duration-500" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}