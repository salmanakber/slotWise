import * as api from "./api";
import {
  canDesignOnCanvas,
  detectWebflowSiteId,
  getDesignerMode,
  insertBookingIframe,
  notify,
  setExtensionLarge,
  subscribeMode,
} from "./canvas";
import { iconLabel, icons } from "./icons";
import { brandLoader } from "./loader";

type Tab = "home" | "events" | "create" | "theme" | "tools" | "settings";

const THEME_KEY = "slotwise-designer-theme";
const PANEL_MODE_KEY = "slotwise-panel-mode";
const CANVAS_WIDE_KEY = "slotwise-canvas-wide";

const TAB_META: Record<Tab, { label: string; icon: string }> = {
  home: { label: "Home", icon: icons.home },
  events: { label: "Events", icon: icons.calendar },
  create: { label: "New", icon: icons.plus },
  theme: { label: "Theme", icon: icons.palette },
  tools: { label: "Tools", icon: icons.wrench },
  settings: { label: "More", icon: icons.settings },
};

export async function boot(root: HTMLElement) {
  await setExtensionLarge();

  const state = {
    theme: (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light",
    panelMode: (localStorage.getItem(PANEL_MODE_KEY) as "mobile" | "full") || "mobile",
    canvasWide: localStorage.getItem(CANVAS_WIDE_KEY) === "1",
    tab: "home" as Tab,
    webflowSiteId: null as string | null,
    bootstrap: null as api.Bootstrap | null,
    services: [] as api.Service[],
    themes: [] as api.DesignerTheme[],
    branding: null as api.DesignerBranding | null,
    selectedBookingId: null as string | null,
    status: "",
    statusOk: true,
    busy: false,
    mode: null as string | null,
    canDesign: true,
    loading: true,
  };

  function setTheme(theme: "light" | "dark") {
    state.theme = theme;
    localStorage.setItem(THEME_KEY, theme);
    document.documentElement.dataset.theme = theme;
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

  function shell(body: string) {
    const plan = state.bootstrap?.plan.tier || "FREE";
    const name = state.bootstrap?.site.name || "Slotwise";
    const showFab = state.tab !== "create" && Boolean(state.bootstrap);
    const full = state.panelMode === "full";
    const tabs = (Object.keys(TAB_META) as Tab[]).map(tabButton).join("");
    const actions = `
      <a class="link-upgrade" href="${upgradeUrl()}" target="_blank" rel="noreferrer">Upgrade</a>
      <a class="btn btn-icon btn-soft" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer" title="Open dashboard">
        <span class="ico">${icons.grid}</span>
      </a>
      <button type="button" class="btn btn-icon btn-ghost" id="themeBtn" title="Toggle theme">
        ${state.theme === "light" ? icons.moon : icons.sun}
      </button>
      <button type="button" class="btn btn-icon btn-primary" id="publishBtn" title="Publish">
        <span class="ico">${icons.rocket}</span>
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
        themeKey: state.bootstrap.site.themeKey,
        accent: state.bootstrap.site.accent,
        inkColor: "#0f1b2d",
        radius: 14,
        font: "Manrope",
      };
      setStatus("Connected · " + state.bootstrap.site.name);
    } catch (e) {
      state.bootstrap = null;
      setStatus(e instanceof Error ? e.message : "Not connected", false);
    } finally {
      state.loading = false;
    }
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
    return `<section class="card">
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
            (s) => `<article class="home-tile">
            <i class="dot" style="background:${s.color || "var(--ac)"}"></i>
            <b>${escapeHtml(s.name)}</b>
            <small>${s.durationMin} min · ${money(s.priceCents, state.bootstrap?.site.currency)}</small>
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
    const bookings = state.bootstrap?.recentBookings || [];
    return `<section class="card">
      <div class="card-h-row">
        ${cardTitle(icons.check, "Bookings")}
        <a class="link-quiet" href="${api.APP_URL}/dashboard/bookings" target="_blank" rel="noreferrer">Open</a>
      </div>
      ${
        bookings.length
          ? `<div class="home-list">
        ${bookings
          .map(
            (b) => `<div class="home-booking">
            <div class="mini-meta">
              <b>${escapeHtml(b.customerName)}</b>
              <small>${escapeHtml(b.serviceName)} · ${escapeHtml(formatWhen(b.startsAt))}</small>
            </div>
            <div class="home-booking-actions">
              <em class="pill pill-muted">${escapeHtml(b.status)}</em>
              <button type="button" class="btn btn-sm" data-booking-id="${escapeHtml(b.id)}">Details</button>
            </div>
          </div>`,
          )
          .join("")}
      </div>`
          : `<div class="empty">No bookings yet — share your widget to get the first one.</div>`
      }
    </section>`;
  }

  function bookingDrawer() {
    const b = (state.bootstrap?.recentBookings || []).find((x) => x.id === state.selectedBookingId);
    if (!b) return "";
    const currency = b.currency || state.bootstrap?.site.currency || "USD";
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
          <div class="drawer-row"><span>Amount</span><b>${money(b.amountCents || 0, currency)}</b></div>
          <div class="drawer-row"><span>Deposit</span><b>${b.depositCents ? money(b.depositCents, currency) : "None"}</b></div>
          <div class="drawer-row"><span>Notes</span><b>${escapeHtml(b.notes?.trim() || "No notes")}</b></div>
        </div>
        <footer class="drawer-foot">
          ${b.customerEmail ? `<a class="btn btn-primary btn-block" href="mailto:${escapeHtml(b.customerEmail)}">Email customer</a>` : ""}
          <button type="button" class="btn btn-block" id="closeBookingDrawer3">Close</button>
        </footer>
      </aside>
    </div>`;
  }

  function viewHome() {
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
      ${paymentCard()}
      ${appsCard()}
      ${bookingDrawer()}
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
      ${cardTitle(icons.calendar, "Events")}
      <p class="lead">Live in your booking widget.</p>
      <div class="list">
        ${state.services
          .map(
            (s) => `<div class="row">
            <div class="swatch" style="background:${s.color || "var(--ac)"}"></div>
            <div class="meta">
              <b>${escapeHtml(s.name)}${s.featured ? '<span class="pill">Featured</span>' : ""}${!s.active ? '<span class="pill">Off</span>' : ""}</b>
              <small>${s.durationMin} min · ${escapeHtml(s.category || s.locationType)}</small>
            </div>
            <div class="price">${money(s.priceCents, state.bootstrap?.site.currency)}</div>
            <button type="button" class="btn btn-icon btn-ghost" data-del="${s.id}" title="Delete"><span class="ico">${icons.trash}</span></button>
          </div>`,
          )
          .join("")}
      </div>
    </section>`;
  }

  function viewCreate() {
    const lim = state.bootstrap?.entitlements.eventsLimit;
    const atLimit = lim != null && state.services.length >= lim;
    const aiOk = Boolean(gate("ai_descriptions")?.allowed) && !atLimit;
    return `<section class="card">
      ${cardTitle(icons.plus, "Create event")}
      <p class="lead">Title, AI copy, and booking rules.</p>
      ${atLimit ? upgradeLock("events", "Event limit") : ""}
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
          <label class="field"><span>Price</span>
            <input name="price" type="number" min="0" step="1" value="0" ${atLimit ? "disabled" : ""} />
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
      <p class="lead">Accent + text color apply to the live booking widget and Dashboard branding.</p>
      <div class="theme-live" id="themeLive" style="--live-bg:${escapeHtml(themes.find((t) => t.key === current)?.bg || "#fff")};--live-ink:${escapeHtml(ink)};--live-ac:${escapeHtml(accent)};--live-line:${escapeHtml(themes.find((t) => t.key === current)?.line || "#e1e6ee")};--live-r:${radius}px">
        <div class="theme-live-card">
          <b>Sample booking</b>
          <small>Text uses your ink color</small>
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
      <p class="lead" style="margin-top:8px">Saved branding syncs with Dashboard → Branding.</p>
    </section>`;
  }

  function viewTools() {
    const locked = !gate("import_export")?.allowed;
    return `<section class="card">
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
              : state.tab === "tools"
                ? viewTools()
                : viewSettings();
    shell(body);

    root.querySelector("#embedBtn")?.addEventListener("click", () => void onEmbed());
    root.querySelector("#embedBtn2")?.addEventListener("click", () => void onEmbed());
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
          document.documentElement.style.setProperty("--ac", res.branding.accent);
          setStatus("Theme saved · " + (picked?.name || themeKey));
          void render();
        } catch (e) {
          setStatus(e instanceof Error ? e.message : "Theme save failed", false);
        }
      });
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
        document.documentElement.style.setProperty("--ac", res.branding.accent);
        if (res.branding.inkColor) {
          document.documentElement.style.setProperty("--brand-ink", res.branding.inkColor);
        }
        setStatus("Text & accent saved · open booking page to see it live");
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
}
