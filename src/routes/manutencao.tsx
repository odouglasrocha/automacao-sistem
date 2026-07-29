import { createFileRoute } from "@tanstack/react-router";
import { Wrench, AlertOctagon, CalendarClock, TrendingUp } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";

export const Route = createFileRoute("/manutencao")({
  head: () => ({
    meta: [
      { title: "Manutenção · ICS" },
      { name: "description", content: "Preventiva, corretiva, preditiva, OS, MTBF, MTTR." },
    ],
  }),
  component: Manutencao,
});

const OS = [
  { id: "OS-9021", tipo: "Preventiva", ativo: "PRENSA-450T", tec: "Silva, J.", prazo: "28/07 18:00", prio: "Alta" },
  { id: "OS-9022", tipo: "Corretiva", ativo: "INJET-320", tec: "Costa, R.", prazo: "28/07 15:30", prio: "Crítica" },
  { id: "OS-9023", tipo: "Preditiva", ativo: "ROBÔ-KUKA-6", tec: "Alves, M.", prazo: "29/07 09:00", prio: "Média" },
  { id: "OS-9024", tipo: "Lubrificação", ativo: "TORNO-CNC-12", tec: "Rocha, P.", prazo: "30/07 14:00", prio: "Baixa" },
];

const PRIO: Record<string, string> = {
  "Crítica": "text-danger border-danger/40 bg-danger/10",
  "Alta": "text-warning border-warning/40 bg-warning/10",
  "Média": "text-info border-info/40 bg-info/10",
  "Baixa": "text-muted-foreground border-border bg-muted/30",
};

function Manutencao() {
  return (
    <ModulePage
      icon={Wrench}
      eyebrow="Maintenance"
      title="Manutenção Industrial"
      description="Ordens de serviço preventivas, corretivas, preditivas e autônomas. Indicadores MTBF/MTTR."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="OS Abertas" value="14" icon={Wrench} tone="primary" sub="6 em execução" />
        <KpiCard label="Corretivas / Total" value="21" unit="%" icon={AlertOctagon} tone="warning" delta={-3.2} sub="meta ≤ 15%" />
        <KpiCard label="MTBF" value="286" unit="h" icon={TrendingUp} tone="success" delta={4.1} sub="média 30d" />
        <KpiCard label="MTTR" value="1.8" unit="h" icon={CalendarClock} tone="info" delta={-6.5} sub="média 30d" />
      </section>

      <div className="hud-panel p-4 overflow-x-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          OS em aberto
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">OS</th>
              <th className="text-left font-medium py-2 px-2">Tipo</th>
              <th className="text-left font-medium py-2 px-2">Ativo</th>
              <th className="text-left font-medium py-2 px-2">Técnico</th>
              <th className="text-left font-medium py-2 px-2">Prazo</th>
              <th className="text-left font-medium py-2 px-2">Prioridade</th>
            </tr>
          </thead>
          <tbody>
            {OS.map((o) => (
              <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                <td className="py-2.5 px-2 mono text-foreground">{o.id}</td>
                <td className="py-2.5 px-2">{o.tipo}</td>
                <td className="py-2.5 px-2 mono text-muted-foreground">{o.ativo}</td>
                <td className="py-2.5 px-2">{o.tec}</td>
                <td className="py-2.5 px-2 mono text-muted-foreground">{o.prazo}</td>
                <td className="py-2.5 px-2">
                  <span className={`inline-block text-[11px] px-2 py-0.5 rounded-sm border ${PRIO[o.prio]}`}>
                    {o.prio}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComingSoon items={["Plano preventivo mensal", "Preditiva com IA (vibração)", "Estoque de peças", "Histórico de intervenções", "Checklist mobile", "5S e manutenção autônoma"]} />
    </ModulePage>
  );
}