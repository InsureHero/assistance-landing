import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/risk-items?email=... — Obtiene risk items por email (Authorization: Bearer requerido).
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const email = searchParams.get("email");
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace("Bearer ", "");

  if (!email) {
    return NextResponse.json({ error: "Email es requerido" }, { status: 400 });
  }

  if (!token) {
    return NextResponse.json({ error: "Token de autorización requerido" }, { status: 401 });
  }

  try {
    const { getRiskItemsByEmail } = await import("@/services/risk_item.service");
    const riskItems = await getRiskItemsByEmail(email, token);
    return NextResponse.json({ data: riskItems });
  } catch (error: unknown) {
    const err = error as Error & { status?: number };
    const status = err?.status === 401 ? 401 : 500;
    const errorMessage = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[api/risk-items]", errorMessage);
    }
    return NextResponse.json(
      { error: status === 401 ? "Token expirado o inválido" : "Error al obtener risk items", detail: errorMessage },
      { status }
    );
  }
}
