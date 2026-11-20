import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL, CONTACT_MAILTO } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Webflow install guide — Slotwise",
  description:
    "How to install Slotwise on Webflow: Marketplace OAuth, Designer placement, publish, dashboard setup, and uninstall.",
  alternates: {
    canonical: "/docs/webflow",
  },
  robots: {
    index: true,
    follow: true,
  },
};

const INSTALL_URL = "https://slotwise.hindaralabs.com/api/webflow/install";

export default function WebflowDocsPage() {
  return (
    <main className="min-h-screen bg-[#0a1018] text-[#eaf0f8]">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link href="/" className="mb-10 inline-flex items-center gap-3">
          <Image src="/logo.png" alt="Slotwise" width={36} height={36} className="rounded-lg" />
          <span className="font-extrabold">Slotwise</span>
        </Link>

        <p className="text-[11px] font-extrabold uppercase tracking-[0.16em] text-[#f5a000]">
          Documentation
        </p>
        <h1 className="mt-2 text-3xl font-extrabold tracking-tight sm:text-4xl">
          Webflow install guide
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[#93a4bc]">
          Slotwise is a Hybrid App (Data Client + Designer Extension). Use this page for Marketplace
          review and site-owner onboarding. Last updated 20 November 2026.
        </p>

        <nav className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#c9d0da]">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#93a4bc]">
            On this page
          </p>
          <ul className="flex flex-col gap-1.5 [&_a]:text-[#f5a000] [&_a]:underline-offset-2 hover:[&_a]:underline">
            <li>
              <a href="#install">1. Install from Webflow</a>
            </li>
            <li>
              <a href="#place">2. Place the booking widget</a>
            </li>
            <li>
              <a href="#publish">3. Publish the site</a>
            </li>
            <li>
              <a href="#dashboard">4. Configure in Slotwise</a>
            </li>
            <li>
              <a href="#runtime">5. How the runtime works</a>
            </li>
            <li>
              <a href="#uninstall">6. Uninstall / cleanup</a>
            </li>
            <li>
              <a href="#scopes">7. OAuth scopes</a>
            </li>
            <li>
              <a href="#support">8. Support</a>
            </li>
          </ul>
        </nav>

        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c9d0da] [&_a]:text-[#f5a000] [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-[#eaf0f8] [&_h2]:mt-10 [&_h2]:scroll-mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_h3]:mt-6 [&_h3]:text-base [&_h3]:font-extrabold [&_h3]:text-white [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <h2 id="install">1. Install from Webflow</h2>
          <ol>
            <li>
              Open the Slotwise listing in the Webflow Marketplace (or your Workspace Apps), then
              choose <strong>Install</strong>.
            </li>
            <li>
              You are sent to the Slotwise Install URL:{" "}
              <a href={INSTALL_URL}>
                <code>{INSTALL_URL}</code>
              </a>
              . That starts Webflow OAuth — do <strong>not</strong> use <code>/login</code> as the
              install entry.
            </li>
            <li>
              Approve the requested site scopes. After authorize, you land on{" "}
              <code>/install?status=connected</code> with a success screen and a deep link into
              Designer.
            </li>
            <li>
              Keep Designer open. Launch <strong>Apps → Slotwise → Launch App</strong> if the panel
              did not open automatically.
            </li>
          </ol>
          <p>
            Already connected? Sign in at{" "}
            <Link href="/login">slotwise.hindaralabs.com/login</Link> for the owner dashboard.
          </p>

          <h2 id="place">2. Place the booking widget</h2>
          <ol>
            <li>In the Slotwise Designer panel, pick the page where bookings should appear.</li>
            <li>
              Choose layout (inline / floating / popup) and calendar style, then click{" "}
              <strong>Add booking</strong> (or equivalent place action).
            </li>
            <li>
              Slotwise inserts a canvas mount (div + iframe preview) and registers the hosted{" "}
              <code>widget.js</code> runtime on the site via the Custom Code API — no manual Custom
              Code paste.
            </li>
          </ol>
          <p>
            Canvas placement alone is not enough for the published site: the runtime script must be
            applied (done automatically on place/install) and the site must be published.
          </p>

          <h2 id="publish">3. Publish the site</h2>
          <ul>
            <li>
              Use Webflow <strong>Publish</strong>, or publish from the Slotwise Designer panel when
              your plan allows it.
            </li>
            <li>
              After publish, open the live <code>.webflow.io</code> (or custom domain) page and
              confirm the booking UI loads.
            </li>
            <li>
              In DevTools → Network, you should see{" "}
              <code>https://slotwise.hindaralabs.com/embed/widget.js</code> with{" "}
              <code>integrity</code> and <code>crossorigin=&quot;anonymous&quot;</code>.
            </li>
          </ul>

          <h2 id="dashboard">4. Configure in Slotwise</h2>
          <p>From the owner dashboard after install:</p>
          <ul>
            <li>
              <strong>Services</strong> — names, duration, price.
            </li>
            <li>
              <strong>Availability</strong> — weekly hours and time off.
            </li>
            <li>
              <strong>Branding</strong> — theme, accent, calendar style (Day / Week / Wide).
            </li>
            <li>
              <strong>Payments</strong> — connect Stripe for deposits or full payment (0% Slotwise
              booking commission by default).
            </li>
            <li>
              <strong>Integrations</strong> — Google Calendar, Zoom, Teams, etc. when enabled.
            </li>
            <li>
              <strong>Notifications</strong> — email/SMS preferences.
            </li>
          </ul>

          <h2 id="runtime">5. How the runtime works</h2>
          <ul>
            <li>
              Hosted runtime:{" "}
              <code>https://slotwise.hindaralabs.com/embed/widget.js</code> (plus{" "}
              <code>widget.js.map</code> for review).
            </li>
            <li>
              The script finds <code>[data-slotwise-widget]</code> / Designer-placed mounts, loads the
              booking UI in an iframe, and resizes height via <code>postMessage</code>.
            </li>
            <li>
              It does not inject extra undeclared child scripts on the customer page.
            </li>
            <li>
              Readiness: the host marks <code>data-runtime-ready</code> when the runtime is usable.
            </li>
          </ul>

          <h2 id="uninstall">6. Uninstall / cleanup</h2>
          <ol>
            <li>Uninstall Slotwise from the Webflow site / Marketplace, or disconnect from the panel.</li>
            <li>
              Slotwise deletes App-applied Custom Code at site and page level (no leftover replacement
              scripts).
            </li>
            <li>
              Remove any remaining canvas booking blocks in Designer if prompted, then{" "}
              <strong>Publish</strong> so removal goes live.
            </li>
          </ol>

          <h2 id="scopes">7. OAuth scopes we request</h2>
          <ul>
            <li>
              <code>authorized_user:read</code> — installer identity
            </li>
            <li>
              <code>sites:read</code> / <code>sites:write</code> — link sites and publish
            </li>
            <li>
              <code>pages:read</code> / <code>pages:write</code> — page list + Custom Code cleanup
            </li>
            <li>
              <code>custom_code:read</code> / <code>custom_code:write</code> — register, apply, and
              purge <code>widget.js</code>
            </li>
          </ul>
          <p>
            We do <strong>not</strong> request CMS, assets, forms, or ecommerce scopes.
          </p>

          <h2 id="support">8. Support</h2>
          <p>
            Email{" "}
            <a href={CONTACT_MAILTO}>{CONTACT_EMAIL}</a> for install help, Marketplace review access,
            or billing questions.
          </p>
          <p>
            Privacy: <Link href="/privacy">/privacy</Link> · Terms:{" "}
            <Link href="/terms">/terms</Link>
          </p>
        </div>

        <p className="mt-12 text-sm text-[#93a4bc]">
          <Link href="/" className="hover:text-white">
            ← Back home
          </Link>
          {" · "}
          <Link href="/install" className="hover:text-white">
            Install status
          </Link>
          {" · "}
          <Link href="/login" className="hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
