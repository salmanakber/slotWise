import { BookingWidget } from "@/components/widget/booking-widget";

export default async function BookPage({
  params,
}: {
  params: Promise<{ publicKey: string }>;
}) {
  const { publicKey } = await params;
  return (
    <main className="min-h-screen px-4 py-10">
      <div className="mx-auto mb-6 max-w-[420px] text-center">
        <h1 className="text-2xl font-extrabold">Book with Slotwise</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--mut)" }}>
          Live availability · secure manage link · no account needed
        </p>
      </div>
      <BookingWidget publicKey={publicKey} />
    </main>
  );
}
