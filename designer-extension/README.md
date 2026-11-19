# Slotwise Designer Extension

Webflow Designer Extension for placing and previewing the Slotwise booking widget.

## Publish a new version (Webflow upload)

Webflow asks for a zip created by the CLI. Do this from **`designer-extension/`** (not the Next.js root), on your **local machine**.

### 1. Prerequisites

- [Webflow CLI](https://developers.webflow.com/apps/docs/cli) installed (`npm i -g @webflow/webflow-cli` or use `npx`)
- Workspace **Admin** on the Hybrid App
- **2FA** enabled on your Webflow account (required or “Publish extension version” stays disabled)

### 2. Build + bundle (local)

```bash
cd designer-extension
npm install
npm run bundle
```

That writes next to this README:

| File | Use |
|------|-----|
| **`bundle.zip`** | Public Designer Extension upload (must be under **5 MB**) |
| **`source-maps.zip`** | **Private** source-map artifact for Marketplace review (do **not** put inside `bundle.zip`) |

`npm run bundle` already sets `VITE_SLOTWISE_URL` to `https://slotwise.hindaralabs.com`. Override if needed:

```bash
VITE_SLOTWISE_URL=https://slotwise.hindaralabs.com npm run bundle
```

### 3. Upload that local zip in Webflow

**Important:** upload the file you just built on your Mac:

`/Users/macbook/slotWise/designer-extension/bundle.zip`

1. Open **Workspace settings → Apps & Integrations → Develop**
2. Select **Slotwise**
3. Click **Publish extension version**
4. Upload **`designer-extension/bundle.zip`** from your project (not from Downloads unless you copied it there yourself)
5. When the form asks for **source maps**, upload **`designer-extension/source-maps.zip`** as the private artifact (same build as the bundle)
6. Add short release notes → confirm

Then in Designer: Apps → Slotwise → **Launch App** (not “Launch development app”).

### Marketplace preflight — source maps

Review fails with *“Generated code is not traceable…”* if maps are missing or from a different build.

- Maps are **version 3**, produced by the same `npm run bundle` that creates `bundle.zip`
- Upload `source-maps.zip` as the **private** source-map artifact
- Do **not** ship `.map` files inside the public `bundle.zip` (the prepare script strips them)

### Marketplace preflight — runtime files to pin

A **runtime** is JS your app loads on the **published Webflow site**, outside `bundle.zip`.

**Pin this entry runtime** (hosted Custom Code / install script):

| Runtime URL | Notes |
|-------------|--------|
| `https://slotwise.hindaralabs.com/embed/widget.js` | Host-page embed loader. Registers via Webflow hosted scripts API with integrity. **No child scripts** — it only creates an iframe. |

**How to verify on your published test page**

1. Open the published test page in a new tab  
2. DevTools → **Network** → filter **JS** → reload and open the booking widget once  
3. You should see `widget.js` as the host-page entry (if Custom Code / registered script is applied)  
4. Inside the booking **iframe** you will also see Next.js chunks from `slotwise.hindaralabs.com` (`/_next/static/...`). Those run **inside the iframe document**, not as host-page children of `widget.js`. If the review form asks only for host-page runtimes created by your install script, pin **`widget.js` only**. If it asks for every JS the visitor loads while using the app, list the iframe Next chunks from that Network panel as separate runtime URLs for that test package.

**Install path note:** Preferred Marketplace install places a canvas **iframe** (`/book/{publicKey}?embed=1`) and does not require pasting a script. `widget.js` is the runtime when the hosted/registered script path is used.

#### Why `scp` looked like the “same” old bundle

This command **downloads** the **server’s** copy into Downloads (old file):

```bash
# WRONG for publishing — pulls FROM droplet TO your Mac
scp -i ~/.ssh/montwebsite root@164.90.220.70:/var/www/slotwise/designer-extension/bundle.zip ~/Downloads/slotwise-bundle.zip
```

The Designer Extension is uploaded to **Webflow**, not run from the droplet. Use the local `bundle.zip` after `npm run bundle`.

If you still want a copy on the droplet for backup, **upload** local → server:

```bash
# OPTIONAL backup only — push LOCAL new zip TO droplet
scp -i ~/.ssh/montwebsite \
  /Users/macbook/slotWise/designer-extension/bundle.zip \
  root@164.90.220.70:/var/www/slotwise/designer-extension/bundle.zip
```

Docs: [How to bundle and upload your Designer Extension](https://developers.webflow.com/apps/docs/publishing-your-app)

## Local development

```bash
cd designer-extension
npm install
npm run build
npx webflow extension serve
```

Then in Designer: **Launch development app**.

## Install URL (Webflow app settings)

Set the Hybrid App **Install URL** to:

`https://slotwise.hindaralabs.com/api/webflow/install`

Do **not** point Install URL at `/login` or `/dashboard/*`.

After authorize, users land on `/install?status=connected` which:
1. Says **you can close this window**
2. Opens Designer with Slotwise via deep link `https://<site>.design.webflow.com?app=<clientId>`

Support: tidyflaw@gmail.com
