import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  INTEGRATION_PROVIDERS,
  missingKeysHint,
  normalizeIntegrationProvider,
  type IntegrationProvider,
} from "@/lib/integrations-oauth";
import { getPlatformPublicSettings } from "@/lib/platform-config";
import { prisma } from "@/lib/prisma";
import { requireDemoSite } from "@/lib/site-admin";

export const dynamic = "force-dynamic";

function keysReadyFor(
  provider: IntegrationProvider,
  settings: Awaited<ReturnType<typeof getPlatformPublicSettings>>,
) {
  if (provider === "zapier") {
    return Boolean(settings.zapierEnabled);
  }
  if (provider === "google_calendar" || provider === "meet") {
    return Boolean(settings.googleClientId && settings.googleClientSecretSet);
  }
  if (provider === "outlook") {
    return Boolean(settings.microsoftClientId && settings.microsoftClientSecretSet);
  }
  if (provider === "zoom") {
    return Boolean(settings.zoomClientId && settings.zoomClientSecretSet);
  }
  return true;
}

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const settings = await getPlatformPublicSettings();
    const rows = await prisma.siteIntegration.findMany({ where: { siteId: site.id } });
    const byProvider = new Map(rows.map((r) => [r.provider, r]));

    const webflowReady = Boolean(settings.webflowClientId && settings.webflowClientSecretSet);
    const stripeReady = settings.stripeSecretKeySet;

    // Heal stale "error" rows that still have tokens so Meet/Calendar show as connected
    for (const row of rows) {
      if (row.status === "error" && row.accessTokenEncrypted) {
        await prisma.siteIntegration
          .update({
            where: { id: row.id },
            data: { status: "connected" },
          })
          .catch(() => undefined);
        row.status = "connected";
      }
    }

    const providers = INTEGRATION_PROVIDERS.map((provider) => {
      const row = byProvider.get(provider);
      const platformConfigured = keysReadyFor(provider, settings);
      const connected = row?.status === "connected" || row?.status === "error";
      return {
        provider,
        status: row?.status || "disconnected",
        connected: Boolean(connected && row?.accessTokenEncrypted),
        externalAccountEmail: row?.externalAccountEmail || null,
        webhookUrl: row?.webhookUrl || null,
        lastSyncAt: row?.lastSyncAt?.toISOString() || null,
        platformConfigured,
        hint: platformConfigured ? null : missingKeysHint(provider),
      };
    });

    return NextResponse.json({
      webflow: {
        provider: "webflow",
        platformConfigured: webflowReady,
        installUrl: webflowReady ? "/api/webflow/install" : null,
        hint: webflowReady ? null : "Webflow isn’t finished setting up yet",
      },
      stripe: {
        provider: "stripe",
        platformConfigured: stripeReady,
        paymentsUrl: "/dashboard/payments",
        mode: settings.stripeMode,
        hint: stripeReady ? null : "Payments aren’t finished setting up yet",
      },
      providers,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const provider = normalizeIntegrationProvider(searchParams.get("provider") || "");
  if (!provider) {
    return NextResponse.json({ error: "Invalid provider" }, { status: 400 });
  }

  try {
    const site = await requireDemoSite();
    await prisma.siteIntegration.deleteMany({
      where: { siteId: site.id, provider },
    });

    await prisma.auditLog.create({
      data: {
        scope: "SITE",
        action: "integration.disconnected",
        siteId: site.id,
        meta: { provider },
      },
    });

    return NextResponse.json({ ok: true, provider });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Failed" },
      { status: 500 },
    );
  }
}
