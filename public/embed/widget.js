(function () {
  if (window.__slotwiseBooted) return;
  window.__slotwiseBooted = true;

  var STYLE_ID = "slotwise-embed-css";

  function ensureStyles() {
    if (document.getElementById(STYLE_ID)) return;
    var css = document.createElement("style");
    css.id = STYLE_ID;
    css.textContent =
      ".slotwise-host{position:relative;display:block;width:100%;max-width:100%;min-width:0;" +
      "box-sizing:border-box;isolation:isolate;overflow:hidden}" +
      ".slotwise-frame{display:block;width:100%;max-width:100%;border:0;border-radius:16px;" +
      "background:transparent;min-height:640px;overflow:hidden;" +
      "box-shadow:0 14px 40px rgba(15,27,45,.1);transition:min-height .25s ease,height .25s ease}" +
      ".slotwise-skel{position:absolute;inset:0;border-radius:16px;overflow:hidden;" +
      "background:linear-gradient(135deg,#f7f8fb,#eef2f7);pointer-events:none}" +
      ".slotwise-skel::after{content:'';position:absolute;inset:0;" +
      "background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);" +
      "animation:slotwise-shimmer 1.4s ease-in-out infinite}" +
      "@keyframes slotwise-shimmer{0%{transform:translateX(-40%)}100%{transform:translateX(40%)}}" +
      ".slotwise-host.is-ready .slotwise-skel{opacity:0;visibility:hidden;transition:opacity .35s ease}";
    document.head.appendChild(css);
  }

  function mount(el, base) {
    if (el.getAttribute("data-slotwise-mounted")) return;
    el.setAttribute("data-slotwise-mounted", "1");
    var site = el.getAttribute("data-site");
    if (!site) return;

    ensureStyles();
    el.classList.add("slotwise-host");
    el.style.width = "100%";
    el.style.maxWidth = "100%";
    el.style.minWidth = "0";
    el.style.overflow = "hidden";
    el.style.boxSizing = "border-box";

    var skel = document.createElement("div");
    skel.className = "slotwise-skel";
    skel.setAttribute("aria-hidden", "true");

    var iframe = document.createElement("iframe");
    iframe.className = "slotwise-frame";
    iframe.title = "Slotwise booking";
    iframe.src = base + "/book/" + encodeURIComponent(site) + "?embed=1";
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allow", "payment *");
    iframe.setAttribute("referrerpolicy", "strict-origin-when-cross-origin");
    iframe.setAttribute("scrolling", "no");

    var minH = parseInt(el.getAttribute("data-min-height") || "640", 10);
    iframe.style.minHeight = minH + "px";
    iframe.style.width = "100%";
    iframe.style.maxWidth = "100%";
    iframe.style.overflow = "hidden";

    function onMessage(ev) {
      var data = ev && ev.data;
      if (!data || data.source !== "slotwise" || data.publicKey !== site) return;
      if (data.type === "resize" && typeof data.height === "number") {
        var next = Math.max(minH, Math.ceil(data.height) + 8);
        iframe.style.minHeight = next + "px";
        iframe.style.height = next + "px";
      }
      if (data.type === "ready") {
        el.classList.add("is-ready");
      }
    }

    window.addEventListener("message", onMessage);
    iframe.addEventListener("load", function () {
      el.classList.add("is-ready");
    });

    el.appendChild(skel);
    el.appendChild(iframe);
  }

  function boot() {
    var nodes = document.querySelectorAll("[data-slotwise-widget]");
    if (!nodes.length) return;
    var script = document.currentScript;
    var base =
      (script && script.src && script.src.replace(/\/embed\/widget\.js.*$/, "")) ||
      window.location.origin;

    for (var i = 0; i < nodes.length; i++) mount(nodes[i], base);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
