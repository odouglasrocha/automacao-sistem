/**
 * WEGCFW08Driver
 * ------------------------------------------------------------------
 * Driver do inversor de frequência WEG CFW08 instalado em cada máquina EA.
 * Comunicação Modbus RTU (RS485) ou Modbus TCP quando houver gateway.
 *
 * INTEGRAÇÃO FÍSICA: implementar `abrirCanal`, `lerPontos` e `escreverPonto`
 * contra o gateway Modbus. O restante (métricas, logs, UI) já está pronto.
 */
import { BaseIndustrialDriver, delay, type BaseDriverOptions } from "./BaseIndustrialDriver";
import { MAPEAMENTO_INVERSOR } from "./catalog";
import type { DriverKind, TagRef, ValorIndustrial } from "./types";

export class WEGCFW08Driver extends BaseIndustrialDriver {
  readonly kind: DriverKind = "inversor";
  readonly driverKey = "weg/cfw08";
  protected readonly statusTable = "ea_inversor_status";

  constructor(opts: BaseDriverOptions) {
    super({
      ...opts,
      identidade: { fabricante: "WEG", familia: "CFW", modelo: "CFW08", ...(opts.identidade ?? {}) },
    });
  }

  testesDisponiveis() {
    return [
      { tipo: "serial", label: "Comunicação serial" },
      { tipo: "modbus", label: "Comunicação Modbus" },
      { tipo: "tempo-resposta", label: "Tempo de resposta" },
      { tipo: "status", label: "Status" },
    ];
  }

  protected descreverTeste(tipo: string, ok: boolean, tempoMs: number) {
    const endereco = this.transport.endereco_modbus ?? 1;
    if (!ok) {
      const falhas: Record<string, string> = {
        serial: `Porta ${this.transport.porta_serial ?? "—"} sem resposta`,
        modbus: `Escravo Modbus ${endereco} não respondeu (timeout)`,
        "tempo-resposta": "Sem resposta dentro do timeout configurado",
        status: "Não foi possível ler a palavra de status (P006)",
      };
      return falhas[tipo] ?? `Falha no teste ${tipo}`;
    }
    const sucesso: Record<string, string> = {
      serial: `Serial ${this.transport.porta_serial ?? "RS485"} @ ${this.transport.baud_rate ?? 9600} ${this.transport.parity ?? "none"}/${this.transport.stop_bits ?? 1} OK`,
      modbus: `Escravo Modbus ${endereco} respondeu em ${tempoMs}ms`,
      "tempo-resposta": `Tempo de resposta ${tempoMs}ms`,
      status: `Inversor ${this.snapshot.valores.status ?? "PRONTO"}`,
    };
    return sucesso[tipo] ?? `Teste ${tipo} concluído em ${tempoMs}ms`;
  }

  protected async abrirCanal(): Promise<boolean> {
    await delay(90 + Math.random() * 200);
    const temAlvo = !!this.transport.porta_serial || !!this.transport.ip;
    if (!temAlvo || !this.transport.endereco_modbus) return false;
    if (this.simulando()) return true;
    // PRODUÇÃO: abrir sessão Modbus RTU/TCP no gateway.
    return Math.random() > 0.25;
  }

  protected async lerPontos(chaves?: string[]): Promise<Record<string, ValorIndustrial>> {
    const alvos = chaves?.length ? chaves : MAPEAMENTO_INVERSOR.map((p) => p.chave);
    if (!this.simulando()) {
      // PRODUÇÃO: leitura dos parâmetros P002/P003/P004/P005/P006… via Modbus.
      return Object.fromEntries(alvos.map((c) => [c, this.snapshot.valores[c] ?? null]));
    }
    const ant = this.snapshot.valores;
    const n = (k: string, base: number, v: number) =>
      Number((((ant[k] as number) ?? base) * 0.7 + (base + (Math.random() - 0.5) * v) * 0.3).toFixed(2));
    const ligado = Math.random() > 0.06;
    const gerado: Record<string, ValorIndustrial> = {
      frequencia: ligado ? n("frequencia", 58, 3) : 0,
      corrente: ligado ? n("corrente", 4.6, 0.8) : 0,
      rpm: ligado ? Math.round(n("rpm", 1720, 60)) : 0,
      torque: ligado ? n("torque", 62, 10) : 0,
      temperatura: n("temperatura", 44, 5),
      horas_trabalhadas: Math.round(n("horas_trabalhadas", 18450, 2)),
      falha_atual: ligado ? "—" : "F000",
      ultima_falha: (ant.ultima_falha as string) ?? "F070",
      status: ligado ? "RODANDO" : "PARADO",
      motor_ligado: ligado,
      motor_parado: !ligado,
      motor_em_falha: false,
      consumo: n("consumo", 12.4, 1.2),
    };
    return Object.fromEntries(alvos.map((c) => [c, gerado[c] ?? null]));
  }

  protected async escreverPonto(tag: TagRef, valor: ValorIndustrial): Promise<boolean> {
    await delay(50 + Math.random() * 80);
    if (this.simulando()) {
      this.emit({ valores: { ...this.snapshot.valores, [tag.endereco ?? tag.nome]: valor } });
      return true;
    }
    // PRODUÇÃO: Write Single Register / Write Multiple Registers.
    return false;
  }
}