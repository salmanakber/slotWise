import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { PUBLIC_CORS_HEADERS } from "@/lib/cors";

/** Ensure every /api/v1 response (and preflight) is readable from Webflow pages. */
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
  // Broad match so nested App Router paths always get CORS (Webflow in-page embed).
  matcher: ["/api/v1/:path*", "/api/v1/:path*/:path*", "/api/v1/:path*/:path*/:path*"],
};
