/**
 * Servicio para integraciones post-venta (POST /api/integrations/post-sales).
 * Se usa después de guardar beneficiarios (PUT beneficiaries) para sincronizar
 * con el sistema de post-sales. Cada beneficiario lleva action: "create" | "edit".
 */

import { getStoredAccessToken } from "./auth.service";
import type { RiskItem } from "./risk_item.service";
import type { BeneficiaryPayload } from "./risk_item.service";

/** Fecha DD/MM/YYYY o YYYY-MM-DD a YYYY-MM-DD para el API post-sales. */
function toIsoDateSafe(value: string): string {
  const s = (value ?? "").trim();
  if (!s) return s;
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s;
  const ddmmyy = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/;
  const m = s.match(ddmmyy);
  if (m) {
    const [, d, month, year] = m;
    return `${year}-${month!.padStart(2, "0")}-${d!.padStart(2, "0")}`;
  }
  return s;
}

/** URL base del API de integraciones post-venta (variable de entorno). */
export function getPostSalesBaseUrl(): string {
  const url =
    typeof process !== "undefined"
      ? process.env.NEXT_PUBLIC_POST_SALES_API_URL ?? ""
      : "";
  const trimmed = String(url ?? "").trim();
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
  const dateOfBirth = toIsoDateSafe(p.dateOfBirth);
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
 * Se debe llamar después de PUT beneficiaries (postventa).
 * Si POST_SALES_API_URL o channel_id no están configurados, no se hace la petición.
 *
 * @param channelId - UUID del channel (usa getPostSalesChannelId() si no se pasa)
 * @param riskItemId - UUID del risk item
 * @param riskItem - Risk item completo (opcional, para enviar en el body si el API lo acepta)
 * @param beneficiariesWithAction - Lista de beneficiarios con action "create" | "edit"
 */
export async function postSalesSyncBeneficiaries(
  channelId: string,
  riskItemId: string,
  riskItem: RiskItem | null,
  beneficiariesWithAction: { payload: BeneficiaryPayload; action: PostSalesBeneficiaryAction }[]
): Promise<void> {
  const baseUrl = getPostSalesBaseUrl();
  if (!baseUrl) return;

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
