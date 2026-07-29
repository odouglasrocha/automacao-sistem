import { useState } from "react";
import { Plus, Trash2, Pencil, Search, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useList, useRemove, useUpsert } from "@/hooks/useCrud";

export type Field =
  | { name: string; label: string; type: "text" | "number" | "textarea"; required?: boolean }
  | { name: string; label: string; type: "select"; required?: boolean; optionsFrom: { table: string; label: string; value?: string } };

function OptionsSelect({
  table,
  labelCol,
  valueCol = "id",
  value,
  onChange,
  placeholder,
}: {
  table: string;
  labelCol: string;
  valueCol?: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const { data } = useList<any>(table, { orderBy: labelCol });
  return (
    <Select value={value ?? ""} onValueChange={onChange}>
      <SelectTrigger><SelectValue placeholder={placeholder ?? "Selecionar…"} /></SelectTrigger>
      <SelectContent>
        {(data ?? []).map((row) => (
          <SelectItem key={row[valueCol]} value={String(row[valueCol])}>
            {row[labelCol]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function CrudTable({
  table,
  title,
  description,
  fields,
  searchColumn = "nome",
  orderBy = "nome",
}: {
  table: string;
  title: string;
  description?: string;
  fields: Field[];
  searchColumn?: string;
  orderBy?: string;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const { data, isLoading, error } = useList<any>(table, { orderBy, search, searchColumn });
  const upsert = useUpsert(table);
  const remove = useRemove(table);

  const startCreate = () => {
    setEditing({});
    setOpen(true);
  };
  const startEdit = (row: Record<string, any>) => {
    setEditing(row);
    setOpen(true);
  };

  return (
    <div className="hud-panel p-4">
      <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
        <div>
          <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">Cadastro</div>
          <div className="text-lg font-semibold">{title}</div>
          {description && <p className="text-xs text-muted-foreground">{description}</p>}
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder={`Buscar por ${searchColumn}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 w-64"
            />
          </div>
          <Button onClick={startCreate} size="sm"><Plus className="h-4 w-4 mr-1" /> Novo</Button>
        </div>
      </div>

      {error && (
        <div className="text-danger text-sm p-3 border border-danger/40 bg-danger/5 rounded">
          <div className="font-semibold">Erro ao carregar {table}: {(error as Error).message}</div>
          {String((error as Error).message).toLowerCase().includes("permission") || String((error as Error).message).includes("403") ? (
            <div className="mt-1 text-xs text-muted-foreground">
              A migração <code>docs/sql/0001_foundation.sql</code> pode não ter sido executada no Supabase, ou seu usuário ainda não foi promovido a <code>admin</code>. Rode o script no SQL Editor e promova seu e-mail conforme a última seção do arquivo.
            </div>
          ) : null}
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left border-b border-border text-muted-foreground text-xs uppercase tracking-wider">
              {fields.map((f) => (
                <th key={f.name} className="py-2 pr-3">{f.label}</th>
              ))}
              <th className="py-2 w-24 text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={fields.length + 1} className="py-8 text-center text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> carregando…
              </td></tr>
            )}
            {!isLoading && (data ?? []).length === 0 && (
              <tr><td colSpan={fields.length + 1} className="py-8 text-center text-muted-foreground">
                Nenhum registro
              </td></tr>
            )}
            {(data ?? []).map((row) => (
              <tr key={row.id} className="border-b border-border/60 hover:bg-accent/30">
                {fields.map((f) => (
                  <td key={f.name} className="py-2 pr-3 mono text-xs">
                    {String(row[f.name] ?? "")}
                  </td>
                ))}
                <td className="py-2 text-right">
                  <Button variant="ghost" size="icon" onClick={() => startEdit(row)}>
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      if (confirm("Remover este registro?")) remove.mutate(row.id);
                    }}
                  >
                    <Trash2 className="h-4 w-4 text-danger" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing?.id ? "Editar" : "Novo"} — {title}</DialogTitle>
          </DialogHeader>
          <form
            className="space-y-3"
            onSubmit={async (e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget as HTMLFormElement);
              const payload: Record<string, any> = editing?.id ? { id: editing.id } : {};
              for (const f of fields) {
                const v = fd.get(f.name);
                if (v === null || v === "") {
                  if (f.required) return;
                  payload[f.name] = null;
                } else if (f.type === "number") {
                  payload[f.name] = Number(v);
                } else {
                  payload[f.name] = String(v);
                }
              }
              await upsert.mutateAsync(payload);
              setOpen(false);
            }}
          >
            {fields.map((f) => (
              <div key={f.name}>
                <Label>{f.label}{f.required && <span className="text-danger"> *</span>}</Label>
                {f.type === "textarea" ? (
                  <textarea
                    name={f.name}
                    defaultValue={editing?.[f.name] ?? ""}
                    className="w-full min-h-20 rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                ) : f.type === "select" ? (
                  <OptionsSelect
                    table={f.optionsFrom.table}
                    labelCol={f.optionsFrom.label}
                    valueCol={f.optionsFrom.value ?? "id"}
                    value={editing?.[f.name] ?? undefined}
                    onChange={(v) => setEditing((p) => ({ ...(p ?? {}), [f.name]: v }))}
                  />
                ) : (
                  <Input
                    name={f.name}
                    type={f.type}
                    defaultValue={editing?.[f.name] ?? ""}
                    required={f.required}
                  />
                )}
                {f.type === "select" && (
                  <input type="hidden" name={f.name} value={editing?.[f.name] ?? ""} readOnly />
                )}
              </div>
            ))}
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={upsert.isPending}>Salvar</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}