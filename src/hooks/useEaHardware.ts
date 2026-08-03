/**
 * Hooks de hardware industrial da Frota EA.
 * Reaproveitam `useEaSingleton` / `useEaSingletonSave` (escopo por maquina_id)
 * e adicionam o ciclo de vida dos drivers + atualização em tempo real
 * (Realtime/WebSocket do Supabase) para dashboards, alarmes e OEE.
 */
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { useEaSingleton, useEaSingletonSave } from "@/hooks/useEaMachine";
import { IndustrialDriverFactory } from "@/lib/industrial/IndustrialDriverFactory";
import type {
  DriverKind,
  DriverSnapshot,
  DriverTransport,
  IndustrialDriver,
} from "@/lib/industrial/types";

export interface EaComunicacao {
  protocolo?: string; ip?: string | null; mascara?: string | null; gateway?: string | null;
  dns?: string | null; porta?: number | null; timeout_ms?: number; intervalo_leitura_ms?: number;
  heartbeat_ms?: number; keep_alive?: boolean; reconexao_automatica?: boolean; modo?: string;
}

export interface EaClpConfig {
  fabricante?: string | null; familia?: string | null; modelo?: string | null;
  numero_serie?: string | null; firmware?: string | null; versao?: string | null;
  revisao?: string | null; descricao?: string | null; driver?: string | null;
  scan_ms?: number | null; rack?: number | null; slot?: number | null; chassis?: string | null;
  status?: string | null; observacoes?: string | null; ativo?: boolean;
}

export interface EaInversor {
  fabricante?: string | null; modelo?: string | null; numero_serie?: string | null;
  firmware?: string | null; potencia_cv?: number | null; tensao_v?: number | null;
  corrente_a?: number | null; frequencia_nominal_hz?: number | null; protocolo?: string | null;
  porta_serial?: string | null; ip?: string | null; porta?: number | null;
  endereco_modbus?: number | null; baud_rate?: number | null; parity?: string | null;
  stop_bits?: number | null; timeout_ms?: number | null; intervalo_leitura_ms?: number | null;
  status?: string | null; observacoes?: string | null; ativo?: boolean;
}

export const CLP_DEFAULT: EaClpConfig = {
  fabricante: "Allen-Bradley",
  familia: "MicroLogix",
  modelo: "MicroLogix 1500",
  driver: "allen-bradley/micrologix-1500",
  scan_ms: 1000,
  rack: 0,
  slot: 0,
  ativo: true,
};

export const INVERSOR_DEFAULT: EaInversor = {
  fabricante: "WEG",
  modelo: "CFW08",
  protocolo: "Modbus RTU",
  porta_serial: "COM1",
  endereco_modbus: 1,
  baud_rate: 9600,
  parity: "none",
  stop_bits: 1,
  timeout_ms: 1000,
  intervalo_leitura_ms: 1000,
  ativo: true,
};

export const COMM_DEFAULT = {
  protocolo: "EtherNet/IP",
  ip: "",
  mascara: "255.255.255.0",
  gateway: "",
  dns: "",
  porta: 44818,
  timeout_ms: 3000,
  intervalo_leitura_ms: 1000,
  heartbeat_ms: 5000,
  keep_alive: true,
  reconexao_automatica: true,
  modo: "simulacao",
};

export const useEaComunicacao = (id: string | null) => useEaSingleton<any>("ea_comunicacao", id);
export const useEaClp = (id: string | null) => useEaSingleton<any>("ea_clp_configuracao", id);
export const useEaInversor = (id: string | null) => useEaSingleton<any>("ea_inversor", id);
export const useEaHardware = (id: string | null) => useEaSingleton<any>("ea_hardware", id);
export const useEaClpStatus = (id: string | null) => useEaSingleton<any>("ea_clp_status", id);
export const useEaInversorStatus = (id: string | null) => useEaSingleton<any>("ea_inversor_status", id);

export const useSaveComunicacao = (id: string | null) => useEaSingletonSave("ea_comunicacao", id);
export const useSaveClp = (id: string | null) => useEaSingletonSave("ea_clp_configuracao", id);
export const useSaveInversor = (id: string | null) => useEaSingletonSave("ea_inversor", id);
export const useSaveHardware = (id: string | null) => useEaSingletonSave("ea_hardware", id);

/** Transporte do CLP a partir de ea_comunicacao + ea_clp_configuracao. */
export function transporteClp(comm: any, clp: any): DriverTransport {
  const c = { ...COMM_DEFAULT, ...(comm ?? {}) };
  return {
    protocolo: c.protocolo,
    ip: c.ip,
    porta: c.porta,
    rack: clp?.rack ?? 0,
    slot: clp?.slot ?? 0,
    timeout_ms: c.timeout_ms,
    intervalo_leitura_ms: clp?.scan_ms ?? c.intervalo_leitura_ms,
    heartbeat_ms: c.heartbeat_ms,
    keep_alive: !!c.keep_alive,
    reconexao_automatica: !!c.reconexao_automatica,
    modo: c.modo,
  };
}

/** Transporte do inversor a partir de ea_inversor (+ modo herdado da máquina). */
export function transporteInversor(inv: any, modo: string): DriverTransport {
  const i = { ...INVERSOR_DEFAULT, ...(inv ?? {}) };
  return {
    protocolo: i.protocolo ?? "Modbus RTU",
    ip: i.ip ?? null,
    porta: i.porta ?? null,
    porta_serial: i.porta_serial ?? null,
    baud_rate: i.baud_rate ?? 9600,
    parity: i.parity ?? "none",
    stop_bits: i.stop_bits ?? 1,
    endereco_modbus: i.endereco_modbus ?? 1,
    timeout_ms: i.timeout_ms ?? 1000,
    intervalo_leitura_ms: i.intervalo_leitura_ms ?? 1000,
    heartbeat_ms: 5000,
    keep_alive: true,
    reconexao_automatica: true,
    modo,
  };
}

/**
 * Driver exclusivo da máquina (CLP ou inversor) com snapshot reativo.
 * O componente não conhece protocolo — apenas o contrato IndustrialDriver.
 */
export function useIndustrialDriver(
  kind: DriverKind,
  maquina: { id: string; nome: string } | null,
  transport: DriverTransport,
  identidade: { fabricante?: string | null; modelo?: string | null; familia?: string | null; firmware?: string | null; numeroSerie?: string | null },
  driverKey?: string | null,
): { driver: IndustrialDriver | null; snap: DriverSnapshot | null } {
  const chaveTransporte = JSON.stringify(transport);
  const chaveIdentidade = JSON.stringify(identidade);

  const driver = useMemo(() => {
    if (!maquina) return null;
    return IndustrialDriverFactory.get(kind, {
      maquinaId: maquina.id,
      maquinaNome: maquina.nome,
      transport,
      identidade,
      driverKey,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [kind, maquina?.id, maquina?.nome, chaveTransporte, chaveIdentidade, driverKey]);

  const [snap, setSnap] = useState<DriverSnapshot | null>(driver?.snapshot ?? null);
  useEffect(() => {
    if (!driver) return;
    return driver.subscribe(setSnap);
  }, [driver]);

  return { driver, snap };
}

/**
 * Realtime (WebSocket) por máquina: qualquer escrita de status, log, alarme ou
 * diagnóstico revalida as queries que alimentam dashboard, produção,
 * indicadores, alarmes, histórico e OEE.
 */
export function useEaRealtime(maquinaId: string | null) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!maquinaId || maquinaId.startsWith("virtual-")) return;
    const tabelas = [
      "ea_clp_status",
      "ea_inversor_status",
      "ea_clp_logs",
      "ea_alarmes",
      "ea_diagnostico",
      "ea_historico",
    ];
    const canal = supabase.channel(`ea-hardware-${maquinaId}`);
    for (const table of tabelas) {
      canal.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter: `maquina_id=eq.${maquinaId}` },
        () => {
          qc.invalidateQueries({ queryKey: [table] });
          qc.invalidateQueries({ queryKey: ["ea_runtime"] });
        },
      );
    }
    canal.subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [maquinaId, qc]);
}