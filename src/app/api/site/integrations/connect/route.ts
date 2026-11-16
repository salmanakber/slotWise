import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { z } from "zod";
import { authOptions } from "@/lib/auth";
import {
  buildAuthorizeUrl,
  missingKeysHint,
  normalizeIntegrationProvider,
  platformKeysConfigured,
} from "@/lib/integrations-oauth";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";
import { appOrigin } from "@/lib/webflow";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().min(1),
});

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const provider = normalizeIntegrationProvider(parsed.data.provider);
  if (!provider) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();

    if (provider === "zapier") {
      const token = randomBytes(24).toString("hex");
      const webhookUrl = `${appOrigin()}/api/webhooks/zapier/${site.publicKey}/${token}`;

      const row = await prisma.siteIntegration.upsert({
        where: { siteId_provider: { siteId: site.id, provider: "zapier" } },
        create: {
          siteId: site.id,
          provider: "zapier",
          status: "connected",
          webhookUrl,
          meta: { token },
        },
        update: {
          status: "connected",
          webhookUrl,
          meta: { token },
        },
      });

      await prisma.auditLog.create({
        data: {
          scope: "SITE",
          action: "integration.zapier.connected",
          siteId: site.id,
          meta: { webhookUrl: row.webhookUrl },
        },
      });

      return NextResponse.json({
        provider: "zapier",
        status: "connected",
        webhookUrl: row.webhookUrl,
      });
    }

    const configured = await platformKeysConfigured(provider);
    if (!configured) {
      return NextResponse.json(
        {
          error: missingKeysHint(provider),
          hint: missingKeysHint(provider),
        },
        { status: 503 },
      );
    }

    const authorizeUrl = await buildAuthorizeUrl(site.id, provider);
    return NextResponse.json({ provider, authorizeUrl });
  } catch (e) {
    console.error(e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Could not start connect" },
      { status: 500 },
    );
  }
}
