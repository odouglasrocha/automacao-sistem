import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { AB_CATALOG_FALLBACK, type ClpModelo } from "@/lib/allenBradleyCatalog";

export interface EaMaquina {
  id: string;
  nome: string;
  linha: string | null;
  descricao: string | null;
  localizacao: string | null;
  fabricante_maquina: string | null;
  ano_fabricacao: number | null;
  ativo: boolean;
}

/** Frota EA — cada máquina é uma linha própria em ea_maquinas. */
export function useEaMaquinas() {
  return useQuery<EaMaquina[]>({
    queryKey: ["ea_maquinas", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ea_maquinas").select("*").order("nome");
      if (error) throw error;
      return ((data ?? []) as EaMaquina[]).sort(
        (a, b) => Number(a.nome.replace(/\D/g, "")) - Number(b.nome.replace(/\D/g, "")),
      );
    },
  });
}

/** Registro 1:1 (comunicação / controlador / status) escopado por maquina_id. */
export function useEaSingleton<T = any>(table: string, maquinaId: string | null) {
  return useQuery<T | null>({
    queryKey: [table, "single", maquinaId],
    enabled: !!maquinaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("maquina_id", maquinaId)
        .maybeSingle();
      if (error) throw error;
      return (data ?? null) as T | null;
    },
  });
}

export function useEaSingletonSave(table: string, maquinaId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!maquinaId) throw new Error("Selecione uma máquina");
      const { data, error } = await supabase
        .from(table)
        .upsert({ ...payload, maquina_id: maquinaId, updated_at: new Date().toISOString() }, { onConflict: "maquina_id" })
        .select()
        .single();
      if (error) throw new Error(errorMsg(error));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast.success("Configuração salva");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

function errorMsg(e: any) {
  const msg = String(e?.message ?? e ?? "");
  if (e?.code === "42501" || /row-level security/i.test(msg)) {
    return "Sem permissão. Faça login e rode docs/sql/0003_ea_clp.sql no Supabase.";
  }
  if (/does not exist|schema cache/i.test(msg)) {
    return "Tabela ainda não criada — rode docs/sql/0003_ea_clp.sql no SQL Editor do Supabase.";
  }
  return msg || "Erro ao salvar";
}

/** Catálogo dinâmico de modelos de CLP (banco + fallback local). */
export function useClpModelos() {
  return useQuery<ClpModelo[]>({
    queryKey: ["ea_clp_modelos", "list"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_clp_modelos")
        .select("*")
        .eq("ativo", true)
        .order("familia");
      if (error || !data?.length) return AB_CATALOG_FALLBACK;
      return data as ClpModelo[];
    },
  });
}

export function useAddClpModelo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (m: ClpModelo) => {
      const { error } = await supabase.from("ea_clp_modelos").insert(m);
      if (error) throw new Error(errorMsg(error));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_clp_modelos"] });
      toast.success("Modelo cadastrado");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

/** Histórico da máquina (ea_clp_logs). */
export function useEaLogs(maquinaId: string | null) {
  return useQuery<any[]>({
    queryKey: ["ea_clp_logs", maquinaId],
    enabled: !!maquinaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_clp_logs")
        .select("*")
        .eq("maquina_id", maquinaId)
        .order("ts", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data ?? [];
    },
  });
}