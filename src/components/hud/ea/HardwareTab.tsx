/**
 * Hardware Industrial · Frota EA
 * ------------------------------------------------------------------
 * Seção dentro da configuração exclusiva de cada máquina EA. Tudo é escopado
 * por `maquina_id`: controlador (Allen-Bradley MicroLogix 1500), inversor
 * (WEG CFW08), drivers, testes de comunicação, diagnóstico e mapeamento
 * industrial. Nenhuma máquina compartilha configuração ou conexão com outra.
 */
import { useEffect, useMemo, useState } from "react";
import { Cpu, Gauge, Save, PlugZap, Power, RefreshCw, Activity, Download, Search } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field, INPUT_CLS, Stat, StatusLed } from "@/components/hud/ea/fields";
import { ModeloCombobox } from "@/components/hud/ea/ModeloCombobox";
import { useAuth } from "@/context/AuthProvider";
import type { EaMaquina } from "@/hooks/useEaMachine";
import {
  CLP_DEFAULT, COMM_DEFAULT, INVERSOR_DEFAULT, transporteClp, transporteInversor,
  useEaClp, useEaComunicacao, useEaInversor, useIndustrialDriver, useEaRealtime,
  useSaveClp, useSaveComunicacao, useSaveInversor,
} from "@/hooks/useEaHardware";
import {
  BAUD_RATES, DRIVERS_DISPONIVEIS, MAPEAMENTO_CLP, MAPEAMENTO_INVERSOR,
  PARIDADES, PROTOCOLOS_CLP, PROTOCOLOS_INVERSOR, STOP_BITS, type PontoMapeado,
} from "@/lib/industrial/catalog";
import type { DriverKind, DriverSnapshot, IndustrialDriver, TesteResultado } from "@/lib/industrial/types";

export function HardwareTab({ maquina }: { maquina: EaMaquina }) {
  useEaRealtime(maquina.id);
  return (
    <div className="space-y-3">
      <div className="text-xs text-muted-foreground">
        Hardware exclusivo de <span className="mono text-primary">{maquina.nome}</span> — CLP, inversor,
        drivers, tags, alarmes e histórico próprios, vinculados a <code>maquina_id</code>.
      </div>
      <Tabs defaultValue="clp">
        <TabsList className="flex flex-wrap h-auto">
          <TabsTrigger value="clp"><Cpu className="h-3.5 w-3.5 mr-1" />Controlador (CLP)</TabsTrigger>
          <TabsTrigger value="inv"><Gauge className="h-3.5 w-3.5 mr-1" />Inversor</TabsTrigger>
        </TabsList>
        <TabsContent value="clp"><ControladorPainel maquina={maquina} /></TabsContent>
        <TabsContent value="inv"><InversorPainel maquina={maquina} /></TabsContent>
      </Tabs>
    </div>
  );
}

// ------------------------------------------------------------------ CLP
function ControladorPainel({ maquina }: { maquina: EaMaquina }) {
  const { data: clp } = useEaClp(maquina.id);
  const { data: comm } = useEaComunicacao(maquina.id);
  const saveClp = useSaveClp(maquina.id);
  const saveComm = useSaveComunicacao(maquina.id);

  const [f, setF] = useState<any>({ ...CLP_DEFAULT, ...COMM_DEFAULT });
  useEffect(() => {
    setF((p: any) => ({ ...p, ...CLP_DEFAULT, ...(clp ?? {}), ...COMM_DEFAULT, ...(comm ?? {}) }));
  }, [clp, comm]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const transport = useMemo(() => transporteClp(f, f), [f]);
  const { driver, snap } = useIndustrialDriver(
    "clp",
    maquina,
    transport,
    {
      fabricante: f.fabricante, modelo: f.modelo, familia: f.familia,
      firmware: f.firmware, numeroSerie: f.numero_serie,
    },
    f.driver,
  );

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    saveClp.mutate({
      fabricante: f.fabricante, familia: f.familia, modelo: f.modelo, firmware: f.firmware,
      versao: f.versao, numero_serie: f.numero_serie, descricao: f.descricao, driver: f.driver,
      scan_ms: num(f.scan_ms), rack: num(f.rack), slot: num(f.slot), chassis: f.chassis,
      status: snap?.status ?? "offline", observacoes: f.observacoes, ativo: !!f.ativo,
    });
    saveComm.mutate({
      protocolo: f.protocolo, ip: f.ip, mascara: f.mascara, gateway: f.gateway, dns: f.dns,
      porta: num(f.porta), timeout_ms: num(f.timeout_ms), intervalo_leitura_ms: num(f.intervalo_leitura_ms),
      heartbeat_ms: num(f.heartbeat_ms), keep_alive: !!f.keep_alive,
      reconexao_automatica: !!f.reconexao_automatica, modo: f.modo,
    });
  }

  return (
    <div className="space-y-3">
      <PainelConexao titulo={`CLP · ${f.fabricante ?? "Allen-Bradley"} ${f.modelo ?? ""}`} driver={driver} snap={snap} />
      <form className="hud-panel p-4 space-y-4" onSubmit={salvar}>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Fabricante"><input className={INPUT_CLS} value={f.fabricante ?? ""} onChange={(e) => set("fabricante", e.target.value)} /></Field>
          <Field label="Modelo">
            <ModeloCombobox
              value={f.modelo}
              familia={f.familia}
              onChange={(modelo, familia, fabricante) => setF((p: any) => ({ ...p, modelo, familia, fabricante }))}
            />
          </Field>
          <Field label="Família"><input className={INPUT_CLS} value={f.familia ?? ""} onChange={(e) => set("familia", e.target.value)} /></Field>
          <Field label="Firmware"><input className={INPUT_CLS} value={f.firmware ?? ""} onChange={(e) => set("firmware", e.target.value)} /></Field>
          <Field label="Versão"><input className={INPUT_CLS} value={f.versao ?? ""} onChange={(e) => set("versao", e.target.value)} /></Field>
          <Field label="Número de série"><input className={INPUT_CLS} value={f.numero_serie ?? ""} onChange={(e) => set("numero_serie", e.target.value)} /></Field>
          <Field label="Descrição" full><textarea className={`${INPUT_CLS} min-h-[56px]`} value={f.descricao ?? ""} onChange={(e) => set("descricao", e.target.value)} /></Field>

          <Field label="Protocolo">
            <select className={INPUT_CLS} value={f.protocolo ?? "EtherNet/IP"} onChange={(e) => set("protocolo", e.target.value)}>
              {PROTOCOLOS_CLP.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Endereço IP"><input className={INPUT_CLS} value={f.ip ?? ""} onChange={(e) => set("ip", e.target.value)} placeholder="192.168.10.34" /></Field>
          <Field label="Máscara"><input className={INPUT_CLS} value={f.mascara ?? ""} onChange={(e) => set("mascara", e.target.value)} /></Field>
          <Field label="Gateway"><input className={INPUT_CLS} value={f.gateway ?? ""} onChange={(e) => set("gateway", e.target.value)} /></Field>
          <Field label="DNS"><input className={INPUT_CLS} value={f.dns ?? ""} onChange={(e) => set("dns", e.target.value)} /></Field>
          <Field label="Porta"><input type="number" className={INPUT_CLS} value={f.porta ?? 44818} onChange={(e) => set("porta", Number(e.target.value))} /></Field>
          <Field label="Rack"><input type="number" className={INPUT_CLS} value={f.rack ?? 0} onChange={(e) => set("rack", Number(e.target.value))} /></Field>
          <Field label="Slot"><input type="number" className={INPUT_CLS} value={f.slot ?? 0} onChange={(e) => set("slot", Number(e.target.value))} /></Field>
          <Field label="Chassis"><input className={INPUT_CLS} value={f.chassis ?? ""} onChange={(e) => set("chassis", e.target.value)} /></Field>

          <Field label="Driver">
            <select className={INPUT_CLS} value={f.driver ?? "allen-bradley/micrologix-1500"} onChange={(e) => set("driver", e.target.value)}>
              {DRIVERS_DISPONIVEIS.filter((d) => d.tipo === "clp").map((d) => (
                <option key={d.key} value={d.key}>{d.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tempo de scan (ms)"><input type="number" className={INPUT_CLS} value={f.scan_ms ?? 1000} onChange={(e) => set("scan_ms", Number(e.target.value))} /></Field>
          <Field label="Polling / leitura (ms)"><input type="number" className={INPUT_CLS} value={f.intervalo_leitura_ms ?? 1000} onChange={(e) => set("intervalo_leitura_ms", Number(e.target.value))} /></Field>
          <Field label="Heartbeat (ms)"><input type="number" className={INPUT_CLS} value={f.heartbeat_ms ?? 5000} onChange={(e) => set("heartbeat_ms", Number(e.target.value))} /></Field>
          <Field label="Timeout (ms)"><input type="number" className={INPUT_CLS} value={f.timeout_ms ?? 3000} onChange={(e) => set("timeout_ms", Number(e.target.value))} /></Field>
          <Field label="Keep Alive">
            <Check checked={!!f.keep_alive} onChange={(v) => set("keep_alive", v)} label="Manter sessão ativa" />
          </Field>
          <Field label="Reconexão automática">
            <Check checked={!!f.reconexao_automatica} onChange={(v) => set("reconexao_automatica", v)} label="Reconectar após falha" />
          </Field>
          <Field label="Modo de operação">
            <select className={INPUT_CLS} value={f.modo ?? "simulacao"} onChange={(e) => set("modo", e.target.value)}>
              <option value="simulacao">Modo Simulação</option>
              <option value="producao">Modo Produção</option>
            </select>
          </Field>
          <Field label="Controlador ativo">
            <Check checked={!!f.ativo} onChange={(v) => set("ativo", v)} label="Em operação" />
          </Field>
          <Field label="Observações" full>
            <textarea className={`${INPUT_CLS} min-h-[56px]`} value={f.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </div>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={saveClp.isPending || saveComm.isPending}>
            <Save className="h-3.5 w-3.5 mr-1" />Salvar controlador
          </Button>
        </div>
      </form>
      <MapeamentoPainel titulo="Mapeamento industrial · CLP" pontos={MAPEAMENTO_CLP} snap={snap} />
      <DiagnosticoPainel snap={snap} />
    </div>
  );
}

// ------------------------------------------------------------------ Inversor
function InversorPainel({ maquina }: { maquina: EaMaquina }) {
  const { data: inv } = useEaInversor(maquina.id);
  const { data: comm } = useEaComunicacao(maquina.id);
  const save = useSaveInversor(maquina.id);
  const [f, setF] = useState<any>(INVERSOR_DEFAULT);
  useEffect(() => { setF((p: any) => ({ ...p, ...INVERSOR_DEFAULT, ...(inv ?? {}) })); }, [inv]);
  const set = (k: string, v: any) => setF((p: any) => ({ ...p, [k]: v }));

  const modo = comm?.modo ?? "simulacao";
  const transport = useMemo(() => transporteInversor(f, modo), [f, modo]);
  const { driver, snap } = useIndustrialDriver(
    "inversor",
    maquina,
    transport,
    { fabricante: f.fabricante, modelo: f.modelo, firmware: f.firmware, numeroSerie: f.numero_serie },
    "weg/cfw08",
  );

  return (
    <div className="space-y-3">
      <PainelConexao titulo={`Inversor · ${f.fabricante ?? "WEG"} ${f.modelo ?? "CFW08"}`} driver={driver} snap={snap} />
      <form
        className="hud-panel p-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          save.mutate({
            fabricante: f.fabricante, modelo: f.modelo, numero_serie: f.numero_serie, firmware: f.firmware,
            potencia_cv: num(f.potencia_cv), tensao_v: num(f.tensao_v), corrente_a: num(f.corrente_a),
            frequencia_nominal_hz: num(f.frequencia_nominal_hz), protocolo: f.protocolo,
            porta_serial: f.porta_serial, ip: f.ip, porta: num(f.porta),
            endereco_modbus: num(f.endereco_modbus), baud_rate: num(f.baud_rate), parity: f.parity,
            stop_bits: num(f.stop_bits), timeout_ms: num(f.timeout_ms),
            intervalo_leitura_ms: num(f.intervalo_leitura_ms),
            status: snap?.status ?? "offline", observacoes: f.observacoes, ativo: !!f.ativo,
          });
        }}
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <Field label="Fabricante"><input className={INPUT_CLS} value={f.fabricante ?? ""} onChange={(e) => set("fabricante", e.target.value)} /></Field>
          <Field label="Modelo"><input className={INPUT_CLS} value={f.modelo ?? ""} onChange={(e) => set("modelo", e.target.value)} /></Field>
          <Field label="Número de série"><input className={INPUT_CLS} value={f.numero_serie ?? ""} onChange={(e) => set("numero_serie", e.target.value)} /></Field>
          <Field label="Firmware"><input className={INPUT_CLS} value={f.firmware ?? ""} onChange={(e) => set("firmware", e.target.value)} /></Field>
          <Field label="Potência (cv)"><input type="number" step="0.01" className={INPUT_CLS} value={f.potencia_cv ?? ""} onChange={(e) => set("potencia_cv", e.target.value)} /></Field>
          <Field label="Tensão (V)"><input type="number" step="0.1" className={INPUT_CLS} value={f.tensao_v ?? ""} onChange={(e) => set("tensao_v", e.target.value)} /></Field>
          <Field label="Corrente (A)"><input type="number" step="0.01" className={INPUT_CLS} value={f.corrente_a ?? ""} onChange={(e) => set("corrente_a", e.target.value)} /></Field>
          <Field label="Frequência nominal (Hz)"><input type="number" step="0.1" className={INPUT_CLS} value={f.frequencia_nominal_hz ?? ""} onChange={(e) => set("frequencia_nominal_hz", e.target.value)} /></Field>
          <Field label="Protocolo">
            <select className={INPUT_CLS} value={f.protocolo ?? "Modbus RTU"} onChange={(e) => set("protocolo", e.target.value)}>
              {PROTOCOLOS_INVERSOR.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Endereço Modbus"><input type="number" className={INPUT_CLS} value={f.endereco_modbus ?? 1} onChange={(e) => set("endereco_modbus", Number(e.target.value))} /></Field>
          <Field label="Porta serial (RS485)"><input className={INPUT_CLS} value={f.porta_serial ?? ""} onChange={(e) => set("porta_serial", e.target.value)} placeholder="COM1 / /dev/ttyUSB0" /></Field>
          <Field label="Baud Rate">
            <select className={INPUT_CLS} value={String(f.baud_rate ?? 9600)} onChange={(e) => set("baud_rate", Number(e.target.value))}>
              {BAUD_RATES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </Field>
          <Field label="Parity">
            <select className={INPUT_CLS} value={f.parity ?? "none"} onChange={(e) => set("parity", e.target.value)}>
              {PARIDADES.map((p) => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>
          <Field label="Stop Bits">
            <select className={INPUT_CLS} value={String(f.stop_bits ?? 1)} onChange={(e) => set("stop_bits", Number(e.target.value))}>
              {STOP_BITS.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Timeout (ms)"><input type="number" className={INPUT_CLS} value={f.timeout_ms ?? 1000} onChange={(e) => set("timeout_ms", Number(e.target.value))} /></Field>
          <Field label="Gateway Modbus TCP (IP)"><input className={INPUT_CLS} value={f.ip ?? ""} onChange={(e) => set("ip", e.target.value)} /></Field>
          <Field label="Porta TCP"><input type="number" className={INPUT_CLS} value={f.porta ?? 502} onChange={(e) => set("porta", Number(e.target.value))} /></Field>
          <Field label="Inversor ativo"><Check checked={!!f.ativo} onChange={(v) => set("ativo", v)} label="Em operação" /></Field>
          <Field label="Observações" full>
            <textarea className={`${INPUT_CLS} min-h-[56px]`} value={f.observacoes ?? ""} onChange={(e) => set("observacoes", e.target.value)} />
          </Field>
        </div>
        <p className="text-xs text-muted-foreground">
          O modo de operação (Simulação/Produção) é herdado da comunicação da máquina: <span className="mono text-primary">{modo}</span>.
        </p>
        <div className="flex justify-end">
          <Button type="submit" size="sm" disabled={save.isPending}><Save className="h-3.5 w-3.5 mr-1" />Salvar inversor</Button>
        </div>
      </form>
      <MapeamentoPainel titulo="Mapeamento industrial · Inversor" pontos={MAPEAMENTO_INVERSOR} snap={snap} />
      <DiagnosticoPainel snap={snap} />
    </div>
  );
}

// ------------------------------------------------------------ Conexão/testes
function PainelConexao({
  titulo, driver, snap,
}: { titulo: string; driver: IndustrialDriver | null; snap: DriverSnapshot | null }) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [testes, setTestes] = useState<TesteResultado[]>([]);
  const operador = user?.email ?? undefined;

  async function rodar(tipo: string) {
    if (!driver) return;
    setBusy(true);
    const r = await driver.testConnection(tipo);
    setTestes((p) => [r, ...p].slice(0, 15));
    setBusy(false);
  }

  return (
    <div className="hud-panel p-4 space-y-3">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <StatusLed status={snap?.status ?? "offline"} />
          <span className="text-xs mono text-muted-foreground">{titulo}</span>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" disabled={!driver || busy} onClick={() => driver?.connect(operador)}>
            <PlugZap className="h-3.5 w-3.5 mr-1" />Conectar
          </Button>
          <Button size="sm" variant="outline" disabled={!driver || busy} onClick={() => driver?.reconnect(operador)}>
            <RefreshCw className="h-3.5 w-3.5 mr-1" />Reconectar
          </Button>
          <Button size="sm" variant="ghost" disabled={!driver} onClick={() => driver?.disconnect(operador)}>
            <Power className="h-3.5 w-3.5 mr-1" />Desconectar
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(driver?.testesDisponiveis() ?? []).map((t) => (
          <Button key={t.tipo} size="sm" variant="outline" disabled={busy} onClick={() => rodar(t.tipo)}>
            {t.label}
          </Button>
        ))}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Tempo de resposta" value={snap?.metrics.latenciaMs != null ? `${snap.metrics.latenciaMs} ms` : "—"} />
        <Stat label="Fabricante" value={snap?.identidade.fabricante ?? "—"} />
        <Stat label="Modelo" value={snap?.identidade.modelo ?? "—"} />
        <Stat label="Firmware" value={snap?.identidade.firmware ?? "—"} />
      </div>

      <div className="border border-border rounded-md divide-y divide-border max-h-44 overflow-auto">
        {testes.length === 0 && <div className="p-3 text-xs text-muted-foreground">Nenhum teste executado.</div>}
        {testes.map((r, i) => (
          <div key={i} className="p-2 text-xs mono flex items-center justify-between gap-2">
            <span className={r.sucesso ? "text-success" : "text-danger"}>{r.label}</span>
            <span className="flex-1 text-foreground/80 truncate">{r.resultado}</span>
            <span className="text-muted-foreground">{r.tempoRespostaMs}ms</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Diagnóstico
function DiagnosticoPainel({ snap }: { snap: DriverSnapshot | null }) {
  const m = snap?.metrics;
  return (
    <div className="hud-panel p-4 space-y-3">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground flex items-center gap-1.5">
        <Activity className="h-3.5 w-3.5" />Diagnóstico
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <Stat label="Latência" value={m?.latenciaMs != null ? `${m.latenciaMs} ms` : "—"} />
        <Stat label="Heartbeat" value={m?.heartbeatOk ? "OK" : "sem resposta"} tone={m?.heartbeatOk ? "text-success" : "text-muted-foreground"} />
        <Stat label="Reconexões" value={m?.reconexoes ?? 0} />
        <Stat label="Pacotes perdidos" value={m?.pacotesPerdidos ?? 0} />
        <Stat label="Última comunicação" value={m?.ultimaComunicacao ? new Date(m.ultimaComunicacao).toLocaleTimeString("pt-BR") : "—"} />
        <Stat label="Tempo online" value={dur(m?.tempoOnlineMs ?? 0)} />
        <Stat label="Tempo offline" value={dur(m?.tempoOfflineMs ?? 0)} />
        <Stat label="Pacotes enviados" value={m?.pacotesEnviados ?? 0} />
      </div>
      <div className="border border-border rounded-md divide-y divide-border max-h-40 overflow-auto">
        {!m?.erros.length && <div className="p-3 text-xs text-muted-foreground">Sem erros registrados nesta sessão.</div>}
        {(m?.erros ?? []).map((e, i) => (
          <div key={i} className="p-2 text-xs mono flex gap-2">
            <span className="text-muted-foreground">{new Date(e.ts).toLocaleTimeString("pt-BR")}</span>
            <span className="text-danger truncate">{e.mensagem}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ------------------------------------------------------------ Mapeamento
function MapeamentoPainel({
  titulo, pontos, snap,
}: { titulo: string; pontos: PontoMapeado[]; snap: DriverSnapshot | null }) {
  const [busca, setBusca] = useState("");
  const [cat, setCat] = useState("todas");
  const categorias = useMemo(() => ["todas", ...Array.from(new Set(pontos.map((p) => p.categoria)))], [pontos]);
  const lista = pontos.filter(
    (p) =>
      (cat === "todas" || p.categoria === cat) &&
      (p.label.toLowerCase().includes(busca.toLowerCase()) || p.chave.includes(busca.toLowerCase())),
  );

  function exportar() {
    const linhas = [
      ["chave", "descricao", "categoria", "unidade", "valor"].join(";"),
      ...lista.map((p) =>
        [p.chave, p.label, p.categoria, p.unidade ?? "", String(snap?.valores[p.chave] ?? "")].join(";"),
      ),
    ].join("\n");
    const url = URL.createObjectURL(new Blob([linhas], { type: "text/csv;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `${snap?.maquinaNome ?? "EA"}-${snap?.kind ?? "clp"}-mapeamento.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="hud-panel p-4 space-y-3">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground">{titulo}</div>
        <div className="flex items-center gap-2">
          <select className={`${INPUT_CLS} w-40`} value={cat} onChange={(e) => setCat(e.target.value)}>
            {categorias.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="h-4 w-4 absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Pesquisar ponto" className="pl-8 w-52" />
          </div>
          <Button size="sm" variant="outline" onClick={exportar}><Download className="h-3.5 w-3.5 mr-1" />CSV</Button>
        </div>
      </div>
      <div className="overflow-x-auto max-h-72">
        <table className="w-full text-xs mono">
          <thead>
            <tr className="text-left text-muted-foreground uppercase tracking-wider border-b border-border">
              <th className="py-2 pr-3">Ponto</th>
              <th className="py-2 pr-3">Categoria</th>
              <th className="py-2 pr-3">Unid.</th>
              <th className="py-2 pr-3 text-right">Valor</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => (
              <tr key={p.chave} className="border-b border-border/60">
                <td className="py-1.5 pr-3">{p.label}<span className="text-muted-foreground"> · {p.chave}</span></td>
                <td className="py-1.5 pr-3 text-primary">{p.categoria}</td>
                <td className="py-1.5 pr-3 text-muted-foreground">{p.unidade ?? "—"}</td>
                <td className="py-1.5 text-right text-foreground">{fmt(snap?.valores[p.chave])}</td>
              </tr>
            ))}
            {!lista.length && (
              <tr><td colSpan={4} className="py-6 text-center text-muted-foreground">Nenhum ponto</td></tr>
            )}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Os valores são publicados pelo driver a cada ciclo de leitura e atualizam dashboard, produção,
        indicadores, alarmes, histórico e OEE em tempo real.
      </p>
    </div>
  );
}

// ------------------------------------------------------------ utilitários
function Check({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-2 text-sm pt-1">
      <input type="checkbox" className="accent-primary" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

function num(v: any): number | null {
  if (v === "" || v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function fmt(v: any) {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "true" : "false";
  return String(v);
}

function dur(ms: number) {
  const s = Math.round(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  return h ? `${h}h ${m}m` : `${m}m ${s % 60}s`;
}

export type { DriverKind };