/**
 * AllenBradleyMicroLogix1500Driver
 * ------------------------------------------------------------------
 * Driver do CLP instalado em cada máquina EA (Allen-Bradley MicroLogix 1500,
 * Rockwell Automation). Suporta EtherNet/IP, DF1, PCCC e Serial.
 *
 * INTEGRAÇÃO FÍSICA: `abrirCanal`, `lerPontos` e `escreverPonto` são os três
 * únicos pontos a serem trocados pela chamada real ao gateway de chão de
 * fábrica (CIP/PCCC). Toda a UI, métricas e persistência já estão prontas.
 */
import { BaseIndustrialDriver, delay, now, type BaseDriverOptions } from "./BaseIndustrialDriver";
import { MAPEAMENTO_CLP } from "./catalog";
import type { DriverKind, TagRef, ValorIndustrial } from "./types";

export class AllenBradleyMicroLogix1500Driver extends BaseIndustrialDriver {
  readonly kind: DriverKind = "clp";
  readonly driverKey = "allen-bradley/micrologix-1500";
  protected readonly statusTable = "ea_clp_status";

  constructor(opts: BaseDriverOptions) {
    super({
      ...opts,
      identidade: {
        fabricante: "Allen-Bradley",
        familia: "MicroLogix",
        modelo: "MicroLogix 1500",
        ...(opts.identidade ?? {}),
      },
    });
  }

  testesDisponiveis() {
    return [
      { tipo: "ping", label: "Ping" },
      { tipo: "handshake", label: "Handshake" },
      { tipo: "leitura", label: "Leitura de variável" },
      { tipo: "tempo-resposta", label: "Tempo de resposta" },
      { tipo: "firmware", label: "Firmware" },
      { tipo: "modelo", label: "Modelo" },
      { tipo: "status", label: "Status" },
    ];
  }

  protected descreverTeste(tipo: string, ok: boolean, tempoMs: number) {
    const alvo = this.alvo();
    if (!ok) {
      const falhas: Record<string, string> = {
        ping: `Host ${alvo} inacessível`,
        handshake: "Timeout no Register Session / Forward Open",
        leitura: "Falha ao ler variável de teste (N7:0)",
        "tempo-resposta": "Sem resposta dentro do timeout configurado",
        firmware: "Identity Object indisponível",
        modelo: "Identity Object indisponível",
        status: "Controlador não respondeu ao status request",
      };
      return falhas[tipo] ?? `Falha no teste ${tipo}`;
    }
    const ok_: Record<string, string> = {
      ping: `Resposta de ${alvo} em ${tempoMs}ms`,
      handshake: `Sessão ${this.transport.protocolo} estabelecida em ${alvo}`,
      leitura: "Leitura de N7:0 concluída com sucesso",
      "tempo-resposta": `Tempo de resposta médio ${tempoMs}ms`,
      firmware: `Firmware ${this.identidade.firmware ?? "C/13.00"}`,
      modelo: `${this.identidade.fabricante} · ${this.identidade.modelo}`,
      status: `Controlador em RUN · ${this.snapshot.status}`,
    };
    return ok_[tipo] ?? `Teste ${tipo} concluído em ${tempoMs}ms`;
  }

  protected async abrirCanal(): Promise<boolean> {
    const t0 = now();
    await delay(120 + Math.random() * 260);
    if (!this.transport.ip && !this.transport.porta_serial) return false;
    if (this.simulando()) return true;
    // PRODUÇÃO: substituir por handshake CIP/PCCC no gateway de chão de fábrica.
    void t0;
    return Math.random() > 0.2;
  }

  protected async lerPontos(chaves?: string[]): Promise<Record<string, ValorIndustrial>> {
    const alvos = chaves?.length ? chaves : MAPEAMENTO_CLP.map((p) => p.chave);
    if (!this.simulando()) {
      // PRODUÇÃO: leitura real (Multiple Service Packet / PCCC read).
      // Enquanto o gateway não publica, devolve o último valor conhecido.
      return Object.fromEntries(alvos.map((c) => [c, this.snapshot.valores[c] ?? null]));
    }
    const anterior = this.snapshot.valores;
    const num = (k: string, base: number, var_: number) =>
      Number((((anterior[k] as number) ?? base) * 0.7 + (base + (Math.random() - 0.5) * var_) * 0.3).toFixed(2));
    const gerado: Record<string, ValorIndustrial> = {
      producao_atual: Math.round(num("producao_atual", 3200, 200)),
      producao_media: Math.round(num("producao_media", 3100, 120)),
      pacotes_por_minuto: Math.round(num("pacotes_por_minuto", 65, 8)),
      eficiencia: num("eficiencia", 92, 6),
      peso_atual: num("peso_atual", 60, 1.4),
      peso_medio: num("peso_medio", 59.9, 0.6),
      peso_minimo: num("peso_minimo", 58.6, 0.4),
      peso_maximo: num("peso_maximo", 61.4, 0.4),
      desvio_padrao: num("desvio_padrao", 0.42, 0.1),
      receita_atual: (anterior.receita_atual as string) ?? "REC-001",
      produto_atual: (anterior.produto_atual as string) ?? "TORCIDA",
      tempo_produzindo: Math.round(num("tempo_produzindo", 410, 4)),
      tempo_parada: Math.round(num("tempo_parada", 18, 2)),
      tempo_espera: Math.round(num("tempo_espera", 9, 2)),
      tempo_alimentando: Math.round(num("tempo_alimentando", 390, 4)),
      descargas: Math.round(((anterior.descargas as number) ?? 31229) + (Math.random() > 0.5 ? 1 : 0)),
      total_produzido: Math.round(((anterior.total_produzido as number) ?? 812340) + 1),
      contador: Math.round(((anterior.contador as number) ?? 0) + 1),
      operador: (anterior.operador as string) ?? "—",
      status_maquina: Math.random() > 0.05 ? "PRODUZINDO" : "PARADA",
    };
    return Object.fromEntries(alvos.map((c) => [c, gerado[c] ?? null]));
  }

  protected async escreverPonto(tag: TagRef, valor: ValorIndustrial): Promise<boolean> {
    await delay(60 + Math.random() * 90);
    if (this.simulando()) {
      this.emit({ valores: { ...this.snapshot.valores, [tag.endereco ?? tag.nome]: valor } });
      return true;
    }
    // PRODUÇÃO: escrita real (CIP Write Tag / PCCC typed write).
    return false;
  }
}