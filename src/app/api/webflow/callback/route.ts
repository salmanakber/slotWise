import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { encryptSecret } from "@/lib/crypto";
import { prisma } from "@/lib/prisma";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { appOrigin, exchangeWebflowCode, webflowConfigured } from "@/lib/webflow";

function redirectIntegrations(status: string) {
  return NextResponse.redirect(`${appOrigin()}/dashboard/integrations?webflow=${status}`);
}

export async function GET(request: Request) {
  if (!(await webflowConfigured())) {
    return redirectIntegrations("missing");
  }

  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  const jar = await cookies();
  const expected = jar.get("wf_oauth_state")?.value;

  if (error) {
    return redirectIntegrations("denied");
  }

  if (!code || !state || !expected || state !== expected) {
    return redirectIntegrations("denied");
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
    return redirectIntegrations("connected");
  } catch (e) {
    console.error(e);
    return redirectIntegrations("error");
  }
}
