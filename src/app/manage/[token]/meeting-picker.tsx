"use client";

import { useEffect, useState } from "react";

type Tool = { id: string; label: string };

function BrandIcon({ id }: { id: string }) {
  if (id === "zoom") {
    return (
      <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#2D8CFF" />
        <path
          fill="#fff"
          d="M6.2 8.2h6.1c.9 0 1.6.7 1.6 1.6v4.4c0 .9-.7 1.6-1.6 1.6H6.2c-.9 0-1.6-.7-1.6-1.6V9.8c0-.9.7-1.6 1.6-1.6zm8.3 1.5 3.6-2.1c.4-.2.9.1.9.5v7.8c0 .5-.5.8-.9.5l-3.6-2.1v-4.6z"
        />
      </svg>
    );
  }
  if (id === "google_calendar") {
    return (
      <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
        <rect width="24" height="24" rx="6" fill="#fff" stroke="#DADCE0" />
        <path fill="#4285F4" d="M6 4h12v3H6z" />
        <path fill="#EA4335" d="M17 7h3v12a2 2 0 0 1-2 2h-1V7z" />
        <path fill="#34A853" d="M4 7h3v14H6a2 2 0 0 1-2-2V7z" />
        <path fill="#FBBC04" d="M7 17h10v4H7z" />
        <rect x="7" y="9" width="10" height="7" fill="#F1F3F4" />
      </svg>
    );
  }
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" aria-hidden>
      <rect width="24" height="24" rx="6" fill="#00897B" />
      <path
        fill="#fff"
        d="M7 8.5h6.5a1.5 1.5 0 0 1 1.5 1.5v4a1.5 1.5 0 0 1-1.5 1.5H7A1.5 1.5 0 0 1 5.5 14v-4A1.5 1.5 0 0 1 7 8.5zm9.2 1.2 2.5-1.5c.4-.2.8.1.8.5v6.6c0 .4-.4.7-.8.5l-2.5-1.5v-4.6z"
      />
    </svg>
  );
}

function providerTitle(provider: string | null) {
  if (provider === "zoom") return "Zoom ready";
  if (provider === "google_calendar") return "Added to Google Calendar";
  return "Google Meet ready";
}

function providerCta(provider: string | null) {
  if (provider === "google_calendar") return "Open in Google Calendar";
  if (provider === "zoom") return "Join Zoom";
  return "Join meeting";
}

export function MeetingPicker({
  token,
  initialUrl,
  initialProvider,
}: {
  token: string;
  initialUrl: string | null;
  initialProvider: string | null;
}) {
  const [meetingUrl, setMeetingUrl] = useState(initialUrl);
  const [provider, setProvider] = useState(initialProvider);
  const [tools, setTools] = useState<Tool[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [skipped, setSkipped] = useState(false);

  useEffect(() => {
    if (meetingUrl) return;
    fetch(`/api/v1/manage/${token}/meeting`)
      .then((r) => r.json())
      .then((d) => {
        if (d.meetingUrl) {
          setMeetingUrl(d.meetingUrl);
          setProvider(d.meetingProvider);
        } else if (Array.isArray(d.tools)) {
          setTools(d.tools);
        }
      })
      .catch(() => undefined);
  }, [token, meetingUrl]);

  async function pick(id: string) {
    setBusy(id);
    setError("");
    try {
      const res = await fetch(`/api/v1/manage/${token}/meeting`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create meeting");
      setMeetingUrl(data.meetingUrl);
      setProvider(data.meetingProvider);
      setTools([]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create meeting");
    } finally {
      setBusy(null);
    }
  }

  if (meetingUrl) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--ln)] px-3.5 py-3">
        <div className="flex items-center gap-2 text-[13px] font-extrabold">
          <BrandIcon id={provider || "meet"} />
          {providerTitle(provider)}
        </div>
        <a
          href={meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="sw-btn sw-btn-primary mt-2.5 inline-flex text-[12.5px]"
        >
          {providerCta(provider)}
        </a>
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="mt-4 rounded-xl border border-[var(--ln)] px-3.5 py-3">
        <p className="m-0 text-[12.5px]" style={{ color: "var(--mut)" }}>
          No calendar or video added — you’re all set.
        </p>
      </div>
    );
  }

  if (!tools.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--ln)] px-3.5 py-3.5">
      <div className="text-[13px] font-extrabold">Add calendar or video</div>
      <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
        Optional — choose a partner app, or skip if you don’t need one.
      </p>
      <div
        className="mt-3 grid gap-2"
        style={{
          gridTemplateColumns: tools.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr",
        }}
      >
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            className="flex flex-col items-center gap-2 rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3 py-3.5 text-center disabled:opacity-50"
            disabled={Boolean(busy)}
            onClick={() => void pick(t.id)}
          >
            <span
              className="grid h-11 w-11 place-items-center rounded-xl"
              style={{
                background:
                  t.id === "zoom"
                    ? "color-mix(in srgb, #2D8CFF 14%, transparent)"
                    : t.id === "google_calendar"
                      ? "color-mix(in srgb, #4285F4 14%, transparent)"
                      : "color-mix(in srgb, #00897B 14%, transparent)",
              }}
            >
              <BrandIcon id={t.id} />
            </span>
            <span className="text-[12.5px] font-extrabold">
              {busy === t.id ? "Creating…" : t.label}
            </span>
          </button>
        ))}
      </div>
      {error ? (
        <p className="mb-0 mt-2 text-[12.5px] font-semibold text-[var(--bad,#c0392b)]">{error}</p>
      ) : null}
      <div className="mt-3 flex items-center justify-end gap-2">
        <button
          type="button"
          className="sw-btn text-[12.5px]"
          disabled={Boolean(busy)}
          onClick={() => setSkipped(true)}
        >
          Skip
        </button>
        <button
          type="button"
          className="sw-btn sw-btn-primary text-[12.5px]"
          disabled={Boolean(busy)}
          onClick={() => setSkipped(true)}
        >
          Done
        </button>
      </div>
    </div>
  );
}
