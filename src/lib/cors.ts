import { NextResponse } from "next/server";

/** Public booking APIs are fetched from customer Webflow origins (in-page widget). */
export const PUBLIC_CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization",
  "Access-Control-Max-Age": "86400",
  "Cross-Origin-Resource-Policy": "cross-origin",
};

export function withPublicCors(res: NextResponse) {
  for (const [k, v] of Object.entries(PUBLIC_CORS_HEADERS)) {
    res.headers.set(k, v);
  }
  return res;
}

export function publicCorsOptions() {
  return new NextResponse(null, { status: 204, headers: PUBLIC_CORS_HEADERS });
}

export function publicJson(data: unknown, init?: { status?: number }) {
  return withPublicCors(NextResponse.json(data, { status: init?.status ?? 200 }));
}
