import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appOrigin, getWebflowAuthorizeUrl, webflowConfigured } from "@/lib/webflow";

/**
 * Marketplace / “Install app” entry — no Slotwise login.
 * Set this URL as the Webflow App Install URL:
 *   https://slotwise.hindaralabs.com/api/webflow/install
 */
export async function GET() {
  if (!(await webflowConfigured())) {
    return NextResponse.redirect(`${appOrigin()}/install?status=missing`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(await getWebflowAuthorizeUrl(state));
  res.cookies.set("wf_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  res.cookies.set("wf_oauth_flow", "install", {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 600,
  });
  return res;
}
