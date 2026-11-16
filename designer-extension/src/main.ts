import "./styles.css";

const APP_URL = (import.meta.env.VITE_SLOTWISE_URL as string | undefined)?.replace(/\/$/, "") ||
  "https://slotwise.hindaralabs.com";

const DEMO_KEY = "sw_demo_studio_nine";

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

    <label class="field">
      <span>Site public key</span>
      <input id="publicKey" type="text" value="${DEMO_KEY}" spellcheck="false" />
    </label>

    <div class="actions">
      <button id="insert" class="primary" type="button">Insert booking embed</button>
      <button id="open" type="button">Open live preview</button>
      <button id="branding" type="button">Open branding admin</button>
    </div>

    <p id="status" class="status" role="status"></p>

    <footer>
      Support: <a href="mailto:tidyflaw@gmail.com">tidyflaw@gmail.com</a>
    </footer>
  </div>
`;

const statusEl = document.getElementById("status")!;
const keyInput = document.getElementById("publicKey") as HTMLInputElement;

function setStatus(msg: string, ok = true) {
  statusEl.textContent = msg;
  statusEl.dataset.tone = ok ? "ok" : "bad";
}

function snippet(publicKey: string) {
  return `<div data-slotwise-widget data-site="${publicKey}"></div>
<script src="${APP_URL}/embed/widget.js" async></script>`;
}

async function insertEmbed() {
  const publicKey = keyInput.value.trim() || DEMO_KEY;
  try {
    // Webflow Designer Extension API (available inside Designer iframe)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wf = (window as any).webflow;
    if (!wf?.getSelectedElement || !wf?.createDOM) {
      await navigator.clipboard.writeText(snippet(publicKey));
      setStatus("Copied embed snippet — paste into an Embed element on the canvas.");
      return;
    }

    const selected = await wf.getSelectedElement();
    const embed = await wf.createDOM("div");
    await embed.setAttribute("data-slotwise-widget", "");
    await embed.setAttribute("data-site", publicKey);
    await embed.setTextContent("Slotwise booking loads here");
    await embed.setStyles({
      width: "100%",
      minHeight: "720px",
      borderRadius: "18px",
      backgroundColor: "#f6f8fb",
    });

    if (selected && (await selected.canHaveChildren?.())) {
      await selected.append(embed);
    } else {
      const el = await wf.getAllElements?.();
      const body = el?.find?.((e: { type?: string }) => e.type === "Body") ?? null;
      if (body?.append) await body.append(embed);
      else throw new Error("Select a container on the canvas, then try again.");
    }

    setStatus("Booking container placed. Publish the site, then install Custom Code or paste the script.");
  } catch (e) {
    setStatus(e instanceof Error ? e.message : "Could not insert embed", false);
  }
}

document.getElementById("insert")!.addEventListener("click", () => {
  void insertEmbed();
});

document.getElementById("open")!.addEventListener("click", () => {
  const publicKey = keyInput.value.trim() || DEMO_KEY;
  window.open(`${APP_URL}/book/${encodeURIComponent(publicKey)}`, "_blank", "noopener,noreferrer");
});

document.getElementById("branding")!.addEventListener("click", () => {
  window.open(`${APP_URL}/dashboard/branding`, "_blank", "noopener,noreferrer");
});
