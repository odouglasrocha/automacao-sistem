/**
 * Catálogo de modelos Allen-Bradley usado como fallback quando a tabela
 * `ea_clp_modelos` ainda não foi criada/populada no Supabase.
 * A fonte de verdade é o banco — novos modelos podem ser cadastrados pela
 * própria interface, sem alteração de código.
 */
export interface ClpModelo {
  id?: string;
  fabricante: string;
  familia: string;
  modelo: string;
  ativo?: boolean;
}

const RAW: Record<string, string[]> = {
  Micro800: ["Micro820", "Micro830", "Micro850", "Micro870"],
  MicroLogix: ["1000", "1100", "1200", "1400", "1500"],
  CompactLogix: [
    "1768-L43", "1768-L45", "1769-L16ER-BB1B", "1769-L18ER", "1769-L18ERM",
    "1769-L23E", "1769-L24ER-QB1B", "1769-L27ERM", "1769-L30ER", "1769-L30ERM",
    "1769-L33ER", "1769-L36ERM", "1769-L37ERM",
  ],
  "CompactLogix 5380": [
    "5069-L306ER", "5069-L310ER", "5069-L320ER", "5069-L330ER",
    "5069-L340ER", "5069-L350ER", "5069-L380ER",
  ],
  ControlLogix: [
    "1756-L61", "1756-L62", "1756-L63", "1756-L71", "1756-L72", "1756-L73",
    "1756-L74", "1756-L75", "1756-L81E", "1756-L82E", "1756-L83E",
    "1756-L84E", "1756-L85E",
  ],
  GuardLogix: ["1756-L71S", "1756-L72S", "1756-L73S", "1756-L81ES", "1756-L82ES", "1756-L83ES"],
  FlexLogix: ["1788-L43", "1788-L45"],
  SoftLogix: ["5800"],
  Emulator: ["Studio 5000 Emulator"],
};

export const AB_CATALOG_FALLBACK: ClpModelo[] = Object.entries(RAW).flatMap(
  ([familia, modelos]) =>
    modelos.map((modelo) => ({ fabricante: "Allen-Bradley", familia, modelo, ativo: true })),
);

export const PROTOCOLOS = ["EtherNet/IP", "OPC UA", "Modbus TCP", "MQTT"] as const;
export type ProtocoloIndustrial = (typeof PROTOCOLOS)[number];

export const PORTA_PADRAO: Record<ProtocoloIndustrial, number> = {
  "EtherNet/IP": 44818,
  "OPC UA": 4840,
  "Modbus TCP": 502,
  MQTT: 1883,
};

export const DATA_TYPES = ["BOOL", "INT", "DINT", "REAL", "STRING", "ARRAY", "STRUCT"] as const;