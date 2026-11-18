"use client";

import { useEffect, useState } from "react";

type Tool = { id: string; label: string };

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
        <div className="text-[13px] font-extrabold">
          {provider === "zoom" ? "Zoom" : "Google Meet"} ready
        </div>
        <a
          href={meetingUrl}
          target="_blank"
          rel="noreferrer"
          className="sw-btn sw-btn-primary mt-2 inline-flex text-[12.5px]"
        >
          Join meeting
        </a>
      </div>
    );
  }

  if (!tools.length) return null;

  return (
    <div className="mt-4 rounded-xl border border-[var(--ln)] px-3.5 py-3">
      <div className="text-[13px] font-extrabold">Add a video call</div>
      <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
        Optional — create a Zoom or Google Meet link for this booking.
      </p>
      <div className="mt-2.5 flex flex-wrap gap-2">
        {tools.map((t) => (
          <button
            key={t.id}
            type="button"
            className="sw-btn sw-btn-primary text-[12.5px]"
            disabled={Boolean(busy)}
            onClick={() => void pick(t.id)}
          >
            {busy === t.id ? "Creating…" : t.label}
          </button>
        ))}
      </div>
      {error ? <p className="mb-0 mt-2 text-[12.5px] font-semibold text-[var(--bad,#c0392b)]">{error}</p> : null}
    </div>
  );
}
