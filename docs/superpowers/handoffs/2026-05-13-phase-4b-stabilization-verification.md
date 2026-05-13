# Phase 4B Stabilization Verification

## Code State

- Branch: main
- Commit before stabilization: 436e7a8 docs: add phase 4b stabilization fix plan
- Commit after stabilization: this commit; first code commit after `436e7a8`

## Static Verification

```txt
pnpm nx test saas --runInBand --skip-nx-cache
PASS: 12 suites, 33 tests

pnpm nx test payment --runInBand --skip-nx-cache
PASS: 8 suites, 40 tests

pnpm nx test bff --runInBand --skip-nx-cache
PASS: 23 suites, 118 tests

pnpm nx test management-app --runInBand --skip-nx-cache
PASS: 33 suites, 140 tests

pnpm nx run-many -t build -p saas,payment,bff,management-app --skip-nx-cache
PASS: saas, payment, bff, management-app

pnpm nx run-many -t lint -p saas,payment,bff,management-app --skip-nx-cache
PASS: 0 errors. Existing warnings remain in BFF permission/tenant guard specs and management-app POS/Menu/Table areas.

pnpm nx test bff --runInBand --skip-nx-cache && pnpm nx lint bff --skip-nx-cache
PASS: rerun after guard spec cleanup; BFF lint has 0 errors, 4 pre-existing warnings outside touched files.

PAYMENT_PORT=4308 TCP_PAYMENT_SERVICE_PORT=4208 node dist/apps/payment/main.js
PASS: after sourcing .env, PaymentModule boots; Payment HTTP localhost:4308 and TCP localhost:4208 started.

SAAS_PORT=4306 TCP_SAAS_SERVICE_PORT=4206 node dist/apps/saas/main.js
PASS: after sourcing .env, AppModule boots; SaaS HTTP localhost:4306 and TCP localhost:4206 started.

git diff --check
PASS
```

Build warnings observed but not introduced by this stabilization:

- Next.js 16 warns that the `middleware` convention is deprecated in favor of `proxy`.
- Recharts logs width/height `-1` warnings during management-app static generation.

## Services Started

- BFF: not started in this verification pass
- SaaS: started directly from `dist/apps/saas/main.js` on temporary ports `4306/4206`; startup passed
- Payment: started directly from `dist/apps/payment/main.js` on temporary ports `4308/4208`; startup passed
- Authorizer: not started in this verification pass
- User-Access: not started in this verification pass
- Redis/Postgres/Mongo: not started in this verification pass

## Runtime Smoke

Command:

```bash
BFF_BASE_URL=http://localhost:3300/api/v1 \
ACCESS_TOKEN='<redacted>' \
TENANT_ID='<tenant-id>' \
tools/demo/phase-4b-dashboard-smoke.sh
```

Result:

```txt
Not run in this verification pass because no live authenticated local stack/access token was provided.
Use this script after starting BFF/SaaS/Payment/Authorizer/User-Access and obtaining a real management-app access token.
```

## Browser Verification

- Date: 2026-05-13
- Tools: Chrome plugin with existing local Keycloak sessions for desktop authenticated routes; Browser in-app viewport override for 390x844 mobile routes.
- Dev servers observed running: management-app `http://localhost:3000`, customer-pwa `http://localhost:5173`, BFF `http://localhost:3300`.
- Desktop SUPER_ADMIN routes passed visual smoke with no blank page and no console errors:
  - `/admin/tenants`
  - `/admin/tenants/023772bb-391b-401c-936a-ed7034b69cec`
  - `/admin/plans`
  - `/admin/billing`
- Desktop OWNER routes passed visual smoke with no blank page and no console errors:
  - `/dashboard/subscription`
  - `/dashboard/payment-settings`
  - `/dashboard/payment-settings/sepay-callback?code=test&state=test`
- Dashboard 401/500 check: `/dashboard/subscription` and `/dashboard/payment-settings` rendered authenticated OWNER UI; no 401/500 screen was observed.
- OAuth callback check: invalid test `state` rendered an in-page `INVALID_SEPAY_OAUTH_STATE` message with a return link; it did not blank or crash.
- Payment settings secrecy check: page showed `NOT_CONNECTED`, masked/empty account fields, and no SePay client secret/access token/refresh token text.
- Desktop interaction checks passed:
  - `/admin/tenants`: filters/table visible, row action menu opened, onboard dialog fields fit.
  - Tenant detail: tabs visible, destructive close dialog is red/destructive and requires typed tenant name.
  - `/admin/plans`: table visible, create-plan dialog fields fit and long feature labels wrap.
  - `/admin/billing`: filters/table visible; no pending invoice existed, so manual confirm/QR dialog was not data-available.
- Mobile 390x844 Browser pass:
  - `/`: QRTable and pricing CTA visible in first viewport; no blank screen or obvious overlap.
  - `/admin/tenants`: filters stack; table remains inside a horizontal table area; onboard dialog fits.
  - `/dashboard/subscription`: page renders; no blank screen or obvious overlap. No invoice/plan row existed, so checkout QR dialog was not data-available.
  - `/dashboard/payment-settings`: page renders; no blank screen, no full account number, no secrets.
  - customer-pwa active QR flow for `pho-viet`: seed QR landing verified, `Vào Menu` opened `/menu`, menu/cards/cart controls visible.
- Suspended customer-pwa browser check: blocked by data gap. Current seed/UI exposed only active tenant `pho-viet`; no real suspended tenant route was available. Do not mark this as passed from browser. Automated suspended-state tests remain the evidence for component behavior.

## Notes

- Do not paste access tokens or SePay secrets into this file.
- Stabilization focused on root causes behind `/dashboard/subscription` and `/dashboard/payment-settings` failures:
  - secured BFF controllers must be recognized at class metadata level by both `UserGuard` and `SessionGuard`;
  - dashboard queries must wait for auth hydration before calling BFF;
  - BFF Phase 4B routes must target TCP patterns implemented by SaaS/Payment services;
  - injectable services with primitive/object constructor config must use explicit Nest DI tokens;
  - injectable services must depend on concrete provider classes, not inline structural object types;
  - payment settings GET must be idempotent for tenants without an existing settings row;
  - subscription invoice webhook/manual confirm must be idempotent against duplicate paid events.
