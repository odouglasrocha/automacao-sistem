import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Factory,
  ClipboardList,
  Activity,
  Wrench,
  Boxes,
  Zap,
  Cpu,
  Bot,
  BarChart3,
  Settings,
  ShieldCheck,
  Building2,
  LogOut,
  ChevronsLeft,
  type LucideIcon,
} from "lucide-react";
import { useAuth } from "@/context/AuthProvider";
import { useUi } from "@/context/UiProvider";
import { useOperador } from "@/context/OperadorProvider";
import { Button } from "@/components/ui/button";

type NavItem = { icon: LucideIcon; label: string; to: string };

export const NAV_ITEMS: NavItem[] = [
  { icon: LayoutDashboard, label: "Dashboard", to: "/" },
  { icon: Factory, label: "Chão de Fábrica", to: "/chao-de-fabrica" },
  { icon: ClipboardList, label: "MES · Ordens", to: "/mes" },
  { icon: Activity, label: "SCADA", to: "/scada" },
  { icon: Wrench, label: "Manutenção", to: "/manutencao" },
  { icon: Boxes, label: "Almoxarifado", to: "/almoxarifado" },
  { icon: Zap, label: "Energia", to: "/energia" },
  { icon: Cpu, label: "IIoT", to: "/iiot" },
  { icon: Bot, label: "IA · Insights", to: "/ia" },
  { icon: BarChart3, label: "Relatórios", to: "/relatorios" },
  { icon: ShieldCheck, label: "Qualidade", to: "/qualidade" },
  { icon: Building2, label: "Administração", to: "/admin" },
  { icon: Settings, label: "Configurações", to: "/configuracoes" },
];

export function SideNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user, signOut } = useAuth();
  const { sidebarOpen, setSidebarOpen } = useUi();
  const { operador } = useOperador();

  if (!sidebarOpen) return null;

  return (
    <aside className="hidden lg:flex w-56 2xl:w-64 flex-col shrink-0 border-r border-border bg-sidebar/60 backdrop-blur-sm">
      <div className="p-4 border-b border-border flex items-center justify-between gap-2">
        <div className="text-[10px] mono uppercase tracking-[0.24em] text-muted-foreground">
          Módulos ICS
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 shrink-0"
          onClick={() => setSidebarOpen(false)}
          title="Ocultar menu (F2)"
          aria-label="Ocultar menu lateral"
        >
          <ChevronsLeft className="h-4 w-4" />
        </Button>
      </div>
      <nav className="flex-1 overflow-y-auto py-2">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          return (
            <Link
              key={item.to}
              to={item.to}
              className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-colors ${
                active
                  ? "bg-primary/10 text-primary border-l-2 border-primary"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground border-l-2 border-transparent"
              }`}
            >
              <Icon className="h-4 w-4" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 border-t border-border space-y-2">
        {operador && (
          <div className="text-[10px] mono text-muted-foreground truncate" title={operador.nome}>
            OP {operador.matricula} · {operador.nome}
          </div>
        )}
        {user && (
          <div className="text-[10px] mono text-muted-foreground truncate" title={user.email ?? ""}>
            {user.email}
          </div>
        )}
        <Button variant="ghost" size="sm" className="w-full justify-start" onClick={() => void signOut()}>
          <LogOut className="h-4 w-4 mr-2" /> Sair
        </Button>
        <div className="text-[10px] mono text-muted-foreground">v0.2 · F2 oculta o menu</div>
      </div>
    </aside>
  );
}