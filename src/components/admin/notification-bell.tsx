"use client";

import Link from "next/link";
import { Bell } from "lucide-react";
import { useInboxUnread } from "@/components/admin/nav-unread-badge";

/** Header bell with unread badge — links to workspace notifications inbox. */
export function NotificationBell({ href = "/dashboard/notifications" }: { href?: string }) {
  const unread = useInboxUnread(45_000);
  const label = unread > 0 ? `${unread} unread notification${unread === 1 ? "" : "s"}` : "Notifications";

  return (
    <Link
      href={href}
      className="relative inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--ln)] bg-[var(--bg)] text-[var(--ink)] transition hover:border-[var(--ac)] hover:text-[var(--at,var(--ac))]"
      aria-label={label}
      title={label}
    >
      <Bell size={16} strokeWidth={2.25} />
      {unread > 0 ? (
        <span
          className="absolute -right-0.5 -top-0.5 inline-flex min-w-[16px] items-center justify-center rounded-full px-1 text-[9px] font-black leading-[16px] text-white"
          style={{ background: "var(--ac)" }}
        >
          {unread > 99 ? "99+" : unread}
        </span>
      ) : null}
    </Link>
  );
}
