import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

interface UiCtx {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  setSidebarOpen: (v: boolean) => void;
}

const Ctx = createContext<UiCtx | null>(null);
const KEY = "ics-sidebar-open";

/** Estado global de UI. F2 alterna a visibilidade da barra lateral (padrão HMI). */
export function UiProvider({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(KEY);
      if (raw !== null) setSidebarOpen(raw === "1");
    } catch {
      /* storage indisponível */
    }
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(KEY, sidebarOpen ? "1" : "0");
    } catch {
      /* storage indisponível */
    }
  }, [sidebarOpen]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "F2") return;
      e.preventDefault();
      setSidebarOpen((v) => !v);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const value = useMemo<UiCtx>(
    () => ({ sidebarOpen, setSidebarOpen, toggleSidebar: () => setSidebarOpen((v) => !v) }),
    [sidebarOpen],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useUi() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useUi must be used inside <UiProvider>");
  return c;
}