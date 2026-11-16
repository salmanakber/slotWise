import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getWebflowAuthorizeUrl, webflowConfigured } from "@/lib/webflow";

export async function GET() {
  if (!(await webflowConfigured())) {
    return NextResponse.json(
      {
        error: "Webflow is not configured",
        hint: "Set credentials in Platform → Settings, or WEBFLOW_CLIENT_ID / SECRET in .env, plus WEBFLOW_REDIRECT_URI",
      },
      { status: 503 },
    );
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(await getWebflowAuthorizeUrl(state));
  res.cookies.set("wf_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
