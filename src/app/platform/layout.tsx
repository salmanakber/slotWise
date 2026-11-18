"use client";

import { usePathname } from "next/navigation";
import {
  Activity,
  CreditCard,
  LayoutGrid,
  ListTodo,
  Settings2,
  SlidersHorizontal,
  Sparkles,
  Users,
} from "lucide-react";
import { AdminShell } from "@/components/admin/shell";

const NAV = [
  { href: "/platform", label: "Activity", icon: <Activity size={16} strokeWidth={2} /> },
  { href: "/platform/sites", label: "Sites", icon: <LayoutGrid size={16} strokeWidth={2} /> },
  { href: "/platform/customers", label: "Customers", icon: <Users size={16} strokeWidth={2} /> },
  { href: "/platform/plans", label: "Plans and prices", icon: <Sparkles size={16} strokeWidth={2} /> },
  { href: "/platform/stripe", label: "Stripe", icon: <CreditCard size={16} strokeWidth={2} /> },
  { href: "/platform/config", label: "Configuration", icon: <SlidersHorizontal size={16} strokeWidth={2} /> },
  { href: "/platform/audit", label: "Audit log", icon: <ListTodo size={16} strokeWidth={2} /> },
  { href: "/platform/settings", label: "Settings", icon: <Settings2 size={16} strokeWidth={2} /> },
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
