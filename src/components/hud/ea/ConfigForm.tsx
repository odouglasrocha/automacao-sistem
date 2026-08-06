/**
 * Renderizador genérico de uma categoria do registry.
 * Não conhece o backend: recebe os dados já resolvidos pelo `useConfigSection`.
 */
import { useEffect, useState } from "react";
import { Save, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useConfigSection } from "@/hooks/useEaConfig";
import { padroesDaCategoria, type CampoSpec, type CategoriaSpec } from "@/lib/config/registry";
import type { EaMaquina } from "@/hooks/useEaMachine";

const INPUT_CLS =
  "w-full bg-background/60 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground mono focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

export function ConfigForm({ maquina, cat }: { maquina: EaMaquina; cat: CategoriaSpec }) {
  const { dados, isLoading, salvar, salvando } = useConfigSection(maquina, cat);
  const [form, setForm] = useState<Record<string, any>>(dados);
  const chave = JSON.stringify(dados);

  useEffect(() => setForm(dados), [chave]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="hud-panel p-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        salvar(form);
      }}
    >
      <div className="text-xs text-muted-foreground">
        {cat.descricao} Exclusivo de <span className="mono text-primary">{maquina.nome}</span>.
      </div>

      {isLoading ? (
        <div className="text-sm text-muted-foreground">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {(cat.campos ?? []).map((c) => (
            <Campo key={c.nome} spec={c} value={form[c.nome]} onChange={(v) => set(c.nome, v)} />
          ))}
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setForm({ ...padroesDaCategoria(cat) })}
        >
          <RotateCcw className="h-3.5 w-3.5 mr-1" />
          Restaurar padrão
        </Button>
        <Button type="submit" size="sm" disabled={salvando}>
          <Save className="h-3.5 w-3.5 mr-1" />
          Salvar {cat.label.toLowerCase()}
        </Button>
      </div>
    </form>
  );
}

function Campo({
  spec,
  value,
  onChange,
}: {
  spec: CampoSpec;
  value: any;
  onChange: (v: any) => void;
}) {
  return (
    <label className={`flex flex-col gap-1 ${spec.full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{spec.label}</span>
      {spec.tipo === "select" ? (
        <select className={INPUT_CLS} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {(spec.opcoes ?? []).map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      ) : spec.tipo === "boolean" ? (
        <span className="flex items-center gap-2 text-sm pt-1">
          <input
            type="checkbox"
            className="accent-primary"
            checked={!!value}
            onChange={(e) => onChange(e.target.checked)}
          />
          {spec.ajuda ?? "Habilitado"}
        </span>
      ) : spec.tipo === "textarea" ? (
        <textarea
          className={`${INPUT_CLS} min-h-[64px]`}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
        />
      ) : (
        <input
          type={spec.tipo === "number" ? "number" : "text"}
          className={INPUT_CLS}
          value={value ?? ""}
          onChange={(e) => onChange(spec.tipo === "number" ? Number(e.target.value) : e.target.value)}
        />
      )}
      {spec.ajuda && spec.tipo !== "boolean" && (
        <span className="text-[10px] text-muted-foreground">{spec.ajuda}</span>
      )}
    </label>
  );
}
