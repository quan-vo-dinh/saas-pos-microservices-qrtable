# Phase 4B demo checklist (manual)

## 1. Platform setup

- [ ] `SEPAY_OAUTH_CLIENT_ID` — set (value not documented here).
- [ ] `SEPAY_OAUTH_CLIENT_SECRET` — set (server only).
- [ ] `SEPAY_OAUTH_REDIRECT_URI` — matches SePay app registration (e.g. Vercel callback path).
- [ ] `PAYMENT_SECRETS_ENCRYPTION_KEY` — 32-byte hex.
- [ ] Platform SePay Tier 2 webhook secret configured on provider side.

## 2. SUPER_ADMIN

- [ ] Create tenant; verify slug and plan.
- [ ] Suspend tenant; confirm customer PWA banner and blocked ordering.
- [ ] Activate tenant; confirm customer controls re-enabled.

## 3. Tenant owner

- [ ] Login; open subscription; checkout VietQR if applicable.
- [ ] Payment settings: SePay OAuth connect + bank selection.

## 4. Customer PWA

- [ ] Scan QR; menu loads; submit order when ACTIVE.
- [ ] After suspend: banner visible; add to cart / submit blocked; VietQR for existing `PENDING_PAYMENT` bill still works.

## 5. Public landing (`/`)

- [ ] Pricing loads; CTAs work; no horizontal scroll on mobile.
