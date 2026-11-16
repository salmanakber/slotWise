# Slotwise Designer Extension

Webflow Designer Extension for placing and previewing the Slotwise booking widget.

## Publish a new version (Webflow upload)

Webflow asks for a zip created by the CLI. Do this from **`designer-extension/`** (not the Next.js root):

### 1. Prerequisites

- [Webflow CLI](https://developers.webflow.com/apps/docs/cli) installed (`npm i -g @webflow/webflow-cli` or use `npx`)
- Workspace **Admin** on the Hybrid App
- **2FA** enabled on your Webflow account (required or “Publish extension version” stays disabled)

### 2. Build + bundle

```bash
cd designer-extension
git pull origin main   # if you're on the live server, pull first
npm install
npm run bundle
```

(`npm run bundle` runs Vite build, then `npx @webflow/webflow-cli extension bundle`.)

That writes **`bundle.zip`** (must be under **5 MB**, no source maps).

Optional: set production app URL before build:

```bash
VITE_SLOTWISE_URL=https://slotwise.hindaralabs.com npm run build
```

### 3. Upload in Webflow

1. Open **Workspace settings → Apps & Integrations → Develop**
2. Select **Slotwise**
3. Click **Publish extension version**
4. Upload `designer-extension/bundle.zip`
5. Add short release notes → confirm

Docs: [How to bundle and upload your Designer Extension](https://developers.webflow.com/apps/docs/publishing-your-app)

### 4. Test the uploaded build

1. Open a site in the Designer
2. Open Apps → **Slotwise**
3. Click **Launch App** (not “Launch development app”)
4. Insert the booking embed, then publish the site

## Local development

```bash
cd designer-extension
npm install
npm run build
npx webflow extension serve
```

Then in Designer: **Launch development app**.

## Marketplace note

For Marketplace review of a Hybrid App, upload a separate **Source map artifact** ZIP on the submission form — never put `.map` files inside `bundle.zip`.

Support: tidyflaw@gmail.com
