"use client";

type Tool = { id: string; label: string };

function BrandMark({ id }: { id: string }) {
  if (id === "zoom") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill="#2D8CFF" />
        <path
          fill="#fff"
          d="M6.2 8.2h6.1c.9 0 1.6.7 1.6 1.6v4.4c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V9.8c0-.9.7-1.6 1.6-1.6zm8.3 1.5 3.6-2.1c.4-.2.9.1.9.5v7.8c0 .5-.5.8-.9.5l-3.6-2.1v-4.6z"
        />
      </svg>
    );
  }
  if (id === "teams") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill="#6264A7" />
        <path
          fill="#fff"
          d="M8.2 7.2h4.2c.7 0 1.2.5 1.2 1.2v7.2c0 .7-.5 1.2-1.2 1.2H8.2c-.7 0-1.2-.5-1.2-1.2V8.4c0-.7.5-1.2 1.2-1.2zm6.4 2.2h2.4c.6 0 1 .4 1 1v4.8c0 .9-.7 1.6-1.6 1.6h-1.8V9.4zM10.3 5.4a1.6 1.6 0 1 1 0 3.2 1.6 1.6 0 0 1 0-3.2z"
        />
      </svg>
    );
  }
  if (id === "google_calendar") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill="#fff" stroke="#E8EAED" />
        <path fill="#4285F4" d="M5 4h14v3.2H5z" />
        <path fill="#EA4335" d="M16.5 7.2H19V18a2 2 0 0 1-2 2h-0.5V7.2z" />
        <path fill="#34A853" d="M5 7.2h2.5V20H7a2 2 0 0 1-2-2V7.2z" />
        <path fill="#FBBC04" d="M7.5 16.5H16.5V20H7.5z" />
        <text x="12" y="14.8" textAnchor="middle" fontSize="7.5" fontWeight="800" fill="#1a73e8">
          31
        </text>
      </svg>
    );
  }
  if (id === "apple_calendar") {
    return (
      <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="7" fill="#111" />
        <path
          fill="#fff"
          d="M14.7 7.4c-.7.1-1.6.5-2.1 1.1-.5.5-.9 1.3-.8 2 .8.1 1.6-.4 2.1-1 .5-.5.9-1.3.8-2.1zm1.9 3c-1.1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.2.7-2.7 1.7-1.2 2.1-.3 5.2.8 6.9.6.8 1.2 1.7 2.1 1.7.8 0 1.1-.5 2.1-.5s1.2.5 2.1.5c.9 0 1.4-.8 2-.1.3-.5.5-.7.7-1.2-1.7-.7-2-3.1-.5-4.1-.7-.9-1.8-1.4-1.9-1.4z"
        />
      </svg>
    );
  }
  // meet default
  return (
    <svg width={28} height={28} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="7" fill="#00897B" />
      <path
        fill="#fff"
        d="M7 8.5h6.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 14v-4A1.5 1.5 0 0 1 7 8.5zm9.2 1.2 2.5-1.5c.4-.2.8.1.8.5v6.6c0 .4-.4.7-.8.5l-2.5-1.5v-4.6z"
      />
    </svg>
  );
}

function tint(id: string) {
  if (id === "zoom") return "#2D8CFF";
  if (id === "teams") return "#6264A7";
  if (id === "google_calendar") return "#4285F4";
  if (id === "apple_calendar") return "#111111";
  return "#00897B";
}

function ctaLabel(provider: string | null | undefined) {
  if (provider === "google_calendar") return "Open in Google Calendar";
  if (provider === "apple_calendar") return "Add to Apple Calendar";
  if (provider === "zoom") return "Join Zoom";
  if (provider === "teams") return "Join Teams";
  return "Join Google Meet";
}

export function PartnerAppsPanel({
  tools,
  busy,
  error,
  accent,
  onAccent,
  ink,
  mut,
  line,
  panel,
  radius,
  onPick,
  onSkip,
  onDone,
}: {
  tools: Tool[];
  busy: string | null;
  error: string | null;
  accent: string;
  onAccent: string;
  ink: string;
  mut: string;
  line: string;
  panel: string;
  radius: number;
  onPick: (id: string) => void;
  onSkip: () => void;
  onDone: () => void;
}) {
  if (!tools.length) return null;
  const cols = tools.length === 1 ? 1 : tools.length === 2 ? 2 : 3;

  return (
    <div
      className="overflow-hidden text-left"
      style={{
        borderRadius: Math.max(radius - 2, 16),
        border: `1px solid ${line}`,
        background: `linear-gradient(165deg, color-mix(in srgb, ${accent} 10%, ${panel}) 0%, ${panel} 48%)`,
        boxShadow: `0 18px 40px color-mix(in srgb, ${ink} 6%, transparent)`,
      }}
    >
      <div className="px-4 pb-1 pt-4">
        <div
          className="mb-1 text-[10px] font-black uppercase tracking-[0.14em]"
          style={{ color: accent }}
        >
          Partner apps
        </div>
        <div className="text-[15px] font-extrabold tracking-tight" style={{ color: ink }}>
          Add calendar or video
        </div>
        <p className="m-0 mt-1 max-w-[36ch] text-[12px] leading-relaxed" style={{ color: mut }}>
          Optional — tap an app to attach it to this booking, or skip.
        </p>
      </div>

      <div
        className="grid gap-2.5 px-4 py-3.5"
        style={{ gridTemplateColumns: `repeat(${Math.min(cols, 3)}, minmax(0, 1fr))` }}
      >
        {tools.map((tool) => {
          const active = busy === tool.id;
          const color = tint(tool.id);
          return (
            <button
              key={tool.id}
              type="button"
              disabled={Boolean(busy)}
              onClick={() => onPick(tool.id)}
              className="group relative flex flex-col items-center gap-2.5 px-2.5 py-3.5 text-center transition disabled:opacity-55"
              style={{
                borderRadius: Math.max(radius - 6, 14),
                border: `1px solid color-mix(in srgb, ${color} 22%, ${line})`,
                background: panel,
                boxShadow: active
                  ? `0 0 0 2px color-mix(in srgb, ${color} 35%, transparent)`
                  : `0 1px 0 color-mix(in srgb, ${ink} 4%, transparent)`,
              }}
            >
              <span
                className="grid h-12 w-12 place-items-center rounded-2xl transition group-hover:scale-[1.04]"
                style={{
                  background: `color-mix(in srgb, ${color} 14%, ${panel})`,
                  boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${color} 18%, transparent)`,
                }}
              >
                <BrandMark id={tool.id} />
              </span>
              <span className="text-[12px] font-extrabold leading-tight" style={{ color: ink }}>
                {active ? "Working…" : tool.label}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p className="m-0 px-4 pb-2 text-[12px] font-semibold" style={{ color: "#c0392b" }}>
          {error}
        </p>
      ) : null}

      <div
        className="flex items-center justify-end gap-2 border-t px-4 py-3"
        style={{ borderColor: line }}
      >
        <button
          type="button"
          className="px-3 py-2 text-[12.5px] font-bold"
          style={{ color: mut, borderRadius: 999 }}
          disabled={Boolean(busy)}
          onClick={onSkip}
        >
          Skip
        </button>
        <button
          type="button"
          className="px-4 py-2 text-[12.5px] font-extrabold transition hover:brightness-105"
          style={{
            borderRadius: 999,
            background: accent,
            color: onAccent,
            boxShadow: `0 10px 22px color-mix(in srgb, ${accent} 28%, transparent)`,
          }}
          disabled={Boolean(busy)}
          onClick={onDone}
        >
          Done
        </button>
      </div>
    </div>
  );
}

export function PartnerReadyLink({
  href,
  provider,
  accent,
  onAccent,
  radius,
}: {
  href: string;
  provider: string | null | undefined;
  accent: string;
  onAccent: string;
  radius: number;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      className="mx-auto inline-flex items-center justify-center gap-2.5 px-5 py-3 text-[13px] font-extrabold transition hover:brightness-105"
      style={{
        background: accent,
        color: onAccent,
        borderRadius: Math.max(radius - 4, 999),
        boxShadow: `0 14px 28px color-mix(in srgb, ${accent} 30%, transparent)`,
      }}
    >
      <BrandMark id={provider || "meet"} />
      {ctaLabel(provider)}
    </a>
  );
}
