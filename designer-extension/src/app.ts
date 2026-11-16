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

type Tab = "home" | "events" | "create" | "tools" | "settings";

const THEME_KEY = "slotwise-designer-theme";

const TAB_META: Record<Tab, { label: string; icon: string }> = {
  home: { label: "Home", icon: icons.home },
  events: { label: "Events", icon: icons.calendar },
  create: { label: "New", icon: icons.plus },
  tools: { label: "Tools", icon: icons.wrench },
  settings: { label: "Settings", icon: icons.settings },
};

export async function boot(root: HTMLElement) {
  await setExtensionLarge();

  const state = {
    theme: (localStorage.getItem(THEME_KEY) as "light" | "dark") || "light",
    tab: "home" as Tab,
    webflowSiteId: null as string | null,
    bootstrap: null as api.Bootstrap | null,
    services: [] as api.Service[],
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

  function gate(feature: string) {
    return state.bootstrap?.entitlements.gates[feature];
  }

  function upgradeLock(feature: string, label: string) {
    const g = gate(feature);
    if (!g || g.allowed) return "";
    return `<div class="lock">
      <strong>${icons.crown} ${label} · ${g.upgradeLabel}+</strong>
      <span>Not on ${state.bootstrap?.entitlements.label || "Free"}. Upgrade to unlock.</span>
      <a class="btn btn-upgrade" href="${state.bootstrap?.entitlements.upgradeUrl}" target="_blank" rel="noreferrer">${iconLabel(icons.zap, `Upgrade to ${g.upgradeLabel}`)}</a>
    </div>`;
  }

  function modeBanner() {
    if (state.canDesign) return "";
    const mode = state.mode || "build";
    return `<div class="mode-banner" role="status">
      ${icons.alert}
      <div>
        <b>Design mode required</b><br/>
        Canvas embed needs Design mode. Current: <b>${escapeHtml(mode)}</b>. Press <b>D</b> or click Design in the Webflow toolbar, select a section, then place the widget.
      </div>
    </div>`;
  }

  function shell(body: string) {
    const plan = state.bootstrap?.plan.tier || "FREE";
    const name = state.bootstrap?.site.name || "Slotwise";
    root.innerHTML = `
      <div class="app">
        <header class="topnav">
          <div class="brand">
            <div class="mark">S</div>
            <div>
              <strong>Slotwise</strong>
              <small>${escapeHtml(name)} · ${escapeHtml(plan)}</small>
            </div>
          </div>
          <div class="nav-actions">
            <button type="button" class="btn btn-icon btn-ghost" id="themeBtn" title="Toggle theme">
              ${state.theme === "light" ? icons.moon : icons.sun}
            </button>
            <a class="btn btn-upgrade" href="${state.bootstrap?.entitlements.upgradeUrl || `${api.APP_URL}/dashboard/plans`}" target="_blank" rel="noreferrer">
              ${iconLabel(icons.zap, "Upgrade")}
            </a>
            <button type="button" class="btn btn-primary" id="publishBtn">
              ${iconLabel(icons.rocket, "Publish")}
            </button>
          </div>
        </header>
        ${modeBanner()}
        <nav class="tabs" role="tablist">
          ${(Object.keys(TAB_META) as Tab[])
            .map(
              (t) =>
                `<button type="button" class="tab" data-tab="${t}" aria-selected="${state.tab === t}">${iconLabel(TAB_META[t].icon, TAB_META[t].label)}</button>`,
            )
            .join("")}
        </nav>
        <main class="main">${body}</main>
        <p id="status" class="status" data-tone="${state.statusOk ? "ok" : "bad"}">${state.status}</p>
        <p class="footer-note">Support <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a></p>
      </div>
    `;
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
      const list = await api.listServices({
        webflowSiteId: state.webflowSiteId,
        publicKey: state.bootstrap.site.publicKey,
      });
      state.services = list.services;
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
      await notify("Info", "Use Webflow Publish if API publish isn’t available");
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
    return `<div class="card-h">${icon}<h2>${title}</h2></div>`;
  }

  function viewHome() {
    if (!state.bootstrap) {
      return `<section class="card">
        ${cardTitle(icons.layout, "Connect Slotwise")}
        <p class="lead">Authorize Webflow once — no separate Slotwise login for embedding.</p>
        <a class="btn btn-primary" href="${api.APP_URL}/api/webflow/install" target="_blank" rel="noreferrer">${iconLabel(icons.external, "Install / reconnect")}</a>
      </section>`;
    }
    const lim = state.bootstrap.entitlements.eventsLimit;
    return `<section class="card">
      ${cardTitle(icons.home, "Dashboard")}
      <p class="lead">Events, canvas embed, and publish — without leaving Designer.</p>
      <div class="stats">
        <div class="stat">
          <div class="top">${icons.calendar}<span>Events</span></div>
          <b>${state.bootstrap.counts.services}${lim != null ? `<span style="font-size:11px;font-weight:600;color:var(--mut)"> / ${lim}</span>` : ""}</b>
        </div>
        <div class="stat">
          <div class="top">${icons.check}<span>Bookings</span></div>
          <b>${state.bootstrap.counts.bookings}</b>
        </div>
        <div class="stat">
          <div class="top">${icons.crown}<span>Plan</span></div>
          <b>${escapeHtml(state.bootstrap.entitlements.label)}</b>
        </div>
      </div>
      <div class="actions-grid">
        <button type="button" class="btn btn-primary" id="embedBtn" ${!state.canDesign ? "disabled" : ""}>
          ${iconLabel(icons.layout, state.canDesign ? "Place on canvas" : "Switch to Design mode")}
        </button>
        <button type="button" class="btn" id="gotoCreate">${iconLabel(icons.plus, "Create event")}</button>
        <a class="btn" href="${api.APP_URL}/book/${state.bootstrap.site.publicKey}?embed=1" target="_blank" rel="noreferrer">${iconLabel(icons.external, "Preview widget")}</a>
      </div>
    </section>
    <section class="card">
      ${cardTitle(icons.spark, "Pro unlocks")}
      <p class="lead">AI copy, import/export, and advanced event fields.</p>
      ${upgradeLock("ai_descriptions", "AI descriptions")}
      ${upgradeLock("import_export", "Import / export")}
      ${upgradeLock("analytics", "Funnel analytics")}
    </section>`;
  }

  function viewEvents() {
    if (!state.services.length) {
      return `<section class="card">
        ${cardTitle(icons.calendar, "Events")}
        <div class="empty">No events yet.</div>
        <button type="button" class="btn btn-primary" id="gotoCreate">${iconLabel(icons.plus, "New event")}</button>
      </section>`;
    }
    return `<section class="card">
      ${cardTitle(icons.calendar, "Events")}
      <p class="lead">These power the live booking widget.</p>
      <div class="list">
        ${state.services
          .map(
            (s) => `<div class="row">
            <div class="swatch" style="background:${s.color || "var(--ac)"}"></div>
            <div class="meta">
              <b>${escapeHtml(s.name)} ${s.featured ? '<span class="pill">Featured</span>' : ""} ${!s.active ? '<span class="pill">Off</span>' : ""}</b>
              <small>${s.durationMin} min · ${escapeHtml(s.category || s.locationType)}</small>
            </div>
            <div class="price">${money(s.priceCents, state.bootstrap?.site.currency)}</div>
            <button type="button" class="btn btn-icon btn-ghost" data-del="${s.id}" title="Delete">${icons.trash}</button>
          </div>`,
          )
          .join("")}
      </div>
    </section>`;
  }

  function viewCreate() {
    const lim = state.bootstrap?.entitlements.eventsLimit;
    const atLimit = lim != null && state.services.length >= lim;
    return `<section class="card">
      ${cardTitle(icons.plus, "Create event")}
      <p class="lead">Title, AI description, category, and booking rules.</p>
      ${atLimit ? upgradeLock("events", "More than " + lim + " events") : ""}
      <form id="eventForm">
        <label class="field"><span>Title</span><input name="name" required maxlength="120" placeholder="Deep home clean" ${atLimit ? "disabled" : ""} /></label>
        <label class="field"><span>Description</span>
          <textarea name="description" placeholder="What clients get…" ${atLimit ? "disabled" : ""}></textarea>
          <div class="desc-tools">
            <button type="button" class="btn btn-primary" id="aiBtn" ${atLimit ? "disabled" : ""}>${iconLabel(icons.spark, "Write with AI")}</button>
            <select id="aiTone" ${atLimit ? "disabled" : ""}>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="premium">Premium</option>
              <option value="concise">Concise</option>
            </select>
          </div>
          ${upgradeLock("ai_descriptions", "AI writing")}
        </label>
        <div class="field-row">
          <label class="field"><span>Category</span>
            <input name="category" placeholder="Cleaning" ${!gate("categories")?.allowed || atLimit ? "disabled" : ""} />
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
          ${upgradeLock("buffers", "Custom buffers")}
          <div class="field-row">
            <label class="field"><span>Capacity</span><input name="capacity" type="number" min="1" value="1" ${!gate("capacity")?.allowed || atLimit ? "disabled" : ""} /></label>
            <label class="field"><span>Color</span><input name="color" type="color" value="${state.bootstrap?.site.accent || "#f5a000"}" ${atLimit ? "disabled" : ""} /></label>
          </div>
          ${upgradeLock("capacity", "Group capacity")}
          <label class="field" style="display:flex;align-items:center;gap:8px">
            <input name="featured" type="checkbox" ${!gate("featured_events")?.allowed || atLimit ? "disabled" : ""} />
            <span style="text-transform:none;letter-spacing:0;font-size:11.5px;color:var(--ink)">Featured on widget</span>
          </label>
          ${upgradeLock("featured_events", "Featured events")}
        </details>
        <button type="submit" class="btn btn-primary" style="width:100%;margin-top:6px" ${atLimit ? "disabled" : ""}>${iconLabel(icons.check, "Save event")}</button>
      </form>
    </section>`;
  }

  function viewTools() {
    return `<section class="card">
      ${cardTitle(icons.upload, "Import & export")}
      <p class="lead">JSON / CSV for agency clones.</p>
      ${upgradeLock("import_export", "Import / export")}
      <div class="actions-grid">
        <button type="button" class="btn" id="exportJson" ${!gate("import_export")?.allowed ? "disabled" : ""}>${iconLabel(icons.download, "Export JSON")}</button>
        <button type="button" class="btn" id="exportCsv" ${!gate("import_export")?.allowed ? "disabled" : ""}>${iconLabel(icons.download, "Export CSV")}</button>
        <label class="field"><span>Import JSON</span>
          <input type="file" id="importFile" accept="application/json,.json" ${!gate("import_export")?.allowed ? "disabled" : ""} />
        </label>
      </div>
    </section>
    <section class="card">
      ${cardTitle(icons.layout, "Canvas")}
      <p class="lead">Insert a live booking iframe — no copy-paste.</p>
      <button type="button" class="btn btn-primary" id="embedBtn2" ${!state.canDesign ? "disabled" : ""}>
        ${iconLabel(icons.layout, state.canDesign ? "Place on canvas" : "Switch to Design mode")}
      </button>
    </section>`;
  }

  function viewSettings() {
    return `<section class="card">
      ${cardTitle(icons.settings, "Appearance")}
      <p class="lead">Panel theme (independent of your site).</p>
      <div style="display:flex;gap:6px">
        <button type="button" class="btn ${state.theme === "light" ? "btn-primary" : ""}" id="lightBtn">${iconLabel(icons.sun, "Light")}</button>
        <button type="button" class="btn ${state.theme === "dark" ? "btn-primary" : ""}" id="darkBtn">${iconLabel(icons.moon, "Dark")}</button>
      </div>
    </section>
    <section class="card">
      ${cardTitle(icons.users, "Site")}
      <p class="lead">Key <code style="font-size:10.5px">${escapeHtml(state.bootstrap?.site.publicKey || "—")}</code></p>
      <div class="actions-grid">
        <a class="btn" href="${api.APP_URL}/dashboard" target="_blank" rel="noreferrer">${iconLabel(icons.external, "Full dashboard")}</a>
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
            : state.tab === "tools"
              ? viewTools()
              : viewSettings();
    shell(body);

    root.querySelector("#embedBtn")?.addEventListener("click", () => void onEmbed());
    root.querySelector("#embedBtn2")?.addEventListener("click", () => void onEmbed());
    root.querySelector("#gotoCreate")?.addEventListener("click", () => {
      state.tab = "create";
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

    root.querySelector("#importFile")?.addEventListener("change", async (ev) => {
      const file = (ev.target as HTMLInputElement).files?.[0];
      if (!file || !state.bootstrap) return;
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
