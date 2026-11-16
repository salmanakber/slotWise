import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

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
        <p className="mt-2 text-sm text-[#93a4bc]">Last updated 16 November 2026</p>
        <div className="mt-10 space-y-4 text-[15px] leading-relaxed text-[#c9d0da] [&_a]:text-[#f5a000] [&_a]:underline [&_h2]:mt-8 [&_h2]:text-xl [&_h2]:font-extrabold [&_h2]:text-white [&_ul]:list-disc [&_ul]:space-y-2 [&_ul]:pl-5">
          <p>
            Slotwise (“we”, “us”) provides Webflow-native booking software at{" "}
            <strong>slotwise.hindaralabs.com</strong>. This policy explains what we collect and why.
          </p>
          <h2>What we collect</h2>
          <ul>
            <li>Account details you provide (name, email, password hash).</li>
            <li>Site and booking data you create (services, staff, appointments, customer contact fields).</li>
            <li>Integration credentials you save in the platform console (encrypted at rest).</li>
            <li>Technical logs needed to operate and secure the service.</li>
          </ul>
          <h2>How we use data</h2>
          <ul>
            <li>To run booking, payments handoff to Stripe, reminders, and your dashboards.</li>
            <li>To connect Webflow sites when you authorize the Slotwise app.</li>
            <li>To improve reliability, prevent abuse, and comply with law.</li>
          </ul>
          <h2>Payments</h2>
          <p>
            Card data is handled by Stripe. Slotwise does not store full card numbers. Connected-account
            payouts go to the business; Slotwise does not take a booking commission by default.
          </p>
          <h2>Retention &amp; rights</h2>
          <p>
            Site owners can export or delete customer data from settings workflows. Platform operators can
            deactivate sites. Contact{" "}
            <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a> for privacy requests.
          </p>
          <h2>Cookies</h2>
          <p>
            We use essential session cookies for authenticated dashboards. The public booking widget aims to
            stay cookie-light; optional marketing cookies are not required for booking.
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
        </p>
      </div>
    </main>
  );
}
