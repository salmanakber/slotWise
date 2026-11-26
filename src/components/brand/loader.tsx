import { cn } from "@/lib/utils";

/**
 * Self-contained branded loaders (inline keyframes) so dashboard, book page,
 * and the Webflow embed all animate the same — host CSS cannot strip them.
 */
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
  const kind = ["PULSE", "SPIN", "DRAW", "CALENDAR"].includes(style) ? style : "PULSE";

  return (
    <div
      className={cn("sw-ldr flex flex-col items-center justify-center gap-3", className)}
      style={{ ["--pac" as string]: accent }}
      role="status"
      aria-live="polite"
      data-style={kind}
    >
      <style>{`
        .sw-ldr { --pac: ${accent}; }
        .sw-ldr-mark {
          position: relative;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
        }
        .sw-ldr-label {
          font-size: 12.5px;
          font-weight: 700;
          letter-spacing: 0.01em;
          opacity: 0.82;
          text-align: center;
        }
        @keyframes sw-ldr-pulse {
          0%, 100% { transform: scale(.88); opacity: .45; }
          50% { transform: scale(1); opacity: 1; }
        }
        @keyframes sw-ldr-orbit {
          to { transform: rotate(360deg); }
        }
        @keyframes sw-ldr-dot {
          0%, 80%, 100% { transform: scale(.55); opacity: .35; }
          40% { transform: scale(1); opacity: 1; }
        }
        @keyframes sw-ldr-draw {
          0% { stroke-dashoffset: 28; opacity: .35; }
          55% { stroke-dashoffset: 0; opacity: 1; }
          100% { stroke-dashoffset: 0; opacity: .85; }
        }
        @keyframes sw-ldr-bounce {
          0%, 100% { transform: translateY(0); }
          45% { transform: translateY(-3px); }
        }
        @keyframes sw-ldr-fade {
          0%, 100% { opacity: .35; }
          50% { opacity: 1; }
        }
        .sw-ldr[data-style="PULSE"] .sw-ldr-ring-outer {
          position: absolute; inset: 0; border-radius: 50%;
          border: 2px solid color-mix(in srgb, var(--pac) 28%, transparent);
        }
        .sw-ldr[data-style="PULSE"] .sw-ldr-ring-mid {
          position: absolute; inset: 7px; border-radius: 50%;
          border: 2.5px solid color-mix(in srgb, var(--pac) 55%, transparent);
          animation: sw-ldr-pulse 1.25s ease-in-out infinite;
        }
        .sw-ldr[data-style="PULSE"] .sw-ldr-core {
          width: 14px; height: 14px; border-radius: 50%;
          background: var(--pac);
          box-shadow: 0 0 0 6px color-mix(in srgb, var(--pac) 16%, transparent);
          animation: sw-ldr-pulse 1.25s ease-in-out infinite .12s;
        }
        .sw-ldr[data-style="SPIN"] .sw-ldr-track {
          position: absolute; inset: 2px; border-radius: 50%;
          border: 3px solid color-mix(in srgb, var(--pac) 16%, transparent);
        }
        .sw-ldr[data-style="SPIN"] .sw-ldr-arc {
          position: absolute; inset: 2px; border-radius: 50%;
          border: 3px solid transparent;
          border-top-color: var(--pac);
          border-right-color: color-mix(in srgb, var(--pac) 55%, transparent);
          animation: sw-ldr-orbit .85s cubic-bezier(.5,.15,.5,.85) infinite;
        }
        .sw-ldr[data-style="SPIN"] .sw-ldr-hub {
          width: 8px; height: 8px; border-radius: 50%; background: var(--pac);
        }
        .sw-ldr[data-style="DRAW"] .sw-ldr-card {
          width: 40px; height: 40px; border-radius: 11px;
          border: 1.5px solid color-mix(in srgb, var(--pac) 35%, transparent);
          background: color-mix(in srgb, var(--pac) 8%, transparent);
          display: grid; place-items: center;
        }
        .sw-ldr[data-style="DRAW"] svg { width: 22px; height: 22px; }
        .sw-ldr[data-style="DRAW"] .sw-ldr-check {
          fill: none; stroke: var(--pac); stroke-width: 2.6;
          stroke-linecap: round; stroke-linejoin: round;
          stroke-dasharray: 28; stroke-dashoffset: 28;
          animation: sw-ldr-draw 1.35s ease-in-out infinite;
        }
        .sw-ldr[data-style="CALENDAR"] .sw-ldr-cal {
          width: 40px; height: 42px; border-radius: 10px; overflow: hidden;
          border: 1.5px solid color-mix(in srgb, var(--pac) 40%, transparent);
          background: #fff;
          box-shadow: 0 6px 14px color-mix(in srgb, var(--pac) 18%, transparent);
          animation: sw-ldr-bounce 1.4s ease-in-out infinite;
        }
        .sw-ldr[data-style="CALENDAR"] .sw-ldr-cal-top {
          height: 12px; background: var(--pac);
          display: flex; align-items: center; justify-content: center; gap: 5px;
        }
        .sw-ldr[data-style="CALENDAR"] .sw-ldr-cal-top i {
          width: 3px; height: 3px; border-radius: 50%; background: #fff; opacity: .9;
        }
        .sw-ldr[data-style="CALENDAR"] .sw-ldr-cal-body {
          height: 28px; display: grid; place-items: center;
          font-size: 15px; font-weight: 800; color: var(--pac);
          animation: sw-ldr-fade 1.4s ease-in-out infinite;
        }
        .sw-ldr[data-style="PULSE"] .sw-ldr-dots,
        .sw-ldr[data-style="SPIN"] .sw-ldr-dots { display: none; }
        .sw-ldr-dots { display: flex; gap: 5px; margin-top: -2px; }
        .sw-ldr-dots i {
          width: 5px; height: 5px; border-radius: 50%; background: var(--pac);
          animation: sw-ldr-dot 1.05s ease-in-out infinite;
        }
        .sw-ldr-dots i:nth-child(2) { animation-delay: .15s; }
        .sw-ldr-dots i:nth-child(3) { animation-delay: .3s; }
        @media (prefers-reduced-motion: reduce) {
          .sw-ldr * { animation: none !important; }
        }
      `}</style>

      <div className="sw-ldr-mark" aria-hidden>
        {kind === "PULSE" ? (
          <>
            <span className="sw-ldr-ring-outer" />
            <span className="sw-ldr-ring-mid" />
            <span className="sw-ldr-core" />
          </>
        ) : null}
        {kind === "SPIN" ? (
          <>
            <span className="sw-ldr-track" />
            <span className="sw-ldr-arc" />
            <span className="sw-ldr-hub" />
          </>
        ) : null}
        {kind === "DRAW" ? (
          <div className="sw-ldr-card">
            <svg viewBox="0 0 24 24">
              <path className="sw-ldr-check" d="M5 13.2 9.6 17.5 19 7" />
            </svg>
          </div>
        ) : null}
        {kind === "CALENDAR" ? (
          <div className="sw-ldr-cal">
            <div className="sw-ldr-cal-top">
              <i />
              <i />
            </div>
            <div className="sw-ldr-cal-body">{new Date().getDate()}</div>
          </div>
        ) : null}
      </div>

      {(kind === "DRAW" || kind === "CALENDAR") && (
        <div className="sw-ldr-dots" aria-hidden>
          <i />
          <i />
          <i />
        </div>
      )}

      <span className="sw-ldr-label">{label}</span>
    </div>
  );
}
