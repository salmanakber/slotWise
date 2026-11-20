# Slotwise — Webflow Marketplace prep

## App type
Enable **both**:
- Data Client
- Designer Extension

Redirect URI (production):
`https://slotwise.hindaralabs.com/api/webflow/callback`

**Install URL** (Marketplace / “Install app” — site owners must NOT hit `/login`):
`https://slotwise.hindaralabs.com/api/webflow/install`

After OAuth, users land on `/install?status=connected` then open **Designer → Apps → Slotwise → Launch App** to embed.

## Scopes (used — do not request CMS)
- `authorized_user:read` — installer identity on OAuth
- `sites:read` / `sites:write` — list/link sites; publish; site-level custom code lifecycle
- `pages:read` / `pages:write` — list pages + page-level custom code cleanup on uninstall
- `custom_code:read` / `custom_code:write` — register/apply/purge `widget.js`
- **Do not request** `cms:read` / `cms:write` (unused)

## Listing

**Name:** Slotwise  
**Tagline:** Webflow-native booking

**Short description:**  
Bookings that look like your site. Slotwise adds paid scheduling to Webflow with designer control, CMS-driven services, Stripe deposits, and zero commission.

**Long description:** see product README / prior Marketplace copy in chat history.

## Documentation URL (Marketplace form)
`https://slotwise.hindaralabs.com/docs/webflow`

## Support contact
`tidyflaw@gmail.com`

## Design references in this folder
- `frontend-design-ref-Slotwise_ design directions.html` — widget theme directions (Mist / Cobalt / Amber)
- `design-ref-Slotwise-admin.html` — site-owner admin + brand loader
- `design-ref-Slotwise-platform.html` — platform owner console
- Spec docx — P0 / P1 / P2 feature matrix
