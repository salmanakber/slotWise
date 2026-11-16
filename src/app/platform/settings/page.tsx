import { PlatformSettingsForm } from "@/components/platform/settings-form";
import { getPlatformPublicSettings } from "@/lib/platform-config";

export const dynamic = "force-dynamic";

export default async function PlatformSettingsPage() {
  const settings = await getPlatformPublicSettings();

  return (
    <div className="grid gap-6">
      <PlatformSettingsForm initial={settings} section="providers" />
      <PlatformSettingsForm initial={settings} section="ops" />
    </div>
  );
}
