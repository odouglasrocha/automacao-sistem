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
  /** true quando a linha vem do fallback local (tabelas ainda não criadas no banco). */
  virtual?: boolean;
}

/** Frota EA34–EA58 (exceto EA43) usada enquanto o schema não existe no banco. */
export const EA_FLEET_FALLBACK: EaMaquina[] = Array.from(
  { length: 58 - 34 + 1 },
  (_, i) => 34 + i,
)
  .filter((n) => n !== 43)
  .map((n) => ({
    id: `virtual-EA${n}`,
    nome: `EA${n}`,
    linha: "L-04 Envase",
    descricao: `Máquina de envase EA${n}`,
    localizacao: null,
    fabricante_maquina: null,
    ano_fabricacao: null,
    ativo: true,
    virtual: true,
  }));

export function isSchemaMissing(e: any) {
  const msg = String(e?.message ?? e ?? "");
  return (
    e?.code === "42P01" ||
    e?.code === "PGRST205" ||
    /does not exist|schema cache|relation .* does not exist/i.test(msg)
  );
}

/** Frota EA — cada máquina é uma linha própria em ea_maquinas. */
export function useEaMaquinas() {
  return useQuery<EaMaquina[]>({
    queryKey: ["ea_maquinas", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("ea_maquinas").select("*").order("nome");
      if (error) {
        // Sem schema no banco: opera com a frota local para não travar a UI.
        if (isSchemaMissing(error)) return EA_FLEET_FALLBACK;
        throw error;
      }
      if (!data?.length) return EA_FLEET_FALLBACK;
      return ((data ?? []) as EaMaquina[]).sort(
        (a, b) => Number(a.nome.replace(/\D/g, "")) - Number(b.nome.replace(/\D/g, "")),
      );
    },
    retry: false,
  });
}

/**
 * Atualiza a própria máquina (ea_maquinas). A PK é `id` — nunca `maquina_id`,
 * por isso esta mutação NÃO usa upsert com onConflict=maquina_id.
 */
export function useEaMaquinaSave(maquinaId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (!maquinaId) throw new Error("Selecione uma máquina");
      if (maquinaId.startsWith("virtual-")) throw new Error(SCHEMA_MSG);
      const { id: _ignored, maquina_id: _ignored2, ...campos } = payload;
      const { data, error } = await supabase
        .from("ea_maquinas")
        .update({ ...campos, updated_at: new Date().toISOString() })
        .eq("id", maquinaId)
        .select()
        .maybeSingle();
      if (error) throw new Error(errorMsg(error));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_maquinas"] });
      toast.success("Máquina atualizada");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
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
      if (maquinaId.startsWith("virtual-")) throw new Error(SCHEMA_MSG);
      const { id: _ignored, ...campos } = payload;
      const { data, error } = await supabase
        .from(table)
        .upsert(
          { ...campos, maquina_id: maquinaId, updated_at: new Date().toISOString() },
          { onConflict: "maquina_id" },
        )
        .select()
        .maybeSingle();
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

const SCHEMA_MSG =
  "Tabela ainda não criada — rode docs/sql/0003_ea_clp.sql no SQL Editor do Supabase.";

function errorMsg(e: any) {
  const msg = String(e?.message ?? e ?? "");
  if (e?.code === "42501" || /row-level security/i.test(msg)) {
    return "Sem permissão. Faça login e rode docs/sql/0003_ea_clp.sql no Supabase.";
  }
  if (isSchemaMissing(e)) return SCHEMA_MSG;
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
      if (error) {
        if (isSchemaMissing(error)) return [];
        throw error;
      }
      return data ?? [];
    },
    retry: false,
  });
}