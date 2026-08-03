/**
 * Contrato único de comunicação industrial da Frota EA.
 *
 * Cada equipamento (CLP Allen-Bradley MicroLogix 1500, inversor WEG CFW08 e
 * futuros) implementa `IndustrialDriver`. A camada de UI/hook nunca conhece o
 * protocolo — só o contrato — de modo que a implementação física (gateway de
 * chão de fábrica) possa ser plugada depois sem tocar em componentes.
 */

export type DriverStatus = "conectado" | "offline" | "reconectando" | "erro";
export type DriverKind = "clp" | "inversor";
export type ModoOperacao = "simulacao" | "producao";

export type ValorIndustrial = number | boolean | string | null;

/** Parâmetros de transporte comuns aos dois equipamentos. */
export interface DriverTransport {
  protocolo: string;
  /** TCP/IP (CLP EtherNet/IP ou gateway Modbus TCP). */
  ip?: string | null;
  porta?: number | null;
  /** Serial (DF1 / Modbus RTU). */
  porta_serial?: string | null;
  baud_rate?: number | null;
  parity?: string | null;
  stop_bits?: number | null;
  endereco_modbus?: number | null;
  rack?: number | null;
  slot?: number | null;
  timeout_ms: number;
  intervalo_leitura_ms: number;
  heartbeat_ms: number;
  keep_alive: boolean;
  reconexao_automatica: boolean;
  modo: ModoOperacao | string;
}

export interface DriverIdentidade {
  fabricante: string | null;
  modelo: string | null;
  familia?: string | null;
  firmware: string | null;
  numeroSerie?: string | null;
}

/** Métricas de diagnóstico acumuladas por instância (nunca globais). */
export interface DriverMetrics {
  latenciaMs: number | null;
  heartbeatOk: boolean;
  ultimoHeartbeat: number | null;
  reconexoes: number;
  pacotesPerdidos: number;
  pacotesEnviados: number;
  ultimaComunicacao: number | null;
  tempoOnlineMs: number;
  tempoOfflineMs: number;
  erros: { ts: number; mensagem: string }[];
}

export interface DriverSnapshot {
  maquinaId: string;
  maquinaNome: string;
  kind: DriverKind;
  driverKey: string;
  status: DriverStatus;
  modo: ModoOperacao | string;
  identidade: DriverIdentidade;
  metrics: DriverMetrics;
  /** Última leitura do mapeamento industrial do equipamento. */
  valores: Record<string, ValorIndustrial>;
  ultimoErro: string | null;
  ultimaConexao: number | null;
  atualizadoEm: number;
}

export interface TesteResultado {
  tipo: string;
  label: string;
  sucesso: boolean;
  resultado: string;
  tempoRespostaMs: number;
  ts: number;
}

export interface TagRef {
  nome: string;
  endereco?: string | null;
  data_type?: string | null;
  escala?: number | null;
  offset_valor?: number | null;
}

export type DriverListener = (snap: DriverSnapshot) => void;

/** Interface implementada por todos os drivers industriais. */
export interface IndustrialDriver {
  readonly maquinaId: string;
  readonly maquinaNome: string;
  readonly kind: DriverKind;
  readonly driverKey: string;
  readonly snapshot: DriverSnapshot;

  connect(operador?: string): Promise<DriverSnapshot>;
  disconnect(operador?: string): Promise<DriverSnapshot>;
  reconnect(operador?: string): Promise<DriverSnapshot>;

  read(chaves?: string[]): Promise<Record<string, ValorIndustrial>>;
  write(valores: Record<string, ValorIndustrial>, operador?: string): Promise<boolean>;
  readTag(tag: TagRef): Promise<ValorIndustrial>;
  writeTag(tag: TagRef, valor: ValorIndustrial, operador?: string): Promise<boolean>;

  scan(): Promise<Record<string, ValorIndustrial>>;
  heartbeat(): Promise<boolean>;
  testConnection(tipo?: string): Promise<TesteResultado>;
  testesDisponiveis(): { tipo: string; label: string }[];

  subscribe(fn: DriverListener): () => void;
  updateTransport(t: Partial<DriverTransport>): void;
  updateIdentidade(i: Partial<DriverIdentidade>): void;
  dispose(): void;
}