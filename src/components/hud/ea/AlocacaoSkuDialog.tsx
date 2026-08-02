import { useMemo, useState } from "react";
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
import { usePlanoHoje, undDoPlano } from "@/hooks/usePlano";
import {
  useAlocacoes,
  useAlocacaoSave,
  useAlocacaoDelete,
  reservarMaquinas,
  ALOCACAO_SQL_HINT,
} from "@/hooks/useAlocacaoSku";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 0 });
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

  const selecionado = plano.find((p) => p.cod_material_producao === cod);

  const ocupadas = useMemo(() => {
    const s = new Set<string>();
    alocacoes.forEach((a) => {
      if (a.cod_material_producao !== cod) a.maquinas.forEach((m) => s.add(m));
    });
    return s;
  }, [alocacoes, cod]);

  const livres = frota.filter((m) => !ocupadas.has(m)).length;

  function onSalvar() {
    if (!selecionado) return;
    const atual = alocacoes.find((a) => a.cod_material_producao === cod);
    const maquinas = reservarMaquinas(frota, ocupadas, atual?.maquinas ?? [], qtd);
    salvar.mutate({
      id: atual?.id,
      data_plano: hoje,
      cod_material_producao: selecionado.cod_material_producao,
      material_producao: selecionado.material_producao,
      qtd_ea: qtd,
      maquinas,
      observacao: null,
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
          {selecionado ? ` · UND planejadas: ${fmt(undDoPlano(selecionado))}` : ""}
        </div>

        <div className="hud-panel p-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                <th className="text-left font-medium py-2 px-2">SKU</th>
                <th className="text-left font-medium py-2 px-2">Qtd. EA</th>
                <th className="text-left font-medium py-2 px-2">Máquinas</th>
                <th className="py-2 px-2" />
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={4} className="py-3 px-2 text-muted-foreground text-xs">
                    Carregando…
                  </td>
                </tr>
              )}
              {!isLoading && alocacoes.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 px-2 text-muted-foreground text-xs">
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