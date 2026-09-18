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

/**
 * Parsea una fecha "solo fecha" (YYYY-MM-DD, con o sin hora) como fecha LOCAL.
 * Evita el off-by-one de `new Date("2026-09-20")`, que se interpreta como UTC
 * y retrocede un día en zonas horarias negativas (UTC-).
 * Retorna null si no es parseable.
 */
export function parseDateOnly(s: string | undefined): Date | null {
  const m = (s ?? "").slice(0, 10).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const [, y, mo, d] = m;
  const date = new Date(Number(y), Number(mo) - 1, Number(d));
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Formatea una fecha "solo fecha" a texto legible según idioma ("es" | "en").
 * Usa la fecha local (parseDateOnly), así el día mostrado nunca cambia por TZ.
 */
export function formatDateOnly(s: string | undefined, locale: string): string {
  const date = parseDateOnly(s);
  if (!date) return s ?? "—";
  return date.toLocaleDateString(locale === "es" ? "es-MX" : "en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
