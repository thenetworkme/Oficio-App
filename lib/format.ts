import { format as dfFormat } from "date-fns";
import { es } from "date-fns/locale";

/** Groups an integer's digits with '.' every 3 digits, e.g. 1284 -> "1.284". */
function groupThousands(intStr: string): string {
  const negative = intStr.startsWith("-");
  const digits = negative ? intStr.slice(1) : intStr;
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return negative ? `-${grouped}` : grouped;
}

/** 1284 -> "1.284" (thousands separated with '.') */
export function formatInt(value: number): string {
  const rounded = Math.round(value);
  return groupThousands(String(rounded));
}

/** 12.84 -> "12,8" (one decimal, comma as separator); whole numbers drop the decimal. */
export function formatDecimal(value: number, decimals = 1): string {
  const rounded = Math.round(value * 10 ** decimals) / 10 ** decimals;
  const [intPart, decPart] = rounded.toFixed(decimals).split(".");
  const intFormatted = groupThousands(intPart);
  if (!decPart || Number(decPart) === 0) return intFormatted;
  return `${intFormatted},${decPart}`;
}

/** 12.8 -> "12,8 %" */
export function formatPercent(value: number, decimals = 1): string {
  return `${formatDecimal(value, decimals)} %`;
}

/** 95 -> "1h 35m"; 0 -> "0m" */
export function formatMinutes(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r}m`;
  if (r === 0) return `${h}h`;
  return `${h}h ${String(r).padStart(2, "0")}m`;
}

/** 95 -> "1 h 35 min" (longer form used in forms) */
export function formatMinutesLong(totalMinutes: number): string {
  const m = Math.max(0, Math.round(totalMinutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h === 0) return `${r} min`;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

/** 2026-04-22 -> "22 de abril de 2026" */
export function formatDateEs(date: Date): string {
  return dfFormat(date, "d 'de' MMMM 'de' yyyy", { locale: es });
}

/** 2025-03-01 -> "marzo de 2025" */
export function formatMonthYearEs(date: Date): string {
  return dfFormat(date, "MMMM 'de' yyyy", { locale: es });
}

/** short weekday + day, e.g. "Vie 9 oct" */
export function formatShortDateEs(date: Date): string {
  return dfFormat(date, "EEE d MMM", { locale: es }).replace(".", "");
}

export function formatTimeEs(date: Date): string {
  return dfFormat(date, "h:mm a", { locale: es }).toLowerCase();
}
