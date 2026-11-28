import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { appOrigin, getWixInstallUrl, wixConfigured } from "@/lib/wix";

/**
 * Wix App install entry — parallel to /api/webflow/install.
 * Set as App URL / external install in Wix Dev Center:
 *   https://slotwise.hindaralabs.com/api/wix/install
 */
export async function GET() {
  if (!(await wixConfigured())) {
    return NextResponse.redirect(`${appOrigin()}/install/wix?status=missing`);
  }

  const state = randomBytes(16).toString("hex");
  const res = NextResponse.redirect(await getWixInstallUrl(state));
  res.cookies.set("wix_oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    secure: true,
    path: "/",
    maxAge: 900,
  });
  return res;
}
