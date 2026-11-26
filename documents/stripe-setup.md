# Slotwise — Stripe setup guide

Production app: `https://slotwise.hindaralabs.com`

---

## Webhook: “Your account” or “Connected accounts”?

Use **both** (same URL). They cover different events.

| Listen on | Events | Why |
|-----------|--------|-----|
| **Connected accounts** | `payment_intent.succeeded` | Slotwise uses **direct charges** on the connected account (Managed Risk). Those PaymentIntents fire on the **connected** account. |
| **Connected accounts** | `account.updated` | When a seller finishes Express onboarding (charges/payouts enabled), Stripe sends this on the **connected** account. |

### How to add them in Stripe

1. Stripe Dashboard → **Developers → Webhooks → Add endpoint**
2. Endpoint URL (same for both):

   ```
   https://slotwise.hindaralabs.com/api/stripe/webhook
   ```

3. Listen to: **Events on Connected accounts**  
   - Events: `payment_intent.succeeded`, `account.updated`

4. Paste that endpoint’s signing secret (`whsec_…`) into Slotwise Platform → Stripe.

**Practical recommendation for Slotwise today:**

1. Create endpoint → **Events on Connected accounts**  
   - `payment_intent.succeeded`  
   - `account.updated`  
2. Same URL: `https://slotwise.hindaralabs.com/api/stripe/webhook`  
3. Paste that `whsec_…` into Platform → Stripe.

---

## Full webhook URL

```
https://slotwise.hindaralabs.com/api/stripe/webhook
```

### Events Slotwise handles

**On your platform account** (Listen to: Events on your account):

- `checkout.session.completed` — applies paid plan upgrades after Stripe Checkout  

**On Connected accounts**:

- `payment_intent.succeeded` — marks booking paid  
- `account.updated` — updates connected account charges/payouts flags  

Use the **same webhook URL** for both endpoints if Stripe asks you to split them.

---

## Platform keys (you / Slotwise admin)

1. Open [Stripe Dashboard](https://dashboard.stripe.com)
2. Use **Test mode** while building (`pk_test_`, `sk_test_`)
3. **Developers → API keys** → copy:
   - Publishable key → `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` or Platform → Stripe
   - Secret key → `STRIPE_SECRET_KEY` or Platform → Stripe
4. After creating the webhook, copy **Signing secret** (`whsec_…`) → Platform → Stripe → Webhook secret
5. Enable **Stripe Connect** on the platform  
   - Slotwise creates connected accounts with **Accounts v2** + **Managed Risk**: Express dashboard, `fees_collector` / `losses_collector` = `stripe`, **merchant** `card_payments`  
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

Stripe Connect does **not** use Google-style scopes. Slotwise uses **Accounts v2** with **Managed Risk** (Express):

- Configuration: **merchant**
- Capability: `card_payments`
- Responsibilities: Stripe collects fees and losses (`stripe`) — [Managed Risk](https://docs.stripe.com/connect/risk-management/connected-accounts-with-managed-risk)
- Onboarding: `POST /v2/core/account_links` with `Stripe-Version: 2026-10-28.preview`
- Charges: **direct charges** on the connected account (`stripeAccount` header)

Site owners connect via:

**Dashboard → Payments → Connect Stripe account**

They complete Stripe’s onboarding; no webhook setup for them.

If you ever need legacy `POST /v1/accounts` for a supported compatibility case, enable [Accounts v1 support](https://dashboard.stripe.com/settings/developers/api-policies/feat_accounts_v1_support) in the Dashboard. New Slotwise connects use v2 only.

---

## Quick checklist

- [ ] Connect enabled on platform Stripe account (Accounts v2 / Express Managed Risk)  
- [ ] Publishable + secret keys saved in Platform / `.env`  
- [ ] Webhook URL: `https://slotwise.hindaralabs.com/api/stripe/webhook`  
- [ ] **Connected accounts**: `payment_intent.succeeded`, `account.updated`  
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

App contact: hindarapro@gmail.com  
Domain: https://slotwise.hindaralabs.com  
