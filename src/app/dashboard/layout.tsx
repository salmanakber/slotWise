import { getDemoSite } from "@/lib/sites";
import { cssVarsFromTokens, resolveSiteTheme } from "@/lib/site-theme";
import { DashboardClientLayout } from "./client-layout";

export const dynamic = "force-dynamic";

/** Server-inject site theme so workspace chrome matches Branding / Designer on first paint. */
export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const site = await getDemoSite().catch(() => null);
  const tokens = resolveSiteTheme({
    themeKey: site?.branding?.themeKey,
    accent: site?.branding?.accent,
    inkColor: site?.branding?.inkColor,
    font: site?.branding?.font,
    radius: site?.branding?.radius,
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
