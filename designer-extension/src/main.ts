import "./styles.css";

const APP_URL =
  (import.meta.env.VITE_SLOTWISE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://slotwise.hindaralabs.com";

const root = document.getElementById("app");
if (!root) throw new Error("Missing #app");

root.innerHTML = `
  <div class="shell">
    <header class="hero">
      <div class="mark">S</div>
      <div>
        <h1>Slotwise</h1>
        <p>Place a branded booking widget on this page.</p>
      </div>
    </header>

    <div id="siteCard" class="site-card">
      <span class="muted">Detecting Webflow site…</span>
    </div>

    <label class="field">
      <span>Site public key</span>
      <input id="publicKey" type="text" value="" spellcheck="false" placeholder="Auto-filled after install" />
    </label>

    <div class="actions">
      <button id="insert" class="primary" type="button">Insert booking embed</button>
      <button id="open" type="button">Open live preview</button>
      <button id="refresh" type="button">Refresh site link</button>
    </div>

    <p id="status" class="status" role="status"></p>

    <footer>
      Support: <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a>
    </footer>
  </div>
`;

const statusEl = document.getElementById("status")!;
const keyInput = document.getElementById("publicKey") as HTMLInputElement;
const siteCard = document.getElementById("siteCard")!;

function setStatus(msg: string, ok = true) {
  statusEl.textContent = msg;
  statusEl.dataset.tone = ok ? "ok" : "bad";
}

function snippet(publicKey: string) {
  return `<div data-slotwise-widget data-site="${publicKey}"></div>
<script src="${APP_URL}/embed/widget.js" async></script>`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function wf(): any {
  return (window as unknown as { webflow?: unknown }).webflow;
}

async function detectWebflowSiteId(): Promise<string | null> {
  const api = wf();
  if (!api) return null;
  try {
    if (typeof api.getSiteInfo === "function") {
      const info = await api.getSiteInfo();
      return info?.siteId || info?.id || null;
    }
  } catch {
    /* ignore */
  }
  return null;
}

async function resolvePublicKey() {
  const webflowSiteId = await detectWebflowSiteId();
  if (!webflowSiteId) {
    siteCard.innerHTML = `<span class="muted">Couldn’t read site id — paste your public key or finish install.</span>`;
    return;
  }

  siteCard.innerHTML = `<span class="muted">Webflow site</span><strong>${webflowSiteId}</strong>`;

  try {
    const res = await fetch(`${APP_URL}/api/webflow/resolve-site`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ webflowSiteId }),
    });
    const data = await res.json();
    if (!res.ok) {
      siteCard.innerHTML = `<span class="muted">Not linked yet</span><a href="${APP_URL}/api/webflow/install" target="_blank" rel="noreferrer">Connect Webflow</a>`;
      setStatus(data.error || "Install Slotwise from Webflow first", false);
      return;
    }
    keyInput.value = data.publicKey;
    siteCard.innerHTML = `<span class="muted">${data.name || "Connected"}</span><strong>${data.publicKey}</strong>`;
    setStatus("Site linked — ready to embed");
  } catch {
    setStatus("Could not reach Slotwise API", false);
  }
}

async function insertEmbed() {
  const publicKey = keyInput.value.trim();
  if (!publicKey) {
    setStatus("Missing public key — connect Webflow install first", false);
    return;
  }

  try {
    const api = wf();
    if (!api?.getSelectedElement || !api?.createDOM) {
      await navigator.clipboard.writeText(snippet(publicKey));
      setStatus("Copied embed snippet — paste into an Embed element.");
      return;
    }

    const selected = await api.getSelectedElement();
    const embed = await api.createDOM("div");
    await embed.setAttribute("data-slotwise-widget", "");
    await embed.setAttribute("data-site", publicKey);
    await embed.setTextContent("Slotwise booking");
    await embed.setStyles({
      width: "100%",
      minHeight: "720px",
      borderRadius: "18px",
      backgroundColor: "#f6f8fb",
    });

    // Prefer an Embed element when available so the script can run on publish
    try {
      if (typeof api.createDOM === "function") {
        const htmlEmbed = await api.createDOM("CodeEmbed");
        if (htmlEmbed?.setAttribute) {
          await htmlEmbed.setAttribute("data-slotwise-embed", "1");
        }
      }
    } catch {
      /* CodeEmbed may be unavailable — div placeholder is fine */
    }

    if (selected && (await selected.canHaveChildren?.())) {
      await selected.append(embed);
    } else {
      const els = await api.getAllElements?.();
      const body = els?.find?.((e: { type?: string }) => e.type === "Body") ?? null;
      if (body?.append) await body.append(embed);
      else throw new Error("Select a section/container on the canvas, then try again.");
    }

    // Also copy full snippet (div + script) for Custom Code / Embed
    try {
      await navigator.clipboard.writeText(snippet(publicKey));
    } catch {
      /* ignore */
    }

    setStatus("Embed placed. Publish the site; snippet also copied for Custom Code if needed.");
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Could not insert embed", false);
  }
}

document.getElementById("insert")!.addEventListener("click", () => {
  void insertEmbed();
});

document.getElementById("open")!.addEventListener("click", () => {
  const publicKey = keyInput.value.trim();
  if (!publicKey) {
    setStatus("Resolve or paste a public key first", false);
    return;
  }
  window.open(`${APP_URL}/book/${encodeURIComponent(publicKey)}`, "_blank", "noopener,noreferrer");
});

document.getElementById("refresh")!.addEventListener("click", () => {
  void resolvePublicKey();
});

void resolvePublicKey();
