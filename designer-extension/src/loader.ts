/** Premium Slotwise brand loader (matches product BrandLoader) */
export function brandLoader(label = "Loading…", accent = "var(--ac)") {
  return `<div class="sw-loader" role="status" aria-live="polite" style="--pac:${accent}">
    <div class="sw-loader-mark">
      <svg viewBox="0 0 64 64" fill="none" aria-hidden="true">
        <rect class="ldr-slot" x="18" y="16" width="28" height="24" rx="4" stroke="var(--pac)" stroke-width="2.5" fill="color-mix(in srgb, var(--pac) 12%, transparent)"/>
        <circle class="ldr-dot" cx="38" cy="24" r="3" fill="var(--pac)"/>
        <circle class="ldr-ring" cx="42" cy="46" r="10" stroke="var(--pac)" stroke-width="2.5" fill="color-mix(in srgb, var(--pac) 10%, transparent)"/>
        <path d="M42 41v5l3.5 2" stroke="var(--pac)" stroke-width="2" stroke-linecap="round"/>
        <path class="ldr-s" d="M12 22c6-10 18-8 20 0s-8 10-4 16 16 4 18-6" stroke="var(--pac)" stroke-width="3" stroke-linecap="round" fill="none"/>
      </svg>
    </div>
    <span>${label}</span>
  </div>`;
}
