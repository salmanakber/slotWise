"use client";

import { usePathname } from "next/navigation";
import { AdminShell, Icon } from "@/components/admin/shell";

const NAV = [
  { href: "/platform", label: "Activity", icon: <Icon d="M3 12h4l3-8 4 16 3-8h4" /> },
  { href: "/platform/sites", label: "Sites", icon: <Icon d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" /> },
  { href: "/platform/customers", label: "Customers", icon: <Icon d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z" /> },
  { href: "/platform/plans", label: "Plans and prices", icon: <Icon d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2-5.5-2.9-5.5 2.9 1-6.2L3 9.6l6.2-.9z" /> },
  { href: "/platform/stripe", label: "Stripe", icon: <Icon d="M3 6h18v12H3zM3 10h18" /> },
  { href: "/platform/config", label: "Configuration", icon: <Icon d="M12 3a9 9 0 100 18 9 9 0 000-18zM12 7v5l3 2" /> },
  { href: "/platform/audit", label: "Audit log", icon: <Icon d="M9 5h11M9 12h11M9 19h11M4 5h.01M4 12h.01M4 19h.01" /> },
  { href: "/platform/settings", label: "Settings", icon: <Icon d="M4 7h10M18 7h2M4 17h2M10 17h10M14 4v6M6 14v6" /> },
];

const TITLES: Record<string, [string, string]> = {
  "/platform": ["Activity", "Live platform health across all sites"],
  "/platform/sites": ["Sites", "Activate, pause or inspect every installed site"],
  "/platform/customers": ["Customers", "Workspaces and agency accounts"],
  "/platform/plans": ["Plans and prices", "Edit what customers pay and get"],
  "/platform/stripe": ["Stripe", "Keys, webhook secret, fee, and Connect defaults"],
  "/platform/config": ["Configuration", "Feature flags and rollout controls"],
  "/platform/audit": ["Audit log", "Who changed what, across the platform"],
  "/platform/settings": ["Settings", "Twilio, email, Webflow credentials, and maintenance"],
};

export default function PlatformLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [title, subtitle] = TITLES[pathname] ?? ["Platform", "Slotwise owner console"];

  return (
    <AdminShell
      title={title}
      subtitle={subtitle}
      nav={NAV}
      brandLabel="Platform owner"
      brandMeta="Owner access · Slotwise"
    >
      {children}
    </AdminShell>
  );
}
