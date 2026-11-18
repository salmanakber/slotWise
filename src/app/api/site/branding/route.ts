import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { requireDemoSite } from "@/lib/site-admin";
import { getTheme } from "@/lib/themes";

export const dynamic = "force-dynamic";

/** Branding + theme tokens for the owner workspace chrome. */
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const site = await requireDemoSite();
    const branding = site.branding;
    const theme = getTheme(branding?.themeKey ?? "amber-light");
    const ink = branding?.inkColor || theme.ink;
    return NextResponse.json({
      publicKey: site.publicKey,
      currency: site.currency,
      themeKey: branding?.themeKey ?? theme.key,
      accent: branding?.accent ?? theme.accent,
      inkColor: ink,
      bg: theme.bg,
      panel: theme.panel,
      line: theme.line,
      radius: branding?.radius ?? theme.radius,
      font: branding?.font ?? theme.font,
      businessName: branding?.businessName || site.name,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Unavailable" },
      { status: 503 },
    );
  }
}
