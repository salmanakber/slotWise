"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { SiteStatus } from "@prisma/client";

export function SiteStatusToggle({
  siteId,
  status,
  live,
}: {
  siteId: string;
  status: SiteStatus;
  live: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const active = status === "ACTIVE";

  async function toggle() {
    if (!live) {
      window.alert("Connect Postgres and seed data to activate/deactivate real sites.");
      return;
    }
    setPending(true);
    try {
      const next = active ? "INACTIVE" : "ACTIVE";
      await fetch(`/api/platform/sites/${siteId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: next }),
      });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="sw-btn" disabled={pending} onClick={toggle}>
      {pending ? "Saving…" : active ? "Deactivate" : "Activate"}
    </button>
  );
}
