# Slotwise

Webflow-native booking app — Next.js, TypeScript, Prisma, PostgreSQL.

## Stack

- **Next.js 15** (App Router) + TypeScript
- **Prisma** + **PostgreSQL**
- Site admin (`/dashboard`) and platform owner console (`/platform`)
- Multi-theme branding + brand loader
- Hybrid Webflow app foundation (Designer Extension + Data Client next)

## Quick start

```bash
docker compose up -d
cp .env.example .env   # DATABASE_URL already matches compose defaults
npm install
npx prisma db push
npm run db:seed
npm run test:availability
npm run dev
```

## Surfaces

| URL | Purpose |
|---|---|
| `/` | Product home |
| `/book/sw_demo_studio_nine` | Live booking widget |
| `/manage/{token}` | Customer cancel / rebook (no login) |
| `/dashboard` | Site-owner admin |
| `/dashboard/branding` | 8 themes + brand loader + install |
| `/platform` | Slotwise platform console |
| `/embed/widget.js` | iframe embed loader |

## APIs (P0)

- `GET /api/v1/sites/:publicKey`
- `GET /api/v1/sites/:publicKey/slots?serviceId&date`
- `POST /api/v1/sites/:publicKey/bookings`
- `POST /api/v1/manage/:token/cancel`
- `GET /api/webflow/start` · `GET /api/webflow/callback`
- `POST /api/stripe/webhook`
- Platform: site status, feature flags, plan edits

## Design refs

Interactive HTML mocks live in `documents/`.
