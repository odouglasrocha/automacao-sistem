import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isSchemaMissing } from "@/hooks/useEaMachine";
import { materialsData } from "@/data/materials";
import { getCurrentDateInSaoPauloISO } from "@/data/ShelfLif";

export interface PlanoRow {
  id: string;
  cod_material_producao: string;
  material_producao: string;
  plano_caixas_fardos: number;
  tons: number;
  linha: string | null;
  data_plano: string;
}

/** Estrutura crua vinda da planilha .xlsx */
export interface PlanoImportRow {
  CodMaterialProducao: string | number;
  MaterialProducao: string;
  PlanoCaixasFardos: number;
  Tons: number;
  Linha?: string;
}

export const PLANO_SQL_HINT =
  "Tabela `plano` ainda não criada — rode docs/sql/0005_plano.sql no SQL Editor do Supabase.";

/** Caixas por unidade de embalagem, indexado pelo código do material. */
const CAIXAS_POR_COD = new Map<string, number>(
  materialsData.map((m) => [String(m.Codigo), m.Caixas]),
);
const CAIXAS_POR_NOME = new Map<string, number>(
  materialsData.map((m) => [m.Material.trim().toUpperCase(), m.Caixas]),
);

/** Caixas de referência (data/materials.ts) para um item do plano. */
export function caixasDoMaterial(cod: string, material?: string | null): number {
  return (
    CAIXAS_POR_COD.get(String(cod ?? "").trim()) ??
    CAIXAS_POR_NOME.get(String(material ?? "").trim().toUpperCase()) ??
    0
  );
}

/** UND planejadas = plano_caixas_fardos × Caixas (referência materials.ts). */
export function undDoPlano(row: Pick<PlanoRow, "cod_material_producao" | "material_producao" | "plano_caixas_fardos">): number {
  return (row.plano_caixas_fardos || 0) * caixasDoMaterial(row.cod_material_producao, row.material_producao);
}

/** Itens do plano com data igual ao dia de hoje. */
export function usePlanoHoje() {
  const q = usePlanos();
  const hoje = getCurrentDateInSaoPauloISO();
  return {
    ...q,
    hoje,
    rows: (q.data?.rows ?? []).filter((r) => r.data_plano === hoje),
    schemaMissing: q.data?.schemaMissing ?? false,
  };
}

export function usePlanos() {
  return useQuery<{ rows: PlanoRow[]; schemaMissing: boolean }>({
    queryKey: ["plano", "list"],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("plano")
        .select("*")
        .order("data_plano", { ascending: true })
        .order("material_producao", { ascending: true });
      if (error) {
        if (isSchemaMissing(error)) return { rows: [], schemaMissing: true };
        throw error;
      }
      return { rows: (data ?? []) as PlanoRow[], schemaMissing: false };
    },
  });
}

function handle(e: any, acao: string): never {
  if (isSchemaMissing(e)) throw new Error(PLANO_SQL_HINT);
  throw new Error(e?.message ?? `Erro ao ${acao} plano`);
}

/** Importa as linhas da planilha, cada uma com a data de planejamento informada. */
export function usePlanoImport() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ rows, data_plano }: { rows: PlanoImportRow[]; data_plano: string }) => {
      const payload = rows.map((r) => ({
        cod_material_producao: String(r.CodMaterialProducao ?? "").trim(),
        material_producao: String(r.MaterialProducao ?? "").trim(),
        plano_caixas_fardos: Number(r.PlanoCaixasFardos ?? 0) || 0,
        tons: Number(r.Tons ?? 0) || 0,
        linha: r.Linha ? String(r.Linha).trim() : null,
        data_plano,
      }));
      const { error } = await supabase.from("plano").insert(payload);
      if (error) handle(error, "importar");
      return payload.length;
    },
    onSuccess: (n) => {
      qc.invalidateQueries({ queryKey: ["plano"] });
      toast.success(`${n} item(ns) de planejamento importado(s)`);
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePlanoSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Partial<PlanoRow> & { id: string }) => {
      const { id, ...patch } = row;
      const { error } = await supabase.from("plano").update(patch).eq("id", id);
      if (error) handle(error, "salvar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plano"] });
      toast.success("Plano atualizado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function usePlanoDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("plano").delete().eq("id", id);
      if (error) handle(error, "excluir");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plano"] });
      toast.success("Plano removido");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Limpa completamente a tabela plano. */
export function usePlanoClear() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from("plano")
        .delete()
        .not("id", "is", null);
      if (error) handle(error, "limpar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["plano"] });
      toast.success("Todos os registros de plano foram apagados");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Datas da semana corrente (segunda a domingo) a partir de hoje. */
export function semanaAtualISO(): string[] {
  const hoje = new Date();
  const dow = (hoje.getDay() + 6) % 7;
  const seg = new Date(hoje);
  seg.setDate(hoje.getDate() - dow);
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(seg);
    d.setDate(seg.getDate() + i);
    return d.toISOString().slice(0, 10);
  });
}
