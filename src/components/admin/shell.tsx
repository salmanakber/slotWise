"use client";

import Image from "next/image";
import Link from "next/link";
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
  children,
}: {
  title: string;
  subtitle: string;
  nav: NavItem[];
  brandLabel: string;
  brandMeta: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
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
    <div className="grid min-h-screen lg:grid-cols-[236px_minmax(0,1fr)]">
      <aside
        className="sticky top-0 flex h-auto flex-row gap-1 overflow-x-auto border-b border-[var(--ln)] bg-[var(--pn)] p-3 lg:h-screen lg:flex-col lg:overflow-visible lg:border-b-0 lg:border-r lg:p-4"
      >
        <Link href="/" className="mb-2 flex min-w-[140px] items-center gap-2 px-2 py-1 lg:mb-4">
          <Image src="/logo.png" alt="" width={28} height={28} className="rounded-lg" />
          <div>
            <div className="text-[19px] font-extrabold leading-none">Slotwise</div>
            <div className="text-[11px] font-semibold" style={{ color: "var(--mut)" }}>
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
                "flex items-center gap-3 whitespace-nowrap rounded-[10px] px-3 py-2 text-sm font-semibold",
                active ? "bg-[var(--sf)] text-[var(--at)]" : "text-[var(--mut)] hover:bg-[var(--bg)] hover:text-[var(--ink)]",
              )}
            >
              <span className="opacity-80">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}

        <div className="mt-auto hidden rounded-xl border border-[var(--ln)] p-3 text-[13px] lg:block">
          <div className="font-bold">{brandMeta.split("·")[0]?.trim()}</div>
          <div style={{ color: "var(--mut)" }}>{brandMeta}</div>
        </div>
      </aside>

      <main className="min-w-0 px-4 py-5 sm:px-7 sm:py-6">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="m-0 text-[26px] font-extrabold leading-tight">{title}</h1>
            <p className="m-0 mt-1 text-sm" style={{ color: "var(--mut)" }}>
              {subtitle}
            </p>
          </div>
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
        <div className="sw-fade-in">{children}</div>
      </main>
    </div>
  );
}

export function Icon({ d }: { d: string }) {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}
