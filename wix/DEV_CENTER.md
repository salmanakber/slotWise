# Wix Dev Center setup (Slotwise)

Keep Webflow Dev Center / Marketplace settings unchanged. This is Wix-only.

## App URLs

| Purpose | URL |
|---------|-----|
| App / install entry | `https://slotwise.hindaralabs.com/api/wix/install` |
| OAuth / post-install callback | `https://slotwise.hindaralabs.com/api/wix/callback` |
| Marketing | `https://slotwise.hindaralabs.com/wix` |
| Docs | `https://slotwise.hindaralabs.com/docs/wix` |

## Credentials → Slotwise Platform

In Slotwise **Platform → Settings → Wix app** (or env):

- `WIX_APP_ID` / App ID  
- `WIX_APP_SECRET` / App secret  
- `WIX_PUBLIC_KEY` (recommended — verify `signedInstance`)

Optional: `WIX_REDIRECT_URI` (defaults to callback above).

## Flow

1. User hits `/api/wix/install` → Wix `app-installer` with `postInstallationUrl`.
2. After approve, Wix redirects to `/api/wix/callback` with `instanceId` + `signedInstance`.
3. Slotwise exchanges `instanceId` for an access token (`oauth2/token` client_credentials).
4. Creates/links a `Site` with `channel=WIX` + `WixToken` (never writes Webflow fields).
5. User lands on `/install/wix` → Branding → **Add to Wix** embed snippet.

## Permissions

Request only what you need for site properties / future features. Start minimal (site info). Expand later for editor extensions.

## Uninstall

`POST /api/wix/uninstall` with `{ "instanceId": "…" }` deactivates the Slotwise site and deletes `WixToken`. Wire a Wix “App Instance Removed” webhook to this later if desired.
