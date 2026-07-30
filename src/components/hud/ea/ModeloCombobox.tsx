import { useMemo, useState } from "react";
import { Check, ChevronsUpDown, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useAddClpModelo, useClpModelos } from "@/hooks/useEaMachine";

/**
 * Pesquisa dinâmica de modelos Allen-Bradley.
 * Novos modelos podem ser cadastrados pela UI (tabela ea_clp_modelos),
 * sem qualquer alteração de código.
 */
export function ModeloCombobox({
  value,
  familia,
  onChange,
}: {
  value?: string | null;
  familia?: string | null;
  onChange: (modelo: string, familia: string, fabricante: string) => void;
}) {
  const { data: modelos } = useClpModelos();
  const add = useAddClpModelo();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  const filtered = useMemo(() => {
    const list = modelos ?? [];
    const term = q.trim().toLowerCase();
    if (!term) return list;
    return list.filter(
      (m) =>
        m.modelo.toLowerCase().includes(term) ||
        m.familia.toLowerCase().includes(term) ||
        m.fabricante.toLowerCase().includes(term),
    );
  }, [modelos, q]);

  const grouped = useMemo(() => {
    const g: Record<string, typeof filtered> = {};
    for (const m of filtered) (g[m.familia] ??= []).push(m);
    return g;
  }, [filtered]);

  const exact = filtered.some((m) => m.modelo.toLowerCase() === q.trim().toLowerCase());

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="outline" role="combobox" className="w-full justify-between mono text-xs h-9">
          {value ? `${value}${familia ? ` · ${familia}` : ""}` : "Pesquisar modelo…"}
          <ChevronsUpDown className="h-3.5 w-3.5 opacity-60" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[320px] p-0" align="start">
        <div className="p-2 border-b border-border">
          <Input
            autoFocus
            placeholder="Ex.: 1769-L33ER, ControlLogix…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="h-8 text-xs mono"
          />
        </div>
        <div className="max-h-64 overflow-auto py-1">
          {Object.entries(grouped).map(([fam, items]) => (
            <div key={fam}>
              <div className="px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{fam}</div>
              {items.map((m) => (
                <button
                  key={`${m.familia}-${m.modelo}`}
                  type="button"
                  onClick={() => {
                    onChange(m.modelo, m.familia, m.fabricante);
                    setOpen(false);
                  }}
                  className="w-full flex items-center justify-between px-3 py-1.5 text-xs mono hover:bg-accent/40 text-left"
                >
                  {m.modelo}
                  {value === m.modelo && <Check className="h-3.5 w-3.5 text-primary" />}
                </button>
              ))}
            </div>
          ))}
          {!filtered.length && (
            <div className="px-3 py-4 text-xs text-muted-foreground">Nenhum modelo encontrado.</div>
          )}
        </div>
        {q.trim() && !exact && (
          <div className="border-t border-border p-2">
            <Button
              type="button"
              size="sm"
              variant="ghost"
              className="w-full justify-start text-xs"
              onClick={async () => {
                const fam = familia || "Personalizado";
                await add.mutateAsync({ fabricante: "Allen-Bradley", familia: fam, modelo: q.trim() });
                onChange(q.trim(), fam, "Allen-Bradley");
                setOpen(false);
              }}
            >
              <Plus className="h-3.5 w-3.5 mr-1" /> Cadastrar modelo “{q.trim()}”
            </Button>
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}