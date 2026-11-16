import Image from "next/image";
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
      <main className="sw-embed-shell min-h-[100svh] bg-transparent p-0 sm:p-2">
        <BookingWidget publicKey={publicKey} embed />
      </main>
    );
  }

  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10 sm:py-14">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 480px at 50% -8%, rgba(245,160,0,.2), transparent 55%), radial-gradient(600px 400px at 90% 80%, rgba(245,160,0,.08), transparent 50%), linear-gradient(180deg, #f6f8fb 0%, #eef2f7 100%)",
        }}
      />
      <div className="mx-auto mb-9 flex max-w-[440px] flex-col items-center text-center">
        <Link href="/" className="mb-5 flex items-center gap-2.5 transition hover:opacity-90">
          <Image src="/logo.png" alt="Slotwise" width={34} height={34} className="rounded-lg shadow-sm" />
          <span className="text-sm font-extrabold tracking-tight">Slotwise</span>
        </Link>
        <h1 className="text-[1.65rem] font-extrabold tracking-tight sm:text-3xl">Book an appointment</h1>
        <p className="mt-2 max-w-[32ch] text-sm leading-relaxed" style={{ color: "var(--mut)" }}>
          Live availability · secure manage link · no account needed
        </p>
      </div>
      <BookingWidget publicKey={publicKey} />
      <p className="mx-auto mt-8 max-w-[440px] text-center text-[11px]" style={{ color: "var(--mut)" }}>
        Powered by Slotwise ·{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
    </main>
  );
}
