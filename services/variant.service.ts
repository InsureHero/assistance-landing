/**
 * Servicio para variantes de un risk item (API postventa).
 * Usa solo token de sesión postventa (Bearer). No usa API key ni channel.
 */

import {
  getStoredAccessToken,
  getBaseUrl,
  clearSessionAndNotify,
} from "./auth.service";

export interface Variant {
  id?: string;
  uid?: string;
  name?: string;
  description?: string | null;
  coverage_id?: string;
  channel_id?: string;
  conditions?: string;
  exclusions?: string;
  subject_schema?: unknown;
  claim_schema?: unknown;
}

/**
 * GET variantes por risk item id.
 * GET /api/postventa/v1/risk-items/{riskItemId}/variants
 * Headers: Authorization: Bearer {token postventa}.
 */
export async function getVariantsByRiskItemId(
  riskItemId: string,
  accessToken?: string
): Promise<Variant[]> {
  const token = accessToken ?? getStoredAccessToken();
  if (!token)
    throw new Error("No hay token de sesión. Inicia sesión nuevamente.");

  const baseUrl = getBaseUrl();
  const url = `${baseUrl || ""}/api/postventa/v1/risk-items/${encodeURIComponent(riskItemId)}/variants`;

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
    console.error("[Variants] Error respuesta:", response.status, responseText);
    const err = new Error(
      `Error al obtener variantes: ${response.status} ${response.statusText}. ${responseText}`
    ) as Error & { status?: number };
    err.status = response.status;
    throw err;
  }

  let body: {
    data?: Variant[];
    Data?: Variant[];
    variants?: Variant[];
    items?: Variant[];
  };
  try {
    body = JSON.parse(responseText) as typeof body;
  } catch (e) {
    throw new Error(
      `Error al parsear respuesta: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const dataArray = body?.data ?? body?.Data;
  if (Array.isArray(dataArray)) return dataArray;
  if (Array.isArray(body)) return body;
  if (body?.variants) return body.variants;
  if (body?.items) return body.items;
  return [];
}
