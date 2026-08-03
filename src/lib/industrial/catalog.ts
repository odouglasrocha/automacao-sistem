/**
 * Catálogo de hardware industrial da Frota EA.
 * Fonte única de opções usadas pelos formulários, tags e drivers —
 * evita listas duplicadas espalhadas pelos componentes.
 */

export const TAG_CATEGORIAS = [
  "Produção",
  "Pesagem",
  "Receita",
  "Alarmes",
  "Motores",
  "Sensores",
  "Pneumática",
  "Contadores",
  "Tempos",
  "Qualidade",
] as const;
export type TagCategoria = (typeof TAG_CATEGORIAS)[number];

/** Protocolos suportados pelo CLP Allen-Bradley MicroLogix 1500. */
export const PROTOCOLOS_CLP = ["EtherNet/IP", "DF1", "PCCC", "Serial"] as const;
/** Protocolos suportados pelo inversor WEG CFW08. */
export const PROTOCOLOS_INVERSOR = ["Modbus RTU", "Modbus TCP"] as const;

export const BAUD_RATES = [1200, 2400, 4800, 9600, 19200, 38400, 57600, 115200] as const;
export const PARIDADES = ["none", "even", "odd"] as const;
export const STOP_BITS = [1, 2] as const;

export const DRIVERS_DISPONIVEIS = [
  { key: "allen-bradley/micrologix-1500", label: "Allen-Bradley MicroLogix 1500", tipo: "clp" },
  { key: "weg/cfw08", label: "WEG CFW08", tipo: "inversor" },
] as const;
export type DriverKey = (typeof DRIVERS_DISPONIVEIS)[number]["key"];

export interface PontoMapeado {
  chave: string;
  label: string;
  unidade?: string;
  categoria: string;
}

/** Mapeamento industrial lido do CLP (preparado para leitura física). */
export const MAPEAMENTO_CLP: PontoMapeado[] = [
  { chave: "producao_atual", label: "Produção atual", unidade: "und", categoria: "Produção" },
  { chave: "producao_media", label: "Produção média", unidade: "und/h", categoria: "Produção" },
  { chave: "pacotes_por_minuto", label: "Pacotes por minuto", unidade: "ppm", categoria: "Produção" },
  { chave: "eficiencia", label: "Eficiência", unidade: "%", categoria: "Produção" },
  { chave: "peso_atual", label: "Peso atual", unidade: "g", categoria: "Pesagem" },
  { chave: "peso_medio", label: "Peso médio", unidade: "g", categoria: "Pesagem" },
  { chave: "peso_minimo", label: "Peso mínimo", unidade: "g", categoria: "Pesagem" },
  { chave: "peso_maximo", label: "Peso máximo", unidade: "g", categoria: "Pesagem" },
  { chave: "desvio_padrao", label: "Desvio padrão", unidade: "g", categoria: "Qualidade" },
  { chave: "receita_atual", label: "Receita atual", categoria: "Receita" },
  { chave: "produto_atual", label: "Produto atual", categoria: "Receita" },
  { chave: "tempo_produzindo", label: "Tempo produzindo", unidade: "min", categoria: "Tempos" },
  { chave: "tempo_parada", label: "Tempo parada", unidade: "min", categoria: "Tempos" },
  { chave: "tempo_espera", label: "Tempo espera", unidade: "min", categoria: "Tempos" },
  { chave: "tempo_alimentando", label: "Tempo alimentando", unidade: "min", categoria: "Tempos" },
  { chave: "descargas", label: "Descargas", unidade: "und", categoria: "Contadores" },
  { chave: "total_produzido", label: "Total produzido", unidade: "und", categoria: "Contadores" },
  { chave: "contador", label: "Contador", categoria: "Contadores" },
  { chave: "operador", label: "Operador", categoria: "Produção" },
  { chave: "status_maquina", label: "Status da máquina", categoria: "Produção" },
];

/** Mapeamento industrial lido do inversor WEG CFW08. */
export const MAPEAMENTO_INVERSOR: PontoMapeado[] = [
  { chave: "frequencia", label: "Frequência", unidade: "Hz", categoria: "Motores" },
  { chave: "corrente", label: "Corrente", unidade: "A", categoria: "Motores" },
  { chave: "rpm", label: "RPM", unidade: "rpm", categoria: "Motores" },
  { chave: "torque", label: "Torque", unidade: "%", categoria: "Motores" },
  { chave: "temperatura", label: "Temperatura", unidade: "°C", categoria: "Sensores" },
  { chave: "horas_trabalhadas", label: "Horas trabalhadas", unidade: "h", categoria: "Tempos" },
  { chave: "falha_atual", label: "Falha atual", categoria: "Alarmes" },
  { chave: "ultima_falha", label: "Última falha", categoria: "Alarmes" },
  { chave: "status", label: "Status", categoria: "Motores" },
  { chave: "motor_ligado", label: "Motor ligado", categoria: "Motores" },
  { chave: "motor_parado", label: "Motor parado", categoria: "Motores" },
  { chave: "motor_em_falha", label: "Motor em falha", categoria: "Alarmes" },
  { chave: "consumo", label: "Consumo", unidade: "kWh", categoria: "Motores" },
];

/** Categorias de log registradas em ea_clp_logs (histórico da máquina). */
export const LOG_CATEGORIAS = [
  "conexao",
  "desconexao",
  "erro",
  "reconexao",
  "configuracao",
  "firmware",
  "driver",
  "diagnostico",
  "rede",
  "receita",
] as const;