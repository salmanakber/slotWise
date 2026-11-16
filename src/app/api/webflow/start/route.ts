import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appOrigin, getWebflowAuthorizeUrl, webflowConfigured } from "@/lib/webflow";

/** Dashboard “Connect Webflow” — same OAuth, marks flow as connect. */
export async function GET() {
  if (!(await webflowConfigured())) {
    return NextResponse.redirect(`${appOrigin()}/install?status=missing`);
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
  res.cookies.set("wf_oauth_flow", "connect", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 600,
  });
  return res;
}
