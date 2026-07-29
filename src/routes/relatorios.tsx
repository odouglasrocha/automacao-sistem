import { createFileRoute } from "@tanstack/react-router";
import { BarChart3, FileDown, FileSpreadsheet, FileText } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";

export const Route = createFileRoute("/relatorios")({
  head: () => ({
    meta: [
      { title: "Relatórios · ICS" },
      { name: "description", content: "Relatórios operacionais e gerenciais em PDF, Excel e CSV." },
    ],
  }),
  component: Relatorios,
});

const REPORTS = [
  { title: "OEE por Linha", period: "Diário / Semanal / Mensal", format: ["PDF", "Excel"] },
  { title: "Produção por SKU", period: "Semanal", format: ["PDF", "Excel", "CSV"] },
  { title: "Paradas por Motivo", period: "Diário", format: ["PDF"] },
  { title: "MTBF / MTTR", period: "Mensal", format: ["PDF", "Excel"] },
  { title: "Consumo Energético", period: "Mensal", format: ["PDF", "Excel"] },
  { title: "Refugo & Retrabalho", period: "Diário", format: ["PDF", "CSV"] },
  { title: "Eficiência Operadores", period: "Turno", format: ["PDF"] },
  { title: "Rastreabilidade Lote", period: "Sob demanda", format: ["PDF", "Excel"] },
];

const FMT_ICON: Record<string, typeof FileText> = {
  PDF: FileText,
  Excel: FileSpreadsheet,
  CSV: FileDown,
};

function Relatorios() {
  return (
    <ModulePage
      icon={BarChart3}
      eyebrow="Reports & BI"
      title="Relatórios"
      description="Relatórios operacionais e gerenciais · exportação para PDF, Excel e CSV · integração Power BI."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {REPORTS.map((r) => (
          <div key={r.title} className="hud-panel p-4 flex flex-col">
            <div className="flex-1">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {r.period}
              </div>
              <div className="text-base font-semibold text-foreground mt-1">{r.title}</div>
            </div>
            <div className="flex items-center gap-2 mt-4">
              {r.format.map((f) => {
                const Icon = FMT_ICON[f];
                return (
                  <button
                    key={f}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-border bg-background/50 text-xs hover:border-primary hover:text-primary transition-colors"
                  >
                    <Icon className="h-3.5 w-3.5" />
                    {f}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </ModulePage>
  );
}