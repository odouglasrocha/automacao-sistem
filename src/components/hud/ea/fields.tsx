/** Primitivos de formulário/indicadores reutilizados pelas abas da Frota EA. */
import type { ReactNode } from "react";

export const INPUT_CLS =
  "w-full bg-background/60 border border-border rounded-md px-2.5 py-1.5 text-sm text-foreground mono focus:outline-none focus:border-primary/70 focus:ring-1 focus:ring-primary/40";

export function Field({ label, full, children }: { label: string; full?: boolean; children: ReactNode }) {
  return (
    <label className={`flex flex-col gap-1 ${full ? "sm:col-span-2 lg:col-span-3" : ""}`}>
      <span className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

export function Stat({ label, value, tone }: { label: string; value: ReactNode; tone?: string }) {
  return (
    <div className="border border-border rounded-md bg-background/30 px-3 py-2">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{label}</div>
      <div className={`truncate mono text-xs ${tone ?? "text-foreground"}`}>{value}</div>
    </div>
  );
}

const LED_TONE: Record<string, string> = {
  conectado: "bg-success shadow-[0_0_10px_2px] shadow-success/50",
  reconectando: "bg-warning animate-pulse shadow-[0_0_10px_2px] shadow-warning/40",
  erro: "bg-danger animate-pulse shadow-[0_0_10px_2px] shadow-danger/40",
  offline: "bg-muted-foreground/50",
};

const LED_TEXT: Record<string, string> = {
  conectado: "text-success border-success/40 bg-success/10",
  reconectando: "text-warning border-warning/40 bg-warning/10",
  erro: "text-danger border-danger/40 bg-danger/10",
  offline: "text-muted-foreground border-border bg-background/40",
};

/** LED industrial padrão do HUD. */
export function StatusLed({ status, label }: { status: string; label?: string }) {
  const s = LED_TONE[status] ? status : "offline";
  return (
    <span
      className={`inline-flex items-center gap-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded border ${LED_TEXT[s]}`}
    >
      <span className={`h-2 w-2 rounded-full ${LED_TONE[s]}`} />
      {label ?? s}
    </span>
  );
}