import Image from "next/image";
import Link from "next/link";
import { CONTACT_EMAIL } from "@/lib/brand";
import { wixRedirectUri } from "@/lib/wix";

export const dynamic = "force-dynamic";

/**
 * Wix-only install result page. Separate from /install (Webflow).
 */
export default async function WixInstallPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    site?: string;
    name?: string;
    wix?: string;
    reason?: string;
    detail?: string;
  }>;
}) {
  const {
    status = "start",
    site = "",
    name = "",
    reason = "",
    detail = "",
  } = await searchParams;

  const connected = status === "connected";
  const denied = status === "denied";
  const missing = status === "missing";
  const errored = status === "error";

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#06110e] px-5 py-12 text-[#e8f0ec]">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(900px 480px at 70% -10%, rgba(14,184,148,.22), transparent 55%), linear-gradient(165deg,#04140f,#0b1a16 45%,#06110e)",
        }}
      />
      <div className="relative mx-auto w-full max-w-lg">
        <div className="mb-8 flex items-center gap-3">
          <Image src="/logo.png" alt="" width={40} height={40} className="rounded-xl" />
          <div>
            <div
              className="text-lg font-extrabold tracking-tight"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Slotwise
            </div>
            <div className="text-xs font-semibold uppercase tracking-[0.18em] text-[#0eb894]">
              Wix install
            </div>
          </div>
        </div>

        <section className="rounded-[28px] border border-white/10 bg-white/[0.04] p-6 shadow-[0_30px_80px_rgba(0,0,0,.35)] sm:p-8">
          {connected ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Connected to Wix</h1>
              <p className="mt-3 text-sm text-[#9db5ab]">
                <strong className="text-white">{name || "Your Wix site"}</strong> is linked. Place the
                booking widget with the embed snippet from Branding → Add to Wix.
              </p>
              {site ? (
                <p className="mt-2 text-[12px] text-[#7f958b]">
                  Public key: <code className="text-[#0eb894]">{site}</code>
                </p>
              ) : null}
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/dashboard/branding"
                  className="inline-flex rounded-full bg-[#0eb894] px-6 py-3 text-sm font-extrabold text-[#04140f]"
                >
                  Open branding
                </Link>
                <Link
                  href="/docs/wix"
                  className="inline-flex rounded-full border border-white/20 px-6 py-3 text-sm font-bold text-white"
                >
                  Wix docs
                </Link>
              </div>
            </>
          ) : null}

          {denied ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Install cancelled</h1>
              <p className="mt-3 text-sm text-[#9db5ab]">
                Wix didn’t complete install{reason ? ` (${reason})` : ""}. You can try again.
              </p>
              <a
                href="/api/wix/install"
                className="mt-8 inline-flex rounded-full bg-[#0eb894] px-6 py-3 text-sm font-extrabold text-[#04140f]"
              >
                Install again
              </a>
            </>
          ) : null}

          {missing ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Wix app not configured</h1>
              <p className="mt-3 text-sm text-[#9db5ab]">
                Add Wix App ID + secret under Platform → Settings → Wix app, or contact{" "}
                {CONTACT_EMAIL}.
              </p>
            </>
          ) : null}

          {errored ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Wix install failed</h1>
              <p className="mt-3 text-sm text-[#9db5ab]">
                {detail || "Check App ID, secret, and redirect URL in Wix Dev Center."}
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#c5d6ce]">
                <li>
                  Callback must be:{" "}
                  <code className="text-[#0eb894]">{wixRedirectUri()}</code>
                </li>
                <li>Platform → Settings → Wix app must match Dev Center credentials</li>
              </ul>
              <a
                href="/api/wix/install"
                className="mt-8 inline-flex rounded-full bg-[#0eb894] px-6 py-3 text-sm font-extrabold text-[#04140f]"
              >
                Try again
              </a>
            </>
          ) : null}

          {!connected && !denied && !missing && !errored ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Install Slotwise on Wix</h1>
              <p className="mt-3 text-sm text-[#9db5ab]">
                Connect your Wix site. Webflow installs use a separate flow and are not affected.
              </p>
              <a
                href="/api/wix/install"
                className="mt-8 inline-flex rounded-full bg-[#0eb894] px-6 py-3 text-sm font-extrabold text-[#04140f]"
              >
                Continue with Wix
              </a>
            </>
          ) : null}
        </section>

        <p className="mt-6 text-center text-[12px] text-[#7f958b]">
          <Link href="/wix" className="hover:text-white">
            Slotwise for Wix
          </Link>
          {" · "}
          <Link href="/install" className="hover:text-white">
            Webflow install
          </Link>
        </p>
      </div>
    </main>
  );
}
