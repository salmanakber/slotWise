import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { validateAppleCalDav } from "@/lib/apple-caldav";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { normalizeIntegrationProvider } from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().min(1),
  /** Apple ID email */
  account: z.string().min(1).max(200).optional(),
  /** Apple app-specific password (or legacy Mailchimp API key fallback) */
  secret: z.string().min(4).max(500),
  /** Mailchimp audience/list ID (legacy credential connect) */
  audienceId: z.string().max(80).optional(),
  /** Optional CalDAV principal URL override */
  calDavUrl: z.string().url().optional(),
});

/**
 * Connect credential-based integrations.
 * Apple Calendar: live CalDAV check.
 * HubSpot: Private App / access token verified against CRM API (per site owner — not platform admin).
 * Mailchimp: prefer OAuth; API key path still validated when used.
 */
export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid credentials payload" }, { status: 400 });
  }

  const provider = normalizeIntegrationProvider(parsed.data.provider);
  if (!provider || !["apple_calendar", "mailchimp", "hubspot"].includes(provider)) {
    return NextResponse.json(
      { error: "This provider needs OAuth Connect, not a credentials form" },
      { status: 400 },
    );
  }

  if (provider === "mailchimp" && !parsed.data.audienceId?.trim()) {
    return NextResponse.json({ error: "Mailchimp audience / list ID is required" }, { status: 400 });
  }
  if (provider === "apple_calendar" && !parsed.data.account?.trim()) {
    return NextResponse.json({ error: "Apple ID email is required" }, { status: 400 });
  }
  if (provider === "hubspot" && parsed.data.secret.trim().length < 20) {
    return NextResponse.json(
      { error: "Paste a HubSpot Private App access token (starts with pat-…)." },
      { status: 400 },
    );
  }

  try {
    const site = await requireDemoSite();

    if (provider === "hubspot") {
      const token = parsed.data.secret.trim();
      const ping = await fetch(
        "https://api.hubapi.com/crm/v3/objects/contacts?limit=1&archived=false",
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: AbortSignal.timeout(12_000),
        },
      ).catch(() => null);
      if (!ping) {
        return NextResponse.json(
          { error: "Could not reach HubSpot — check your connection and try again." },
          { status: 400 },
        );
      }
      if (ping.status === 401 || ping.status === 403) {
        return NextResponse.json(
          {
            error:
              "HubSpot rejected that token. Create a Private App with crm.objects.contacts read/write, then paste its access token.",
          },
          { status: 400 },
        );
      }
      if (!ping.ok) {
        return NextResponse.json(
          { error: `HubSpot returned HTTP ${ping.status}. Check the token scopes and try again.` },
          { status: 400 },
        );
      }

      const meta = {
        connectedVia: "private_app_token",
        connectedAt: Date.now(),
        verified: true,
      } satisfies Prisma.InputJsonObject;

      await prisma.siteIntegration.upsert({
        where: { siteId_provider: { siteId: site.id, provider } },
        create: {
          siteId: site.id,
          provider,
          status: "connected",
          accessTokenEncrypted: encryptSecret(token),
          externalAccountEmail: parsed.data.account?.trim() || "HubSpot Private App",
          meta,
        },
        update: {
          status: "connected",
          accessTokenEncrypted: encryptSecret(token),
          externalAccountEmail: parsed.data.account?.trim() || "HubSpot Private App",
          meta,
        },
      });

      return NextResponse.json({ ok: true, provider, connected: true, verified: true });
    }

    if (provider === "apple_calendar") {
      const check = await validateAppleCalDav({
        appleId: parsed.data.account!.trim(),
        appPassword: parsed.data.secret.trim(),
        calDavUrl: parsed.data.calDavUrl?.trim(),
      });
      if (!check.ok) {
        return NextResponse.json({ error: check.error }, { status: 400 });
      }

      const meta = {
        connectedVia: "credentials",
        connectedAt: Date.now(),
        calDavUrl: parsed.data.calDavUrl?.trim() || "https://caldav.icloud.com",
        principalUrl: check.principalUrl,
        verified: true,
      } satisfies Prisma.InputJsonObject;

      await prisma.siteIntegration.upsert({
        where: { siteId_provider: { siteId: site.id, provider } },
        create: {
          siteId: site.id,
          provider,
          status: "connected",
          accessTokenEncrypted: encryptSecret(parsed.data.secret.replace(/\s+/g, "")),
          externalAccountEmail: parsed.data.account!.trim().toLowerCase(),
          meta,
        },
        update: {
          status: "connected",
          accessTokenEncrypted: encryptSecret(parsed.data.secret.replace(/\s+/g, "")),
          externalAccountEmail: parsed.data.account!.trim().toLowerCase(),
          meta,
        },
      });

      return NextResponse.json({ ok: true, provider, connected: true, verified: true });
    }

    if (provider === "mailchimp") {
      const key = parsed.data.secret.trim();
      const parts = key.split("-");
      const dc = parts.length > 1 ? parts[parts.length - 1] : "";
      if (!dc || parts.length < 2) {
        return NextResponse.json(
          {
            error:
              "Mailchimp API key looks invalid. Prefer Connect with Mailchimp (OAuth), or paste a key ending in -us1 / -us2…",
          },
          { status: 400 },
        );
      }
      const audienceId = parsed.data.audienceId!.trim();
      const ping = await fetch(
        `https://${dc}.api.mailchimp.com/3.0/lists/${encodeURIComponent(audienceId)}`,
        {
          headers: { Authorization: `Bearer ${key}` },
          signal: AbortSignal.timeout(12_000),
        },
      ).catch(() => null);
      if (!ping || (!ping.ok && ping.status !== 404)) {
        return NextResponse.json(
          {
            error:
              "Mailchimp rejected that API key. Prefer Connect with Mailchimp (OAuth) from Integrations.",
          },
          { status: 400 },
        );
      }
      if (ping.status === 404) {
        return NextResponse.json({ error: "Audience / list ID not found for this account" }, { status: 400 });
      }
    }

    const meta = {
      connectedVia: "credentials",
      connectedAt: Date.now(),
      ...(provider === "mailchimp" ? { audienceId: parsed.data.audienceId!.trim() } : {}),
    } satisfies Prisma.InputJsonObject;

    await prisma.siteIntegration.upsert({
      where: { siteId_provider: { siteId: site.id, provider } },
      create: {
        siteId: site.id,
        provider,
        status: "connected",
        accessTokenEncrypted: encryptSecret(parsed.data.secret.trim()),
        externalAccountEmail: parsed.data.account?.trim() || null,
        meta,
      },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptSecret(parsed.data.secret.trim()),
        externalAccountEmail: parsed.data.account?.trim() || null,
        meta,
      },
    });

    return NextResponse.json({ ok: true, provider, connected: true });
  } catch (e) {
    console.error(e);
    return NextResponse.json({ error: "Could not save credentials" }, { status: 500 });
  }
}
