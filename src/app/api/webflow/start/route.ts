import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getWebflowAuthorizeUrl, webflowConfigured } from "@/lib/webflow";

export async function GET() {
  if (!webflowConfigured()) {
    return NextResponse.json(
      {
        error: "Webflow is not configured",
        hint: "Set WEBFLOW_CLIENT_ID, WEBFLOW_CLIENT_SECRET, WEBFLOW_REDIRECT_URI",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(getWebflowAuthorizeUrl(state));
  res.cookies.set("wf_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
