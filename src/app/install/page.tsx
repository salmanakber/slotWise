import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { appOrigin } from "@/lib/webflow";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; site?: string; name?: string }>;
}) {
  const { status = "start", site = "", name = "" } = await searchParams;
  const connected = status === "connected";
  const denied = status === "denied";
  const missing = status === "missing";
  const errored = status === "error";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0a1018] px-5 py-12 text-[#f4f1ea]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 70% -10%, rgba(245,160,0,.22), transparent 55%), linear-gradient(160deg,#070b12,#101826 45%,#0a1018)",
        }}
      />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" />
          <div>
            <div className="text-lg font-extrabold tracking-tight">Slotwise</div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#f5a000]">
              Webflow install
            </div>
          </div>
        </div>

        <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:p-8">
          {connected ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">You’re connected</h1>
              <p className="mt-3 text-sm leading-relaxed text-[#9aa7b8]">
                {name ? <strong className="text-white">{name}</strong> : "Your Webflow site"} is linked to
                Slotwise. No separate Slotwise password is required for embedding.
              </p>
              {site ? (
                <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm">
                  Booking key: <code className="font-bold text-[#f5a000]">{site}</code>
                </p>
              ) : null}
              <ol className="mt-6 space-y-3 text-sm text-[#c9d0da]">
                <li className="flex gap-3">
                  <span className="font-extrabold text-[#f5a000]">1</span>
                  Open your site in the <strong>Webflow Designer</strong>
                </li>
                <li className="flex gap-3">
                  <span className="font-extrabold text-[#f5a000]">2</span>
                  Apps → <strong>Slotwise</strong> → <strong>Launch App</strong>
                </li>
                <li className="flex gap-3">
                  <span className="font-extrabold text-[#f5a000]">3</span>
                  Click <strong>Insert booking embed</strong> on the page
                </li>
              </ol>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="https://webflow.com/dashboard"
                  className="rounded-full bg-[#f5a000] px-6 py-3 text-sm font-extrabold text-[#1a1203]"
                >
                  Open Webflow
                </a>
                {site ? (
                  <Link
                    href={`/book/${site}`}
                    className="rounded-full border border-white/20 px-6 py-3 text-sm font-bold"
                  >
                    Preview booking
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}

          {denied ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Authorization cancelled</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Webflow didn’t grant access. You can try again — you won’t need a Slotwise login.
              </p>
              <a
                href="/api/webflow/install"
                className="mt-8 inline-flex rounded-full bg-[#f5a000] px-6 py-3 text-sm font-extrabold text-[#1a1203]"
              >
                Install again
              </a>
            </>
          ) : null}

          {missing ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">App not configured</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Platform Webflow Client ID/secret are missing. Contact {CONTACT_EMAIL}.
              </p>
            </>
          ) : null}

          {errored ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Something went wrong</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Token exchange failed. Retry install or email {CONTACT_EMAIL}.
              </p>
              <a
                href="/api/webflow/install"
                className="mt-8 inline-flex rounded-full bg-[#f5a000] px-6 py-3 text-sm font-extrabold text-[#1a1203]"
              >
                Retry install
              </a>
            </>
          ) : null}

          {status === "start" ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Install Slotwise</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Authorize Webflow once. We’ll create your booking site and you place the embed from the
                Designer — no separate Slotwise account step.
              </p>
              <a
                href="/api/webflow/install"
                className="mt-8 inline-flex rounded-full bg-[#f5a000] px-6 py-3 text-sm font-extrabold text-[#1a1203]"
              >
                Continue with Webflow
              </a>
            </>
          ) : null}
        </section>

        <p className="mt-6 text-center text-xs text-[#6b7788]">
          {appOrigin()} ·{" "}
          <a className="text-[#f5a000]" href={`mailto:${CONTACT_EMAIL}`}>
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
