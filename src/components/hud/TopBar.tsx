import { useEffect, useState } from "react";
import { Activity, Bell, Factory, PanelLeft, Shield } from "lucide-react";
import { useUi } from "@/context/UiProvider";
import { turnoAtual } from "@/lib/turnos";
import { OperadorBadge } from "@/components/hud/OperadorBadge";
import { Button } from "@/components/ui/button";

export function TopBar({ alarmCount = 0 }: { alarmCount?: number }) {
  const [now, setNow] = useState(() => new Date());
  const { toggleSidebar } = useUi();
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  const date = now.toLocaleDateString("pt-BR", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = now.toLocaleTimeString("pt-BR");
  const turno = turnoAtual(now);

  return (
    <header className="sticky top-0 z-30 hud-panel !rounded-none border-x-0 border-t-0 px-3 sm:px-6 py-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 lg:flex lg:gap-6">
      <div className="flex min-w-0 items-center gap-3">
        <Button
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={toggleSidebar}
          title="Ocultar/exibir menu (F2)"
          aria-label="Ocultar ou exibir menu lateral (F2)"
        >
          <PanelLeft className="h-5 w-5" />
        </Button>
        <div className="relative hidden sm:flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary/15 border border-primary/40">
          <Factory className="h-5 w-5 text-primary" />
          <span className="absolute -top-1 -right-1 live-dot" />
        </div>
        <div className="min-w-0">
          <div className="truncate text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Industrial Control System
          </div>
          <div className="truncate font-semibold text-foreground leading-tight">
            Planta Matriz — São Paulo · {turno.label}
            <span className="ml-2 hidden xl:inline text-xs mono text-muted-foreground">
              {turno.inicio}–{turno.fim}
            </span>
          </div>
        </div>
      </div>

      <div className="hidden xl:flex items-center gap-2 ml-4 text-xs mono text-muted-foreground">
        <Activity className="h-4 w-4 text-success" />
        <span>OPC-UA · MQTT · Modbus</span>
        <span className="text-success">● ONLINE</span>
      </div>

      <div className="ml-auto flex min-w-0 items-center gap-2 sm:gap-4 lg:gap-6">
        <div className="hidden md:block min-w-0 max-w-[16rem]">
          <OperadorBadge />
        </div>
        <div className="hidden 2xl:flex items-center gap-2 text-xs">
          <Shield className="h-4 w-4 text-info" />
          <span className="text-muted-foreground">SIL-2 · LGPD</span>
        </div>
        <div className="relative shrink-0">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alarmCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center">
              {alarmCount > 99 ? "99+" : alarmCount}
            </span>
          )}
        </div>
        <div className="text-right mono shrink-0">
          <div className="hidden sm:block text-[11px] uppercase tracking-widest text-muted-foreground">
            {date}
          </div>
          <div className="text-base sm:text-lg font-semibold text-foreground tabular-nums">{time}</div>
        </div>
      </div>
    </header>
  );
}