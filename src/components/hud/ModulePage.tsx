import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface ModulePageProps {
  icon: LucideIcon;
  eyebrow: string;
  title: string;
  description: string;
  children?: ReactNode;
  actions?: ReactNode;
}

export function ModulePage({ icon: Icon, eyebrow, title, description, children, actions }: ModulePageProps) {
  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3">
          <div className="p-2.5 rounded-md border border-primary/40 bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
              {eyebrow}
            </div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{title}</h1>
            <p className="text-sm text-muted-foreground max-w-2xl">{description}</p>
          </div>
        </div>
        {actions}
      </div>
      {children}
    </div>
  );
}

export function ComingSoon({ items }: { items: string[] }) {
  return (
    <div className="hud-panel p-6">
      <div className="text-[11px] uppercase tracking-[0.18em] text-muted-foreground mb-3">
        Backlog do módulo · próximas entregas
      </div>
      <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
        {items.map((it) => (
          <li
            key={it}
            className="flex items-center gap-2 text-sm text-foreground/90 px-3 py-2 rounded-md border border-border bg-background/30"
          >
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}