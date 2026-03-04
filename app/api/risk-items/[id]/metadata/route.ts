import { NextRequest, NextResponse } from "next/server";

/**
 * PATCH /api/risk-items/[id]/metadata
 * Proxy para actualizar metadata del risk item en el backend postventa.
 * El cliente envía { metadata: { privacy_policy: { client_ip, date, policy_privacy }, ... } } y el token en Authorization.
 * Evita CORS y permite ver la respuesta del backend en el servidor.
 */
export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id: riskItemId } = await context.params;
  const authHeader = request.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer\s+/i, "");

  if (!token) {
    return NextResponse.json(
      { error: "Token de autorización requerido" },
      { status: 401 }
    );
  }

  let body: { metadata?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Body JSON inválido" },
      { status: 400 }
    );
  }

  if (!body.metadata || typeof body.metadata !== "object") {
    return NextResponse.json(
      { error: "Se requiere body.metadata (objeto)" },
      { status: 400 }
    );
  }

  const baseUrl = (process.env.NEXT_API_BASE_URL ?? "").replace(/\/$/, "");

  if (!baseUrl) {
    if (process.env.NODE_ENV !== "production") {
      console.error("[metadata] NEXT_API_BASE_URL no está definida");
    }
    return NextResponse.json(
      { error: "API postventa no configurada (NEXT_API_BASE_URL)" },
      { status: 502 }
    );
  }

  const url = `${baseUrl}/api/postsales/v1/risk-items/${encodeURIComponent(riskItemId)}`;

  try {
    const res = await fetch(url, {
      method: "PATCH",
      headers: {
        authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ metadata: body.metadata }),
    });

    const text = await res.text();

    if (!res.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("[metadata] Backend respondió:", res.status, text);
      }
      return NextResponse.json(
        { error: "Error al actualizar metadata en el backend", detail: text },
        { status: res.status }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    if (process.env.NODE_ENV !== "production") {
      console.error("[metadata] Error llamando al backend:", msg);
    }
    return NextResponse.json(
      { error: "No se pudo conectar con el backend", detail: msg },
      { status: 502 }
    );
  }
}
