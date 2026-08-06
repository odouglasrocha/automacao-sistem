/**
 * Persistência do Centro de Configuração Industrial.
 * Categorias genéricas gravam em `ea_config` (jsonb por maquina_id+categoria);
 * categorias com tabela própria continuam usando os singletons existentes.
 * Toda gravação registra trilha em `ea_auditoria`.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { isSchemaMissing, useEaSingleton, useEaSingletonSave } from "@/hooks/useEaMachine";
import { padroesDaCategoria, type CategoriaSpec } from "@/lib/config/registry";

const SCHEMA_MSG =
  "Tabela ainda não criada — rode docs/sql/0010_config_exclusiva.sql no SQL Editor do Supabase.";

/** Leitura da categoria genérica (ea_config.dados). */
export function useEaConfigCategoria(maquinaId: string | null, categoria: string) {
  return useQuery<Record<string, any> | null>({
    queryKey: ["ea_config", maquinaId, categoria],
    enabled: !!maquinaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_config")
        .select("dados")
        .eq("maquina_id", maquinaId)
        .eq("categoria", categoria)
        .maybeSingle();
      if (error) {
        if (isSchemaMissing(error)) return null;
        throw error;
      }
      return (data?.dados as Record<string, any>) ?? null;
    },
  });
}

export function useEaConfigSave(maquinaId: string | null, categoria: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (dados: Record<string, any>) => {
      if (!maquinaId) throw new Error("Selecione uma máquina");
      if (maquinaId.startsWith("virtual-")) throw new Error(SCHEMA_MSG);
      const { error } = await supabase
        .from("ea_config")
        .upsert(
          { maquina_id: maquinaId, categoria, dados, updated_at: new Date().toISOString() },
          { onConflict: "maquina_id,categoria" },
        );
      if (error) throw new Error(isSchemaMissing(error) ? SCHEMA_MSG : error.message);
      await registrarAuditoria(maquinaId, categoria, dados);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_config", maquinaId, categoria] });
      qc.invalidateQueries({ queryKey: ["ea_config_maquina", maquinaId] });
      toast.success("Configuração salva");
    },
    onError: (e: any) => toast.error(e?.message ?? "Erro ao salvar"),
  });
}

async function registrarAuditoria(maquinaId: string, categoria: string, dados: Record<string, any>) {
  const { data: auth } = await supabase.auth.getUser();
  await supabase
    .from("ea_auditoria")
    .insert({ maquina_id: maquinaId, categoria, acao: "update", dados, operador: auth?.user?.email ?? null });
}

/** Trilha de auditoria da máquina. */
export function useEaAuditoria(maquinaId: string | null) {
  return useQuery<any[]>({
    queryKey: ["ea_auditoria", maquinaId],
    enabled: !!maquinaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_auditoria")
        .select("*")
        .eq("maquina_id", maquinaId)
        .order("ts", { ascending: false })
        .limit(200);
      if (error) return [];
      return data ?? [];
    },
  });
}

/**
 * Fonte única de leitura/escrita de uma categoria — abstrai o backend
 * (jsonb genérico ou tabela 1:1) para a UI e para os demais módulos.
 */
export function useConfigSection(maquina: { id: string } | null, cat: CategoriaSpec) {
  const usaTabela = cat.persistencia?.kind === "tabela";
  const tabela = usaTabela ? (cat.persistencia as any).tabela : "ea_config";

  const genQuery = useEaConfigCategoria(usaTabela ? null : (maquina?.id ?? null), cat.id);
  const tabQuery = useEaSingleton<any>(tabela, usaTabela ? (maquina?.id ?? null) : null);
  const genSave = useEaConfigSave(maquina?.id ?? null, cat.id);
  const tabSave = useEaSingletonSave(tabela, maquina?.id ?? null);

  const padroes = padroesDaCategoria(cat);
  const dados = { ...padroes, ...((usaTabela ? tabQuery.data : genQuery.data) ?? {}) };

  return {
    dados,
    isLoading: usaTabela ? tabQuery.isLoading : genQuery.isLoading,
    // Em tabelas 1:1 o upsert grava a linha inteira: mesclamos o registro
    // existente para não zerar colunas fora desta categoria.
    salvar: (v: Record<string, any>) =>
      usaTabela ? tabSave.mutate({ ...(tabQuery.data ?? {}), ...v }) : genSave.mutate(v),
    salvando: usaTabela ? tabSave.isPending : genSave.isPending,
  };
}

/** Consumo pelos demais módulos: toda a configuração da máquina de uma vez. */
export function useEaConfigMaquina(maquinaId: string | null) {
  return useQuery<Record<string, Record<string, any>>>({
    queryKey: ["ea_config_maquina", maquinaId],
    enabled: !!maquinaId,
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_config")
        .select("categoria, dados")
        .eq("maquina_id", maquinaId);
      if (error) return {};
      return Object.fromEntries((data ?? []).map((r: any) => [r.categoria, r.dados ?? {}]));
    },
  });
}
