import Image from "next/image";
import Link from "next/link";
import { BookingWidget } from "@/components/widget/booking-widget";

export default async function BookPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = await params;
  return (
    <main className="relative min-h-screen overflow-hidden px-4 py-10">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(800px 420px at 50% -10%, rgba(245,160,0,.18), transparent 55%), linear-gradient(180deg, #f7f8fb, #eef2f6)",
        }}
      />
      <div className="mx-auto mb-8 flex max-w-[420px] flex-col items-center text-center">
        <Link href="/" className="mb-5 flex items-center gap-2">
          <Image src="/logo.png" alt="Slotwise" width={32} height={32} className="rounded-lg" />
          <span className="text-sm font-extrabold tracking-tight">Slotwise</span>
        </Link>
        <h1 className="text-2xl font-extrabold tracking-tight">Book an appointment</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--mut)" }}>
          Live availability · secure manage link · no account needed
        </p>
      </div>
      <BookingWidget publicKey={publicKey} />
      <p className="mx-auto mt-8 max-w-[420px] text-center text-[11px]" style={{ color: "var(--mut)" }}>
        Powered by Slotwise ·{" "}
        <Link href="/privacy" className="underline underline-offset-2">
          Privacy
        </Link>
      </p>
    </main>
  );
}
