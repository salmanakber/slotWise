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

That writes **`designer-extension/bundle.zip`** next to this README (must be under **5 MB**).

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
5. Add short release notes → confirm

Then in Designer: Apps → Slotwise → **Launch App** (not “Launch development app”).

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
