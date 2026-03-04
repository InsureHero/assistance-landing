/**
 * Servicio para risk items y beneficiarios (API postventa).
 * Usa solo token de sesión postventa (Bearer). No usa API key ni channel.
 */

import {
  getStoredAccessToken,
  getBaseUrl,
  clearSessionAndNotify,
} from "./auth.service";
import { toIsoDate } from "@/lib/dates";

export interface InsuredSubject {
  identifier_type?: string;
  identifier_value?: string;
  firstName?: string;
  lastName?: string;
  maternalLastName?: string;
  phone?: string;
  email?: string;
  origin?: string;
  destination?: string;
  weeksPurchased?: number;
  totalCost?: number;
  reservationId?: string;
  tripStartDate?: string;
  tripEndDate?: string;
  language?: string;
}

export interface BeneficiaryOrClaimant {
  firstName?: string;
  lastName?: string;
  maternalLastName?: string;
  phone?: string;
  email?: string;
  name?: string;
  document_number?: string;
  isHolder?: boolean;
  isTraveler?: boolean;
  date_of_birth?: string;
  fiscal_type?: string;
  fiscal_id?: string;
  document_country?: string;
  mobile_prefix?: string;
  source?: string;
  added_at?: string;
}

export interface RiskItem {
  id?: string;
  uid?: string;
  package_id?: string;
  package_uid?: string;
  policy_id?: string;
  policy_uid?: string;
  status?: string;
  start_date?: string;
  end_date?: string;
  insured_subject?: InsuredSubject;
  beneficiaries?: BeneficiaryOrClaimant[];
  authorized_claimants?: BeneficiaryOrClaimant[];
  metadata?: Record<string, unknown>;
  assets?: unknown[];
}

/**
 * GET risk items del usuario autenticado (todos los canales).
 * GET /api/postventa/v1/me/risk-items
 * Headers: Authorization: Bearer {token postventa}. No requiere email en URL ni x-api-key.
 */
export async function getRiskItemsByEmail(
  _email: string,
  accessToken?: string
): Promise<RiskItem[]> {
  const token = accessToken ?? getStoredAccessToken();
  if (!token)
    throw new Error("No hay token de sesión. Inicia sesión nuevamente.");

  const baseUrl = getBaseUrl();
  const url = `${baseUrl || ""}/api/postventa/v1/me/risk-items`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      authorization: `Bearer ${token}`,
    },
  });

  const responseText = await response.text();

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSessionAndNotify();
    }
    const err = new Error(
      `Error al obtener risk items: ${response.status} ${response.statusText}. ${responseText}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  let body: {
    data?: RiskItem[];
    Data?: RiskItem[];
    riskItems?: RiskItem[];
    items?: RiskItem[];
  };
  try {
    body = JSON.parse(responseText) as typeof body;
  } catch (error: unknown) {
    throw new Error(
      `Error al parsear respuesta: ${error instanceof Error ? error.message : String(error)}`
    );
  }

  const dataArray = body?.data ?? body?.Data;
  if (Array.isArray(dataArray)) return dataArray;
  if (Array.isArray(body)) return body;
  if (body?.riskItems) return body.riskItems;
  if (body?.items) return body.items;
  return [];
}

export interface BeneficiaryPayload {
  name: string;
  lastname: string;
  email?: string;
  isHolder: boolean;
  isTraveler: boolean;
  dateOfBirth: string;
  fiscalType: string;
  fiscalId: string;
  documentCountry: string;
  mobilePrefix?: string;
  phone?: string;
  source: string;
  added_at: string;
}

/** Convierte un beneficiario a formato snake_case para el API postventa. */
function beneficiaryPayloadToApiFormat(p: BeneficiaryPayload): Record<string, unknown> {
  const dateOfBirth = toIsoDate(p.dateOfBirth);
  const out: Record<string, unknown> = {
    name: p.name?.trim() ?? "",
    lastname: p.lastname?.trim() ?? "",
    is_holder: p.isHolder,
    is_traveler: p.isTraveler,
    date_of_birth: dateOfBirth,
    fiscal_type: p.fiscalType?.trim() ?? "1004",
    fiscal_id: (p.fiscalId ?? "").trim(),
    document_country: (p.documentCountry ?? "").trim(),
    source: (p.source ?? "").trim(),
    added_at: (p.added_at ?? "").trim(),
  };
  if (p.email != null && String(p.email).trim() !== "") out.email = String(p.email).trim();
  if (p.mobilePrefix != null && String(p.mobilePrefix).trim() !== "") out.mobile_prefix = String(p.mobilePrefix).trim();
  if (p.phone != null && String(p.phone).trim() !== "") out.phone = String(p.phone).trim();
  return out;
}

/**
 * Envía la lista completa de beneficiarios (API postventa).
 * PUT /api/postventa/v1/risk-items/{riskItemId}/beneficiaries
 * Body en snake_case (date_of_birth, fiscal_type, is_holder, etc.).
 */
export async function putBeneficiaries(
  riskItemId: string,
  beneficiaries: BeneficiaryPayload[]
): Promise<void> {
  const accessToken = getStoredAccessToken();
  if (!accessToken)
    throw new Error("No hay token de sesión. Inicia sesión nuevamente.");

  const baseUrl = getBaseUrl();
  const url = `${baseUrl || ""}/api/postventa/v1/risk-items/${encodeURIComponent(riskItemId)}/beneficiaries`;

  const body = {
    beneficiaries: beneficiaries.map(beneficiaryPayloadToApiFormat),
  };

  const response = await fetch(url, {
    method: "PUT",
    headers: {
      authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSessionAndNotify();
    }
    const text = await response.text();
    const err = new Error(
      `Error al guardar beneficiarios: ${response.status} ${response.statusText}. ${text}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }
}

/**
 * PATCH beneficiarios: delega en putBeneficiaries (reemplazo completo).
 */
export async function patchBeneficiaries(
  riskItemId: string,
  beneficiaries: BeneficiaryPayload[]
): Promise<void> {
  return putBeneficiaries(riskItemId, beneficiaries);
}

/** Sub-objeto de metadata: aceptación de política de privacidad. */
export interface PrivacyPolicyMetadata {
  client_ip: string;
  date: string;
  policy_privacy: boolean;
}

/** Metadata del risk item puede tener varios sub-JSON. Ej: { privacy_policy: { client_ip, date, policy_privacy } }. */
export interface RiskItemMetadataUpdate {
  privacy_policy?: Partial<PrivacyPolicyMetadata>;
  [key: string]: unknown;
}

/**
 * Actualiza el metadata del risk item (ej. privacy_policy con client_ip, date, policy_privacy).
 * Desde el navegador usa el proxy /api/risk-items/[id]/metadata (mismo origen, sin CORS).
 * El proxy en el servidor reenvía al backend postventa.
 */
export async function patchRiskItemMetadata(
  riskItemId: string,
  metadata: RiskItemMetadataUpdate
): Promise<void> {
  const accessToken = getStoredAccessToken();
  if (!accessToken)
    throw new Error("No hay token de sesión. Inicia sesión nuevamente.");

  const url =
    typeof window !== "undefined"
      ? `/api/risk-items/${encodeURIComponent(riskItemId)}/metadata`
      : `${getBaseUrl() || ""}/api/postventa/v1/risk-items/${encodeURIComponent(riskItemId)}`;

  const headers: HeadersInit = {
    authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };

  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ metadata }),
  });

  if (!response.ok) {
    if (response.status === 401 && typeof window !== "undefined") {
      clearSessionAndNotify();
    }
    const text = await response.text();
    let detail = text;
    try {
      const j = JSON.parse(text) as { detail?: string };
      detail = j.detail ?? text;
    } catch {
      // usar text tal cual
    }
    throw new Error(
      `Error al actualizar metadata: ${response.status} ${response.statusText}. ${detail}`
    );
  }
}
