import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  Settings,
  Building2,
  Users,
  Shield,
  Plug,
  Database,
  Cpu,
  Save,
  Wifi,
  CheckCircle2,
  CircleDashed,
} from "lucide-react";
import { ModulePage } from "@/components/hud/ModulePage";
import { useIndustrialSimulation } from "@/lib/simulation";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({
    meta: [
      { title: "Configurações · ICS" },
      {
        name: "description",
        content:
          "Empresas, plantas, usuários, permissões, integrações e configuração de aquisição por ativo EA.",
      },
    ],
  }),
  component: Config,
});

const SECTIONS = [
  { icon: Building2, title: "Multi-Tenant", desc: "Empresas, plantas, unidades, setores, linhas e turnos." },
  { icon: Users, title: "Usuários & Perfis", desc: "Operadores, técnicos, engenheiros e permissões granulares (RBAC)." },
  { icon: Shield, title: "Segurança & LGPD", desc: "MFA, criptografia AES-256, auditoria, controle de sessão." },
  { icon: Plug, title: "Integrações", desc: "ERP, SAP, SharePoint, Power BI, Power Automate, Microsoft 365." },
  { icon: Database, title: "Bancos de Dados", desc: "PostgreSQL, SQL Server, Oracle, MySQL · backup e restauração." },
  { icon: Settings, title: "Parâmetros do Sistema", desc: "Idioma, unidades, timezone, chaves API, gateways OPC-UA/MQTT." },
];

type Protocol = "OPC-UA" | "MQTT" | "Modbus TCP" | "HTTP/REST" | "Serial RS-485";

interface EAConfig {
  enabled: boolean;
  protocol: Protocol;
  host: string;
  port: number;
  endpoint: string;
  username: string;
  pollMs: number;
  unit: "g" | "kg" | "un" | "pcs";
  notes: string;
}

const DEFAULT_CFG: EAConfig = {
  enabled: true,
  protocol: "OPC-UA",
  host: "192.168.10.20",
  port: 4840,
  endpoint: "ns=2;s=Machine/Statistics",
  username: "ics_reader",
  pollMs: 1500,
  unit: "g",
  notes: "",
};

const STORAGE_KEY = "ics.ea.configs.v1";

const PROTOCOL_DEFAULTS: Record<Protocol, Partial<EAConfig>> = {
  "OPC-UA": { port: 4840, endpoint: "ns=2;s=Machine/Statistics" },
  MQTT: { port: 1883, endpoint: "fabrica/EA/telemetria" },
  "Modbus TCP": { port: 502, endpoint: "HR:40001..40020" },
  "HTTP/REST": { port: 8080, endpoint: "/api/estatistica" },
  "Serial RS-485": { port: 9600, endpoint: "COM3 · 8N1" },
};

const INPUT_CLS =
  "w-full bg-background/60 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground mono focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

function Config() {
  return (
    <ModulePage
      icon={Settings}
      eyebrow="System Administration"
      title="Configurações"
      description="Administração da plataforma ICS · Multi-tenant · Segurança · Integrações · Ativos EA."
    >
      <EAConfigSection />

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {SECTIONS.map((s) => {
          const Icon = s.icon;
          return (
            <button
              key={s.title}
              className="hud-panel p-4 text-left hover:border-primary transition-colors group"
            >
              <div className="flex items-center gap-2 text-primary">
                <Icon className="h-5 w-5" />
                <span className="text-[11px] uppercase tracking-widest">Módulo</span>
              </div>
              <div className="mt-2 text-base font-semibold text-foreground group-hover:text-primary">
                {s.title}
              </div>
              <p className="text-sm text-muted-foreground mt-1">{s.desc}</p>
            </button>
          );
        })}
      </div>
    </ModulePage>
  );
}

function EAConfigSection() {
  const { machines } = useIndustrialSimulation();
  const eas = useMemo(
    () =>
      Array.from(new Set(machines.map((m) => m.name)))
        .filter((n) => /^EA\d+$/.test(n))
        .sort((a, b) => Number(a.slice(2)) - Number(b.slice(2))),
    [machines],
  );

  const [configs, setConfigs] = useState<Record<string, EAConfig>>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [form, setForm] = useState<EAConfig>(DEFAULT_CFG);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setConfigs(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (!selected && eas.length) setSelected(eas[0]);
  }, [eas, selected]);

  useEffect(() => {
    if (selected) setForm(configs[selected] ?? DEFAULT_CFG);
  }, [selected, configs]);

  function updateField<K extends keyof EAConfig>(k: K, v: EAConfig[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function changeProtocol(p: Protocol) {
    setForm((f) => ({ ...f, protocol: p, ...PROTOCOL_DEFAULTS[p] }));
  }

  function save() {
    if (!selected) return;
    const next = { ...configs, [selected]: form };
    setConfigs(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 1800);
  }

  const endpointLabel =
    form.protocol === "MQTT"
      ? "Tópico"
      : form.protocol === "Modbus TCP"
        ? "Registradores"
        : form.protocol === "OPC-UA"
          ? "Node ID"
          : form.protocol === "Serial RS-485"
            ? "Porta / Baud"
            : "Endpoint";

  return (
    <section className="hud-panel p-4 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Cpu className="h-4 w-4 text-primary" />
          <div>
            <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">
              Aquisição de Dados por Ativo
            </div>
            <div className="text-base font-semibold text-foreground">
              Configuração do Painel da Máquina · Frota EA
            </div>
          </div>
        </div>
        <div className="text-xs mono text-muted-foreground">
          {Object.values(configs).filter((c) => c.enabled).length}/{eas.length} EA conectadas
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-[220px_1fr] gap-4">
        <div className="border border-border rounded-md bg-background/30 max-h-[420px] overflow-auto">
          <ul className="divide-y divide-border">
            {eas.map((ea) => {
              const cfg = configs[ea];
              const active = selected === ea;
              return (
                <li key={ea}>
                  <button
                    onClick={() => setSelected(ea)}
                    className={`w-full flex items-center justify-between px-3 py-2 text-left text-sm mono transition-colors ${
                      active
                        ? "bg-primary/15 text-primary"
                        : "text-foreground/80 hover:bg-background/60"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      {cfg ? (
                        <CheckCircle2
                          className={`h-3.5 w-3.5 ${
                            cfg.enabled ? "text-success" : "text-muted-foreground"
                          }`}
                        />
                      ) : (
                        <CircleDashed className="h-3.5 w-3.5 text-muted-foreground" />
                      )}
                      {ea}
                    </span>
                    <span className="text-[10px] text-muted-foreground">
                      {cfg?.protocol ?? "—"}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {selected && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              save();
            }}
            className="space-y-4"
          >
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <Wifi className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground mono">{selected}</h3>
                <label className="flex items-center gap-2 text-xs text-muted-foreground ml-3">
                  <input
                    type="checkbox"
                    checked={form.enabled}
                    onChange={(e) => updateField("enabled", e.target.checked)}
                    className="accent-primary"
                  />
                  Habilitada para aquisição
                </label>
              </div>
              <div className="flex items-center gap-2">
                {saved && (
                  <span className="text-xs mono text-success flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" /> salvo
                  </span>
                )}
                <button
                  type="submit"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-primary/60 bg-primary/15 text-primary text-xs uppercase tracking-widest hover:bg-primary/25 transition-colors"
                >
                  <Save className="h-3.5 w-3.5" /> Salvar
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              <Field label="Protocolo">
                <select
                  value={form.protocol}
                  onChange={(e) => changeProtocol(e.target.value as Protocol)}
                  className={INPUT_CLS}
                >
                  {(Object.keys(PROTOCOL_DEFAULTS) as Protocol[]).map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Host / IP do Painel">
                <input
                  className={INPUT_CLS}
                  value={form.host}
                  onChange={(e) => updateField("host", e.target.value)}
                  placeholder="192.168.x.x"
                />
              </Field>
              <Field label="Porta">
                <input
                  className={INPUT_CLS}
                  type="number"
                  value={form.port}
                  onChange={(e) => updateField("port", Number(e.target.value))}
                />
              </Field>
              <Field label={endpointLabel}>
                <input
                  className={INPUT_CLS}
                  value={form.endpoint}
                  onChange={(e) => updateField("endpoint", e.target.value)}
                />
              </Field>
              <Field label="Usuário / Client-ID">
                <input
                  className={INPUT_CLS}
                  value={form.username}
                  onChange={(e) => updateField("username", e.target.value)}
                />
              </Field>
              <Field label="Intervalo de leitura (ms)">
                <input
                  className={INPUT_CLS}
                  type="number"
                  min={100}
                  step={100}
                  value={form.pollMs}
                  onChange={(e) => updateField("pollMs", Number(e.target.value))}
                />
              </Field>
              <Field label="Unidade da variável">
                <select
                  className={INPUT_CLS}
                  value={form.unit}
                  onChange={(e) => updateField("unit", e.target.value as EAConfig["unit"])}
                >
                  <option value="g">gramas (g)</option>
                  <option value="kg">quilos (kg)</option>
                  <option value="un">unidades</option>
                  <option value="pcs">peças/min</option>
                </select>
              </Field>
              <Field label="Observações" full>
                <textarea
                  className={`${INPUT_CLS} min-h-[64px]`}
                  value={form.notes}
                  onChange={(e) => updateField("notes", e.target.value)}
                  placeholder="Descreva os tags mapeados do painel: EFICIÊNCIA, PRODUÇÃO ATUAL, CAÇAMBAS, MÉDIA, DESVIO PADRÃO, TOTAL(Kg), DESCARGAS…"
                />
              </Field>
            </div>

            <div className="rounded-md border border-border bg-background/40 p-3 text-xs mono text-muted-foreground">
              <div className="text-foreground mb-1">Variáveis esperadas do painel</div>
              CAÇAMBAS · MÉDIA · DESVIO PADRÃO · TOTAL(Kg) · DESCARGAS · EFICIÊNCIA · PRODUÇÃO
              MÉDIA · PRODUÇÃO ATUAL · PARADA · PRODUZINDO · ALIMENTANDO · AGUARDANDO · TOTAL LIGADA
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

function Field({
  label,
  full,
  children,
}: {
  label: string;
  full?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}