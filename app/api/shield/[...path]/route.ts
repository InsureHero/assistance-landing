import { NextRequest, NextResponse } from "next/server";

const HEADERS_TO_FORWARD = [
  "x-api-key",
  "authorization",
  "content-type",
  "x-channel-id",
];

/**
 * Proxy de /api/shield/* al backend Shield.
 * Evita CORS y "Failed to fetch" haciendo que el cliente llame al mismo origen.
 * Usa NEXT_API_BASE_URL como URL base del backend (ej. http://localhost:8080).
 */
export async function GET(request: NextRequest) {
  return proxy(request);
}

export async function POST(request: NextRequest) {
  return proxy(request);
}

export async function PATCH(request: NextRequest) {
  return proxy(request);
}

export async function PUT(request: NextRequest) {
  return proxy(request);
}

async function proxy(request: NextRequest) {
  const baseUrl = process.env.NEXT_API_BASE_URL?.trim();
  if (!baseUrl) {
    return NextResponse.json(
      {
        error:
          "NEXT_API_BASE_URL no está definida. Configúrala en .env.local con la URL del backend Shield (ej. http://localhost:8080).",
      },
      { status: 502 }
    );
  }

  const pathname = request.nextUrl.pathname;
  const search = request.nextUrl.search;
  const targetUrl = `${baseUrl.replace(/\/$/, "")}${pathname}${search}`;

  const headers = new Headers();
  for (const name of HEADERS_TO_FORWARD) {
    const raw = request.headers.get(name);
    if (raw != null && raw !== "") {
      const value = name === "x-channel-id" ? String(raw).trim() : raw;
      headers.set(name, value);
    }
  }

  let body: string | undefined;
  try {
    body = await request.text();
  } catch {
    // no body
  }

  try {
    const res = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: body || undefined,
    });

    const text = await res.text();
    const contentType = res.headers.get("content-type") ?? "application/json";

    return new NextResponse(text, {
      status: res.status,
      statusText: res.statusText,
      headers: { "Content-Type": contentType },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        error: "No se pudo conectar con el backend Shield.",
        detail: msg,
        hint: "Comprueba que NEXT_API_BASE_URL en .env.local apunte a un servidor en ejecución (ej. http://localhost:8080).",
      },
      { status: 502 }
    );
  }
}
