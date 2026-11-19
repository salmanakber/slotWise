import { getServerSession } from "next-auth";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import { encryptSecret } from "@/lib/crypto";
import { normalizeIntegrationProvider } from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().min(1),
  account: z.string().min(1).max(200).optional(),
  secret: z.string().min(4).max(500),
  audienceId: z.string().max(80).optional(),
});

/**
 * Legacy credential connect for Mailchimp API keys.
 * Prefer OAuth Connect from Integrations.
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
  if (!provider || provider !== "mailchimp") {
    return NextResponse.json(
      { error: "This provider needs OAuth Connect, not a credentials form" },
      { status: 400 },
    );
  }

  if (!parsed.data.audienceId?.trim()) {
    return NextResponse.json({ error: "Mailchimp audience / list ID is required" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();

    const key = parsed.data.secret.trim();
    const parts = key.split("-");
    const dc = parts.length > 1 ? parts[parts.length - 1] : "";
    if (!dc || parts.length < 2) {
      return NextResponse.json(
        {
          error:
            "Mailchimp API key looks invalid. Prefer Connect with Mailchimp, or paste a key ending in -us1 / -us2…",
        },
        { status: 400 },
      );
    }
    const audienceId = parsed.data.audienceId.trim();
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
          error: "Mailchimp rejected that API key. Prefer Connect with Mailchimp from Integrations.",
        },
        { status: 400 },
      );
    }
    if (ping.status === 404) {
      return NextResponse.json({ error: "Audience / list ID not found for this account" }, { status: 400 });
    }

    const meta = {
      connectedVia: "credentials",
      connectedAt: Date.now(),
      audienceId,
    } satisfies Prisma.InputJsonObject;

    await prisma.siteIntegration.upsert({
      where: { siteId_provider: { siteId: site.id, provider } },
      create: {
        siteId: site.id,
        provider,
        status: "connected",
        accessTokenEncrypted: encryptSecret(key),
        externalAccountEmail: parsed.data.account?.trim() || null,
        meta,
      },
      update: {
        status: "connected",
        accessTokenEncrypted: encryptSecret(key),
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
