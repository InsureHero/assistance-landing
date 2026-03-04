/**
 * Servicio para envío y verificación de OTP vía API postventa.
 * No usa API key ni channel: solo email y código.
 */

import { requestPostventaOtp, verifyPostventaOtp } from "./auth.service";

/** Solicita el envío del código OTP al email (API postventa). No requiere token. */
export async function sendOtp(email: string): Promise<void> {
  await requestPostventaOtp(email);
}

export type VerifyOtpResult =
  | { success: true; newToken: string }
  | { success: false; errorMessage: string };

/** Verifica el código OTP y devuelve el resultado. En éxito guarda el token de sesión. */
export async function verifyOtp(
  email: string,
  otpCode: string
): Promise<VerifyOtpResult> {
  try {
    const token = await verifyPostventaOtp(email, otpCode);
    return { success: true, newToken: token };
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Error al verificar el código";
    return { success: false, errorMessage: message };
  }
}
