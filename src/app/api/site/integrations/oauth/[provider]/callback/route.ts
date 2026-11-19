import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { encryptSecret } from "@/lib/crypto";
import {
  decodeOAuthState,
  exchangeOAuthCode,
  normalizeIntegrationProvider,
} from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";
import { appOrigin } from "@/lib/webflow";

export const dynamic = "force-dynamic";

type Ctx = { params: Promise<{ provider: string }> };

export async function GET(request: Request, context: Ctx) {
  const { provider: rawProvider } = await context.params;
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const oauthError = searchParams.get("error");

  const origin = appOrigin();
  const fail = (reason: string) =>
    NextResponse.redirect(
      `${origin}/dashboard/integrations?error=${encodeURIComponent(reason)}`,
    );

  if (oauthError) {
    return fail(oauthError);
  }
  if (!code || !state) {
    return fail("missing_code_or_state");
  }

  const decoded = decodeOAuthState(state);
  if (!decoded) {
    return fail("invalid_state");
  }

  const pathProvider = normalizeIntegrationProvider(rawProvider);
  if (!pathProvider || pathProvider !== decoded.provider) {
    // meet/google share google OAuth; allow path google ↔ google_calendar/meet via state
    const pathFamily =
      pathProvider === "google_calendar" || pathProvider === "meet"
        ? "google"
        : pathProvider === "outlook" || pathProvider === "teams"
          ? "microsoft"
          : pathProvider;
    const stateFamily =
      decoded.provider === "google_calendar" || decoded.provider === "meet"
        ? "google"
        : decoded.provider === "outlook" || decoded.provider === "teams"
          ? "microsoft"
          : decoded.provider;
    if (pathFamily !== stateFamily) {
      return fail("provider_mismatch");
    }
  }

  const provider = decoded.provider;

  try {
    const tokens = await exchangeOAuthCode(provider, code);
    if (!tokens.accessToken) {
      return fail("token_exchange_failed");
    }

    const expiresAt =
      typeof tokens.expiresIn === "number"
        ? Date.now() + tokens.expiresIn * 1000
        : null;

    const raw = (tokens.raw || {}) as Record<string, unknown>;
    const meta = {
      expiresIn: tokens.expiresIn ?? null,
      expiresAt,
      connectedVia: "oauth",
      ...(provider === "mailchimp" && typeof raw.dc === "string"
        ? { dc: raw.dc }
        : {}),
      ...(provider === "mailchimp" && typeof raw.apiEndpoint === "string"
        ? { apiEndpoint: raw.apiEndpoint }
        : {}),
      ...(provider === "mailchimp" && typeof raw.audienceId === "string"
        ? { audienceId: raw.audienceId }
        : {}),
    } satisfies Prisma.InputJsonObject;

    const existing = await prisma.siteIntegration.findUnique({
      where: { siteId_provider: { siteId: decoded.siteId, provider } },
      select: { refreshTokenEncrypted: true },
    });

    await prisma.siteIntegration.upsert({
      where: { siteId_provider: { siteId: decoded.siteId, provider } },
      create: {
        siteId: decoded.siteId,
        provider,
        status: "connected",
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        refreshTokenEncrypted: tokens.refreshToken
          ? encryptSecret(tokens.refreshToken)
          : null,
        externalAccountEmail: tokens.email || null,
        meta,
      },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptSecret(tokens.accessToken),
        // Google often omits refresh_token on re-consent — keep the existing one
        ...(tokens.refreshToken
          ? { refreshTokenEncrypted: encryptSecret(tokens.refreshToken) }
          : existing?.refreshTokenEncrypted
            ? {}
            : { refreshTokenEncrypted: null }),
        externalAccountEmail: tokens.email || null,
        meta,
      },
    });

    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "integration.oauth.connected",
        siteId: decoded.siteId,
        meta: { provider, email: tokens.email || null },
      },
    });

    return NextResponse.redirect(
      `${origin}/dashboard/integrations?connected=${encodeURIComponent(provider)}`,
    );
  } catch (e) {
    console.error(e);
    return fail(e instanceof Error ? e.message.slice(0, 120) : "oauth_failed");
  }
}
