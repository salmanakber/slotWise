import { redirect } from "next/navigation";

/** Site-owner Settings portal removed — business fields live under Branding; AI/API keys are platform-admin only. */
export default function SiteSettingsRedirect() {
  redirect("/dashboard/branding");
}
