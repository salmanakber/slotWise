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

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().min(1),
  /** Zapier/Make Catch Hook URL (https://hooks.zapier.com/… or Make equivalent). */
  webhookUrl: z.string().url().optional(),
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
      const hook = parsed.data.webhookUrl?.trim();
      if (!hook || !/^https:\/\//i.test(hook)) {
        return NextResponse.json(
          {
            error:
              "Paste an HTTPS webhook URL. Free option: Make.com → Webhooks → Custom webhook. (Zapier Catch Hook requires a paid Zapier plan.)",
          },
          { status: 400 },
        );
      }

      const row = await prisma.siteIntegration.upsert({
        where: { siteId_provider: { siteId: site.id, provider: "zapier" } },
        create: {
          siteId: site.id,
          provider: "zapier",
          status: "connected",
          webhookUrl: hook,
          meta: { direction: "outbound" },
        },
        update: {
          status: "connected",
          webhookUrl: hook,
          meta: { direction: "outbound" },
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

      // Optional ping so Zapier can capture a sample while the Zap is on
      try {
        await fetch(hook, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            source: "slotwise",
            event: "zapier.test",
            message: "Slotwise connected — turn your Zap on, then create a test booking.",
            sentAt: new Date().toISOString(),
          }),
        });
      } catch {
        /* Zap may still be off — that's fine */
      }

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
