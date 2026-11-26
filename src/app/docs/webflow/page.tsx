import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LEGAL_ENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Webflow install guide — Slotwise",
  description:
    "How to install Slotwise on Webflow: Marketplace OAuth, Designer mount, Custom Code runtime, publish, dashboard setup, and uninstall.",
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
          Slotwise is a Hybrid App (Data Client + Designer Extension) operated by {LEGAL_ENTITY}.
          Last updated 26 November 2026.
        </p>

        <nav className="mt-8 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-[#c9d0da]">
          <p className="mb-2 text-[11px] font-extrabold uppercase tracking-[0.14em] text-[#93a4bc]">
            On this page
          </p>
          <ul className="flex flex-col gap-1.5 [&_a]:text-[#f5a000] [&_a]:underline-offset-2 hover:[&_a]:underline">
            <li>
              <a href="#requirements">1. Requirements</a>
            </li>
            <li>
              <a href="#install">2. Install</a>
            </li>
            <li>
              <a href="#place">3. Place the booking mount</a>
            </li>
            <li>
              <a href="#code">4. Code applied to your site</a>
            </li>
            <li>
              <a href="#publish">5. Publish</a>
            </li>
            <li>
              <a href="#dashboard">6. Configure Slotwise</a>
            </li>
            <li>
              <a href="#plans">7. Plans</a>
            </li>
            <li>
              <a href="#uninstall">8. Uninstall</a>
            </li>
            <li>
              <a href="#scopes">9. OAuth scopes</a>
            </li>
            <li>
              <a href="#support">10. Support</a>
            </li>
          </ul>
        </nav>

        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c9d0da] [&_a]:text-[#f5a000] [&_a]:underline [&_code]:rounded [&_code]:bg-white/10 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:text-[13px] [&_code]:text-[#eaf0f8] [&_h2]:mt-10 [&_h2]:scroll-mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ol]:list-decimal [&_ol]:space-y-2 [&_ol]:pl-5 [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <h2 id="requirements">1. Requirements</h2>
          <ul>
            <li>A Webflow site you can authorize (Workspace access).</li>
            <li>Ability to Publish the site after install and after uninstall cleanup.</li>
            <li>
              Optional: Stripe Connect for paid bookings / deposits (Pro and above for deposits).
            </li>
            <li>
              Optional: Google, Zoom, Microsoft, Mailchimp, GA4, or Meta Pixel credentials for those
              integrations.
            </li>
          </ul>

          <h2 id="install">2. Install</h2>
          <ol>
            <li>Install Slotwise from the Webflow Marketplace (or Workspace Apps).</li>
            <li>
              Install URL:{" "}
              <a href={INSTALL_URL}>
                <code>{INSTALL_URL}</code>
              </a>{" "}
              (starts OAuth — not the callback URI).
            </li>
            <li>
              Approve scopes. You land on <code>/install?status=connected</code>, then open{" "}
              <strong>Designer → Apps → Slotwise</strong>.
            </li>
          </ol>

          <h2 id="place">3. Place the booking mount</h2>
          <ol>
            <li>In Design mode, select a section/container.</li>
            <li>
              In the Slotwise panel, choose layout options and click <strong>Add booking</strong>.
            </li>
            <li>
              Slotwise inserts a <strong>mount div</strong> (
              <code>data-slotwise-widget</code>) on the canvas —{" "}
              <strong>not an iframe</strong>. A short placeholder shows until you publish.
            </li>
          </ol>

          <h2 id="code">4. Code applied to your site</h2>
          <p>
            Slotwise registers and applies one hosted script through the Webflow Custom Code API:
          </p>
          <ul>
            <li>
              URL: <code>https://slotwise.hindaralabs.com/embed/widget.js</code>
            </li>
            <li>
              Where it runs: on published pages of your Webflow site (footer Custom Code).
            </li>
            <li>
              What it does: finds <code>[data-slotwise-widget]</code> mounts and renders the booking
              UI <strong>in-page</strong> (React mount into the div). It calls Slotwise public
              booking APIs over HTTPS. It does <strong>not</strong> place an externally hosted
              iframe.
            </li>
            <li>
              Delivery includes Subresource Integrity (<code>integrity</code>) and{" "}
              <code>crossorigin=&quot;anonymous&quot;</code> when registered through Webflow.
            </li>
          </ul>

          <h2 id="publish">5. Publish</h2>
          <ul>
            <li>
              Publish from Webflow, or use the Slotwise panel Publish control when your plan allows
              it — always a direct click by you.
            </li>
            <li>
              Slotwise does <strong>not</strong> publish your site automatically on install or
              uninstall.
            </li>
            <li>
              After publish, confirm Network shows <code>widget.js</code> and the booking UI appears
              inside the mount.
            </li>
          </ul>

          <h2 id="dashboard">6. Configure Slotwise</h2>
          <ul>
            <li>Services, availability, branding, staff</li>
            <li>Payments (Stripe) when you want deposits or prepaid bookings</li>
            <li>Integrations: Google Calendar/Meet, Zoom, Teams, Mailchimp, GA4, Meta Pixel</li>
            <li>Notifications and optional AI Calendar Chat (Business+)</li>
          </ul>

          <h2 id="plans">7. Plans</h2>
          <ul>
            <li>
              <strong>Free — $0/mo</strong> — 25 bookings/month, 1 staff, 2 themes, Webflow mount,
              email reminders. No Stripe deposits. No AI Calendar Chat.
            </li>
            <li>
              <strong>Pro — $15/mo</strong> — 500 bookings/month, 3 staff, 4 themes, Stripe deposits,
              SMS, analytics, buffers, import/export.
            </li>
            <li>
              <strong>Business — $39/mo</strong> — unlimited bookings, 15 staff, all 8 themes,
              everything in Pro, plus <strong>AI Calendar Chat</strong>, waitlist, capacity.
            </li>
            <li>
              <strong>Agency — $99/mo</strong> — unlimited bookings &amp; staff, everything in
              Business, multi-site / agency use, priority support.
            </li>
          </ul>
          <p>
            Live prices: <Link href="/#pricing">slotwise.hindaralabs.com/#pricing</Link>. Stripe
            deposits = Pro+. AI Calendar Chat = Business+. Stripe card processing fees still apply;
            Slotwise does not take a booking commission by default.
          </p>

          <h2 id="uninstall">8. Uninstall</h2>
          <ol>
            <li>
              Disconnect from the Slotwise panel (removes canvas mounts when run in Designer) or
              uninstall from Webflow.
            </li>
            <li>
              Slotwise deletes App-applied site-level and page-level Custom Code and revokes its
              OAuth token. Other scripts on your site are left alone.
            </li>
            <li>
              <strong>You</strong> Publish the Webflow site so removal goes live. Slotwise does not
              auto-publish.
            </li>
          </ol>

          <h2 id="scopes">9. OAuth scopes</h2>
          <ul>
            <li>
              <code>authorized_user:read</code> — installer identity
            </li>
            <li>
              <code>sites:read</code> / <code>sites:write</code> — link sites; publish when you click
              Publish
            </li>
            <li>
              <code>pages:read</code> — list pages for Custom Code cleanup
            </li>
            <li>
              <code>custom_code:read</code> / <code>custom_code:write</code> — register, apply, and
              delete <code>widget.js</code> (including page-level Custom Code delete)
            </li>
          </ul>
          <p>
            We do not request <code>pages:write</code>, CMS, assets, forms, or ecommerce scopes.
          </p>

          <h2 id="support">10. Support</h2>
          <p>
            Email <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> ({LEGAL_ENTITY}).
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
          <Link href="/login" className="hover:text-white">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
