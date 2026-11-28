# Slotwise for Wix

Isolated Wix surface for Slotwise. **Same backend, dashboard, booking APIs, and `widget.js` runtime as Webflow** — this folder holds Wix-only app artifacts so Webflow (`designer-extension/`, `/api/webflow/*`) stays undisturbed.

## Shared (do not fork)

| Piece | Location | Notes |
|-------|----------|--------|
| Booking APIs | `/api/v1/sites/...` | Identical for all channels |
| Embed runtime | `public/embed/widget.js` | Same SRI-hosted in-page mount |
| Owner dashboard | `/dashboard/*` | Branding, services, Stripe, etc. |
| Platform admin | `/platform/*` | Shared plans + secrets |

## Wix-only (this tree + Next routes)

| Piece | Location |
|-------|----------|
| Wix app / Blocks / CLI | `wix/` (this directory) |
| Marketing landing | `https://slotwise.hindaralabs.com/wix` → `src/app/wix` |
| Install docs | `https://slotwise.hindaralabs.com/docs/wix` → `src/app/docs/wix` |
| OAuth / webhooks (later) | `src/app/api/wix/*` + `src/lib/wix/` |
| Site channel | `Site.channel = WIX`, optional `wixSiteId` |

## Phased rollout

### Phase 1 — Foundation (current)
- [x] `wix/` scaffold + roadmap
- [x] Public `/wix` landing (separate from Webflow homepage)
- [x] Docs stub `/docs/wix`
- [x] DB `Site.channel` + optional `wixSiteId` (default `WEBFLOW` — existing sites unchanged)
- [x] Platform settings slot for future Wix app credentials
- [x] Dashboard Integrations card for Wix (coming soon / prep)

### Phase 2 — Embed on Wix sites
- [x] Document Custom Code / embed snippet for Wix (reuse `widget.js` + `data-slotwise-widget`)
- [x] Dashboard Branding → **Add to Wix** card (`WixInstallCard`) — Webflow block unchanged
- [x] `/api/site/channel` PATCH (sets `channel` only; never clears `webflowSiteId`)
- [x] Hardened `/docs/wix` with SRI + verify steps
- [ ] QA: mount on Wix Editor / published site (owner action)

### Phase 3 — Wix App / OAuth
- [x] `WixToken` model + `src/lib/wix.ts` / `wix-provision.ts`
- [x] `src/app/api/wix/install|callback|uninstall`
- [x] `/install/wix` result page (separate from Webflow `/install`)
- [x] Dev Center notes: `wix/DEV_CENTER.md`
- [ ] Optional: Wix Blocks / CLI UI package under `wix/app/`
- [ ] Marketplace listing packet under `documents/` (Wix-specific)

### Phase 4 — Marketplace submit
- [ ] Privacy/terms channel wording
- [ ] Reviewer notes + support `hindarapro@gmail.com`

## Rule

**Never** change Webflow OAuth scopes, Designer Extension, or `/api/webflow/*` for Wix work. Add parallel paths only.
