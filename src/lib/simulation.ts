import { useEffect, useState } from "react";

export type MachineStatus =
  | "producing"
  | "idle"
  | "setup"
  | "maintenance"
  | "fault"
  | "stopped";

export interface Machine {
  id: string;
  name: string;
  line: string;
  status: MachineStatus;
  oee: number;
  availability: number;
  performance: number;
  quality: number;
  rpm: number;
  temperature: number;
  current: number;
  producedHour: number;
  target: number;
}

export interface Alarm {
  id: string;
  ts: number;
  machine: string;
  severity: "info" | "warning" | "critical";
  message: string;
}

export interface AndonCall {
  id: string;
  ts: number;
  machine: string;
  line: string;
  type: "production" | "quality" | "maintenance" | "safety" | "logistics";
  status: "open" | "attending" | "closed";
  waitMs: number;
}

const LINES = ["L-01 Estamparia", "L-02 Injeção", "L-03 Montagem", "L-04 Envase"];
// Frota EA34–EA58, exceto EA43 (24 ativos)
const MACHINE_NAMES: string[] = Array.from({ length: 58 - 34 + 1 }, (_, i) => 34 + i)
  .filter((n) => n !== 43)
  .map((n) => `EA${n}`);

const STATUS_POOL: MachineStatus[] = [
  "producing", "producing", "producing", "producing", "producing", "producing",
  "idle", "setup", "maintenance", "fault", "stopped",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function seedMachines(): Machine[] {
  return MACHINE_NAMES.map((name, i) => {
    const status = i < 7 ? "producing" : STATUS_POOL[(i * 3) % STATUS_POOL.length];
    const oee = 55 + Math.random() * 40;
    return {
      id: `MCH-${String(i + 1).padStart(3, "0")}`,
      name,
      line: LINES[i % LINES.length],
      status,
      oee,
      availability: 70 + Math.random() * 28,
      performance: 70 + Math.random() * 28,
      quality: 92 + Math.random() * 7,
      rpm: 300 + Math.random() * 1400,
      temperature: 45 + Math.random() * 55,
      current: 8 + Math.random() * 40,
      producedHour: Math.floor(60 + Math.random() * 240),
      target: 300,
    };
  });
}

function tickMachine(m: Machine): Machine {
  const jitter = (base: number, amp: number, min: number, max: number) =>
    Math.max(min, Math.min(max, base + (Math.random() - 0.5) * amp));

  let status = m.status;
  if (Math.random() < 0.015) status = pick(STATUS_POOL);

  const producing = status === "producing";
  return {
    ...m,
    status,
    rpm: producing ? jitter(m.rpm, 80, 200, 1800) : jitter(m.rpm, 20, 0, 200),
    temperature: jitter(m.temperature, 3, 30, 110),
    current: producing ? jitter(m.current, 4, 5, 55) : jitter(m.current, 1, 0, 8),
    oee: jitter(m.oee, 1.2, 30, 99),
    availability: jitter(m.availability, 0.8, 40, 100),
    performance: jitter(m.performance, 1, 40, 100),
    quality: jitter(m.quality, 0.4, 80, 100),
    producedHour: producing
      ? Math.min(m.target, m.producedHour + Math.floor(Math.random() * 4))
      : m.producedHour,
  };
}

const ALARM_MSGS = [
  { s: "critical" as const, m: "Parada de emergência acionada" },
  { s: "critical" as const, m: "Sobrecorrente no motor principal" },
  { s: "warning" as const, m: "Temperatura acima do setpoint" },
  { s: "warning" as const, m: "Vibração elevada detectada (IIoT)" },
  { s: "warning" as const, m: "Setup em atraso — 12 min" },
  { s: "info" as const, m: "Troca de lote realizada" },
  { s: "info" as const, m: "Manutenção preventiva concluída" },
  { s: "warning" as const, m: "Baixo nível de matéria-prima" },
  { s: "critical" as const, m: "Temperatura baixa mordente horizontal" },
];

export function useIndustrialSimulation() {
  const [machines, setMachines] = useState<Machine[]>(() => seedMachines());
  const [alarms, setAlarms] = useState<Alarm[]>([]);
  const [andon, setAndon] = useState<AndonCall[]>([
    {
      id: "A-1029",
      ts: Date.now() - 4 * 60_000,
      machine: "INJET-320",
      line: LINES[1],
      type: "maintenance",
      status: "attending",
      waitMs: 4 * 60_000,
    },
    {
      id: "A-1030",
      ts: Date.now() - 90_000,
      machine: "PRENSA-450T",
      line: LINES[0],
      type: "quality",
      status: "open",
      waitMs: 90_000,
    },
  ]);
  const [history, setHistory] = useState<{ t: string; produced: number; target: number; refugo: number }[]>(() => {
    const now = Date.now();
    return Array.from({ length: 24 }, (_, i) => {
      const d = new Date(now - (23 - i) * 60_000);
      return {
        t: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        produced: 220 + Math.floor(Math.random() * 90),
        target: 300,
        refugo: Math.floor(Math.random() * 12),
      };
    });
  });

  useEffect(() => {
    const machineTick = setInterval(() => {
      setMachines((prev) => prev.map(tickMachine));
    }, 1500);

    const alarmTick = setInterval(() => {
      if (Math.random() < 0.55) {
        const pool = ALARM_MSGS[Math.floor(Math.random() * ALARM_MSGS.length)];
        setAlarms((prev) =>
          [
            {
              id: `AL-${Date.now()}`,
              ts: Date.now(),
              machine: pick(MACHINE_NAMES),
              severity: pool.s,
              message: pool.m,
            },
            ...prev,
          ].slice(0, 40),
        );
      }
    }, 4000);

    const andonTick = setInterval(() => {
      setAndon((prev) => {
        const bumped = prev.map((c) =>
          c.status === "closed" ? c : { ...c, waitMs: c.waitMs + 3000 },
        );
        if (Math.random() < 0.25) {
          const types: AndonCall["type"][] = ["production", "quality", "maintenance", "safety", "logistics"];
          bumped.unshift({
            id: `A-${1030 + Math.floor(Math.random() * 900)}`,
            ts: Date.now(),
            machine: pick(MACHINE_NAMES),
            line: pick(LINES),
            type: pick(types),
            status: "open",
            waitMs: 0,
          });
        }
        return bumped.slice(0, 8);
      });
    }, 3000);

    const histTick = setInterval(() => {
      setHistory((prev) => {
        const d = new Date();
        const next = [
          ...prev.slice(1),
          {
            t: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
            produced: 220 + Math.floor(Math.random() * 90),
            target: 300,
            refugo: Math.floor(Math.random() * 12),
          },
        ];
        return next;
      });
    }, 5000);

    return () => {
      clearInterval(machineTick);
      clearInterval(alarmTick);
      clearInterval(andonTick);
      clearInterval(histTick);
    };
  }, []);

  return { machines, alarms, andon, history };
}

export function formatDuration(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  if (m > 0) return `${m}m ${s % 60}s`;
  return `${s}s`;
}

export const STATUS_META: Record<MachineStatus, { label: string; color: string; bg: string }> = {
  producing: { label: "Produzindo", color: "text-success", bg: "bg-success/15 border-success/40" },
  idle: { label: "Ociosa", color: "text-info", bg: "bg-info/15 border-info/40" },
  setup: { label: "Setup", color: "text-warning", bg: "bg-warning/15 border-warning/40" },
  maintenance: { label: "Manutenção", color: "text-warning", bg: "bg-warning/15 border-warning/40" },
  fault: { label: "Falha", color: "text-danger", bg: "bg-danger/15 border-danger/40" },
  stopped: { label: "Parada", color: "text-muted-foreground", bg: "bg-muted/40 border-border" },
};