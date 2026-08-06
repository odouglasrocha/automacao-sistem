/**
 * Registry declarativo do Centro de Configuração Industrial
 * ("Configuração Exclusiva"). Nenhum valor de máquina é hardcoded:
 * o registry descreve APENAS o formato dos campos; os valores vivem no
 * Supabase (`ea_config.dados` jsonb ou tabelas 1:1 escopadas por maquina_id).
 *
 * Para adicionar uma nova categoria ou campo no futuro basta editar este
 * arquivo — a UI, a persistência e a auditoria seguem automaticamente.
 */

export type CampoTipo = "text" | "number" | "boolean" | "textarea" | "select";

export interface CampoSpec {
  nome: string;
  label: string;
  tipo: CampoTipo;
  opcoes?: string[];
  padrao?: string | number | boolean | null;
  ajuda?: string;
  full?: boolean;
}

/** Onde os valores da categoria são persistidos. */
export type Persistencia =
  | { kind: "config" }                    // ea_config.dados (jsonb)
  | { kind: "tabela"; tabela: string };   // tabela 1:1 por maquina_id

export interface CategoriaSpec {
  id: string;
  label: string;
  grupo: string;
  icone: string;
  descricao: string;
  /** Componente dedicado já existente no projeto (mantém a UI atual). */
  custom?:
    | "informacoes" | "comunicacao" | "controlador" | "hardware"
    | "tags" | "receitas" | "alarmes" | "permissoes"
    | "diagnostico" | "logs" | "equipamentos" | "auditoria";
  persistencia?: Persistencia;
  campos?: CampoSpec[];
}

const MODOS = ["producao", "simulacao", "manual"];

export const CATEGORIAS: CategoriaSpec[] = [
  // ------------------------------------------------------- Máquina
  { id: "informacoes", label: "Informações da Máquina", grupo: "Máquina", icone: "Info",
    descricao: "Identificação, linha, localização e fabricante.", custom: "informacoes" },
  { id: "hardware", label: "Hardware Industrial", grupo: "Máquina", icone: "HardDrive",
    descricao: "CLP + inversor em tempo real, drivers e mapeamento.", custom: "hardware" },
  { id: "equipamentos", label: "Equipamentos", grupo: "Máquina", icone: "Boxes",
    descricao: "IHM, fonte, sensores, encoder, balança, esteiras, motores, válvulas…", custom: "equipamentos" },

  // ------------------------------------------------------- Automação
  { id: "comunicacao", label: "Comunicação", grupo: "Automação", icone: "Network",
    descricao: "EtherNet/IP, PCCC, DF1, Serial, Modbus, OPC UA e MQTT.", custom: "comunicacao" },
  { id: "controlador", label: "Controlador (CLP)", grupo: "Automação", icone: "Cpu",
    descricao: "Allen-Bradley MicroLogix / CompactLogix / ControlLogix.", custom: "controlador" },
  { id: "inversor", label: "Inversor de Frequência", grupo: "Automação", icone: "Gauge",
    descricao: "WEG CFW08 e futuros inversores via Modbus.",
    persistencia: { kind: "tabela", tabela: "ea_inversor" },
    campos: [
      { nome: "fabricante", label: "Fabricante", tipo: "text", padrao: "WEG" },
      { nome: "modelo", label: "Modelo", tipo: "text", padrao: "CFW08" },
      { nome: "firmware", label: "Firmware", tipo: "text" },
      { nome: "numero_serie", label: "Número de série", tipo: "text" },
      { nome: "potencia_cv", label: "Potência (CV)", tipo: "number" },
      { nome: "corrente_a", label: "Corrente (A)", tipo: "number" },
      { nome: "frequencia_nominal_hz", label: "Frequência (Hz)", tipo: "number" },
      { nome: "protocolo", label: "Protocolo", tipo: "select", opcoes: ["Modbus RTU", "Modbus TCP"], padrao: "Modbus RTU" },
      { nome: "porta_serial", label: "Porta serial", tipo: "text", padrao: "COM1" },
      { nome: "ip", label: "IP (Modbus TCP)", tipo: "text" },
      { nome: "endereco_modbus", label: "Endereço Modbus", tipo: "number", padrao: 1 },
      { nome: "baud_rate", label: "Baud rate", tipo: "number", padrao: 9600 },
      { nome: "parity", label: "Parity", tipo: "select", opcoes: ["none", "even", "odd"], padrao: "none" },
      { nome: "stop_bits", label: "Stop bits", tipo: "number", padrao: 1 },
      { nome: "timeout_ms", label: "Timeout (ms)", tipo: "number", padrao: 1000 },
      { nome: "status", label: "Status", tipo: "select", opcoes: ["offline", "conectado", "erro"], padrao: "offline" },
      { nome: "ativo", label: "Ativo", tipo: "boolean", padrao: true },
      { nome: "observacoes", label: "Observações", tipo: "textarea", full: true },
    ] },
  { id: "ihm", label: "IHM", grupo: "Automação", icone: "MonitorSmartphone",
    descricao: "Interface homem-máquina instalada no painel.",
    campos: [
      { nome: "fabricante", label: "Fabricante", tipo: "text", padrao: "Masipack" },
      { nome: "modelo", label: "Modelo", tipo: "text" },
      { nome: "firmware", label: "Firmware", tipo: "text" },
      { nome: "numero_serie", label: "Número de série", tipo: "text" },
      { nome: "ip", label: "IP", tipo: "text" },
      { nome: "protocolo", label: "Protocolo", tipo: "select", opcoes: ["EtherNet/IP", "Modbus TCP", "Serial", "OPC UA"] },
      { nome: "resolucao", label: "Resolução", tipo: "text" },
      { nome: "ativo", label: "Ativa", tipo: "boolean", padrao: true },
      { nome: "observacoes", label: "Observações", tipo: "textarea", full: true },
    ] },
  { id: "sensores", label: "Sensores", grupo: "Automação", icone: "Radar",
    descricao: "Parâmetros globais de leitura dos sensores da máquina.",
    campos: [
      { nome: "intervalo_leitura_ms", label: "Intervalo de leitura (ms)", tipo: "number", padrao: 500 },
      { nome: "filtro_media", label: "Filtro de média (amostras)", tipo: "number", padrao: 5 },
      { nome: "debounce_ms", label: "Debounce (ms)", tipo: "number", padrao: 50 },
      { nome: "fotocelula", label: "Fotocélula", tipo: "boolean", padrao: true },
      { nome: "encoder", label: "Encoder", tipo: "boolean", padrao: true },
      { nome: "balanca", label: "Balança", tipo: "boolean", padrao: true },
      { nome: "observacoes", label: "Observações", tipo: "textarea", full: true },
    ] },
  { id: "atuadores", label: "Atuadores", grupo: "Automação", icone: "Wrench",
    descricao: "Motores, servos, válvulas e pneumática.",
    campos: [
      { nome: "motores", label: "Qtd. motores", tipo: "number", padrao: 0 },
      { nome: "servos", label: "Qtd. servo motores", tipo: "number", padrao: 0 },
      { nome: "valvulas", label: "Qtd. válvulas", tipo: "number", padrao: 0 },
      { nome: "pressao_bar", label: "Pressão pneumática (bar)", tipo: "number", padrao: 6 },
      { nome: "intertravamento", label: "Intertravamento ativo", tipo: "boolean", padrao: true },
      { nome: "observacoes", label: "Observações", tipo: "textarea", full: true },
    ] },
  { id: "tags", label: "Tags", grupo: "Automação", icone: "Tags",
    descricao: "Gerenciador de tags exclusivo desta máquina.", custom: "tags" },
  { id: "totalizador", label: "Totalizador", grupo: "Automação", icone: "Sigma",
    descricao: "Variável principal de produção — leitura, escala e reset.",
    campos: [
      { nome: "tag_nome", label: "Nome da tag", tipo: "text", padrao: "TOTALIZADOR" },
      { nome: "descricao", label: "Descrição", tipo: "text" },
      { nome: "endereco", label: "Endereço", tipo: "text", padrao: "N7:10" },
      { nome: "data_type", label: "Tipo", tipo: "select", opcoes: ["INT", "DINT", "REAL", "FLOAT"], padrao: "DINT" },
      { nome: "escala", label: "Escala", tipo: "number", padrao: 1 },
      { nome: "offset_valor", label: "Offset", tipo: "number", padrao: 0 },
      { nome: "conversao", label: "Conversão", tipo: "select", opcoes: ["nenhuma", "pacotes→UND", "caixas→UND", "kg"], padrao: "nenhuma" },
      { nome: "modo_contagem", label: "Modo de contagem", tipo: "select", opcoes: ["incremental", "absoluto"], padrao: "incremental" },
      { nome: "reset_manual", label: "Reset manual", tipo: "boolean", padrao: true },
      { nome: "reset_automatico", label: "Reset automático por turno", tipo: "boolean", padrao: false },
      { nome: "valor_inicial", label: "Valor inicial", tipo: "number", padrao: 0 },
      { nome: "historico", label: "Gravar histórico", tipo: "boolean", padrao: true },
    ] },
  { id: "gateway", label: "Gateway Industrial", grupo: "Automação", icone: "Router",
    descricao: "Fila, buffer, cache e ciclo de vida do driver desta máquina.",
    campos: [
      { nome: "driver", label: "Driver", tipo: "select", opcoes: ["allen-bradley/micrologix-1500", "weg/cfw08"], padrao: "allen-bradley/micrologix-1500" },
      { nome: "fila_max", label: "Tamanho da fila", tipo: "number", padrao: 256 },
      { nome: "buffer_max", label: "Buffer de leitura", tipo: "number", padrao: 1024 },
      { nome: "cache_ms", label: "Cache (ms)", tipo: "number", padrao: 500 },
      { nome: "heartbeat_ms", label: "Heartbeat (ms)", tipo: "number", padrao: 5000 },
      { nome: "reconexao_ms", label: "Backoff de reconexão (ms)", tipo: "number", padrao: 3000 },
      { nome: "tentativas", label: "Tentativas de reconexão", tipo: "number", padrao: 5 },
      { nome: "logs_gateway", label: "Registrar logs do gateway", tipo: "boolean", padrao: true },
    ] },
  { id: "diagnostico", label: "Diagnóstico", grupo: "Automação", icone: "Activity",
    descricao: "Ping, handshake, leitura/escrita de teste e latência.", custom: "diagnostico" },

  // ------------------------------------------------------- Operação
  { id: "modo", label: "Modo de Operação", grupo: "Operação", icone: "ToggleRight",
    descricao: "Somente um modo ativo por máquina: produção, simulação ou manual.",
    persistencia: { kind: "tabela", tabela: "ea_comunicacao" },
    campos: [
      { nome: "modo", label: "Modo ativo", tipo: "select", opcoes: MODOS, padrao: "simulacao",
        ajuda: "Produção conecta ao CLP e bloqueia edição manual." },
      { nome: "keep_alive", label: "Manter sessão ativa", tipo: "boolean", padrao: true },
      { nome: "reconexao_automatica", label: "Reconexão automática", tipo: "boolean", padrao: true },
    ] },
  { id: "simulacao", label: "Simulação", grupo: "Operação", icone: "FlaskConical",
    descricao: "Velocidade, aleatoriedade e intervalo do gerador simulado.",
    campos: [
      { nome: "velocidade", label: "Velocidade (x)", tipo: "number", padrao: 1 },
      { nome: "aleatoriedade", label: "Aleatoriedade (%)", tipo: "number", padrao: 10 },
      { nome: "intervalo_ms", label: "Intervalo (ms)", tipo: "number", padrao: 1000 },
      { nome: "gerar_alarmes", label: "Gerar alarmes simulados", tipo: "boolean", padrao: true },
    ] },
  { id: "manual", label: "Entrada Manual", grupo: "Operação", icone: "PenLine",
    descricao: "Apontamento manual do operador quando não há CLP.",
    campos: [
      { nome: "habilitado", label: "Habilitar entrada manual", tipo: "boolean", padrao: true },
      { nome: "exige_matricula", label: "Exigir matrícula do operador", tipo: "boolean", padrao: true },
      { nome: "campos_liberados", label: "Campos liberados", tipo: "text", padrao: "quantidade,peso,paradas" },
      { nome: "registrar_origem", label: "Registrar origem = manual", tipo: "boolean", padrao: true },
    ] },
  { id: "producao", label: "Produção", grupo: "Operação", icone: "Factory",
    descricao: "Metas, velocidade, peso, tempos e descargas.",
    campos: [
      { nome: "meta_und_turno", label: "Meta UND / turno", tipo: "number", padrao: 0 },
      { nome: "velocidade_ppm", label: "Velocidade (PPm)", tipo: "number", padrao: 60 },
      { nome: "peso_nominal_g", label: "Peso nominal (g)", tipo: "number", padrao: 60 },
      { nome: "tolerancia_peso_g", label: "Tolerância de peso (g)", tipo: "number", padrao: 1.5 },
      { nome: "eficiencia_alvo", label: "Eficiência alvo (%)", tipo: "number", padrao: 92 },
      { nome: "setup_min", label: "Setup (min)", tipo: "number", padrao: 25 },
      { nome: "parada_prevista_min", label: "Parada prevista (min)", tipo: "number", padrao: 60 },
      { nome: "descargas_por_caixa", label: "Descargas por caixa", tipo: "number", padrao: 1 },
    ] },
  { id: "receitas", label: "Receitas", grupo: "Operação", icone: "ChefHat",
    descricao: "Receitas exclusivas desta máquina.", custom: "receitas" },
  { id: "produtos", label: "Produtos", grupo: "Operação", icone: "Package",
    descricao: "Produto padrão e regras de troca de SKU.",
    campos: [
      { nome: "produto_padrao", label: "Produto padrão", tipo: "text" },
      { nome: "sku_padrao", label: "SKU padrão", tipo: "text" },
      { nome: "troca_automatica", label: "Troca automática por planejamento", tipo: "boolean", padrao: true },
      { nome: "validar_shelf_life", label: "Validar shelf life", tipo: "boolean", padrao: true },
    ] },
  { id: "qualidade", label: "Qualidade", grupo: "Operação", icone: "BadgeCheck",
    descricao: "Limites de peso, amostragem e rejeição.",
    campos: [
      { nome: "peso_minimo_g", label: "Peso mínimo (g)", tipo: "number", padrao: 58 },
      { nome: "peso_maximo_g", label: "Peso máximo (g)", tipo: "number", padrao: 62 },
      { nome: "desvio_max", label: "Desvio padrão máximo", tipo: "number", padrao: 0.8 },
      { nome: "amostragem_min", label: "Amostragem (min)", tipo: "number", padrao: 30 },
      { nome: "rejeitar_fora_faixa", label: "Rejeitar fora de faixa", tipo: "boolean", padrao: true },
    ] },
  { id: "oee", label: "OEE", grupo: "Operação", icone: "PieChart",
    descricao: "Parâmetros de disponibilidade, performance e qualidade.",
    campos: [
      { nome: "tempo_turno_min", label: "Tempo de turno (min)", tipo: "number", padrao: 500 },
      { nome: "paradas_planejadas_min", label: "Paradas planejadas (min)", tipo: "number", padrao: 60 },
      { nome: "meta_oee", label: "Meta OEE (%)", tipo: "number", padrao: 85 },
      { nome: "meta_disponibilidade", label: "Meta disponibilidade (%)", tipo: "number", padrao: 90 },
      { nome: "meta_performance", label: "Meta performance (%)", tipo: "number", padrao: 95 },
      { nome: "meta_qualidade", label: "Meta qualidade (%)", tipo: "number", padrao: 99 },
    ] },
  { id: "alarmes", label: "Alarmes", grupo: "Operação", icone: "Bell",
    descricao: "Catálogo de alarmes desta máquina.", custom: "alarmes" },
  { id: "eventos", label: "Eventos", grupo: "Operação", icone: "Zap",
    descricao: "Quais eventos geram registro e notificação.",
    campos: [
      { nome: "notificar_parada", label: "Notificar parada", tipo: "boolean", padrao: true },
      { nome: "notificar_troca_sku", label: "Notificar troca de SKU", tipo: "boolean", padrao: true },
      { nome: "notificar_falha_clp", label: "Notificar falha do CLP", tipo: "boolean", padrao: true },
      { nome: "parada_minima_s", label: "Parada mínima registrada (s)", tipo: "number", padrao: 60 },
    ] },
  { id: "monitoramento", label: "Monitoramento", grupo: "Operação", icone: "MonitorDot",
    descricao: "Atualização em tempo real de dashboard, cards e gráficos.",
    campos: [
      { nome: "refresh_ms", label: "Atualização (ms)", tipo: "number", padrao: 1000 },
      { nome: "realtime", label: "Realtime (WebSocket)", tipo: "boolean", padrao: true },
      { nome: "exibir_no_dashboard", label: "Exibir no dashboard", tipo: "boolean", padrao: true },
      { nome: "exibir_graficos", label: "Exibir gráficos", tipo: "boolean", padrao: true },
      { nome: "janela_grafico_min", label: "Janela do gráfico (min)", tipo: "number", padrao: 60 },
    ] },

  // ------------------------------------------------------- Governança
  { id: "seguranca", label: "Segurança", grupo: "Governança", icone: "ShieldCheck",
    descricao: "Perfis com acesso à configuração desta máquina.",
    campos: [
      { nome: "perfil_minimo_config", label: "Perfil mínimo p/ configurar", tipo: "select",
        opcoes: ["administrador", "engenharia", "supervisor", "operador", "somente-leitura"], padrao: "engenharia" },
      { nome: "perfil_minimo_escrita_clp", label: "Perfil mínimo p/ escrever no CLP", tipo: "select",
        opcoes: ["administrador", "engenharia", "supervisor"], padrao: "engenharia" },
      { nome: "exigir_confirmacao", label: "Exigir confirmação em escrita", tipo: "boolean", padrao: true },
      { nome: "bloquear_producao", label: "Bloquear alterações em produção", tipo: "boolean", padrao: true },
    ] },
  { id: "permissoes", label: "Permissões", grupo: "Governança", icone: "Users",
    descricao: "RBAC por ativo (ler, escrever, configurar).", custom: "permissoes" },
  { id: "logs", label: "Logs", grupo: "Governança", icone: "History",
    descricao: "Conexões, falhas, mudanças de firmware, driver, IP e modo.", custom: "logs" },
  { id: "auditoria", label: "Auditoria", grupo: "Governança", icone: "ScrollText",
    descricao: "Trilha completa de alterações da configuração.", custom: "auditoria" },
  { id: "backup", label: "Backup", grupo: "Governança", icone: "DatabaseBackup",
    descricao: "Exportação e retenção da configuração desta máquina.",
    campos: [
      { nome: "automatico", label: "Backup automático", tipo: "boolean", padrao: true },
      { nome: "frequencia", label: "Frequência", tipo: "select", opcoes: ["diario", "semanal", "mensal"], padrao: "semanal" },
      { nome: "retencao_dias", label: "Retenção (dias)", tipo: "number", padrao: 90 },
      { nome: "incluir_tags", label: "Incluir tags e receitas", tipo: "boolean", padrao: true },
    ] },

  // ------------------------------------------------------- Plataforma
  { id: "integracoes", label: "Integrações", grupo: "Plataforma", icone: "Plug",
    descricao: "ERP, MES e brokers externos.",
    campos: [
      { nome: "erp_ativo", label: "Integração ERP", tipo: "boolean", padrao: false },
      { nome: "erp_endpoint", label: "Endpoint ERP", tipo: "text", full: true },
      { nome: "mqtt_broker", label: "Broker MQTT", tipo: "text" },
      { nome: "mqtt_topico", label: "Tópico MQTT", tipo: "text" },
      { nome: "opcua_endpoint", label: "Endpoint OPC UA", tipo: "text", full: true },
    ] },
  { id: "servicos", label: "Serviços", grupo: "Plataforma", icone: "Cog",
    descricao: "Serviços internos executados para esta máquina.",
    campos: [
      { nome: "coletor_ativo", label: "Coletor de dados", tipo: "boolean", padrao: true },
      { nome: "agregador_oee", label: "Agregador de OEE", tipo: "boolean", padrao: true },
      { nome: "watchdog", label: "Watchdog de conexão", tipo: "boolean", padrao: true },
      { nome: "intervalo_agregacao_s", label: "Intervalo de agregação (s)", tipo: "number", padrao: 60 },
    ] },
  { id: "api", label: "API", grupo: "Plataforma", icone: "Code2",
    descricao: "Exposição de dados desta máquina via API.",
    campos: [
      { nome: "expor_leitura", label: "Expor leitura", tipo: "boolean", padrao: false },
      { nome: "expor_escrita", label: "Expor escrita", tipo: "boolean", padrao: false },
      { nome: "rate_limit_min", label: "Rate limit (req/min)", tipo: "number", padrao: 120 },
      { nome: "webhook_url", label: "Webhook", tipo: "text", full: true },
    ] },
  { id: "atualizacoes", label: "Atualizações", grupo: "Plataforma", icone: "RefreshCw",
    descricao: "Firmware do CLP, driver e janela de manutenção.",
    campos: [
      { nome: "firmware_alvo", label: "Firmware alvo", tipo: "text" },
      { nome: "driver_alvo", label: "Driver alvo", tipo: "text" },
      { nome: "janela_manutencao", label: "Janela de manutenção", tipo: "text", padrao: "domingo 02:00-04:00" },
      { nome: "auto_update_driver", label: "Atualizar driver automaticamente", tipo: "boolean", padrao: false },
    ] },
  { id: "avancado", label: "Configurações Avançadas", grupo: "Plataforma", icone: "Sliders",
    descricao: "Ajuste fino do runtime industrial desta máquina.",
    campos: [
      { nome: "debug", label: "Modo debug", tipo: "boolean", padrao: false },
      { nome: "trace_pacotes", label: "Trace de pacotes", tipo: "boolean", padrao: false },
      { nome: "timeout_global_ms", label: "Timeout global (ms)", tipo: "number", padrao: 3000 },
      { nome: "max_erros_consecutivos", label: "Máx. erros consecutivos", tipo: "number", padrao: 5 },
      { nome: "notas", label: "Notas de engenharia", tipo: "textarea", full: true },
    ] },
];

export const GRUPOS = ["Máquina", "Automação", "Operação", "Governança", "Plataforma"] as const;

export const getCategoria = (id: string) => CATEGORIAS.find((c) => c.id === id);

/** Valores padrão declarados no registry (usados só quando o banco está vazio). */
export function padroesDaCategoria(cat: CategoriaSpec): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const c of cat.campos ?? []) if (c.padrao !== undefined) out[c.nome] = c.padrao;
  return out;
}
