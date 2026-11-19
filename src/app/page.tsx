import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { getPublicPlans, type PublicPlan } from "@/lib/public-plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://slotwise.hindaralabs.com"),
  title: "Slotwise — Webflow-Native Appointment & Calendar Booking App",
  description:
    "The Webflow-native booking and calendar widget for agencies and service brands. Inherit your site theme, take zero-commission Stripe deposits, and sync Google Meet, Zoom & Teams.",
  keywords: [
    "Webflow booking app",
    "Webflow calendar widget",
    "Webflow appointment scheduling",
    "Stripe booking Webflow",
    "zero commission scheduler",
    "Webflow Designer scheduling app",
    "Slotwise",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Slotwise — Bookings That Look Native to Your Webflow Site",
    description:
      "Install in Webflow, inherit your brand styles automatically, accept Stripe payouts with 0% booking fees, and sync team calendars.",
    url: "https://slotwise.hindaralabs.com",
    siteName: "Slotwise",
    type: "website",
    images: [
      {
        url: "/hero-image.png",
        width: 1200,
        height: 630,
        alt: "Slotwise Webflow-native booking calendar preview",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Slotwise — Webflow-Native Booking & Calendar App",
    description:
      "Styled like your Webflow site. Paid straight to your Stripe. Zero booking commission.",
    images: ["/hero-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

const INTEGRATIONS = [
  { id: "webflow", name: "Webflow", hint: "Native Marketplace" },
  { id: "stripe", name: "Stripe", hint: "Direct 0%-fee payouts" },
  { id: "google", name: "Google Calendar", hint: "2-way sync + Meet" },
  { id: "zoom", name: "Zoom", hint: "Auto meeting links" },
  { id: "teams", name: "Microsoft Teams", hint: "Outlook ready" },
  { id: "apple", name: "Apple Calendar", hint: "iCloud CalDAV" },
  { id: "hubspot", name: "HubSpot", hint: "CRM contact sync" },
  { id: "mailchimp", name: "Mailchimp", hint: "Audience sync" },
];

const STEPS = [
  {
    n: "01",
    badge: "2-minute setup",
    title: "Connect Webflow natively",
    body: "Install from the Webflow Marketplace or Designer. Slotwise binds cleanly to your site — CMS-aware, responsive, with clean uninstall hygiene.",
  },
  {
    n: "02",
    badge: "Automatic styling",
    title: "Match your design system",
    body: "Pick from eight curated themes or bind your CSS variables, fonts, and brand colors so your calendar feels hand-built, never pasted on.",
  },
  {
    n: "03",
    badge: "0% commission",
    title: "Accept paid bookings",
    body: "Clients book slots and pay deposits straight to your Stripe Connect account. Rescheduling works via magic links — no client logins required.",
  },
];

const FAQ = [
  {
    q: "Does Slotwise charge a booking commission or transaction fee?",
    a: "No. Your Stripe Connect payouts go 100% to you. You only pay your Slotwise subscription plan and standard Stripe card processing fees.",
  },
  {
    q: "How is Slotwise built specifically for Webflow?",
    a: "Slotwise installs via Webflow Marketplace OAuth and the Designer extension, inherits CSS variables and site typography, works with Webflow CMS flows, and cleanly deactivates leftover embeds if uninstalled.",
  },
  {
    q: "Which calendars and video conferencing tools sync with Slotwise?",
    a: "You can connect Google Calendar & Google Meet, Zoom, Microsoft Teams & Outlook, Apple iCloud Calendar (CalDAV), plus HubSpot and Mailchimp directly from Integrations.",
  },
  {
    q: "What is included on the Free plan?",
    a: "The Free plan includes a live Webflow booking widget, email reminders, buffer & timezone protection, and core themes — everything needed to launch. Upgrade as your team or volume grows.",
  },
  {
    q: "Do my customers need to create an account to book or reschedule?",
    a: "No. Customers book in seconds and receive a secure magic link to cancel or reschedule within your policy rules, eliminating login friction and drop-offs.",
  },
  {
    q: "Can Webflow agencies manage multiple client sites?",
    a: "Yes. Slotwise includes agency controls with multi-site management, platform feature flags, and per-site branding from a unified dashboard.",
  },
];

function IntegrationIcon({ id }: { id: string }) {
  switch (id) {
    case "webflow":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#146EF5]" fill="currentColor" aria-hidden="true">
          <path d="M17.8 6.5 15.1 14l-1.9-5.8c-.2-.6-.8-1-1.4-1-.7 0-1.2.4-1.4 1L8.5 14 6.2 6.5H2.8l3.7 11c.2.6.8 1 1.5 1 .7 0 1.2-.4 1.5-1l2-5.6 2 5.6c.2.6.8 1 1.5 1 .7 0 1.3-.4 1.5-1l4-11h-2.7Z" />
        </svg>
      );
    case "stripe":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#635BFF]" fill="currentColor" aria-hidden="true">
          <path d="M13.98 10.67c0-.76.62-1.06 1.65-1.06 1.48 0 3.35.45 4.83 1.25V6.28A12.1 12.1 0 0 0 15.63 5.4c-3.95 0-6.58 2.06-6.58 5.5 0 5.36 7.38 4.5 7.38 6.82 0 .9-.78 1.19-1.88 1.19-1.62 0-3.7-.67-5.34-1.57v4.64c1.82.78 3.66 1.11 5.34 1.11 4.05 0 6.83-2 6.83-5.49-.02-5.79-7.4-4.76-7.4-6.93Z" />
        </svg>
      );
    case "google":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="3" stroke="#1A73E8" strokeWidth="2" />
          <path d="M3 9h18" stroke="#1A73E8" strokeWidth="2" />
          <path d="M8 2v4M16 2v4" stroke="#EA4335" strokeWidth="2" strokeLinecap="round" />
          <rect x="7.5" y="12.5" width="3.5" height="3.5" rx="0.75" fill="#34A853" />
          <rect x="13" y="12.5" width="3.5" height="3.5" rx="0.75" fill="#FBBC04" />
        </svg>
      );
    case "zoom":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#0B5CFF]" fill="currentColor" aria-hidden="true">
          <path d="M3 7.5A2.5 2.5 0 0 1 5.5 5h8A2.5 2.5 0 0 1 16 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-8A2.5 2.5 0 0 1 3 16.5v-9Zm14.5 2.2 3.3-2.2a.8.8 0 0 1 1.2.67v7.66a.8.8 0 0 1-1.2.67l-3.3-2.2V9.7Z" />
        </svg>
      );
    case "teams":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#5059C9]" fill="currentColor" aria-hidden="true">
          <circle cx="16.5" cy="7.5" r="2.2" />
          <path d="M14.5 11h5a1.5 1.5 0 0 1 1.5 1.5v4a3 3 0 0 1-3 3h-1.2a3.5 3.5 0 0 1-2.3-.9V11Z" opacity=".75" />
          <rect x="3" y="6" width="11" height="12" rx="2" />
          <path d="M6.2 9.5h4.6v1.4H9.2v4.6H7.8v-4.6H6.2V9.5Z" fill="#fff" />
        </svg>
      );
    case "apple":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-slate-900" fill="none" stroke="currentColor" strokeWidth="1.9" aria-hidden="true">
          <rect x="3.5" y="4.5" width="17" height="16" rx="3.5" />
          <path d="M3.5 9.5h17" />
          <path d="M8 2.5v3M16 2.5v3" strokeLinecap="round" />
          <circle cx="12" cy="14.5" r="1.5" fill="#EF4444" stroke="none" />
        </svg>
      );
    case "hubspot":
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#FF7A59]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <circle cx="13" cy="12" r="4" />
          <circle cx="13" cy="4.5" r="1.5" fill="currentColor" />
          <circle cx="5.5" cy="15.5" r="2" />
          <circle cx="18.5" cy="17.5" r="1.5" fill="currentColor" />
          <path d="M13 6v2M9.5 13.5l-2.3 1.2M16 14.8l1.6 1.7" strokeLinecap="round" />
        </svg>
      );
    default:
      return (
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#D97706]" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
          <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5v-9Z" />
          <path d="m5 7 7 5 7-5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      );
  }
}

function CheckIcon({ className = "h-4 w-4 text-amber-600" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`shrink-0 ${className}`} aria-hidden="true">
      <path
        fillRule="evenodd"
        d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.2 7.25a1 1 0 0 1-1.42 0l-3.4-3.425a1 1 0 1 1 1.418-1.41l2.69 2.71 6.492-6.533a1 1 0 0 1 1.414-.006Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PricingCards({ plans }: { plans: PublicPlan[] }) {
  return (
    <div className="mt-12 grid gap-6 sm:grid-cols-2 xl:grid-cols-4">
      {plans.map((p) => (
        <article
          key={p.tier}
          className={`relative flex flex-col overflow-hidden rounded-3xl border p-7 transition duration-300 hover:-translate-y-1 ${
            p.highlighted
              ? "border-amber-400 bg-gradient-to-b from-amber-50/90 via-white to-white shadow-[0_24px_60px_-15px_rgba(245,158,11,0.25)] ring-1 ring-amber-400/50"
              : "border-slate-200/90 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.04)] hover:border-slate-300 hover:shadow-[0_16px_40px_rgba(15,23,42,0.08)]"
          }`}
        >
          {p.highlighted ? (
            <span className="mb-4 inline-flex w-fit items-center gap-1.5 rounded-full bg-amber-500 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-slate-950 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-950" />
              Most popular
            </span>
          ) : (
            <span className="mb-4 h-[26px]" />
          )}

          <h3 className="text-xs font-extrabold uppercase tracking-[0.16em] text-amber-700">{p.name}</h3>

          <div className="mt-3 flex items-baseline gap-1.5">
            <span className="text-[2.75rem] font-extrabold leading-none tracking-tight text-slate-950">
              {p.priceLabel}
            </span>
            <span className="text-sm font-medium text-slate-500">/ month</span>
          </div>

          <ul className="mt-6 flex flex-1 flex-col gap-3 border-t border-slate-100 pt-6">
            {p.bullets.map((b) => (
              <li key={b} className="flex items-start gap-2.5 text-[13.5px] leading-snug text-slate-600">
                <CheckIcon className="mt-0.5 h-4 w-4 text-amber-500" />
                <span>{b}</span>
              </li>
            ))}
          </ul>

          <Link
            href="/login"
            className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-center text-sm font-bold transition ${
              p.highlighted
                ? "bg-slate-950 text-white shadow-md hover:bg-slate-800"
                : "border border-slate-200 bg-slate-50 text-slate-900 hover:border-slate-300 hover:bg-slate-100"
            }`}
          >
            {p.tier === "FREE" ? "Start free" : `Choose ${p.name}`}
          </Link>
        </article>
      ))}
    </div>
  );
}

export default async function HomePage() {
  const plans = await getPublicPlans();

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "SoftwareApplication",
        name: "Slotwise",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Webflow",
        url: "https://slotwise.hindaralabs.com",
        description:
          "Webflow-native booking and appointment scheduling software with zero-commission Stripe payouts, CSS theme inheritance, and Google Meet, Zoom, and Teams sync.",
        offers: plans.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.priceLabel.replace(/[^0-9.]/g, "") || "0",
          priceCurrency: "USD",
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((item) => ({
          "@type": "Question",
          name: item.q,
          acceptedAnswer: {
            "@type": "Answer",
            text: item.a,
          },
        })),
      },
    ],
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-white text-slate-900 selection:bg-amber-200 selection:text-slate-950">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <style>{`
        @keyframes sw-rise {
          from { opacity: 0; transform: translateY(20px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes sw-float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-10px); }
        }
        @keyframes sw-marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .sw-rise-1 { animation: sw-rise .7s cubic-bezier(.2,.8,.2,1) both; }
        .sw-rise-2 { animation: sw-rise .8s .08s cubic-bezier(.2,.8,.2,1) both; }
        .sw-rise-3 { animation: sw-rise .85s .16s cubic-bezier(.2,.8,.2,1) both; }
        .sw-rise-4 { animation: sw-rise .9s .24s cubic-bezier(.2,.8,.2,1) both; }
        .sw-float { animation: sw-float 6s ease-in-out infinite; }
        .sw-float-delayed { animation: sw-float 7s 1.2s ease-in-out infinite; }
        .sw-marquee { animation: sw-marquee 34s linear infinite; }
        .sw-marquee:hover { animation-play-state: paused; }
        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .sw-rise-1, .sw-rise-2, .sw-rise-3, .sw-rise-4, .sw-float, .sw-float-delayed, .sw-marquee { animation: none !important; }
        }
      `}</style>

      {/* ===== STICKY TOP NAVIGATION ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200/70 bg-white/85 backdrop-blur-md">
        <nav
          aria-label="Primary"
          className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8"
        >
          <Link href="/" className="flex items-center gap-2.5">
            <Image
              src="/logo.png"
              alt="Slotwise logo"
              width={34}
              height={34}
              className="rounded-lg shadow-sm ring-1 ring-slate-900/5"
              priority
            />
            <span
              className="text-[18px] font-extrabold tracking-tight text-slate-950"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Slotwise
            </span>
            <span className="hidden rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#146EF5] ring-1 ring-blue-500/20 sm:inline-block">
              For Webflow
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold text-slate-600 md:flex">
            <a href="#features" className="transition hover:text-slate-950">
              Features
            </a>
            <a href="#how-it-works" className="transition hover:text-slate-950">
              How it works
            </a>
            <a href="#pricing" className="transition hover:text-slate-950">
              Pricing
            </a>
            <a href="#faq" className="transition hover:text-slate-950">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2.5 sm:gap-3">
            <Link
              href={`/book/${DEMO_PUBLIC_KEY}`}
              className="hidden rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950 sm:inline-flex"
            >
              Live demo
            </Link>
            <Link
              href="/login"
              className="rounded-full px-3.5 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 hover:text-slate-950"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="rounded-full bg-slate-950 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ===== HERO SECTION ===== */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF7] via-white to-slate-50/70 pb-20 pt-12 sm:pb-28 sm:pt-20">
          {/* Architectural Grid + Soft Ambient Glows */}
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 35%, transparent 100%)",
            }}
          />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[440px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-200/40 via-amber-100/30 to-blue-200/30 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10 lg:px-8">
            <div>
              <div className="sw-rise-1 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/90 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                Webflow-Native Appointment &amp; Calendar App
              </div>

              <h1
                className="sw-rise-2 mt-6 text-[clamp(2.5rem,5.2vw,4.35rem)] font-extrabold leading-[1.02] tracking-[-0.035em] text-slate-950"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Bookings that look{" "}
                <span className="relative inline-block">
                  <span className="relative z-10 bg-gradient-to-r from-amber-600 via-amber-500 to-orange-500 bg-clip-text text-transparent">
                    native
                  </span>
                  <svg
                    viewBox="0 0 180 14"
                    className="absolute -bottom-1 left-0 w-full text-amber-300/80"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M3 10.5C45 3.5 130 2 177 9.5"
                      stroke="currentColor"
                      strokeWidth="5"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>{" "}
                to your Webflow site.
              </h1>

              <p className="sw-rise-3 mt-6 max-w-[46ch] text-base leading-relaxed text-slate-600 sm:text-lg">
                Stop pasting clunky third-party iframes. Slotwise installs straight inside Webflow,
                inherits your site’s design tokens, and sends Stripe deposits directly to you with{" "}
                <strong className="font-semibold text-slate-900">0% booking commission</strong>.
              </p>

              <div className="sw-rise-4 mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/login"
                  className="inline-flex items-center gap-2 rounded-full bg-amber-500 px-7 py-3.5 text-sm font-extrabold text-slate-950 shadow-[0_14px_30px_-8px_rgba(245,158,11,0.55)] transition hover:-translate-y-0.5 hover:bg-amber-400"
                >
                  Start free on Webflow
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path
                      fillRule="evenodd"
                      d="M3 10a.75.75 0 0 1 .75-.75h10.638L10.23 5.29a.75.75 0 1 1 1.04-1.08l5.5 5.25a.75.75 0 0 1 0 1.08l-5.5 5.25a.75.75 0 1 1-1.04-1.08l4.158-3.96H3.75A.75.75 0 0 1 3 10Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </Link>
                <Link
                  href={`/book/${DEMO_PUBLIC_KEY}`}
                  className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-7 py-3.5 text-sm font-bold text-slate-800 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Try live demo
                </Link>
              </div>

              {/* Trust Strip */}
              <div className="sw-rise-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-semibold text-slate-500">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  Free tier available
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  0% payout commission
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  Clean Webflow uninstall
                </span>
              </div>
            </div>

            {/* Hero Visual Showcase Stage */}
            <div className="relative mx-auto w-full max-w-[540px] lg:ml-auto">
              {/* Main Glass Stage */}
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-amber-50/90 via-white to-blue-50/80 p-5 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.14)] sm:p-7">
                {/* Browser Top Bar */}
                <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/90 px-3.5 py-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="rounded-md bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-500">
                    your-agency.webflow.io/book
                  </div>
                  <span className="text-[10px] font-bold text-[#146EF5]">Webflow Sync</span>
                </div>

                {/* 3D Product Image + Visual Overlay */}
                <div className="relative flex items-center justify-center rounded-2xl bg-gradient-to-b from-slate-900/[0.03] to-amber-500/[0.08] py-4">
                  <Image
                    src="/hero-image.png"
                    alt="Slotwise 3D booking calendar, time slots, and Webflow module preview"
                    width={860}
                    height={860}
                    priority
                    className="sw-float relative z-10 w-[min(78vw,380px)] rounded-2xl drop-shadow-[0_24px_45px_rgba(15,23,42,0.18)]"
                  />
                </div>

                {/* Quick Status Bar inside Frame */}
                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme</div>
                    <div className="mt-0.5 text-xs font-extrabold text-slate-900">Auto-Matched</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fee</div>
                    <div className="mt-0.5 text-xs font-extrabold text-emerald-600">$0 Commission</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/90 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Video</div>
                    <div className="mt-0.5 text-xs font-extrabold text-slate-900">Meet / Zoom</div>
                  </div>
                </div>
              </div>

              {/* Floating Notification Pill 1 */}
              <div className="sw-float-delayed absolute -left-3 top-20 z-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                    <path d="M10.75 10.818v2.614A3.13 3.13 0 0 0 11.888 13c.482-.315.612-.648.612-.875 0-.227-.13-.56-.612-.875a3.13 3.13 0 0 0-1.138-.432ZM8.33 8.62c.053.055.115.11.184.164.208.16.46.284.736.363V6.603a2.45 2.45 0 0 0-.35.13c-.14.065-.27.143-.386.233-.377.292-.514.627-.514.909 0 .184.058.39.202.592.037.051.08.102.128.152Z" />
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-6a.75.75 0 0 1 .75.75v.316a3.78 3.78 0 0 1 1.653.713c.426.33.744.74.925 1.2a.75.75 0 0 1-1.395.55 1.35 1.35 0 0 0-.447-.563 2.187 2.187 0 0 0-.736-.363V9.3c.698.093 1.383.32 1.959.696.787.514 1.29 1.27 1.29 2.13 0 .86-.504 1.616-1.29 2.13-.576.377-1.261.603-1.96.696v.299a.75.75 0 1 1-1.5 0v-.3c-.697-.092-1.382-.318-1.958-.695-.482-.315-.857-.717-1.078-1.188a.75.75 0 1 1 1.359-.636c.08.173.245.376.54.569.313.205.706.353 1.138.432v-2.748a3.782 3.782 0 0 1-1.653-.713C6.9 9.433 6.5 8.681 6.5 7.875c0-.805.4-1.558 1.097-2.096a3.78 3.78 0 0 1 1.653-.713V4.75A.75.75 0 0 1 10 4Z"
                      clipRule="evenodd"
                    />
                  </svg>
                </span>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">+$150.00 Paid</div>
                  <div className="text-[11px] text-slate-500">Direct via Stripe Connect</div>
                </div>
              </div>

              {/* Floating Notification Pill 2 */}
              <div className="sw-float absolute -right-4 bottom-24 z-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-blue-50 text-[#146EF5]">
                  <IntegrationIcon id="webflow" />
                </span>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">CSS Variables Bound</div>
                  <div className="text-[11px] text-slate-500">Font &amp; radius inherited</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== INTEGRATIONS MARQUEE ===== */}
        <section className="border-y border-slate-200/80 bg-slate-50/70 py-10" aria-label="Supported integrations">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <p className="mb-6 text-center text-[11px] font-extrabold uppercase tracking-[0.2em] text-slate-500">
              Seamlessly connects with your existing stack
            </p>
          </div>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-50 to-transparent" />
            <div className="sw-marquee flex w-max gap-4 px-4">
              {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className="flex min-w-[210px] items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition hover:border-amber-300"
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-50 ring-1 ring-slate-200/70">
                    <IntegrationIcon id={item.id} />
                  </span>
                  <div>
                    <div className="text-sm font-bold text-slate-900">{item.name}</div>
                    <div className="text-xs text-slate-500">{item.hint}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== BENTO CAPABILITIES SECTION ===== */}
        <section id="features" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
              Built for Webflow
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Not bolted on. Truly Webflow-native.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Generic schedulers break your typography and send users off-site. Slotwise blends
              into your Webflow layout and keeps your brand front and center.
            </p>
          </div>

          {/* Bento Grid */}
          <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Card 1: Native Themes */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                    <span>8 Theme Presets + CSS Vars</span>
                    <span className="text-amber-600">Live Preview</span>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {[
                      "bg-slate-950",
                      "bg-amber-500",
                      "bg-[#146EF5]",
                      "bg-emerald-600",
                      "bg-rose-500",
                      "bg-violet-600",
                    ].map((bg, idx) => (
                      <span
                        key={bg}
                        className={`h-7 w-7 rounded-full ${bg} ${
                          idx === 1 ? "ring-2 ring-amber-500 ring-offset-2" : "opacity-80"
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">Native Webflow Themes</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Eight curated aesthetics, customizable CSS variables, brand loaders, and layout
                  densities that inherit your site’s look automatically.
                </p>
              </div>
            </article>

            {/* Card 2: Zero Commission */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700">Client Deposit</span>
                    <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                      0% Platform Fee
                    </span>
                  </div>
                  <div className="mt-2.5 flex items-baseline justify-between">
                    <span className="text-2xl font-extrabold text-slate-950">$250.00</span>
                    <span className="text-xs font-semibold text-emerald-700">100% → Your Stripe</span>
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">Zero-Commission Payouts</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Accept full payments or no-show deposits via Stripe Connect. Money lands straight
                  in your bank — we never skim a percentage.
                </p>
              </div>
            </article>

            {/* Card 3: Team Scheduling */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="space-y-2">
                    {[
                      { name: "Maya · Design Lead", time: "09:00 – 13:00", active: true },
                      { name: "Liam · Strategist", time: "11:00 – 17:00", active: false },
                    ].map((staff) => (
                      <div
                        key={staff.name}
                        className="flex items-center justify-between rounded-xl bg-white px-3 py-2 text-xs shadow-2xs ring-1 ring-slate-200/60"
                      >
                        <div className="flex items-center gap-2">
                          <span
                            className={`h-2 w-2 rounded-full ${
                              staff.active ? "bg-emerald-500" : "bg-amber-400"
                            }`}
                          />
                          <span className="font-bold text-slate-800">{staff.name}</span>
                        </div>
                        <span className="text-[11px] font-medium text-slate-500">{staff.time}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">Team &amp; Capacity Rules</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Assign staff under “Who”, configure working windows, pre/post buffers, and slot
                  capacity so calendars stay 100% conflict-free.
                </p>
              </div>
            </article>

            {/* Card 4: Partner Apps */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 flex flex-wrap gap-2 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  {[
                    { id: "google", label: "Google Meet" },
                    { id: "zoom", label: "Zoom" },
                    { id: "teams", label: "MS Teams" },
                    { id: "apple", label: "iCloud" },
                  ].map((app) => (
                    <span
                      key={app.label}
                      className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs"
                    >
                      <IntegrationIcon id={app.id} />
                      {app.label}
                    </span>
                  ))}
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">Instant Video &amp; Calendar Sync</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Google Meet, Zoom, and Microsoft Teams links attach automatically after booking.
                  Two-way sync prevents double bookings everywhere.
                </p>
              </div>
            </article>

            {/* Card 5: AI Calendar Chat */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                  <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white">
                    Any morning slots this Thursday?
                  </div>
                  <div className="w-fit rounded-2xl rounded-bl-sm border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                    Yes — 9:30 AM &amp; 11:00 AM with Maya ✨
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">On-Brand AI Concierge</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Visitors ask natural-language availability questions right inside your widget.
                  Answers stay accurate, on-brand, and plan-gated.
                </p>
              </div>
            </article>

            {/* Card 6: Agency Controls */}
            <article className="group flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300/80 hover:shadow-lg">
              <div>
                <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                  <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-2xs ring-1 ring-slate-200/60">
                    <div>
                      <div className="text-xs font-extrabold text-slate-900">Agency Multi-Site</div>
                      <div className="text-[11px] text-slate-500">12 Webflow clients active</div>
                    </div>
                    <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#146EF5]">
                      Managed
                    </span>
                  </div>
                </div>
                <h3 className="text-lg font-extrabold text-slate-950">Agency-Grade Controls</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  Built for Webflow studios: multi-site switching, platform secrets, feature flags,
                  and clean embed deactivation on uninstall.
                </p>
              </div>
            </article>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200/80 bg-slate-50/80 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
                Simple Workflow
              </span>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                From blank page to paid bookings in three steps.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
                Launch an appointment flow inside Webflow without custom backend code or fighting
                iframe height bugs.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {STEPS.map((s) => (
                <div
                  key={s.n}
                  className="relative flex flex-col rounded-3xl border border-slate-200/90 bg-white p-8 shadow-2xs"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-amber-100 text-sm font-extrabold text-amber-900"
                      style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
                    >
                      {s.n}
                    </span>
                    <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                      {s.badge}
                    </span>
                  </div>
                  <h3 className="mt-6 text-xl font-extrabold text-slate-950">{s.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-600">{s.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ===== PRODUCT PROOF & INTERACTIVE MOCKUP ===== */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#146EF5]">
              Conversion-First Flow
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Smooth for your visitors. Powerful for your team.
            </h2>
            <p className="mt-4 max-w-[46ch] text-base leading-relaxed text-slate-600">
              Customers pick a service, choose a team member, and lock a time in one clean view.
              You get instant deposits, magic-link rescheduling, and funnel drop-off analytics.
            </p>
            <ul className="mt-8 space-y-3.5 text-sm font-medium text-slate-700">
              {[
                "Real-time double-book locks with buffers & automatic time zones",
                "Passwordless magic links for client self-reschedule & cancel",
                "Optional team 'Who' picker plus HubSpot & Mailchimp contact sync",
                "Webflow Designer extension for instant place-and-style control",
              ].map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-5 w-5 text-amber-500" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link
                href={`/book/${DEMO_PUBLIC_KEY}`}
                className="inline-flex items-center gap-2 rounded-full bg-slate-950 px-6 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-slate-800"
              >
                Open interactive live demo
              </Link>
              <Link
                href="/login"
                className="inline-flex items-center rounded-full border border-slate-200 bg-white px-6 py-3 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
              >
                Create workspace
              </Link>
            </div>
          </div>

          {/* Crisp Light-Mode Booking Widget Mockup */}
          <div className="relative">
            <div className="pointer-events-none absolute -inset-4 rounded-[2.5rem] bg-gradient-to-tr from-amber-100/70 via-transparent to-blue-100/70 blur-2xl" />
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_70px_-15px_rgba(15,23,42,0.12)] sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div className="flex items-center gap-2.5">
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-500 text-sm font-extrabold text-slate-950">
                    S9
                  </span>
                  <div>
                    <div className="text-sm font-extrabold text-slate-950">Studio Nine</div>
                    <div className="text-[11px] text-slate-500">Brand &amp; Webflow Consultancy</div>
                  </div>
                </div>
                <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                  Live Widget
                </span>
              </div>

              <div className="mt-5">
                <div className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  1. Select a service
                </div>
                <div className="mt-2.5 space-y-2">
                  {[
                    { name: "Discovery Consultation", meta: "30 min · Free", selected: true },
                    { name: "Webflow Architecture Audit", meta: "45 min · $80", selected: false },
                    { name: "Design System Workshop", meta: "90 min · $210", selected: false },
                  ].map((row) => (
                    <div
                      key={row.name}
                      className={`flex items-center justify-between rounded-2xl border px-4 py-3 text-sm transition ${
                        row.selected
                          ? "border-amber-400 bg-amber-50/70 shadow-2xs"
                          : "border-slate-200/80 bg-white hover:border-slate-300"
                      }`}
                    >
                      <div>
                        <div className="font-bold text-slate-900">{row.name}</div>
                        <div className="text-xs text-slate-500">{row.meta}</div>
                      </div>
                      {row.selected ? (
                        <span className="rounded-full bg-amber-500 px-2.5 py-0.5 text-[11px] font-extrabold text-slate-950">
                          Selected
                        </span>
                      ) : (
                        <span className="h-4 w-4 rounded-full border border-slate-300" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <span>2. Pick day &amp; time</span>
                  <span className="text-slate-500 normal-case">America/New_York</span>
                </div>
                <div className="mt-2.5 grid grid-cols-4 gap-2">
                  {[
                    { day: "Mon", date: "16", active: false },
                    { day: "Tue", date: "17", active: false },
                    { day: "Wed", date: "18", active: true },
                    { day: "Thu", date: "19", active: false },
                  ].map((d) => (
                    <div
                      key={d.day}
                      className={`rounded-xl border py-2.5 text-center transition ${
                        d.active
                          ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                          : "border-slate-200 bg-slate-50/70 text-slate-700"
                      }`}
                    >
                      <div className={`text-[10px] font-semibold ${d.active ? "text-slate-300" : "text-slate-400"}`}>
                        {d.day}
                      </div>
                      <div className="text-sm font-extrabold">{d.date}</div>
                    </div>
                  ))}
                </div>

                <div className="mt-2.5 grid grid-cols-3 gap-2">
                  {["09:30 AM", "11:00 AM", "02:15 PM"].map((slot, i) => (
                    <div
                      key={slot}
                      className={`rounded-xl border py-2 text-center text-xs font-bold ${
                        i === 1
                          ? "border-amber-500 bg-amber-50 text-amber-900"
                          : "border-slate-200 bg-white text-slate-700"
                      }`}
                    >
                      {slot}
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 flex items-center justify-between rounded-2xl border border-slate-200/80 bg-slate-50 px-4 py-3">
                <span className="text-xs font-bold text-slate-600">Auto video link</span>
                <div className="flex gap-1.5">
                  {["Meet", "Zoom", "Teams"].map((t, idx) => (
                    <span
                      key={t}
                      className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                        idx === 0
                          ? "bg-white text-slate-900 shadow-2xs ring-1 ring-slate-200"
                          : "text-slate-500"
                      }`}
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-5 w-full rounded-2xl bg-amber-500 py-3.5 text-center text-sm font-extrabold text-slate-950 shadow-md">
                Confirm booking →
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING (live backend catalog) ===== */}
        <section id="pricing" className="scroll-mt-20 border-y border-slate-200/80 bg-slate-50/70 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
                Transparent Pricing
              </span>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Priced for agencies. Zero booking tax.
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Start free and ship today. Upgrade only when you need team seats, advanced calendar
                integrations, or AI scheduling chat — we never skim your Stripe payouts.
              </p>
            </div>

            <PricingCards plans={plans} />

            <p className="mt-8 text-center text-xs font-medium text-slate-500">
              Plan pricing updates live from your Slotwise catalog. Standard Stripe card processing
              fees apply.
            </p>
          </div>
        </section>

        {/* ===== FAQ ACCORDION ===== */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
              FAQ
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Frequently asked questions
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Everything you need to know about embedding Slotwise in Webflow.
            </p>
          </div>

          <div className="mt-12 space-y-3.5">
            {FAQ.map((item, idx) => (
              <details
                key={item.q}
                open={idx === 0}
                className="group rounded-2xl border border-slate-200/90 bg-white px-6 py-5 shadow-2xs transition open:border-amber-300 open:shadow-md"
              >
                <summary className="flex cursor-pointer items-center justify-between gap-4 text-left text-base font-bold text-slate-950">
                  <span>{item.q}</span>
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-slate-100 text-slate-600 transition group-open:rotate-180 group-open:bg-amber-100 group-open:text-amber-900">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4" aria-hidden="true">
                      <path
                        fillRule="evenodd"
                        d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
                        clipRule="evenodd"
                      />
                    </svg>
                  </span>
                </summary>
                <p className="mt-3.5 pr-8 text-sm leading-relaxed text-slate-600">{item.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* ===== CLOSING CTA ===== */}
        <section className="px-4 pb-24 sm:px-6 lg:px-8">
          <div className="relative mx-auto max-w-6xl overflow-hidden rounded-[2.5rem] border border-amber-200/80 bg-gradient-to-br from-amber-50 via-white to-blue-50/70 px-6 py-16 text-center shadow-[0_24px_70px_-20px_rgba(245,158,11,0.22)] sm:px-12 sm:py-20">
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-amber-300/20 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-300/20 blur-3xl" />

            <div className="relative z-10 mx-auto max-w-2xl">
              <Image
                src="/logo.png"
                alt="Slotwise icon"
                width={56}
                height={56}
                className="mx-auto rounded-2xl shadow-md ring-1 ring-slate-900/5"
              />
              <h2
                className="mt-6 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Make booking feel native to your Webflow brand.
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-base text-slate-600">
                Launch your calendar in minutes, accept zero-commission Stripe deposits, and manage
                every client site from one dashboard.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                <Link
                  href="/login"
                  className="rounded-full bg-slate-950 px-8 py-3.5 text-sm font-extrabold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-slate-800"
                >
                  Start free now
                </Link>
                <Link
                  href={`/book/${DEMO_PUBLIC_KEY}`}
                  className="rounded-full border border-slate-300 bg-white px-8 py-3.5 text-sm font-bold text-slate-800 transition hover:bg-slate-50"
                >
                  View live demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-10 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <Link href="/" className="flex items-center gap-2.5">
              <Image src="/logo.png" alt="Slotwise logo" width={28} height={28} className="rounded-lg" />
              <span
                className="text-base font-extrabold text-slate-950"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Slotwise
              </span>
            </Link>
            <p className="mt-3 max-w-[34ch] text-xs leading-relaxed text-slate-500">
              Webflow-native appointment scheduling &amp; booking calendar for agencies and service
              brands. © {new Date().getFullYear()} Slotwise by Hindara Labs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-14">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Product
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm text-slate-600">
                <a href="#features" className="hover:text-amber-600">
                  Features
                </a>
                <a href="#pricing" className="hover:text-amber-600">
                  Pricing
                </a>
                <Link href={`/book/${DEMO_PUBLIC_KEY}`} className="hover:text-amber-600">
                  Live demo
                </Link>
                <Link href="/login" className="hover:text-amber-600">
                  Sign in
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Legal
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm text-slate-600">
                <Link href="/privacy" className="hover:text-amber-600">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="hover:text-amber-600">
                  Terms of Service
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Contact
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm text-slate-600">
                <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-amber-600">
                  {CONTACT_EMAIL}
                </a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}