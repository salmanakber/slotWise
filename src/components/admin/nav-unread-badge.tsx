"use client";

import { useEffect, useState } from "react";

/** Polls workspace inbox unread count for the sidebar Notifications item. */
export function useInboxUnread(pollMs = 60_000) {
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/site/inbox", { cache: "no-store" })
        .then((r) => r.json())
        .then((d) => {
          if (!cancelled && typeof d.unread === "number") setUnread(d.unread);
        })
        .catch(() => undefined);
    };
    load();
    const id = window.setInterval(load, pollMs);
    const onFocus = () => load();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [pollMs]);

  return unread;
}

export function NavUnreadDot({ count }: { count: number }) {
  if (!count) return null;
  return (
    <span
      className="ml-auto inline-flex min-w-[18px] items-center justify-center rounded-full px-1.5 py-0.5 text-[10px] font-black leading-none"
      style={{
        background: "color-mix(in srgb, var(--ac) 22%, transparent)",
        color: "var(--at, var(--ac))",
      }}
      aria-label={`${count} unread`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
