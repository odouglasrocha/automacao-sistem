import { Wrench, ShieldAlert, AlertOctagon, PackageCheck, Truck } from "lucide-react";
import { formatDuration, type AndonCall } from "@/lib/simulation";

const TYPE_META: Record<AndonCall["type"], { label: string; icon: typeof Wrench; color: string }> = {
  production: { label: "Produção", icon: PackageCheck, color: "text-info" },
  quality: { label: "Qualidade", icon: AlertOctagon, color: "text-warning" },
  maintenance: { label: "Manutenção", icon: Wrench, color: "text-primary" },
  safety: { label: "Segurança", icon: ShieldAlert, color: "text-danger" },
  logistics: { label: "Logística", icon: Truck, color: "text-accent" },
};

export function AndonPanel({ calls }: { calls: AndonCall[] }) {
  const open = calls.filter((c) => c.status !== "closed").length;
  return (
    <div className="hud-panel p-4 h-full flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Andon Digital</div>
          <div className="text-lg font-semibold text-foreground">
            {open} chamado{open === 1 ? "" : "s"} ativo{open === 1 ? "" : "s"}
          </div>
        </div>
        <span className="live-dot" />
      </div>
      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {calls.length === 0 && (
          <div className="text-sm text-muted-foreground text-center py-8">
            Nenhum chamado ativo.
          </div>
        )}
        {calls.map((c) => {
          const meta = TYPE_META[c.type];
          const Icon = meta.icon;
          const urgent = c.waitMs > 5 * 60_000;
          return (
            <div
              key={c.id}
              className={`flex items-center gap-3 p-2.5 rounded-md border bg-background/30 ${
                urgent ? "border-danger/50 animate-pulse" : "border-border"
              }`}
            >
              <div className={`p-2 rounded-md bg-background/60 ${meta.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <span className="font-medium text-foreground truncate">{c.machine}</span>
                  <span className="text-[10px] mono text-muted-foreground">{c.id}</span>
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {meta.label} · {c.line}
                </div>
              </div>
              <div className="text-right mono">
                <div className={`text-sm tabular-nums ${urgent ? "text-danger" : "text-foreground"}`}>
                  {formatDuration(c.waitMs)}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {c.status === "open" ? "Aberto" : c.status === "attending" ? "Atend." : "OK"}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}