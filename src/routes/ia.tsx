import { createFileRoute } from "@tanstack/react-router";
import { Bot, Sparkles, TrendingUp, AlertTriangle } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";

export const Route = createFileRoute("/ia")({
  head: () => ({
    meta: [
      { title: "IA · Insights · ICS" },
      { name: "description", content: "Inteligência artificial industrial: predição, anomalias, otimização e linguagem natural." },
    ],
  }),
  component: IA,
});

const INSIGHTS = [
  {
    icon: AlertTriangle,
    tone: "danger" as const,
    title: "Falha iminente detectada",
    body: "Vibração da PRENSA-450T subiu 34% em 6h. Modelo XGBoost prevê falha de rolamento em 48–72h. Sugestão: OS preventiva noturna.",
  },
  {
    icon: TrendingUp,
    tone: "success" as const,
    title: "Gargalo identificado",
    body: "L-03 Montagem opera a 78% da capacidade enquanto L-01 opera a 96%. Rebalanceando ordens 24084 e 24085, ganho estimado de 8.2% no OEE geral.",
  },
  {
    icon: Sparkles,
    tone: "info" as const,
    title: "Setup otimizado",
    body: "SMED: sequência atual pode ser reduzida em 4min12s trocando 3 passos internos por externos. Aplicar template ao SKU-88101.",
  },
];

const TONE: Record<"danger" | "success" | "info", string> = {
  danger: "text-danger border-danger/40 bg-danger/10",
  success: "text-success border-success/40 bg-success/10",
  info: "text-info border-info/40 bg-info/10",
};

function IA() {
  return (
    <ModulePage
      icon={Bot}
      eyebrow="Industrial AI"
      title="IA · Insights Automáticos"
      description="Predição de falhas, detecção de anomalias, otimização de setup, análise de gargalos e Q&A em linguagem natural."
    >
      <div className="hud-panel p-4">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-accent" />
          <span className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
            Perguntar ao ICS
          </span>
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            placeholder="Ex.: por que o OEE da L-02 caiu no turno da tarde?"
            className="flex-1 px-3 py-2 rounded-md bg-background/60 border border-border text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button className="px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90">
            Analisar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {INSIGHTS.map((i) => {
          const Icon = i.icon;
          return (
            <div key={i.title} className={`hud-panel p-4 border ${TONE[i.tone]}`}>
              <div className="flex items-center gap-2 mb-2">
                <Icon className="h-4 w-4" />
                <span className="text-[11px] uppercase tracking-widest">Insight</span>
              </div>
              <div className="text-base font-semibold text-foreground">{i.title}</div>
              <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{i.body}</p>
            </div>
          );
        })}
      </div>
    </ModulePage>
  );
}