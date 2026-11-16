import { PlatformSettingsForm } from "@/components/platform/settings-form";
import { getPlatformPublicSettings } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

export default async function PlatformStripePage() {
  const settings = await getPlatformPublicSettings();
  return <PlatformSettingsForm initial={settings} section="stripe" />;
}
