# Slotwise — Stripe setup guide

Production app: `https://slotwise.hindaralabs.com`

---

## Webhook: “Your account” or “Connected accounts”?

Use **both** (same URL). They cover different events.

| Listen on | Events | Why |
|-----------|--------|-----|
| **Your account** | `payment_intent.succeeded` | Slotwise creates payments on the **platform**, then transfers to the connected seller (`transfer_data.destination`). Those PaymentIntents fire on **your** account. |
| **Connected accounts** | `account.updated` | When a seller finishes Express onboarding (charges/payouts enabled), Stripe sends this on the **connected** account. |

### How to add them in Stripe

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL (same for both):

   ```
   https://slotwise.hindaralabs.com/api/stripe/webhook
   ```

3. **First endpoint (or first listen option)**  
   - Listen to: **Events on your account**  
   - Events: `payment_intent.succeeded`

4. **Second endpoint (or Connected accounts listen)**  
   - Listen to: **Events on Connected accounts**  
   - Events: `account.updated`  
   - Same URL as above

If Stripe only lets you pick one listen type per endpoint, create **two endpoints** with the **same URL** — one for Your account, one for Connected accounts. Each has its own `whsec_…` secret; Slotwise currently stores **one** webhook secret, so prefer:

- Put **both** event types on one endpoint if your Stripe UI allows selecting both sources, **or**
- Start with **Your account** + `payment_intent.succeeded` + `account.updated` if Connect delivers `account.updated` to the platform in your mode, **or**
- Use Connected accounts for `account.updated` and Your account for payments — if you have two secrets, keep the **Your account** `whsec_` in Platform settings first (payments), then test Connect status updates.

**Practical recommendation for Slotwise today:**

1. Create endpoint → **Events on your account**  
   - `payment_intent.succeeded`  
   - `account.updated` (include it here too if offered)  
2. If `account.updated` only appears under Connected accounts, add a **second** endpoint for Connected accounts with `account.updated` (same URL).  
3. Paste the signing secret from the **primary (Your account)** endpoint into Slotwise as `whsec_…`.

---

## Full webhook URL

```
https://slotwise.hindaralabs.com/api/stripe/webhook
```

### Events Slotwise handles

- `payment_intent.succeeded` — marks booking paid  
- `account.updated` — updates connected account charges/payouts flags  

---

## Platform keys (you / Slotwise admin)

1. Open [Stripe Dashboard](https://dashboard.stripe.com)
2. Use **Test mode** while building (`pk_test_`, `sk_test_`)
3. **Developers → API keys** → copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or Platform → Stripe
   - Secret key → `STRIPE_SECRET_KEY` or Platform → Stripe
4. After creating the webhook, copy **Signing secret** (`whsec_…`) → Platform → Stripe → Webhook secret
5. Enable **Stripe Connect** on the platform (Express)
6. Keep **Application fee %** at `0` if Slotwise takes no commission

Paste keys in:

- **Platform → Stripe**, or  
- Server `.env`:

```env
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

---

## Connect (not OAuth “scopes”)

Stripe Connect does **not** use Google-style scopes. Slotwise uses **Express** accounts and requests:

- Capability: `card_payments`
- Capability: `transfers`

Site owners connect via:

**Dashboard → Payments → Connect Stripe account**

They complete Stripe’s onboarding; no webhook setup for them.

---

## Quick checklist

- [ ] Connect enabled (Express) on platform Stripe account  
- [ ] Publishable + secret keys saved in Platform / `.env`  
- [ ] Webhook URL: `https://slotwise.hindaralabs.com/api/stripe/webhook`  
- [ ] **Your account**: `payment_intent.succeeded`  
- [ ] **Connected accounts** (or Your account if available): `account.updated`  
- [ ] `whsec_…` saved as webhook secret  
- [ ] Test with Test mode keys, then switch to Live (`pk_live_`, `sk_live_`, live webhook)  

---

## Test vs Live

| Mode | Keys | Webhook |
|------|------|---------|
| Test | `pk_test_…` / `sk_test_…` | Separate test-mode endpoint + `whsec_` |
| Live | `pk_live_…` / `sk_live_…` | Separate live endpoint + `whsec_` |

Create the webhook **in the same mode** (Test/Live) as the keys you paste into Slotwise.

---

## Support

App contact: tidyflaw@gmail.com  
Domain: https://slotwise.hindaralabs.com  
