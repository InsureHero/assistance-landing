/**
 * Constantes para el paso AddTravelers (viajeros/beneficiarios).
 * Fuera del componente para mantener escalabilidad y buenas prácticas.
 */

/** Códigos ISO de países (documentCountry). */
export const COUNTRIES: { code: string; name: string }[] = [
  { code: "AR", name: "Argentina" },
  { code: "AU", name: "Australia" },
  { code: "BH", name: "Baréin" },
  { code: "BR", name: "Brasil" },
  { code: "CL", name: "Chile" },
  { code: "CO", name: "Colombia" },
  { code: "CR", name: "Costa Rica" },
  { code: "DO", name: "República Dominicana" },
  { code: "DZ", name: "Argelia" },
  { code: "AE", name: "Emiratos Árabes" },
  { code: "EC", name: "Ecuador" },
  { code: "EG", name: "Egipto" },
  { code: "ES", name: "España" },
  { code: "GR", name: "Grecia" },
  { code: "GT", name: "Guatemala" },
  { code: "HN", name: "Honduras" },
  { code: "ID", name: "Indonesia" },
  { code: "IE", name: "Irlanda" },
  { code: "IN", name: "India" },
  { code: "IT", name: "Italia" },
  { code: "JO", name: "Jordania" },
  { code: "KW", name: "Kuwait" },
  { code: "LB", name: "Líbano" },
  { code: "MT", name: "Malta" },
  { code: "MX", name: "México" },
  { code: "NI", name: "Nicaragua" },
  { code: "OM", name: "Omán" },
  { code: "PA", name: "Panamá" },
  { code: "PE", name: "Perú" },
  { code: "PH", name: "Filipinas" },
  { code: "PT", name: "Portugal" },
  { code: "PY", name: "Paraguay" },
  { code: "QA", name: "Qatar" },
  { code: "SA", name: "Arabia Saudita" },
  { code: "SV", name: "El Salvador" },
  { code: "SY", name: "Siria" },
  { code: "TN", name: "Túnez" },
  { code: "UY", name: "Uruguay" },
  { code: "VE", name: "Venezuela" },
  { code: "YE", name: "Yemen" },
];

/** Tipos fiscales para México (códigos según API). */
export const FISCAL_TYPES = [
  { value: "1004", label: "RFC (5)" },
  { value: "1005", label: "Cédula Valor Fiscal (6)" },
  { value: "2", label: "Pasaporte (2)" },
  { value: "1009", label: "Cédula de identidad (10)" },
  { value: "1", label: "Cédula (1)" },
];

export const SOURCE_LANDING = "IH_LANDING_BENEFICIARIES";

/** Máximo de beneficiarios permitidos por risk item. */
export const MAX_BENEFICIARIES = 10;
