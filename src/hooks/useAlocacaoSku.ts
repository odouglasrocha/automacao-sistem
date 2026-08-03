import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";
import { isSchemaMissing } from "@/hooks/useEaMachine";
import { undPorCaixa } from "@/hooks/usePlano";
import { getCurrentDateInSaoPauloISO } from "@/data/ShelfLif";
import type { Machine } from "@/lib/simulation";

export const ALOCACAO_SQL_HINT =
  "Tabela `ea_alocacao_sku` ainda não criada — rode docs/sql/0006_alocacao_sku.sql no SQL Editor do Supabase.";

/** Horas úteis de uma EA no dia (3 turnos). */
export const HORAS_EA_DIA = 24;

export interface AlocacaoSku {
  id: string;
  data_plano: string;
  cod_material_producao: string;
  material_producao: string;
  qtd_ea: number;
  /** Máquinas EA efetivamente reservadas para o SKU (ex.: ["EA34","EA35"]). */
  maquinas: string[];
  observacao: string | null;
  /** Posição na fila da EA (1 = em produção, 2+ = agendado). */
  ordem: number;
  /** Horas estimadas de produção em CADA EA alocada. */
  horas_estimadas: number;
}

/** Alocações de SKU × EA. Sem filtro = todas; por padrão o dia atual (fuso SP). */
export function useAlocacoes(dataPlano?: string) {
  const dia = dataPlano ?? getCurrentDateInSaoPauloISO();
  const q = useQuery<{ rows: AlocacaoSku[]; schemaMissing: boolean }>({
    queryKey: ["ea_alocacao_sku", dia],
    retry: false,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ea_alocacao_sku")
        .select("*")
        .eq("data_plano", dia)
        .order("material_producao", { ascending: true });
      if (error) {
        if (isSchemaMissing(error)) return { rows: [], schemaMissing: true };
        throw error;
      }
      return {
        rows: (data ?? []).map((r: any) => ({
          ...r,
          maquinas: r.maquinas ?? [],
          ordem: Number(r.ordem ?? 1),
          horas_estimadas: Number(r.horas_estimadas ?? 0),
        })) as AlocacaoSku[],
        schemaMissing: false,
      };
    },
  });
  return {
    ...q,
    dia,
    rows: q.data?.rows ?? [],
    schemaMissing: q.data?.schemaMissing ?? false,
  };
}

function handle(e: any, acao: string): never {
  if (isSchemaMissing(e)) throw new Error(ALOCACAO_SQL_HINT);
  throw new Error(e?.message ?? `Erro ao ${acao} alocação`);
}

/** Horas já comprometidas em cada EA no dia (ignorando a alocação em edição). */
export function cargaPorMaquina(
  rows: AlocacaoSku[],
  ignorarId?: string,
): Map<string, number> {
  const carga = new Map<string, number>();
  rows.forEach((a) => {
    if (ignorarId && a.id === ignorarId) return;
    a.maquinas.forEach((m) => {
      const key = m.trim().toUpperCase();
      carga.set(key, (carga.get(key) ?? 0) + (a.horas_estimadas || 0));
    });
  });
  return carga;
}

/** Horas livres da EA dentro das 24h do dia. */
export function horasLivres(carga: Map<string, number>, maquina: string): number {
  return Math.max(0, HORAS_EA_DIA - (carga.get(maquina.trim().toUpperCase()) ?? 0));
}

/**
 * Reserva máquinas EA para `horasTotais`, preferindo as com maior margem livre
 * no dia — uma EA já ocupada pode receber outro planejamento se o tempo couber.
 */
export function reservarMaquinas(
  frota: string[],
  carga: Map<string, number>,
  atuais: string[],
  qtdMinima: number,
  horasTotais: number,
): string[] {
  const mantidas = atuais.filter((m) => frota.includes(m));
  const candidatas = frota
    .filter((m) => !mantidas.includes(m) && horasLivres(carga, m) > 0.05)
    .sort((a, b) => horasLivres(carga, b) - horasLivres(carga, a));

  const escolhidas = [...mantidas];
  const cabe = () => {
    if (!escolhidas.length) return false;
    const porEa = horasTotais / escolhidas.length;
    return escolhidas.every((m) => horasLivres(carga, m) + 1e-6 >= porEa);
  };
  while ((escolhidas.length < qtdMinima || !cabe()) && candidatas.length) {
    escolhidas.push(candidatas.shift()!);
  }
  return escolhidas;
}

export function useAlocacaoSave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (row: Omit<AlocacaoSku, "id"> & { id?: string }) => {
      const payload = {
        data_plano: row.data_plano,
        cod_material_producao: row.cod_material_producao,
        material_producao: row.material_producao,
        qtd_ea: row.qtd_ea,
        maquinas: row.maquinas,
        observacao: row.observacao ?? null,
        ordem: row.ordem ?? 1,
        horas_estimadas: row.horas_estimadas ?? 0,
        updated_at: new Date().toISOString(),
      };
      const { error } = row.id
        ? await supabase.from("ea_alocacao_sku").update(payload).eq("id", row.id)
        : await supabase
            .from("ea_alocacao_sku")
            .upsert(payload, { onConflict: "data_plano,cod_material_producao" });
      if (error) handle(error, "salvar");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_alocacao_sku"] });
      toast.success("Alocação de SKU salva");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAlocacaoDelete() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ea_alocacao_sku").delete().eq("id", id);
      if (error) handle(error, "remover");
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ea_alocacao_sku"] });
      toast.success("Alocação removida");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export interface ProducaoSku {
  cod: string;
  material: string;
  maquinas: string[];
  /** Descargas/h somadas das EAs alocadas (produção real do chão de fábrica). */
  descargasHora: number;
  /** Capacidade/hora somada (target das EAs alocadas). */
  descargasAlvo: number;
  /** Progresso em UND = descargas × caixas do material (referência materials.ts). */
  und: number;
  undAlvo: number;
}

/**
 * Relaciona Descargas/h (produção real das EAs) com o Progresso (UND) do SKU:
 * cada descarga equivale a 1 caixa/fardo, convertida em UND pelo fator
 * `Caixas` de data/materials.ts — a mesma regra do planejamento.
 */
export function useProducaoPorSku(machines: Pick<Machine, "name" | "producedHour" | "target">[]) {
  const { rows, schemaMissing, dia } = useAlocacoes();

  return useMemo(() => {
    const porNome = new Map(machines.map((m) => [m.name.trim().toUpperCase(), m]));
    const porSku = new Map<string, ProducaoSku>();
    const skuPorMaquina = new Map<string, { cod: string; material: string }>();

    rows.forEach((a) => {
      const fator = undPorCaixa(a.cod_material_producao, a.material_producao);
      let descargasHora = 0;
      let descargasAlvo = 0;
      a.maquinas.forEach((nome) => {
        const key = nome.trim().toUpperCase();
        skuPorMaquina.set(key, { cod: a.cod_material_producao, material: a.material_producao });
        const m = porNome.get(key);
        if (!m) return;
        descargasHora += m.producedHour;
        descargasAlvo += m.target;
      });
      porSku.set(a.cod_material_producao, {
        cod: a.cod_material_producao,
        material: a.material_producao,
        maquinas: a.maquinas,
        descargasHora,
        descargasAlvo,
        und: Math.round(descargasHora * fator),
        undAlvo: Math.round(descargasAlvo * fator),
      });
    });

    return { porSku, skuPorMaquina, alocacoes: rows, schemaMissing, dia };
  }, [machines, rows, schemaMissing, dia]);
}