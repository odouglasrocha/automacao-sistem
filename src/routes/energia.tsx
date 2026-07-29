import { createFileRoute } from "@tanstack/react-router";
import { Zap, Leaf, TrendingDown, Gauge } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";
import { ProductionChart } from "@/components/hud/ProductionChart";
import { useIndustrialSimulation } from "@/lib/simulation";

export const Route = createFileRoute("/energia")({
  head: () => ({
    meta: [
      { title: "Energia · ICS" },
      { name: "description", content: "Consumo, demanda, fator de potência e eficiência energética." },
    ],
  }),
  component: Energia,
});

function Energia() {
  const { history, machines } = useIndustrialSimulation();
  const totalKWh = machines.reduce((s, m) => s + m.current * 0.38, 0);

  return (
    <ModulePage
      icon={Zap}
      eyebrow="Energy Management"
      title="Energia & Sustentabilidade"
      description="Monitoramento por planta, linha e máquina · demanda contratada · fator de potência · CO₂."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Consumo atual" value={totalKWh.toFixed(1)} unit="kWh" icon={Zap} tone="warning" delta={-2.4} />
        <KpiCard label="Demanda" value="742" unit="kW" icon={Gauge} tone="primary" sub="contratada 900 kW" />
        <KpiCard label="Fator de Potência" value="0.94" icon={TrendingDown} tone="success" sub="mínimo 0.92" />
        <KpiCard label="Emissão CO₂ (dia)" value="1.28" unit="tCO₂e" icon={Leaf} tone="info" delta={-5.6} />
      </section>

      <ProductionChart data={history} />
    </ModulePage>
  );
}