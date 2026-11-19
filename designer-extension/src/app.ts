import * as api from "./api";
import {
  canDesignOnCanvas,
  detectWebflowSiteId,
  getDesignerMode,
  insertBookingIframe,
  notify,
  removeSlotwiseEmbedsFromCanvas,
  setExtensionLarge,
  subscribeMode,
} from "./canvas";
import { iconLabel, icons } from "./icons";
import { brandLoader } from "./loader";

type Tab = "home" | "events" | "create" | "theme" | "chat" | "tools" | "settings";

const THEME_KEY = "slotwise-designer-theme";
const PANEL_MODE_KEY = "slotwise-panel-mode";
const CANVAS_WIDE_KEY = "slotwise-canvas-wide";

const TAB_META: Record<Tab, { label: string; icon: string }> = {
  home: { label: "Home", icon: icons.home },
  events: { label: "Events", icon: icons.calendar },
  create: { label: "New", icon: icons.plus },
  theme: { label: "Theme", icon: icons.palette },
  chat: { label: "Chat", icon: icons.chat },
  tools: { label: "Tools", icon: icons.wrench },
  settings: { label: "More", icon: icons.settings },
};

export async function boot(root: HTMLElement) {
  await setExtensionLarge();

  // Fresh installs / first open default to mobile panel
  const savedPanel = localStorage.getItem(PANEL_MODE_KEY) as "mobile" | "full" | null;
  const state = {
    theme: (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light",
    panelMode: savedPanel === "full" || savedPanel === "mobile" ? savedPanel : "mobile",
    canvasWide: localStorage.getItem(CANVAS_WIDE_KEY) === "1",
    tab: "home" as Tab,
    webflowSiteId: null as string | null,
    bootstrap: null as api.Bootstrap | null,
    services: [] as api.Service[],
    themes: [] as api.DesignerTheme[],
    branding: null as api.DesignerBranding | null,
    selectedBookingId: null as string | null,
    calendarChat: null as api.CalendarChatPayload | null,
    availability: null as api.AvailabilityPayload | null,
    inbox: null as { unread: number; items: api.InboxItem[] } | null,
    status: "",
    statusOk: true,
    busy: false,
    mode: null as string | null,
    canDesign: true,
    loading: true,
  };

  function contrastOn(accent: string) {
    const hex = accent.replace("#", "");
    if (hex.length < 6) return "#1a1203";
    const r = parseInt(hex.slice(0, 2), 16);
    const g = parseInt(hex.slice(2, 4), 16);
    const b = parseInt(hex.slice(4, 6), 16);
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.62 ? "#1a1203" : "#ffffff";
  }

  /** Accent always; ink only in light chrome so dark mode keeps white text. */
  function applyBrandColors(accent?: string | null, ink?: string | null) {
    const root = document.documentElement;
    const ac = accent || state.branding?.accent || state.bootstrap?.site.accent || "#f5a000";
    const inkColor =
      ink ||
      state.branding?.inkColor ||
      state.themes.find((t) => t.key === (state.branding?.themeKey || state.bootstrap?.site.themeKey))
        ?.ink ||
      null;
    root.style.setProperty("--ac", ac);
    root.style.setProperty("--on", contrastOn(ac));
    if (state.theme === "dark") {
      // Panel dark mode: readable light text (ignore dark branding ink for chrome)
      root.style.setProperty("--ink", "#eef3fa");
      root.style.setProperty("--mut", "#9aabc0");
      root.style.setProperty("--bg", "#0b121c");
      root.style.setProperty("--panel", "#121b28");
      root.style.setProperty("--line", "#243247");
      root.style.setProperty("--soft", "#182333");
      root.style.setProperty("--nav", "rgba(11, 18, 28, 0.96)");
      if (inkColor) root.style.setProperty("--brand-ink", inkColor);
      return;
    }
    root.style.removeProperty("--bg");
    root.style.removeProperty("--panel");
    root.style.removeProperty("--line");
    root.style.removeProperty("--soft");
    root.style.removeProperty("--nav");
    if (inkColor) {
      root.style.setProperty("--ink", inkColor);
      root.style.setProperty("--brand-ink", inkColor);
      root.style.setProperty("--mut", `color-mix(in srgb, ${inkColor} 52%, #8a95a8)`);
    } else {
      root.style.removeProperty("--ink");
      root.style.removeProperty("--mut");
    }
  }

  function setTheme(theme: "light" | "dark") {
    state.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
    applyBrandColors();
  }
  setTheme(state.theme);

  function setStatus(msg: string, ok = true) {
    state.status = msg;
    state.statusOk = ok;
    const el = root.querySelector("#status");
    if (el) {
      el.textContent = msg;
      (el as HTMLElement).dataset.tone = ok ? "ok" : "bad";
    }
  }

  async function refreshMode() {
    state.mode = await getDesignerMode();
    const check = await canDesignOnCanvas();
    state.canDesign = check.ok;
    state.mode = check.mode ?? state.mode;
  }

  function money(cents: number, currency = "USD") {
    if (!cents || cents <= 0) return "Free";
    try {
      return new Intl.NumberFormat(undefined, {
        style: "currency",
        currency,
        maximumFractionDigits: 0,
      }).format(cents / 100);
    } catch {
      return `$${(cents / 100).toFixed(0)}`;
    }
  }

  function setPanelMode(mode: "mobile" | "full") {
    state.panelMode = mode;
    localStorage.setItem(PANEL_MODE_KEY, mode);
    document.documentElement.dataset.panel = mode;
  }
  setPanelMode(state.panelMode);

  function gate(feature: string) {
    return state.bootstrap?.entitlements.gates[feature];
  }

  function upgradeUrl() {
    return state.bootstrap?.entitlements.upgradeUrl || `${api.APP_URL}/dashboard/plans`;
  }

  /** Subtle inline upgrade chip — never a bulky card */
  function upgradeLock(feature: string, label: string) {
    const g = gate(feature);
    if (!g || g.allowed) return "";
    return `<span class="upgrade-chip"><b>${escapeHtml(label)}</b> · ${escapeHtml(g.upgradeLabel)}+ <a href="${upgradeUrl()}" target="_blank" rel="noreferrer">Upgrade</a></span>`;
  }

  function modeBanner() {
    if (state.canDesign) return "";
    const mode = state.mode || "build";
    return `<div class="mode-banner" role="status">
      ${icons.alert}
      <div>
        <b>Design mode needed</b><br/>
        Press <b>D</b>, select a section on the page, then add your booking block. Current: <b>${escapeHtml(mode)}</b>
      </div>
    </div>`;
  }

  function tabButton(t: Tab) {
    const meta = TAB_META[t];
    const createClass = t === "create" ? " tab-create" : "";
    return `<button type="button" class="tab${createClass}" data-tab="${t}" aria-selected="${state.tab === t}" title="${meta.label}">
      <span class="ico">${meta.icon}</span>
      <span class="tab-label">${meta.label}</span>
    </button>`;
  }

  function panelSwitcher() {
    const mobileOn = state.panelMode === "mobile";
    const fullOn = state.panelMode === "full";
    return `<div class="panel-switch" role="group" aria-label="Panel layout">
      <button type="button" class="panel-switch-btn${mobileOn ? " is-on" : ""}" id="panelMobile" title="Mobile view" aria-pressed="${mobileOn}">
        <span class="ico">${icons.phone}</span>
      </button>
      <button type="button" class="panel-switch-btn${fullOn ? " is-on" : ""}" id="panelFull" title="Desktop view" aria-pressed="${fullOn}">
        <span class="ico">${icons.monitor}</span>
      </button>
    </div>`;
  }

  function shell(body: string) {
    const plan = state.bootstrap?.plan.tier || "FREE";
    const name = state.bootstrap?.site.name || "Slotwise";
    const showFab = state.tab !== "create" && Boolean(state.bootstrap);
    const full = state.panelMode === "full";
    const tabs = (Object.keys(TAB_META) as Tab[]).map(tabButton).join("");
    const actions = full
      ? `
      <div class="side-foot">
        <button type="button" class="btn btn-primary btn-publish" id="publishBtn" title="Publish">
          <span class="ico">${icons.rocket}</span>
          <span>Publish</span>
        </button>
        <div class="side-foot-row side-foot-row-switch">
          <a class="side-foot-icon" href="${upgradeUrl()}" target="_blank" rel="noreferrer" title="Upgrade plan">
            <span class="ico">${icons.spark}</span>
          </a>
          ${panelSwitcher()}
        </div>
        <div class="side-foot-row side-foot-row-tools">
          <a class="side-foot-icon" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer" title="Open dashboard">
            <span class="ico">${icons.grid}</span>
          </a>
          <button type="button" class="side-foot-icon" id="themeBtn" title="${state.theme === "light" ? "Dark mode" : "Light mode"}">
            ${state.theme === "light" ? icons.moon : icons.sun}
          </button>
        </div>
      </div>`
      : `
      ${panelSwitcher()}
      <a class="btn btn-icon btn-soft" href="${upgradeUrl()}" target="_blank" rel="noreferrer" title="Upgrade plan">
        <span class="ico">${icons.spark}</span>
      </a>
      <div class="side-tools">
        <a class="btn btn-icon btn-soft" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer" title="Open dashboard">
          <span class="ico">${icons.grid}</span>
        </a>
        <button type="button" class="btn btn-icon btn-ghost" id="themeBtn" title="Toggle panel theme">
          ${state.theme === "light" ? icons.moon : icons.sun}
        </button>
      </div>
      <button type="button" class="btn btn-primary btn-publish" id="publishBtn" title="Publish">
        <span class="ico">${icons.rocket}</span>
        <span>Publish</span>
      </button>`;

    root.innerHTML = full
      ? `
      <div class="app app-full">
        <aside class="sidebar">
          <div class="brand brand-side">
            <div class="mark">S</div>
            <div>
              <strong>Slotwise</strong>
              <small>${escapeHtml(name)} · ${escapeHtml(plan)}</small>
            </div>
          </div>
          <nav class="side-nav" role="tablist">${tabs}</nav>
          <div class="side-actions">${actions}</div>
        </aside>
        <div class="workspace">
          ${modeBanner()}
          <main class="main main-full">${body}</main>
          <p id="status" class="status" data-tone="${state.statusOk ? "ok" : "bad"}">${state.status}</p>
          <p class="footer-note">Support <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a></p>
        </div>
        <button type="button" class="fab${showFab ? "" : " is-hidden"}" id="fabNew" title="New event">
          <span class="fab-plus"><span class="ico">${icons.plus}</span></span>
          New event
        </button>
      </div>`
      : `
      <div class="app">
        <header class="topnav">
          <div class="brand">
            <div class="mark">S</div>
            <div>
              <strong>Slotwise</strong>
              <small>${escapeHtml(name)} · ${escapeHtml(plan)}</small>
            </div>
          </div>
          <div class="nav-actions">${actions}</div>
        </header>
        ${modeBanner()}
        <nav class="tabs" role="tablist">${tabs}</nav>
        <main class="main">${body}</main>
        <p id="status" class="status" data-tone="${state.statusOk ? "ok" : "bad"}">${state.status}</p>
        <p class="footer-note">Support <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a></p>
        <button type="button" class="fab${showFab ? "" : " is-hidden"}" id="fabNew" title="New event">
          <span class="fab-plus"><span class="ico">${icons.plus}</span></span>
          New event
        </button>
      </div>`;
    wireChrome();
  }

  function wireChrome() {
    root.querySelectorAll("[data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.tab = (btn as HTMLElement).dataset.tab as Tab;
        void render();
      });
    });
    root.querySelector("#themeBtn")?.addEventListener("click", () => {
      setTheme(state.theme === "light" ? "dark" : "light");
      void render();
    });
    root.querySelector("#publishBtn")?.addEventListener("click", () => void onPublish());
    root.querySelector("#panelMobile")?.addEventListener("click", () => {
      setPanelMode("mobile");
      void render();
    });
    root.querySelector("#panelFull")?.addEventListener("click", () => {
      setPanelMode("full");
      void render();
    });
    root.querySelector("#fabNew")?.addEventListener("click", () => {
      state.tab = "create";
      void render();
    });
  }

  async function refresh() {
    state.webflowSiteId = await detectWebflowSiteId();
    await refreshMode();
    try {
      state.bootstrap = await api.bootstrap({
        webflowSiteId: state.webflowSiteId,
        publicKey: null,
      });
      if (state.bootstrap.uninstalled) {
        state.services = [];
        state.calendarChat = null;
        state.availability = null;
        setStatus("Webflow app was uninstalled — remove leftover widgets, then republish", false);
        try {
          await removeSlotwiseEmbedsFromCanvas();
        } catch {
          /* canvas may be in build mode */
        }
        return;
      }
      document.documentElement.style.setProperty("--ac", state.bootstrap.site.accent || "#f5a000");
      const [list, themesRes, brandingRes] = await Promise.all([
        api.listServices({
          webflowSiteId: state.webflowSiteId,
          publicKey: state.bootstrap.site.publicKey,
        }),
        api.listThemes().catch(() => ({ themes: [] as api.DesignerTheme[] })),
        api
          .getBranding({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
          })
          .catch(() => null),
      ]);
      state.services = list.services;
      state.themes = themesRes.themes;
      state.branding = brandingRes?.branding ?? {
        themeKey: state.bootstrap.site.themeKey || "amber-light",
        accent: state.bootstrap.site.accent || "#f5a000",
        inkColor: "#0f1b2d",
        radius: 14,
        font: "Manrope",
      };
      applyBrandColors(state.branding.accent, state.branding.inkColor);
      void loadCalendarChat().catch(() => undefined);
      void loadAvailability().catch(() => undefined);
      void loadInbox().catch(() => undefined);
      const planLabel = state.bootstrap.entitlements?.label || state.bootstrap.plan?.tier;
      setStatus(`Connected · ${state.bootstrap.site.name} · ${planLabel}`);
    } catch (e) {
      state.bootstrap = null;
      state.calendarChat = null;
      state.availability = null;
      setStatus(e instanceof Error ? e.message : "Not connected", false);
    } finally {
      state.loading = false;
    }
  }

  async function loadCalendarChat() {
    if (!state.bootstrap) {
      state.calendarChat = null;
      return;
    }
    state.calendarChat = await api.getCalendarChat({
      webflowSiteId: state.webflowSiteId,
      publicKey: state.bootstrap.site.publicKey,
    });
  }

  async function loadAvailability() {
    if (!state.bootstrap) {
      state.availability = null;
      return;
    }
    state.availability = await api.getAvailability({
      webflowSiteId: state.webflowSiteId,
      publicKey: state.bootstrap.site.publicKey,
    });
  }

  async function loadInbox() {
    if (!state.bootstrap || state.bootstrap.uninstalled) {
      state.inbox = null;
      return;
    }
    state.inbox = await api.getInbox({
      webflowSiteId: state.webflowSiteId,
      publicKey: state.bootstrap.site.publicKey,
    });
  }

  async function onPublish() {
    if (!state.bootstrap) return setStatus("Connect a site first", false);
    try {
      setStatus("Publishing…");
      await api.publishSite({
        webflowSiteId: state.webflowSiteId,
        publicKey: state.bootstrap.site.publicKey,
      });
      setStatus("Publish started on Webflow subdomain");
      await notify("Success", "Site publish started");
    } catch (e) {
      setStatus(
        (e instanceof Error ? e.message : "Publish failed") +
          " — use Webflow’s Publish if needed",
        false,
      );
      await notify("Info", "Use Webflow’s Publish button if needed");
    }
  }

  async function onEmbed() {
    if (!state.bootstrap) return setStatus("Connect first", false);
    const g = gate("canvas_embed");
    if (g && !g.allowed) return setStatus("Canvas embed locked on this plan", false);
    await refreshMode();
    void render();
    try {
      await insertBookingIframe(state.bootstrap.site.publicKey);
      setStatus("Widget placed on canvas");
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Embed failed", false);
      await refreshMode();
      void render();
    }
  }

  function cardTitle(icon: string, title: string) {
    return `<div class="card-h"><span class="ico">${icon}</span><h2>${title}</h2></div>`;
  }

  function formatWhen(iso: string) {
    try {
      return new Date(iso).toLocaleString(undefined, {
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      });
    } catch {
      return iso;
    }
  }

  function paymentCard() {
    const p = state.bootstrap?.payments;
    if (!p) return "";
    const ok = p.connected && p.chargesEnabled;
    const partial = p.connected && !p.chargesEnabled;
    const status = ok ? "Ready" : partial ? "Finish setup" : "Not set up";
    const tone = ok ? "ok" : partial ? "warn" : "muted";
    const modeLabel =
      p.paymentMode === "DEPOSIT"
        ? `${p.depositPercent}% deposit`
        : p.paymentMode === "FULL"
          ? "Full payment"
          : "Pay on site";
    return `<section class="card card-soft">
      ${cardTitle(icons.zap, "Payments")}
      <div class="status-row">
        <em class="pill pill-${tone}">${status}</em>
        <span class="muted">${escapeHtml(modeLabel)}</span>
      </div>
      <p class="lead">${ok ? "Customers can pay when they book." : "Set up Stripe so you can take deposits or full payment."}</p>
      <a class="btn btn-quiet btn-block" href="${p.setupUrl}" target="_blank" rel="noreferrer">${iconLabel(icons.external, ok ? "Manage payments" : "Set up payments")}</a>
    </section>`;
  }

  function appsCard() {
    const apps = (state.bootstrap?.apps || []).filter((a) => a.ready || a.connected);
    if (!apps.length) return "";
    return `<section class="card card-soft">
      ${cardTitle(icons.grid, "Connected apps")}
      <p class="lead">Calendars and meeting tools ready for this site.</p>
      <div class="app-list">
        ${apps
          .map((a) => {
            const stateLabel = a.connected ? "Connected" : "Available";
            const tone = a.connected ? "ok" : "warn";
            return `<div class="app-row">
              <div class="app-meta">
                <b>${escapeHtml(a.label)}</b>
                <small>${a.connected && a.email ? escapeHtml(a.email) : a.connected ? "Linked" : "Connect in dashboard"}</small>
              </div>
              <em class="pill pill-${tone}">${stateLabel}</em>
            </div>`;
          })
          .join("")}
      </div>
      <a class="link-quiet" href="${api.APP_URL}/dashboard/integrations" target="_blank" rel="noreferrer">Manage connections →</a>
    </section>`;
  }

  function eventsPreview() {
    const events = state.bootstrap?.activeEvents || state.services.filter((s) => s.active).slice(0, 8);
    return `<section class="card home-events-card">
      <div class="card-h-row">
        ${cardTitle(icons.calendar, "Events")}
        <button type="button" class="link-quiet" id="gotoEvents">See all</button>
      </div>
      ${
        events.length
          ? `<div class="home-grid">
        ${events
          .slice(0, 6)
          .map(
            (s) => `<article class="home-tile" title="${escapeHtml(s.name)}">
            <i class="dot" style="background:${s.color || "var(--ac)"}"></i>
            <b>${escapeHtml(s.name)}</b>
            <small>${s.durationMin} min${s.priceCents > 0 ? ` · ${money(s.priceCents, state.bootstrap?.site.currency)}` : ""}</small>
          </article>`,
          )
          .join("")}
      </div>`
          : `<div class="empty">No active events yet.</div>`
      }
      <button type="button" class="btn btn-quiet btn-block" id="gotoCreate">${iconLabel(icons.plus, "Add event")}</button>
    </section>`;
  }

  function bookingsPreview() {
    const bookings = (state.bootstrap?.recentBookings || []).slice(0, 6);
    return `<section class="card home-bookings-card">
      <div class="card-h-row">
        ${cardTitle(icons.check, "Bookings")}
        <a class="link-quiet" href="${api.APP_URL}/dashboard/bookings" target="_blank" rel="noreferrer">Open</a>
      </div>
      ${
        bookings.length
          ? `<div class="home-list">
        ${bookings
          .map((b) => {
            const meet =
              b.meetingProvider === "zoom"
                ? "Zoom"
                : b.meetingProvider === "teams"
                  ? "Teams"
                  : b.meetingProvider === "apple_calendar"
                    ? "Apple"
                    : b.meetingProvider === "google_calendar"
                      ? "Calendar"
                      : b.meetingProvider === "meet"
                        ? "Meet"
                        : null;
            return `<div class="home-booking">
            <div class="mini-meta">
              <b title="${escapeHtml(b.customerName)}">${escapeHtml(b.customerName)}</b>
              <small title="${escapeHtml(b.serviceName)} · ${escapeHtml(formatWhen(b.startsAt))}">${escapeHtml(b.serviceName)} · ${escapeHtml(formatWhen(b.startsAt))}${
                meet ? ` · ${meet}` : ""
              }</small>
            </div>
            <div class="home-booking-actions">
              ${
                b.meetingUrl
                  ? `<a class="btn btn-sm btn-soft" href="${escapeHtml(b.meetingUrl)}" target="_blank" rel="noreferrer" title="Open meeting">${icons.video}</a>`
                  : ""
              }
              <em class="pill pill-muted">${escapeHtml(b.status)}</em>
              <button type="button" class="btn btn-sm" data-booking-id="${escapeHtml(b.id)}">Details</button>
            </div>
          </div>`;
          })
          .join("")}
      </div>`
          : `<div class="empty">No bookings yet — share your widget to get the first one.</div>`
      }
    </section>`;
  }

  function inboxCard() {
    if (!state.bootstrap || state.bootstrap.uninstalled) return "";
    const items = (state.inbox?.items || []).slice(0, 5);
    const unread = state.inbox?.unread || 0;
    return `<section class="card inbox-card">
      <div class="card-h-row">
        ${cardTitle(icons.bell, "Notifications")}
        ${unread ? `<em class="pill pill-ac">${unread} new</em>` : `<em class="pill pill-muted">Up to date</em>`}
      </div>
      ${
        items.length
          ? `<div class="home-list">
        ${items
          .map(
            (n) => `<div class="home-booking ${n.readAt ? "" : "inbox-unread"}">
            <div class="mini-meta">
              <b>${escapeHtml(n.title)}</b>
              <small>${escapeHtml(n.body)}</small>
            </div>
            ${
              n.href
                ? `<a class="btn btn-sm" href="${api.APP_URL}${escapeHtml(n.href)}" target="_blank" rel="noreferrer">Open</a>`
                : ""
            }
          </div>`,
          )
          .join("")}
      </div>`
          : `<div class="empty">New bookings and meeting links will show here.</div>`
      }
      <div class="quiet-actions">
        ${unread ? `<button type="button" class="btn btn-quiet" id="markInboxRead">${iconLabel(icons.check, "Mark all read")}</button>` : ""}
        <a class="link-quiet" href="${api.APP_URL}/dashboard/notifications" target="_blank" rel="noreferrer">Full inbox →</a>
      </div>
    </section>`;
  }

  function bookingDrawer() {
    const b = (state.bootstrap?.recentBookings || []).find((x) => x.id === state.selectedBookingId);
    if (!b) return "";
    const currency = b.currency || state.bootstrap?.site.currency || "USD";
    const meetLabel =
      b.meetingProvider === "zoom" ? "Zoom" : b.meetingProvider === "meet" ? "Google Meet" : null;
    return `<div class="drawer-root" id="bookingDrawer">
      <button type="button" class="drawer-backdrop" id="closeBookingDrawer" aria-label="Close"></button>
      <aside class="drawer-panel" role="dialog" aria-modal="true">
        <header class="drawer-head">
          <div>
            <div class="eyebrow">${escapeHtml(b.reference)}</div>
            <h3>${escapeHtml(b.customerName)}</h3>
            <em class="pill">${escapeHtml(b.status)}</em>
          </div>
          <button type="button" class="btn btn-icon btn-ghost" id="closeBookingDrawer2" aria-label="Close">✕</button>
        </header>
        <div class="drawer-body">
          <div class="drawer-row"><span>Service</span><b>${escapeHtml(b.serviceName)}</b></div>
          <div class="drawer-row"><span>When</span><b>${escapeHtml(formatWhen(b.startsAt))}</b></div>
          <div class="drawer-row"><span>Email</span><b>${escapeHtml(b.customerEmail || "—")}</b></div>
          <div class="drawer-row"><span>Phone</span><b>${escapeHtml(b.customerPhone || "—")}</b></div>
          <div class="drawer-row"><span>Meeting</span><b>${meetLabel || "Not added yet"}</b></div>
          <div class="drawer-row"><span>Join link</span><b>${
            b.meetingUrl
              ? `<a href="${escapeHtml(b.meetingUrl)}" target="_blank" rel="noreferrer">${escapeHtml(b.meetingUrl)}</a>`
              : "Customer can add Zoom or Meet after booking"
          }</b></div>
          <div class="drawer-row"><span>Amount</span><b>${money(b.amountCents || 0, currency)}</b></div>
          <div class="drawer-row"><span>Deposit</span><b>${b.depositCents ? money(b.depositCents, currency) : "None"}</b></div>
          <div class="drawer-row"><span>Notes</span><b>${escapeHtml(b.notes?.trim() || "No notes")}</b></div>
        </div>
        <footer class="drawer-foot">
          ${
            b.meetingUrl
              ? `<a class="btn btn-primary btn-block" href="${escapeHtml(b.meetingUrl)}" target="_blank" rel="noreferrer">${iconLabel(icons.video, `Open ${meetLabel || "meeting"}`)}</a>`
              : ""
          }
          ${b.customerEmail ? `<a class="btn ${b.meetingUrl ? "" : "btn-primary"} btn-block" href="mailto:${escapeHtml(b.customerEmail)}">Email customer</a>` : ""}
          <button type="button" class="btn btn-block" id="closeBookingDrawer3">Close</button>
        </footer>
      </aside>
    </div>`;
  }

  function viewHome() {
    if (state.bootstrap?.uninstalled) {
      return `<section class="card">
        ${cardTitle(icons.alert, "App uninstalled")}
        <p class="lead">Webflow access was revoked. Leftover booking blocks can stay on the canvas — remove them here, then <b>publish</b> the site.</p>
        <button type="button" class="btn btn-primary btn-block" id="removeEmbedsBtn">${iconLabel(icons.trash, "Remove widgets from this page")}</button>
        <button type="button" class="btn btn-quiet btn-block" id="installBtn" style="margin-top:8px">${iconLabel(icons.external, "Reinstall Slotwise")}</button>
      </section>`;
    }
    if (!state.bootstrap) {
      return `<section class="card">
        ${cardTitle(icons.layout, "Connect Slotwise")}
        <p class="lead">Connect once so Designer stays open while you authorize.</p>
        <button type="button" class="btn btn-primary btn-block" id="installBtn">${iconLabel(icons.external, "Connect Webflow")}</button>
      </section>`;
    }
    const lim = state.bootstrap.entitlements.eventsLimit;
    const embedLabel = state.canDesign ? "Add booking to page" : "Switch to Design mode first";
    return `
      <section class="card hero-card">
        <div class="hero-top">
          <div>
            <div class="eyebrow">${escapeHtml(state.bootstrap.entitlements.label)} plan</div>
            <h2 class="hero-title">${escapeHtml(state.bootstrap.site.name)}</h2>
          </div>
        </div>
        <div class="stats stats-compact">
          <div class="stat">
            <div class="top"><span class="label">Events</span></div>
            <b>${state.bootstrap.counts.services}${lim != null ? `<span class="lim">/${lim}</span>` : ""}</b>
          </div>
          <div class="stat">
            <div class="top"><span class="label">Bookings / mo</span></div>
            <b>${state.bootstrap.counts.bookingsThisMonth ?? state.bootstrap.counts.bookings}${
              state.bootstrap.entitlements.bookingsLimit != null
                ? `<span class="lim">/${state.bootstrap.entitlements.bookingsLimit}</span>`
                : ""
            }</b>
          </div>
        </div>
        <div class="quiet-actions">
          <button type="button" class="btn btn-quiet" id="embedBtn" ${!state.canDesign ? "disabled" : ""}>
            ${iconLabel(icons.layout, embedLabel)}
          </button>
          <a class="btn btn-ghost-soft" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer">${iconLabel(icons.grid, "Dashboard")}</a>
        </div>
      </section>
      <div class="home-columns">
        ${bookingsPreview()}
        ${eventsPreview()}
      </div>
      ${inboxCard()}
      ${aiChatHomeCard()}
      ${paymentCard()}
      ${appsCard()}
      ${bookingDrawer()}
    `;
  }

  function aiChatHomeCard() {
    const allowed = gate("ai_calendar_chat")?.allowed;
    const a = state.calendarChat?.analytics.totals;
    const on = state.calendarChat?.enabled;
    return `<section class="card ai-chat-card">
      <div class="card-h-row">
        ${cardTitle(icons.chat, "Chat")}
        <em class="pill pill-ac">BETA</em>
      </div>
      <p class="lead">Visitors ask “What’s free this weekend?” and get answers from your events.</p>
      ${
        allowed
          ? `<div class="stats stats-compact">
        <div class="stat"><div class="top"><span class="label">7d chats</span></div><b>${a?.sessions7 ?? "—"}</b></div>
        <div class="stat"><div class="top"><span class="label">Questions</span></div><b>${a?.messages7 ?? "—"}</b></div>
      </div>`
          : `${upgradeLock("ai_calendar_chat", "Business+ feature")}`
      }
      <div class="quiet-actions">
        <button type="button" class="btn btn-quiet" id="gotoChat">${iconLabel(icons.spark, allowed ? (on ? "Analytics" : "Set up Chat") : "Preview Chat")}</button>
        <a class="link-quiet" href="${api.APP_URL}/dashboard/ai-chat" target="_blank" rel="noreferrer">Dashboard →</a>
      </div>
    </section>`;
  }

  function viewChat() {
    if (!state.bootstrap) {
      return `<section class="card">
        ${cardTitle(icons.chat, "Chat")}
        <p class="lead">Connect a site to enable chat and analytics.</p>
      </section>`;
    }
    const allowed = Boolean(gate("ai_calendar_chat")?.allowed || state.calendarChat?.allowed);
    const chat = state.calendarChat;
    const t = chat?.analytics.totals;
    const questions = chat?.analytics.popularQuestions || [];
    const sessions = (chat?.analytics.recentSessions || []).slice(0, 5);
    const daily = chat?.analytics.daily || [];
    const maxDaily = Math.max(1, ...daily.map((d) => Math.max(d.sessions, d.questions)), 1);
    const maxQ = Math.max(1, ...questions.map((q) => q.count), 1);
    const upgrade = chat?.upgradeLabel || gate("ai_calendar_chat")?.upgradeLabel || "Business";

    if (!allowed) {
      return `
        <section class="card ai-chat-hero">
          <div class="card-h-row">
            ${cardTitle(icons.chat, "Chat for Your Calendar")}
            <em class="pill pill-ac">BETA</em>
          </div>
          <p class="lead">Natural answers trained on your live events, hours, and open slots — plus owner analytics.</p>
        </section>
        <section class="card chat-lock">
          <div class="chat-lock-body">
            <div class="chat-lock-icon">${icons.crown}</div>
            <h3>Business & Agency only</h3>
            <p>You’re on ${escapeHtml(state.bootstrap.entitlements.label)}. Upgrade to unlock visitor chat, graphs, and conversation analytics for site owners.</p>
            <a class="btn btn-primary btn-block" href="${upgradeUrl()}" target="_blank" rel="noreferrer">${iconLabel(icons.spark, `Upgrade to ${escapeHtml(upgrade)}`)}</a>
          </div>
          <div class="chat-lock-preview" aria-hidden="true">
            <div class="stats stats-compact blurish">
              <div class="stat"><div class="top"><span class="label">Sessions 7d</span></div><b>—</b></div>
              <div class="stat"><div class="top"><span class="label">Questions</span></div><b>—</b></div>
            </div>
            <div class="chat-mini-chart blurish">
              ${Array.from({ length: 10 })
                .map((_, i) => `<i style="height:${20 + ((i * 17) % 60)}%"></i>`)
                .join("")}
            </div>
          </div>
        </section>
      `;
    }

    return `
      <section class="card ai-chat-hero">
        <div class="card-h-row">
          ${cardTitle(icons.chat, "Chat for Your Calendar")}
          <em class="pill pill-ac">BETA</em>
        </div>
        <p class="lead">Natural answers from your calendar — events, hours, and open times.</p>
        <label class="toggle-row">
          <input type="checkbox" id="chatEnabled" ${chat?.enabled ? "checked" : ""} />
          <span>${chat?.enabled ? "Chat live on booking widget" : "Chat is off"}</span>
        </label>
        <a class="link-quiet" href="${api.APP_URL}/book/${escapeHtml(state.bootstrap.site.publicKey)}" target="_blank" rel="noreferrer">Preview visitor chat →</a>
      </section>
      <section class="card">
        <div class="stats stats-compact">
          <div class="stat"><div class="top"><span class="label">Sessions 7d</span></div><b>${t?.sessions7 ?? 0}</b></div>
          <div class="stat"><div class="top"><span class="label">Questions 7d</span></div><b>${t?.messages7 ?? 0}</b></div>
          <div class="stat"><div class="top"><span class="label">Avg depth</span></div><b>${t?.avgMessagesPerSession ?? 0}</b></div>
          <div class="stat"><div class="top"><span class="label">All time</span></div><b>${t?.sessionsAll ?? 0}</b></div>
        </div>
        <div class="chat-mini-chart" title="Last 14 days">
          ${daily
            .map((d) => {
              const h = Math.max(8, (Math.max(d.sessions, d.questions) / maxDaily) * 100);
              return `<i style="height:${h}%" title="${escapeHtml(d.label)}: ${d.sessions} sessions / ${d.questions} questions"></i>`;
            })
            .join("")}
        </div>
        <button type="button" class="btn btn-sm btn-block" id="refreshChat" style="margin-top:8px">${iconLabel(icons.zap, "Refresh analytics")}</button>
      </section>
      <section class="card">
        ${cardTitle(icons.spark, "Popular questions")}
        ${
          questions.length
            ? `<div class="chat-bars">
          ${questions
            .slice(0, 6)
            .map(
              (q) => `<div class="chat-bar">
              <div class="chat-bar-meta"><b>${escapeHtml(q.question)}</b><span>${q.count}</span></div>
              <i style="width:${Math.max(10, (q.count / maxQ) * 100)}%"></i>
            </div>`,
            )
            .join("")}
        </div>`
            : `<div class="empty">No visitor questions yet.</div>`
        }
      </section>
      <section class="card">
        ${cardTitle(icons.users, "Recent chats")}
        <p class="lead" style="margin-top:0">Latest 5 visitor threads</p>
        ${
          sessions.length
            ? `<div class="home-list">
          ${sessions
            .map(
              (s) => `<div class="home-booking">
              <div class="mini-meta">
                <b>${escapeHtml(s.preview)}</b>
                <small>${escapeHtml(s.visitorKey)} · ${s.messageCount} msgs · ${escapeHtml(s.source)}</small>
              </div>
            </div>`,
            )
            .join("")}
        </div>`
            : `<div class="empty">Chats will appear when visitors use Ask Chat.</div>`
        }
        <a class="btn btn-quiet btn-block" style="margin-top:8px" href="${api.APP_URL}/dashboard/ai-chat" target="_blank" rel="noreferrer">${iconLabel(icons.external, "Open full analytics")}</a>
      </section>
    `;
  }

  function viewEvents() {
    if (!state.services.length) {
      return `<section class="card">
        ${cardTitle(icons.calendar, "Events")}
        <div class="empty">No events yet.</div>
        <button type="button" class="btn btn-primary btn-block" id="gotoCreate">${iconLabel(icons.plus, "New event")}</button>
      </section>`;
    }
    return `<section class="card">
      <div class="card-h-row">
        ${cardTitle(icons.calendar, "Events")}
        <a class="btn btn-sm btn-soft" href="${api.APP_URL}/dashboard/services" target="_blank" rel="noreferrer">${iconLabel(icons.external, "Full report")}</a>
      </div>
      <p class="lead">Edit events & revenue reports live in the dashboard.</p>
      <div class="list">
        ${state.services
          .map(
            (s) => `<div class="row">
            <div class="swatch" style="background:${s.color || "var(--ac)"}"></div>
            <div class="meta">
              <b>${escapeHtml(s.name)}${s.featured ? '<span class="pill">Featured</span>' : ""}${!s.active ? '<span class="pill">Off</span>' : ""}</b>
              <small>${s.durationMin} min · ${escapeHtml(s.category || s.locationType)}</small>
            </div>
            <div class="price">${s.priceCents > 0 ? money(s.priceCents, state.bootstrap?.site.currency) : ""}</div>
            <a class="btn btn-sm" href="${api.APP_URL}/dashboard/services" target="_blank" rel="noreferrer" title="Edit & report">Report</a>
            <button type="button" class="btn btn-icon btn-ghost" data-del="${s.id}" title="Delete"><span class="ico">${icons.trash}</span></button>
          </div>`,
          )
          .join("")}
      </div>
      <a class="btn btn-primary btn-block" style="margin-top:8px" href="${api.APP_URL}/dashboard/services" target="_blank" rel="noreferrer">${iconLabel(icons.grid, "Open dashboard events & reports")}</a>
    </section>`;
  }

  function viewCreate() {
    const lim = state.bootstrap?.entitlements.eventsLimit;
    const atLimit = lim != null && state.services.length >= lim;
    const aiOk = Boolean(gate("ai_descriptions")?.allowed) && !atLimit;
    const pay = state.bootstrap?.payments;
    const stripeReady = Boolean(pay?.canChargePaidEvents ?? (pay?.connected && pay?.chargesEnabled));
    const paySetup = pay?.setupUrl || `${api.APP_URL}/dashboard/payments`;
    return `<section class="card">
      ${cardTitle(icons.plus, "Create event")}
      <p class="lead">Title, AI copy, and booking rules.</p>
      ${atLimit ? upgradeLock("events", "Event limit") : ""}
      ${
        !stripeReady
          ? `<div class="notice notice-warn">
          <b>Paid events need Stripe.</b> Free events (price 0) are fine. To charge customers, <a href="${escapeHtml(paySetup)}" target="_blank" rel="noreferrer">connect Stripe first</a>.
        </div>`
          : ""
      }
      <form id="eventForm">
        <label class="field"><span>Title</span><input name="name" required maxlength="120" placeholder="30-minute consultation" ${atLimit ? "disabled" : ""} /></label>
        <label class="field"><span>Description</span>
          <textarea name="description" placeholder="Briefly describe this offering…" ${atLimit ? "disabled" : ""}></textarea>
          <div class="desc-tools">
            <button type="button" class="btn btn-primary btn-sm" id="aiBtn" ${aiOk ? "" : "disabled"}>${iconLabel(icons.spark, "Write with AI")}</button>
            <select id="aiTone" ${aiOk ? "" : "disabled"}>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="premium">Premium</option>
              <option value="concise">Concise</option>
            </select>
            ${aiOk ? "" : upgradeLock("ai_descriptions", "AI writing")}
          </div>
        </label>
        <div class="field-row">
          <label class="field"><span>Category</span>
            <input name="category" placeholder="General" ${!gate("categories")?.allowed || atLimit ? "disabled" : ""} />
          </label>
          <label class="field"><span>Duration</span>
            <input name="durationMin" type="number" min="5" step="5" value="30" required ${atLimit ? "disabled" : ""} />
          </label>
        </div>
        ${upgradeLock("categories", "Categories")}
        <div class="field-row">
          <label class="field"><span>Price ${stripeReady ? "" : "(0 = free)"}</span>
            <input name="price" type="number" min="0" step="1" value="0" ${atLimit ? "disabled" : ""} />
            ${stripeReady ? "" : `<small class="hint">Paid prices are locked until Stripe is connected.</small>`}
          </label>
          <label class="field"><span>Location</span>
            <select name="locationType" ${!gate("online_location")?.allowed || atLimit ? "disabled" : ""}>
              <option value="onsite">On site</option>
              <option value="online">Online</option>
              <option value="phone">Phone</option>
              <option value="hybrid">Hybrid</option>
            </select>
          </label>
        </div>
        ${upgradeLock("online_location", "Online / phone")}
        <details>
          <summary>Advanced</summary>
          <div class="field-row">
            <label class="field"><span>Buffer before</span><input name="bufferBeforeMin" type="number" min="0" value="0" ${!gate("buffers")?.allowed || atLimit ? "disabled" : ""} /></label>
            <label class="field"><span>Buffer after</span><input name="bufferAfterMin" type="number" min="0" value="15" ${!gate("buffers")?.allowed || atLimit ? "disabled" : ""} /></label>
          </div>
          ${upgradeLock("buffers", "Buffers")}
          <div class="field-row">
            <label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" value="1" ${!gate("capacity")?.allowed || atLimit ? "disabled" : ""} /></label>
            <label class="field"><span>Color</span><input name="color" type="color" value="${state.bootstrap?.site.accent || "#f5a000"}" ${atLimit ? "disabled" : ""} /></label>
          </div>
          ${upgradeLock("capacity", "Capacity")}
          <label class="inline-check">
            <input name="featured" type="checkbox" ${!gate("featured_events")?.allowed || atLimit ? "disabled" : ""} />
            <span>Featured on widget</span>
          </label>
          ${upgradeLock("featured_events", "Featured")}
        </details>
        <button type="submit" class="btn btn-primary btn-block" style="margin-top:4px" ${atLimit ? "disabled" : ""}>${iconLabel(icons.check, "Save event")}</button>
      </form>
    </section>`;
  }

  function viewTheme() {
    if (!state.bootstrap) {
      return `<section class="card">
        ${cardTitle(icons.palette, "Widget theme")}
        <p class="lead">Connect a site to pick a booking theme.</p>
      </section>`;
    }
    const current = state.branding?.themeKey || state.bootstrap.site.themeKey;
    const accent = state.branding?.accent || state.bootstrap.site.accent;
    const ink =
      state.branding?.inkColor ||
      state.themes.find((t) => t.key === current)?.ink ||
      "#0f1b2d";
    const radius = state.branding?.radius ?? 14;
    const themes =
      state.themes.length > 0
        ? state.themes
        : [
            {
              key: current,
              name: current,
              bg: "#ffffff",
              panel: "#ffffff",
              ink,
              line: "#e1e6ee",
              accent,
              radius,
              font: "Manrope",
              button: "solid" as const,
            },
          ];
    return `<section class="card">
      ${cardTitle(icons.palette, "Widget theme")}
      <div class="theme-live" id="themeLive" style="--live-bg:${escapeHtml(themes.find((t) => t.key === current)?.bg || "#fff")};--live-ink:${escapeHtml(ink)};--live-ac:${escapeHtml(accent)};--live-line:${escapeHtml(themes.find((t) => t.key === current)?.line || "#e1e6ee")};--live-r:${radius}px">
        <div class="theme-live-card">
          <b>Sample booking</b>
          <small>Your accent & text colors</small>
          <button type="button" class="theme-live-btn">Book now</button>
        </div>
      </div>
      <div class="theme-grid">
        ${themes
          .map((t) => {
            const selected = t.key === current;
            return `<button type="button" class="theme-card" data-theme-key="${escapeHtml(t.key)}" aria-pressed="${selected}">
              <i class="preview" style="background:linear-gradient(${t.accent},${t.accent}) 10px 22px / 28px 7px no-repeat,linear-gradient(${t.ink},${t.ink}) 10px 10px / 48% 5px no-repeat,${t.bg};border-color:${t.line}"></i>
              <b>${escapeHtml(t.name)}</b>
              <small>${escapeHtml(t.font)} · ${t.radius}px</small>
            </button>`;
          })
          .join("")}
      </div>
      <div class="color-pair">
        <label class="color-field"><span>Accent</span>
          <input type="color" id="brandAccent" value="${escapeHtml(accent)}" />
        </label>
        <label class="color-field"><span>Text color</span>
          <input type="color" id="brandInk" value="${escapeHtml(ink)}" />
        </label>
      </div>
      <label class="field" style="margin-top:8px"><span>Radius · <span id="radiusVal">${radius}</span>px</span>
        <input type="range" id="brandRadius" min="0" max="28" value="${radius}" />
      </label>
      <label class="field"><span>How it opens</span>
        <select id="brandLayout">
          <option value="INLINE" ${state.branding?.layout === "INLINE" || !state.branding?.layout ? "selected" : ""}>Inline</option>
          <option value="POPUP" ${state.branding?.layout === "POPUP" ? "selected" : ""}>Popup</option>
          <option value="FLOATING" ${state.branding?.layout === "FLOATING" ? "selected" : ""}>Floating button</option>
        </select>
      </label>
      <button type="button" class="btn btn-primary btn-block" id="saveBranding">
        ${iconLabel(icons.check, "Save branding")}
      </button>
    </section>`;
  }

  function viewTools() {
    const locked = !gate("import_export")?.allowed;
    const days = state.availability?.days || [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const blocks = state.availability?.timeOff || [];
    const today = new Date().toISOString().slice(0, 10);
    return `
    <section class="card">
      ${cardTitle(icons.calendar, "Hours & blocked slots")}
      <p class="lead">Enable days, set open hours, or block a date/time range so customers can’t book it.</p>
      <div class="hours-list">
        ${
          days.length
            ? days
                .map(
                  (d) => `<label class="hours-row">
            <input type="checkbox" data-day="${d.dayOfWeek}" data-hours-enabled ${d.enabled ? "checked" : ""} />
            <b>${dayNames[d.dayOfWeek] || d.dayOfWeek}</b>
            <input type="time" data-day="${d.dayOfWeek}" data-hours-start value="${escapeHtml(d.startTime)}" ${d.enabled ? "" : "disabled"} />
            <span class="muted">to</span>
            <input type="time" data-day="${d.dayOfWeek}" data-hours-end value="${escapeHtml(d.endTime)}" ${d.enabled ? "" : "disabled"} />
          </label>`,
                )
                .join("")
            : `<div class="empty">Connect a site to edit hours.</div>`
        }
      </div>
      <button type="button" class="btn btn-primary btn-block" id="saveHours" ${days.length ? "" : "disabled"} style="margin-top:8px">${iconLabel(icons.check, "Save weekly hours")}</button>
      <div class="block-form">
        <div class="eyebrow" style="margin-top:12px">Block specific range</div>
        <label class="field"><span>Date</span><input type="date" id="blockDate" value="${today}" /></label>
        <div class="tools-row">
          <label class="field" style="flex:1"><span>From</span><input type="time" id="blockStart" value="12:00" /></label>
          <label class="field" style="flex:1"><span>To</span><input type="time" id="blockEnd" value="13:00" /></label>
        </div>
        <label class="toggle-row" style="margin-top:0"><input type="checkbox" id="blockAllDay" /><span>Entire day</span></label>
        <label class="field"><span>Reason</span><input id="blockReason" placeholder="Lunch, holiday…" maxlength="200" /></label>
        <button type="button" class="btn btn-quiet btn-block" id="addBlock">${iconLabel(icons.plus, "Block this range")}</button>
      </div>
      ${
        blocks.length
          ? `<div class="home-list" style="margin-top:10px">
        ${blocks
          .slice(0, 8)
          .map((t) => {
            const label = new Date(t.startsAt).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            });
            return `<div class="home-booking">
            <div class="mini-meta">
              <b>${escapeHtml(t.reason || "Blocked")}</b>
              <small>${escapeHtml(label)} · disabled</small>
            </div>
            <button type="button" class="btn btn-sm" data-unblock="${escapeHtml(t.id)}">Enable</button>
          </div>`;
          })
          .join("")}
      </div>`
          : `<div class="empty" style="margin-top:8px">No blocked ranges yet.</div>`
      }
      <a class="link-quiet" href="${api.APP_URL}/dashboard/availability" target="_blank" rel="noreferrer">Open full availability →</a>
    </section>
    <section class="card">
      ${cardTitle(icons.upload, "Import & export")}
      <p class="lead">JSON / CSV for agency clones.</p>
      ${upgradeLock("import_export", "Import / export")}
      <div class="tools-row">
        <button type="button" class="btn btn-sm" id="exportJson" ${locked ? "disabled" : ""}>${iconLabel(icons.download, "JSON")}</button>
        <button type="button" class="btn btn-sm" id="exportCsv" ${locked ? "disabled" : ""}>${iconLabel(icons.download, "CSV")}</button>
      </div>
      <label class="dropzone" id="dropzone" ${locked ? 'aria-disabled="true"' : ""}>
        <input type="file" id="importFile" accept="application/json,.json" ${locked ? "disabled" : ""} />
        <span class="dz-icon"><span class="ico">${icons.upload}</span></span>
        <strong>Drop JSON or browse</strong>
        <small>Merge events into this site</small>
      </label>
    </section>
    <section class="card">
      ${cardTitle(icons.layout, "Canvas")}
      <p class="lead">Insert a live booking iframe.</p>
      <div class="seg" id="canvasWideSeg">
        <button type="button" class="btn ${!state.canvasWide ? "btn-primary" : ""}" data-canvas-wide="0">${iconLabel(icons.phone, "Mobile width")}</button>
        <button type="button" class="btn ${state.canvasWide ? "btn-primary" : ""}" data-canvas-wide="1">${iconLabel(icons.expand, "Full width")}</button>
      </div>
      <button type="button" class="btn btn-quiet btn-block" id="embedBtn2" ${!state.canDesign ? "disabled" : ""} style="margin-top:8px">
        ${iconLabel(icons.layout, state.canDesign ? "Add booking to page" : "Switch to Design mode first")}
      </button>
      <button type="button" class="btn btn-block" id="removeEmbedsBtn" style="margin-top:8px">${iconLabel(icons.trash, "Remove widgets from this page")}</button>
      <button type="button" class="btn btn-block" id="disconnectBtn" style="margin-top:6px">${iconLabel(icons.alert, "Disconnect & clean uninstall")}</button>
      <p class="lead" style="margin-top:8px">Removes booking widgets on this page, deletes Slotwise Custom Code from the site (Marketplace requirement), turns bookings off, and revokes access. Then <b>Publish</b> so the live site updates. Check other pages for leftover embeds.</p>
    </section>`;
  }

  function viewSettings() {
    return `<section class="card">
      ${cardTitle(icons.settings, "Appearance")}
      <p class="lead">Panel chrome (independent of your site branding).</p>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button type="button" class="btn ${state.theme === "light" ? "btn-primary" : ""}" id="lightBtn">${iconLabel(icons.sun, "Light")}</button>
        <button type="button" class="btn ${state.theme === "dark" ? "btn-primary" : ""}" id="darkBtn">${iconLabel(icons.moon, "Dark")}</button>
      </div>
      <p class="lead" style="margin-top:10px">Panel size</p>
      <div style="display:flex;gap:5px;flex-wrap:wrap">
        <button type="button" class="btn ${state.panelMode === "mobile" ? "btn-primary" : ""}" id="panelMobile">${iconLabel(icons.phone, "Mobile")}</button>
        <button type="button" class="btn ${state.panelMode === "full" ? "btn-primary" : ""}" id="panelFull">${iconLabel(icons.expand, "Full screen")}</button>
      </div>
    </section>
    <section class="card">
      ${cardTitle(icons.users, "Site")}
      <p class="lead">Key <code style="font-size:10px">${escapeHtml(state.bootstrap?.site.publicKey || "—")}</code></p>
      <div class="actions-stack">
        <a class="btn btn-soft" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer">${iconLabel(icons.grid, "Dashboard")}</a>
        <a class="btn" href="${api.APP_URL}/dashboard/plans" target="_blank" rel="noreferrer">${iconLabel(icons.zap, "Manage plan")}</a>
      </div>
    </section>`;
  }

  function escapeHtml(s: string) {
    return s
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function wireDropzone() {
    const dz = root.querySelector("#dropzone") as HTMLElement | null;
    const input = root.querySelector("#importFile") as HTMLInputElement | null;
    if (!dz || !input || input.disabled) return;

    const setDrag = (on: boolean) => dz.classList.toggle("is-drag", on);
    ["dragenter", "dragover"].forEach((ev) => {
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        setDrag(true);
      });
    });
    ["dragleave", "drop"].forEach((ev) => {
      dz.addEventListener(ev, (e) => {
        e.preventDefault();
        setDrag(false);
      });
    });
    dz.addEventListener("drop", (e) => {
      const file = (e as DragEvent).dataTransfer?.files?.[0];
      if (file) void handleImportFile(file);
    });
  }

  async function handleImportFile(file: File) {
    if (!state.bootstrap) return;
    if (!gate("import_export")?.allowed) {
      setStatus("Import / export requires Pro", false);
      return;
    }
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as { services?: api.Service[] } | api.Service[];
      const services = Array.isArray(parsed) ? parsed : parsed.services || [];
      const res = await api.importServices({
        webflowSiteId: state.webflowSiteId,
        publicKey: state.bootstrap.site.publicKey,
        services,
        mode: "merge",
      });
      await refresh();
      setStatus(`Imported ${res.created} events`);
      state.tab = "events";
      void render();
    } catch (e) {
      setStatus(e instanceof Error ? e.message : "Import failed", false);
    }
  }

  async function render() {
    if (state.loading) {
      shell(
        `<section class="card">${brandLoader("Loading Slotwise…", state.bootstrap?.site.accent || "var(--ac)")}</section>`,
      );
      return;
    }

    const body =
      state.tab === "home"
        ? viewHome()
        : state.tab === "events"
          ? viewEvents()
          : state.tab === "create"
            ? viewCreate()
            : state.tab === "theme"
              ? viewTheme()
              : state.tab === "chat"
                ? viewChat()
                : state.tab === "tools"
                  ? viewTools()
                  : viewSettings();
    shell(body);

    root.querySelector("#embedBtn")?.addEventListener("click", () => void onEmbed());
    root.querySelector("#embedBtn2")?.addEventListener("click", () => void onEmbed());
    root.querySelector("#removeEmbedsBtn")?.addEventListener("click", () => {
      void (async () => {
        try {
          setStatus("Removing booking widgets…");
          const n = await removeSlotwiseEmbedsFromCanvas();
          setStatus(n ? `Removed ${n} widget(s) — publish the site` : "No Slotwise widgets found on this page");
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Could not remove widgets", false);
        }
      })();
    });
    root.querySelector("#disconnectBtn")?.addEventListener("click", () => {
      void (async () => {
        if (!state.bootstrap) return;
        try {
          // Marketplace-compliant order: remove canvas embeds first, then purge
          // App-applied Custom Code via Data API while the OAuth token still works.
          setStatus("Removing booking widgets from this page…");
          let removed = 0;
          try {
            removed = await removeSlotwiseEmbedsFromCanvas();
          } catch {
            /* Designer mode may block — still continue API cleanup */
          }
          setStatus("Removing Slotwise scripts from the site…");
          const res = await api.uninstallWebflow({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
          });
          state.bootstrap = {
            uninstalled: true,
            site: {
              id: state.bootstrap.site.id,
              publicKey: state.bootstrap.site.publicKey,
              name: state.bootstrap.site.name,
              webflowSiteId: state.bootstrap.site.webflowSiteId,
            },
          } as api.Bootstrap;
          setStatus(
            res.message ||
              `Disconnected. Removed ${removed} canvas widget(s). Publish the site so script removal goes live.`,
          );
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Disconnect failed", false);
        }
      })();
    });
    root.querySelector("#installBtn")?.addEventListener("click", () => {
      // New browser window — leave Designer / extension panel open
      window.open(
        `${api.APP_URL}/api/webflow/install`,
        "slotwise-webflow-auth",
        "noopener,noreferrer,width=520,height=720",
      );
      setStatus("Authorize in the new window — Designer stays open");
    });
    root.querySelector("#gotoCreate")?.addEventListener("click", () => {
      state.tab = "create";
      void render();
    });
    root.querySelector("#gotoEvents")?.addEventListener("click", () => {
      state.tab = "events";
      void render();
    });
    root.querySelector("#gotoChat")?.addEventListener("click", () => {
      state.tab = "chat";
      void render();
    });
    root.querySelector("#markInboxRead")?.addEventListener("click", () => {
      void (async () => {
        if (!state.bootstrap) return;
        try {
          state.inbox = await api.markInboxRead({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
            all: true,
          });
          setStatus("Notifications marked read");
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Could not update inbox", false);
        }
      })();
    });
    root.querySelector("#refreshChat")?.addEventListener("click", () => {
      void (async () => {
        try {
          setStatus("Refreshing chat analytics…");
          await loadCalendarChat();
          setStatus("Chat analytics updated");
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Refresh failed", false);
        }
      })();
    });

    root.querySelector("#saveHours")?.addEventListener("click", () => {
      void (async () => {
        if (!state.bootstrap || !state.availability) return;
        const days = state.availability.days.map((d) => {
          const enabledEl = root.querySelector(
            `[data-hours-enabled][data-day="${d.dayOfWeek}"]`,
          ) as HTMLInputElement | null;
          const startEl = root.querySelector(
            `[data-hours-start][data-day="${d.dayOfWeek}"]`,
          ) as HTMLInputElement | null;
          const endEl = root.querySelector(
            `[data-hours-end][data-day="${d.dayOfWeek}"]`,
          ) as HTMLInputElement | null;
          return {
            dayOfWeek: d.dayOfWeek,
            enabled: Boolean(enabledEl?.checked),
            startTime: startEl?.value || d.startTime,
            endTime: endEl?.value || d.endTime,
          };
        });
        try {
          setStatus("Saving hours…");
          const res = await api.saveAvailabilityHours({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
            days,
          });
          if (state.availability) {
            state.availability = { ...state.availability, days: res.days, timezone: res.timezone };
          }
          setStatus("Weekly hours saved");
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Could not save hours", false);
        }
      })();
    });

    root.querySelector("#addBlock")?.addEventListener("click", () => {
      void (async () => {
        if (!state.bootstrap) return;
        const date = (root.querySelector("#blockDate") as HTMLInputElement | null)?.value;
        const startTime = (root.querySelector("#blockStart") as HTMLInputElement | null)?.value || "12:00";
        const endTime = (root.querySelector("#blockEnd") as HTMLInputElement | null)?.value || "13:00";
        const reason = (root.querySelector("#blockReason") as HTMLInputElement | null)?.value || "";
        const allDay = Boolean((root.querySelector("#blockAllDay") as HTMLInputElement | null)?.checked);
        if (!date) return setStatus("Pick a date to block", false);
        try {
          setStatus("Blocking range…");
          await api.createAvailabilityBlock({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
            date,
            startTime,
            endTime,
            reason,
            allDay,
          });
          await loadAvailability();
          setStatus("Slots blocked for that range");
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Could not block range", false);
        }
      })();
    });

    root.querySelectorAll("[data-unblock]").forEach((btn) => {
      btn.addEventListener("click", () => {
        void (async () => {
          if (!state.bootstrap) return;
          const id = (btn as HTMLElement).dataset.unblock;
          if (!id) return;
          try {
            setStatus("Re-enabling slots…");
            await api.deleteAvailabilityBlock({
              id,
              webflowSiteId: state.webflowSiteId,
              publicKey: state.bootstrap.site.publicKey,
            });
            await loadAvailability();
            setStatus("Slots enabled again");
            void render();
          } catch (e) {
            setStatus(e instanceof Error ? e.message : "Could not enable slots", false);
          }
        })();
      });
    });

    root.querySelectorAll("[data-hours-enabled]").forEach((el) => {
      el.addEventListener("change", () => {
        const day = Number((el as HTMLElement).dataset.day);
        const on = (el as HTMLInputElement).checked;
        root.querySelectorAll(`[data-day="${day}"]`).forEach((input) => {
          if ((input as HTMLElement).hasAttribute("data-hours-enabled")) return;
          (input as HTMLInputElement).disabled = !on;
        });
      });
    });
    root.querySelector("#chatEnabled")?.addEventListener("change", (ev) => {
      const enabled = (ev.target as HTMLInputElement).checked;
      void (async () => {
        if (!state.bootstrap) return;
        try {
          setStatus(enabled ? "Enabling chat…" : "Turning chat off…");
          state.calendarChat = await api.patchCalendarChat({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
            enabled,
          });
          setStatus(enabled ? "Calendar chat is live" : "Calendar chat disabled");
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Could not update chat", false);
          void render();
        }
      })();
    });
    root.querySelector("#lightBtn")?.addEventListener("click", () => {
      setTheme("light");
      void render();
    });
    root.querySelector("#darkBtn")?.addEventListener("click", () => {
      setTheme("dark");
      void render();
    });

    const radiusEl = root.querySelector("#brandRadius") as HTMLInputElement | null;
    const radiusVal = root.querySelector("#radiusVal");
    const accentElLive = root.querySelector("#brandAccent") as HTMLInputElement | null;
    const inkElLive = root.querySelector("#brandInk") as HTMLInputElement | null;
    const themeLive = root.querySelector("#themeLive") as HTMLElement | null;
    const syncThemeLive = () => {
      if (!themeLive) return;
      if (accentElLive?.value) themeLive.style.setProperty("--live-ac", accentElLive.value);
      if (inkElLive?.value) themeLive.style.setProperty("--live-ink", inkElLive.value);
      if (radiusEl?.value) themeLive.style.setProperty("--live-r", `${radiusEl.value}px`);
    };
    radiusEl?.addEventListener("input", () => {
      if (radiusVal) radiusVal.textContent = radiusEl.value;
      syncThemeLive();
    });
    accentElLive?.addEventListener("input", syncThemeLive);
    inkElLive?.addEventListener("input", syncThemeLive);

    root.querySelectorAll("[data-theme-key]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (!state.bootstrap) return;
        const themeKey = (btn as HTMLElement).dataset.themeKey!;
        const picked = state.themes.find((t) => t.key === themeKey);
        try {
          setStatus("Saving theme…");
          const res = await api.patchBranding({
            webflowSiteId: state.webflowSiteId,
            publicKey: state.bootstrap.site.publicKey,
            themeKey,
            accent: picked?.accent,
            inkColor: picked?.ink,
            radius: picked?.radius,
            font: picked?.font,
          });
          state.branding = res.branding;
          state.bootstrap.site.themeKey = res.branding.themeKey;
          state.bootstrap.site.accent = res.branding.accent;
          applyBrandColors(res.branding.accent, res.branding.inkColor);
          setStatus("Theme saved · " + (picked?.name || themeKey));
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Theme save failed", false);
        }
      });
    });

    const accentElLive2 = root.querySelector("#brandAccent") as HTMLInputElement | null;
    const inkElLive2 = root.querySelector("#brandInk") as HTMLInputElement | null;
    accentElLive2?.addEventListener("input", () => {
      applyBrandColors(accentElLive2.value, inkElLive2?.value);
      syncThemeLive();
    });
    inkElLive2?.addEventListener("input", () => {
      applyBrandColors(accentElLive2?.value, inkElLive2.value);
      syncThemeLive();
    });

    root.querySelector("#saveBranding")?.addEventListener("click", async () => {
      if (!state.bootstrap) return;
      const accentEl = root.querySelector("#brandAccent") as HTMLInputElement | null;
      const inkEl = root.querySelector("#brandInk") as HTMLInputElement | null;
      const radiusInput = root.querySelector("#brandRadius") as HTMLInputElement | null;
      const layoutEl = root.querySelector("#brandLayout") as HTMLSelectElement | null;
      try {
        setStatus("Saving branding…");
        const res = await api.patchBranding({
          webflowSiteId: state.webflowSiteId,
          publicKey: state.bootstrap.site.publicKey,
          themeKey: state.branding?.themeKey || state.bootstrap.site.themeKey,
          accent: accentEl?.value,
          inkColor: inkEl?.value,
          radius: radiusInput ? Number(radiusInput.value) : undefined,
          layout: (layoutEl?.value as "INLINE" | "POPUP" | "FLOATING") || undefined,
        });
        state.branding = res.branding;
        state.bootstrap.site.accent = res.branding.accent;
        applyBrandColors(res.branding.accent, res.branding.inkColor);
        setStatus("Branding saved");
        void render();
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Branding save failed", false);
      }
    });

    root.querySelectorAll("[data-booking-id]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.selectedBookingId = (btn as HTMLElement).dataset.bookingId || null;
        void render();
      });
    });
    const closeDrawer = () => {
      state.selectedBookingId = null;
      void render();
    };
    root.querySelector("#closeBookingDrawer")?.addEventListener("click", closeDrawer);
    root.querySelector("#closeBookingDrawer2")?.addEventListener("click", closeDrawer);
    root.querySelector("#closeBookingDrawer3")?.addEventListener("click", closeDrawer);

    root.querySelector("#panelMobile")?.addEventListener("click", () => {
      setPanelMode("mobile");
      void render();
    });
    root.querySelector("#panelFull")?.addEventListener("click", () => {
      setPanelMode("full");
      void render();
    });
    root.querySelectorAll("[data-canvas-wide]").forEach((btn) => {
      btn.addEventListener("click", () => {
        state.canvasWide = (btn as HTMLElement).dataset.canvasWide === "1";
        localStorage.setItem(CANVAS_WIDE_KEY, state.canvasWide ? "1" : "0");
        setStatus(state.canvasWide ? "Canvas embed: full width" : "Canvas embed: mobile width");
        void render();
      });
    });

    root.querySelectorAll("[data-del]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        const id = (btn as HTMLElement).dataset.del!;
        try {
          await api.deleteService(id);
          await refresh();
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Delete failed", false);
        }
      });
    });

    root.querySelector("#aiBtn")?.addEventListener("click", async () => {
      if (!state.bootstrap) return;
      if (!gate("ai_descriptions")?.allowed) {
        setStatus("AI writing is a Pro feature", false);
        return;
      }
      const form = root.querySelector("#eventForm") as HTMLFormElement;
      const title = (form.elements.namedItem("name") as HTMLInputElement).value;
      const category = (form.elements.namedItem("category") as HTMLInputElement).value;
      const durationMin = Number((form.elements.namedItem("durationMin") as HTMLInputElement).value);
      const locationType = (form.elements.namedItem("locationType") as HTMLSelectElement).value;
      const tone = (root.querySelector("#aiTone") as HTMLSelectElement).value;
      try {
        setStatus("Writing…");
        const res = await api.aiDescription({
          webflowSiteId: state.webflowSiteId,
          publicKey: state.bootstrap.site.publicKey,
          title,
          category,
          durationMin,
          locationType,
          tone,
        });
        (form.elements.namedItem("description") as HTMLTextAreaElement).value = res.description;
        setStatus(`Description ready (${res.source})`);
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "AI failed", false);
      }
    });

    root.querySelector("#eventForm")?.addEventListener("submit", async (ev) => {
      ev.preventDefault();
      if (!state.bootstrap) return;
      const form = ev.target as HTMLFormElement;
      const fd = new FormData(form);
      const price = Number(fd.get("price") || 0);
      const pay = state.bootstrap.payments;
      const stripeReady = Boolean(pay?.canChargePaidEvents ?? (pay?.connected && pay?.chargesEnabled));
      if (price > 0 && !stripeReady) {
        setStatus("Connect Stripe before setting a paid price — free events (0) are OK", false);
        return;
      }
      try {
        setStatus("Saving…");
        await api.createService({
          webflowSiteId: state.webflowSiteId,
          publicKey: state.bootstrap.site.publicKey,
          name: String(fd.get("name") || ""),
          description: String(fd.get("description") || "") || null,
          category: String(fd.get("category") || "") || null,
          durationMin: Number(fd.get("durationMin") || 30),
          priceCents: Math.round(price * 100),
          locationType: String(fd.get("locationType") || "onsite"),
          bufferBeforeMin: Number(fd.get("bufferBeforeMin") || 0),
          bufferAfterMin: Number(fd.get("bufferAfterMin") || 15),
          capacity: Number(fd.get("capacity") || 1),
          color: String(fd.get("color") || "#f5a000"),
          featured: Boolean(fd.get("featured")),
        });
        await refresh();
        state.tab = "events";
        setStatus("Event saved");
        void render();
        await notify("Success", "Event created");
      } catch (e) {
        setStatus(e instanceof Error ? e.message : "Save failed", false);
      }
    });

    const openExport = (format: "json" | "csv") => {
      if (!state.bootstrap || !gate("import_export")?.allowed) {
        setStatus("Import / export requires Pro", false);
        return;
      }
      window.open(
        api.exportUrl({
          webflowSiteId: state.webflowSiteId,
          publicKey: state.bootstrap.site.publicKey,
          format,
        }),
        "_blank",
        "noopener,noreferrer",
      );
    };
    root.querySelector("#exportJson")?.addEventListener("click", () => openExport("json"));
    root.querySelector("#exportCsv")?.addEventListener("click", () => openExport("csv"));

    wireDropzone();
    root.querySelector("#importFile")?.addEventListener("change", async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (file) await handleImportFile(file);
    });
  }

  shell(`<section class="card">${brandLoader("Loading Slotwise…")}</section>`);
  subscribeMode((mode) => {
    state.mode = mode;
    void canDesignOnCanvas().then((c) => {
      state.canDesign = c.ok;
      void render();
    });
  });
  await refresh();
  await render();

  // Keep plan entitlements + branding in sync with Dashboard (Pro unlocks, theme ink, etc.)
  window.setInterval(() => {
    if (!state.bootstrap) return;
    void (async () => {
      try {
        const prevTier = state.bootstrap?.plan.tier;
        const prevInk = state.branding?.inkColor;
        const prevAccent = state.branding?.accent;
        await refresh();
        const tierChanged = prevTier && prevTier !== state.bootstrap?.plan.tier;
        const brandChanged =
          prevInk !== state.branding?.inkColor || prevAccent !== state.branding?.accent;
        if (tierChanged || brandChanged) await render();
      } catch {
        // ignore background refresh errors
      }
    })();
  }, 8000);

  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "visible") {
      void refresh().then(() => render());
    }
  });
}
