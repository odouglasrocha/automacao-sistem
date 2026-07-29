import { createFileRoute } from "@tanstack/react-router";
import { Activity } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";
import { AlarmList } from "@/components/hud/AlarmList";
import { ProductionChart } from "@/components/hud/ProductionChart";
import { useIndustrialSimulation } from "@/lib/simulation";

export const Route = createFileRoute("/scada")({
  head: () => ({
    meta: [
      { title: "SCADA · ICS" },
      { name: "description", content: "Sinóticos, alarmes, tendências e comandos em tempo real." },
    ],
  }),
  component: SCADA,
});

function SCADA() {
  const { alarms, history, machines } = useIndustrialSimulation();

  return (
    <ModulePage
      icon={Activity}
      eyebrow="Supervisory Control & Data Acquisition"
      title="SCADA · Supervisão"
      description="Sinóticos, tendências históricas, alarmes e comandos remotos aos PLCs."
    >
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        <div className="xl:col-span-2 space-y-4">
          <ProductionChart data={history} />
          <div className="hud-panel p-4">
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
              Sinótico simplificado · pontos monitorados
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {machines.slice(0, 8).map((m) => (
                <div key={m.id} className="p-3 rounded-md border border-border bg-background/40">
                  <div className="text-[10px] mono text-muted-foreground truncate">{m.id}</div>
                  <div className="text-sm font-semibold text-foreground truncate">{m.name}</div>
                  <div className="mt-2 grid grid-cols-3 gap-1 text-[11px] mono">
                    <span className="text-primary tabular-nums">{m.rpm.toFixed(0)}</span>
                    <span className="text-warning tabular-nums">{m.temperature.toFixed(0)}°</span>
                    <span className="text-success tabular-nums">{m.current.toFixed(1)}A</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <AlarmList alarms={alarms} />
      </div>
    </ModulePage>
  );
}