import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Factory, Cpu } from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";
import { MachineTile } from "@/components/hud/MachineTile";
import { useMachineConfig } from "@/components/hud/ea/useMachineConfig";
import { AlocacaoSkuDialog } from "@/components/hud/ea/AlocacaoSkuDialog";
import { useProducaoPorSku } from "@/hooks/useAlocacaoSku";
import { useEaRuntime, applyRuntime } from "@/hooks/useEaRuntime";
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
  const { machines: simuladas } = useIndustrialSimulation();
  const runtime = useEaRuntime();
  const machines = applyRuntime(simuladas, runtime);
  const { abrir, dialog, conhece } = useMachineConfig();
  const emProducao = machines.filter((m) => m.modo === "producao").length;
  const [alocacaoAberta, setAlocacaoAberta] = useState(false);
  const { skuPorMaquina, porSku } = useProducaoPorSku(machines);
  const undProduzidas = Array.from(porSku.values()).reduce((s, p) => s + p.und, 0);

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
      description={`Mapa em tempo real de todas as máquinas, linhas e ativos. ${emProducao} de ${machines.length} em modo Produção (dados do CLP); as demais em Simulação.`}
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

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {porSku.size > 0
            ? `${porSku.size} SKU(s) alocado(s) · ${undProduzidas.toLocaleString("pt-BR")} UND/h em produção real`
            : "Nenhum SKU alocado às EAs para hoje"}
        </div>
        <button
          type="button"
          onClick={() => setAlocacaoAberta(true)}
          className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-md border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          <Cpu className="h-3.5 w-3.5" />
          Inserir SKU · quantidade de EA
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {machines.map((m) => (
          <MachineTile
            key={m.id}
            m={m}
            modo={m.modo}
            sku={skuPorMaquina.get(m.name.trim().toUpperCase()) ?? null}
            onConfigure={conhece(m.name) ? abrir : undefined}
          />
        ))}
      </div>
      {dialog}
      <AlocacaoSkuDialog
        open={alocacaoAberta}
        onOpenChange={setAlocacaoAberta}
        frota={machines.map((m) => m.name)}
      />
    </ModulePage>
  );
}