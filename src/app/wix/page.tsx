import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { getPublicPlans } from "@/lib/public-plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://slotwise.hindaralabs.com"),
  title: "Slotwise for Wix — Booking & appointment calendar",
  description:
    "Add a branded booking calendar to your Wix site. Same Slotwise dashboard, Stripe payouts, and in-page widget — built for Wix without changing your Webflow setup.",
  keywords: [
    "Wix booking app",
    "Wix appointment calendar",
    "Wix scheduling widget",
    "Calendly alternative for Wix",
    "Stripe booking Wix",
    "Slotwise Wix",
  ],
  alternates: {
    canonical: "/wix",
  },
  openGraph: {
    title: "Slotwise for Wix — Bookings that match your site",
    description:
      "In-page booking for Wix. Shared Slotwise backend, dashboard, and Stripe Connect — zero booking commission by default.",
    url: "https://slotwise.hindaralabs.com/wix",
    siteName: "Slotwise",
    type: "website",
    images: [{ url: "/hero-image.png", width: 1200, height: 630, alt: "Slotwise for Wix" }],
  },
  robots: { index: true, follow: true },
};

const STEPS = [
  {
    n: "01",
    title: "Connect Slotwise",
    body: "Create your workspace, add services and availability in the same dashboard Webflow users already know.",
  },
  {
    n: "02",
    title: "Place the widget",
    body: "Drop a Slotwise mount on your Wix page and load the hosted runtime — booking UI renders in-page, not as a foreign iframe shell.",
  },
  {
    n: "03",
    title: "Take bookings",
    body: "Customers book on your site. You get Stripe payouts, calendar sync, and branding that follows your theme.",
  },
];

export default async function WixLandingPage() {
  const plans = await getPublicPlans().catch(() => []);

  return (
    <div
      className="min-h-screen text-[#e8f0ec]"
      style={{
        background:
          "radial-gradient(1100px 560px at 12% -8%, rgba(14, 184, 148, 0.22), transparent 55%), radial-gradient(900px 500px at 92% 8%, rgba(245, 160, 0, 0.12), transparent 50%), linear-gradient(165deg, #06110e 0%, #0b1a16 42%, #0a1210 100%)",
        fontFamily: "var(--font-figtree), Figtree, system-ui, sans-serif",
      }}
    >
      <header className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-5 sm:px-8">
        <Link href="/wix" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="" width={32} height={32} className="rounded-lg" />
          <span
            className="text-[17px] font-extrabold tracking-tight text-white"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            Slotwise
          </span>
        </Link>
        <nav className="flex items-center gap-3 text-[13px] font-semibold sm:gap-5">
          <Link href="/docs/wix" className="hidden text-[#9db5ab] hover:text-white sm:inline">
            Docs
          </Link>
          <Link href="/" className="hidden text-[#9db5ab] hover:text-white sm:inline">
            Webflow version
          </Link>
          <Link
            href="/login"
            className="rounded-full bg-[#0eb894] px-4 py-2 text-[13px] font-extrabold text-[#04140f] transition hover:brightness-110"
          >
            Open dashboard
          </Link>
        </nav>
      </header>

      {/* Hero — one composition: brand, headline, line, CTAs, full-bleed atmosphere */}
      <section className="relative mx-auto grid min-h-[min(88vh,820px)] max-w-6xl items-end px-5 pb-16 pt-10 sm:px-8 sm:pb-20 sm:pt-14">
        <div
          className="pointer-events-none absolute inset-x-0 top-0 h-[70%] opacity-40"
          style={{
            background:
              "linear-gradient(120deg, transparent 20%, rgba(14,184,148,0.08) 50%, transparent 80%), repeating-linear-gradient(-12deg, transparent, transparent 18px, rgba(255,255,255,0.02) 18px, rgba(255,255,255,0.02) 19px)",
          }}
          aria-hidden
        />
        <div className="relative max-w-2xl">
          <p
            className="text-[12px] font-extrabold uppercase tracking-[0.2em] text-[#0eb894]"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            For Wix
          </p>
          <h1
            className="mt-3 text-[clamp(2.6rem,7vw,4.6rem)] font-extrabold leading-[0.95] tracking-[-0.03em] text-white"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            Slotwise
          </h1>
          <p className="mt-5 max-w-[34ch] text-[17px] leading-relaxed text-[#b7c9c1]">
            Bookings that feel native on your Wix site — same Slotwise engine brands already trust on
            Webflow.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/api/wix/install"
              className="rounded-full bg-[#0eb894] px-6 py-3 text-[14px] font-extrabold text-[#04140f] transition hover:brightness-110"
            >
              Install on Wix
            </Link>
            <Link
              href={`/book/${DEMO_PUBLIC_KEY}`}
              className="rounded-full border border-white/20 bg-white/5 px-6 py-3 text-[14px] font-bold text-white backdrop-blur transition hover:bg-white/10"
            >
              Live demo
            </Link>
          </div>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            How it works on Wix
          </h2>
          <p className="mt-2 max-w-[48ch] text-[15px] text-[#9db5ab]">
            One backend. One dashboard. A Wix-ready install path that does not touch your Webflow
            Marketplace setup.
          </p>
          <ol className="mt-10 grid gap-8 sm:grid-cols-3">
            {STEPS.map((s) => (
              <li key={s.n} className="min-w-0">
                <span className="text-[12px] font-extrabold tracking-[0.14em] text-[#0eb894]">
                  {s.n}
                </span>
                <h3
                  className="mt-2 text-lg font-extrabold text-white"
                  style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
                >
                  {s.title}
                </h3>
                <p className="mt-2 text-[14px] leading-relaxed text-[#9db5ab]">{s.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="border-t border-white/10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl">
          <h2
            className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl"
            style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
          >
            Same product, Wix surface
          </h2>
          <ul className="mt-8 grid gap-4 text-[15px] text-[#c5d6ce] sm:grid-cols-2">
            <li className="border-l-2 border-[#0eb894] pl-4">In-page widget (not a bolted-on iframe shell)</li>
            <li className="border-l-2 border-[#0eb894] pl-4">Shared branding, staff, and availability</li>
            <li className="border-l-2 border-[#0eb894] pl-4">Stripe Connect — 0% Slotwise booking commission by default</li>
            <li className="border-l-2 border-[#0eb894] pl-4">Google / Zoom / Teams integrations from one dashboard</li>
          </ul>
          <p className="mt-8 text-[14px] text-[#9db5ab]">
            Looking for Webflow?{" "}
            <Link href="/" className="font-bold text-[#0eb894] underline-offset-2 hover:underline">
              Go to the Webflow homepage
            </Link>
            .
          </p>
        </div>
      </section>

      {plans.length ? (
        <section className="border-t border-white/10 px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <h2
              className="text-2xl font-extrabold tracking-tight text-white"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Plans
            </h2>
            <p className="mt-2 text-[14px] text-[#9db5ab]">Identical pricing to Slotwise on Webflow.</p>
            <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {plans.map((p) => (
                <div
                  key={p.tier}
                  className="border border-white/10 bg-white/[0.03] px-4 py-5"
                >
                  <div className="text-[13px] font-extrabold text-white">{p.name}</div>
                  <div className="mt-1 text-2xl font-extrabold text-[#0eb894]">
                    {p.priceMonthly === 0 ? "$0" : `$${(p.priceMonthly / 100).toFixed(0)}`}
                    <span className="text-[12px] font-semibold text-[#9db5ab]">/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="border-t border-white/10 px-5 py-16 sm:px-8">
        <div className="mx-auto max-w-6xl flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2
              className="text-2xl font-extrabold text-white"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Ready when you are
            </h2>
            <p className="mt-2 max-w-[40ch] text-[14px] text-[#9db5ab]">
              Install via Wix App OAuth, then place the widget from Branding → Add to Wix. Webflow
              stays on its own path.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/docs/wix"
              className="rounded-full border border-white/20 px-5 py-2.5 text-[13px] font-bold text-white hover:bg-white/5"
            >
              Read Wix docs
            </Link>
            <Link
              href="/api/wix/install"
              className="rounded-full bg-[#0eb894] px-5 py-2.5 text-[13px] font-extrabold text-[#04140f]"
            >
              Install on Wix
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 text-[13px] text-[#7f958b] sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded" />
            <span className="font-bold text-white/80">Slotwise for Wix</span>
          </div>
          <div className="flex flex-wrap gap-4">
            <Link href="/docs/wix" className="hover:text-white">
              Docs
            </Link>
            <Link href="/privacy" className="hover:text-white">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-white">
              Terms
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-white">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
