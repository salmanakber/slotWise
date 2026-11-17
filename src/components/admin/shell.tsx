"use client";

import Image from "next/image";
import Link from "next/link";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

export function AdminShell({
  title,
  subtitle,
  nav,
  brandLabel,
  brandMeta,
  headerAside,
  children,
}: {
  title: string;
  subtitle: string;
  nav: NavItem[];
  brandLabel: string;
  brandMeta: string;
  headerAside?: React.ReactNode;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const saved = window.localStorage.getItem("sw-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
    window.localStorage.setItem("sw-theme", theme);
  }, [theme]);

  return (
    <div className="grid min-h-screen lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="sticky top-0 flex h-auto flex-row gap-1 overflow-x-auto border-b border-[var(--ln)] bg-[var(--pn)] p-2.5 lg:h-screen lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-3">
        <Link href="/" className="mb-1.5 flex min-w-[140px] items-center gap-2 px-2 py-1 lg:mb-3">
          <Image src="/logo.png" alt="" width={24} height={24} className="rounded-md" />
          <div>
            <div
              className="text-[14px] font-bold leading-none tracking-tight"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Slotwise
            </div>
            <div className="mt-0.5 text-[10px] font-semibold" style={{ color: "var(--mut)" }}>
              {brandLabel}
            </div>
          </div>
        </Link>

        {nav.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2.5 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[12.5px] font-semibold",
                active
                  ? "bg-[var(--sf)] text-[var(--at)]"
                  : "text-[var(--mut)] hover:bg-[var(--bg)] hover:text-[var(--ink)]",
              )}
            >
              <span className="opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto hidden space-y-2 lg:block">
          <div className="rounded-xl border border-[var(--ln)] p-3 text-[13px]">
            <div className="font-bold">{session?.user?.name || brandMeta.split("·")[0]?.trim()}</div>
            <div style={{ color: "var(--mut)" }}>{session?.user?.email || brandMeta}</div>
            <div className="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--at)]">
              {session?.user?.role?.replaceAll("_", " ") || "Signed in"}
            </div>
          </div>
          <button
            type="button"
            className="sw-btn w-full"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            Sign out
          </button>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-4 sm:px-6 sm:py-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-[var(--ln)] pb-4">
          <div className="min-w-0">
            <h1
              className="m-0 text-[20px] font-bold leading-tight tracking-tight sm:text-[22px]"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              {title}
            </h1>
            <p className="m-0 mt-1 text-[12.5px]" style={{ color: "var(--mut)" }}>
              {subtitle}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {headerAside}
            <button
              type="button"
              className="sw-btn lg:hidden"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              Sign out
            </button>
            <div className="inline-flex rounded-full border border-[var(--ln)] bg-[var(--bg)] p-[3px]">
              <button
                type="button"
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                  theme === "light" ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
                )}
                onClick={() => setTheme("light")}
              >
                Light
              </button>
              <button
                type="button"
                className={cn(
                  "rounded-full px-3.5 py-1.5 text-[13px] font-semibold",
                  theme === "dark" ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
                )}
                onClick={() => setTheme("dark")}
              >
                Amber night
              </button>
            </div>
          </div>
        </div>
        <div className="sw-fade-in">{children}</div>
      </main>
    </div>
  );
}

export function Icon({ d, size = 15 }: { d: string; size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}
