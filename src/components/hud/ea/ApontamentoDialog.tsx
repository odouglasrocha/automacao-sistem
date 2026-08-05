import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck, Radio, Trash2, TriangleAlert } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useOperador } from "@/context/OperadorProvider";
import { turnoAtual } from "@/lib/turnos";
import {
  APONTAMENTO_SQL_HINT,
  paraUnd,
  useApontamentoDelete,
  useApontamentoSave,
  useApontamentos,
  useOperadoresCadastro,
  type UnidadeApontamento,
} from "@/hooks/useApontamento";

export interface MaquinaApontavel {
  nome: string;
  modo: "producao" | "simulacao";
  sku?: { cod: string; material: string } | null;
}

/**
 * Apontamento manual de produção por operador.
 * Só é possível registrar em EAs no modo Produção — máquinas em simulação
 * não recebem apontamento (os números vêm do gerador virtual).
 */
export function ApontamentoDialog({
  open,
  onOpenChange,
  maquinas,
  maquinaInicial,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  maquinas: MaquinaApontavel[];
  maquinaInicial?: string | null;
}) {
  const { operador, vincular } = useOperador();
  const { operadores } = useOperadoresCadastro();
  const { rows, schemaMissing, dia } = useApontamentos();
  const salvar = useApontamentoSave();
  const remover = useApontamentoDelete();

  const emProducao = useMemo(
    () => maquinas.filter((m) => m.modo === "producao"),
    [maquinas],
  );

  const [maquina, setMaquina] = useState<string>("");
  const [quantidade, setQuantidade] = useState("");
  const [unidade, setUnidade] = useState<UnidadeApontamento>("und");
  const [observacao, setObservacao] = useState("");
  const [matriculaManual, setMatriculaManual] = useState("");

  // Chave estável das EAs em produção: o array `maquinas` é recriado a cada
  // render (simulação em tempo real) e reexecutaria o efeito, apagando o que
  // o operador está digitando.
  const chaveEmProducao = emProducao.map((m) => m.nome).join("|");

  useEffect(() => {
    if (!open) return;
    const nomes = chaveEmProducao ? chaveEmProducao.split("|") : [];
    setMaquina(
      maquinaInicial && nomes.includes(maquinaInicial)
        ? maquinaInicial
        : (nomes[0] ?? ""),
    );
    setQuantidade("");
    setObservacao("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, maquinaInicial]);

  // Se a EA selecionada sumir da lista (mudou de modo), reposiciona sem
  // limpar os campos digitados.
  useEffect(() => {
    if (!open) return;
    const nomes = chaveEmProducao ? chaveEmProducao.split("|") : [];
    if (maquina && nomes.includes(maquina)) return;
    setMaquina(nomes[0] ?? "");
  }, [open, chaveEmProducao, maquina]);

  const selecionada = emProducao.find((m) => m.nome === maquina) ?? null;
  const sku = selecionada?.sku ?? null;
  const qtd = Number(String(quantidade).replace(",", "."));
  const undPrevisto =
    Number.isFinite(qtd) && qtd > 0
      ? paraUnd(qtd, unidade, sku?.cod, sku?.material)
      : 0;

  const doMaquina = rows.filter(
    (r) => r.maquina.toUpperCase() === maquina.trim().toUpperCase(),
  );
  const totalMaquina = doMaquina.reduce((s, r) => s + r.und, 0);

  const usarMatricula = async () => {
    const m = matriculaManual.trim();
    const cad = operadores.find((o) => o.matricula === m);
    try {
      await vincular(m, cad?.nome);
      setMatriculaManual("");
    } catch (e: any) {
      toast.error(e?.message ?? "Não foi possível vincular o operador.");
    }
  };

  const registrar = async () => {
    if (!operador) return toast.error("Vincule o operador antes de apontar.");
    if (!selecionada) return toast.error("Selecione uma EA em modo Produção.");
    if (!(qtd > 0)) return toast.error("Informe a quantidade produzida.");
    await salvar.mutateAsync({
      data_plano: dia,
      maquina: selecionada.nome,
      cod_material_producao: sku?.cod ?? null,
      material_producao: sku?.material ?? null,
      quantidade: qtd,
      unidade,
      turno: turnoAtual().id,
      operador_matricula: operador.matricula,
      operador_nome: operador.nome,
      observacao: observacao.trim() || null,
    });
    setQuantidade("");
    setObservacao("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ClipboardCheck className="h-4 w-4 text-primary" />
            Apontamento por operador
          </DialogTitle>
          <DialogDescription>
            Registro manual da quantidade produzida na EA. Válido apenas para máquinas em
            modo Produção · {new Date(`${dia}T00:00:00`).toLocaleDateString("pt-BR")} ·{" "}
            {turnoAtual().label}
          </DialogDescription>
        </DialogHeader>

        {schemaMissing && (
          <div className="text-xs px-3 py-2 rounded-md border border-warning/40 bg-warning/10 text-warning">
            {APONTAMENTO_SQL_HINT}
          </div>
        )}

        {!operador ? (
          <div className="space-y-2 rounded-md border border-border bg-background/40 p-3">
            <div className="text-xs text-muted-foreground">
              Vincule o operador (matrícula do cadastro) para liberar o apontamento.
            </div>
            <div className="flex gap-2">
              <Input
                list="operadores-cadastro"
                value={matriculaManual}
                onChange={(e) => setMatriculaManual(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void usarMatricula()}
                placeholder="Matrícula"
              />
              <datalist id="operadores-cadastro">
                {operadores.map((o) => (
                  <option key={o.matricula} value={o.matricula}>
                    {o.nome}
                  </option>
                ))}
              </datalist>
              <Button onClick={() => void usarMatricula()}>Vincular</Button>
            </div>
          </div>
        ) : (
          <div className="text-xs mono text-muted-foreground">
            Operador: <span className="text-primary">{operador.matricula}</span> ·{" "}
            {operador.nome}
          </div>
        )}

        {emProducao.length === 0 ? (
          <div className="flex items-start gap-2 rounded-md border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
            <TriangleAlert className="h-4 w-4 shrink-0" />
            Nenhuma EA em modo Produção. O apontamento manual só é válido quando a máquina
            está operando com dados reais do CLP.
          </div>
        ) : (
          <>
            <div>
              <Label>EA em produção</Label>
              <div className="mt-1 flex flex-wrap gap-1.5">
                {emProducao.map((m) => (
                  <button
                    key={m.nome}
                    type="button"
                    onClick={() => setMaquina(m.nome)}
                    className={`inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs mono transition-colors ${
                      m.nome === maquina
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-background/40 text-muted-foreground hover:border-primary/40"
                    }`}
                  >
                    <Radio className="h-3 w-3" />
                    {m.nome}
                  </button>
                ))}
              </div>
              <div className="mt-2 text-[11px] mono text-muted-foreground">
                {sku
                  ? `SKU alocado: ${sku.cod} · ${sku.material}`
                  : "Sem SKU alocado a esta EA — o apontamento fica sem vínculo de material."}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                <Label>Quantidade produzida</Label>
                <Input
                  inputMode="decimal"
                  value={quantidade}
                  onChange={(e) => setQuantidade(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && void registrar()}
                  placeholder="ex.: 1250"
                />
              </div>
              <div>
                <Label>Unidade</Label>
                <div className="mt-1 flex gap-1">
                  {(["und", "cx"] as UnidadeApontamento[]).map((u) => (
                    <button
                      key={u}
                      type="button"
                      onClick={() => setUnidade(u)}
                      className={`flex-1 rounded-md border px-2 py-1.5 text-xs uppercase transition-colors ${
                        u === unidade
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-background/40 text-muted-foreground"
                      }`}
                    >
                      {u === "und" ? "UND" : "CX/Fardo"}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <Label>Observação</Label>
              <Input
                value={observacao}
                onChange={(e) => setObservacao(e.target.value)}
                placeholder="Opcional (parada, refugo, troca de bobina…)"
              />
            </div>

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-[11px] mono text-muted-foreground">
                Equivalente: <span className="text-primary">{undPrevisto.toLocaleString("pt-BR")}</span> UND
                {" · "}Total apontado em {maquina || "—"}: {totalMaquina.toLocaleString("pt-BR")} UND
              </div>
              <Button
                disabled={!operador || salvar.isPending || !(qtd > 0)}
                onClick={() => void registrar()}
              >
                {salvar.isPending ? "Registrando…" : "Registrar apontamento"}
              </Button>
            </div>
          </>
        )}

        <div className="rounded-md border border-border">
          <div className="px-3 py-2 text-[10px] uppercase tracking-widest text-muted-foreground">
            Apontamentos de hoje ({rows.length})
          </div>
          <div className="max-h-56 overflow-y-auto">
            {rows.length === 0 ? (
              <div className="px-3 py-4 text-xs text-muted-foreground">
                Nenhum apontamento registrado hoje.
              </div>
            ) : (
              <table className="w-full text-xs">
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="px-3 py-2 mono text-foreground">{r.maquina}</td>
                      <td className="px-2 py-2 mono text-muted-foreground truncate max-w-[12rem]">
                        {r.material_producao ?? "—"}
                      </td>
                      <td className="px-2 py-2 mono tabular-nums text-primary">
                        {r.und.toLocaleString("pt-BR")} UND
                      </td>
                      <td className="px-2 py-2 mono text-muted-foreground">
                        {r.operador_matricula} · {r.operador_nome}
                      </td>
                      <td className="px-2 py-2 text-right">
                        <button
                          type="button"
                          title="Remover apontamento"
                          onClick={() => remover.mutate(r.id)}
                          className="text-muted-foreground hover:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
