import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/my-ip
 * Devuelve la IP del cliente desde headers que inyectan proxy/CDN/hosting.
 * En local (next dev) no hay proxy → suele devolver ::1 o 127.0.0.1.
 * En Vercel/producción: x-forwarded-for tiene la IP pública del cliente.
 */
function getClientIp(request: NextRequest): string {
  // Orden de preferencia: Vercel, estándar, Cloudflare, Akamai
  const vercel = request.headers.get("x-vercel-forwarded-for");
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const cf = request.headers.get("cf-connecting-ip");
  const trueClient = request.headers.get("true-client-ip");

  const raw =
    vercel ??
    (forwarded?.split(",")[0]?.trim() ?? null) ??
    realIp ??
    cf ??
    trueClient ??
    null;

  return raw?.length ? raw : "unknown";
}

export async function GET(request: NextRequest) {
  const ip = getClientIp(request);
  return NextResponse.json({ ip });
}
