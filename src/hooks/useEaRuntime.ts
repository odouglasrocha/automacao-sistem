import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEaMaquinas, isSchemaMissing } from "@/hooks/useEaMachine";
import type { Machine, MachineStatus } from "@/lib/simulation";

export type OperationMode = "producao" | "simulacao";

export interface MachineRuntime {
  maquinaId: string;
  nome: string;
  modo: OperationMode;
  ip: string | null;
  protocolo: string | null;
  status: string | null;
  ultimoErro: string | null;
  tempoRespostaMs: number | null;
}

/** Traduz o status do CLP (ea_clp_status) para o status operacional exibido no chão de fábrica. */
function statusFromClp(s: string | null | undefined): MachineStatus {
  switch ((s ?? "offline").toLowerCase()) {
    case "conectado":
    case "online":
      return "producing";
    case "conectando":
    case "reconectando":
      return "setup";
    case "erro":
    case "falha":
      return "fault";
    case "manutencao":
      return "maintenance";
    default:
      return "stopped";
  }
}

/**
 * Modo de operação real de cada máquina, lido de `ea_comunicacao` (+ `ea_clp_status`).
 * Máquinas em `producao` deixam de ser governadas pelo gerador de simulação.
 */
export function useEaRuntime() {
  const { data: maquinas } = useEaMaquinas();

  const { data } = useQuery<{ comm: any[]; status: any[] }>({
    queryKey: ["ea_runtime"],
    refetchInterval: 10_000,
    retry: false,
    queryFn: async () => {
      const [c, s] = await Promise.all([
        supabase.from("ea_comunicacao").select("maquina_id, modo, ip, protocolo"),
        supabase.from("ea_clp_status").select("maquina_id, status, ultimo_erro, tempo_resposta_ms"),
      ]);
      if (c.error && !isSchemaMissing(c.error)) throw c.error;
      if (s.error && !isSchemaMissing(s.error)) throw s.error;
      return { comm: c.data ?? [], status: s.data ?? [] };
    },
  });

  return useMemo(() => {
    const porId = new Map<string, string>();
    (maquinas ?? []).forEach((m) => porId.set(m.id, m.nome.trim().toUpperCase()));

    const statusPorId = new Map<string, any>();
    (data?.status ?? []).forEach((s) => statusPorId.set(s.maquina_id, s));

    const porNome = new Map<string, MachineRuntime>();
    (data?.comm ?? []).forEach((c) => {
      const nome = porId.get(c.maquina_id);
      if (!nome) return;
      const st = statusPorId.get(c.maquina_id);
      porNome.set(nome, {
        maquinaId: c.maquina_id,
        nome,
        modo: c.modo === "producao" ? "producao" : "simulacao",
        ip: c.ip ?? null,
        protocolo: c.protocolo ?? null,
        status: st?.status ?? null,
        ultimoErro: st?.ultimo_erro ?? null,
        tempoRespostaMs: st?.tempo_resposta_ms ?? null,
      });
    });
    return porNome;
  }, [maquinas, data]);
}

/**
 * Aplica o modo real sobre a frota simulada: em `producao`, o status vem do CLP
 * (ea_clp_status) e a telemetria fica congelada em zero até o gateway publicar
 * leituras — nada de valores aleatórios em máquina real.
 */
export function applyRuntime(
  machines: Machine[],
  runtime: Map<string, MachineRuntime>,
): (Machine & { modo: OperationMode; runtime?: MachineRuntime })[] {
  return machines.map((m) => {
    const r = runtime.get(m.name.trim().toUpperCase());
    if (!r || r.modo !== "producao") return { ...m, modo: "simulacao" as const, runtime: r };

    const status = statusFromClp(r.status);
    const online = status === "producing";
    return {
      ...m,
      status,
      modo: "producao" as const,
      runtime: r,
      rpm: online ? m.rpm : 0,
      current: online ? m.current : 0,
      producedHour: online ? m.producedHour : 0,
    };
  });
}