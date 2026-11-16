"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";

export function FlagToggle({
  flagKey,
  enabled,
  live,
}: {
  flagKey: string;
  enabled: boolean;
  live: boolean;
}) {
  const router = useRouter();
  const [on, setOn] = useState(enabled);
  const [pending, setPending] = useState(false);

  async function toggle() {
    const next = !on;
    setOn(next);
    if (!live) return;
    setPending(true);
    try {
      await fetch(`/api/platform/flags/${flagKey}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      router.refresh();
    } catch {
      setOn(!next);
    } finally {
      setPending(false);
    }
  }

  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={pending}
      onClick={toggle}
      className={cn("relative h-6 w-[42px] rounded-full border-0 transition", on ? "bg-[var(--ac)]" : "bg-[var(--ln)]")}
    >
      <span
        className={cn(
          "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition",
          on && "translate-x-[18px]",
        )}
      />
    </button>
  );
}
