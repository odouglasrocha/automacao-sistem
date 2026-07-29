import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase, type AppRole } from "@/lib/supabase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ROLES: AppRole[] = ["admin", "supervisor", "operador", "visitante"];

interface Row {
  id: string;
  user_id: string;
  role: AppRole;
  empresa_id: string | null;
  email: string | null;
  nome: string | null;
}

export function UsersRolesPanel() {
  const qc = useQueryClient();
  const [userId, setUserId] = useState("");
  const [role, setRole] = useState<AppRole>("operador");
  const [empresaId, setEmpresaId] = useState<string>("");

  const empresas = useQuery({
    queryKey: ["empresas", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("empresas").select("id, nome").order("nome");
      if (error) throw error;
      return data ?? [];
    },
  });

  const rolesList = useQuery<Row[]>({
    queryKey: ["user_roles_view"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_user_roles")
        .select("id, user_id, role, empresa_id, email, nome")
        .order("email");
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const assign = useMutation({
    mutationFn: async () => {
      if (!userId) throw new Error("Informe o user_id");
      const payload: Record<string, any> = { user_id: userId, role };
      if (empresaId) payload.empresa_id = empresaId;
      const { error } = await supabase.from("user_roles").insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_roles_view"] });
      toast.success("Perfil atribuído");
      setUserId("");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const revoke = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("user_roles").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["user_roles_view"] });
      toast.success("Perfil removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="space-y-4">
      <div className="hud-panel p-4">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Novo vínculo</div>
        <div className="text-lg font-semibold mb-3">Atribuir perfil a usuário</div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div>
            <Label>User ID (auth.users.id)</Label>
            <Input placeholder="uuid do usuário" value={userId} onChange={(e) => setUserId(e.target.value)} />
          </div>
          <div>
            <Label>Perfil</Label>
            <Select value={role} onValueChange={(v) => setRole(v as AppRole)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ROLES.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Empresa (opcional para admin global)</Label>
            <Select value={empresaId} onValueChange={setEmpresaId}>
              <SelectTrigger><SelectValue placeholder="Selecionar…" /></SelectTrigger>
              <SelectContent>
                {(empresas.data ?? []).map((e: any) => (
                  <SelectItem key={e.id} value={e.id}>{e.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-end">
            <Button className="w-full" onClick={() => assign.mutate()} disabled={assign.isPending}>
              <Plus className="h-4 w-4 mr-1" /> Atribuir
            </Button>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-2">
          Dica: peça ao usuário se cadastrar em <code>/auth</code>. O <code>user_id</code> aparece na
          view <code>v_user_roles</code> após qualquer login e também em Supabase → Auth → Users.
        </p>
      </div>

      <div className="hud-panel p-4">
        <div className="text-lg font-semibold mb-3">Vínculos ativos</div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs uppercase text-muted-foreground">
              <tr className="border-b border-border">
                <th className="text-left py-2 pr-3">Nome</th>
                <th className="text-left py-2 pr-3">E-mail</th>
                <th className="text-left py-2 pr-3">Perfil</th>
                <th className="text-left py-2 pr-3">Empresa</th>
                <th className="py-2 w-16 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {rolesList.isLoading && (
                <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> carregando…
                </td></tr>
              )}
              {(rolesList.data ?? []).map((r) => (
                <tr key={r.id} className="border-b border-border/60 hover:bg-accent/30">
                  <td className="py-2 pr-3">{r.nome ?? "—"}</td>
                  <td className="py-2 pr-3 mono text-xs">{r.email ?? "—"}</td>
                  <td className="py-2 pr-3">{r.role}</td>
                  <td className="py-2 pr-3 mono text-xs">{r.empresa_id ?? "—"}</td>
                  <td className="py-2 text-right">
                    <Button variant="ghost" size="icon" onClick={() => { if (confirm("Remover?")) revoke.mutate(r.id); }}>
                      <Trash2 className="h-4 w-4 text-danger" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}