import { createFileRoute } from "@tanstack/react-router";
import { Cpu, Radio, Wifi, ShieldCheck } from "lucide-react";
import { ModulePage, ComingSoon } from "@/components/hud/ModulePage";
import { KpiCard } from "@/components/hud/KpiCard";

export const Route = createFileRoute("/iiot")({
  head: () => ({
    meta: [
      { title: "IIoT · ICS" },
      { name: "description", content: "Gateways, sensores e dispositivos edge conectados." },
    ],
  }),
  component: IIoT,
});

const DEVICES = [
  { id: "GW-EDGE-01", tipo: "Gateway", protocolo: "OPC-UA / MQTT", uptime: "99.98%", status: "online" },
  { id: "ESP32-021", tipo: "Sensor vibração", protocolo: "MQTT", uptime: "99.7%", status: "online" },
  { id: "PLC-S7-1500", tipo: "CLP Siemens", protocolo: "Profinet / OPC-UA", uptime: "100%", status: "online" },
  { id: "PLC-CLX-08", tipo: "CLP Rockwell", protocolo: "Ethernet/IP", uptime: "99.9%", status: "online" },
  { id: "MB-TCP-14", tipo: "Medidor energia", protocolo: "Modbus TCP", uptime: "98.4%", status: "warning" },
  { id: "IHM-KTP700", tipo: "IHM Siemens", protocolo: "Profinet", uptime: "99.2%", status: "online" },
];

function IIoT() {
  return (
    <ModulePage
      icon={Cpu}
      eyebrow="Industrial IoT"
      title="IIoT · Dispositivos e Gateways"
      description="Coleta em tempo real via OPC-UA, MQTT, Modbus TCP/RTU, Profinet, Ethernet/IP e Profibus."
    >
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard label="Dispositivos" value="128" icon={Cpu} tone="primary" sub="126 online" />
        <KpiCard label="Mensagens/s" value="4.2k" icon={Radio} tone="success" delta={1.8} sub="MQTT broker" />
        <KpiCard label="Latência média" value="34" unit="ms" icon={Wifi} tone="info" delta={-8.1} />
        <KpiCard label="Certificados válidos" value="100" unit="%" icon={ShieldCheck} tone="success" sub="TLS 1.3" />
      </section>

      <div className="hud-panel p-4 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground">
              <th className="text-left font-medium py-2 px-2">Dispositivo</th>
              <th className="text-left font-medium py-2 px-2">Tipo</th>
              <th className="text-left font-medium py-2 px-2">Protocolo</th>
              <th className="text-left font-medium py-2 px-2">Uptime</th>
              <th className="text-left font-medium py-2 px-2">Status</th>
            </tr>
          </thead>
          <tbody>
            {DEVICES.map((d) => (
              <tr key={d.id} className="border-t border-border hover:bg-muted/20">
                <td className="py-2.5 px-2 mono text-foreground">{d.id}</td>
                <td className="py-2.5 px-2">{d.tipo}</td>
                <td className="py-2.5 px-2 mono text-muted-foreground">{d.protocolo}</td>
                <td className="py-2.5 px-2 mono tabular-nums">{d.uptime}</td>
                <td className="py-2.5 px-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-[11px] px-2 py-0.5 rounded-sm border ${
                      d.status === "online"
                        ? "text-success border-success/40 bg-success/10"
                        : "text-warning border-warning/40 bg-warning/10"
                    }`}
                  >
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-current" />
                    {d.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ComingSoon items={["Descoberta automática", "Digital twin", "Firmware OTA", "Certificados X.509", "Regras edge (Node-RED)"]} />
    </ModulePage>
  );
}