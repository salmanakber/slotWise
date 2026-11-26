/** Premium Slotwise brand loader (matches product BrandLoader) */
export function brandLoader(label = "Loading…", accent = "var(--ac)", style = "PULSE") {
  const kind = ["PULSE", "SPIN", "DRAW", "CALENDAR"].includes(style) ? style : "PULSE";
  const day = new Date().getDate();

  const mark =
    kind === "SPIN"
      ? `<span class="sw-ldr-track"></span><span class="sw-ldr-arc"></span><span class="sw-ldr-hub"></span>`
      : kind === "DRAW"
        ? `<div class="sw-ldr-card"><svg viewBox="0 0 24 24"><path class="sw-ldr-check" d="M5 13.2 9.6 17.5 19 7"/></svg></div>`
        : kind === "CALENDAR"
          ? `<div class="sw-ldr-cal"><div class="sw-ldr-cal-top"><i></i><i></i></div><div class="sw-ldr-cal-body">${day}</div></div>`
          : `<span class="sw-ldr-ring-outer"></span><span class="sw-ldr-ring-mid"></span><span class="sw-ldr-core"></span>`;

  const dots =
    kind === "DRAW" || kind === "CALENDAR"
      ? `<div class="sw-ldr-dots" aria-hidden="true"><i></i><i></i><i></i></div>`
      : "";

  return `<div class="sw-loader" data-style="${kind}" role="status" aria-live="polite" style="--pac:${accent}">
    <div class="sw-loader-mark" aria-hidden="true">${mark}</div>
    ${dots}
    <span>${label}</span>
  </div>`;
}
