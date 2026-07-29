import { createFileRoute } from "@tanstack/react-router";
import { ShieldCheck, AlertOctagon, ClipboardCheck, Target } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";

export const Route = createFileRoute("/qualidade")({
  head: () => ({
    meta: [
      { title: "Qualidade · ICS" },
      { name: "description", content: "CEP/SPC, inspeções, não conformidades e planos de ação." },
    ],
  }),
  component: Qualidade,
});

const NC = [
  { id: "NC-1120", desc: "Peça fora de tolerância diametral", ativo: "TORNO-CNC-12", severidade: "Alta", status: "Em análise (5 Porquês)" },
  { id: "NC-1121", desc: "Rótulo desalinhado", ativo: "ROTULAD-R3", severidade: "Média", status: "Ação corretiva aberta" },
  { id: "NC-1122", desc: "Solda porosa", ativo: "SOLDA-MIG-08", severidade: "Alta", status: "8D em andamento" },
];

function Qualidade() {
  return (
    <ModulePage
      icon={ShieldCheck}
      eyebrow="Quality Management"
      title="Qualidade"
      description="CEP/SPC, inspeções, checklists, planos de controle, FMEA, MSA, 8D e rastreabilidade total."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="FTQ (First Time Quality)" value="97.6" unit="%" icon={Target} tone="success" delta={0.8} />
        <KpiCard label="Refugo (ppm)" value="1.240" icon={AlertOctagon} tone="warning" delta={-4.2} />
        <KpiCard label="Inspeções (dia)" value="184" icon={ClipboardCheck} tone="info" sub="12 pendentes" />
        <KpiCard label="NCs abertas" value="9" icon={AlertOctagon} tone="danger" sub="3 críticas" />
      </section>

      <div className="hud-panel p-4 overflow-x-auto">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
          Não conformidades em aberto
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">NC</th>
              <th className="text-left font-medium py-2 px-2">Descrição</th>
              <th className="text-left font-medium py-2 px-2">Ativo</th>
              <th className="text-left font-medium py-2 px-2">Severidade</th>
              <th className="text-left font-medium py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {NC.map((n) => (
              <tr key={n.id} className="border-t border-border hover:bg-muted/20">
                <td className="py-2.5 px-2 mono text-foreground">{n.id}</td>
                <td className="py-2.5 px-2">{n.desc}</td>
                <td className="py-2.5 px-2 mono text-muted-foreground">{n.ativo}</td>
                <td className="py-2.5 px-2">
                  <span
                    className={`inline-block text-[11px] px-2 py-0.5 rounded-sm border ${
                      n.severidade === "Alta"
                        ? "text-danger border-danger/40 bg-danger/10"
                        : "text-warning border-warning/40 bg-warning/10"
                    }`}
                  >
                    {n.severidade}
                  </span>
                </td>
                <td className="py-2.5 px-2 text-muted-foreground">{n.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComingSoon items={["CEP · gráficos X-R / X-S", "Ishikawa & 5 Porquês", "FMEA e Plano de Controle", "MSA · R&R", "Auditorias mobile", "Rastreabilidade por serial"]} />
    </ModulePage>
  );
}