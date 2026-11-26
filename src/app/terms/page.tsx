import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { LEGAL_ENTITY, SUPPORT_EMAIL, SUPPORT_MAILTO } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Service",
  description: "Terms for using Slotwise booking software.",
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#0a1018] text-[#eaf0f8]">
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8">
        <Link href="/" className="mb-10 inline-flex items-center gap-3">
          <Image src="/logo.png" alt="Slotwise" width={36} height={36} className="rounded-lg" />
          <span className="font-extrabold">Slotwise</span>
        </Link>
        <h1 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Terms of Service</h1>
        <p className="mt-2 text-sm text-[#93a4bc]">Last updated 26 November 2026</p>
        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c9d0da] [&_a]:text-[#f5a000] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <p>
            By using Slotwise at <strong>slotwise.hindaralabs.com</strong> you agree to these terms
            with <strong>{LEGAL_ENTITY}</strong> (“we”, “us”).
          </p>

          <h2>The service</h2>
          <p>
            Slotwise provides booking software for Webflow sites: a Designer Extension to place a
            booking mount, a hosted runtime script applied through Webflow Custom Code that renders
            the booking UI in-page on published pages, an owner dashboard, and optional integrations
            (Stripe, Google Calendar/Meet, Zoom, Microsoft Teams/Outlook, Mailchimp, GA4, Meta Pixel,
            and AI Calendar Chat on eligible plans).
          </p>

          <h2>Accounts</h2>
          <ul>
            <li>Keep credentials secure. You are responsible for activity under your login.</li>
            <li>Platform roles may manage sites, billing configuration, and provider secrets.</li>
            <li>Site owners manage their own bookings, branding, and customer data.</li>
          </ul>

          <h2>Plans and fees</h2>
          <p>
            Slotwise offers Free and paid subscription plans with booking and feature limits as shown
            on the pricing section of our website. Paid bookings use Stripe; Slotwise’s default
            platform application fee on booking charges is 0%. Stripe’s processing fees still apply.
            You must comply with Stripe’s terms for connected accounts.
          </p>

          <h2>Webflow Custom Code</h2>
          <p>
            When installed, Slotwise may register and apply a hosted script (
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-[13px] text-[#eaf0f8]">
              widget.js
            </code>
            ) on your Webflow site so the booking UI can run on published pages. On uninstall,
            Slotwise removes App-applied Custom Code. You must Publish your Webflow site for
            additions or removals to appear live. Slotwise does not publish your site without a
            direct action from you (or an explicit Publish control you click).
          </p>

          <h2>Acceptable use</h2>
          <p>
            Do not abuse the API, attempt unauthorized access, spam customers, or use Slotwise for
            illegal activity. We may suspend sites that threaten platform stability or users.
          </p>

          <h2>Availability</h2>
          <p>
            We aim for high uptime but do not guarantee uninterrupted service. Booking outages can
            affect your customers; keep backups of critical schedules where needed.
          </p>

          <h2>Contact</h2>
          <p>
            Support: <a href={SUPPORT_MAILTO}>{SUPPORT_EMAIL}</a> ({LEGAL_ENTITY}).
          </p>
        </div>
        <p className="mt-12 text-sm text-[#93a4bc]">
          <Link href="/" className="hover:text-white">
            ← Back home
          </Link>
          {" · "}
          <Link href="/privacy" className="hover:text-white">
            Privacy
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
