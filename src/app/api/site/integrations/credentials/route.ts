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
  /** Apple ID email / Mailchimp account email / HubSpot portal label */
  account: z.string().min(1).max(200).optional(),
  /** Apple app-specific password, Mailchimp API key, or HubSpot private app token */
  secret: z.string().min(4).max(500),
  /** Mailchimp audience/list ID */
  audienceId: z.string().max(80).optional(),
  /** Optional CalDAV principal URL override */
  calDavUrl: z.string().url().optional(),
});

/**
 * Connect credential-based integrations (Apple Calendar / iCloud, Mailchimp, HubSpot token).
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

  try {
    const site = await requireDemoSite();
    const meta = {
      connectedVia: "credentials",
      connectedAt: Date.now(),
      ...(provider === "mailchimp"
        ? { audienceId: parsed.data.audienceId!.trim() }
        : {}),
      ...(provider === "apple_calendar"
        ? { calDavUrl: parsed.data.calDavUrl?.trim() || "https://caldav.icloud.com/" }
        : {}),
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
