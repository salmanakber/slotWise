import Link from "next/link";
import { BookingWidget } from "@/components/widget/booking-widget";
import { prisma } from "@/lib/prisma";
import { validateWebflowConnection } from "@/lib/webflow-uninstall";

export const dynamic = "force-dynamic";

export default async function BookPage({
  params,
  searchParams,
}: {
  params: Promise<{ publicKey: string }>;
  searchParams: Promise<{ embed?: string }>;
}) {
  const { publicKey } = await params;
  const { embed } = await searchParams;
  const isEmbed = embed === "1" || embed === "true";

  const row = await prisma.site
    .findUnique({
      where: { publicKey },
      select: { id: true, status: true, webflowSiteId: true },
    })
    .catch(() => null);

  if (row?.webflowSiteId && row.status === "ACTIVE") {
    await validateWebflowConnection(row.id).catch(() => undefined);
  }

  const fresh = row
    ? await prisma.site
        .findUnique({ where: { id: row.id }, select: { status: true } })
        .catch(() => row)
    : null;
  const inactive = !fresh || fresh.status !== "ACTIVE";

  if (isEmbed && inactive) {
    const pk = JSON.stringify(publicKey);
    return (
      <main className="box-border h-0 w-full overflow-hidden p-0" aria-hidden>
        <style>{`html,body{margin:0;padding:0;height:0;overflow:hidden;background:transparent}`}</style>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{parent.postMessage({source:"slotwise",type:"resize",publicKey:${pk},height:0},"*");}catch(e){}`,
          }}
        />
      </main>
    );
  }

  if (isEmbed) {
    return (
      <main className="sw-embed-shell box-border w-full max-w-full overflow-x-hidden bg-transparent p-0">
        <style>{`
          html, body { margin: 0; padding: 0; overflow-x: hidden; background: transparent; }
          .sw-embed-shell { width: 100%; max-width: 100%; min-width: 0; }
        `}</style>
        <BookingWidget publicKey={publicKey} embed />
      </main>
    );
  }

  if (inactive) {
    return (
      <main className="flex min-h-screen items-center justify-center px-4">
        <p className="text-center text-sm" style={{ color: "#6a7588" }}>
          This booking page is unavailable. The Slotwise app was disconnected for this site.
        </p>
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden px-4 py-10 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(70% 50% at 50% 0%, rgba(245,160,0,.12), transparent 60%), linear-gradient(180deg, #f7f8fb 0%, #eef1f6 100%)",
        }}
      />
      <div className="mx-auto w-full max-w-[520px]">
        <BookingWidget publicKey={publicKey} />
        <p className="mt-8 text-center text-[11px]" style={{ color: "var(--mut)" }}>
          Powered by{" "}
          <Link href="/" className="font-semibold underline-offset-2 hover:underline">
            Slotwise
          </Link>
          {" · "}
          <Link href="/privacy" className="underline-offset-2 hover:underline">
            Privacy
          </Link>
        </p>
      </div>
    </main>
  );
}
