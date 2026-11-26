import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LEGAL_ENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How Slotwise collects, uses, and protects data.",
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-[#0a1018] text-[#eaf0f8]">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link href="/" className="mb-10 inline-flex items-center gap-3">
          <Image src="/logo.png" alt="Slotwise" width={36} height={36} className="rounded-lg" />
          <span className="font-extrabold">Slotwise</span>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Privacy Policy</h1>
        <p className="mt-2 text-sm text-[#93a4bc]">Last updated 26 November 2026</p>
        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c9d0da] [&_a]:text-[#f5a000] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <p>
            Slotwise is operated by <strong>{LEGAL_ENTITY}</strong> (“we”, “us”) at{" "}
            <strong>slotwise.hindaralabs.com</strong>. This policy explains what we collect, how we
            use it, which third parties receive data, and what happens on uninstall.
          </p>

          <h2>Who this covers</h2>
          <ul>
            <li>Site owners and staff who install Slotwise and use the dashboard.</li>
            <li>
              End visitors who book through the in-page booking widget on a customer’s Webflow site
              or through a Slotwise booking page.
            </li>
          </ul>

          <h2>What the booking widget collects from visitors</h2>
          <ul>
            <li>Name, email, and optional phone number when submitting a booking.</li>
            <li>Selected service, staff (if shown), date/time, and timezone context for the slot.</li>
            <li>
              Technical request data needed to operate the API (IP address, user agent, timestamps).
            </li>
            <li>
              Optional AI Calendar Chat messages when that feature is enabled on the site (Business
              plan and above).
            </li>
            <li>
              Payment is handled by Stripe; Slotwise stores booking and payment status references, not
              full card numbers.
            </li>
          </ul>

          <h2>What we collect from site owners</h2>
          <ul>
            <li>Account details (name, email, password hash).</li>
            <li>
              Site configuration (services, availability, branding, staff, notification settings).
            </li>
            <li>
              Integration credentials you connect (encrypted at rest), such as Google, Microsoft,
              Zoom, Mailchimp, and Stripe Connect account IDs.
            </li>
            <li>Optional GA4 Measurement ID and Meta Pixel ID you enter for your own tracking.</li>
            <li>Webflow OAuth tokens (encrypted server-side) while the app remains installed.</li>
          </ul>

          <h2>Third parties that may receive data</h2>
          <ul>
            <li>
              <strong>Stripe</strong> — payment processing and Connect payouts for paid bookings.
            </li>
            <li>
              <strong>Google</strong> — Calendar / Meet when connected; Google Analytics 4 only if you
              save a Measurement ID (events fire in the visitor’s browser on your booking surface).
            </li>
            <li>
              <strong>Meta</strong> — Meta Pixel only if you save a Pixel ID (browser-side on your
              booking surface).
            </li>
            <li>
              <strong>Zoom</strong> — meeting links when Zoom is connected.
            </li>
            <li>
              <strong>Microsoft</strong> — Outlook Calendar / Teams when connected.
            </li>
            <li>
              <strong>Mailchimp</strong> — contact sync when connected.
            </li>
            <li>
              <strong>Webflow</strong> — OAuth identity, site metadata, and Custom Code APIs used to
              apply or remove the Slotwise runtime script.
            </li>
            <li>
              <strong>Email / SMS providers</strong> you configure for reminders (messages include
              booking details the visitor provided).
            </li>
            <li>
              <strong>AI provider</strong> used for Calendar Chat when enabled (prompts and slot
              context; no card data).
            </li>
          </ul>

          <h2>How we use data</h2>
          <ul>
            <li>Run booking, availability, reminders, and owner dashboards.</li>
            <li>Connect and operate authorized Webflow sites and third-party integrations.</li>
            <li>Process payments via Stripe when the site owner enables paid bookings.</li>
            <li>Improve reliability, prevent abuse, and comply with law.</li>
          </ul>

          <h2>Retention</h2>
          <p>
            Booking and customer contact records are kept while the site is active so owners can
            manage appointments and comply with their own retention needs. Owners can delete or
            export customer data from dashboard workflows. Technical logs are kept for a limited
            operational period. Integration tokens are deleted when the integration is disconnected
            or the app is uninstalled.
          </p>

          <h2>Uninstall and deletion</h2>
          <ul>
            <li>
              On uninstall/disconnect, Slotwise removes App-applied Webflow Custom Code (site and
              page level), deactivates the Slotwise site so the widget stops accepting bookings, and
              revokes/deletes stored Webflow OAuth tokens.
            </li>
            <li>
              Canvas mount elements must be removed in the Webflow Designer (or via the Slotwise
              disconnect flow) and the owner must Publish for Custom Code removal to appear on the
              live site.
            </li>
            <li>
              Booking history may remain in Slotwise until the owner deletes it or requests erasure
              via support, unless a shorter period is required by law.
            </li>
          </ul>

          <h2>Cookies</h2>
          <p>
            Essential session cookies are used for authenticated dashboards. The public booking
            widget aims to stay cookie-light. If you enable GA4 or Meta Pixel, those products may set
            their own cookies under their policies.
          </p>

          <h2>Contact</h2>
          <p>
            Privacy requests:{" "}
            <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> ({LEGAL_ENTITY}).
          </p>
        </div>
        <p className="mt-12 text-sm text-[#93a4bc]">
          <Link href="/" className="hover:text-white">
            ← Back home
          </Link>
          {" · "}
          <Link href="/terms" className="hover:text-white">
            Terms
          </Link>
          {" · "}
          <Link href="/docs/webflow" className="hover:text-white">
            Webflow docs
          </Link>
        </p>
      </div>
    </main>
  );
}
