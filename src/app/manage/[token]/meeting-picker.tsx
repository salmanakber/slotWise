"use client";

import { useEffect, useState } from "react";
import { PartnerAppsPanel, PartnerReadyLink } from "@/components/widget/partner-apps";

type Tool = { id: string; label: string };

type Theme = {
  accent: string;
  onAccent: string;
  ink: string;
  mut: string;
  line: string;
  panel: string;
  radius: number;
};

function providerTitle(provider: string | null) {
  if (provider === "zoom") return "Zoom ready";
  if (provider === "teams") return "Teams ready";
  if (provider === "google_calendar") return "Added to Google Calendar";
  return "Google Meet ready";
}

const DEFAULT_THEME: Theme = {
  accent: "#f5a000",
  onAccent: "#1a1203",
  ink: "#f4f1ea",
  mut: "#9aa7b8",
  line: "rgba(255,255,255,.12)",
  panel: "rgba(255,255,255,.04)",
  radius: 20,
};

export function MeetingPicker({
  token,
  initialUrl,
  initialProvider,
  theme,
}: {
  token: string;
  initialUrl: string | null;
  initialProvider: string | null;
  theme?: Partial<Theme>;
}) {
  const t = { ...DEFAULT_THEME, ...theme };
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
      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-4">
        <div className="mb-3 text-[13px] font-extrabold" style={{ color: t.ink }}>
          {providerTitle(provider)}
        </div>
        <PartnerReadyLink
          href={meetingUrl}
          provider={provider}
          accent={t.accent}
          onAccent={t.onAccent}
          radius={t.radius}
        />
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3.5">
        <p className="m-0 text-[12.5px]" style={{ color: t.mut }}>
          No calendar or video added — you’re all set.
        </p>
      </div>
    );
  }

  if (!tools.length) return null;

  return (
    <PartnerAppsPanel
      tools={tools}
      busy={busy}
      error={error || null}
      accent={t.accent}
      onAccent={t.onAccent}
      ink={t.ink}
      mut={t.mut}
      line={t.line}
      panel={t.panel}
      radius={t.radius}
      onPick={(id) => void pick(id)}
      onSkip={() => setSkipped(true)}
      onDone={() => setSkipped(true)}
    />
  );
}
