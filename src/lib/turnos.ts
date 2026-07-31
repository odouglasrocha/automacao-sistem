/**
 * Turnos de produção da planta (horário local).
 *  1º turno: 05:30 → 13:50
 *  2º turno: 13:50 → 22:08
 *  3º turno: 22:08 → 05:30 (vira o dia)
 */
export interface Turno {
  id: 1 | 2 | 3;
  label: string;
  inicio: string;
  fim: string;
}

export const TURNOS: Turno[] = [
  { id: 1, label: "Turno 1º", inicio: "05:30", fim: "13:50" },
  { id: 2, label: "Turno 2º", inicio: "13:50", fim: "22:08" },
  { id: 3, label: "Turno 3º", inicio: "22:08", fim: "05:30" },
];

function toMin(hhmm: string) {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Retorna o turno vigente para a data/hora informada (padrão: agora). */
export function turnoAtual(date: Date = new Date()): Turno {
  const min = date.getHours() * 60 + date.getMinutes();
  for (const t of TURNOS) {
    const ini = toMin(t.inicio);
    const fim = toMin(t.fim);
    if (ini < fim ? min >= ini && min < fim : min >= ini || min < fim) return t;
  }
  return TURNOS[2];
}

/** Minutos restantes até a troca de turno. */
export function minutosParaTroca(date: Date = new Date()): number {
  const t = turnoAtual(date);
  const min = date.getHours() * 60 + date.getMinutes();
  const fim = toMin(t.fim);
  return fim > min ? fim - min : 1440 - min + fim;
}