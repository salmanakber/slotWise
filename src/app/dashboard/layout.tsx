"use client";

import { usePathname } from "next/navigation";
import { AdminShell, Icon } from "@/components/admin/shell";

const NAV = [
  { href: "/dashboard", label: "Overview", icon: <Icon d="M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" /> },
  { href: "/dashboard/bookings", label: "Bookings", icon: <Icon d="M4 5h16v16H4zM4 10h16M9 3v4M15 3v4" /> },
  { href: "/dashboard/services", label: "Services", icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
  { href: "/dashboard/availability", label: "Availability", icon: <Icon d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2" /> },
  { href: "/dashboard/notifications", label: "Notifications", icon: <Icon d="M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 20a2 2 0 004 0" /> },
  { href: "/dashboard/payments", label: "Payments", icon: <Icon d="M3 6h18v12H3zM3 10h18" /> },
  { href: "/dashboard/branding", label: "Branding", icon: <Icon d="M12 3a9 9 0 000 18c1.5 0 2-1 2-2s-1-2 0-3 3 0 5-1a9 9 0 00-7-12z" /> },
  { href: "/dashboard/integrations", label: "Integrations", icon: <Icon d="M9 3v5M15 3v5M6 8h12v3a6 6 0 01-12 0zM12 17v4" /> },
  { href: "/dashboard/plans", label: "Plans", icon: <Icon d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z" /> },
  { href: "/dashboard/settings", label: "Settings", icon: <Icon d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /> },
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
  "/dashboard/settings": ["Settings", "Business, team, privacy and API"],
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
      {children}
    </AdminShell>
  );
}
