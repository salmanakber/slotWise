import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_CORS_HEADERS } from "@/lib/cors";

/**
 * Ensure cross-origin callers can read API responses:
 * - /api/v1/* → customer Webflow sites (in-page widget)
 * - /api/designer/* → Webflow Designer Extension iframe
 */
export function middleware(request: NextRequest) {
  if (request.method === "OPTIONS") {
    return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
  }

  const res = NextResponse.next();
  for (const [k, v] of Object.entries(PUBLIC_CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export const config = {
  matcher: [
    "/api/v1/:path*",
    "/api/designer/:path*",
  ],
};
