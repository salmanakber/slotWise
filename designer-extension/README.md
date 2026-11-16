# Slotwise Designer Extension

Scaffold folder for the Webflow Designer Extension (Vite + React iframe app).

## Plan

1. Register a Hybrid App in Webflow (Designer Extension + Data Client).
2. `npm create @webflow/designer-extension` (or clone hybrid-app-starter).
3. Extension UI actions:
   - Place booking container on canvas
   - Open branding / theme picker
   - Trigger Custom Code install via our Next.js API
4. Local preview: `webflow extension serve` → Launch Development App.

Until that package is wired, use:

- Site admin Branding page for theme + install instructions
- `/book/{publicKey}` for the live widget
- `/public/embed/widget.js` for iframe embeds
