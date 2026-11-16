import { cn } from "@/lib/utils";

const styleClass: Record<string, string> = {
  PULSE: "ldr-pulse",
  SPIN: "ldr-spin",
  DRAW: "ldr-draw",
  CALENDAR: "ldr-calendar",
};

export function BrandLoader({
  style = "PULSE",
  accent = "#f5a000",
  label = "Finding open slots…",
  className,
}: {
  style?: string;
  accent?: string;
  label?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3",
        styleClass[style] ?? "ldr-pulse",
        className,
      )}
      style={{ ["--pac" as string]: accent }}
      role="status"
      aria-live="polite"
    >
      <div className="h-[52px] w-[52px]">
        <svg viewBox="0 0 64 64" fill="none" aria-hidden="true" className="h-full w-full">
          <rect
            className="ldr-slot"
            x="18"
            y="16"
            width="28"
            height="24"
            rx="4"
            stroke="var(--pac)"
            strokeWidth="2.5"
            fill="color-mix(in srgb, var(--pac) 12%, transparent)"
          />
          <circle className="ldr-dot" cx="38" cy="24" r="3" fill="var(--pac)" />
          <circle
            className="ldr-ring"
            cx="42"
            cy="46"
            r="10"
            stroke="var(--pac)"
            strokeWidth="2.5"
            fill="color-mix(in srgb, var(--pac) 10%, transparent)"
          />
          <path d="M42 41v5l3.5 2" stroke="var(--pac)" strokeWidth="2" strokeLinecap="round" />
          <path
            className="ldr-s"
            d="M12 22c6-10 18-8 20 0s-8 10-4 16 16 4 18-6"
            stroke="var(--pac)"
            strokeWidth="3"
            strokeLinecap="round"
            fill="none"
          />
        </svg>
      </div>
      <span className="text-[12.5px] font-bold opacity-80">{label}</span>
    </div>
  );
}
