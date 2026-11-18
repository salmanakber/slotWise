import Link from "next/link";
import { BookingWidget } from "@/components/widget/booking-widget";

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
