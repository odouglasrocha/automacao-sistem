import { useEffect, useState } from "react";
import { Activity, Bell, Factory, Shield } from "lucide-react";

export function TopBar({ alarmCount = 0 }: { alarmCount?: number }) {
  const [now, setNow] = useState(() => new Date());
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

  return (
    <header className="sticky top-0 z-30 hud-panel !rounded-none border-x-0 border-t-0 px-6 py-3 flex items-center gap-6">
      <div className="flex items-center gap-3">
        <div className="relative flex h-10 w-10 items-center justify-center rounded-md bg-primary/15 border border-primary/40">
          <Factory className="h-5 w-5 text-primary" />
          <span className="absolute -top-1 -right-1 live-dot" />
        </div>
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
            Industrial Control System
          </div>
          <div className="font-semibold text-foreground leading-tight">
            Planta Matriz — São Paulo · Turno B
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-2 ml-4 text-xs mono text-muted-foreground">
        <Activity className="h-4 w-4 text-success" />
        <span>OPC-UA · MQTT · Modbus</span>
        <span className="text-success">● ONLINE</span>
      </div>

      <div className="ml-auto flex items-center gap-6">
        <div className="hidden lg:flex items-center gap-2 text-xs">
          <Shield className="h-4 w-4 text-info" />
          <span className="text-muted-foreground">SIL-2 · LGPD</span>
        </div>
        <div className="relative">
          <Bell className="h-5 w-5 text-muted-foreground" />
          {alarmCount > 0 && (
            <span className="absolute -top-2 -right-2 min-w-[18px] h-[18px] px-1 rounded-full bg-danger text-danger-foreground text-[10px] font-bold flex items-center justify-center">
              {alarmCount > 99 ? "99+" : alarmCount}
            </span>
          )}
        </div>
        <div className="text-right mono">
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {date}
          </div>
          <div className="text-lg font-semibold text-foreground tabular-nums">{time}</div>
        </div>
      </div>
    </header>
  );
}