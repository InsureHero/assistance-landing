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

/** Beneficiario para el body de POST post-sales. */
export interface PostSalesBeneficiary {
  name: string;
  lastname: string;
  email?: string;
  isHolder: boolean;
  isTraveler?: boolean;
  dateOfBirth: string;
  fiscalType: string;
  fiscalId: string;
  documentCountry?: string;
  mobilePrefix?: string;
  phone?: string;
  source?: string;
  added_at?: string;
  action: PostSalesBeneficiaryAction;
}

/** risk_item con beneficiaries ya transformados (PostSalesBeneficiary con action en cada uno). */
export type RiskItemForPostSales = Omit<RiskItem, "beneficiaries"> & {
  beneficiaries: PostSalesBeneficiary[];
};

/** Body del POST /api/integrations/post-sales: risk item directo (con beneficiaries transformados dentro). */
export type PostSalesRequestBody = RiskItemForPostSales;

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
  if (p.isTraveler != null) out.isTraveler = p.isTraveler;
  if (p.documentCountry != null && String(p.documentCountry).trim() !== "") out.documentCountry = String(p.documentCountry).trim();
  if (p.mobilePrefix != null && String(p.mobilePrefix).trim() !== "") out.mobilePrefix = String(p.mobilePrefix).trim();
  if (p.phone != null && String(p.phone).trim() !== "") out.phone = String(p.phone).trim();
  if (p.source != null && String(p.source).trim() !== "") out.source = String(p.source).trim();
  if (p.added_at != null && String(p.added_at).trim() !== "") out.added_at = String(p.added_at).trim();
  return out;
}

/**
 * Envía al API de integraciones post-venta.
 * Se debe llamar **después** de haber actualizado los beneficiarios del risk item (PUT beneficiaries).
 * Body: risk item directo (sin wrapper); los beneficiaries se transforman con toPostSalesBeneficiary (action en cada uno).
 *
 * @param riskItem - Risk item completo (obligatorio)
 * @param beneficiariesWithAction - Lista de beneficiarios con action "create" | "edit" por cada uno
 */
export async function postSalesSyncBeneficiaries(
  riskItem: RiskItem,
  beneficiariesWithAction: { payload: BeneficiaryPayload; action: PostSalesBeneficiaryAction }[]
): Promise<void> {
  const baseUrl = getPostSalesBaseUrl();
  if (!baseUrl) return;

  const token = getStoredAccessToken();
  const beneficiaries = beneficiariesWithAction.map(({ payload, action }) =>
    toPostSalesBeneficiary(payload, action)
  );
  const riskItemForPostSales: RiskItemForPostSales = {
    ...riskItem,
    beneficiaries,
  };
  const body: PostSalesRequestBody = riskItemForPostSales;

  const url = `${baseUrl}/api/integrations/post-sales`;

  // Headers: Content-Type y Authorization. Origin lo envía el navegador en cross-origin;
  // el API (ej. localhost:3000) debe permitir CORS para el origen del landing (ej. localhost:3001).
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
