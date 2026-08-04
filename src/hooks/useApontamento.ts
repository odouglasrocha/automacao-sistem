import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { isSchemaMissing } from "@/hooks/useEaMachine";
import { undPorCaixa } from "@/hooks/usePlano";
import { getCurrentDateInSaoPauloISO } from "@/data/ShelfLif";

export const APONTAMENTO_SQL_HINT =
  "Tabela `ea_apontamento` ainda não criada — rode docs/sql/0009_apontamento.sql no SQL Editor do Supabase.";

export type UnidadeApontamento = "und" | "cx";

export interface Apontamento {
  id: string;
  data_plano: string;
  maquina: string;
  cod_material_producao: string | null;
  material_producao: string | null;
  quantidade: number;
  unidade: UnidadeApontamento;
  und: number;
  turno: number | null;
  operador_matricula: string;
  operador_nome: string;
  observacao: string | null;
  created_at: string;
}

/** Converte a quantidade digitada para UND usando o fator de data/materials.ts. */
export function paraUnd(
  quantidade: number,
  unidade: UnidadeApontamento,
  cod?: string | null,
  material?: string | null,
): number {
  if (unidade === "und") return Math.round(quantidade);
  const fator = undPorCaixa(cod ?? "", material ?? undefined);
  return Math.round(quantidade * (fator || 1));
}

/** Apontamentos manuais do dia (fuso São Paulo). */
export function useApontamentos(dataPlano?: string) {
  const dia = dataPlano ?? getCurrentDateInSaoPauloISO();
  const q = useQuery<{ rows: Apontamento[]; schemaMissing: boolean }>({
    queryKey: ["ea_apontamento", dia],
    retry: false,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_apontamento")
        .select("*")
        .eq("data_plano", dia)
        .order("created_at", { ascending: false });
      if (error) {
        if (isSchemaMissing(error)) return { rows: [], schemaMissing: true };
        throw error;
      }
      return {
        rows: (data ?? []).map((r: any) => ({
          ...r,
          quantidade: Number(r.quantidade ?? 0),
          und: Number(r.und ?? 0),
        })) as Apontamento[],
        schemaMissing: false,
      };
    },
  });
  return {
    ...q,
    dia,
    rows: q.data?.rows ?? [],
    schemaMissing: q.data?.schemaMissing ?? false,
  };
}

function handle(e: any, acao: string): never {
  if (isSchemaMissing(e)) throw new Error(APONTAMENTO_SQL_HINT);
  throw new Error(e?.message ?? `Erro ao ${acao} apontamento`);
}

export function useApontamentoSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<Apontamento, "id" | "created_at" | "und"> & { id?: string }) => {
      const payload = {
        data_plano: row.data_plano,
        maquina: row.maquina.trim().toUpperCase(),
        cod_material_producao: row.cod_material_producao ?? null,
        material_producao: row.material_producao ?? null,
        quantidade: row.quantidade,
        unidade: row.unidade,
        und: paraUnd(row.quantidade, row.unidade, row.cod_material_producao, row.material_producao),
        turno: row.turno ?? null,
        operador_matricula: row.operador_matricula,
        operador_nome: row.operador_nome,
        observacao: row.observacao ?? null,
      };
      const { error } = row.id
        ? await supabase.from("ea_apontamento").update(payload).eq("id", row.id)
        : await supabase.from("ea_apontamento").insert(payload);
      if (error) handle(error, "salvar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_apontamento"] });
      toast.success("Apontamento registrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useApontamentoDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ea_apontamento").delete().eq("id", id);
      if (error) handle(error, "remover");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_apontamento"] });
      toast.success("Apontamento removido");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Totais apontados por EA e por SKU no dia. */
export function useApontamentoTotais(dataPlano?: string) {
  const { rows, schemaMissing, dia, isLoading } = useApontamentos(dataPlano);
  return useMemo(() => {
    const porMaquina = new Map<string, number>();
    const porSku = new Map<string, number>();
    rows.forEach((a) => {
      const key = a.maquina.trim().toUpperCase();
      porMaquina.set(key, (porMaquina.get(key) ?? 0) + a.und);
      if (a.cod_material_producao)
        porSku.set(a.cod_material_producao, (porSku.get(a.cod_material_producao) ?? 0) + a.und);
    });
    const total = rows.reduce((s, a) => s + a.und, 0);
    return { rows, porMaquina, porSku, total, schemaMissing, dia, isLoading };
  }, [rows, schemaMissing, dia, isLoading]);
}

export interface OperadorCadastro {
  matricula: string;
  nome: string;
  ativo: boolean;
}

/** Cadastro de operadores (tabela operadores) para seleção no apontamento. */
export function useOperadoresCadastro() {
  const q = useQuery<OperadorCadastro[]>({
    queryKey: ["operadores"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("operadores")
        .select("matricula, nome, ativo")
        .order("nome", { ascending: true });
      if (error) {
        if (isSchemaMissing(error)) return [];
        throw error;
      }
      return (data ?? []).map((r: any) => ({
        matricula: String(r.matricula),
        nome: r.nome ?? "",
        ativo: r.ativo !== false,
      }));
    },
  });
  return { operadores: (q.data ?? []).filter((o) => o.ativo), isLoading: q.isLoading };
}
