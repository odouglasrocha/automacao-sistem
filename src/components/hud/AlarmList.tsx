import { AlertTriangle, Info, XOctagon } from "lucide-react";
import type { Alarm } from "@/lib/simulation";

const SEV = {
  critical: { icon: XOctagon, color: "text-danger", bg: "bg-danger/10 border-danger/40" },
  warning: { icon: AlertTriangle, color: "text-warning", bg: "bg-warning/10 border-warning/40" },
  info: { icon: Info, color: "text-info", bg: "bg-info/10 border-info/40" },
} as const;

export function AlarmList({ alarms }: { alarms: Alarm[] }) {
  return (
    <div className="hud-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Alarmes SCADA
          </div>
          <div className="text-lg font-semibold text-foreground">Stream em tempo real</div>
        </div>
        <div className="text-[11px] mono text-muted-foreground">{alarms.length} evento(s)</div>
      </div>
      <div className="flex-1 space-y-1.5 overflow-y-auto pr-1 min-h-0">
        {alarms.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-10">
            Aguardando eventos do gateway IIoT…
          </div>
        )}
        {alarms.map((a) => {
          const s = SEV[a.severity];
          const Icon = s.icon;
          const time = new Date(a.ts).toLocaleTimeString("pt-BR");
          return (
            <div
              key={a.id}
              className={`flex items-center gap-3 px-3 py-2 rounded-md border ${s.bg} text-sm`}
            >
              <Icon className={`h-4 w-4 shrink-0 ${s.color}`} />
              <span className="mono text-[11px] text-muted-foreground tabular-nums">{time}</span>
              <span className={`text-[10px] uppercase tracking-widest ${s.color} w-16 shrink-0`}>
                {a.severity}
              </span>
              <span className="mono text-xs text-foreground shrink-0 w-32 truncate">{a.machine}</span>
              <span className="text-foreground/90 truncate flex-1">{a.message}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}