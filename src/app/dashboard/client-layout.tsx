"use client";

import { Suspense } from "react";
import { usePathname } from "next/navigation";
import {
  Bell,
  CalendarDays,
  Clock3,
  CreditCard,
  LayoutDashboard,
  ListChecks,
  MessageCircle,
  Palette,
  Plug,
  Sparkles,
} from "lucide-react";
import { AccessBanner } from "@/components/admin/access-banner";
import { AdminShell } from "@/components/admin/shell";
import { UsageQuota } from "@/components/admin/usage-quota";

/** Site-owner workspace — no Settings (platform secrets / AI live under /platform only). */
const NAV = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { href: "/dashboard/bookings", label: "Bookings", icon: <CalendarDays size={16} strokeWidth={2} /> },
  { href: "/dashboard/services", label: "Events", icon: <ListChecks size={16} strokeWidth={2} /> },
  { href: "/dashboard/ai-chat", label: "AI Chat", icon: <MessageCircle size={16} strokeWidth={2} /> },
  { href: "/dashboard/availability", label: "Availability", icon: <Clock3 size={16} strokeWidth={2} /> },
  { href: "/dashboard/notifications", label: "Notifications", icon: <Bell size={16} strokeWidth={2} /> },
  { href: "/dashboard/payments", label: "Payments", icon: <CreditCard size={16} strokeWidth={2} /> },
  { href: "/dashboard/branding", label: "Branding", icon: <Palette size={16} strokeWidth={2} /> },
  { href: "/dashboard/integrations", label: "Integrations", icon: <Plug size={16} strokeWidth={2} /> },
  { href: "/dashboard/plans", label: "Plans", icon: <Sparkles size={16} strokeWidth={2} /> },
];

const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Overview", "Bookings, revenue and what’s coming up"],
  "/dashboard/bookings": ["Bookings", "Customer details, deposits and status"],
  "/dashboard/services": ["Events", "Edit events, pricing, and performance reports"],
  "/dashboard/ai-chat": ["AI Chat", "Visitor calendar Q&A analytics (BETA)"],
  "/dashboard/availability": ["Availability", "Working hours and time off"],
  "/dashboard/notifications": ["Notifications", "Reminders by email, SMS and WhatsApp"],
  "/dashboard/payments": ["Payments", "Deposits, fees and refunds"],
  "/dashboard/branding": ["Branding and install", "Pick a theme, style the widget, then install it on your site"],
  "/dashboard/integrations": ["Integrations", "Connect calendars, video and tools"],
  "/dashboard/plans": ["Plans and billing", "Your plan, usage and upgrades"],
};

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [title, subtitle] = TITLES[pathname] ?? ["Dashboard", "Manage your Slotwise site"];

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      nav={NAV}
      brandLabel="Site admin"
      brandMeta="Your workspace"
      headerAside={<UsageQuota />}
    >
      <Suspense fallback={null}>
        <AccessBanner />
      </Suspense>
      {children}
    </AdminShell>
  );
}
