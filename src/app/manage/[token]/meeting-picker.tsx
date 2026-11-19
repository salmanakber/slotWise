"use client";

import { useEffect, useState } from "react";
import { PartnerAppsPanel, PartnerReadyLink } from "@/components/widget/partner-apps";

type Tool = { id: string; label: string };

function providerTitle(provider: string | null) {
  if (provider === "zoom") return "Zoom ready";
  if (provider === "teams") return "Teams ready";
  if (provider === "google_calendar") return "Added to Google Calendar";
  return "Google Meet ready";
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

  const accent = "var(--ac, #f5a000)";
  const onAccent = "#fff";
  const ink = "var(--ink, #0f1b2d)";
  const mut = "var(--mut, #6a7588)";
  const line = "var(--ln, #e1e6ee)";
  const panel = "var(--pn, #fff)";

  if (meetingUrl) {
    return (
      <div className="mt-4 overflow-hidden rounded-2xl border border-[var(--ln)] px-4 py-4">
        <div className="mb-2.5 text-[13px] font-extrabold" style={{ color: ink }}>
          {providerTitle(provider)}
        </div>
        <PartnerReadyLink
          href={meetingUrl}
          provider={provider}
          accent={accent}
          onAccent={onAccent}
          radius={16}
        />
      </div>
    );
  }

  if (skipped) {
    return (
      <div className="mt-4 rounded-2xl border border-[var(--ln)] px-4 py-3.5">
        <p className="m-0 text-[12.5px]" style={{ color: mut }}>
          No calendar or video added — you’re all set.
        </p>
      </div>
    );
  }

  if (!tools.length) return null;

  return (
    <div className="mt-4">
      <PartnerAppsPanel
        tools={tools}
        busy={busy}
        error={error || null}
        accent={accent}
        onAccent={onAccent}
        ink={ink}
        mut={mut}
        line={line}
        panel={panel}
        radius={18}
        onPick={(id) => void pick(id)}
        onSkip={() => setSkipped(true)}
        onDone={() => setSkipped(true)}
      />
    </div>
  );
}
