import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { readFile } from "fs/promises";
import { join } from "path";
import { LEGAL_ENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/legal";
import { SLOTWISE_WIDGET_URL } from "@/lib/wix/embed-snippet";

export const metadata: Metadata = {
  title: "Wix install guide — Slotwise",
  description:
    "Install Slotwise on Wix with the same dashboard and in-page widget.js runtime. Webflow Marketplace setup is separate and unchanged.",
  alternates: { canonical: "/docs/wix" },
  robots: { index: true, follow: true },
};

async function readSri(): Promise<{ integrity: string; hex: string } | null> {
  try {
    const raw = await readFile(join(process.cwd(), "public/embed/widget.sri.txt"), "utf8");
    const integrity = raw.match(/^integrity=(sha256-\S+)/m)?.[1] ?? "";
    const hex = raw.match(/^sha256-hex=(\S+)/m)?.[1] ?? "";
    if (!integrity) return null;
    return { integrity, hex };
  } catch {
    return null;
  }
}

export default async function WixDocsPage() {
  const sri = await readSri();
  const scriptTag = sri
    ? `<script src="${SLOTWISE_WIDGET_URL}" integrity="${sri.integrity}" crossorigin="anonymous"></script>`
    : `<script src="${SLOTWISE_WIDGET_URL}" crossorigin="anonymous"></script>`;

  const example = `<div data-slotwise-widget="sw_YOUR_KEY" data-site="sw_YOUR_KEY" style="width:100%;max-width:100%;min-height:120px;"></div>
${scriptTag}`;

  return (
    <main className="min-h-screen bg-[#06110e] text-[#e8f0ec]">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link href="/wix" className="mb-10 inline-flex items-center gap-3">
          <Image src="/logo.png" alt="Slotwise" width={36} height={36} className="rounded-lg" />
          <span className="font-extrabold">Slotwise</span>
        </Link>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#0eb894]">
          Documentation · Wix only
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Wix install guide
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#9db5ab]">
          Slotwise for Wix uses the <strong className="text-white">same backend, dashboard, and{" "}
          <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px]">widget.js</code></strong>{" "}
          as every other channel. Operated by {LEGAL_ENTITY}. Webflow Designer / Marketplace flows
          are separate — this page does not change them.
        </p>

        <nav className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#c5d6ce]">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#9db5ab]">
            On this page
          </p>
          <ul className="flex flex-col gap-1.5 [&_a]:text-[#0eb894] hover:[&_a]:underline">
            <li>
              <a href="#shared">1. Shared vs Wix-only</a>
            </li>
            <li>
              <a href="#dashboard">2. Dashboard setup</a>
            </li>
            <li>
              <a href="#embed">3. Embed on a Wix page</a>
            </li>
            <li>
              <a href="#check">4. Verify &amp; troubleshoot</a>
            </li>
            <li>
              <a href="#next">5. What&apos;s next (App OAuth)</a>
            </li>
            <li>
              <a href="#support">6. Support</a>
            </li>
          </ul>
        </nav>

        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c5d6ce] [&_a]:text-[#0eb894] [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_h2]:mt-10 [&_h2]:scroll-mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5 [&_pre]:overflow-x-auto [&_pre]:rounded-xl [&_pre]:bg-black/40 [&_pre]:p-4 [&_pre]:text-[12px] [&_pre]:text-[#e8f0ec]">
          <h2 id="shared">1. Shared vs Wix-only</h2>
          <ul>
            <li>
              <strong className="text-white">Shared:</strong> owner dashboard, plans, Stripe,
              branding, <code>/api/v1/sites/…</code>, hosted{" "}
              <code>{SLOTWISE_WIDGET_URL}</code>
            </li>
            <li>
              <strong className="text-white">Wix-only:</strong> this install path,{" "}
              <Link href="/wix">/wix</Link> landing, <code>Site.channel = WIX</code>, future{" "}
              <code>/api/wix/*</code>
            </li>
            <li>
              <strong className="text-white">Untouched:</strong> Webflow OAuth, Designer Extension,
              <code>/api/webflow/*</code>, Webflow homepage
            </li>
          </ul>

          <h2 id="dashboard">2. Dashboard setup</h2>
          <ol>
            <li>
              Sign in at <Link href="/login">/login</Link>.
            </li>
            <li>Create services, hours, and branding as usual.</li>
            <li>
              Open <Link href="/dashboard/branding">Dashboard → Branding</Link>. Under{" "}
              <strong className="text-white">Add to Wix</strong>, copy your snippet (or copy your{" "}
              <code>sw_…</code> public key).
            </li>
            <li>
              Optional: click <strong className="text-white">Mark site as Wix</strong> — this only
              sets <code>channel</code>; it never clears a Webflow site link.
            </li>
          </ol>

          <h2 id="embed">3. Embed on a Wix page</h2>
          <ol>
            <li>In the Wix Editor, add an <strong className="text-white">Embed</strong> / HTML iframe or custom code element on the page section where booking should appear.</li>
            <li>Paste a mount + script (replace <code>sw_YOUR_KEY</code>):</li>
          </ol>
          <pre>{example}</pre>
          {sri ? (
            <p>
              Current SRI for Preflight / pin: <code>{sri.integrity}</code>
              {sri.hex ? (
                <>
                  {" "}
                  · hex <code>{sri.hex}</code>
                </>
              ) : null}
            </p>
          ) : null}
          <ol start={3}>
            <li>Publish the Wix site.</li>
            <li>Open the live URL (not just the Editor canvas) and confirm the widget loads.</li>
          </ol>

          <h2 id="check">4. Verify &amp; troubleshoot</h2>
          <ul>
            <li>
              Browser console: look for failed loads of <code>widget.js</code> or{" "}
              <code>/api/v1/sites/…</code> (CORS must allow your Wix domain — public booking APIs
              already send open CORS).
            </li>
            <li>
              If the mount stays empty, confirm the public key matches Branding and the script tag
              is present once on the page.
            </li>
            <li>
              Popup layout: the CTA opens a centered overlay on the published site (body portal).
            </li>
          </ul>

          <h2 id="oauth">5. Wix App OAuth (Phase 3)</h2>
          <p>
            Install URL: <Link href="/api/wix/install">/api/wix/install</Link> · Callback:{" "}
            <code>/api/wix/callback</code> · Success page:{" "}
            <Link href="/install/wix">/install/wix</Link>. Configure App ID/secret in Platform →
            Settings → Wix app. See <code>wix/DEV_CENTER.md</code>. Webflow OAuth is untouched.
          </p>

          <h2 id="support">6. Support</h2>
          <p>
            <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> · {LEGAL_ENTITY}
          </p>
        </div>

        <p className="mt-12 text-sm text-[#7f958b]">
          <Link href="/wix" className="hover:text-white">
            ← Slotwise for Wix
          </Link>
          {" · "}
          <Link href="/docs/webflow" className="hover:text-white">
            Webflow docs (separate)
          </Link>
        </p>
      </div>
    </main>
  );
}
