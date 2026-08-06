/**
 * CONFIGURAÇÃO EXCLUSIVA — Centro de Configuração Industrial.
 * Único local de configuração do sistema. Navegação por grupos/categorias,
 * busca, favoritos e persistência 100% escopada em maquina_id.
 */
import { useMemo, useState } from "react";
import * as Icons from "lucide-react";
import { Search, Star } from "lucide-react";
import { HardwareTab } from "@/components/hud/ea/HardwareTab";
import { ConfigForm } from "@/components/hud/ea/ConfigForm";
import {
  AlarmesSection, AuditoriaSection, ComunicacaoTab, ControladorTab, DiagnosticoTab,
  EquipamentosSection, HistoricoTab, InfoTab, PermissoesSection, ReceitasSection, TagsSection,
} from "@/components/hud/ea/ConfigSections";
import { CATEGORIAS, GRUPOS, type CategoriaSpec } from "@/lib/config/registry";
import type { EaMaquina } from "@/hooks/useEaMachine";

const FAV_KEY = "ea-config-favoritos";

function lerFavoritos(): string[] {
  try {
    return JSON.parse(localStorage.getItem(FAV_KEY) ?? "[]");
  } catch {
    return [];
  }
}

function Icone({ nome, className }: { nome: string; className?: string }) {
  const C = (Icons as any)[nome] ?? Icons.Circle;
  return <C className={className} />;
}

export function ConfigCenter({ maquina }: { maquina: EaMaquina }) {
  const [ativa, setAtiva] = useState("informacoes");
  const [busca, setBusca] = useState("");
  const [favoritos, setFavoritos] = useState<string[]>(lerFavoritos);

  const toggleFav = (id: string) =>
    setFavoritos((f) => {
      const novo = f.includes(id) ? f.filter((x) => x !== id) : [...f, id];
      localStorage.setItem(FAV_KEY, JSON.stringify(novo));
      return novo;
    });

  const termo = busca.trim().toLowerCase();
  const filtradas = useMemo(
    () =>
      CATEGORIAS.filter(
        (c) =>
          !termo ||
          c.label.toLowerCase().includes(termo) ||
          c.descricao.toLowerCase().includes(termo) ||
          (c.campos ?? []).some((f) => f.label.toLowerCase().includes(termo)),
      ),
    [termo],
  );

  const cat = CATEGORIAS.find((c) => c.id === ativa) ?? CATEGORIAS[0]!;
  const favs = filtradas.filter((c) => favoritos.includes(c.id));

  return (
    <div className="mt-2 grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-4">
      {/* Navegação */}
      <aside className="hud-panel p-2 lg:max-h-[70vh] lg:overflow-y-auto">
        <div className="relative mb-2">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar configuração…"
            className="w-full bg-background/60 border border-border rounded-md pl-7 pr-2 py-1.5 text-xs focus:outline-none focus:border-primary/70"
          />
        </div>

        {favs.length > 0 && (
          <Grupo titulo="Favoritos">
            {favs.map((c) => (
              <ItemNav key={`f-${c.id}`} cat={c} ativa={ativa} onSelect={setAtiva} favorito onFav={toggleFav} />
            ))}
          </Grupo>
        )}

        {GRUPOS.map((g) => {
          const itens = filtradas.filter((c) => c.grupo === g);
          if (!itens.length) return null;
          return (
            <Grupo key={g} titulo={g}>
              {itens.map((c) => (
                <ItemNav
                  key={c.id}
                  cat={c}
                  ativa={ativa}
                  onSelect={setAtiva}
                  favorito={favoritos.includes(c.id)}
                  onFav={toggleFav}
                />
              ))}
            </Grupo>
          );
        })}

        {!filtradas.length && (
          <div className="p-3 text-xs text-muted-foreground">Nenhuma configuração encontrada.</div>
        )}
      </aside>

      {/* Conteúdo */}
      <section className="min-w-0 lg:max-h-[70vh] lg:overflow-y-auto space-y-3">
        <header className="flex items-center gap-2">
          <Icone nome={cat.icone} className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">{cat.label}</h3>
          <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{cat.grupo}</span>
        </header>
        <Conteudo maquina={maquina} cat={cat} />
      </section>
    </div>
  );
}

function Grupo({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="mb-2">
      <div className="px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</div>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function ItemNav({
  cat, ativa, onSelect, favorito, onFav,
}: {
  cat: CategoriaSpec;
  ativa: string;
  onSelect: (id: string) => void;
  favorito: boolean;
  onFav: (id: string) => void;
}) {
  const sel = ativa === cat.id;
  return (
    <div
      className={`group flex items-center gap-1.5 rounded-md px-2 py-1.5 cursor-pointer text-xs ${
        sel ? "bg-primary/15 text-primary border border-primary/40" : "text-foreground/80 hover:bg-muted/40 border border-transparent"
      }`}
      onClick={() => onSelect(cat.id)}
    >
      <Icone nome={cat.icone} className="h-3.5 w-3.5 shrink-0" />
      <span className="flex-1 truncate">{cat.label}</span>
      <button
        type="button"
        aria-label="Favoritar"
        onClick={(e) => { e.stopPropagation(); onFav(cat.id); }}
        className={favorito ? "text-warning" : "text-muted-foreground/40 opacity-0 group-hover:opacity-100"}
      >
        <Star className="h-3 w-3" fill={favorito ? "currentColor" : "none"} />
      </button>
    </div>
  );
}

function Conteudo({ maquina, cat }: { maquina: EaMaquina; cat: CategoriaSpec }) {
  switch (cat.custom) {
    case "informacoes": return <InfoTab maquina={maquina} />;
    case "comunicacao": return <ComunicacaoTab maquina={maquina} />;
    case "controlador": return <ControladorTab maquina={maquina} />;
    case "hardware": return <HardwareTab maquina={maquina} />;
    case "tags": return <TagsSection maquina={maquina} />;
    case "receitas": return <ReceitasSection maquina={maquina} />;
    case "alarmes": return <AlarmesSection maquina={maquina} />;
    case "permissoes": return <PermissoesSection maquina={maquina} />;
    case "diagnostico": return <DiagnosticoTab maquina={maquina} />;
    case "logs": return <HistoricoTab maquina={maquina} />;
    case "equipamentos": return <EquipamentosSection maquina={maquina} />;
    case "auditoria": return <AuditoriaSection maquina={maquina} />;
    default: return <ConfigForm maquina={maquina} cat={cat} />;
  }
}
