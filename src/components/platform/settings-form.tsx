"use client";

import { useState } from "react";
import type { PlatformPublicSettings } from "@/lib/platform-config";
import { cn } from "@/lib/utils";

type Props = {
  initial: PlatformPublicSettings;
  section: "stripe" | "providers" | "ops";
};

export function PlatformSettingsForm({ initial, section }: Props) {
  const [form, setForm] = useState(initial);
  const [stripeSecretKey, setStripeSecretKey] = useState("");
  const [stripeWebhookSecret, setStripeWebhookSecret] = useState("");
  const [resendApiKey, setResendApiKey] = useState("");
  const [twilioAuthToken, setTwilioAuthToken] = useState("");
  const [metaWhatsappAccessToken, setMetaWhatsappAccessToken] = useState("");
  const [openwaApiKey, setOpenwaApiKey] = useState("");
  const [webflowClientSecret, setWebflowClientSecret] = useState("");
  const [googleClientSecret, setGoogleClientSecret] = useState("");
  const [microsoftClientSecret, setMicrosoftClientSecret] = useState("");
  const [zoomClientSecret, setZoomClientSecret] = useState("");
  const [mailchimpClientSecret, setMailchimpClientSecret] = useState("");
  const [zapierSigningSecret, setZapierSigningSecret] = useState("");
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [groqApiKey, setGroqApiKey] = useState("");
  const [pending, setPending] = useState(false);
  const [msg, setMsg] = useState("");

  function set<K extends keyof PlatformPublicSettings>(key: K, value: PlatformPublicSettings[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function save() {
    setPending(true);
    setMsg("");
    try {
      const payload: Record<string, unknown> = {};

      if (section === "stripe") {
        payload.stripeMode = form.stripeMode === "live" ? "live" : "test";
        payload.stripePublishableKey = form.stripePublishableKey || null;
        const fee = Number(form.applicationFeePercent);
        payload.applicationFeePercent = Number.isFinite(fee)
          ? Math.min(30, Math.max(0, Math.round(fee)))
          : 0;
        payload.stripeRequireOnboarding = Boolean(form.stripeRequireOnboarding);
        payload.stripeAllowDeposits = Boolean(form.stripeAllowDeposits);
        payload.stripeAllowPayOnSite = Boolean(form.stripeAllowPayOnSite);
        payload.stripeSaveCardForNoShow = Boolean(form.stripeSaveCardForNoShow);
        if (stripeSecretKey.trim()) payload.stripeSecretKey = stripeSecretKey.trim();
        if (stripeWebhookSecret.trim()) payload.stripeWebhookSecret = stripeWebhookSecret.trim();
      }

      if (section === "providers") {
        payload.emailProvider = "resend";
        payload.emailFrom = form.emailFrom;
        payload.smsProvider = form.smsProvider;
        payload.twilioAccountSid = form.twilioAccountSid;
        payload.twilioFromNumber = form.twilioFromNumber;
        payload.twilioWhatsappFrom = form.twilioWhatsappFrom;
        payload.whatsappProvider = form.whatsappProvider;
        payload.metaWhatsappPhoneNumberId = form.metaWhatsappPhoneNumberId;
        payload.metaWhatsappApiVersion = form.metaWhatsappApiVersion;
        payload.openwaBaseUrl = form.openwaBaseUrl;
        payload.openwaSessionId = form.openwaSessionId;
        payload.webflowClientId = form.webflowClientId;
        payload.googleClientId = form.googleClientId;
        payload.microsoftClientId = form.microsoftClientId;
        payload.zoomClientId = form.zoomClientId;
        payload.mailchimpClientId = form.mailchimpClientId;
        payload.aiProvider = form.aiProvider;
        payload.openaiModel = form.openaiModel;
        payload.groqModel = form.groqModel;
        if (resendApiKey.trim()) payload.resendApiKey = resendApiKey.trim();
        if (twilioAuthToken.trim()) payload.twilioAuthToken = twilioAuthToken.trim();
        if (metaWhatsappAccessToken.trim()) {
          payload.metaWhatsappAccessToken = metaWhatsappAccessToken.trim();
        }
        if (openwaApiKey.trim()) payload.openwaApiKey = openwaApiKey.trim();
        if (webflowClientSecret.trim()) payload.webflowClientSecret = webflowClientSecret.trim();
        if (googleClientSecret.trim()) payload.googleClientSecret = googleClientSecret.trim();
        if (microsoftClientSecret.trim()) payload.microsoftClientSecret = microsoftClientSecret.trim();
        if (zoomClientSecret.trim()) payload.zoomClientSecret = zoomClientSecret.trim();
        if (mailchimpClientSecret.trim()) payload.mailchimpClientSecret = mailchimpClientSecret.trim();
        payload.zapierEnabled = Boolean(form.zapierEnabled);
        if (zapierSigningSecret.trim()) payload.zapierSigningSecret = zapierSigningSecret.trim();
        if (openaiApiKey.trim()) payload.openaiApiKey = openaiApiKey.trim();
        if (groqApiKey.trim()) payload.groqApiKey = groqApiKey.trim();
      }

      if (section === "ops") {
        payload.maintenanceMode = form.maintenanceMode;
        payload.supportEmail = form.supportEmail;
      }

      const res = await fetch("/api/platform/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setForm(data);
      setStripeSecretKey("");
      setStripeWebhookSecret("");
      setResendApiKey("");
      setTwilioAuthToken("");
      setWebflowClientSecret("");
      setGoogleClientSecret("");
      setMicrosoftClientSecret("");
      setZoomClientSecret("");
      setMailchimpClientSecret("");
      setZapierSigningSecret("");
      setOpenaiApiKey("");
      setGroqApiKey("");
      setMetaWhatsappAccessToken("");
      setOpenwaApiKey("");
      setMsg("Saved. Secrets are encrypted at rest.");
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Save failed");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="grid gap-3.5">
      {form.source === "fallback" ? (
        <div className="rounded-xl border border-[var(--ln)] bg-[var(--bg)] px-3.5 py-3 text-[13px]" style={{ color: "var(--mut)" }}>
          Showing env fallbacks. Connect Postgres and save once to store settings in the database.
        </div>
      ) : null}

      {section === "stripe" ? (
        <>
          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">Platform Stripe</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Keys are stored encrypted. Leave secret fields blank to keep the current value. Webhook
              endpoint:{" "}
              <code className="font-semibold">
                https://slotwise.hindaralabs.com/api/stripe/webhook
              </code>
            </p>

            <Field label="Mode">
              <Seg
                value={form.stripeMode}
                options={[
                  ["test", "Test"],
                  ["live", "Live"],
                ]}
                onChange={(v) => set("stripeMode", v)}
              />
            </Field>

            <Field label="Publishable key" hint={form.stripeSecretKeySet ? "Configured" : "Missing"}>
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.stripePublishableKey ?? ""}
                onChange={(e) => set("stripePublishableKey", e.target.value || null)}
                placeholder="pk_live_… or pk_test_…"
              />
            </Field>

            <Field label="Secret key" hint={form.stripeSecretKeyHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={stripeSecretKey}
                onChange={(e) => setStripeSecretKey(e.target.value)}
                placeholder="Paste new sk_… to rotate"
                autoComplete="new-password"
              />
            </Field>

            <Field label="Webhook secret" hint={form.stripeWebhookSecretHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={stripeWebhookSecret}
                onChange={(e) => setStripeWebhookSecret(e.target.value)}
                placeholder="Paste new whsec_… to rotate"
                autoComplete="new-password"
              />
            </Field>

            <Field label="Application fee %" hint="Keep 0 for no Slotwise commission">
              <input
                type="number"
                min={0}
                max={30}
                className="w-24 rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.applicationFeePercent}
                onChange={(e) => set("applicationFeePercent", Number(e.target.value))}
              />
            </Field>
          </section>

          <section className="sw-card">
            <h2 className="mb-3 text-[15px] font-extrabold">Connect defaults</h2>
            <Toggle
              label="Require onboarding before go-live"
              on={form.stripeRequireOnboarding}
              set={(v) => set("stripeRequireOnboarding", v)}
            />
            <Toggle label="Allow deposits" on={form.stripeAllowDeposits} set={(v) => set("stripeAllowDeposits", v)} />
            <Toggle label="Allow pay on site" on={form.stripeAllowPayOnSite} set={(v) => set("stripeAllowPayOnSite", v)} />
            <Toggle
              label="Save card for no-show protection"
              on={form.stripeSaveCardForNoShow}
              set={(v) => set("stripeSaveCardForNoShow", v)}
            />
          </section>
        </>
      ) : null}

      {section === "providers" ? (
        <>
          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">Email (Resend)</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Platform fallback From for booking emails. Prefer a verified domain address (e.g.
              bookings@yourdomain.com). Sites can override this under Dashboard → Notifications.
              Customer replies use each site’s Reply-To.
            </p>
            <Field label="Default from address">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.emailFrom ?? ""}
                onChange={(e) => set("emailFrom", e.target.value || null)}
                placeholder="hello@yourdomain.com"
              />
            </Field>
            <Field
              label="API key"
              hint={form.resendApiKeyHint ?? form.postmarkTokenHint ?? "Not set"}
            >
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={resendApiKey}
                onChange={(e) => setResendApiKey(e.target.value)}
                placeholder="re_… paste to rotate"
                autoComplete="new-password"
              />
            </Field>
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">SMS (Twilio)</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              SMS reminders and waitlist offers. Auth token is encrypted at rest.
            </p>
            <Field label="Account SID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.twilioAccountSid ?? ""}
                onChange={(e) => set("twilioAccountSid", e.target.value || null)}
                placeholder="ACxxxxxxxx"
              />
            </Field>
            <Field label="Auth token" hint={form.twilioAuthTokenHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={twilioAuthToken}
                onChange={(e) => setTwilioAuthToken(e.target.value)}
                placeholder="Paste new token to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="SMS from number">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.twilioFromNumber ?? ""}
                onChange={(e) => set("twilioFromNumber", e.target.value || null)}
                placeholder="+15551234567"
              />
            </Field>
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">WhatsApp provider</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Booking confirmations when a site enables WhatsApp. Choose Twilio, Meta Cloud API, or
              self-hosted OpenWA. Secrets are encrypted at rest.
            </p>
            <Field label="Active provider">
              <select
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.whatsappProvider || "twilio"}
                onChange={(e) => set("whatsappProvider", e.target.value)}
              >
                <option value="twilio">Twilio WhatsApp</option>
                <option value="meta">Meta Cloud API</option>
                <option value="openwa">OpenWA (self-hosted)</option>
              </select>
            </Field>

            {(form.whatsappProvider || "twilio") === "twilio" ? (
              <Field label="WhatsApp from" hint="whatsapp:+…">
                <input
                  className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                  value={form.twilioWhatsappFrom ?? ""}
                  onChange={(e) => set("twilioWhatsappFrom", e.target.value || null)}
                  placeholder="whatsapp:+14155238886"
                />
              </Field>
            ) : null}

            {form.whatsappProvider === "meta" ? (
              <>
                <Field label="Phone number ID" hint="Meta Business → WhatsApp → API Setup">
                  <input
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={form.metaWhatsappPhoneNumberId ?? ""}
                    onChange={(e) => set("metaWhatsappPhoneNumberId", e.target.value || null)}
                    placeholder="123456789012345"
                  />
                </Field>
                <Field
                  label="Access token"
                  hint={form.metaWhatsappAccessTokenHint ?? "Not set"}
                >
                  <input
                    type="password"
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={metaWhatsappAccessToken}
                    onChange={(e) => setMetaWhatsappAccessToken(e.target.value)}
                    placeholder="Paste permanent token to rotate"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="API version">
                  <input
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={form.metaWhatsappApiVersion ?? "v21.0"}
                    onChange={(e) => set("metaWhatsappApiVersion", e.target.value || null)}
                    placeholder="v21.0"
                  />
                </Field>
              </>
            ) : null}

            {form.whatsappProvider === "openwa" ? (
              <>
                <Field label="Base URL" hint="Your OpenWA / Evolution host">
                  <input
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={form.openwaBaseUrl ?? ""}
                    onChange={(e) => set("openwaBaseUrl", e.target.value || null)}
                    placeholder="https://wa.your-server.com"
                  />
                </Field>
                <Field label="API key" hint={form.openwaApiKeyHint ?? "Not set"}>
                  <input
                    type="password"
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={openwaApiKey}
                    onChange={(e) => setOpenwaApiKey(e.target.value)}
                    placeholder="Paste API key to rotate"
                    autoComplete="new-password"
                  />
                </Field>
                <Field label="Session ID">
                  <input
                    className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                    value={form.openwaSessionId ?? "default"}
                    onChange={(e) => set("openwaSessionId", e.target.value || null)}
                    placeholder="default"
                  />
                </Field>
              </>
            ) : null}
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">Webflow app</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Optional override of env. Redirect URI stays on your domain callback route.
            </p>
            <Field label="Client ID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.webflowClientId ?? ""}
                onChange={(e) => set("webflowClientId", e.target.value || null)}
              />
            </Field>
            <Field
              label="Client secret"
              hint={form.webflowClientSecretSet ? "Configured" : "Not set"}
            >
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={webflowClientSecret}
                onChange={(e) => setWebflowClientSecret(e.target.value)}
                placeholder="Paste new secret to rotate"
                autoComplete="new-password"
              />
            </Field>
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">Calendars &amp; tools</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Keys for Google Calendar / Meet, Microsoft Outlook / Teams, Zoom, Mailchimp, and
              Zapier. Site owners connect these from their workspace Integrations page.
            </p>
            <Field label="Google client ID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.googleClientId ?? ""}
                onChange={(e) => set("googleClientId", e.target.value || null)}
                placeholder="….apps.googleusercontent.com"
              />
            </Field>
            <Field label="Google client secret" hint={form.googleClientSecretHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={googleClientSecret}
                onChange={(e) => setGoogleClientSecret(e.target.value)}
                placeholder="Paste new secret to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Microsoft client ID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.microsoftClientId ?? ""}
                onChange={(e) => set("microsoftClientId", e.target.value || null)}
              />
            </Field>
            <Field
              label="Microsoft client secret"
              hint={form.microsoftClientSecretHint ?? "Not set"}
            >
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={microsoftClientSecret}
                onChange={(e) => setMicrosoftClientSecret(e.target.value)}
                placeholder="Paste new secret to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Zoom client ID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.zoomClientId ?? ""}
                onChange={(e) => set("zoomClientId", e.target.value || null)}
              />
            </Field>
            <Field label="Zoom client secret" hint={form.zoomClientSecretHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={zoomClientSecret}
                onChange={(e) => setZoomClientSecret(e.target.value)}
                placeholder="Paste new secret to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Mailchimp client ID">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.mailchimpClientId ?? ""}
                onChange={(e) => set("mailchimpClientId", e.target.value || null)}
              />
            </Field>
            <Field
              label="Mailchimp client secret"
              hint={form.mailchimpClientSecretHint ?? "Not set"}
            >
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={mailchimpClientSecret}
                onChange={(e) => setMailchimpClientSecret(e.target.value)}
                placeholder="Paste new secret to rotate"
                autoComplete="new-password"
              />
            </Field>
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">Zapier</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              When off, Zapier is hidden from site owners. Turn on when you’re ready to offer
              one-click Zapier connect.
            </p>
            <Toggle
              label="Enable Zapier for site owners"
              on={Boolean(form.zapierEnabled)}
              set={(v) => set("zapierEnabled", v)}
            />
          </section>

          <section className="sw-card">
            <h2 className="mb-1 text-[15px] font-extrabold">AI (OpenAI / Groq)</h2>
            <p className="mb-3 text-[13px]" style={{ color: "var(--mut)" }}>
              Platform admin only. Powers Designer “Write with AI” for event descriptions. Keys are
              encrypted at rest. Env vars are used as fallback when fields are empty.
            </p>
            <Field label="Provider">
              <Seg
                value={form.aiProvider || "openai"}
                options={[
                  ["openai", "OpenAI"],
                  ["groq", "Groq"],
                  ["template", "Template only"],
                ]}
                onChange={(v) => set("aiProvider", v)}
              />
            </Field>
            <Field label="OpenAI API key" hint={form.openaiApiKeyHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={openaiApiKey}
                onChange={(e) => setOpenaiApiKey(e.target.value)}
                placeholder="sk-… paste to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="OpenAI model">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.openaiModel ?? ""}
                onChange={(e) => set("openaiModel", e.target.value || null)}
                placeholder="gpt-4o-mini"
              />
            </Field>
            <Field label="Groq API key" hint={form.groqApiKeyHint ?? "Not set"}>
              <input
                type="password"
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={groqApiKey}
                onChange={(e) => setGroqApiKey(e.target.value)}
                placeholder="gsk_… paste to rotate"
                autoComplete="new-password"
              />
            </Field>
            <Field label="Groq model">
              <input
                className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
                value={form.groqModel ?? ""}
                onChange={(e) => set("groqModel", e.target.value || null)}
                placeholder="llama-3.3-70b-versatile"
              />
            </Field>
          </section>
        </>
      ) : null}

      {section === "ops" ? (
        <section className="sw-card">
          <h2 className="mb-3 text-[15px] font-extrabold">Operations</h2>
          <Toggle
            label="Maintenance mode"
            hint="Blocks new bookings platform-wide"
            on={form.maintenanceMode}
            set={(v) => set("maintenanceMode", v)}
          />
          <Field label="Support email">
            <input
              className="min-w-[260px] rounded-[10px] border border-[var(--ln)] bg-[var(--bg)] px-2.5 py-2"
              value={form.supportEmail ?? ""}
              onChange={(e) => set("supportEmail", e.target.value || null)}
              placeholder="tidyflaw@gmail.com"
            />
          </Field>
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <button type="button" className="sw-btn sw-btn-primary" disabled={pending} onClick={save}>
          {pending ? "Saving…" : "Save settings"}
        </button>
        {msg ? <span className="text-[13px] font-semibold text-[var(--at)]">{msg}</span> : null}
      </div>
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <div>
        <b>{label}</b>
        {hint ? (
          <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
            {hint}
          </small>
        ) : null}
      </div>
      <div>{children}</div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  on,
  set,
}: {
  label: string;
  hint?: string;
  on: boolean;
  set: (v: boolean) => void;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--ln)] py-3">
      <div>
        <b>{label}</b>
        {hint ? (
          <small className="block text-[12.5px]" style={{ color: "var(--mut)" }}>
            {hint}
          </small>
        ) : null}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        onClick={() => set(!on)}
        className={cn("relative h-6 w-[42px] rounded-full border-0 transition", on ? "bg-[var(--ac)]" : "bg-[var(--ln)]")}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] h-[18px] w-[18px] rounded-full bg-white transition",
            on && "translate-x-[18px]",
          )}
        />
      </button>
    </div>
  );
}

function Seg({
  value,
  options,
  onChange,
}: {
  value: string;
  options: Array<[string, string]>;
  onChange: (v: string) => void;
}) {
  return (
    <div className="inline-flex rounded-full border border-[var(--ln)] bg-[var(--bg)] p-[3px]">
      {options.map(([v, label]) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v)}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
            value === v ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
          )}
        >
          {label}
        </button>
      ))}
    </div>
  );
}
