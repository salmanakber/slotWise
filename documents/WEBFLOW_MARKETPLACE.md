# Slotwise — Webflow Marketplace prep

## App type
**Hybrid** (Data Client + Designer Extension)

Redirect URI:
`https://slotwise.hindaralabs.com/api/webflow/callback`

Install URL:
`https://slotwise.hindaralabs.com/api/webflow/install`

## Architecture (Finding 1 compliance)
- Designer places a **mount div** only (`data-slotwise-widget`) — **no iframe on canvas**.
- Custom Code applies hosted `https://slotwise.hindaralabs.com/embed/widget.js` (SRI).
- Runtime renders booking UI **in-page** into the mount (React). No externally hosted iframe as the primary UI.
- Rebuild runtime: `npm run build:embed`

## Scopes (used only)
- `authorized_user:read`
- `sites:read` / `sites:write`
- `pages:read`
- `custom_code:read` / `custom_code:write`
- **Not requested:** `pages:write`, `cms:*`

## Documentation URL
`https://slotwise.hindaralabs.com/docs/webflow`

## Listing copy
See `documents/MARKETPLACE_LISTING.md`

## Support
`hindarapro@gmail.com` · Entity: Hindara Labs

## Publish rule
Slotwise never auto-publishes. Owner clicks Publish.
