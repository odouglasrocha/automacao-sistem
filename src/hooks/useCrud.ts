import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

function friendlyError(e: any, action: "salvar" | "remover"): string {
  const msg = String(e?.message ?? e ?? "");
  const code = e?.code;
  const isRls =
    code === "42501" ||
    /row-level security|violates row-level/i.test(msg) ||
    msg.includes("403");
  if (isRls) {
    return `Sem permissão para ${action} neste registro. Faça login e verifique se você tem o perfil (admin/dono). Rode docs/sql/0002_owner_rls.sql no Supabase para habilitar auto-permissão por dono.`;
  }
  return msg || `Erro ao ${action}`;
}

export function useList<T = any>(
  table: string,
  opts?: {
    orderBy?: string;
    ascending?: boolean;
    search?: string;
    searchColumn?: string;
    filter?: Record<string, any>;
    enabled?: boolean;
  },
) {
  return useQuery<T[]>({
    queryKey: [table, "list", opts],
    enabled: opts?.enabled ?? true,
    queryFn: async () => {
      let q = supabase.from(table).select("*");
      for (const [k, v] of Object.entries(opts?.filter ?? {})) {
        if (v !== undefined && v !== null) q = q.eq(k, v);
      }
      if (opts?.search && opts?.searchColumn) q = q.ilike(opts.searchColumn, `%${opts.search}%`);
      if (opts?.orderBy) q = q.order(opts.orderBy, { ascending: opts.ascending ?? true });
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as T[];
    },
  });
}

export function useUpsert(table: string, invalidateKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      // Auto-injeta created_by na criação para satisfazer policies "owner".
      const isCreate = !payload.id;
      let enriched = payload;
      if (isCreate) {
        const { data: u } = await supabase.auth.getUser();
        if (u?.user?.id && enriched.created_by == null) {
          enriched = { ...enriched, created_by: u.user.id };
        }
      }
      const { data, error } = await supabase.from(table).upsert(enriched).select().single();
      if (error) throw new Error(friendlyError(error, "salvar"));
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [invalidateKey ?? table] });
      toast.success("Registro salvo");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao salvar"),
  });
}

export function useRemove(table: string, invalidateKey?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw new Error(friendlyError(error, "remover"));
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [invalidateKey ?? table] });
      toast.success("Registro removido");
    },
    onError: (e: any) => toast.error(e.message ?? "Erro ao remover"),
  });
}