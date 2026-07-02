import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/beneficiaries-limit?package_id=...&channel_id=...
 * Resuelve el tope de beneficiarios de un producto:
 *   1. packages.uid (slug) a partir de package_id.
 *   2. integrations(slug 'AMA').auth_config → canal por channel_id → contrato por package_uid → max_beneficiaries.
 * Respuesta: solo { max_beneficiaries: number }. Nunca expone auth_config ni otros campos.
 * Default seguro (sin límite efectivo) si no se encuentra package/canal/contrato o falta el campo.
 */
const DEFAULT_MAX_BENEFICIARIES = 100;

interface Contract {
  package_uid?: string;
  max_beneficiaries?: number;
}
interface Channel {
  channel_id?: string;
  contracts?: Contract[];
}
interface AuthConfig {
  channels?: Channel[];
}

export async function GET(request: NextRequest) {
  const packageId = request.nextUrl.searchParams.get("package_id");
  const channelId = request.nextUrl.searchParams.get("channel_id");
  if (!packageId || !channelId) {
    return NextResponse.json(
      { error: "package_id y channel_id son requeridos" },
      { status: 400 }
    );
  }

  // Igual que los demás handlers del landing: exigir presencia del Bearer.
  // La verificación criptográfica del JWT queda fuera de esta fase.
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "").trim();
  if (!token) {
    return NextResponse.json(
      { error: "Token de autorización requerido" },
      { status: 401 }
    );
  }

  try {
    const { getSupabaseServerClient } = await import("@/lib/supabase/server");
    const supabase = getSupabaseServerClient();

    // 1. Resolver slug del package.
    const { data: pkg, error: pkgError } = await supabase
      .from("packages")
      .select("uid")
      .eq("id", packageId)
      .single();

    if (pkgError) {
      // No encontrado → default seguro (200). PGRST116 = 0 filas.
      if (pkgError.code === "PGRST116") {
        return NextResponse.json({ max_beneficiaries: DEFAULT_MAX_BENEFICIARIES });
      }
      throw pkgError;
    }

    const packageUid = pkg?.uid as string | null | undefined;
    if (!packageUid) {
      return NextResponse.json({ max_beneficiaries: DEFAULT_MAX_BENEFICIARIES });
    }

    // 2. Leer el tope desde integrations (slug 'AMA').
    const { data: integration, error: intError } = await supabase
      .from("integrations")
      .select("auth_config")
      .eq("slug", "AMA")
      .single();

    if (intError) {
      if (intError.code === "PGRST116") {
        return NextResponse.json({ max_beneficiaries: DEFAULT_MAX_BENEFICIARIES });
      }
      throw intError;
    }

    // auth_config puede venir como string JSON o como objeto JSONB ya parseado.
    const rawConfig = integration?.auth_config;
    let authConfig: AuthConfig | null;
    if (typeof rawConfig === "string") {
      try {
        authConfig = JSON.parse(rawConfig) as AuthConfig;
      } catch {
        return NextResponse.json({ max_beneficiaries: DEFAULT_MAX_BENEFICIARIES });
      }
    } else {
      authConfig = (rawConfig as AuthConfig | null) ?? null;
    }

    // Filtrar primero por canal, luego por package_uid dentro de ese canal.
    const channel = authConfig?.channels?.find((c) => c.channel_id === channelId);
    const contract = channel?.contracts?.find((c) => c.package_uid === packageUid);

    const max =
      typeof contract?.max_beneficiaries === "number"
        ? contract.max_beneficiaries
        : DEFAULT_MAX_BENEFICIARIES;

    return NextResponse.json({ max_beneficiaries: max });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[beneficiaries-limit]", msg);
    }
    return NextResponse.json(
      { error: "Error al obtener el tope de beneficiarios" },
      { status: 500 }
    );
  }
}
