import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  Activity,
  Gauge,
  Package,
  Percent,
  Target,
  TrendingUp,
  Users,
  Zap,
} from "lucide-react";
import { KpiCard } from "@/components/hud/KpiCard";
import { MachineTile } from "@/components/hud/MachineTile";
import { useMachineConfig } from "@/components/hud/ea/useMachineConfig";
import { useEaRuntime, applyRuntime } from "@/hooks/useEaRuntime";
import { ProductionChart } from "@/components/hud/ProductionChart";
import { AndonPanel } from "@/components/hud/AndonPanel";
import { AlarmList } from "@/components/hud/AlarmList";
import { useIndustrialSimulation } from "@/lib/simulation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ICS · Painel Industrial em Tempo Real" },
      {
        name: "description",
        content:
          "Sistema de Controle Industrial (MES + SCADA + IIoT): OEE, Andon, alarmes e monitoramento em tempo real de máquinas, linhas e plantas.",
      },
      { property: "og:title", content: "ICS · Painel Industrial em Tempo Real" },
      {
        property: "og:description",
        content:
          "Plataforma industrial modular: MES, SCADA, IIoT, OEE, Andon Digital e IA para chão de fábrica.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { machines: simuladas, alarms, andon, history } = useIndustrialSimulation();
  const runtime = useEaRuntime();
  const machines = useMemo(() => applyRuntime(simuladas, runtime), [simuladas, runtime]);
  const { abrir, dialog, conhece } = useMachineConfig();

  const kpis = useMemo(() => {
    const producing = machines.filter((m) => m.status === "producing").length;
    const total = machines.length;
    const oee = machines.reduce((s, m) => s + m.oee, 0) / total;
    const avail = machines.reduce((s, m) => s + m.availability, 0) / total;
    const perf = machines.reduce((s, m) => s + m.performance, 0) / total;
    const qual = machines.reduce((s, m) => s + m.quality, 0) / total;
    const producedHour = machines.reduce((s, m) => s + m.producedHour, 0);
    const target = machines.reduce((s, m) => s + m.target, 0);
    const energy =
      machines.reduce((s, m) => s + m.current * 0.38, 0);
    const emProducao = machines.filter((m) => m.modo === "producao").length;
    return { producing, total, oee, avail, perf, qual, producedHour, target, energy, emProducao };
  }, [machines]);

  return (
    <div className="p-4 md:p-6 space-y-4">
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Visão Geral · Chão de Fábrica
            </h1>
            <p className="text-sm text-muted-foreground">
              Monitoramento consolidado de {kpis.total} ativos em 4 linhas produtivas ·
              atualização a cada 1.5s via OPC-UA / MQTT.
            </p>
          </div>

          <section className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-3">
            <KpiCard
              label="OEE Geral"
              value={kpis.oee.toFixed(1)}
              unit="%"
              icon={Gauge}
              tone={kpis.oee >= 75 ? "success" : kpis.oee >= 60 ? "warning" : "danger"}
              delta={kpis.oee - 72}
              sub="Meta ≥ 85%"
            />
            <KpiCard
              label="Disponibilidade"
              value={kpis.avail.toFixed(1)}
              unit="%"
              icon={Activity}
              tone="info"
              delta={kpis.avail - 88}
              sub="A = Ttop / Tplan"
            />
            <KpiCard
              label="Performance"
              value={kpis.perf.toFixed(1)}
              unit="%"
              icon={TrendingUp}
              tone="primary"
              delta={kpis.perf - 82}
              sub="P = Real / Ideal"
            />
            <KpiCard
              label="Qualidade"
              value={kpis.qual.toFixed(2)}
              unit="%"
              icon={Percent}
              tone="success"
              delta={kpis.qual - 97}
              sub="FTQ · sem retrabalho"
            />
            <KpiCard
              label="Descargas / hora"
              value={kpis.producedHour.toLocaleString("pt-BR")}
              unit={`/ ${kpis.target}`}
              icon={Package}
              tone="primary"
              sub={`Produção real · ${((kpis.producedHour / kpis.target) * 100).toFixed(0)}% da meta`}
            />
            <KpiCard
              label="Consumo Energia"
              value={kpis.energy.toFixed(1)}
              unit="kWh"
              icon={Zap}
              tone="warning"
              delta={-2.4}
              sub="Demanda contratada"
            />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2">
              <ProductionChart data={history} />
            </div>
            <AndonPanel calls={andon} />
          </section>

          <section className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 hud-panel p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
                    Ativos Monitorados
                  </div>
                  <div className="text-lg font-semibold text-foreground">
                    {kpis.producing}/{kpis.total} máquinas produzindo agora
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <Users className="h-4 w-4" />
                  <span className="mono">42 operadores online</span>
                  <Target className="h-4 w-4 ml-2" />
                  <span className="mono">Turno B · 14:00–22:00</span>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {machines.map((m) => (
                  <MachineTile key={m.id} m={m} modo={m.modo} onConfigure={conhece(m.name) ? abrir : undefined} />
                ))}
              </div>
              {dialog}
            </div>
            <AlarmList alarms={alarms} />
          </section>

          <footer className="text-[11px] mono text-muted-foreground text-center py-4 border-t border-border">
            ICS · {kpis.emProducao} de {kpis.total} ativos em modo Produção (leitura do CLP via
            EtherNet/IP); os demais operam com gateway virtual OPC-UA/MQTT em simulação.
          </footer>
    </div>
  );
}
