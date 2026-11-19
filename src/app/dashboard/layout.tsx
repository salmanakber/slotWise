import { getOwnerBrandingLite } from "@/lib/owner-branding";
import { cssVarsFromTokens, resolveSiteTheme } from "@/lib/site-theme";
import { DashboardClientLayout } from "./client-layout";

export const dynamic = "force-dynamic";

/** Server-inject site theme — branding only (fast). Full site loads happen on each page. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const branding = await getOwnerBrandingLite().catch(() => null);
  const tokens = resolveSiteTheme({
    themeKey: branding?.themeKey,
    accent: branding?.accent,
    inkColor: branding?.inkColor,
    font: branding?.font,
    radius: branding?.radius,
  });

  return (
    <>
      <style
        id="sw-site-theme"
        dangerouslySetInnerHTML={{ __html: cssVarsFromTokens(tokens) }}
      />
      <DashboardClientLayout>{children}</DashboardClientLayout>
    </>
  );
}
