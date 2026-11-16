import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { exchangeWebflowCode, webflowConfigured } from "@/lib/webflow";

export async function GET(request: Request) {
  if (!webflowConfigured()) {
    return NextResponse.redirect(new URL("/dashboard/integrations?webflow=missing", request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const jar = await cookies();
  const expected = jar.get("wf_oauth_state")?.value;

  if (!code || !state || !expected || state !== expected) {
    return NextResponse.redirect(new URL("/dashboard/integrations?webflow=denied", request.url));
  }

  try {
    const token = await exchangeWebflowCode(code);
    const site = await prisma.site.findUnique({ where: { publicKey: DEMO_PUBLIC_KEY } });
    if (site) {
      await prisma.webflowToken.upsert({
        where: { siteId: site.id },
        update: {
          accessTokenEncrypted: encryptSecret(token.access_token),
          refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
        create: {
          siteId: site.id,
          accessTokenEncrypted: encryptSecret(token.access_token),
          refreshTokenEncrypted: token.refresh_token ? encryptSecret(token.refresh_token) : null,
          expiresAt: token.expires_in ? new Date(Date.now() + token.expires_in * 1000) : null,
        },
      });
      await prisma.auditLog.create({
        data: {
          scope: "SITE",
          action: "webflow.connected",
          siteId: site.id,
        },
      });
    }
    return NextResponse.redirect(new URL("/dashboard/integrations?webflow=connected", request.url));
  } catch (e) {
    console.error(e);
    return NextResponse.redirect(new URL("/dashboard/integrations?webflow=error", request.url));
  }
}
