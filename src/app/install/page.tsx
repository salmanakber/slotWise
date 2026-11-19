import Image from "next/image";
import { CONTACT_EMAIL } from "@/lib/brand";
import { InstallSuccess } from "@/components/install/install-success";
import { getPlatformSecrets } from "@/lib/platform-config";
import {
  appOrigin,
  webflowDesignerAppUrl,
  webflowRedirectUri,
} from "@/lib/webflow";

export const dynamic = "force-dynamic";

export default async function InstallPage({
  searchParams,
}: {
  searchParams: Promise<{
    status?: string;
    site?: string;
    name?: string;
    wf?: string;
    short?: string;
    reason?: string;
    detail?: string;
  }>;
}) {
  const {
    status = "start",
    site = "",
    name = "",
    wf = "",
    short = "",
    reason = "",
    detail = "",
  } = await searchParams;
  const connected = status === "connected";
  const denied = status === "denied";
  const missing = status === "missing";
  const errored = status === "error";

  const secrets = connected ? await getPlatformSecrets() : null;
  const designerAppHref = webflowDesignerAppUrl({
    shortName: short || null,
    webflowSiteId: wf || null,
    clientId: secrets?.webflowClientId || process.env.WEBFLOW_CLIENT_ID || null,
  });

  const lightShell = connected;

  return (
    <main
      className={`relative min-h-screen overflow-hidden px-5 py-12 ${
        lightShell ? "bg-[#f4f6fa] text-[#152033]" : "bg-[#0a1018] text-[#f4f1ea]"
      }`}
    >
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background: lightShell
            ? "radial-gradient(900px 480px at 70% -10%, rgba(245,160,0,.16), transparent 55%), linear-gradient(180deg,#ffffff 0%, #f4f6fa 55%, #eef2f7 100%)"
            : "radial-gradient(900px 480px at 70% -10%, rgba(245,160,0,.22), transparent 55%), linear-gradient(160deg,#070b12,#101826 45%,#0a1018)",
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
            <div
              className={`text-xs font-semibold uppercase tracking-[0.18em] ${
                lightShell ? "text-[#c47d00]" : "text-[#f5a000]"
              }`}
            >
              Webflow install
            </div>
          </div>
        </div>

        <section
          className={`rounded-[28px] p-6 sm:p-8 ${
            lightShell
              ? "border border-[#e5ebf3] bg-white shadow-[0_24px_60px_rgba(21,32,51,.08)]"
              : "border border-white/10 bg-white/[0.04] shadow-[0_30px_80px_rgba(0,0,0,.35)]"
          }`}
        >
          {connected ? (
            <InstallSuccess
              siteName={name || "Your Webflow site"}
              publicKey={site}
              designerAppHref={designerAppHref}
            />
          ) : null}

          {denied ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Authorization cancelled</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Webflow didn’t grant access{reason ? ` (${reason})` : ""}. You can try again — no
                Slotwise login required. Close this tab and stay in Designer if you still have it
                open.
              </p>
              <a
                href="/api/webflow/install"
                target="_blank"
                rel="noreferrer"
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
                Platform Webflow Client ID/secret are missing. Add them under Platform → Settings, or
                contact {CONTACT_EMAIL}.
              </p>
            </>
          ) : null}

          {errored ? (
            <>
              <h1 className="text-2xl font-extrabold tracking-tight">Token exchange failed</h1>
              <p className="mt-3 text-sm text-[#9aa7b8]">
                Usually this means the Redirect URI or Client Secret doesn’t match Webflow app
                settings.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-[#c9d0da]">
                <li>
                  Redirect URI must be exactly:{" "}
                  <code className="text-[#f5a000]">{webflowRedirectUri()}</code>
                </li>
                <li>Client ID + Secret in Platform → Settings must match the Webflow app</li>
                {reason ? (
                  <li>
                    Code: <code>{reason}</code>
                  </li>
                ) : null}
              </ul>
              {detail ? (
                <p className="mt-3 rounded-xl border border-white/10 bg-black/30 p-3 text-[11px] leading-relaxed text-[#9aa7b8]">
                  {detail}
                </p>
              ) : null}
              <a
                href="/api/webflow/install"
                target="_blank"
                rel="noreferrer"
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
                Authorize Webflow in this window. When you’re done, we’ll open Designer with the
                Slotwise app — then you can close this tab.
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

        <p
          className={`mt-6 text-center text-xs ${lightShell ? "text-[#8a96a8]" : "text-[#6b7788]"}`}
        >
          {appOrigin()} ·{" "}
          <a
            className={lightShell ? "text-[#c47d00]" : "text-[#f5a000]"}
            href={`mailto:${CONTACT_EMAIL}`}
          >
            {CONTACT_EMAIL}
          </a>
        </p>
      </div>
    </main>
  );
}
