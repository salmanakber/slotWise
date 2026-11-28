"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { wixEmbedSnippet } from "@/lib/wix/embed-snippet";

/**
 * Wix-only install panel for the owner dashboard.
 * Does not replace or alter the Webflow “Add to your website” block.
 */
export function WixInstallCard({ publicKey }: { publicKey: string }) {
  const [channel, setChannel] = useState<"WEBFLOW" | "WIX" | "DIRECT">("WEBFLOW");
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [msg, setMsg] = useState("");

  const snippet = useMemo(() => wixEmbedSnippet(publicKey), [publicKey]);

  useEffect(() => {
    let cancelled = false;
    void fetch("/api/site/channel", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (cancelled || !data?.channel) return;
        if (data.channel === "WIX" || data.channel === "DIRECT" || data.channel === "WEBFLOW") {
          setChannel(data.channel);
        }
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  const markWix = useCallback(async () => {
    setSaving(true);
    setMsg("");
    try {
      const res = await fetch("/api/site/channel", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ channel: "WIX" }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => null);
        throw new Error(err?.error || "Could not update channel");
      }
      setChannel("WIX");
      setMsg("This site is marked for Wix. Webflow connection (if any) was not changed.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }, []);

  const copySnippet = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setMsg("Copy failed — select the snippet manually.");
    }
  }, [snippet]);

  return (
    <section className="sw-card">
      <h2 className="mb-1 text-[15px] font-extrabold">Add to Wix</h2>
      <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
        Same Slotwise widget runtime as everywhere else. Paste into a Wix{" "}
        <b>Embed</b> / custom HTML element, then publish. This does not change your Webflow Designer
        setup.
      </p>

      <ol className="mb-3 list-decimal space-y-1.5 pl-5 text-[13px]" style={{ color: "var(--mut)" }}>
        <li>In Wix Editor, add an Embed / HTML element where the booking should appear.</li>
        <li>Paste the snippet below (mount + script).</li>
        <li>Publish the Wix site and hard-refresh the live page.</li>
      </ol>

      <pre
        className="mb-3 max-h-[160px] overflow-auto rounded-[12px] border border-[var(--ln)] bg-[var(--bg)] p-3 text-[11.5px] leading-relaxed"
        style={{ color: "var(--ink)" }}
      >
        {snippet}
      </pre>

      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="sw-btn sw-btn-primary" onClick={() => void copySnippet()}>
          {copied ? "Copied" : "Copy Wix snippet"}
        </button>
        <a href="/api/wix/install" className="sw-btn">
          Connect Wix App
        </a>
        <Link href="/docs/wix" className="sw-btn" target="_blank">
          Wix docs
        </Link>
        {channel !== "WIX" ? (
          <button
            type="button"
            className="sw-btn"
            disabled={saving || !publicKey}
            onClick={() => void markWix()}
          >
            {saving ? "Saving…" : "Mark site as Wix"}
          </button>
        ) : (
          <em className="sw-tag">Channel: Wix</em>
        )}
      </div>
      {msg ? (
        <p className="mb-0 mt-2 text-[12.5px] font-semibold" style={{ color: "var(--mut)" }}>
          {msg}
        </p>
      ) : null}
      <p className="mb-0 mt-3 text-[11.5px]" style={{ color: "var(--mut)" }}>
        Public key: <code className="text-[11px]">{publicKey}</code>
      </p>
    </section>
  );
}
