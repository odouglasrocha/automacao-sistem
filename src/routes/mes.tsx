import { createFileRoute } from "@tanstack/react-router";
import { ClipboardList, Play, Pause, CheckCircle2 } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";
import { useMemo, useState } from "react";
import { PlanoDialog } from "@/components/hud/PlanoDialog";
import { ApontamentoDialog } from "@/components/hud/ea/ApontamentoDialog";
import {
  usePlanoHoje,
  undDoPlano,
  toneladasDeUnd,
  palletsDeUnd,
  PLANO_SQL_HINT,
} from "@/hooks/usePlano";
import { getShelfLifeExpirationDate } from "@/data/ShelfLif";
import { CodigoJuliano } from "@/data/CodigoJuliano";
import { useIndustrialSimulation } from "@/lib/simulation";
import { useEaRuntime, applyRuntime } from "@/hooks/useEaRuntime";
import { useProducaoPorSku } from "@/hooks/useAlocacaoSku";

/** Código juliano (LSxxx) do dia informado (ISO yyyy-mm-dd). */
function julianoDoDia(iso: string): string {
  const [, mes, dia] = iso.split("-").map(Number);
  const linha = CodigoJuliano.find((l) => l.Dia === dia) as
    | Record<string, string | number>
    | undefined;
  return (linha?.[`Col${mes}`] as string) ?? "—";
}

/** Marca/linha do material (primeira palavra do descritivo). */
function linhaDoMaterial(material: string, fallback?: string | null): string {
  const marca = String(material ?? "").trim().split(/\s+/)[0];
  return marca || fallback || "—";
}

const PLANEJAMENTO = "Inserir planejamento de produção";
const APONTAMENTO = "Apontamento por operador";

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
  const [planoAberto, setPlanoAberto] = useState(false);
  const [apontamentoAberto, setApontamentoAberto] = useState(false);
  const { rows: planoHoje, isLoading: carregandoPlano, schemaMissing, hoje } = usePlanoHoje();
  const validadeSemana = getShelfLifeExpirationDate(hoje);
  const juliano = julianoDoDia(hoje);

  // Produção real do chão de fábrica (Descargas/h das EAs alocadas ao SKU).
  const { machines: simuladas } = useIndustrialSimulation();
  const runtime = useEaRuntime();
  const machines = applyRuntime(simuladas, runtime);
  const { porSku, skuPorMaquina, apontadoTotal } = useProducaoPorSku(machines);

  // Ordens derivadas do planejamento do dia (plano × Caixas = UND planejadas).
  const ordensPlano = useMemo(
    () =>
      planoHoje.map((p) => {
        const prod = porSku.get(p.cod_material_producao);
        const qty = Math.round(undDoPlano(p));
        const done = Math.min(qty, prod?.und ?? 0);
        const status = done >= qty && qty > 0 ? "done" : (prod?.maquinas.length ?? 0) > 0 ? "producing" : "queued";
        return {
          id: `${new Date(`${validadeSemana}T00:00:00`).toLocaleDateString("pt-BR")} · ${juliano}`,
          sku: `${p.cod_material_producao}-${p.material_producao}`,
          material: p.material_producao,
          cod: p.cod_material_producao,
          qty,
          done,
          status,
          line: linhaDoMaterial(p.material_producao, p.linha),
          start: prod && prod.maquinas.length > 0 ? `${prod.maquinas.length} EA · ${prod.descargasHora} desc/h` : "—",
        };
      }),
    [planoHoje, validadeSemana, juliano, porSku],
  );
  const usandoPlano = ordensPlano.length > 0;
  const lista = usandoPlano
    ? ordensPlano
    : ORDERS.map((o) => ({ ...o, material: o.sku, cod: "", line: o.line }));
  const undTotal = ordensPlano.reduce((s, o) => s + o.qty, 0);

  return (
    <ModulePage
      icon={ClipboardList}
      eyebrow="MES · Manufacturing Execution"
      title="Ordens de Produção"
      description="Planejamento, sequenciamento, apontamento por operador/máquina e rastreabilidade por lote."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          label="OPs Abertas"
          value={usandoPlano ? String(ordensPlano.length) : "18"}
          icon={ClipboardList}
          tone="primary"
          sub={usandoPlano ? "plano de hoje" : "turno atual"}
        />
        <KpiCard
          label="UND planejadas"
          value={usandoPlano ? undTotal.toLocaleString("pt-BR") : "—"}
          icon={Play}
          tone="success"
          sub="cx/fardos × caixas"
        />
        <KpiCard label="Concluídas hoje" value="12" icon={CheckCircle2} tone="info" delta={8.3} sub="vs. ontem" />
        <KpiCard label="Atrasadas" value="2" icon={Pause} tone="danger" sub="prioridade alta" />
      </section>

      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
          {usandoPlano
            ? `Planejamento de hoje · ${new Date().toLocaleDateString("pt-BR")}`
            : carregandoPlano
              ? "Carregando planejamento…"
              : "Sem planejamento para hoje · exibindo ordens de exemplo"}
          {apontadoTotal > 0 &&
            ` · ${apontadoTotal.toLocaleString("pt-BR")} UND apontadas por operadores`}
        </div>
        <button
          type="button"
          onClick={() => setPlanoAberto(true)}
          className="text-xs px-3 py-1.5 rounded-md border border-primary/50 bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
        >
          Inserir planejamento de produção
        </button>
      </div>

      {schemaMissing && (
        <div className="text-xs px-3 py-2 rounded-md border border-warning/40 bg-warning/10 text-warning">
          {PLANO_SQL_HINT}
        </div>
      )}

      <div className="hud-panel p-4 overflow-x-auto">
        <table className="w-full text-[11px] sm:text-xs md:text-sm 2xl:text-base">
          <thead>
            <tr className="text-[9px] sm:text-[10px] 2xl:text-xs uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">OP</th>
              <th className="text-left font-medium py-2 px-2">SKU</th>
              <th className="text-left font-medium py-2 px-2">Linha</th>
              <th className="text-left font-medium py-2 px-2">EA · Descargas/h</th>
              <th className="text-left font-medium py-2 px-2">Progresso (UND)</th>
              <th className="text-right font-medium py-2 px-2">Toneladas</th>
              <th className="text-right font-medium py-2 px-2">Pallets</th>
              <th className="text-left font-medium py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((o) => {
              const s = STATUS[o.status];
              const Icon = s.icon;
              const pct = o.qty > 0 ? (o.done / o.qty) * 100 : 0;
              // Base de cálculo: produção real quando houver apontamento,
              // senão o planejado (meta) — assim os valores sempre aparecem.
              const baseUnd = o.done > 0 ? o.done : o.qty;
              const tons = toneladasDeUnd(baseUnd, o.cod, o.material);
              const pallets = palletsDeUnd(baseUnd, o.cod, o.material);
              return (
                <tr key={o.id} className="border-t border-border hover:bg-muted/20">
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 mono text-foreground">{o.id}</td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 mono text-muted-foreground">{o.sku}</td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2">{o.line}</td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 mono text-muted-foreground">{o.start}</td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-background/60 overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${pct}%` }} />
                      </div>
                      <span className="mono text-[10px] sm:text-xs 2xl:text-sm text-muted-foreground tabular-nums w-20 sm:w-24 2xl:w-28 text-right">
                        {o.done.toLocaleString("pt-BR")}/{o.qty.toLocaleString("pt-BR")}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-right mono tabular-nums">
                    {tons > 0
                      ? tons.toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })
                      : "—"}
                  </td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2 text-right mono tabular-nums">
                    {pallets > 0 ? pallets.toLocaleString("pt-BR") : "—"}
                  </td>
                  <td className="py-2 px-1.5 sm:py-2.5 sm:px-2">
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
          APONTAMENTO,
          "Rastreabilidade por lote/serial",
          PLANEJAMENTO,
          "Integração ERP/SAP",
          "Calendário industrial de turnos",
        ]}
        onSelect={(item) => {
          if (item === PLANEJAMENTO) setPlanoAberto(true);
          if (item === APONTAMENTO) setApontamentoAberto(true);
        }}
      />

      <PlanoDialog open={planoAberto} onOpenChange={setPlanoAberto} />
      <ApontamentoDialog
        open={apontamentoAberto}
        onOpenChange={setApontamentoAberto}
        maquinas={machines.map((m) => ({
          nome: m.name,
          modo: m.modo,
          sku: skuPorMaquina.get(m.name.trim().toUpperCase()) ?? null,
        }))}
      />
    </ModulePage>
  );
}