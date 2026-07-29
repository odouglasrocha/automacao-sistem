import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Play, Pause, CheckCircle2 } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";

export const Route = createFileRoute("/mes")({
  head: () => ({
    meta: [
      { title: "MES · Ordens de Produção · ICS" },
      { name: "description", content: "Manufacturing Execution System: planejamento, apontamento e rastreabilidade." },
    ],
  }),
  component: MES,
});

const ORDERS = [
  { id: "OP-24081", sku: "SKU-88101", qty: 5000, done: 4210, status: "producing", line: "L-01", start: "14:02" },
  { id: "OP-24082", sku: "SKU-77303", qty: 2000, done: 2000, status: "done", line: "L-02", start: "12:40" },
  { id: "OP-24083", sku: "SKU-45210", qty: 8000, done: 1120, status: "producing", line: "L-03", start: "15:15" },
  { id: "OP-24084", sku: "SKU-92004", qty: 3200, done: 0, status: "queued", line: "L-04", start: "—" },
  { id: "OP-24085", sku: "SKU-88110", qty: 4500, done: 850, status: "paused", line: "L-01", start: "16:00" },
];

const STATUS: Record<string, { label: string; cls: string; icon: typeof Play }> = {
  producing: { label: "Produzindo", cls: "text-success border-success/40 bg-success/10", icon: Play },
  paused: { label: "Pausada", cls: "text-warning border-warning/40 bg-warning/10", icon: Pause },
  done: { label: "Concluída", cls: "text-info border-info/40 bg-info/10", icon: CheckCircle2 },
  queued: { label: "Na fila", cls: "text-muted-foreground border-border bg-muted/30", icon: ClipboardList },
};

function MES() {
  return (
    <ModulePage
      icon={ClipboardList}
      eyebrow="MES · Manufacturing Execution"
      title="Ordens de Produção"
      description="Planejamento, sequenciamento, apontamento por operador/máquina e rastreabilidade por lote."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="OPs Abertas" value="18" icon={ClipboardList} tone="primary" sub="turno atual" />
        <KpiCard label="Em execução" value="7" icon={Play} tone="success" sub="linhas ativas" />
        <KpiCard label="Concluídas hoje" value="12" icon={CheckCircle2} tone="info" delta={8.3} sub="vs. ontem" />
        <KpiCard label="Atrasadas" value="2" icon={Pause} tone="danger" sub="prioridade alta" />
      </section>

      <div className="hud-panel p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">OP</th>
              <th className="text-left font-medium py-2 px-2">SKU</th>
              <th className="text-left font-medium py-2 px-2">Linha</th>
              <th className="text-left font-medium py-2 px-2">Início</th>
              <th className="text-left font-medium py-2 px-2">Progresso</th>
              <th className="text-left font-medium py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {ORDERS.map((o) => {
              const s = STATUS[o.status];
              const Icon = s.icon;
              const pct = (o.done / o.qty) * 100;
              return (
                <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                  <td className="py-2.5 px-2 mono text-foreground">{o.id}</td>
                  <td className="py-2.5 px-2 mono text-muted-foreground">{o.sku}</td>
                  <td className="py-2.5 px-2">{o.line}</td>
                  <td className="py-2.5 px-2 mono text-muted-foreground">{o.start}</td>
                  <td className="py-2.5 px-2 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="mono text-xs text-muted-foreground tabular-nums w-24 text-right">
                        {o.done.toLocaleString("pt-BR")}/{o.qty.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-2">
                    <span className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-sm border ${s.cls}`}>
                      <Icon className="h-3 w-3" />
                      {s.label}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ComingSoon
        items={[
          "Sequenciamento inteligente (PCP)",
          "Apontamento por operador",
          "Rastreabilidade por lote/serial",
          "Consumo de matéria-prima",
          "Integração ERP/SAP",
          "Calendário industrial de turnos",
        ]}
      />
    </ModulePage>
  );
}