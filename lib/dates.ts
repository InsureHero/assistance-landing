/**
 * Utilidades de fechas compartidas (DD/MM/YYYY ↔ YYYY-MM-DD).
 * Usado por risk_item.service y post_sales.service.
 */

/**
 * Convierte fecha DD/MM/YYYY a YYYY-MM-DD. Si ya está en formato ISO (YYYY-MM-DD), la devuelve tal cual.
 */
export function toIsoDate(value: string): string {
  const s = (value ?? "").trim();
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const ddmmyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m = s.match(ddmmyy);
  if (m) {
    const [, d, month, year] = m;
    const day = d ?? "";
    const mon = month ?? "";
    return `${year}-${mon.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }
  return s;
}
