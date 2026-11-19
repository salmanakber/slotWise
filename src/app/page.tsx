import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";
import { getPublicPlans, type PublicPlan } from "@/lib/public-plans";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  metadataBase: new URL("https://slotwise.hindaralabs.com"),
  title: "Slotwise — Webflow-Native Booking & Appointment Calendar App",
  description:
    "The Webflow-native appointment scheduling & booking calendar for agencies and service brands. Match your Webflow theme automatically, collect zero-commission Stripe deposits, and sync Google Meet, Zoom & Teams.",
  keywords: [
    "Webflow booking app",
    "Webflow calendar widget",
    "Webflow appointment scheduling",
    "Calendly alternative for Webflow",
    "Stripe booking for Webflow",
    "zero commission scheduler",
    "Webflow Designer scheduling extension",
    "Slotwise",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Slotwise — Webflow-Native Appointment & Calendar Booking App",
    description:
      "Bookings that look native to your Webflow site. Zero booking commission, automatic CSS theme inheritance, and instant Google Meet, Zoom & Stripe sync.",
    url: "https://slotwise.hindaralabs.com",
    siteName: "Slotwise",
    type: "website",
    images: [
      {
        url: "/hero-image.png",
        width: 1200,
        height: 630,
        alt: "Slotwise Webflow-native booking calendar and scheduler",
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
  { id: "webflow", name: "Webflow", hint: "Marketplace + Designer" },
  { id: "stripe", name: "Stripe Connect", hint: "0%-fee direct payouts" },
  { id: "google", name: "Google Calendar", hint: "2-way sync + Meet" },
  { id: "zoom", name: "Zoom", hint: "Auto video links" },
  { id: "teams", name: "Microsoft Teams", hint: "Outlook & M365 ready" },
  { id: "apple", name: "Apple Calendar", hint: "iCloud CalDAV sync" },
  { id: "hubspot", name: "HubSpot", hint: "CRM contact sync" },
  { id: "mailchimp", name: "Mailchimp", hint: "Audience tag sync" },
];

const STEPS = [
  {
    n: "01",
    badge: "2-min install",
    title: "Connect your Webflow site",
    body: "Authorize Slotwise via the Webflow Marketplace or launch the Designer extension. Bind directly to static pages or Webflow CMS templates with zero iframe height glitches.",
  },
  {
    n: "02",
    badge: "Auto-themed",
    title: "Inherit your brand system",
    body: "Select from eight curated themes and map your CSS variables, corner radius, accent colors, and site typography so your calendar feels hand-coded into your layout.",
  },
  {
    n: "03",
    badge: "0% commission",
    title: "Accept paid bookings",
    body: "Publish your Webflow site and collect Stripe deposits or full session fees straight to your bank. Clients reschedule via passwordless magic links.",
  },
];

const USE_CASES = [
  {
    tag: "Webflow Agencies",
    title: "Client sites & discovery calls",
    body: "Deploy branded booking calendars across dozens of client Webflow projects from one agency console. Switch client workspaces, toggle features, and keep uninstalls spotless.",
    highlights: ["Multi-site agency switching", "Per-client branding & secrets", "Clean embed deactivation"],
    accent: "bg-blue-50 text-[#146EF5] border-blue-200",
  },
  {
    tag: "Consultants & Coaches",
    title: "Paid strategy & advisory sessions",
    body: "Sell 1-on-1 consultations, audits, and workshops directly on your Webflow landing page. Automatically attach Google Meet or Zoom links and protect your time with buffers.",
    highlights: ["Upfront Stripe session fees", "Automated Meet / Zoom links", "Timezone & buffer protection"],
    accent: "bg-amber-50 text-amber-800 border-amber-200",
  },
  {
    tag: "Studios, Salons & Clinics",
    title: "Multi-staff service scheduling",
    body: "Let clients pick a service, choose a specific team member under the Who picker, and pay a no-show protection deposit — without creating an account or password.",
    highlights: ["Staff availability & capacity", "No-show deposit rules", "Magic-link self-reschedule"],
    accent: "bg-emerald-50 text-emerald-800 border-emerald-200",
  },
  {
    tag: "B2B SaaS & Marketing",
    title: "High-converting demo funnels",
    body: "Replace sluggish third-party popups that hurt Core Web Vitals. Qualify leads with AI availability chat and push every new booking straight to HubSpot and Mailchimp.",
    highlights: ["Zero layout shift embed", "AI availability concierge", "HubSpot & Mailchimp sync"],
    accent: "bg-violet-50 text-violet-800 border-violet-200",
  },
];

const COMPARISON_ROWS = [
  {
    feature: "Built natively for Webflow Designer & CMS",
    slotwise: "Native app & OAuth bind",
    generic: "Copy-paste generic iframe",
  },
  {
    feature: "Booking & payout commission",
    slotwise: "0% platform fee forever",
    generic: "Often marks up or gates Stripe",
  },
  {
    feature: "Matches your site typography & CSS variables",
    slotwise: "8 themes + automatic CSS sync",
    generic: "Clashes with site design system",
  },
  {
    feature: "Uninstall hygiene",
    slotwise: "Deactivates leftover embeds",
    generic: "Leaves broken snippets behind",
  },
  {
    feature: "Customer account required to reschedule",
    slotwise: "No — 1-click magic links",
    generic: "Often forces login or emails",
  },
  {
    feature: "In-widget AI availability chat",
    slotwise: "Included (on-brand & gated)",
    generic: "Not available",
  },
];

const FAQ = [
  {
    q: "Does Slotwise charge a booking commission or transaction fee?",
    a: "Never. Your Stripe Connect payouts go 100% directly to your Stripe account. You only pay your Slotwise subscription plan (or start on Free) plus standard Stripe card processing fees.",
  },
  {
    q: "Why use Slotwise instead of pasting a generic calendar iframe into Webflow?",
    a: "Generic iframes often look out of place, cause awkward double scrollbars, slow down Largest Contentful Paint, and force visitors onto external domains. Slotwise connects natively through Webflow, inherits your brand styles, stays responsive across breakpoints, and cleans up embeds automatically if uninstalled.",
  },
  {
    q: "Can I use Slotwise with Webflow CMS Collection pages?",
    a: "Yes. Slotwise supports CMS-aware booking flows so agencies, clinics, or multi-service businesses can dynamically route bookings to specific services or team members from Webflow CMS pages.",
  },
  {
    q: "Which calendars and video tools integrate with Slotwise?",
    a: "Slotwise connects with Google Calendar and Google Meet, Zoom, Microsoft Teams and Outlook, Apple iCloud Calendar (CalDAV), plus HubSpot and Mailchimp for CRM and audience sync.",
  },
  {
    q: "Do clients have to create an account to cancel or reschedule?",
    a: "No. Every booking confirmation includes a secure, passwordless magic link allowing clients to cancel or reschedule according to your notice-window policies.",
  },
  {
    q: "Does embedding Slotwise hurt Webflow SEO or Core Web Vitals?",
    a: "Slotwise is engineered for lightweight loading with predictable layout sizing and clean brand loaders, preventing Cumulative Layout Shift (CLS) while keeping visitors on your domain to improve engagement metrics.",
  },
  {
    q: "What is included in the Free plan?",
    a: "You get a live booking widget for your Webflow site, automated email confirmations and reminders, timezone detection, and core styling themes so you can launch without a credit card.",
  },
  {
    q: "How does Slotwise support Webflow agencies managing multiple clients?",
    a: "Agency controls provide multi-site management, isolated platform secrets, feature flags per workspace, and centralized billing oversight so you can standardize scheduling across client builds.",
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
              p.highlighted ? "sw-btn-dark" : "sw-btn-outline"
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
        "@type": "Organization",
        name: "Slotwise",
        url: "https://slotwise.hindaralabs.com",
        logo: "https://slotwise.hindaralabs.com/logo.png",
        parentOrganization: {
          "@type": "Organization",
          name: "Hindara Labs",
        },
      },
      {
        "@type": "SoftwareApplication",
        name: "Slotwise",
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Webflow",
        url: "https://slotwise.hindaralabs.com",
        description:
          "Webflow-native appointment scheduling & booking calendar software with CSS theme inheritance, zero-commission Stripe payouts, and Google Meet, Zoom & Teams sync.",
        offers: plans.map((p) => ({
          "@type": "Offer",
          name: p.name,
          price: p.priceLabel.replace(/[^0-9.]/g, "") || "0",
          priceCurrency: "USD",
        })),
      },
      {
        "@type": "HowTo",
        name: "How to add a booking calendar to Webflow with Slotwise",
        step: STEPS.map((s, idx) => ({
          "@type": "HowToStep",
          position: idx + 1,
          name: s.title,
          text: s.body,
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
          50% { transform: translateY(-9px); }
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

        /* Bulletproof high-contrast buttons (immune to global link overrides) */
        .sw-btn-amber {
          background: linear-gradient(135deg, #f59e0b 0%, #fbbf24 100%) !important;
          color: #0f172a !important;
          border: 1px solid rgba(217, 119, 6, 0.35) !important;
          box-shadow: 0 12px 28px -8px rgba(245, 158, 11, 0.52);
        }
        .sw-btn-amber:hover {
          background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%) !important;
          color: #0f172a !important;
          transform: translateY(-1px);
        }
        .sw-btn-dark {
          background-color: #0f172a !important;
          color: #ffffff !important;
          border: 1px solid #0f172a !important;
          box-shadow: 0 10px 24px -8px rgba(15, 23, 42, 0.35);
        }
        .sw-btn-dark:hover {
          background-color: #1e293b !important;
          color: #ffffff !important;
          transform: translateY(-1px);
        }
        .sw-btn-outline {
          background-color: #ffffff !important;
          color: #0f172a !important;
          border: 1px solid #cbd5e1 !important;
          box-shadow: 0 2px 8px rgba(15, 23, 42, 0.04);
        }
        .sw-btn-outline:hover {
          background-color: #f8fafc !important;
          border-color: #94a3b8 !important;
          color: #0f172a !important;
        }
        .sw-nav-link {
          color: #475569 !important;
        }
        .sw-nav-link:hover {
          color: #0f172a !important;
        }

        details > summary { list-style: none; }
        details > summary::-webkit-details-marker { display: none; }
        @media (prefers-reduced-motion: reduce) {
          .sw-rise-1, .sw-rise-2, .sw-rise-3, .sw-rise-4, .sw-float, .sw-float-delayed, .sw-marquee { animation: none !important; }
        }
      `}</style>

      {/* ===== STICKY TOP NAVIGATION ===== */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
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
            <span className="hidden rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-[#146EF5] ring-1 ring-blue-500/20 sm:inline-block">
              For Webflow
            </span>
          </Link>

          <div className="hidden items-center gap-7 text-sm font-semibold md:flex">
            <a href="#features" className="sw-nav-link transition">
              Features
            </a>
            <a href="#use-cases" className="sw-nav-link transition">
              Use cases
            </a>
            <a href="#compare" className="sw-nav-link transition">
              Compare
            </a>
            <a href="#pricing" className="sw-nav-link transition">
              Pricing
            </a>
            <a href="#faq" className="sw-nav-link transition">
              FAQ
            </a>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/book/${DEMO_PUBLIC_KEY}`}
              className="sw-nav-link hidden rounded-full px-3.5 py-2 text-sm font-semibold transition hover:bg-slate-100 sm:inline-flex"
            >
              Live demo
            </Link>
            <Link
              href="/login"
              className="sw-btn-outline rounded-full px-4 py-2 text-sm font-bold transition"
            >
              Sign in
            </Link>
            <Link
              href="/login"
              className="sw-btn-dark rounded-full px-4 py-2 text-sm font-bold transition"
            >
              Start free
            </Link>
          </div>
        </nav>
      </header>

      <main>
        {/* ===== HERO SECTION ===== */}
        <section className="relative overflow-hidden bg-gradient-to-b from-[#FFFDF7] via-white to-slate-50/70 pb-20 pt-10 sm:pb-28 sm:pt-16">
          <div
            className="pointer-events-none absolute inset-0 opacity-[0.45]"
            style={{
              backgroundImage:
                "linear-gradient(to right, rgba(15,23,42,0.04) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.04) 1px, transparent 1px)",
              backgroundSize: "56px 56px",
              maskImage: "radial-gradient(ellipse 80% 70% at 50% 30%, black 35%, transparent 100%)",
            }}
          />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-[440px] w-[780px] -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-200/45 via-amber-100/35 to-blue-200/30 blur-3xl" />

          <div className="relative z-10 mx-auto grid max-w-7xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-[1.04fr_0.96fr] lg:gap-10 lg:px-8">
            <div>
              <div className="sw-rise-1 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50/90 px-3.5 py-1.5 text-xs font-bold text-amber-900 shadow-xs">
                <span className="flex h-2 w-2 rounded-full bg-amber-500" />
                Webflow-Native Appointment &amp; Calendar App
              </div>

              <h1
                className="sw-rise-2 mt-6 text-[clamp(2.45rem,5vw,4.25rem)] font-extrabold leading-[1.03] tracking-[-0.035em] text-slate-950"
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

              <p className="sw-rise-3 mt-6 max-w-[47ch] text-base leading-relaxed text-slate-600 sm:text-lg">
                Stop embedding clunky third-party iframes. Slotwise installs inside Webflow,
                inherits your site’s design tokens automatically, and sends Stripe deposits straight
                to you with <strong className="font-semibold text-slate-900">0% booking commission</strong>.
              </p>

              <div className="sw-rise-4 mt-8 flex flex-wrap items-center gap-3.5">
                <Link
                  href="/login"
                  className="sw-btn-amber inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-extrabold transition"
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
                  className="sw-btn-outline inline-flex items-center gap-2 rounded-full px-7 py-3.5 text-sm font-bold transition"
                >
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  Try live booking demo
                </Link>
              </div>

              <div className="sw-rise-4 mt-8 flex flex-wrap items-center gap-x-6 gap-y-2.5 text-xs font-semibold text-slate-600">
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  Free forever starter plan
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  0% Stripe payout commission
                </span>
                <span className="flex items-center gap-1.5">
                  <CheckIcon className="h-4 w-4 text-emerald-600" />
                  No customer account required
                </span>
              </div>
            </div>

            {/* Hero Showcase Composition */}
            <div className="relative mx-auto w-full max-w-[550px] lg:ml-auto">
              <div className="relative overflow-hidden rounded-[2rem] border border-slate-200/90 bg-gradient-to-br from-amber-50/90 via-white to-blue-50/80 p-5 shadow-[0_32px_80px_-20px_rgba(15,23,42,0.14)] sm:p-7">
                <div className="mb-4 flex items-center justify-between rounded-xl border border-slate-200/80 bg-white/95 px-3.5 py-2 shadow-2xs">
                  <div className="flex items-center gap-1.5">
                    <span className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                  </div>
                  <div className="rounded-md bg-slate-100 px-3 py-0.5 text-[11px] font-medium text-slate-600">
                    studio.webflow.io/book
                  </div>
                  <span className="text-[10px] font-extrabold text-[#146EF5]">Webflow Sync</span>
                </div>

                {/* Hero App Visual */}
                <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/[0.03] to-amber-500/[0.08] py-4">
                  <Image
                    src="/hero-image.png"
                    alt="Slotwise 3D calendar, scheduling clock, and Webflow booking modules"
                    width={860}
                    height={860}
                    priority
                    className="sw-float relative z-10 w-[min(78vw,380px)] rounded-2xl drop-shadow-[0_24px_45px_rgba(15,23,42,0.18)]"
                  />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2.5 text-center">
                  <div className="rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Theme</div>
                    <div className="mt-0.5 text-xs font-extrabold text-slate-900">CSS Matched</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Fee</div>
                    <div className="mt-0.5 text-xs font-extrabold text-emerald-600">$0 Commission</div>
                  </div>
                  <div className="rounded-xl border border-slate-200/80 bg-white/95 px-2.5 py-2">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Meeting</div>
                    <div className="mt-0.5 text-xs font-extrabold text-slate-900">Meet / Zoom</div>
                  </div>
                </div>
              </div>

              {/* Floating Card: Stripe Paid */}
              <div className="sw-float-delayed absolute -left-4 top-20 z-20 hidden items-center gap-2.5 rounded-2xl border border-slate-200 bg-white/95 px-3.5 py-2.5 shadow-lg backdrop-blur sm:flex">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-emerald-100 text-emerald-700">
                  <IntegrationIcon id="stripe" />
                </span>
                <div>
                  <div className="text-xs font-extrabold text-slate-900">+$150.00 Paid</div>
                  <div className="text-[11px] text-slate-500">Direct via Stripe Connect</div>
                </div>
              </div>

              {/* Floating Card: Webflow Variables */}
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
              Connects natively with your calendars, video calls, payments &amp; CRM
            </p>
          </div>
          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-gradient-to-r from-slate-50 to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-gradient-to-l from-slate-50 to-transparent" />
            <div className="sw-marquee flex w-max gap-4 px-4">
              {[...INTEGRATIONS, ...INTEGRATIONS].map((item, i) => (
                <div
                  key={`${item.name}-${i}`}
                  className="flex min-w-[215px] items-center gap-3.5 rounded-2xl border border-slate-200/90 bg-white px-4 py-3 shadow-2xs transition hover:border-amber-300"
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

        {/* ===== VISUAL SHOWCASE 1: WEBFLOW DESIGNER CANVAS ILLUSTRATION ===== */}
        <section className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#146EF5]">
              Inside the Webflow Designer
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Place it on your canvas. Watch it inherit your brand.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
              Forget brittle embed snippets that clash with your Webflow design system. Slotwise
              binds cleanly to your Designer tokens, CMS collections, and breakpoints.
            </p>
          </div>

          {/* Illustrated Webflow Designer Studio UI */}
          <div className="mt-14 overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_30px_80px_-20px_rgba(15,23,42,0.12)]">
            {/* Designer Top Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3">
              <div className="flex items-center gap-3">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#146EF5] text-white">
                  <svg viewBox="0 0 24 24" className="h-4 w-4" fill="currentColor" aria-hidden="true">
                    <path d="M17.8 6.5 15.1 14l-1.9-5.8c-.2-.6-.8-1-1.4-1-.7 0-1.2.4-1.4 1L8.5 14 6.2 6.5H2.8l3.7 11c.2.6.8 1 1.5 1 .7 0 1.2-.4 1.5-1l2-5.6 2 5.6c.2.6.8 1 1.5 1 .7 0 1.3-.4 1.5-1l4-11h-2.7Z" />
                  </svg>
                </span>
                <span className="text-xs font-bold text-slate-800">Webflow Designer · Booking Page</span>
                <span className="rounded-md bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold text-emerald-800">
                  Slotwise App Connected
                </span>
              </div>
              <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
                <span className="rounded-md bg-white px-2.5 py-1 text-slate-900 shadow-2xs ring-1 ring-slate-200">
                  Desktop 1440px
                </span>
                <span className="hidden rounded-md px-2 py-1 sm:inline">Tablet</span>
                <span className="hidden rounded-md px-2 py-1 sm:inline">Mobile</span>
                <span className="rounded-md bg-[#146EF5] px-3 py-1 text-white">Publish</span>
              </div>
            </div>

            {/* 3-Column Designer Workspace */}
            <div className="grid lg:grid-cols-[220px_1fr_250px]">
              {/* Left Navigator */}
              <div className="hidden border-r border-slate-200 bg-slate-50/50 p-4 lg:block">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Navigator
                </div>
                <div className="mt-3 space-y-1.5 text-xs font-medium text-slate-600">
                  <div className="rounded-lg px-2 py-1.5">Body</div>
                  <div className="rounded-lg px-2 py-1.5 pl-4">Navbar_Global</div>
                  <div className="rounded-lg px-2 py-1.5 pl-4">Section_Hero</div>
                  <div className="rounded-lg bg-blue-50 px-2 py-1.5 pl-6 font-bold text-[#146EF5] ring-1 ring-blue-200">
                    Slotwise_Calendar
                  </div>
                  <div className="rounded-lg px-2 py-1.5 pl-4">Section_Testimonials</div>
                  <div className="rounded-lg px-2 py-1.5 pl-4">Footer_Main</div>
                </div>
              </div>

              {/* Center Live Canvas */}
              <div className="bg-gradient-to-br from-slate-50 via-white to-amber-50/40 p-5 sm:p-8">
                <div className="mx-auto max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-md sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-4">
                    <div>
                      <div className="text-xs font-bold text-amber-600">BRAND STRATEGY STUDIO</div>
                      <div className="text-lg font-extrabold text-slate-950">Book a Discovery Session</div>
                    </div>
                    <div className="flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-700">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" />
                      EST (UTC-5)
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 sm:grid-cols-2">
                    {/* Calendar Grid Visual */}
                    <div className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-3.5">
                      <div className="flex items-center justify-between text-xs font-extrabold text-slate-900">
                        <span>November 2026</span>
                        <span className="text-slate-400">‹ ›</span>
                      </div>
                      <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-bold text-slate-400">
                        {["M", "T", "W", "T", "F", "S", "S"].map((d, idx) => (
                          <span key={`${d}-${idx}`}>{d}</span>
                        ))}
                      </div>
                      <div className="mt-2 grid grid-cols-7 gap-1 text-center text-[11px] font-bold">
                        {[12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25].map((num) => (
                          <span
                            key={num}
                            className={`rounded-lg py-1.5 ${
                              num === 19
                                ? "bg-amber-500 text-slate-950 shadow-2xs"
                                : num === 20 || num === 23
                                ? "bg-white text-slate-900 ring-1 ring-slate-200"
                                : "text-slate-400"
                            }`}
                          >
                            {num}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Time Slots & Team Visual */}
                    <div className="flex flex-col justify-between space-y-2.5">
                      <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2">
                        <div className="flex items-center gap-2">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-100 text-[10px] font-extrabold text-amber-900">
                            MK
                          </span>
                          <span className="text-xs font-bold text-slate-800">Maya Khan · Partner</span>
                        </div>
                        <span className="text-[10px] font-bold text-emerald-600">Available</span>
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {["09:30 AM", "11:00 AM", "01:30 PM", "03:45 PM"].map((slot, i) => (
                          <div
                            key={slot}
                            className={`rounded-xl border py-2 text-center text-xs font-bold ${
                              i === 1
                                ? "border-slate-950 bg-slate-950 text-white"
                                : "border-slate-200 bg-white text-slate-700"
                            }`}
                          >
                            {slot}
                          </div>
                        ))}
                      </div>

                      <div className="rounded-xl bg-amber-500 py-2.5 text-center text-xs font-extrabold text-slate-950">
                        Reserve 11:00 AM · $0 Due
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Style Inspector */}
              <div className="hidden border-l border-slate-200 bg-slate-50/50 p-4 lg:block">
                <div className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                  Slotwise Theme Tokens
                </div>
                <div className="mt-3 space-y-3 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="text-[10px] font-bold text-slate-400">Preset</div>
                    <div className="mt-1 font-bold text-slate-900">Editorial Light</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="text-[10px] font-bold text-slate-400">Accent Color</div>
                    <div className="mt-1.5 flex items-center gap-2 font-mono text-[11px] font-bold text-slate-800">
                      <span className="h-4 w-4 rounded bg-amber-500" />
                      #F59E0B
                    </div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="text-[10px] font-bold text-slate-400">Font Inheritance</div>
                    <div className="mt-1 font-bold text-slate-800">var(--font-sora)</div>
                  </div>
                  <div className="rounded-xl border border-slate-200 bg-white p-2.5">
                    <div className="text-[10px] font-bold text-slate-400">Border Radius</div>
                    <div className="mt-1 font-bold text-slate-800">16px (Matched)</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ===== BENTO CAPABILITIES SECTION ===== */}
        <section id="features" className="scroll-mt-20 border-t border-slate-200/80 bg-slate-50/50 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
                Built for Performance &amp; Revenue
              </span>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Every scheduling feature your agency needs.
              </h2>
              <p className="mt-4 text-base leading-relaxed text-slate-600 sm:text-lg">
                From multi-staff routing to AI availability chat and Stripe Connect payouts,
                Slotwise replaces fragmented scheduling stacks with one Webflow-native workflow.
              </p>
            </div>

            <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {/* Card 1 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
                <div>
                  <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                    <div className="flex items-center justify-between text-[11px] font-bold text-slate-500">
                      <span>8 Curated Themes</span>
                      <span className="text-amber-600">CSS Vars</span>
                    </div>
                    <div className="mt-3 flex items-center gap-2">
                      {["bg-slate-950", "bg-amber-500", "bg-[#146EF5]", "bg-emerald-600", "bg-rose-500", "bg-violet-600"].map(
                        (bg, idx) => (
                          <span
                            key={bg}
                            className={`h-7 w-7 rounded-full ${bg} ${
                              idx === 1 ? "ring-2 ring-amber-500 ring-offset-2" : "opacity-85"
                            }`}
                          />
                        )
                      )}
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950">Native Webflow Themes</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Eight curated designs, CSS variable overrides, brand loaders, and compact or
                    spacious layouts that feel native to every Webflow site.
                  </p>
                </div>
              </article>

              {/* Card 2 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
                <div>
                  <div className="mb-6 rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700">Stripe Deposit</span>
                      <span className="rounded-full bg-emerald-600 px-2 py-0.5 text-[10px] font-bold text-white">
                        0% Fee
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-baseline justify-between">
                      <span className="text-2xl font-extrabold text-slate-950">$250.00</span>
                      <span className="text-xs font-semibold text-emerald-700">100% → Your Bank</span>
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950">Zero-Commission Payouts</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Collect upfront payments or no-show deposits directly via Stripe Connect. Keep
                    every dollar you earn — we never skim your revenue.
                  </p>
                </div>
              </article>

              {/* Card 3 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
                <div>
                  <div className="mb-6 space-y-2 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
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
                  <h3 className="text-lg font-extrabold text-slate-950">Team Scheduling &amp; Buffers</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Manage staff under the Who picker, set working hours, capacity limits, and
                    buffers so calendars stay 100% conflict-free.
                  </p>
                </div>
              </article>

              {/* Card 4 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
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
                  <h3 className="text-lg font-extrabold text-slate-950">Automatic Video &amp; Sync</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Google Meet, Zoom, and Microsoft Teams links generate after booking. Real-time
                    two-way sync prevents double bookings across all your calendars.
                  </p>
                </div>
              </article>

              {/* Card 5 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
                <div>
                  <div className="mb-6 space-y-2 rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                    <div className="ml-auto w-fit rounded-2xl rounded-br-sm bg-slate-900 px-3 py-1.5 text-[11px] font-medium text-white">
                      Any morning slots this Thursday?
                    </div>
                    <div className="w-fit rounded-2xl rounded-bl-sm border border-amber-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-slate-700 shadow-2xs">
                      Yes — 9:30 AM &amp; 11:00 AM with Maya ✨
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950">AI Calendar Assistant</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Visitors ask natural availability questions inside the widget. Responses stay
                    accurate, brand-safe, and plan-gated.
                  </p>
                </div>
              </article>

              {/* Card 6 */}
              <article className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-7 shadow-2xs transition hover:border-amber-300 hover:shadow-lg">
                <div>
                  <div className="mb-6 rounded-2xl border border-slate-100 bg-slate-50/90 p-4">
                    <div className="flex items-center justify-between rounded-xl bg-white px-3 py-2.5 shadow-2xs ring-1 ring-slate-200/60">
                      <div>
                        <div className="text-xs font-extrabold text-slate-900">Agency Multi-Site</div>
                        <div className="text-[11px] text-slate-500">12 Webflow clients live</div>
                      </div>
                      <span className="rounded-lg bg-blue-50 px-2.5 py-1 text-[11px] font-bold text-[#146EF5]">
                        Active
                      </span>
                    </div>
                  </div>
                  <h3 className="text-lg font-extrabold text-slate-950">Agency Multi-Site Console</h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-600">
                    Manage multiple client Webflow websites, platform secrets, feature flags, and
                    clean embed deactivation from one dashboard.
                  </p>
                </div>
              </article>
            </div>
          </div>
        </section>

        {/* ===== VISUAL SHOWCASE 2: ANALYTICS & REVENUE DASHBOARD GRAPHIC ===== */}
        <section className="mx-auto grid max-w-7xl items-center gap-14 px-4 py-24 sm:px-6 lg:grid-cols-2 lg:px-8">
          {/* Analytics & Stripe Payout Graphic */}
          <div className="order-2 lg:order-1">
            <div className="relative overflow-hidden rounded-[2rem] border border-slate-200 bg-white p-6 shadow-[0_28px_70px_-15px_rgba(15,23,42,0.1)] sm:p-8">
              <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    Slotwise Funnel Analytics
                  </div>
                  <div className="text-lg font-extrabold text-slate-950">Booking Conversion &amp; Payouts</div>
                </div>
                <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-extrabold text-amber-900">
                  Last 30 Days
                </span>
              </div>

              {/* KPI Strip */}
              <div className="mt-5 grid grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Completed</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-950">148</div>
                  <div className="mt-0.5 text-[11px] font-bold text-emerald-600">+24% vs prior</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Drop-off</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-950">5.8%</div>
                  <div className="mt-0.5 text-[11px] font-bold text-emerald-600">Low friction</div>
                </div>
                <div className="rounded-2xl border border-slate-100 bg-slate-50 p-3.5">
                  <div className="text-[11px] font-semibold text-slate-500">Gross Paid</div>
                  <div className="mt-1 text-xl font-extrabold text-slate-950">$11,420</div>
                  <div className="mt-0.5 text-[11px] font-bold text-amber-600">$0 Slotwise fee</div>
                </div>
              </div>

              {/* Custom SVG Area Chart */}
              <div className="mt-5 rounded-2xl border border-slate-100 bg-gradient-to-b from-amber-50/40 to-white p-4">
                <div className="mb-2 flex items-center justify-between text-[11px] font-bold text-slate-500">
                  <span>Daily confirmed bookings</span>
                  <span className="text-slate-900">Avg. 42s checkout</span>
                </div>
                <svg viewBox="0 0 420 120" className="w-full" fill="none" aria-hidden="true">
                  <defs>
                    <linearGradient id="swChartGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.32" />
                      <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
                    </linearGradient>
                  </defs>
                  <path
                    d="M0 95 C45 92, 65 68, 105 72 C145 76, 175 42, 215 48 C255 54, 285 26, 330 30 C365 33, 390 14, 420 10 L420 120 L0 120 Z"
                    fill="url(#swChartGrad)"
                  />
                  <path
                    d="M0 95 C45 92, 65 68, 105 72 C145 76, 175 42, 215 48 C255 54, 285 26, 330 30 C365 33, 390 14, 420 10"
                    stroke="#F59E0B"
                    strokeWidth="3"
                    strokeLinecap="round"
                  />
                  <circle cx="215" cy="48" r="4.5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="330" cy="30" r="4.5" fill="#0F172A" stroke="#FFFFFF" strokeWidth="2" />
                  <circle cx="416" cy="11" r="5" fill="#10B981" stroke="#FFFFFF" strokeWidth="2" />
                </svg>
              </div>

              {/* Recent Transactions Mini Ledger */}
              <div className="mt-4 space-y-2">
                {[
                  { client: "Elena R. · Architecture Audit", amount: "+$180.00", badge: "Paid" },
                  { client: "Marcus V. · Brand Workshop", amount: "+$420.00", badge: "Paid" },
                ].map((tx) => (
                  <div
                    key={tx.client}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/70 px-3.5 py-2.5 text-xs"
                  >
                    <span className="font-bold text-slate-800">{tx.client}</span>
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-slate-950">{tx.amount}</span>
                      <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                        {tx.badge}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Copy */}
          <div className="order-1 lg:order-2">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
              Revenue &amp; Drop-Off Visibility
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Turn website visitors into paid calendar slots.
            </h2>
            <p className="mt-4 text-base leading-relaxed text-slate-600">
              See exactly where prospects drop off in your booking flow, eliminate login walls with
              passwordless magic links, and collect Stripe Connect deposits without surrendering a
              cut to your scheduling tool.
            </p>
            <ul className="mt-7 space-y-3 text-sm font-medium text-slate-700">
              {[
                "Real-time booking funnel tracking across every Webflow page",
                "Automated confirmation, reminder, and magic-link reschedule emails",
                "Customizable deposit rules to stop last-minute no-shows",
                "Instant HubSpot & Mailchimp contact enrichment after checkout",
              ].map((pt) => (
                <li key={pt} className="flex items-start gap-3">
                  <CheckIcon className="mt-0.5 h-5 w-5 text-amber-500" />
                  <span>{pt}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href={`/book/${DEMO_PUBLIC_KEY}`}
                className="sw-btn-dark rounded-full px-6 py-3 text-sm font-bold transition"
              >
                Experience the booking flow
              </Link>
              <Link
                href="/login"
                className="sw-btn-outline rounded-full px-6 py-3 text-sm font-bold transition"
              >
                Create free account
              </Link>
            </div>
          </div>
        </section>

        {/* ===== HOW IT WORKS ===== */}
        <section id="how-it-works" className="scroll-mt-20 border-y border-slate-200/80 bg-slate-50/80 py-24">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
                Simple Setup
              </span>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Launch your Webflow calendar in three steps.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-base text-slate-600">
                Go from an empty Webflow section to taking paid appointments in minutes — no
                custom backend code required.
              </p>
            </div>

            <div className="mt-14 grid gap-6 lg:grid-cols-3">
              {STEPS.map((s) => (
                <article
                  key={s.n}
                  className="flex flex-col rounded-3xl border border-slate-200/90 bg-white p-8 shadow-2xs"
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
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ===== INDUSTRY USE CASES (SEO TOPICAL AUTHORITY) ===== */}
        <section id="use-cases" className="scroll-mt-20 mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#146EF5]">
              Built for Service Businesses
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-5xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Tailored for agencies, studios &amp; modern service brands.
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Whether you build Webflow websites for clients or run your own practice, Slotwise
              adapts to your scheduling model.
            </p>
          </div>

          <div className="mt-12 grid gap-6 md:grid-cols-2">
            {USE_CASES.map((uc) => (
              <article
                key={uc.tag}
                className="flex flex-col justify-between rounded-3xl border border-slate-200/90 bg-white p-8 shadow-2xs transition hover:border-amber-300 hover:shadow-md"
              >
                <div>
                  <span
                    className={`inline-block rounded-full border px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider ${uc.accent}`}
                  >
                    {uc.tag}
                  </span>
                  <h3 className="mt-4 text-xl font-extrabold text-slate-950">{uc.title}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-slate-600">{uc.body}</p>
                </div>
                <ul className="mt-6 grid gap-2 border-t border-slate-100 pt-5 sm:grid-cols-3">
                  {uc.highlights.map((h) => (
                    <li key={h} className="flex items-center gap-1.5 text-xs font-semibold text-slate-700">
                      <CheckIcon className="h-3.5 w-3.5 text-amber-500" />
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        {/* ===== COMPARISON TABLE (SEO HIGH-INTENT SECTION) ===== */}
        <section id="compare" className="scroll-mt-20 border-t border-slate-200/80 bg-slate-50/70 py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="text-center">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
                Why Switch
              </span>
              <h2
                className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
                style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
              >
                Slotwise vs. generic iframe schedulers
              </h2>
              <p className="mx-auto mt-3 max-w-2xl text-base text-slate-600">
                See why Webflow agencies choose a native Webflow calendar over pasting generic
                third-party booking embeds.
              </p>
            </div>

            <div className="mt-12 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
              <div className="grid grid-cols-[1.3fr_1fr_1fr] border-b border-slate-200 bg-slate-50 px-5 py-4 text-xs font-extrabold uppercase tracking-wider text-slate-500 sm:px-8">
                <div>Capability</div>
                <div className="text-amber-700">Slotwise (Webflow-Native)</div>
                <div>Generic Iframe Tools</div>
              </div>
              <div className="divide-y divide-slate-100">
                {COMPARISON_ROWS.map((row) => (
                  <div
                    key={row.feature}
                    className="grid grid-cols-[1.3fr_1fr_1fr] items-center gap-3 px-5 py-4 text-xs sm:px-8 sm:text-sm"
                  >
                    <div className="font-bold text-slate-900">{row.feature}</div>
                    <div className="flex items-center gap-2 font-semibold text-emerald-700">
                      <CheckIcon className="h-4 w-4 text-emerald-600" />
                      <span>{row.slotwise}</span>
                    </div>
                    <div className="font-medium text-slate-500">{row.generic}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ===== PRICING (live backend catalog) ===== */}
        <section id="pricing" className="scroll-mt-20 border-y border-slate-200/80 bg-white py-24">
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
                Start free and publish today. Upgrade only when you need team seats, multi-calendar
                sync, or AI availability chat — we never skim your Stripe payouts.
              </p>
            </div>

            <PricingCards plans={plans} />

            <p className="mt-8 text-center text-xs font-medium text-slate-500">
              Live pricing synced from your Slotwise catalog. Standard Stripe card processing fees
              apply.
            </p>
          </div>
        </section>

        {/* ===== FAQ ACCORDION ===== */}
        <section id="faq" className="scroll-mt-20 mx-auto max-w-4xl px-4 py-24 sm:px-6 lg:px-8">
          <div className="text-center">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-amber-600">
              Frequently Asked Questions
            </span>
            <h2
              className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Everything about Slotwise for Webflow
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Answers on Webflow integration, Stripe payouts, SEO performance, and agency accounts.
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
                alt="Slotwise Webflow booking app icon"
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
                Launch your appointment calendar in minutes, keep 100% of your Stripe payouts, and
                manage every client site from one clean console.
              </p>
              <div className="mt-8 flex flex-wrap justify-center gap-3.5">
                <Link
                  href="/login"
                  className="sw-btn-dark rounded-full px-8 py-3.5 text-sm font-extrabold transition"
                >
                  Start free now
                </Link>
                <Link
                  href={`/book/${DEMO_PUBLIC_KEY}`}
                  className="sw-btn-outline rounded-full px-8 py-3.5 text-sm font-bold transition"
                >
                  Open live demo
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* ===== FOOTER ===== */}
      <footer className="border-t border-slate-200/80 bg-slate-50/80 px-4 py-12 sm:px-6 lg:px-8">
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
            <p className="mt-3 max-w-[36ch] text-xs leading-relaxed text-slate-500">
              Webflow-native appointment scheduling &amp; booking calendar for agencies,
              consultants, and service brands. © {new Date().getFullYear()} Slotwise by Hindara
              Labs.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8 sm:grid-cols-3 sm:gap-14">
            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Product
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm">
                <a href="#features" className="sw-nav-link hover:underline">
                  Features
                </a>
                <a href="#use-cases" className="sw-nav-link hover:underline">
                  Use cases
                </a>
                <a href="#compare" className="sw-nav-link hover:underline">
                  Slotwise vs. Iframes
                </a>
                <a href="#pricing" className="sw-nav-link hover:underline">
                  Pricing
                </a>
                <Link href={`/book/${DEMO_PUBLIC_KEY}`} className="sw-nav-link hover:underline">
                  Live demo
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Legal &amp; Account
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm">
                <Link href="/login" className="sw-nav-link hover:underline">
                  Sign in
                </Link>
                <Link href="/privacy" className="sw-nav-link hover:underline">
                  Privacy Policy
                </Link>
                <Link href="/terms" className="sw-nav-link hover:underline">
                  Terms of Service
                </Link>
              </div>
            </div>

            <div>
              <div className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-slate-900">
                Contact
              </div>
              <div className="mt-3 flex flex-col gap-2.5 text-sm">
                <a href={`mailto:${CONTACT_EMAIL}`} className="sw-nav-link hover:underline">
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