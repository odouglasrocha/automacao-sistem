import { Thermometer, Zap, Gauge, Settings2, Radio, FlaskConical } from "lucide-react";
import { STATUS_META, type Machine } from "@/lib/simulation";

export function MachineTile({
  m,
  onConfigure,
  modo = "simulacao",
  sku,
}: {
  m: Machine;
  onConfigure?: (nome: string) => void;
  modo?: "producao" | "simulacao";
  /** SKU alocado a esta EA no plano do dia. */
  sku?: { cod: string; material: string } | null;
}) {
  const meta = STATUS_META[m.status];
  const progress = Math.min(100, (m.producedHour / m.target) * 100);
  const real = modo === "producao";

  return (
    <div className={`hud-panel p-3 border ${meta.bg} relative overflow-hidden group`}>
      {onConfigure && (
        <button
          type="button"
          onClick={() => onConfigure(m.name)}
          title={`Configuração exclusiva de ${m.name}`}
          aria-label={`Abrir configuração exclusiva de ${m.name}`}
          className="absolute bottom-2 right-2 z-10 rounded-md border border-border bg-background/70 p-1.5 text-muted-foreground opacity-0 transition hover:text-primary hover:border-primary/60 group-hover:opacity-100 focus:opacity-100"
        >
          <Settings2 className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="text-[10px] mono text-muted-foreground truncate">{m.id} · {m.line}</div>
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-foreground truncate">{m.name}</span>
            <span
              title={real ? "Modo de operação: Produção (dados do CLP)" : "Modo de operação: Simulação"}
              className={`inline-flex items-center gap-1 rounded-sm border px-1.5 py-0.5 text-[9px] uppercase tracking-widest mono ${
                real
                  ? "border-success/40 bg-success/15 text-success"
                  : "border-border bg-muted/30 text-muted-foreground"
              }`}
            >
              {real ? <Radio className="h-2.5 w-2.5" /> : <FlaskConical className="h-2.5 w-2.5" />}
              {real ? "Produção" : "Simulação"}
            </span>
          </div>
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

      {sku && (
        <div
          className="mt-2 text-[10px] mono truncate text-muted-foreground"
          title={`SKU alocado: ${sku.cod}-${sku.material}`}
        >
          SKU <span className="text-primary">{sku.cod}</span> · {sku.material}
        </div>
      )}
    </div>
  );
}