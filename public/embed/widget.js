(function () {
  if (window.__slotwiseBooted) return;
  window.__slotwiseBooted = true;

  function boot() {
    var nodes = document.querySelectorAll("[data-slotwise-widget]");
    if (!nodes.length) return;
    var script = document.currentScript;
    var base =
      (script && script.src && script.src.replace(/\/embed\/widget\.js.*$/, "")) ||
      window.location.origin;

    nodes.forEach(function (el) {
      if (el.getAttribute("data-slotwise-mounted")) return;
      el.setAttribute("data-slotwise-mounted", "1");
      var site = el.getAttribute("data-site");
      if (!site) return;
      var iframe = document.createElement("iframe");
      iframe.title = "Slotwise booking";
      iframe.src = base + "/book/" + encodeURIComponent(site) + "?embed=1";
      iframe.style.width = "100%";
      iframe.style.minHeight = "720px";
      iframe.style.border = "0";
      iframe.style.borderRadius = "16px";
      iframe.setAttribute("loading", "lazy");
      el.appendChild(iframe);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
