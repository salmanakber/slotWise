"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";

type Analytics = {
  totals: {
    sessionsAll: number;
    sessions7: number;
    sessions30: number;
    messagesAll: number;
    messages7: number;
    avgMessagesPerSession: number;
  };
  daily?: Array<{ date: string; label: string; sessions: number; questions: number }>;
  bySource?: Array<{ source: string; count: number }>;
  popularQuestions: Array<{ question: string; count: number }>;
  recentSessions: Array<{
    id: string;
    visitorKey: string;
    messageCount: number;
    startedAt: string;
    lastMessageAt: string;
    source: string;
    preview: string;
    lastAssistant: string | null;
  }>;
};

type Payload = {
  enabled: boolean;
  publicKey: string;
  analytics: Analytics;
  allowed?: boolean;
  planTier?: string;
  planLabel?: string;
  upgradeUrl?: string;
  upgradeLabel?: string;
};

function fmtWhen(iso: string) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function AiChatAnalyticsPage() {
  const [data, setData] = useState<Payload | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch("/api/site/calendar-chat", { cache: "no-store" });
    const json = await res.json();
    if (res.ok) setData(json);
    else setMsg(json.error || "Could not load chat analytics");
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function toggleEnabled(enabled: boolean) {
    if (!data?.allowed) return;
    setSaving(true);
    setMsg("");
    const res = await fetch("/api/site/calendar-chat", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled }),
    });
    const json = await res.json();
    if (res.ok) {
      setData(json);
      setMsg(enabled ? "Calendar chat is live for visitors" : "Calendar chat turned off");
    } else {
      setMsg(json.error || "Could not update");
    }
    setSaving(false);
  }

  const allowed = Boolean(data?.allowed);
  const t = data?.analytics.totals;
  const daily = data?.analytics.daily ?? [];
  const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.sessions, d.questions)));
  const maxQ = Math.max(1, ...(data?.analytics.popularQuestions.map((q) => q.count) ?? [1]));
  const sourceTotal = useMemo(
    () => (data?.analytics.bySource || []).reduce((n, s) => n + s.count, 0) || 1,
    [data?.analytics.bySource],
  );

  return (
    <div className="grid gap-4">
      <section
        className="relative overflow-hidden rounded-2xl border border-[var(--ln)] px-5 py-5 sm:px-6"
        style={{
          background:
            "linear-gradient(135deg, color-mix(in srgb, var(--ac) 16%, var(--pn)), var(--pn) 58%)",
        }}
      >
        <div
          className="pointer-events-none absolute -right-8 -top-10 h-40 w-40 rounded-full opacity-40"
          style={{ background: "radial-gradient(circle, var(--ac), transparent 70%)" }}
        />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <div className="mb-2 flex items-center gap-2">
              <span className="text-[11px] font-black uppercase tracking-[0.14em]" style={{ color: "var(--ac)" }}>
                Chat for Your Calendar
              </span>
              <em className="sw-tag !normal-case !tracking-normal">BETA</em>
              <em className="sw-tag !normal-case !tracking-normal">Business+</em>
            </div>
            <h1 className="m-0 text-[22px] font-extrabold tracking-tight sm:text-[26px]">
              Analytics for every visitor conversation
            </h1>
            <p className="m-0 mt-2 text-[13.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
              See questions, volume graphs, and chat threads from your booking calendar — so the right
              people find the right events.
            </p>
          </div>
          <div className="flex flex-col items-stretch gap-2 sm:items-end">
            {allowed ? (
              <label className="flex cursor-pointer items-center gap-2.5 rounded-xl border border-[var(--ln)] bg-[var(--pn)] px-3.5 py-2.5 text-[13px] font-bold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--ac)]"
                  checked={Boolean(data?.enabled)}
                  disabled={!data || saving}
                  onChange={(e) => void toggleEnabled(e.target.checked)}
                />
                {data?.enabled ? "Chat enabled on widget" : "Chat disabled"}
              </label>
            ) : (
              <Link
                href={data?.upgradeUrl || "/dashboard/plans"}
                className="sw-btn sw-btn-primary text-center text-[12.5px]"
              >
                Upgrade to {data?.upgradeLabel || "Business"}
              </Link>
            )}
            {data?.publicKey && allowed ? (
              <Link
                href={`/book/${data.publicKey}`}
                className="sw-btn text-center text-[12.5px]"
                target="_blank"
              >
                Preview booking page
              </Link>
            ) : null}
          </div>
        </div>
        {msg ? (
          <p className="relative mt-3 mb-0 text-[12.5px] font-semibold" style={{ color: "var(--ok)" }}>
            {msg}
          </p>
        ) : null}
      </section>

      {loading || !data ? (
        <div className="sw-card text-[13px]" style={{ color: "var(--mut)" }}>
          Loading chat analytics…
        </div>
      ) : !allowed ? (
        <section className="relative overflow-hidden rounded-2xl border border-[var(--ln)] bg-[var(--pn)] p-5">
          <div className="pointer-events-none absolute inset-0 backdrop-blur-[1.5px]" style={{ background: "color-mix(in srgb, var(--pn) 55%, transparent)" }} />
          <div className="relative mx-auto max-w-lg py-8 text-center">
            <div
              className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-2xl text-lg font-black"
              style={{ background: "color-mix(in srgb, var(--ac) 18%, transparent)", color: "var(--ac)" }}
            >
              ✦
            </div>
            <h2 className="m-0 text-[18px] font-extrabold">Business & Agency unlock Chat</h2>
            <p className="mx-auto mt-2 max-w-md text-[13.5px] leading-relaxed" style={{ color: "var(--mut)" }}>
              You’re on {data.planLabel || "your current"} plan. Upgrade to enable visitor calendar chat,
              natural AI answers trained on your events & openings, plus owner analytics and graphs.
            </p>
            <Link href={data.upgradeUrl || "/dashboard/plans"} className="sw-btn sw-btn-primary mt-4 inline-flex">
              Upgrade to {data.upgradeLabel || "Business"}
            </Link>
            <div className="mt-8 grid gap-2 opacity-50 sm:grid-cols-3">
              {["14-day activity graph", "Popular questions", "Live conversation feed"].map((x) => (
                <div key={x} className="rounded-xl border border-[var(--ln)] px-3 py-4 text-[12px] font-bold">
                  {x}
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {[
              { label: "Sessions (7d)", value: t?.sessions7 ?? 0, hint: `${t?.sessions30 ?? 0} in 30 days` },
              { label: "Questions (7d)", value: t?.messages7 ?? 0, hint: `${t?.messagesAll ?? 0} all time` },
              {
                label: "Avg depth",
                value: t?.avgMessagesPerSession ?? 0,
                hint: "Messages per session",
              },
              {
                label: "All sessions",
                value: t?.sessionsAll ?? 0,
                hint: data.enabled ? "Live · accepting chats" : "Paused",
              },
            ].map((k) => (
              <div key={k.label} className="sw-card">
                <div className="text-[12.5px]" style={{ color: "var(--mut)" }}>
                  {k.label}
                </div>
                <div className="text-[28px] font-extrabold leading-tight">{k.value}</div>
                <div className="text-[12px] font-semibold" style={{ color: "var(--ok)" }}>
                  {k.hint}
                </div>
              </div>
            ))}
          </div>

          <div className="grid gap-3.5 lg:grid-cols-5">
            <section className="sw-card lg:col-span-3">
              <div className="mb-3 flex items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[15px] font-extrabold">Chat activity</h2>
                  <p className="m-0 mt-0.5 text-[12.5px]" style={{ color: "var(--mut)" }}>
                    Last 14 days · sessions vs questions
                  </p>
                </div>
                <div className="flex gap-3 text-[11px] font-bold">
                  <span className="flex items-center gap-1.5">
                    <i className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--ac)" }} />
                    Sessions
                  </span>
                  <span className="flex items-center gap-1.5" style={{ color: "var(--mut)" }}>
                    <i
                      className="inline-block h-2 w-2 rounded-full"
                      style={{ background: "color-mix(in srgb, var(--ink) 35%, transparent)" }}
                    />
                    Questions
                  </span>
                </div>
              </div>
              <div className="flex h-[160px] items-end gap-1.5">
                {daily.map((d) => (
                  <div key={d.date} className="group flex min-w-0 flex-1 flex-col items-center justify-end gap-1">
                    <div className="flex h-[130px] w-full items-end justify-center gap-0.5">
                      <span
                        className="w-[45%] rounded-t-md transition"
                        title={`${d.sessions} sessions`}
                        style={{
                          height: `${Math.max(4, (d.sessions / maxDaily) * 100)}%`,
                          background: "var(--ac)",
                        }}
                      />
                      <span
                        className="w-[45%] rounded-t-md transition"
                        title={`${d.questions} questions`}
                        style={{
                          height: `${Math.max(4, (d.questions / maxDaily) * 100)}%`,
                          background: "color-mix(in srgb, var(--ink) 22%, transparent)",
                        }}
                      />
                    </div>
                    <span className="truncate text-[9px] font-semibold" style={{ color: "var(--mut)" }}>
                      {d.label.replace(/^[A-Za-z]+ /, "")}
                    </span>
                  </div>
                ))}
              </div>
            </section>

            <section className="sw-card lg:col-span-2">
              <h2 className="m-0 text-[15px] font-extrabold">Where chats start</h2>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
                Source mix · last 14 days
              </p>
              <div className="mt-4 grid gap-2.5">
                {(data.analytics.bySource || []).length ? (
                  (data.analytics.bySource || []).map((s) => (
                    <div key={s.source} className="grid gap-1">
                      <div className="flex justify-between text-[12.5px] font-semibold">
                        <span className="capitalize">{s.source.replace("_", " ")}</span>
                        <span>{s.count}</span>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "color-mix(in srgb, var(--ln) 80%, transparent)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(8, (s.count / sourceTotal) * 100)}%`,
                            background: "var(--ac)",
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
                    Sources appear once visitors start chatting.
                  </p>
                )}
              </div>
            </section>
          </div>

          <div className="grid gap-3.5 lg:grid-cols-5">
            <section className="sw-card lg:col-span-2">
              <h2 className="m-0 text-[15px] font-extrabold">Popular questions</h2>
              <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
                What visitors ask most — tune events and copy
              </p>
              <div className="mt-4 grid gap-2.5">
                {data.analytics.popularQuestions.length ? (
                  data.analytics.popularQuestions.map((q) => (
                    <div key={q.question} className="grid gap-1">
                      <div className="flex items-start justify-between gap-2 text-[12.5px]">
                        <span className="font-semibold leading-snug">{q.question}</span>
                        <b className="shrink-0 tabular-nums">{q.count}</b>
                      </div>
                      <div
                        className="h-1.5 overflow-hidden rounded-full"
                        style={{ background: "color-mix(in srgb, var(--ln) 80%, transparent)" }}
                      >
                        <div
                          className="h-full rounded-full"
                          style={{
                            width: `${Math.max(8, (q.count / maxQ) * 100)}%`,
                            background: "var(--ac)",
                          }}
                        />
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
                    No questions yet. Share your booking page — chats will appear here.
                  </p>
                )}
              </div>
            </section>

            <section className="sw-card lg:col-span-3">
              <div className="flex items-end justify-between gap-2">
                <div>
                  <h2 className="m-0 text-[15px] font-extrabold">Recent conversations</h2>
                  <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
                    Latest visitor threads on your calendar
                  </p>
                </div>
                <button type="button" className="sw-btn text-[12px]" onClick={() => void load()}>
                  Refresh
                </button>
              </div>
              <div className="mt-3 grid gap-2">
                {data.analytics.recentSessions.length ? (
                  data.analytics.recentSessions.slice(0, 5).map((s) => (
                    <article
                      key={s.id}
                      className="rounded-xl border border-[var(--ln)] px-3.5 py-3"
                      style={{
                        background: "color-mix(in srgb, var(--soft, var(--pn)) 70%, transparent)",
                      }}
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span
                            className="grid h-7 w-7 place-items-center rounded-lg text-[11px] font-black"
                            style={{
                              background: "color-mix(in srgb, var(--ac) 18%, transparent)",
                              color: "var(--ac)",
                            }}
                          >
                            {s.visitorKey.slice(0, 2).toUpperCase()}
                          </span>
                          <div>
                            <div className="text-[12.5px] font-extrabold">Visitor · {s.visitorKey}</div>
                            <div className="text-[11px]" style={{ color: "var(--mut)" }}>
                              {fmtWhen(s.lastMessageAt)} · {s.messageCount} msgs · {s.source}
                            </div>
                          </div>
                        </div>
                      </div>
                      <p className="mb-0 mt-2 text-[13px] font-semibold leading-snug">“{s.preview}”</p>
                      {s.lastAssistant ? (
                        <p className="mb-0 mt-1.5 text-[12px] leading-relaxed" style={{ color: "var(--mut)" }}>
                          {s.lastAssistant}
                          {s.lastAssistant.length >= 160 ? "…" : ""}
                        </p>
                      ) : null}
                    </article>
                  ))
                ) : (
                  <p className="m-0 text-[13px]" style={{ color: "var(--mut)" }}>
                    Conversations will show up as soon as someone uses Ask the calendar.
                  </p>
                )}
              </div>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
