const MS_PER_DAY = 24 * 60 * 60 * 1000;
const DAYS_PER_WEEK = 7;
const BASE_WEEK_MONDAY = "2026-02-23";
const BASE_EXPIRATION_DATE = "2026-08-10";
const WEEKDAY_PT_BR = [
  "Domingo",
  "Segunda",
  "Terça",
  "Quarta",
  "Quinta",
  "Sexta",
  "Sábado",
] as const;
const toUTCDate = (isoDate: string): Date => {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day));
};
const toISODate = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const addDaysISO = (isoDate: string, days: number): string => {
  const next = toUTCDate(isoDate);
  next.setUTCDate(next.getUTCDate() + days);
  return toISODate(next);
};
const startOfWeekMondayISO = (isoDate: string): string => {
  const date = toUTCDate(isoDate);
  const day = date.getUTCDay();
  const daysFromMonday = (day + 6) % 7;
  date.setUTCDate(date.getUTCDate() - daysFromMonday);
  return toISODate(date);
};
const dayDiff = (fromISO: string, toISO: string): number => {
  return Math.round((toUTCDate(toISO).getTime() - toUTCDate(fromISO).getTime()) / MS_PER_DAY);
};
export const getShelfLifeExpirationDate = (currentDateISO: string): string => {
  const currentWeekMonday = startOfWeekMondayISO(currentDateISO);
  const elapsedWeeks = Math.floor(dayDiff(BASE_WEEK_MONDAY, currentWeekMonday) / DAYS_PER_WEEK);
  return addDaysISO(BASE_EXPIRATION_DATE, elapsedWeeks * DAYS_PER_WEEK);
};
export const getCurrentDateInSaoPauloISO = (date: Date = new Date()): string => {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
};
const weekStart = BASE_WEEK_MONDAY;
const weekData = Array.from({ length: DAYS_PER_WEEK }, (_, dayOffset) => {
  const date = addDaysISO(weekStart, dayOffset);
  const dateObj = toUTCDate(date);
  const dayOfWeek = WEEKDAY_PT_BR[dateObj.getUTCDay()];
  const julianCode = `LS${String(54 + dayOffset)}`;
  const expirationDate = getShelfLifeExpirationDate(date);
  return {
    date,
    dayOfWeek,
    julianCode,
    expirationDate,
    daysUntilExpiration: dayDiff(date, expirationDate),
  };
});
export const ShelfLif = {
  description:
    "Tabela semanal de segunda a domingo (virada de validade na segunda às 00:00 de São Paulo)",
  currentDate: getCurrentDateInSaoPauloISO(),
  currentJulianCode: "LS59",
  baseExpiration: BASE_EXPIRATION_DATE,
  weekData,
} as const;
