import { useMemo, useRef, useState } from "react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import { CalendarDays, Loader2, Pencil, Trash2, Upload, X, Check, Eraser } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  usePlanos,
  usePlanoImport,
  usePlanoSave,
  usePlanoDelete,
  usePlanoClear,
  semanaAtualISO,
  PLANO_SQL_HINT,
  undDoPlano,
  caixasDoMaterial,
  type PlanoImportRow,
  type PlanoRow,
} from "@/hooks/usePlano";
import { materialsData } from "@/data/materials";

function fmt(n: number) {
  return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function labelData(iso: string) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" });
}

export function PlanoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const semana = useMemo(() => semanaAtualISO(), []);
  const hoje = new Date().toISOString().slice(0, 10);
  const [dataPlano, setDataPlano] = useState(semana.includes(hoje) ? hoje : semana[0]);
  const [editId, setEditId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<PlanoRow>>({});
  const fileRef = useRef<HTMLInputElement>(null);

  const { data, isLoading } = usePlanos();
  const importar = usePlanoImport();
  const salvar = usePlanoSave();
  const excluir = usePlanoDelete();
  const limpar = usePlanoClear();

  const rows = data?.rows ?? [];
  const schemaMissing = data?.schemaMissing;

  // Catálogo de materiais (referência data/materials.ts) para completar o nome
  // quando a planilha trouxer apenas o código.
  const catalogo = useMemo(() => {
    const m = new Map<string, string>();
    materialsData.forEach((x) => m.set(String(x.Codigo), x.Material));
    return m;
  }, []);

  async function onFile(file: File) {
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" });
      const parsed: PlanoImportRow[] = json
        .map((r) => {
          const cod = String(r.CodMaterialProducao ?? r["Cod Material Producao"] ?? "").trim();
          return {
            CodMaterialProducao: cod,
            MaterialProducao: String(
              r.MaterialProducao ?? r["Material Producao"] ?? catalogo.get(cod) ?? "",
            ).trim(),
            PlanoCaixasFardos: Number(r.PlanoCaixasFardos ?? r["Plano Caixas Fardos"] ?? 0) || 0,
            Tons: Number(r.Tons ?? 0) || 0,
            Linha: String(r.Linha ?? "").trim(),
          };
        })
        .filter((r) => r.CodMaterialProducao || r.MaterialProducao);

      if (!parsed.length) {
        toast.error("Nenhuma linha válida encontrada na planilha");
        return;
      }
      importar.mutate({ rows: parsed, data_plano: dataPlano });
    } catch {
      toast.error("Não foi possível ler o arquivo .xlsx");
    } finally {
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Inserir planejamento de produção</DialogTitle>
          <DialogDescription>
            Importe a planilha (.xlsx) do plano semanal. Cada item é gravado na tabela{" "}
            <span className="mono">plano</span> com a data do planejamento escolhida.
          </DialogDescription>
        </DialogHeader>

        {schemaMissing && (
          <div className="text-xs px-3 py-2 rounded-md border border-warning/40 bg-warning/10 text-warning">
            {PLANO_SQL_HINT}
          </div>
        )}

        <div className="space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground flex items-center gap-1">
                <CalendarDays className="h-3 w-3" /> Data do planejamento
              </label>
              <select
                className="h-9 rounded-md border border-border bg-background px-2 text-sm"
                value={dataPlano}
                onChange={(e) => setDataPlano(e.target.value)}
              >
                {semana.map((d) => (
                  <option key={d} value={d}>
                    {labelData(d)} {d === hoje ? "· hoje" : ""}
                  </option>
                ))}
              </select>
            </div>

            <input
              ref={fileRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
            <Button onClick={() => fileRef.current?.click()} disabled={importar.isPending}>
              {importar.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Upload className="h-4 w-4" />
              )}
              Enviar arquivo Excel (.xlsx)
            </Button>

            <Button
              variant="destructive"
              className="ml-auto"
              disabled={limpar.isPending || !rows.length}
              onClick={() => {
                if (confirm("Apagar TODOS os registros da tabela plano?")) limpar.mutate();
              }}
            >
              <Eraser className="h-4 w-4" />
              Limpar tabela plano
            </Button>
          </div>

          <div className="hud-panel p-3 overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  <th className="text-left font-medium py-2 px-2">Data</th>
                  <th className="text-left font-medium py-2 px-2">Código</th>
                  <th className="text-left font-medium py-2 px-2">Material</th>
                  <th className="text-right font-medium py-2 px-2">Cx/Fardos</th>
                  <th className="text-right font-medium py-2 px-2">Tons</th>
                  <th className="text-right font-medium py-2 px-2">UND</th>
                  <th className="text-right font-medium py-2 px-2">Ações</th>
                </tr>
              </thead>
              <tbody>
                {isLoading && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Carregando…
                    </td>
                  </tr>
                )}
                {!isLoading && !rows.length && (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Nenhum planejamento inserido.
                    </td>
                  </tr>
                )}
                {rows.map((r) => {
                  const editando = editId === r.id;
                  return (
                    <tr key={r.id} className="border-t border-border hover:bg-muted/20">
                      <td className="py-2 px-2 mono text-xs">
                        {editando ? (
                          <Input
                            type="date"
                            className="h-8"
                            value={draft.data_plano ?? r.data_plano}
                            onChange={(e) => setDraft({ ...draft, data_plano: e.target.value })}
                          />
                        ) : (
                          labelData(r.data_plano)
                        )}
                      </td>
                      <td className="py-2 px-2 mono text-xs text-muted-foreground">
                        {r.cod_material_producao}
                      </td>
                      <td className="py-2 px-2">
                        {editando ? (
                          <Input
                            className="h-8"
                            value={draft.material_producao ?? r.material_producao}
                            onChange={(e) =>
                              setDraft({ ...draft, material_producao: e.target.value })
                            }
                          />
                        ) : (
                          r.material_producao
                        )}
                      </td>
                      <td className="py-2 px-2 text-right mono tabular-nums">
                        {editando ? (
                          <Input
                            type="number"
                            step="0.1"
                            className="h-8 text-right"
                            value={String(draft.plano_caixas_fardos ?? r.plano_caixas_fardos)}
                            onChange={(e) =>
                              setDraft({ ...draft, plano_caixas_fardos: Number(e.target.value) })
                            }
                          />
                        ) : (
                          fmt(r.plano_caixas_fardos)
                        )}
                      </td>
                      <td className="py-2 px-2 text-right mono tabular-nums">
                        {editando ? (
                          <Input
                            type="number"
                            step="0.01"
                            className="h-8 text-right"
                            value={String(draft.tons ?? r.tons)}
                            onChange={(e) => setDraft({ ...draft, tons: Number(e.target.value) })}
                          />
                        ) : (
                          fmt(r.tons)
                        )}
                      </td>
                      <td className="py-2 px-2 text-right mono tabular-nums">
                        {caixasDoMaterial(r.cod_material_producao, r.material_producao) ? (
                          <span title={`${fmt(r.plano_caixas_fardos)} × ${caixasDoMaterial(r.cod_material_producao, r.material_producao)} cx`}>
                            {fmt(
                              undDoPlano({
                                ...r,
                                plano_caixas_fardos:
                                  editando && draft.plano_caixas_fardos !== undefined
                                    ? draft.plano_caixas_fardos
                                    : r.plano_caixas_fardos,
                              }),
                            )}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </td>
                      <td className="py-2 px-2">
                        <div className="flex items-center justify-end gap-1">
                          {editando ? (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  salvar.mutate({ id: r.id, ...draft });
                                  setEditId(null);
                                  setDraft({});
                                }}
                              >
                                <Check className="h-4 w-4 text-success" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditId(null);
                                  setDraft({});
                                }}
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  setEditId(r.id);
                                  setDraft({});
                                }}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="ghost"
                                className="h-8 w-8"
                                onClick={() => {
                                  if (confirm("Excluir este item do plano?")) excluir.mutate(r.id);
                                }}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
