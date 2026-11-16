"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarClock,
  CreditCard,
  LayoutGrid,
  ListChecks,
  Palette,
  Plug,
  Sparkles,
} from "lucide-react";
import { AccessBanner } from "@/components/admin/access-banner";
import { AdminShell } from "@/components/admin/shell";

/** Site-owner workspace — no Settings (platform secrets / AI live under /platform only). */
const NAV = [
  { href: "/dashboard", label: "Overview", icon: <LayoutGrid size={15} strokeWidth={2} /> },
  { href: "/dashboard/bookings", label: "Bookings", icon: <CalendarClock size={15} strokeWidth={2} /> },
  { href: "/dashboard/services", label: "Services", icon: <ListChecks size={15} strokeWidth={2} /> },
  { href: "/dashboard/availability", label: "Availability", icon: <CalendarClock size={15} strokeWidth={2} /> },
  { href: "/dashboard/notifications", label: "Notifications", icon: <Bell size={15} strokeWidth={2} /> },
  { href: "/dashboard/payments", label: "Payments", icon: <CreditCard size={15} strokeWidth={2} /> },
  { href: "/dashboard/branding", label: "Branding", icon: <Palette size={15} strokeWidth={2} /> },
  { href: "/dashboard/integrations", label: "Integrations", icon: <Plug size={15} strokeWidth={2} /> },
  { href: "/dashboard/plans", label: "Plans", icon: <Sparkles size={15} strokeWidth={2} /> },
];

const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Overview", "How your bookings are doing"],
  "/dashboard/bookings": ["Bookings", "Every appointment in one place"],
  "/dashboard/services": ["Services and rules", "What customers can book, and how"],
  "/dashboard/availability": ["Availability", "Working hours and time off"],
  "/dashboard/notifications": ["Notifications", "Reminders by email, SMS and WhatsApp"],
  "/dashboard/payments": ["Payments", "Deposits, fees and refunds"],
  "/dashboard/branding": ["Branding and install", "Pick a theme, style the widget, then install it on your site"],
  "/dashboard/integrations": ["Integrations", "Connect calendars, video and tools"],
  "/dashboard/plans": ["Plans and billing", "Your plan, usage and upgrades"],
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [title, subtitle] = TITLES[pathname] ?? ["Dashboard", "Manage your Slotwise site"];

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      nav={NAV}
      brandLabel="Site admin"
      brandMeta="Studio Nine · Pro plan"
    >
      <Suspense fallback={null}>
        <AccessBanner />
      </Suspense>
      {children}
    </AdminShell>
  );
}
