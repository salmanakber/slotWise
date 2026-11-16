import Image from "next/image";
import Link from "next/link";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";

export default function HomePage() {
  return (
    <main className="relative min-h-screen overflow-hidden px-6 py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10 opacity-90"
        style={{
          background:
            "radial-gradient(900px 420px at 10% -10%, rgba(245,160,0,.28), transparent 60%), radial-gradient(700px 380px at 90% 0%, rgba(43,75,255,.12), transparent 55%), linear-gradient(180deg, #f7f8fb, #eef2f6)",
        }}
      />

      <div className="mx-auto flex max-w-4xl flex-col gap-10">
        <div className="flex items-center gap-3">
          <Image src="/logo.png" alt="Slotwise" width={56} height={56} className="rounded-2xl shadow-sm" />
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight" style={{ fontFamily: "Manrope, system-ui" }}>
              Slotwise
            </h1>
            <p className="text-sm" style={{ color: "var(--mut)" }}>
              Webflow-native booking · multi-theme · no commission
            </p>
          </div>
        </div>

        <p className="max-w-2xl text-lg leading-relaxed" style={{ color: "var(--mut)" }}>
          Bookings that look like the site. Eight themes, brand loader, deposits, manage-by-link,
          and a platform console for you to run the whole marketplace.
        </p>

        <div className="grid gap-3 sm:grid-cols-3">
          <Link href={`/book/${DEMO_PUBLIC_KEY}`} className="sw-card block transition hover:border-[var(--ac)]">
            <h2 className="mb-1 text-base font-extrabold">Try booking</h2>
            <p className="text-sm" style={{ color: "var(--mut)" }}>
              Live widget for Studio Nine demo
            </p>
          </Link>
          <Link href="/dashboard" className="sw-card block transition hover:border-[var(--ac)]">
            <h2 className="mb-1 text-base font-extrabold">Site admin</h2>
            <p className="text-sm" style={{ color: "var(--mut)" }}>
              Bookings, branding, install
            </p>
          </Link>
          <Link href="/platform" className="sw-card block transition hover:border-[var(--ac)]">
            <h2 className="mb-1 text-base font-extrabold">Platform owner</h2>
            <p className="text-sm" style={{ color: "var(--mut)" }}>
              Sites, Stripe, plans, flags
            </p>
          </Link>
        </div>

        <div className="sw-card">
          <h2 className="mb-2 text-[15px] font-extrabold">Why this beats a Calendly embed</h2>
          <ul className="m-0 grid gap-2 list-disc pl-5 text-sm sm:grid-cols-2" style={{ color: "var(--mut)" }}>
            <li>Class/theme control that matches the Webflow site</li>
            <li>Deposits + no-show protection without Slotwise fees</li>
            <li>Agency multi-site mode on the roadmap (P1)</li>
            <li>Install/uninstall through Webflow APIs, not paste debt</li>
          </ul>
        </div>
      </div>
    </main>
  );
}
