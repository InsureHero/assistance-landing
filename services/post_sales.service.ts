/**
 * Servicio para integraciones post-venta (POST /api/integrations/post-sales).
 * Se usa después de guardar beneficiarios (PUT beneficiaries) para sincronizar
 * con el sistema de post-sales. Cada beneficiario lleva action: "create" | "edit".
 */

import { getStoredAccessToken } from "./auth.service";
import type { RiskItem } from "./risk_item.service";
import type { BeneficiaryPayload } from "./risk_item.service";
import { toIsoDate } from "@/lib/dates";

/**
 * URL base del API de integraciones post-venta.
 * Usa NEXT_PUBLIC_API_BASE_URL (disponible en cliente y servidor).
 */
export function getPostSalesBaseUrl(): string {
  const url =
    process.env.NEXT_PUBLIC_API_BASE_URL ?? process.env.NEXT_API_BASE_URL ?? "";
  const trimmed = String(url).trim();
  return trimmed === "" ? "" : trimmed.replace(/\/$/, "");
}

/** Channel ID para el body de post-sales (variable de entorno). */
export function getPostSalesChannelId(): string | null {
  const raw =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POST_SALES_CHANNEL_ID ?? ""
      : "";
  const t = String(raw ?? "").trim();
  return t === "" ? null : t;
}

export type PostSalesBeneficiaryAction = "create" | "edit";

/** Beneficiario para el body de POST post-sales (camelCase como en el curl). */
export interface PostSalesBeneficiary {
  name: string;
  lastname: string;
  email?: string;
  isHolder: boolean;
  dateOfBirth: string;
  fiscalType: string;
  fiscalId: string;
  mobilePrefix?: string;
  phone?: string;
  action: PostSalesBeneficiaryAction;
}

/** Body del POST /api/integrations/post-sales. Incluye risk_item completo si se proporciona. */
export interface PostSalesRequestBody {
  channel_id: string;
  risk_item_id: string;
  beneficiaries: PostSalesBeneficiary[];
  risk_item?: RiskItem;
}

/**
 * Convierte BeneficiaryPayload + action a PostSalesBeneficiary (camelCase para el API).
 */
export function toPostSalesBeneficiary(
  p: BeneficiaryPayload,
  action: PostSalesBeneficiaryAction
): PostSalesBeneficiary {
  const dateOfBirth = toIsoDate(p.dateOfBirth);
  const out: PostSalesBeneficiary = {
    name: (p.name ?? "").trim(),
    lastname: (p.lastname ?? "").trim(),
    isHolder: p.isHolder,
    dateOfBirth,
    fiscalType: (p.fiscalType ?? "1004").trim(),
    fiscalId: (p.fiscalId ?? "").trim(),
    action,
  };
  if (p.email != null && String(p.email).trim() !== "") out.email = String(p.email).trim();
  if (p.mobilePrefix != null && String(p.mobilePrefix).trim() !== "") out.mobilePrefix = String(p.mobilePrefix).trim();
  if (p.phone != null && String(p.phone).trim() !== "") out.phone = String(p.phone).trim();
  return out;
}

/**
 * Envía los beneficiarios al API de integraciones post-venta.
 * Se debe llamar **después** de haber actualizado los beneficiarios del risk item (PUT beneficiaries).
 * Se envía el risk item completo y la action por cada beneficiario ("create" la primera vez, "edit" en siguientes sincronizaciones).
 * Utiliza el mismo token que se guarda en la confirmación de OTP (services/otp.service → auth.service setStoredAccessToken).
 * Si POST_SALES_API_URL o channel_id no están configurados, no se hace la petición.
 *
 * @param channelId - UUID del channel (usa getPostSalesChannelId() si no se pasa)
 * @param riskItemId - UUID del risk item
 * @param riskItem - Risk item completo (se envía en el body)
 * @param beneficiariesWithAction - Lista de beneficiarios con action "create" | "edit" por cada uno
 */
export async function postSalesSyncBeneficiaries(
  channelId: string,
  riskItemId: string,
  riskItem: RiskItem | null,
  beneficiariesWithAction: { payload: BeneficiaryPayload; action: PostSalesBeneficiaryAction }[]
): Promise<void> {
  const baseUrl = getPostSalesBaseUrl();
  if (!baseUrl) return;

  // Token guardado al confirmar OTP (verifyOtp → verifyPostventaOtp → setStoredAccessToken)
  const token = getStoredAccessToken();
  const body: PostSalesRequestBody = {
    channel_id: channelId,
    risk_item_id: riskItemId,
    beneficiaries: beneficiariesWithAction.map(({ payload, action }) =>
      toPostSalesBeneficiary(payload, action)
    ),
  };
  if (riskItem && Object.keys(riskItem).length > 0) {
    body.risk_item = riskItem;
  }

  const url = `${baseUrl}/api/integrations/post-sales`;

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(
      `Post-sales sync: ${response.status} ${response.statusText}. ${text}`
    );
  }
}
