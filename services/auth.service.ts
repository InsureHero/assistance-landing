/**
 * Servicio de autenticación para el landing postventa.
 * Usa la API postventa (OTP por email → token JWT). No depende de API key ni channel.
 * Token de sesión: memoria + sessionStorage.
 */

const STORAGE_KEY = "shield_access_token";
let globalAccessToken: string | null = null;

/** Keys para persistir el flujo de reserva (paso, email, riskItem, travelers) */
export const BOOKING_STORAGE_KEYS = {
  step: "booking_step",
  email: "booking_email",
  riskItem: "booking_risk_item",
  travelers: "booking_travelers",
} as const;

/** Evento que se dispara cuando la sesión OTP expira (401 o token JWT expirado) */
export const SESSION_EXPIRED_EVENT = "auth:session-expired";

/**
 * URL base de la API postventa (InsureHero).
 * Debe apuntar al backend donde corre la API postventa (ej. http://localhost:3000).
 * En cliente y servidor se usa NEXT_PUBLIC_POSTVENTA_API_URL o NEXT_PUBLIC_API_BASE_URL.
 */
export function getBaseUrl(): string {
  const url =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POSTVENTA_API_URL ??
        process.env.NEXT_PUBLIC_API_BASE_URL ??
        ""
      : "";
  const trimmed = String(url).trim();
  return trimmed === "" ? "" : trimmed.replace(/\/$/, "");
}

export function getStoredAccessToken(): string | null {
  if (globalAccessToken) return globalAccessToken;
  if (typeof sessionStorage === "undefined") return null;
  const fromStorage = sessionStorage.getItem(STORAGE_KEY);
  if (fromStorage) globalAccessToken = fromStorage;
  return fromStorage;
}

export function setStoredAccessToken(token: string): void {
  globalAccessToken = token;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.setItem(STORAGE_KEY, token);
  }
}

export function clearStoredAccessToken(): void {
  globalAccessToken = null;
  if (typeof sessionStorage !== "undefined") {
    sessionStorage.removeItem(STORAGE_KEY);
  }
}

export function isTokenExpired(token: string | null): boolean {
  if (!token || typeof token !== "string" || token.length < 10) return true;
  const parts = token.trim().split(".");
  if (parts.length !== 3) return false;
  try {
    const base64url = parts[1];
    const base64 = base64url.replace(/-/g, "+").replace(/_/g, "/");
    const decoded =
      typeof Buffer !== "undefined"
        ? Buffer.from(base64, "base64").toString("utf8")
        : atob(base64);
    const parsed = JSON.parse(decoded) as { exp?: number };
    const exp = parsed?.exp;
    if (typeof exp !== "number") return false;
    const nowSec = Math.floor(Date.now() / 1000);
    return nowSec >= exp;
  } catch {
    return false;
  }
}

export function clearBookingSession(): void {
  if (typeof sessionStorage === "undefined") return;
  Object.values(BOOKING_STORAGE_KEYS).forEach((key) =>
    sessionStorage.removeItem(key)
  );
}

export function clearSessionAndNotify(): void {
  clearStoredAccessToken();
  clearBookingSession();
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
  }
}

export function invalidateSessionQuietly(): void {
  clearStoredAccessToken();
  clearBookingSession();
}

/**
 * Solicita el envío de OTP al email (API postventa). No requiere token.
 */
export async function requestPostventaOtp(email: string): Promise<void> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl || ""}/api/postventa/v1/auth/otp/request`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.trim().toLowerCase() }),
  });
  if (!response.ok) {
    const text = await response.text();
    let msg = text;
    try {
      const j = JSON.parse(text) as { data?: { message?: string }; details?: string };
      msg = j.data?.message ?? j.details ?? text;
    } catch {
      // usar text tal cual
    }
    throw new Error(msg ? `Error al solicitar código: ${msg}` : `Error al solicitar código: ${response.status} ${response.statusText}`);
  }
}

/**
 * Verifica el OTP y devuelve el token de sesión postventa. Guarda el token en almacenamiento.
 */
export async function verifyPostventaOtp(
  email: string,
  otpCode: string
): Promise<string> {
  const baseUrl = getBaseUrl();
  const url = `${baseUrl || ""}/api/postventa/v1/auth/otp/verify`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      email: email.trim().toLowerCase(),
      otp: otpCode.replace(/\D/g, "").slice(0, 6),
    }),
  });
  const text = await response.text();
  let data: { data?: { message?: string; accessToken?: string }; error?: string } = {};
  if (text.trim()) {
    try {
      data = JSON.parse(text) as typeof data;
    } catch {
      // ignore
    }
  }
  if (!response.ok) {
    const msg =
      data.data?.message ??
      (data as { details?: string }).details ??
      data.error ??
      (response.status === 400
        ? "El código es incorrecto o ha expirado. Verifica el código e intenta de nuevo."
        : response.status === 401
          ? "El código ha expirado. Solicita un nuevo código."
          : response.status === 404
            ? "No encontramos una solicitud de código para este correo. Solicita un nuevo código."
            : response.statusText);
    throw new Error(msg || "Error al verificar el código");
  }
  // API postventa devuelve solo { data: { accessToken: string } }. No usar data.message como token.
  const token = data.data?.accessToken;
  if (typeof token !== "string") {
    throw new Error("No se recibió el token de sesión");
  }
  setStoredAccessToken(token);
  return token;
}
