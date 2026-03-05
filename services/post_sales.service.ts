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
 * Usa NEXT_PUBLIC_API_BASE_URL. La ruta completa es: {baseUrl}/api/integrations/post-sales
 */
export function getPostSalesBaseUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  const trimmed = String(url).trim();
  return trimmed === "" ? "" : trimmed.replace(/\/$/, "");
}

export type PostSalesBeneficiaryAction = "create" | "edit";

/** Beneficiario para el body de POST post-sales (solo campos necesarios). */
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

/** Body del POST /api/integrations/post-sales (solo lo necesario). */
export interface PostSalesRequestBody {
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
 * Usa el token guardado en sesión (OTP). Si no hay base URL configurada, no se hace la petición.
 *
 * @param riskItemId - UUID del risk item
 * @param riskItem - Risk item completo (opcional, se envía en el body si se proporciona)
 * @param beneficiariesWithAction - Lista de beneficiarios con action "create" | "edit" por cada uno
 */
export async function postSalesSyncBeneficiaries(
  riskItemId: string,
  riskItem: RiskItem | null,
  beneficiariesWithAction: { payload: BeneficiaryPayload; action: PostSalesBeneficiaryAction }[]
): Promise<void> {
  const baseUrl = getPostSalesBaseUrl();
  if (!baseUrl) return;

  const token = getStoredAccessToken();
  const body: PostSalesRequestBody = {
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
