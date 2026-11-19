"use client";

import { Suspense, useMemo } from "react";
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
  Users,
} from "lucide-react";
import { AccessBanner } from "@/components/admin/access-banner";
import { useInboxUnread } from "@/components/admin/nav-unread-badge";
import { NotificationBell } from "@/components/admin/notification-bell";
import { AdminShell } from "@/components/admin/shell";
import { UsageQuota } from "@/components/admin/usage-quota";

/** Site-owner workspace — no Settings (platform secrets / AI live under /platform only). */
const NAV_BASE = [
  { href: "/dashboard", label: "Overview", icon: <LayoutDashboard size={16} strokeWidth={2} /> },
  { href: "/dashboard/bookings", label: "Bookings", icon: <CalendarDays size={16} strokeWidth={2} /> },
  { href: "/dashboard/services", label: "Events", icon: <ListChecks size={16} strokeWidth={2} /> },
  { href: "/dashboard/staff", label: "Team", icon: <Users size={16} strokeWidth={2} /> },
  { href: "/dashboard/ai-chat", label: "Chat", icon: <MessageCircle size={16} strokeWidth={2} /> },
  { href: "/dashboard/availability", label: "Availability", icon: <Clock3 size={16} strokeWidth={2} /> },
  { href: "/dashboard/notifications", label: "Notifications", icon: <Bell size={16} strokeWidth={2} /> },
  { href: "/dashboard/payments", label: "Payments", icon: <CreditCard size={16} strokeWidth={2} /> },
  { href: "/dashboard/branding", label: "Branding", icon: <Palette size={16} strokeWidth={2} /> },
  { href: "/dashboard/integrations", label: "Integrations", icon: <Plug size={16} strokeWidth={2} /> },
  { href: "/dashboard/plans", label: "Plans", icon: <Sparkles size={16} strokeWidth={2} /> },
] as const;

const TITLES: Record<string, [string, string]> = {
  "/dashboard": ["Overview", "Bookings, revenue and what’s coming up"],
  "/dashboard/bookings": ["Bookings", "Month calendar, customer details, deposits & meeting links"],
  "/dashboard/services": ["Events", "Edit events, pricing, and performance reports"],
  "/dashboard/staff": ["Team", "People shown under Who on your booking calendar"],
  "/dashboard/ai-chat": ["Chat", "Visitor calendar Q&A analytics (BETA)"],
  "/dashboard/availability": ["Availability", "Weekly hours and blocked date/time ranges"],
  "/dashboard/notifications": ["Notifications", "Inbox, bookings alerts, and delivery settings"],
  "/dashboard/payments": ["Payments", "Deposits, fees and refunds"],
  "/dashboard/branding": ["Branding and install", "Pick a theme, style the widget, then install it on your site"],
  "/dashboard/integrations": ["Integrations", "Connect calendars, video and tools"],
  "/dashboard/plans": ["Plans and billing", "Your plan, usage and upgrades"],
};

export function DashboardClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const unread = useInboxUnread();
  const [title, subtitle] = TITLES[pathname] ?? ["Dashboard", "Manage your Slotwise site"];

  const nav = useMemo(
    () =>
      NAV_BASE.map((item) =>
        item.href === "/dashboard/notifications" ? { ...item, badge: unread } : { ...item },
      ),
    [unread],
  );

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      nav={nav}
      brandLabel="Site admin"
      brandMeta="Your workspace"
      headerAside={
        <>
          <NotificationBell />
          <UsageQuota />
        </>
      }
    >
      <Suspense fallback={null}>
        <AccessBanner />
      </Suspense>
      {children}
    </AdminShell>
  );
}
