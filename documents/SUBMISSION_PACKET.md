# Slotwise — Webflow resubmission packet

**Support (only):** hindarapro@gmail.com  
**Entity:** Hindara Labs  
**Docs:** https://slotwise.hindaralabs.com/docs/webflow  
**Privacy:** https://slotwise.hindaralabs.com/privacy  
**Terms:** https://slotwise.hindaralabs.com/terms  
**Install URL:** https://slotwise.hindaralabs.com/api/webflow/install  
**Redirect URI:** https://slotwise.hindaralabs.com/api/webflow/callback  

**Designer uploads**
- `designer-extension/bundle.zip`
- `designer-extension/source-maps.zip` (private review artifact)

**Hosted runtime (pin in Preflight)**
- URL: `https://slotwise.hindaralabs.com/embed/widget.js`
- SHA-256 hex: `64da7374b0c3378ad038a3b62463ab935f2ebce9842d1825ddcae150adcf8b14`
- SRI: `sha256-ZNpzdLDDN4rQOKO2JGOrk18uvOmELRgl3crhUK3PixQ=`

---

## Finding checklist (all five)

| # | Finding | Status | What we changed |
|---|---------|--------|-----------------|
| 1 | Externally hosted iframe | **Fixed in code** | Designer places mount **div** only. `widget.js` renders booking UI **in-page**. No iframe as primary UI on canvas or customer pages. Legacy iframes are removed/migrated. |
| 2 | Listing incomplete / conflicting | **Fixed — paste long description below** | Requirements, plans/prices/limits, docs URL, Custom Code disclosure; no “anti-iframe while using iframe”; Stripe fees disclosed; GA4/Meta named. |
| 3 | Auto-publish on uninstall | **Fixed — notes below** | App never auto-publishes. Owner must click Publish. |
| 4 | `pages:write` unused | **Fixed in OAuth** | Removed from `webflowScopes()`. Uncheck in App settings. Page Custom Code delete uses `custom_code:write`. |
| 5 | Privacy / terms / support | **Fixed on site** | Privacy covers visitors + all third parties + retention/uninstall; entity Hindara Labs; terms describe submitted app (no P0–P2); support **hindarapro@gmail.com** only. |

**Before submit you must still:** deploy Slotwise, upload new zips, uncheck `pages:write` in App settings, QA end-to-end on `.webflow.io`, run Preflight with the new SHA.

---

## 1) App capabilities
Hybrid (Data Client + Designer Extension)

## 2) Install URL
```
https://slotwise.hindaralabs.com/api/webflow/install
```

## 3) Scopes to select + paste justifications

**Select only:**
- authorized_user:read
- sites:read
- sites:write
- pages:read
- custom_code:read
- custom_code:write

**Do not select:** pages:write, cms:read, cms:write, or any other scope.

### Scope justifications (paste)

**authorized_user:read**  
Used on install via Get Authorized User (`/token/authorized_by`) to identify the installer and create/link the Hindara Labs / Slotwise workspace owner account.

**sites:read**  
Used to list authorized Webflow sites (`GET /sites`) and read site metadata (`GET /sites/{site_id}`) so Slotwise can link the correct site after OAuth.

**sites:write**  
Used only when the user clicks an explicit Publish control in the Slotwise Designer panel (`POST /sites/{site_id}/publish`). Slotwise does not publish on install, uninstall, timers, or page load.

**pages:read**  
Used on uninstall to list pages (`GET /sites/{site_id}/pages`) so App-applied page-level Custom Code can be removed.

**custom_code:read**  
Used to read currently applied Custom Code before updating the applied script list (`GET /sites/{site_id}/custom_code`).

**custom_code:write**  
Used to register the hosted runtime (`POST .../registered_scripts/hosted` for `widget.js` with integrity), apply it site-wide (`PUT /sites/{site_id}/custom_code`), and on uninstall delete App-applied Custom Code at site and page level (`DELETE /sites/{site_id}/custom_code`, `DELETE /pages/{page_id}/custom_code`). Page Custom Code deletion requires `custom_code:write`, not `pages:write`.

---

## 4) Submission / reviewer notes (paste entire block)

### Architecture and hosted runtime (addresses Finding 1 + disclosure)

Slotwise does **not** place an externally hosted iframe on the Designer canvas or on customer sites as the booking UI.

- **Designer:** “Add booking” inserts a mount element only: a `div` with `data-slotwise-widget` / `data-site`. No `<iframe>` is created on the canvas.
- **Published site:** Slotwise registers and applies one hosted script through the Webflow Custom Code API:
  - URL: `https://slotwise.hindaralabs.com/embed/widget.js`
  - Registered with Subresource Integrity and `crossorigin="anonymous"` via Webflow hosted script registration.
- **What the script does:** On published pages it finds `[data-slotwise-widget]` mounts and renders the booking UI **in-page** (client-side React mount into the div). It calls Slotwise public HTTPS APIs (`/api/v1/sites/...`) for site config, availability, and bookings. It does not create an externally hosted iframe as the primary booking surface.
- **Why Custom Code:** So the runtime is visible, versioned, removable on uninstall, and pin-able for Marketplace review (immutable bytes + SRI).
- **Remotely loaded resource disclosure:** The only App-delivered customer-site script is `widget.js` above. Booking data APIs are HTTPS calls to `slotwise.hindaralabs.com`. Optional owner-configured GA4 / Meta Pixel IDs load those vendors’ scripts only when the site owner saves IDs in the dashboard.

If an older install still has a legacy booking iframe on a page, the current runtime removes/replaces it with an in-page mount on load. New placements never create iframes.

### Publish behavior (addresses Finding 3)

Slotwise **never** publishes a customer site automatically—not on install, not on uninstall, not on timers, not on load.

- Custom Code apply/remove stages changes in Webflow until the site owner publishes.
- Publish happens only when the user clicks Webflow Publish, or the clearly labeled Publish control in the Slotwise Designer panel (requires `sites:write` and a direct click).
- After uninstall cleanup, the owner is instructed to Publish so Custom Code removal goes live.

### Uninstallation and Custom Code cleanup (addresses Finding 3 notes + uninstall)

When a user disconnects from the Designer panel or uninstalls while OAuth still works, Slotwise:

1. Removes Slotwise booking mounts from the current Designer page when disconnect runs in the Designer (canvas elements are not Data API resources).
2. Deletes App-applied **site-level** Custom Code via the Custom Code API.
3. Lists pages (`pages:read`) and deletes App-applied **page-level** Custom Code on each page (`custom_code:write`).
4. Leaves unrelated customer scripts untouched.
5. Deactivates the Slotwise site (booking APIs stop serving) and revokes/deletes the stored Webflow OAuth token.

Slotwise does **not** publish after cleanup. The owner must Publish for live removal. If the Marketplace revoke happens first and the token is already invalid, Webflow removes App-applied scripts on the owner’s next publish; Slotwise also deactivates the site so leftover mounts cannot take new bookings.

### Scopes (addresses Finding 4)

We request only: `authorized_user:read`, `sites:read`, `sites:write`, `pages:read`, `custom_code:read`, `custom_code:write`.  
We do **not** request `pages:write`. Page Custom Code delete is covered by `custom_code:write` per Webflow’s API reference.

### Privacy / terms / support (addresses Finding 5)

- Operating entity: **Hindara Labs**
- Support contact (submission and all public pages): **hindarapro@gmail.com**
- Privacy policy covers visitor widget data, retention, uninstall deletion, and third parties including Stripe, Google (Calendar/Meet/GA4), Meta Pixel, Zoom, Microsoft, Mailchimp, Webflow, email/SMS providers, and AI Calendar Chat.
- Terms describe the submitted Hybrid App (Designer mount + Custom Code `widget.js` in-page runtime + dashboard + integrations) and state that Slotwise does not auto-publish.

### Review access

- Production app: https://slotwise.hindaralabs.com  
- Documentation: https://slotwise.hindaralabs.com/docs/webflow  
- Please use the published `.webflow.io` testing site listed on the form with Slotwise installed.  
- Stripe: sandbox / test mode available for review (Connect + deposits on Pro+).  
- Highest plan / full features can be enabled for the review account on request to hindarapro@gmail.com.

---

## 5) Long description (paste into listing)

Slotwise adds booking and appointment scheduling to Webflow sites.

What you get
- A Designer Extension that places a booking mount on your canvas (a div marker — not an externally hosted iframe).
- A hosted runtime script (https://slotwise.hindaralabs.com/embed/widget.js) applied through the Webflow Custom Code API. On published pages the script finds the mount and renders the booking UI in-page, then calls Slotwise HTTPS APIs for availability and bookings.
- An owner dashboard for services, availability, branding, staff, notifications, and integrations (Stripe, Google Calendar/Meet, Zoom, Microsoft Teams/Outlook, Mailchimp, Google Analytics 4, Meta Pixel, and AI Calendar Chat on eligible plans).

What you need first
- A Webflow site you can authorize and Publish.
- Optional Stripe Connect if you want card payments; Stripe deposits require the Pro plan or higher.
- AI Calendar Chat requires the Business plan or higher.
- Optional credentials for Google, Zoom, Microsoft, Mailchimp, GA4, or Meta Pixel if you enable those integrations.

Code applied to customer sites
- Slotwise registers and applies widget.js on your Webflow site via Custom Code (with integrity and crossorigin when registered through Webflow).
- The script runs on your published pages, renders the booking UI inside your mount (in-page), and does not use an externally hosted iframe as the booking surface.
- On uninstall, Slotwise removes App-applied site-level and page-level Custom Code. You Publish so the change goes live. Slotwise never publishes your site without your direct Publish action.

Plans (USD per month — same as https://slotwise.hindaralabs.com/#pricing)
- Free ($0/mo): 25 bookings/month, 1 staff, 2 themes, Webflow mount, publish from panel, email reminders. No Stripe deposits. No AI Calendar Chat.
- Pro ($15/mo): 500 bookings/month, 3 staff, 4 themes, Stripe deposits, SMS, analytics, buffers, import/export, online meeting location options.
- Business ($39/mo): unlimited bookings, 15 staff, all 8 themes, everything in Pro, plus AI Calendar Chat, waitlist, capacity, featured events.
- Agency ($99/mo): unlimited bookings, unlimited staff, all 8 themes, everything in Business, multi-site / agency-oriented use, priority support.

Feature gating (as built): Stripe deposits require Pro or higher. AI Calendar Chat requires Business or higher. Slotwise does not take a booking commission by default. Standard Stripe card processing fees still apply on paid bookings.

Documentation
Webflow install guide: https://slotwise.hindaralabs.com/docs/webflow

Support
hindarapro@gmail.com (Hindara Labs)

---

## 6) Short description (≤100 chars suggestion)

Webflow booking with in-page widget via Custom Code—no iframe. Free + paid plans.

---

## 7) Feature list (up to 5)

1. Designer mount + hosted widget.js (in-page booking UI)
2. Services, availability, branding, and staff dashboard
3. Stripe Connect payouts (0% Slotwise booking commission by default)
4. Google / Zoom / Teams / Mailchimp integrations
5. Optional GA4, Meta Pixel, and AI Calendar Chat (plan-gated)

---

## 8) Uninstall field (if separate from notes)

Use the “Uninstallation and Custom Code cleanup” section from the reviewer notes above (owner Publish required; no auto-publish).
