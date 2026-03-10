/**
 * Utilidades puras para el paso AddTravelers (conversión, validación, formato).
 * Fuera del componente para mantener escalabilidad y buenas prácticas.
 */

import type { Traveler } from "@/components/BookingFlow";
import type { RiskItem } from "@/services/risk_item.service";
import type { BeneficiaryPayload, BeneficiaryOrClaimant } from "@/services/risk_item.service";
import { SOURCE_LANDING } from "@/lib/addTravelersConstants";

/** Key para recordar si ya sincronizamos este risk item con post-sales (primera vez = create, siguientes = edit). */
export function getPostSalesSyncedKey(riskItemId: string): string {
  return `post_sales_synced_${riskItemId}`;
}

/** Indica si en metadata.privacy_policy el campo policy_privacy está aceptado (true). */
export function isPolicyPrivacyAccepted(metadata: RiskItem["metadata"]): boolean {
  const privacyPolicy = metadata?.privacy_policy;
  if (!privacyPolicy || typeof privacyPolicy !== "object" || !("policy_privacy" in privacyPolicy))
    return false;
  const value = (privacyPolicy as { policy_privacy?: unknown }).policy_privacy;
  return value === true || (typeof value === "string" && value.toLowerCase() === "true");
}

/** Crea un traveler vacío. Para nuevo viajero desde el landing usar createEmptyTraveler(false) → isTraveler: true, isHolder: false. */
export function createEmptyTraveler(isHolder: boolean): Traveler {
  return {
    name: "",
    lastname: "",
    email: "",
    isHolder,
    isTraveler: !isHolder,
    dateOfBirth: "",
    fiscalType: "1004",
    fiscalId: "",
    documentCountry: "",
    mobilePrefix: "",
    phone: "",
  };
}

export function getAge(dateOfBirth: string): number | null {
  if (!dateOfBirth) return null;
  const birth = new Date(dateOfBirth);
  if (Number.isNaN(birth.getTime())) return null;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const m = today.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < birth.getDate())) age--;
  return age;
}

export function isMinor(dateOfBirth: string): boolean {
  const age = getAge(dateOfBirth);
  return age !== null && age < 18;
}

/**
 * Valida si un traveler tiene todos los datos obligatorios completos.
 * Email, mobilePrefix y phone son obligatorios solo cuando isHolder: true.
 */
export function isTravelerComplete(traveler: Traveler): boolean {
  if (!traveler.name?.trim() || !traveler.lastname?.trim()) return false;
  if (!traveler.dateOfBirth?.trim()) return false;
  if (!traveler.fiscalType?.trim() || !traveler.fiscalId?.trim()) return false;
  if (!traveler.documentCountry?.trim()) return false;
  if (traveler.isHolder) {
    if (!traveler.email?.trim() || !traveler.mobilePrefix?.trim() || !traveler.phone?.trim()) return false;
  }
  return true;
}

/** Formatea fecha YYYY-MM-DD para mostrar en la card (ej. 1987-09-19 → 19/09/1987). */
export function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return "";
  const d = new Date(isoDate + "T12:00:00");
  if (Number.isNaN(d.getTime())) return isoDate;
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Lee un valor del objeto API que puede venir en snake_case o camelCase. */
function fromApi<T = string>(raw: Record<string, unknown>, snake: string, camel: string): T | undefined {
  const v = raw[snake] ?? raw[camel];
  return v as T | undefined;
}

/** Convierte BeneficiaryOrClaimant del API a Traveler para la UI. Acepta snake_case y camelCase. El primer beneficiario es holder. */
export function beneficiaryToTraveler(beneficiary: BeneficiaryOrClaimant, index: number): Traveler {
  const b = beneficiary as Record<string, unknown>;
  const isHolder = index === 0;

  const firstName = (fromApi<string>(b, "first_name", "firstName") ?? beneficiary.firstName ?? "").trim();
  const lastName = (fromApi<string>(b, "last_name", "lastName") ?? (b.lastname as string) ?? beneficiary.lastName ?? "").trim();
  const fullName = (beneficiary.name ?? "").trim();
  const parts = fullName.split(/\s+/).filter(Boolean);
  const name = firstName || parts[0] || "";
  const lastname = lastName || (parts.length > 1 ? parts.slice(1).join(" ") : "");

  const dateOfBirth = (fromApi<string>(b, "date_of_birth", "dateOfBirth") ?? beneficiary.date_of_birth ?? "").trim();
  const documentCountry = (fromApi<string>(b, "document_country", "documentCountry") ?? beneficiary.document_country ?? "").trim();
  const fiscalType = (fromApi<string>(b, "fiscal_type", "fiscalType") ?? beneficiary.fiscal_type ?? "1004").trim() || "1004";
  const fiscalId = (fromApi<string>(b, "fiscal_id", "fiscalId") ?? beneficiary.fiscal_id ?? beneficiary.document_number ?? "").trim();
  const email = (beneficiary.email ?? (b.email as string) ?? "").trim();
  const mobilePrefix = (fromApi<string>(b, "mobile_prefix", "mobilePrefix") ?? beneficiary.mobile_prefix ?? "").trim();
  const phone = (beneficiary.phone ?? (b.phone as string) ?? "").trim();
  const source = beneficiary.source ?? (b.source as string);
  const added_at = beneficiary.added_at ?? (b.added_at as string);
  const insuredId = (beneficiary as { insuredId?: string }).insuredId ?? (b.insured_id as string);
  const isTravelerRaw = fromApi<boolean>(b, "is_traveler", "isTraveler") ?? beneficiary.isTraveler;
  const isTraveler = typeof isTravelerRaw === "boolean" ? isTravelerRaw : !isHolder;

  return {
    name,
    lastname,
    email,
    isHolder,
    isTraveler,
    dateOfBirth,
    fiscalType,
    fiscalId,
    documentCountry,
    mobilePrefix,
    phone,
    source,
    added_at,
    insuredId,
    existingFromRiskItem: true,
  };
}

/** Convierte Traveler de la UI a BeneficiaryPayload para el API. Holder: no modificar source ni added_at. Resto: SOURCE_LANDING y added_at. */
export function travelerToBeneficiaryPayload(traveler: Traveler): BeneficiaryPayload {
  const source = traveler.isHolder
    ? (traveler.source ?? "")
    : (traveler.source ?? SOURCE_LANDING);
  const added_at = traveler.isHolder
    ? (traveler.added_at ?? "")
    : (traveler.added_at ?? new Date().toISOString());
  return {
    name: traveler.name,
    lastname: traveler.lastname,
    email: traveler.email || undefined,
    isHolder: traveler.isHolder,
    isTraveler: traveler.isTraveler,
    dateOfBirth: traveler.dateOfBirth,
    fiscalType: traveler.fiscalType,
    fiscalId: traveler.fiscalId,
    documentCountry: traveler.documentCountry,
    mobilePrefix: traveler.mobilePrefix || undefined,
    phone: traveler.phone || undefined,
    source,
    added_at,
    insuredId: traveler.insuredId,
  };
}
