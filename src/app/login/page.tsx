"use client";

import Image from "next/image";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
      callbackUrl,
    });
    setPending(false);
    if (res?.error) {
      setError("Invalid email or password.");
      return;
    }

    const sessionRes = await fetch("/api/auth/session");
    const session = await sessionRes.json();
    const role = session?.user?.role as string | undefined;
    if (role === "PLATFORM_OWNER" || role === "PLATFORM_OPS") {
      router.push(callbackUrl.startsWith("/platform") ? callbackUrl : "/platform");
    } else {
      router.push(callbackUrl.startsWith("/dashboard") ? callbackUrl : "/dashboard");
    }
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="grid gap-4">
      <label className="grid gap-1.5 text-sm font-semibold">
        Work email
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-3 font-normal text-[#eaf0f8] outline-none transition focus:border-[#f5a000]"
          placeholder="you@studio.com"
        />
      </label>
      <label className="grid gap-1.5 text-sm font-semibold">
        Password
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="rounded-xl border border-white/10 bg-[#0b1524] px-3 py-3 font-normal text-[#eaf0f8] outline-none transition focus:border-[#f5a000]"
          placeholder="••••••••"
        />
      </label>
      {error ? (
        <p className="rounded-xl border border-[#ff6b6b]/30 bg-[#ff6b6b]/10 px-3 py-2 text-sm font-semibold text-[#ff8e8e]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-gradient-to-r from-[#f5a000] to-[#ffc45a] py-3.5 text-sm font-extrabold text-[#1a1203] shadow-[0_14px_34px_rgba(245,160,0,.35)] transition hover:brightness-105 disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in to Slotwise"}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(900px 500px at 20% -10%, rgba(245,160,0,.35), transparent 55%), linear-gradient(165deg, #070b12 0%, #132238 45%, #0a1018 100%)",
        }}
      />
      <div className="w-full max-w-md overflow-hidden rounded-[28px] border border-white/10 bg-[#132238]/95 shadow-[0_40px_100px_rgba(0,0,0,.5)] backdrop-blur">
        <div className="border-b border-white/8 bg-gradient-to-r from-[#f5a000]/15 to-transparent px-8 py-6">
          <Link href="/" className="flex items-center gap-3">
            <Image src="/logo.png" alt="Slotwise" width={44} height={44} className="rounded-xl" />
            <div>
              <div className="text-xl font-extrabold tracking-tight text-white">Slotwise</div>
              <div className="text-xs font-semibold text-[#93a4bc]">Secure workspace access</div>
            </div>
          </Link>
        </div>
        <div className="px-8 py-7 text-[#eaf0f8]">
          <h1 className="mb-2 text-2xl font-extrabold">Welcome back</h1>
          <p className="mb-6 text-sm leading-relaxed text-[#93a4bc]">
            Site owners open the booking dashboard. Platform operators are routed to the control
            console automatically.
          </p>
          <Suspense fallback={<div className="text-sm text-[#93a4bc]">Loading…</div>}>
            <LoginForm />
          </Suspense>
          <p className="mt-8 text-center text-xs text-[#6b7788]">
            <Link href="/" className="hover:text-[#f5a000]">
              ← Marketing site
            </Link>
            {" · "}
            <Link href="/privacy" className="hover:text-[#f5a000]">
              Privacy
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}
