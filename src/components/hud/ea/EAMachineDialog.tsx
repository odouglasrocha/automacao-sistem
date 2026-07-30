import { useEffect, useMemo, useState } from "react";
import {
  Activity, Cpu, Info, Network, Save, ShieldCheck, Tags, History, FlaskConical, Bell,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { CrudTable } from "@/components/hud/CrudTable";
import { ModeloCombobox } from "@/components/hud/ea/ModeloCombobox";
import {
  useEaLogs, useEaSingleton, useEaSingletonSave, type EaMaquina,
} from "@/hooks/useEaMachine";
import { DATA_TYPES, PORTA_PADRAO, PROTOCOLOS, type ProtocoloIndustrial } from "@/lib/allenBradleyCatalog";
import { getDriver, type DiagnosticoResultado, type DriverSnapshot } from "@/lib/AllenBradleyDriver";
import { useAuth } from "@/context/AuthProvider";

const INPUT_CLS =
  "w-full bg-background/60 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground mono focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function EAMachineDialog({
  maquina,
  open,
  onOpenChange,
}: {
  maquina: EaMaquina | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  if (!maquina) return null;
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[88vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> {maquina.nome} · Configuração exclusiva
          </DialogTitle>
          <DialogDescription>
            Configuração independente desta máquina — controlador, comunicação, tags, receitas,
            alarmes, diagnóstico, histórico e permissões vinculados a <code>maquina_id</code>.
          </DialogDescription>
        </DialogHeader>
        <MachineTabs maquina={maquina} />
      </DialogContent>
    </Dialog>
  );
}

function MachineTabs({ maquina }: { maquina: EaMaquina }) {
  return (
    <Tabs defaultValue="info" className="mt-2">
      <TabsList className="flex flex-wrap h-auto">
        <TabsTrigger value="info"><Info className="h-3.5 w-3.5 mr-1" />Informações</TabsTrigger>
        <TabsTrigger value="comm"><Network className="h-3.5 w-3.5 mr-1" />Comunicação</TabsTrigger>
        <TabsTrigger value="clp"><Cpu className="h-3.5 w-3.5 mr-1" />Controlador</TabsTrigger>
        <TabsTrigger value="tags"><Tags className="h-3.5 w-3.5 mr-1" />Tags</TabsTrigger>
        <TabsTrigger value="rec"><FlaskConical className="h-3.5 w-3.5 mr-1" />Receitas</TabsTrigger>
        <TabsTrigger value="alm"><Bell className="h-3.5 w-3.5 mr-1" />Alarmes</TabsTrigger>
        <TabsTrigger value="diag"><Activity className="h-3.5 w-3.5 mr-1" />Diagnóstico</TabsTrigger>
        <TabsTrigger value="hist"><History className="h-3.5 w-3.5 mr-1" />Histórico</TabsTrigger>
        <TabsTrigger value="perm"><ShieldCheck className="h-3.5 w-3.5 mr-1" />Permissões</TabsTrigger>
      </TabsList>

      <TabsContent value="info"><InfoTab maquina={maquina} /></TabsContent>
      <TabsContent value="comm"><ComunicacaoTab maquina={maquina} /></TabsContent>
      <TabsContent value="clp"><ControladorTab maquina={maquina} /></TabsContent>
      <TabsContent value="tags">
        <CrudTable
          table="ea_clp_tags"
          title={`Tags · ${maquina.nome}`}
          description="Tags exclusivas desta máquina — não compartilhadas com outras EA."
          filter={{ maquina_id: maquina.id }}
          fields={[
            { name: "nome", label: "Nome", type: "text", required: true },
            { name: "descricao", label: "Descrição", type: "text" },
            { name: "data_type", label: "DataType", type: "options", options: [...DATA_TYPES] },
            { name: "categoria", label: "Categoria", type: "text" },
            { name: "endereco", label: "Endereço / Tag CLP", type: "text" },
            { name: "leitura", label: "Leitura", type: "boolean" },
            { name: "escrita", label: "Escrita", type: "boolean" },
            { name: "obrigatoria", label: "Obrigatória", type: "boolean" },
            { name: "ativa", label: "Ativa", type: "boolean" },
            { name: "escala", label: "Escala", type: "number" },
            { name: "offset_valor", label: "Offset", type: "number" },
            { name: "unidade", label: "Unidade", type: "text" },
          ]}
        />
      </TabsContent>
      <TabsContent value="rec">
        <CrudTable
          table="ea_receitas"
          title={`Receitas · ${maquina.nome}`}
          description="Receitas associadas somente a esta máquina."
          filter={{ maquina_id: maquina.id }}
          fields={[
            { name: "nome", label: "Nome", type: "text", required: true },
            { name: "versao", label: "Versão", type: "text" },
            { name: "produto", label: "Produto", type: "text" },
            { name: "descricao", label: "Descrição", type: "textarea" },
            { name: "ativa", label: "Ativa", type: "boolean" },
          ]}
        />
      </TabsContent>
      <TabsContent value="alm">
        <CrudTable
          table="ea_alarmes"
          title={`Alarmes · ${maquina.nome}`}
          description="Catálogo de alarmes desta máquina."
          searchColumn="codigo"
          orderBy="codigo"
          filter={{ maquina_id: maquina.id }}
          fields={[
            { name: "codigo", label: "Código", type: "text", required: true },
            { name: "descricao", label: "Descrição", type: "text" },
            { name: "severidade", label: "Severidade", type: "options", options: ["info", "warning", "critical"] },
            { name: "tag", label: "Tag associada", type: "text" },
            { name: "ativo", label: "Ativo", type: "boolean" },
          ]}
        />
      </TabsContent>
      <TabsContent value="diag"><DiagnosticoTab maquina={maquina} /></TabsContent>
      <TabsContent value="hist"><HistoricoTab maquina={maquina} /></TabsContent>
      <TabsContent value="perm">
        <CrudTable
          table="ea_permissoes"
          title={`Permissões · ${maquina.nome}`}
          description="RBAC por ativo — quem pode ler, escrever e configurar esta máquina."
          searchColumn="perfil"
          orderBy="perfil"
          filter={{ maquina_id: maquina.id }}
          fields={[
            { name: "perfil", label: "Perfil", type: "options", options: ["admin", "supervisor", "operador", "visitante"] },
            { name: "pode_ler", label: "Pode ler", type: "boolean" },
            { name: "pode_escrever", label: "Pode escrever", type: "boolean" },
            { name: "pode_configurar", label: "Pode configurar", type: "boolean" },
          ]}
        />
      </TabsContent>
    </Tabs>
  );
}

// ---------------------------------------------------------------- Informações
function InfoTab({ maquina }: { maquina: EaMaquina }) {
  const { data: status } = useEaSingleton<any>("ea_clp_status", maquina.id);
  const save = useEaSingletonSave("ea_maquinas", maquina.id);
  const [form, setForm] = useState(maquina);
  useEffect(() => setForm(maquina), [maquina]);
  const set = (k: string, v: any) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <form
      className="hud-panel p-4 space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate({
          id: maquina.id,
          nome: form.nome,
          linha: form.linha,
          descricao: form.descricao,
          localizacao: form.localizacao,
          fabricante_maquina: form.fabricante_maquina,
          ano_fabricacao: form.ano_fabricacao,
          ativo: form.ativo,
        });
      }}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Identificação"><input className={INPUT_CLS} value={form.nome ?? ""} onChange={(e) => set("nome", e.target.value)} /></Field>
        <Field label="Linha"><input className={INPUT_CLS} value={form.linha ?? ""} onChange={(e) => set("linha", e.target.value)} /></Field>
        <Field label="Localização"><input className={INPUT_CLS} value={form.localizacao ?? ""} onChange={(e) => set("localizacao", e.target.value)} /></Field>
        <Field label="Fabricante da máquina"><input className={INPUT_CLS} value={form.fabricante_maquina ?? ""} onChange={(e) => set("fabricante_maquina", e.target.value)} /></Field>
        <Field label="Ano de fabricação"><input type="number" className={INPUT_CLS} value={form.ano_fabricacao ?? ""} onChange={(e) => set("ano_fabricacao", Number(e.target.value))} /></Field>
        <Field label="Ativo">
          <label className="flex items-center gap-2 text-sm pt-1">
            <input type="checkbox" className="accent-primary" checked={!!form.ativo} onChange={(e) => set("ativo", e.target.checked)} />
            Máquina em operação
          </label>
        </Field>
        <Field label="Descrição" full>
          <textarea className={`${INPUT_CLS} min-h-[64px]`} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mono">
        <Stat label="Status" value={status?.status ?? "offline"} />
        <Stat label="Última conexão" value={status?.ultima_conexao ? new Date(status.ultima_conexao).toLocaleString("pt-BR") : "—"} />
        <Stat label="Modelo detectado" value={status?.modelo_detectado ?? "—"} />
        <Stat label="Firmware" value={status?.firmware_detectado ?? "—"} />
      </div>

      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" />Salvar</Button>
      </div>
    </form>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-border rounded-md bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className="text-foreground truncate">{value}</div>
    </div>
  );
}

// ---------------------------------------------------------------- Comunicação
const COMM_DEFAULT = {
  protocolo: "EtherNet/IP" as ProtocoloIndustrial,
  ip: "192.168.10.34",
  mascara: "255.255.255.0",
  gateway: "192.168.10.1",
  dns: "8.8.8.8",
  porta: 44818,
  timeout_ms: 3000,
  intervalo_leitura_ms: 1000,
  heartbeat_ms: 5000,
  keep_alive: true,
  reconexao_automatica: true,
  modo: "simulacao",
};

function ComunicacaoTab({ maquina }: { maquina: EaMaquina }) {
  const { data } = useEaSingleton<any>("ea_comunicacao", maquina.id);
  const save = useEaSingletonSave("ea_comunicacao", maquina.id);
  const [form, setForm] = useState<any>(COMM_DEFAULT);
  useEffect(() => { if (data) setForm({ ...COMM_DEFAULT, ...data }); }, [data]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <form className="hud-panel p-4 space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Protocolo">
          <select
            className={INPUT_CLS}
            value={form.protocolo}
            onChange={(e) => {
              const p = e.target.value as ProtocoloIndustrial;
              setForm((f: any) => ({ ...f, protocolo: p, porta: PORTA_PADRAO[p] ?? f.porta }));
            }}
          >
            {PROTOCOLOS.map((p) => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="IP"><input className={INPUT_CLS} value={form.ip ?? ""} onChange={(e) => set("ip", e.target.value)} /></Field>
        <Field label="Máscara"><input className={INPUT_CLS} value={form.mascara ?? ""} onChange={(e) => set("mascara", e.target.value)} /></Field>
        <Field label="Gateway"><input className={INPUT_CLS} value={form.gateway ?? ""} onChange={(e) => set("gateway", e.target.value)} /></Field>
        <Field label="DNS"><input className={INPUT_CLS} value={form.dns ?? ""} onChange={(e) => set("dns", e.target.value)} /></Field>
        <Field label="Porta"><input type="number" className={INPUT_CLS} value={form.porta ?? 0} onChange={(e) => set("porta", Number(e.target.value))} /></Field>
        <Field label="Timeout (ms)"><input type="number" className={INPUT_CLS} value={form.timeout_ms ?? 0} onChange={(e) => set("timeout_ms", Number(e.target.value))} /></Field>
        <Field label="Intervalo de leitura (ms)"><input type="number" className={INPUT_CLS} value={form.intervalo_leitura_ms ?? 0} onChange={(e) => set("intervalo_leitura_ms", Number(e.target.value))} /></Field>
        <Field label="Heartbeat (ms)"><input type="number" className={INPUT_CLS} value={form.heartbeat_ms ?? 0} onChange={(e) => set("heartbeat_ms", Number(e.target.value))} /></Field>
        <Field label="Keep Alive">
          <label className="flex items-center gap-2 text-sm pt-1">
            <input type="checkbox" className="accent-primary" checked={!!form.keep_alive} onChange={(e) => set("keep_alive", e.target.checked)} /> Manter sessão ativa
          </label>
        </Field>
        <Field label="Reconexão automática">
          <label className="flex items-center gap-2 text-sm pt-1">
            <input type="checkbox" className="accent-primary" checked={!!form.reconexao_automatica} onChange={(e) => set("reconexao_automatica", e.target.checked)} /> Reconectar após falha
          </label>
        </Field>
        <Field label="Modo de operação">
          <select className={INPUT_CLS} value={form.modo} onChange={(e) => set("modo", e.target.value)}>
            <option value="simulacao">Simulação</option>
            <option value="producao">Produção</option>
          </select>
        </Field>
      </div>
      <p className="text-xs text-muted-foreground">
        EtherNet/IP é o protocolo padrão. A arquitetura já contempla OPC UA, Modbus TCP e MQTT —
        basta selecionar o protocolo; porta e driver se ajustam automaticamente.
      </p>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" />Salvar comunicação</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Controlador
function ControladorTab({ maquina }: { maquina: EaMaquina }) {
  const { data } = useEaSingleton<any>("ea_clp_configuracao", maquina.id);
  const save = useEaSingletonSave("ea_clp_configuracao", maquina.id);
  const [form, setForm] = useState<any>({ fabricante: "Allen-Bradley", slot: 0, rack: 0, ativo: true });
  useEffect(() => { if (data) setForm(data); }, [data]);
  const set = (k: string, v: any) => setForm((f: any) => ({ ...f, [k]: v }));

  return (
    <form className="hud-panel p-4 space-y-4" onSubmit={(e) => { e.preventDefault(); save.mutate(form); }}>
      <div className="text-xs text-muted-foreground">
        Cadastro do CLP exclusivo de <span className="mono text-primary">{maquina.nome}</span> — não existe controlador global.
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Field label="Fabricante"><input className={INPUT_CLS} value={form.fabricante ?? ""} onChange={(e) => set("fabricante", e.target.value)} /></Field>
        <Field label="Modelo (pesquisa dinâmica)">
          <ModeloCombobox
            value={form.modelo}
            familia={form.familia}
            onChange={(modelo, familia, fabricante) => setForm((f: any) => ({ ...f, modelo, familia, fabricante }))}
          />
        </Field>
        <Field label="Família"><input className={INPUT_CLS} value={form.familia ?? ""} onChange={(e) => set("familia", e.target.value)} /></Field>
        <Field label="Número de série"><input className={INPUT_CLS} value={form.numero_serie ?? ""} onChange={(e) => set("numero_serie", e.target.value)} /></Field>
        <Field label="Firmware"><input className={INPUT_CLS} value={form.firmware ?? ""} onChange={(e) => set("firmware", e.target.value)} /></Field>
        <Field label="Revisão"><input className={INPUT_CLS} value={form.revisao ?? ""} onChange={(e) => set("revisao", e.target.value)} /></Field>
        <Field label="Slot"><input type="number" className={INPUT_CLS} value={form.slot ?? 0} onChange={(e) => set("slot", Number(e.target.value))} /></Field>
        <Field label="Rack"><input type="number" className={INPUT_CLS} value={form.rack ?? 0} onChange={(e) => set("rack", Number(e.target.value))} /></Field>
        <Field label="Chassis"><input className={INPUT_CLS} value={form.chassis ?? ""} onChange={(e) => set("chassis", e.target.value)} /></Field>
        <Field label="Ativo">
          <label className="flex items-center gap-2 text-sm pt-1">
            <input type="checkbox" className="accent-primary" checked={!!form.ativo} onChange={(e) => set("ativo", e.target.checked)} /> Controlador ativo
          </label>
        </Field>
        <Field label="Descrição" full>
          <textarea className={`${INPUT_CLS} min-h-[56px]`} value={form.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} />
        </Field>
        <Field label="Observações" full>
          <textarea className={`${INPUT_CLS} min-h-[56px]`} value={form.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" />Salvar controlador</Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------- Diagnóstico
function DiagnosticoTab({ maquina }: { maquina: EaMaquina }) {
  const { user } = useAuth();
  const { data: comm } = useEaSingleton<any>("ea_comunicacao", maquina.id);
  const { data: clp } = useEaSingleton<any>("ea_clp_configuracao", maquina.id);
  const [snap, setSnap] = useState<DriverSnapshot | null>(null);
  const [results, setResults] = useState<DiagnosticoResultado[]>([]);
  const [busy, setBusy] = useState(false);

  const driver = useMemo(
    () =>
      getDriver({
        maquinaId: maquina.id,
        maquinaNome: maquina.nome,
        comm: { ...COMM_DEFAULT, ...(comm ?? {}) } as any,
        modelo: clp?.modelo,
        firmware: clp?.firmware,
      }),
    [maquina.id, maquina.nome, comm, clp],
  );

  useEffect(() => driver.subscribe(setSnap), [driver]);

  async function run(tipo: DiagnosticoResultado["tipo"]) {
    setBusy(true);
    const r = await driver.diagnosticar(tipo);
    setResults((p) => [r, ...p].slice(0, 12));
    setBusy(false);
  }

  const statusColor: Record<string, string> = {
    conectado: "text-success border-success/40 bg-success/10",
    offline: "text-muted-foreground border-border bg-background/40",
    reconectando: "text-warning border-warning/40 bg-warning/10",
    erro: "text-danger border-danger/40 bg-danger/10",
  };

  return (
    <div className="hud-panel p-4 space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${statusColor[snap?.status ?? "offline"]}`}>
            {snap?.status ?? "offline"}
          </span>
          <span className="text-xs mono text-muted-foreground">
            {comm?.ip ?? "—"}:{comm?.porta ?? "—"} · {comm?.protocolo ?? "EtherNet/IP"} · {comm?.modo ?? "simulacao"}
          </span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => driver.connect(user?.email ?? undefined)}>Conectar</Button>
          <Button size="sm" variant="ghost" onClick={() => driver.disconnect(user?.email ?? undefined)}>Desconectar</Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {([
          ["ping", "Ping"],
          ["ethernet-ip", "Teste EtherNet/IP"],
          ["handshake", "Handshake"],
          ["leitura-tag", "Leitura de Tag"],
          ["identidade", "Identidade (modelo/firmware)"],
        ] as const).map(([tipo, label]) => (
          <Button key={tipo} size="sm" variant="outline" disabled={busy} onClick={() => run(tipo)}>
            {label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs mono">
        <Stat label="Tempo de resposta" value={snap?.tempoRespostaMs != null ? `${snap.tempoRespostaMs} ms` : "—"} />
        <Stat label="Fabricante" value={snap?.fabricanteDetectado ?? clp?.fabricante ?? "Allen-Bradley"} />
        <Stat label="Modelo detectado" value={snap?.modeloDetectado ?? clp?.modelo ?? "—"} />
        <Stat label="Firmware" value={snap?.firmwareDetectado ?? clp?.firmware ?? "—"} />
      </div>

      {snap?.status === "conectado" && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs mono">
          {Object.entries(snap.valores).map(([k, v]) => (
            <Stat key={k} label={k} value={String(v)} />
          ))}
        </div>
      )}

      <div className="border border-border rounded-md divide-y divide-border max-h-52 overflow-auto">
        {results.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nenhum teste executado.</div>}
        {results.map((r, i) => (
          <div key={i} className="p-2 text-xs mono flex items-center justify-between gap-2">
            <span className={r.sucesso ? "text-success" : "text-danger"}>{r.tipo}</span>
            <span className="flex-1 text-foreground/80 truncate">{r.resultado}</span>
            <span className="text-muted-foreground">{r.tempoRespostaMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Histórico
function HistoricoTab({ maquina }: { maquina: EaMaquina }) {
  const { data, isLoading, error } = useEaLogs(maquina.id);
  return (
    <div className="hud-panel p-4">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-2">
        Histórico · conexões, falhas, reconexões, mudanças de configuração, firmware, modelo e alarmes
      </div>
      {error && <div className="text-danger text-sm">{(error as Error).message}</div>}
      {isLoading && <div className="text-sm text-muted-foreground">Carregando…</div>}
      <div className="max-h-80 overflow-auto">
        <table className="w-full text-xs mono">
          <thead>
            <tr className="text-left text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="py-2 pr-3">Data</th>
              <th className="py-2 pr-3">Categoria</th>
              <th className="py-2 pr-3">Evento</th>
              <th className="py-2 pr-3">Detalhe</th>
              <th className="py-2">Operador</th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((l) => (
              <tr key={l.id} className="border-b border-border/60">
                <td className="py-1.5 pr-3">{new Date(l.ts).toLocaleString("pt-BR")}</td>
                <td className="py-1.5 pr-3 text-primary">{l.categoria}</td>
                <td className="py-1.5 pr-3">{l.evento}</td>
                <td className="py-1.5 pr-3 text-muted-foreground truncate max-w-[240px]">{l.detalhe}</td>
                <td className="py-1.5">{l.operador ?? "—"}</td>
              </tr>
            ))}
            {!isLoading && !(data ?? []).length && (
              <tr><td colSpan={5} className="py-6 text-center text-muted-foreground">Sem registros</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}