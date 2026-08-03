/**
 * BaseIndustrialDriver
 * ------------------------------------------------------------------
 * Ciclo de vida, métricas, polling, heartbeat, reconexão automática e
 * persistência (status / diagnóstico / histórico) comuns a qualquer
 * equipamento. Cada instância é EXCLUSIVA de uma máquina EA — não existe
 * estado compartilhado, portanto uma máquina jamais interfere na outra.
 *
 * O transporte físico é abstrato: as subclasses implementam
 * `abrirCanal`, `lerPontos` e `escreverPonto`. Enquanto o gateway de chão de
 * fábrica não estiver publicado, o driver opera em modo simulação.
 */
import { supabase } from "@/lib/supabase";
import { isSchemaMissing } from "@/hooks/useEaMachine";
import type {
  DriverIdentidade,
  DriverKind,
  DriverListener,
  DriverMetrics,
  DriverSnapshot,
  DriverTransport,
  IndustrialDriver,
  TagRef,
  TesteResultado,
  ValorIndustrial,
} from "./types";

export interface BaseDriverOptions {
  maquinaId: string;
  maquinaNome: string;
  transport: DriverTransport;
  identidade?: Partial<DriverIdentidade>;
}

const metricsIniciais = (): DriverMetrics => ({
  latenciaMs: null,
  heartbeatOk: false,
  ultimoHeartbeat: null,
  reconexoes: 0,
  pacotesPerdidos: 0,
  pacotesEnviados: 0,
  ultimaComunicacao: null,
  tempoOnlineMs: 0,
  tempoOfflineMs: 0,
  erros: [],
});

export abstract class BaseIndustrialDriver implements IndustrialDriver {
  abstract readonly kind: DriverKind;
  abstract readonly driverKey: string;
  /** Tabela onde o status deste equipamento é persistido. */
  protected abstract readonly statusTable: string;

  readonly maquinaId: string;
  readonly maquinaNome: string;
  protected transport: DriverTransport;
  protected identidade: DriverIdentidade;

  private listeners = new Set<DriverListener>();
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private beatTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private marcoTempo = Date.now();
  private snap: DriverSnapshot;

  constructor(opts: BaseDriverOptions) {
    this.maquinaId = opts.maquinaId;
    this.maquinaNome = opts.maquinaNome;
    this.transport = opts.transport;
    this.identidade = {
      fabricante: opts.identidade?.fabricante ?? null,
      modelo: opts.identidade?.modelo ?? null,
      familia: opts.identidade?.familia ?? null,
      firmware: opts.identidade?.firmware ?? null,
      numeroSerie: opts.identidade?.numeroSerie ?? null,
    };
    this.snap = {
      maquinaId: this.maquinaId,
      maquinaNome: this.maquinaNome,
      kind: "clp",
      driverKey: "",
      status: "offline",
      modo: this.transport.modo,
      identidade: this.identidade,
      metrics: metricsIniciais(),
      valores: {},
      ultimoErro: null,
      ultimaConexao: null,
      atualizadoEm: Date.now(),
    };
  }

  // ------------------------------------------------------- transporte
  /** Abre a sessão física/simulada. Retorna false quando não há resposta. */
  protected abstract abrirCanal(): Promise<boolean>;
  /** Lê o mapeamento industrial do equipamento. */
  protected abstract lerPontos(chaves?: string[]): Promise<Record<string, ValorIndustrial>>;
  /** Escreve um ponto/tag no equipamento. */
  protected abstract escreverPonto(tag: TagRef, valor: ValorIndustrial): Promise<boolean>;
  /** Testes específicos do equipamento. */
  abstract testesDisponiveis(): { tipo: string; label: string }[];
  protected abstract descreverTeste(tipo: string, ok: boolean, tempoMs: number): string;

  // ------------------------------------------------------- observabilidade
  get snapshot(): DriverSnapshot {
    return this.snap;
  }

  subscribe(fn: DriverListener) {
    this.listeners.add(fn);
    fn(this.snap);
    return () => {
      this.listeners.delete(fn);
    };
  }

  protected emit(patch: Partial<DriverSnapshot>) {
    this.snap = {
      ...this.snap,
      ...patch,
      kind: this.kind,
      driverKey: this.driverKey,
      identidade: patch.identidade ?? this.identidade,
      modo: this.transport.modo,
      atualizadoEm: Date.now(),
    };
    for (const fn of this.listeners) fn(this.snap);
  }

  protected patchMetrics(patch: Partial<DriverMetrics>) {
    this.emit({ metrics: { ...this.snap.metrics, ...patch } });
  }

  /** Contabiliza o tempo online/offline acumulado desde a última transição. */
  private acumularTempo() {
    const agora = Date.now();
    const delta = agora - this.marcoTempo;
    this.marcoTempo = agora;
    const online = this.snap.status === "conectado";
    this.patchMetrics({
      tempoOnlineMs: this.snap.metrics.tempoOnlineMs + (online ? delta : 0),
      tempoOfflineMs: this.snap.metrics.tempoOfflineMs + (online ? 0 : delta),
    });
  }

  protected registrarErro(mensagem: string) {
    const erros = [{ ts: Date.now(), mensagem }, ...this.snap.metrics.erros].slice(0, 20);
    this.patchMetrics({ erros, pacotesPerdidos: this.snap.metrics.pacotesPerdidos + 1 });
  }

  // ------------------------------------------------------- ciclo de vida
  async connect(operador?: string): Promise<DriverSnapshot> {
    this.acumularTempo();
    this.emit({ status: "reconectando", ultimoErro: null });
    const t0 = now();
    const ok = await this.abrirCanal();
    const latencia = Math.round(now() - t0);

    if (!ok) {
      const erro = `Sem resposta de ${this.alvo()}`;
      this.acumularTempo();
      this.emit({ status: "erro", ultimoErro: erro });
      this.patchMetrics({ latenciaMs: latencia });
      this.registrarErro(erro);
      await this.log("erro", "Falha de conexão", `${this.transport.protocolo} · ${this.alvo()}`, operador);
      await this.persistirStatus();
      if (this.transport.reconexao_automatica) this.agendarReconexao(operador);
      return this.snap;
    }

    this.acumularTempo();
    this.emit({ status: "conectado", ultimaConexao: Date.now(), ultimoErro: null });
    this.patchMetrics({
      latenciaMs: latencia,
      heartbeatOk: true,
      ultimoHeartbeat: Date.now(),
      ultimaComunicacao: Date.now(),
    });
    await this.log("conexao", "Conectado", `${this.transport.protocolo} · ${this.alvo()} · ${latencia}ms`, operador);
    await this.persistirStatus();
    this.iniciarCiclos();
    return this.snap;
  }

  async disconnect(operador?: string): Promise<DriverSnapshot> {
    this.pararCiclos();
    this.acumularTempo();
    this.emit({ status: "offline" });
    this.patchMetrics({ heartbeatOk: false });
    await this.log("desconexao", "Desconectado", this.alvo(), operador);
    await this.persistirStatus();
    return this.snap;
  }

  async reconnect(operador?: string): Promise<DriverSnapshot> {
    this.patchMetrics({ reconexoes: this.snap.metrics.reconexoes + 1 });
    await this.log("reconexao", "Reconexão solicitada", this.alvo(), operador);
    this.pararCiclos();
    return this.connect(operador);
  }

  private agendarReconexao(operador?: string) {
    if (!this.transport.reconexao_automatica) return;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      void this.reconnect(operador);
    }, Math.max(3000, this.transport.heartbeat_ms || 5000));
  }

  private iniciarCiclos() {
    this.pararCiclos();
    const scanMs = Math.max(250, this.transport.intervalo_leitura_ms || 1000);
    this.pollTimer = setInterval(() => void this.scan(), scanMs);
    if (this.transport.keep_alive) {
      const beatMs = Math.max(1000, this.transport.heartbeat_ms || 5000);
      this.beatTimer = setInterval(() => void this.heartbeat(), beatMs);
    }
  }

  private pararCiclos() {
    if (this.pollTimer) clearInterval(this.pollTimer);
    if (this.beatTimer) clearInterval(this.beatTimer);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.pollTimer = this.beatTimer = null;
    this.reconnectTimer = null;
  }

  // ------------------------------------------------------- leitura/escrita
  async read(chaves?: string[]): Promise<Record<string, ValorIndustrial>> {
    if (this.snap.status !== "conectado") return {};
    const t0 = now();
    try {
      const valores = await this.lerPontos(chaves);
      this.emit({ valores: { ...this.snap.valores, ...valores } });
      this.patchMetrics({
        latenciaMs: Math.round(now() - t0),
        ultimaComunicacao: Date.now(),
        pacotesEnviados: this.snap.metrics.pacotesEnviados + 1,
      });
      return valores;
    } catch (e: any) {
      this.registrarErro(e?.message ?? "Falha de leitura");
      return {};
    }
  }

  async scan(): Promise<Record<string, ValorIndustrial>> {
    return this.read();
  }

  async write(valores: Record<string, ValorIndustrial>, operador?: string): Promise<boolean> {
    let ok = true;
    for (const [nome, valor] of Object.entries(valores)) {
      ok = (await this.writeTag({ nome }, valor, operador)) && ok;
    }
    return ok;
  }

  async readTag(tag: TagRef): Promise<ValorIndustrial> {
    const valores = await this.read([tag.endereco ?? tag.nome]);
    const bruto = valores[tag.endereco ?? tag.nome] ?? valores[tag.nome] ?? null;
    if (typeof bruto === "number") {
      return bruto * (tag.escala ?? 1) + (tag.offset_valor ?? 0);
    }
    return bruto;
  }

  async writeTag(tag: TagRef, valor: ValorIndustrial, operador?: string): Promise<boolean> {
    if (this.snap.status !== "conectado") {
      this.registrarErro(`Escrita recusada em ${tag.nome}: equipamento offline`);
      return false;
    }
    const ok = await this.escreverPonto(tag, valor);
    this.patchMetrics({
      ultimaComunicacao: Date.now(),
      pacotesEnviados: this.snap.metrics.pacotesEnviados + 1,
    });
    await this.log("escrita", `Escrita em ${tag.nome}`, `${String(valor)} (${ok ? "ok" : "falha"})`, operador);
    return ok;
  }

  async heartbeat(): Promise<boolean> {
    const t0 = now();
    const ok = await this.abrirCanal();
    const latencia = Math.round(now() - t0);
    this.patchMetrics({
      heartbeatOk: ok,
      ultimoHeartbeat: Date.now(),
      latenciaMs: latencia,
      ultimaComunicacao: ok ? Date.now() : this.snap.metrics.ultimaComunicacao,
    });
    if (!ok && this.snap.status === "conectado") {
      this.acumularTempo();
      this.emit({ status: "erro", ultimoErro: "Heartbeat sem resposta" });
      this.registrarErro("Heartbeat sem resposta");
      await this.persistirStatus();
      this.agendarReconexao();
    }
    return ok;
  }

  async testConnection(tipo = "ping"): Promise<TesteResultado> {
    const t0 = now();
    const ok = await this.abrirCanal();
    const tempo = Math.round(now() - t0);
    const label = this.testesDisponiveis().find((t) => t.tipo === tipo)?.label ?? tipo;
    const res: TesteResultado = {
      tipo,
      label,
      sucesso: ok,
      resultado: this.descreverTeste(tipo, ok, tempo),
      tempoRespostaMs: tempo,
      ts: Date.now(),
    };
    this.patchMetrics({ latenciaMs: tempo, ultimaComunicacao: ok ? Date.now() : this.snap.metrics.ultimaComunicacao });
    await this.persistirDiagnostico(res);
    await this.log("diagnostico", `Teste ${label}`, res.resultado);
    return res;
  }

  // ------------------------------------------------------- configuração
  updateTransport(t: Partial<DriverTransport>) {
    const antes = { ...this.transport };
    this.transport = { ...this.transport, ...t };
    if (antes.ip !== this.transport.ip) {
      void this.log("rede", "Mudança de IP", `${antes.ip ?? "—"} → ${this.transport.ip ?? "—"}`);
    }
    if (antes.modo !== this.transport.modo) {
      void this.log("configuracao", "Mudança de modo", `${antes.modo} → ${this.transport.modo}`);
    }
    this.emit({});
    if (this.pollTimer) this.iniciarCiclos();
  }

  updateIdentidade(i: Partial<DriverIdentidade>) {
    const antes = this.identidade;
    this.identidade = { ...this.identidade, ...i };
    if (antes.firmware && i.firmware && antes.firmware !== i.firmware) {
      void this.log("firmware", "Mudança de firmware", `${antes.firmware} → ${i.firmware}`);
    }
    this.emit({ identidade: this.identidade });
  }

  protected alvo(): string {
    if (this.transport.ip) return `${this.transport.ip}:${this.transport.porta ?? "—"}`;
    if (this.transport.porta_serial) {
      return `${this.transport.porta_serial} @ ${this.transport.baud_rate ?? 9600}`;
    }
    return "endereço não configurado";
  }

  protected simulando() {
    return this.transport.modo !== "producao";
  }

  // ------------------------------------------------------- persistência
  /** Histórico por máquina — tolerante a schema ausente para não quebrar a UI. */
  async log(categoria: string, evento: string, detalhe?: string, operador?: string) {
    const { error } = await supabase.from("ea_clp_logs").insert({
      maquina_id: this.maquinaId,
      categoria,
      evento: `[${this.kind === "clp" ? "CLP" : "Inversor"}] ${evento}`,
      detalhe: detalhe ?? null,
      operador: operador ?? null,
    });
    if (error && !isSchemaMissing(error)) console.warn("ea_clp_logs:", error.message);
  }

  protected async persistirDiagnostico(res: TesteResultado) {
    const { error } = await supabase.from("ea_diagnostico").insert({
      maquina_id: this.maquinaId,
      tipo: `${this.kind}:${res.tipo}`,
      sucesso: res.sucesso,
      resultado: res.resultado,
      tempo_resposta_ms: res.tempoRespostaMs,
    });
    if (error && !isSchemaMissing(error)) console.warn("ea_diagnostico:", error.message);
  }

  protected async persistirStatus() {
    const { metrics } = this.snap;
    const { error } = await supabase.from(this.statusTable).upsert(
      {
        maquina_id: this.maquinaId,
        status: this.snap.status,
        ultima_conexao: this.snap.ultimaConexao ? new Date(this.snap.ultimaConexao).toISOString() : null,
        ultimo_erro: this.snap.ultimoErro,
        tempo_resposta_ms: metrics.latenciaMs,
        firmware_detectado: this.identidade.firmware,
        modelo_detectado: this.identidade.modelo,
        fabricante_detectado: this.identidade.fabricante,
        latencia_ms: metrics.latenciaMs,
        reconexoes: metrics.reconexoes,
        pacotes_perdidos: metrics.pacotesPerdidos,
        heartbeat_ok: metrics.heartbeatOk,
        ultima_comunicacao: metrics.ultimaComunicacao
          ? new Date(metrics.ultimaComunicacao).toISOString()
          : null,
        tempo_online_s: Math.round(metrics.tempoOnlineMs / 1000),
        tempo_offline_s: Math.round(metrics.tempoOfflineMs / 1000),
        updated_at: new Date().toISOString(),
      },
      { onConflict: "maquina_id" },
    );
    if (error && !isSchemaMissing(error)) console.warn(`${this.statusTable}:`, error.message);
  }

  dispose() {
    this.pararCiclos();
    this.listeners.clear();
  }
}

export function now() {
  return typeof performance !== "undefined" ? performance.now() : Date.now();
}

export function delay(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}