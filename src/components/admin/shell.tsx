"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut, Moon, Sun } from "lucide-react";
import { signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  applySiteThemeToDocument,
  SITE_THEME_CHANNEL,
  SITE_THEME_EVENT,
  siteThemeSignature,
  type SiteThemeTokens,
} from "@/lib/site-theme";

export type NavItem = {
  href: string;
  label: string;
  icon: React.ReactNode;
};

function navActive(pathname: string, href: string) {
  // Exact match for section roots so Overview/Activity don't stay lit on every child route
  if (href === "/dashboard" || href === "/platform") return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
  const [brand, setBrand] = useState<SiteThemeTokens | null>(null);
  const sigRef = useRef("");

  useEffect(() => {
    const saved = window.localStorage.getItem("sw-theme");
    if (saved === "dark" || saved === "light") setTheme(saved);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const applyPayload = (d: Partial<SiteThemeTokens> & { accent?: string }) => {
      if (!d?.accent || !d.bg || !d.panel || !d.inkColor || !d.line) return;
      const tokens: SiteThemeTokens = {
        themeKey: d.themeKey || "amber-light",
        accent: d.accent,
        inkColor: d.inkColor,
        bg: d.bg,
        panel: d.panel,
        line: d.line,
        font: d.font || "Manrope",
        radius: typeof d.radius === "number" ? d.radius : 14,
      };
      const sig = siteThemeSignature(tokens);
      if (sig === sigRef.current) {
        // Still re-apply DOM in case Night toggle wiped vars
        applySiteThemeToDocument(tokens);
        return;
      }
      sigRef.current = sig;
      setBrand(tokens);
      applySiteThemeToDocument(tokens);
    };

    const loadBrand = () => {
      void fetch("/api/site/branding", { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((d) => {
          if (cancelled || !d) return;
          applyPayload(d);
        })
        .catch(() => undefined);
    };

    loadBrand();
    const poll = window.setInterval(loadBrand, 5000);
    const onFocus = () => loadBrand();
    const onBrand = (e: Event) => {
      const detail = (e as CustomEvent).detail as SiteThemeTokens | null;
      if (detail?.accent) applyPayload(detail);
      else loadBrand();
    };
    const onVis = () => {
      if (document.visibilityState === "visible") loadBrand();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key === "sw-site-theme-bump") loadBrand();
    };

    let bc: BroadcastChannel | null = null;
    try {
      bc = new BroadcastChannel(SITE_THEME_CHANNEL);
      bc.onmessage = () => loadBrand();
    } catch {
      bc = null;
    }

    window.addEventListener("focus", onFocus);
    window.addEventListener(SITE_THEME_EVENT, onBrand);
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("storage", onStorage);
    return () => {
      cancelled = true;
      window.clearInterval(poll);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener(SITE_THEME_EVENT, onBrand);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("storage", onStorage);
      bc?.close();
    };
  }, [pathname]);

  useEffect(() => {
    // UI contrast preference only — never wipe site branding colors
    document.documentElement.dataset.theme = theme === "dark" ? "dark" : "";
    window.localStorage.setItem("sw-theme", theme);
    if (brand) applySiteThemeToDocument(brand);
  }, [theme, brand]);

  return (
    <div className="sw-shell grid min-h-screen lg:grid-cols-[248px_minmax(0,1fr)]">
      <aside className="sw-sidebar sticky top-0 z-20 flex h-auto flex-row gap-1.5 overflow-x-auto border-b border-[var(--ln)] bg-[var(--pn)] px-2.5 py-2 lg:h-screen lg:flex-col lg:gap-0 lg:overflow-y-auto lg:overflow-x-hidden lg:border-b-0 lg:border-r lg:px-3 lg:py-4">
        <Link
          href={brandLabel.toLowerCase().includes("platform") ? "/platform" : "/dashboard"}
          className="sw-sidebar-brand mb-0 flex min-w-[148px] shrink-0 items-center gap-2.5 rounded-xl px-2 py-2 lg:mb-5"
        >
          <span className="sw-sidebar-mark relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-[var(--sf)] ring-1 ring-[var(--ln)]">
            <Image src="/logo.png" alt="" width={22} height={22} className="rounded-md" />
          </span>
          <div className="min-w-0">
            <div
              className="truncate text-[14px] font-bold leading-none tracking-tight"
              style={{ fontFamily: "var(--font-sora), Sora, system-ui" }}
            >
              Slotwise
            </div>
            <div className="mt-1 truncate text-[10.5px] font-semibold uppercase tracking-[0.06em]" style={{ color: "var(--mut)" }}>
              {brandLabel}
            </div>
          </div>
        </Link>

        <nav className="sw-sidebar-nav flex flex-1 flex-row gap-1 lg:flex-col lg:gap-0.5" aria-label="Workspace">
          {nav.map((item) => {
            const active = navActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn("sw-nav-item", active && "is-active")}
              >
                <span className="sw-nav-ico" aria-hidden>
                  {item.icon}
                </span>
                <span className="sw-nav-label">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="sw-sidebar-foot mt-auto hidden lg:flex lg:flex-col lg:gap-2.5 lg:pt-4">
          <div className="rounded-2xl border border-[var(--ln)] bg-[var(--bg)] p-3">
            <div className="truncate text-[13px] font-bold">
              {session?.user?.name || brandMeta.split("·")[0]?.trim()}
            </div>
            <div className="mt-0.5 truncate text-[11.5px]" style={{ color: "var(--mut)" }}>
              {session?.user?.email || brandMeta}
            </div>
            <div className="mt-2 inline-flex rounded-full bg-[var(--sf)] px-2 py-0.5 text-[10px] font-bold uppercase tracking-[0.05em] text-[var(--at)]">
              {session?.user?.role?.replaceAll("_", " ") || "Signed in"}
            </div>
          </div>
          <button
            type="button"
            className="sw-nav-item !text-[var(--mut)] hover:!text-[var(--ink)]"
            onClick={() => signOut({ callbackUrl: "/login" })}
          >
            <span className="sw-nav-ico" aria-hidden>
              <LogOut size={16} strokeWidth={2} />
            </span>
            <span className="sw-nav-label">Sign out</span>
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
              className="sw-btn inline-flex items-center gap-1.5 lg:hidden"
              onClick={() => signOut({ callbackUrl: "/login" })}
            >
              <LogOut size={14} strokeWidth={2} />
              Sign out
            </button>
            <div className="inline-flex rounded-full border border-[var(--ln)] bg-[var(--bg)] p-[3px]">
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
                  theme === "light" ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
                )}
                onClick={() => setTheme("light")}
              >
                <Sun size={13} strokeWidth={2.25} />
                Light
              </button>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold",
                  theme === "dark" ? "bg-[var(--ac)] text-[var(--on)]" : "text-[var(--mut)]",
                )}
                onClick={() => setTheme("dark")}
              >
                <Moon size={13} strokeWidth={2.25} />
                Night
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
