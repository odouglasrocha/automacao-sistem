/**
 * IndustrialDriverFactory
 * ------------------------------------------------------------------
 * Instancia e mantém um driver por (maquina_id + equipamento). Duas máquinas
 * nunca compartilham instância, conexão, timers ou estado — a falha de uma EA
 * jamais afeta outra.
 */
import { AllenBradleyMicroLogix1500Driver } from "./AllenBradleyMicroLogix1500Driver";
import { WEGCFW08Driver } from "./WEGCFW08Driver";
import type { BaseDriverOptions } from "./BaseIndustrialDriver";
import type { DriverKind, IndustrialDriver } from "./types";

type Construtor = new (opts: BaseDriverOptions) => IndustrialDriver;

const REGISTRADOS: Record<string, { kind: DriverKind; ctor: Construtor }> = {
  "allen-bradley/micrologix-1500": { kind: "clp", ctor: AllenBradleyMicroLogix1500Driver },
  "weg/cfw08": { kind: "inversor", ctor: WEGCFW08Driver },
};

const DRIVER_PADRAO: Record<DriverKind, string> = {
  clp: "allen-bradley/micrologix-1500",
  inversor: "weg/cfw08",
};

const instancias = new Map<string, IndustrialDriver>();

const chave = (maquinaId: string, kind: DriverKind) => `${maquinaId}::${kind}`;

export const IndustrialDriverFactory = {
  /** Drivers disponíveis para um tipo de equipamento. */
  disponiveis(kind?: DriverKind) {
    return Object.entries(REGISTRADOS)
      .filter(([, v]) => !kind || v.kind === kind)
      .map(([key, v]) => ({ key, kind: v.kind }));
  },

  /** Permite registrar novos equipamentos sem alterar a UI. */
  registrar(key: string, kind: DriverKind, ctor: Construtor) {
    REGISTRADOS[key] = { kind, ctor };
  },

  /** Obtém (ou cria) o driver exclusivo desta máquina/equipamento. */
  get(
    kind: DriverKind,
    opts: BaseDriverOptions & { driverKey?: string | null },
  ): IndustrialDriver {
    const k = chave(opts.maquinaId, kind);
    const desejado = opts.driverKey && REGISTRADOS[opts.driverKey] ? opts.driverKey : DRIVER_PADRAO[kind];
    const atual = instancias.get(k);

    if (atual && atual.driverKey === desejado) {
      atual.updateTransport(opts.transport);
      if (opts.identidade) atual.updateIdentidade(opts.identidade);
      return atual;
    }

    if (atual) {
      void atual.disconnect();
      atual.dispose();
      instancias.delete(k);
    }

    const { ctor } = REGISTRADOS[desejado]!;
    const novo = new ctor(opts);
    instancias.set(k, novo);
    return novo;
  },

  /** Todos os drivers ativos (usado por painéis de frota). */
  listar(): IndustrialDriver[] {
    return Array.from(instancias.values());
  },

  daMaquina(maquinaId: string): IndustrialDriver[] {
    return this.listar().filter((d) => d.maquinaId === maquinaId);
  },

  descartar(maquinaId: string, kind?: DriverKind) {
    for (const k of ["clp", "inversor"] as DriverKind[]) {
      if (kind && k !== kind) continue;
      const d = instancias.get(chave(maquinaId, k));
      if (d) {
        d.dispose();
        instancias.delete(chave(maquinaId, k));
      }
    }
  },
};