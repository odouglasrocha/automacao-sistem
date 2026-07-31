import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { isSchemaMissing } from "@/hooks/useEaMachine";

export interface Operador {
  matricula: string;
  nome: string;
  vinculadoEm: string;
}

interface OperadorCtx {
  operador: Operador | null;
  /** Vincula o operador ao terminal: busca por matrícula e cadastra quando necessário. */
  vincular: (matricula: string, nome?: string) => Promise<Operador>;
  desvincular: () => void;
}

const STORAGE_KEY = "ics-operador";
const Ctx = createContext<OperadorCtx | null>(null);

/**
 * Erros que significam "o banco não consegue guardar esta matrícula do jeito
 * digitado" (ex.: coluna uuid legada recebendo "40207929"). Nesses casos o
 * vínculo é feito localmente, aceitando exatamente o valor informado.
 */
function isIncompatibleColumn(e: any) {
  const msg = String(e?.message ?? e ?? "");
  return (
    e?.code === "22P02" ||
    e?.code === "42703" ||
    /invalid input syntax for type uuid/i.test(msg) ||
    /column .* does not exist/i.test(msg)
  );
}

function isSoftError(e: any) {
  return !e || isSchemaMissing(e) || isIncompatibleColumn(e);
}

export function OperadorProvider({ children }: { children: ReactNode }) {
  const [operador, setOperador] = useState<Operador | null>(null);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) setOperador(JSON.parse(raw) as Operador);
    } catch {
      /* storage indisponível */
    }
  }, []);

  const persist = useCallback((op: Operador | null) => {
    setOperador(op);
    try {
      if (op) window.localStorage.setItem(STORAGE_KEY, JSON.stringify(op));
      else window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* storage indisponível */
    }
  }, []);

  const vincular = useCallback(
    async (matriculaRaw: string, nomeRaw?: string) => {
      const matricula = matriculaRaw.trim();
      const nomeInformado = (nomeRaw ?? "").trim();
      if (!matricula) throw new Error("Informe a matrícula do operador.");

      let nome = nomeInformado;

      let persistivel = true;

      const { data, error } = await supabase
        .from("operadores")
        .select("matricula, nome, ativo")
        .eq("matricula", matricula)
        .maybeSingle();

      if (error && !isSoftError(error)) throw error;
      if (error) persistivel = false;

      if (data) {
        if (data.ativo === false) throw new Error("Matrícula inativa. Procure a supervisão.");
        nome = data.nome ?? nomeInformado;
      } else if (persistivel) {
        if (!nome) throw new Error("Matrícula não cadastrada — informe o nome para cadastrá-la.");
        const ins = await supabase.from("operadores").insert({ matricula, nome });
        if (ins.error && !isSoftError(ins.error)) throw ins.error;
      }

      if (!nome)
        throw new Error("Informe o nome do operador para vincular a matrícula.");

      const op: Operador = { matricula, nome, vinculadoEm: new Date().toISOString() };
      persist(op);
      return op;
    },
    [persist],
  );

  const value = useMemo<OperadorCtx>(
    () => ({ operador, vincular, desvincular: () => persist(null) }),
    [operador, vincular, persist],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useOperador() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useOperador must be used inside <OperadorProvider>");
  return c;
}