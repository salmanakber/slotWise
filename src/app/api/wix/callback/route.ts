import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encode } from "next-auth/jwt";
import { Role } from "@prisma/client";
import {
  appOrigin,
  getWixAppCredentials,
  verifyWixSignedInstance,
  wixConfigured,
} from "@/lib/wix";
import { provisionWixInstall } from "@/lib/wix-provision";
import { prisma } from "@/lib/prisma";

function installRedirect(status: string, extra?: Record<string, string>) {
  const url = new URL(`${appOrigin()}/install/wix`);
  url.searchParams.set("status", status);
  if (extra) {
    for (const [k, v] of Object.entries(extra)) {
      if (v) url.searchParams.set(k, v);
    }
  }
  return NextResponse.redirect(url.toString());
}

async function maybeSetSession(userId: string | null) {
  if (!userId) return null;
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return null;
  const secret = process.env.NEXTAUTH_SECRET || process.env.AUTH_SECRET;
  if (!secret) return null;
  return encode({
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name ?? user.email,
      role: user.role ?? Role.WORKSPACE_OWNER,
    },
    secret,
    maxAge: 60 * 60 * 24 * 7,
  });
}

/**
 * Wix post-install redirect.
 * Query: appId, tenantId, instanceId, signedInstance (+ optional state).
 */
export async function GET(request: Request) {
  if (!(await wixConfigured())) {
    return installRedirect("missing");
  }

  const url = new URL(request.url);
  const instanceIdParam = url.searchParams.get("instanceId");
  const tenantId = url.searchParams.get("tenantId");
  const signedInstance = url.searchParams.get("signedInstance");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("wix_oauth_state")?.value;

  if (expected && state && state !== expected) {
    return installRedirect("denied", { reason: "state_mismatch" });
  }

  try {
    const { publicKey } = await getWixAppCredentials();
    const verified = verifyWixSignedInstance(signedInstance, publicKey || null);
    const instanceId = verified.instanceId || instanceIdParam;

    if (!instanceId) {
      return installRedirect("denied", { reason: "missing_instance" });
    }
    if (signedInstance && publicKey && !verified.ok) {
      return installRedirect("denied", { reason: "invalid_signature" });
    }

    const provisioned = await provisionWixInstall({
      instanceId,
      tenantId,
    });

    const res = installRedirect("connected", {
      site: provisioned.site.publicKey,
      name: provisioned.site.name,
      wix: provisioned.site.wixSiteId || "",
    });

    res.cookies.set("wix_oauth_state", "", { path: "/", maxAge: 0 });

    const sessionToken = await maybeSetSession(provisioned.userId);
    if (sessionToken) {
      const secure = appOrigin().startsWith("https://");
      const cookieName = secure
        ? "__Secure-next-auth.session-token"
        : "next-auth.session-token";
      res.cookies.set(cookieName, sessionToken, {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return res;
  } catch (e) {
    console.error("[wix/callback]", e);
    const msg = e instanceof Error ? e.message : "Wix install failed";
    const short = msg.includes("App ID") || msg.includes("Secret")
      ? "missing_credentials"
      : "token_exchange";
    return installRedirect("error", { reason: short, detail: msg.slice(0, 240) });
  }
}
