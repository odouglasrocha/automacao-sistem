import { useEffect, useMemo, useState } from "react";
import { Cpu, Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import {
  usePlanoHoje,
  undDoPlano,
  horasDoPlano,
  eaNecessarias,
  ppmDoMaterial,
  HORAS_DIA,
  SETUP_MIN,
  PARADA_MIN,
  horasPorMaquinaPlano,
  HORAS_LIMITE_MAQUINA,
} from "@/hooks/usePlano";
import {
  useAlocacoes,
  useAlocacaoSave,
  useAlocacaoDelete,
  reservarMaquinas,
  cargaPorMaquina,
  horasLivres,
  HORAS_EA_DIA,
  ALOCACAO_SQL_HINT,
} from "@/hooks/useAlocacaoSku";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
}

function h(n: number) {
  return `${n.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}h`;
}

/**
 * Insere o SKU (item do planejamento do dia) e a quantidade de máquinas EA
 * necessárias para produzi-lo. A reserva das EAs é automática entre as livres.
 */
export function AlocacaoSkuDialog({
  open,
  onOpenChange,
  frota,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  /** Nomes das EAs disponíveis no chão de fábrica (EA34…EA58). */
  frota: string[];
}) {
  const { rows: plano, hoje, schemaMissing: planoMissing } = usePlanoHoje();
  const { rows: alocacoes, schemaMissing, isLoading } = useAlocacoes(hoje);
  const salvar = useAlocacaoSave();
  const remover = useAlocacaoDelete();

  const [cod, setCod] = useState("");
  const [qtd, setQtd] = useState(1);
  const [selecao, setSelecao] = useState<string[]>([]);

  const selecionado = plano.find((p) => p.cod_material_producao === cod);
  const atual = alocacoes.find((a) => a.cod_material_producao === cod);

  /** Horas já comprometidas em cada EA hoje (a alocação em edição não conta). */
  const carga = useMemo(() => cargaPorMaquina(alocacoes, atual?.id), [alocacoes, atual?.id]);

  const disponiveis = frota.filter((m) => horasLivres(carga, m) > 0.05);
  const livres = disponiveis.length;

  const horas = selecionado ? horasDoPlano(selecionado) : 0;
  const sugestao = selecionado ? eaNecessarias(selecionado) : 0;
  const horasPorEa = selecionado ? horasPorMaquinaPlano(selecionado, qtd || 1) : 0;
  /** Fila: quantos planejamentos já existem nas EAs escolhidas. */
  const fila = selecao.length
    ? Math.max(0, ...selecao.map((m) => (carga.get(m.trim().toUpperCase()) ?? 0) > 0.05 ? 1 : 0))
    : 0;

  /* Ao trocar o SKU, recalcula a Qtd. EA (UND ÷ PPm ÷ 60 ÷ 24h) e recarrega
     as máquinas já alocadas para esse SKU. */
  useEffect(() => {
    if (!selecionado) return;
    setQtd(atual?.qtd_ea || sugestao);
    setSelecao(atual?.maquinas ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cod]);

  function toggleMaquina(nome: string) {
    setSelecao((prev) => {
      const next = prev.includes(nome) ? prev.filter((m) => m !== nome) : [...prev, nome];
      setQtd(next.length || 0);
      return next;
    });
  }

  function onSalvar() {
    if (!selecionado) return;
    const escolhidas = selecao.filter((m) => frota.includes(m));
    /* Seleção manual manda: se o operador escolheu (ou reduziu) as EAs,
       respeitamos exatamente essa lista. Sem seleção, reserva automática. */
    const maquinas = escolhidas.length
      ? escolhidas.slice(0, Math.max(qtd || escolhidas.length, 1))
      : reservarMaquinas(frota, carga, atual?.maquinas ?? [], Math.max(qtd, 1), horas);
    if (!maquinas.length) {
      toast.error("Nenhuma EA com tempo livre hoje para este planejamento.");
      return;
    }
    const porEa = selecionado ? horasPorMaquinaPlano(selecionado, maquinas.length) : 0;
    const estourou = maquinas.filter((m) => horasLivres(carga, m) + 1e-6 < porEa);
    if (estourou.length) {
      toast.warning(
        `${estourou.join(", ")} passa das 24h com ${h(porEa)} — alocação salva mesmo assim.`,
      );
    }
    /* Fila da EA: entra depois dos planejamentos que já ocupam a máquina. */
    const ordem =
      1 +
      alocacoes.filter(
        (a) => a.id !== atual?.id && a.maquinas.some((m) => maquinas.includes(m)),
      ).length;
    salvar.mutate({
      id: atual?.id,
      data_plano: hoje,
      cod_material_producao: selecionado.cod_material_producao,
      material_producao: selecionado.material_producao,
      qtd_ea: maquinas.length,
      maquinas,
      observacao: null,
      ordem,
      horas_estimadas: Number(porEa.toFixed(2)),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-4 w-4 text-primary" />
            SKU × máquinas EA
          </DialogTitle>
          <DialogDescription>
            Informe o SKU do planejamento de hoje e quantas EAs são necessárias. As descargas/h
            dessas máquinas alimentam o Progresso (UND) da ordem de produção.
          </DialogDescription>
        </DialogHeader>

        {(schemaMissing || planoMissing) && (
          <div className="text-xs px-3 py-2 rounded-md border border-warning/40 bg-warning/10 text-warning">
            {schemaMissing ? ALOCACAO_SQL_HINT : "Sem planejamento carregado para hoje."}
          </div>
        )}

        <div className="grid gap-3 sm:grid-cols-[1fr_120px_auto] items-end">
          <label className="text-xs text-muted-foreground grid gap-1">
            SKU (plano de hoje)
            <select
              value={cod}
              onChange={(e) => setCod(e.target.value)}
              className="h-9 rounded-md border border-border bg-background px-2 text-sm text-foreground"
            >
              <option value="">Selecione…</option>
              {plano.map((p) => (
                <option key={p.id} value={p.cod_material_producao}>
                  {p.cod_material_producao}-{p.material_producao}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-muted-foreground grid gap-1">
            Qtd. EA
            <Input
              type="number"
              min={0}
              max={frota.length}
              value={qtd}
              onChange={(e) => setQtd(Math.max(0, Number(e.target.value) || 0))}
            />
          </label>
          <Button onClick={onSalvar} disabled={!selecionado || salvar.isPending}>
            {salvar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Alocar"}
          </Button>
        </div>

        <div className="text-[11px] mono text-muted-foreground">
          {livres} EA livre(s) de {frota.length}
          {selecionado
            ? ` · UND: ${fmt(undDoPlano(selecionado))} · PPm: ${ppmDoMaterial(
                selecionado.cod_material_producao,
                selecionado.material_producao,
              )} · setup+parada: ${SETUP_MIN + PARADA_MIN}min · tempo total: ${h(
                horas,
              )} · ${h(horasPorEa)} por EA com ${
                qtd || 1
              } EA · sugestão: ${sugestao} EA (janela ${HORAS_LIMITE_MAQUINA}h de ${HORAS_DIA}h / 3 turnos)${
                fila ? " · será agendado após a produção atual da EA" : ""
              }`
            : ""}
        </div>

        {selecionado && (
          <div className="grid gap-1">
            <span className="text-xs text-muted-foreground">
              Escolher EA (opcional — vazio reserva automaticamente). EA com produção em
              andamento aceita novo agendamento se houver margem nas 24h.
            </span>
            <div className="flex flex-wrap gap-1.5">
              {frota.map((m) => {
                const livre = horasLivres(carga, m);
                const semMargem = livre <= 0.05 || livre + 1e-6 < horasPorEa;
                const ativa = selecao.includes(m);
                const ocupada = livre < HORAS_EA_DIA - 0.05;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => toggleMaquina(m)}
                    aria-pressed={ativa}
                    title={`${m} · ${h(livre)} livres de ${HORAS_EA_DIA}h${
                      semMargem ? " · sem margem (permitido mesmo assim)" : ""
                    }`}
                    className={`mono text-[11px] rounded-md border px-2 py-1 transition-colors ${
                      ativa
                        ? "border-primary bg-primary/15 text-primary"
                        : semMargem
                          ? "border-danger/40 text-danger/70 hover:border-danger"
                          : ocupada
                            ? "border-warning/50 text-warning hover:border-warning"
                            : "border-border text-foreground hover:border-primary/60"
                    }`}
                  >
                    {m} <span className="opacity-70">{h(livre)}</span>
                  </button>
                );
              })}
            </div>
            <span className="text-[11px] mono text-muted-foreground">
              {selecao.length
                ? `${selecao.length} selecionada(s) · ${h(horasPorEa)} em cada EA`
                : `${disponiveis.length} livre(s) para reserva automática`}
            </span>
          </div>
        )}

        <div className="hud-panel p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left font-medium py-2 px-2">SKU</th>
                <th className="text-left font-medium py-2 px-2">Qtd. EA</th>
                <th className="text-left font-medium py-2 px-2">Tempo est.</th>
                <th className="text-left font-medium py-2 px-2">Fila</th>
                <th className="text-left font-medium py-2 px-2">Máquinas</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="py-3 px-2 text-muted-foreground text-xs">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && alocacoes.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-3 px-2 text-muted-foreground text-xs">
                    Nenhum SKU alocado para hoje.
                  </td>
                </tr>
              )}
              {alocacoes.map((a) => (
                <tr key={a.id} className="border-t border-border">
                  <td className="py-2 px-2 mono text-xs">
                    {a.cod_material_producao}-{a.material_producao}
                  </td>
                  <td className="py-2 px-2 mono tabular-nums">{a.qtd_ea}</td>
                  <td className="py-2 px-2 mono tabular-nums text-xs">
                    {h(a.horas_estimadas)} / EA
                  </td>
                  <td className="py-2 px-2 text-xs">
                    {a.ordem > 1 ? (
                      <span className="text-warning">Agendado ({a.ordem}º)</span>
                    ) : (
                      <span className="text-success">Em produção</span>
                    )}
                  </td>
                  <td className="py-2 px-2 mono text-xs text-muted-foreground">
                    {a.maquinas.join(", ") || "—"}
                  </td>
                  <td className="py-2 px-2 text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => remover.mutate(a.id)}
                      aria-label={`Remover alocação de ${a.material_producao}`}
                    >
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </DialogContent>
    </Dialog>
  );
}