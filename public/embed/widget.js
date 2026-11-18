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
      ".slotwise-frame{display:block;width:100%;max-width:26.5rem;margin:0 auto;border:0;border-radius:16px;" +
      "background:transparent;min-height:0;height:0;overflow:hidden;" +
      "box-shadow:0 14px 40px rgba(15,27,45,.1);transition:min-height .25s ease,height .25s ease}" +
      ".slotwise-skel{position:absolute;inset:0;border-radius:16px;overflow:hidden;" +
      "background:linear-gradient(135deg,#f7f8fb,#eef2f7);pointer-events:none}" +
      ".slotwise-skel::after{content:'';position:absolute;inset:0;" +
      "background:linear-gradient(90deg,transparent,rgba(255,255,255,.55),transparent);" +
      "animation:slotwise-shimmer 1.4s ease-in-out infinite}" +
      "@keyframes slotwise-shimmer{0%{transform:translateX(-40%)}100%{transform:translateX(40%)}}" +
      ".slotwise-host.is-ready .slotwise-skel{opacity:0;visibility:hidden;transition:opacity .35s ease}" +
      ".slotwise-host.is-gone,.slotwise-gone{display:none!important;height:0!important;min-height:0!important;" +
      "margin:0!important;padding:0!important;overflow:hidden!important;border:0!important}";
    document.head.appendChild(css);
  }

  function hide(el) {
    if (!el) return;
    el.classList.add("is-gone");
    el.classList.add("slotwise-gone");
    el.style.setProperty("display", "none", "important");
    el.style.setProperty("height", "0", "important");
    el.style.setProperty("min-height", "0", "important");
    el.innerHTML = "";
    el.setAttribute("data-slotwise-mounted", "0");
    el.setAttribute("data-slotwise-hidden", "1");
  }

  function hideFrame(iframe) {
    if (!iframe) return;
    iframe.classList.add("slotwise-gone");
    iframe.style.setProperty("display", "none", "important");
    iframe.style.setProperty("height", "0", "important");
    iframe.style.setProperty("min-height", "0", "important");
    iframe.setAttribute("data-slotwise-hidden", "1");
    try {
      iframe.src = "about:blank";
    } catch (e) {}
    if (iframe.parentElement) hide(iframe.parentElement);
  }

  function publicKeyFromSrc(src) {
    var m = String(src || "").match(/\/book\/(sw_[a-zA-Z0-9]+)/);
    return m ? m[1] : null;
  }

  function mount(el, base) {
    if (el.getAttribute("data-slotwise-mounted") === "1") return;
    el.setAttribute("data-slotwise-mounted", "1");
    var site = el.getAttribute("data-site") || el.getAttribute("data-slotwise-widget");
    if (!site || site === "1") return;

    ensureStyles();
    el.classList.add("slotwise-host");

    // Existing Designer iframe already inside the host — manage it instead of nesting another
    var existing = el.querySelector && el.querySelector("iframe");
    if (existing) {
      var key = publicKeyFromSrc(existing.getAttribute("src")) || site;
      fetch(base + "/api/v1/sites/" + encodeURIComponent(key), { credentials: "omit" })
        .then(function (r) {
          if (!r.ok) throw new Error("unavailable");
        })
        .then(function () {
          el.classList.add("is-ready");
          existing.style.minHeight = "640px";
          existing.style.height = "640px";
        })
        .catch(function () {
          hideFrame(existing);
          hide(el);
        });

      window.addEventListener("message", function (ev) {
        var data = ev && ev.data;
        if (!data || data.source !== "slotwise") return;
        if (data.publicKey && data.publicKey !== key) return;
        if (data.type === "resize" && typeof data.height === "number") {
          if (data.height <= 1) {
            hideFrame(existing);
            hide(el);
            return;
          }
          var next = Math.max(320, Math.ceil(data.height) + 8);
          existing.style.minHeight = next + "px";
          existing.style.height = next + "px";
        }
      });
      return;
    }

    fetch(base + "/api/v1/sites/" + encodeURIComponent(site), { credentials: "omit" })
      .then(function (r) {
        if (!r.ok) throw new Error("unavailable");
        return r.json();
      })
      .then(function () {
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

        function onMessage(ev) {
          var data = ev && ev.data;
          if (!data || data.source !== "slotwise" || data.publicKey !== site) return;
          if (data.type === "resize" && typeof data.height === "number") {
            if (data.height <= 1) {
              hide(el);
              return;
            }
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
      })
      .catch(function () {
        hide(el);
      });
  }

  function sweepOrphanFrames(base) {
    ensureStyles();
    var frames = document.querySelectorAll("iframe");
    for (var i = 0; i < frames.length; i++) {
      var iframe = frames[i];
      if (iframe.getAttribute("data-slotwise-hidden") === "1") continue;
      var src = iframe.getAttribute("src") || "";
      if (!/\/book\/sw_/i.test(src)) continue;
      // Skip frames already managed inside a mounted host
      if (iframe.closest && iframe.closest("[data-slotwise-mounted='1']")) continue;
      var key = publicKeyFromSrc(src);
      if (!key) continue;
      (function (frame, publicKey) {
        fetch(base + "/api/v1/sites/" + encodeURIComponent(publicKey), { credentials: "omit" })
          .then(function (r) {
            if (!r.ok) throw new Error("unavailable");
          })
          .catch(function () {
            hideFrame(frame);
          });
        window.addEventListener("message", function (ev) {
          var data = ev && ev.data;
          if (!data || data.source !== "slotwise" || data.publicKey !== publicKey) return;
          if (data.type === "resize" && typeof data.height === "number") {
            if (data.height <= 1) hideFrame(frame);
            else {
              var next = Math.max(320, Math.ceil(data.height) + 8);
              frame.style.minHeight = next + "px";
              frame.style.height = next + "px";
            }
          }
        });
      })(iframe, key);
    }
  }

  function boot() {
    var script = document.currentScript;
    var base =
      (script && script.src && script.src.replace(/\/embed\/widget\.js.*$/, "")) ||
      "https://slotwise.hindaralabs.com";

    var nodes = document.querySelectorAll("[data-slotwise-widget]");
    for (var i = 0; i < nodes.length; i++) mount(nodes[i], base);
    sweepOrphanFrames(base);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
