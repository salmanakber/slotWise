import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/** Public booking APIs are called from customer Webflow domains (in-page embed). */
export function middleware(request: NextRequest) {
  const origin = request.headers.get("origin") || "*";
  const isOptions = request.method === "OPTIONS";

  if (isOptions) {
    return new NextResponse(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": origin === "null" ? "*" : origin,
        "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization, Accept",
        "Access-Control-Max-Age": "86400",
        Vary: "Origin",
      },
    });
  }

  const res = NextResponse.next();
  res.headers.set("Access-Control-Allow-Origin", origin === "null" ? "*" : origin);
  res.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  res.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, Accept");
  res.headers.set("Vary", "Origin");
  return res;
}

export const config = {
  matcher: ["/api/v1/:path*"],
};
