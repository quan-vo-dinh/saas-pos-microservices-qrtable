# Phase 5 — SePay Local and Mock Testing Policy

> **Status:** Canonical testing policy for Phase 5.
> **Scope:** SePay OAuth Connect, tenant payment settings, VietQR webhook routing, and live-provider smoke checks.

---

## 1. Problem

The current SePay OAuth app has a registered redirect URI that points to the temporary Vercel domain:

```text
https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
```

Local development still runs on `localhost` and may require Keycloak client changes plus a public tunnel for provider callbacks. If automated tests depend on the real SePay provider, Vercel preview domain, Keycloak public redirect setup, or a local tunnel, Phase 5 will test environment wiring instead of QRTable behavior.

---

## 2. Decision

1. Default Phase 5 automated tests must not call live SePay.
2. Default Phase 5 automated tests must not require Vercel, ngrok, cloudflared, or any public tunnel.
3. SePay-facing behavior is tested through unit mocks or a local mock SePay provider.
4. Live SePay checks are manual or opt-in smoke checks for public demo readiness, not PR or default local gates.
5. Tests must still prove QRTable-owned behavior:
   - OAuth state generation, TTL, consume, and replay rejection.
   - Callback forwarding and token exchange contract.
   - Token and webhook secret encryption.
   - Bank list normalization and bank selection.
   - Webhook URL generation from `PUBLIC_API_BASE_URL`.
   - `QRTBL` and `QRSUB` webhook routing, secret verification, idempotency, underpaid, and paid transitions.

---

## 3. Test Modes

| Mode              | Purpose                                                                                             | Provider dependency                                    | Default gate               |
| ----------------- | --------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------- |
| Unit/contract     | Pure policy, DTO, service behavior, URL generation, token encryption                                | Mock class/function only                               | PR/unit                    |
| Local integration | BFF/Payment/SaaS boundary with provider-like responses                                              | Local mock SePay server                                | Manual or integration gate |
| Browser E2E       | User-visible payment settings and callback journeys                                                 | Local mock SePay callback/token/bank/webhook responses | Pre-demo/manual            |
| Live SePay smoke  | Verify real provider credentials, registered redirect URI, and public callback/webhook reachability | Real SePay + public app/API URL                        | Manual opt-in only         |

---

## 4. Default Automated Environment

Automated local or CI-like tests that exercise SePay OAuth must use a local mock provider:

```env
SEPAY_OAUTH_BASE_URL=http://127.0.0.1:<mock-sepay-port>
SEPAY_OAUTH_CLIENT_ID=test-client-id
SEPAY_OAUTH_CLIENT_SECRET=test-client-secret
SEPAY_OAUTH_REDIRECT_URI=http://localhost:3001/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=http://localhost:3300
RUN_LIVE_SEPAY=
```

The mock provider must support only the minimum provider contract needed by QRTable:

- `GET /oauth/authorize` or a helper that returns a deterministic authorize URL.
- `POST /oauth/token`.
- `GET /api/v1/bank-accounts`.
- `GET /api/v1/bank-accounts/:uuid`.
- `POST /api/v1/webhooks`.

The mock must return deterministic bank accounts and webhook secrets. It must never require real SePay credentials.

---

## 5. Browser E2E Contract

Playwright tests must not automate real SePay login.

For the payment settings flow:

1. Owner clicks "Connect SePay" in QRTable.
2. QRTable creates OAuth state and returns an authorize URL pointing to the mock provider.
3. The test completes the callback with a seeded valid state and fake code.
4. Payment exchanges the fake code against the mock provider.
5. QRTable displays mock bank accounts.
6. Owner selects a mock bank.
7. Payment calls mock webhook upsert and stores encrypted token/webhook settings.

Invalid-state E2E tests can navigate directly to:

```text
/dashboard/payment-settings/sepay-callback?code=fake-code&state=invalid-state
```

and assert that the page is not blank and shows the expected failure state.

---

## 6. Webhook Testing Contract

Webhook tests do not need SePay to call a public URL. They should POST provider-shaped payloads directly to the BFF routes:

- `POST /api/v1/payment/sepay/webhook/:tenantSlug`
- `POST /api/v1/payment/sepay/webhook/platform`

Required assertions stay inside QRTable:

- Route split: `QRTBL` goes to Payment, `QRSUB` goes to SaaS.
- Stored secret value verification rejects invalid secrets.
- Underpaid transfers do not mutate terminal state.
- Duplicate delivery does not double-settle.
- Successful delivery marks the correct Payment or SubscriptionInvoice state.

---

## 7. Live SePay Smoke

Live SePay smoke is allowed only when explicitly opted in:

```env
RUN_LIVE_SEPAY=1
SEPAY_OAUTH_BASE_URL=https://my.sepay.vn
SEPAY_OAUTH_REDIRECT_URI=https://saas-pos-microservices-qrtable-mana.vercel.app/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=https://<stable-public-api-or-tunnel>
```

Live smoke must be documented as manual/pre-demo verification. It is skipped unless every required live env var is present and `RUN_LIVE_SEPAY=1`.

Live smoke may verify:

- Registered redirect URI matches the deployed callback page.
- Token exchange succeeds with real provider credentials.
- Bank list can be read from SePay.
- Webhook setup succeeds with the public API URL.
- A manually triggered provider webhook reaches the public BFF route.

Live smoke must not be required for PR, default local, or deterministic CI gates.

---

## 8. Acceptance Criteria

- Phase 5 documentation and tests distinguish default mock-provider coverage from live SePay smoke.
- No default automated test requires the temporary Vercel domain or a local tunnel.
- Any live-provider test has an explicit opt-in env guard and a clear skip reason.
- Traceability rows for SePay OAuth, payment settings, and webhook routing reference this policy when provider behavior is involved.
