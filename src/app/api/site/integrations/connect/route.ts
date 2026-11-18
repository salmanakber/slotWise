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
import { requireDemoSite } from "@/lib/site-admin";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  provider: z.string().min(1),
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
      const { getPlatformPublicSettings } = await import("@/lib/platform-config");
      const platform = await getPlatformPublicSettings();
      if (!platform.zapierEnabled) {
        return NextResponse.json(
          { error: "Zapier is coming soon. You’ll be able to connect it in one click." },
          { status: 503 },
        );
      }
      return NextResponse.json(
        { error: "Zapier one-click connect isn’t ready yet. Keep it enabled in admin for launch." },
        { status: 503 },
      );
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
