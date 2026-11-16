import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { DEMO_PUBLIC_KEY } from "@/lib/constants";

export default function HomePage() {
  return (
    <div className="marketing min-h-screen overflow-x-hidden bg-[#0a1018] text-[#f4f1ea]">
      <style>{`
        @keyframes sw-rise {
          from { opacity: 0; transform: translateY(28px); }
          to { opacity: 1; transform: none; }
        }
        @keyframes sw-float {
          0%, 100% { transform: translateY(0) rotate(-2deg); }
          50% { transform: translateY(-14px) rotate(2deg); }
        }
        @keyframes sw-glow {
          0%, 100% { opacity: .45; }
          50% { opacity: .85; }
        }
        @keyframes sw-shimmer {
          from { background-position: 0% 50%; }
          to { background-position: 100% 50%; }
        }
        .m-rise { animation: sw-rise .9s cubic-bezier(.2,.8,.2,1) both; }
        .m-rise-2 { animation: sw-rise 1s .12s cubic-bezier(.2,.8,.2,1) both; }
        .m-rise-3 { animation: sw-rise 1s .22s cubic-bezier(.2,.8,.2,1) both; }
        .m-rise-4 { animation: sw-rise 1s .34s cubic-bezier(.2,.8,.2,1) both; }
        .m-float { animation: sw-float 6s ease-in-out infinite; }
        .m-glow { animation: sw-glow 4s ease-in-out infinite; }
        .m-cta {
          background: linear-gradient(110deg, #f5a000, #ffc45a, #f5a000);
          background-size: 200% 100%;
          animation: sw-shimmer 3.5s linear infinite;
        }
        @media (prefers-reduced-motion: reduce) {
          .m-rise, .m-rise-2, .m-rise-3, .m-rise-4, .m-float, .m-glow, .m-cta { animation: none !important; }
        }
      `}</style>

      {/* ===== HERO: one composition — brand first ===== */}
      <header className="relative isolate min-h-[100svh] overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(1200px 700px at 70% 20%, rgba(245,160,0,.28), transparent 55%), radial-gradient(900px 600px at 15% 80%, rgba(255,176,32,.12), transparent 50%), linear-gradient(160deg, #070b12 0%, #101826 40%, #0a1018 100%)",
          }}
        />
        <div
          className="m-glow pointer-events-none absolute -right-24 top-10 h-[520px] w-[520px] rounded-full blur-3xl"
          style={{ background: "rgba(245,160,0,.22)" }}
        />
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.5) 1px, transparent 1px)",
            backgroundSize: "72px 72px",
            maskImage: "radial-gradient(ellipse at center, black 20%, transparent 75%)",
          }}
        />

        <nav className="relative z-10 mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
          <div className="flex items-center gap-3">
            <Image src="/logo.png" alt="" width={36} height={36} className="rounded-lg" priority />
            <span className="text-lg font-extrabold tracking-tight">Slotwise</span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link
              href={`/book/${DEMO_PUBLIC_KEY}`}
              className="hidden text-sm font-semibold text-[#c9d0da] transition hover:text-white sm:inline"
            >
              Live demo
            </Link>
            <Link
              href="/login"
              className="rounded-full border border-white/15 bg-white/5 px-4 py-2 text-sm font-bold backdrop-blur transition hover:border-[#f5a000]/60 hover:bg-white/10"
            >
              Sign in
            </Link>
          </div>
        </nav>

        <div className="relative z-10 mx-auto grid min-h-[calc(100svh-88px)] max-w-6xl items-center gap-10 px-5 pb-16 pt-6 sm:px-8 lg:grid-cols-[1.05fr_0.95fr] lg:gap-8">
          <div>
            <p className="m-rise mb-4 text-[11px] font-bold uppercase tracking-[0.22em] text-[#f5a000]">
              Slotwise
            </p>
            <h1
              className="m-rise-2 max-w-[14ch] text-[clamp(2.75rem,7vw,5.25rem)] font-extrabold leading-[0.95] tracking-[-0.04em]"
              style={{ fontFamily: "var(--font-manrope), Manrope, system-ui" }}
            >
              Bookings that look like your site.
            </h1>
            <p className="m-rise-3 mt-5 max-w-[36ch] text-base leading-relaxed text-[#9aa7b8] sm:text-lg">
              The Webflow-native scheduler for agencies and service brands — styled your way, paid
              straight to you, zero commission.
            </p>
            <div className="m-rise-4 mt-8 flex flex-wrap items-center gap-3">
              <Link
                href="/login"
                className="m-cta rounded-full px-7 py-3.5 text-sm font-extrabold text-[#1a1203] shadow-[0_18px_40px_rgba(245,160,0,.35)]"
              >
                Start free
              </Link>
              <Link
                href={`/book/${DEMO_PUBLIC_KEY}`}
                className="rounded-full border border-white/20 px-7 py-3.5 text-sm font-bold text-white transition hover:border-white/40"
              >
                See it book
              </Link>
            </div>
          </div>

          <div className="relative flex items-center justify-center lg:justify-end">
            <div
              className="pointer-events-none absolute h-[340px] w-[340px] rounded-full blur-3xl sm:h-[420px] sm:w-[420px]"
              style={{ background: "radial-gradient(circle, rgba(245,160,0,.35), transparent 70%)" }}
            />
            <Image
              src="/logo.png"
              alt="Slotwise — calendar, clock, and the S mark"
              width={420}
              height={420}
              priority
              className="m-float relative z-10 w-[min(78vw,380px)] drop-shadow-[0_40px_80px_rgba(0,0,0,.55)]"
            />
          </div>
        </div>
      </header>

      {/* ===== One job: why Slotwise ===== */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <h2
          className="max-w-[18ch] text-3xl font-extrabold tracking-tight sm:text-4xl"
          style={{ fontFamily: "var(--font-manrope), Manrope, system-ui" }}
        >
          Built for Webflow sites — not bolted on.
        </h2>
        <p className="mt-4 max-w-[48ch] text-[#9aa7b8]">
          Competitors paste a widget and hope. Slotwise installs through Webflow, syncs your CMS,
          and wears your brand like it was designed there.
        </p>
        <div className="mt-14 grid gap-10 md:grid-cols-3">
          {[
            ["Native themes", "Eight looks, CSS variables, and a brand loader that feels like your product."],
            ["Paid bookings", "Stripe Connect deposits and no-shows — money lands in your account, not ours."],
            ["Agency ready", "Multi-site mode, platform controls, and uninstall that actually cleans up."],
          ].map(([title, body]) => (
            <div key={title} className="border-t border-white/10 pt-6">
              <h3 className="text-lg font-extrabold text-[#f5a000]">{title}</h3>
              <p className="mt-3 text-sm leading-relaxed text-[#9aa7b8]">{body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== One job: product proof ===== */}
      <section className="relative border-y border-white/8 bg-[#0d1420] py-24">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 sm:px-8 lg:grid-cols-2">
          <div>
            <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
              From empty calendar to paid slot — in one flow.
            </h2>
            <p className="mt-4 max-w-[40ch] text-[#9aa7b8]">
              Customers pick a service, day, and time. You get deposits, manage-by-link, and a dashboard
              that shows where people drop off.
            </p>
            <ul className="mt-8 space-y-3 text-sm text-[#c9d0da]">
              {[
                "Double-book locks with buffers and time zones",
                "Magic-link cancel / rebook — no customer accounts",
                "Designer extension path for place-and-style in Webflow",
              ].map((item) => (
                <li key={item} className="flex gap-3">
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#f5a000]" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative overflow-hidden rounded-[28px] border border-white/10 bg-gradient-to-br from-[#172740] to-[#0f1b2d] p-6 shadow-[0_30px_80px_rgba(0,0,0,.4)]">
            <div className="mb-4 flex items-center gap-2 text-sm font-bold">
              <span className="h-2.5 w-2.5 rounded-full bg-[#f5a000]" />
              Studio Nine
            </div>
            <div className="space-y-2">
              {["Deep home clean · $120", "Standard clean · $80", "Move-out clean · $210"].map((row, i) => (
                <div
                  key={row}
                  className="flex items-center justify-between rounded-2xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: i === 0 ? "#f5a000" : "rgba(255,255,255,.1)",
                    background: i === 0 ? "rgba(245,160,0,.12)" : "transparent",
                  }}
                >
                  <span>{row}</span>
                  {i === 0 ? <span className="font-bold text-[#f5a000]">Selected</span> : null}
                </div>
              ))}
            </div>
            <div className="mt-4 grid grid-cols-4 gap-2">
              {["Mon", "Tue", "Wed", "Thu"].map((d, i) => (
                <div
                  key={d}
                  className="rounded-xl border py-2 text-center text-xs font-bold"
                  style={{
                    borderColor: i === 2 ? "#f5a000" : "rgba(255,255,255,.1)",
                    background: i === 2 ? "#f5a000" : "transparent",
                    color: i === 2 ? "#1a1203" : "#c9d0da",
                  }}
                >
                  {d}
                </div>
              ))}
            </div>
            <button
              type="button"
              className="mt-5 w-full rounded-2xl bg-[#f5a000] py-3 text-sm font-extrabold text-[#1a1203]"
            >
              Confirm booking
            </button>
          </div>
        </div>
      </section>

      {/* ===== One job: pricing honesty ===== */}
      <section className="mx-auto max-w-6xl px-5 py-24 sm:px-8">
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">Priced for agencies. No booking tax.</h2>
        <p className="mt-4 max-w-[46ch] text-[#9aa7b8]">
          Free to start. Pro when you need calendar sync and deposits. We never skim your Stripe payouts.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-3">
          {[
            ["Free", "$0", "25 bookings / month · email reminders · 2 themes"],
            ["Pro", "$15", "500 bookings · 3 staff · deposits · calendar sync"],
            ["Business", "$39", "Unlimited bookings · waitlist · analytics · all 8 themes"],
          ].map(([name, price, detail]) => (
            <div key={name} className="rounded-3xl border border-white/10 bg-white/[0.03] p-6">
              <div className="text-sm font-bold uppercase tracking-wider text-[#f5a000]">{name}</div>
              <div className="mt-3 text-4xl font-extrabold">
                {price}
                <span className="text-base font-semibold text-[#9aa7b8]"> / mo</span>
              </div>
              <p className="mt-4 text-sm leading-relaxed text-[#9aa7b8]">{detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ===== Closing CTA ===== */}
      <section className="relative overflow-hidden border-t border-white/10 px-5 py-24 sm:px-8">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background: "radial-gradient(800px 400px at 50% 100%, rgba(245,160,0,.2), transparent 60%)",
          }}
        />
        <div className="relative mx-auto max-w-3xl text-center">
          <Image src="/logo.png" alt="" width={64} height={64} className="mx-auto rounded-2xl" />
          <h2 className="mt-6 text-3xl font-extrabold tracking-tight sm:text-5xl">Make booking feel native.</h2>
          <p className="mx-auto mt-4 max-w-[36ch] text-[#9aa7b8]">
            Sign in to your site dashboard — or the platform console if you run Slotwise.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <Link href="/login" className="m-cta rounded-full px-8 py-3.5 text-sm font-extrabold text-[#1a1203]">
              Sign in to Slotwise
            </Link>
            <Link
              href={`/book/${DEMO_PUBLIC_KEY}`}
              className="rounded-full border border-white/20 px-8 py-3.5 text-sm font-bold"
            >
              Try the widget
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 px-5 py-10 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 text-xs text-[#6b7788] sm:flex-row">
          <div className="flex items-center gap-2">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
            <span>© {new Date().getFullYear()} Slotwise · slotwise.hindaralabs.com</span>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link href="/login" className="hover:text-[#f5a000]">
              Sign in
            </Link>
            <Link href={`/book/${DEMO_PUBLIC_KEY}`} className="hover:text-[#f5a000]">
              Demo booking
            </Link>
            <Link href="/privacy" className="hover:text-[#f5a000]">
              Privacy
            </Link>
            <Link href="/terms" className="hover:text-[#f5a000]">
              Terms
            </Link>
            <a href={`mailto:${CONTACT_EMAIL}`} className="hover:text-[#f5a000]">
              {CONTACT_EMAIL}
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
