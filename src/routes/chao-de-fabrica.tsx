import { createFileRoute } from "@tanstack/react-router";
import { Factory } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";
import { MachineTile } from "@/components/hud/MachineTile";
import { useIndustrialSimulation, STATUS_META, type MachineStatus } from "@/lib/simulation";

export const Route = createFileRoute("/chao-de-fabrica")({
  head: () => ({
    meta: [
      { title: "Chão de Fábrica · ICS" },
      { name: "description", content: "Visão consolidada de todos os ativos, status e telemetria em tempo real." },
    ],
  }),
  component: ChaoDeFabrica,
});

function ChaoDeFabrica() {
  const { machines } = useIndustrialSimulation();

  const counts = machines.reduce<Record<MachineStatus, number>>((acc, m) => {
    acc[m.status] = (acc[m.status] ?? 0) + 1;
    return acc;
  }, {} as Record<MachineStatus, number>);

  const statuses = Object.keys(STATUS_META) as MachineStatus[];

  return (
    <ModulePage
      icon={Factory}
      eyebrow="Operações"
      title="Chão de Fábrica"
      description="Mapa em tempo real de todas as máquinas, linhas e ativos monitorados via OPC-UA e MQTT."
    >
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statuses.map((s) => {
          const meta = STATUS_META[s];
          return (
            <div key={s} className={`hud-panel p-3 border ${meta.bg}`}>
              <div className={`text-[10px] uppercase tracking-widest ${meta.color}`}>
                {meta.label}
              </div>
              <div className="text-2xl font-bold text-foreground mono tabular-nums mt-1">
                {counts[s] ?? 0}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {machines.map((m) => (
          <MachineTile key={m.id} m={m} />
        ))}
      </div>
    </ModulePage>
  );
}