"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CancelBookingButton({ token }: { token: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  async function cancel() {
    if (!window.confirm("Cancel this booking?")) return;
    setPending(true);
    try {
      await fetch(`/api/v1/manage/${token}/cancel`, { method: "POST" });
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <button type="button" className="sw-btn" disabled={pending} onClick={cancel}>
      {pending ? "Cancelling…" : "Cancel booking"}
    </button>
  );
}
