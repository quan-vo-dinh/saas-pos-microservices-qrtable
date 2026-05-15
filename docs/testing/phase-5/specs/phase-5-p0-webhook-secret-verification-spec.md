# Phase 5 P0 — Webhook Secret Value Verification Spec

> **Status:** Canonical mini-spec for Phase 5 before Step 5.2.
> **Rule ID:** `P0-PAY-X-SECRET-VALUE`.
> **Scope:** Phase 4B SePay tenant and platform webhook hardening.

---

## 1. Problem

Phase 4B added two webhook routes:

- Tier 1 tenant bill payment: `POST /payment/sepay/webhook/:tenantSlug`, reference prefix `QRTBL`.
- Tier 2 subscription invoice payment: `POST /payment/sepay/webhook/platform`, reference prefix `QRSUB`.

The current BFF route shape checks only that `x-secret-key` exists, then forwards the value to Payment or SaaS. Presence is not authentication. Before Phase 5 can mark this path as covered, the secret value must be verified against a server-side stored secret before any invoice, payment, outbox, audit-completion, or Order finalization mutation can happen.

---

## 2. Decision

1. `x-secret-key` presence check at BFF remains a fast edge validation, but it is not sufficient.
2. The authoritative verifier must be the service that owns the secret and the state mutation:
   - Tenant webhook (`QRTBL`) is verified by Payment Service against `tenant_payment_settings.webhook_secret_encrypted` for the route `tenantSlug` or resolved tenant.
   - Platform webhook (`QRSUB`) is verified by SaaS Service against the platform webhook secret from server-side configuration or future platform settings storage.
3. Secret comparison must use constant-time equality after decrypting or loading the stored secret.
4. A webhook with a missing, invalid, mismatched, or unconfigured secret must return an unauthorized/forbidden result and must not mutate domain state.
5. The request body must not be trusted for tenant identity. Tenant identity comes from the tenant route slug and server-side lookup.
6. Billing reference prefix remains an independent routing guard:
   - `QRTBL*` belongs only to the tenant Payment route.
   - `QRSUB*` belongs only to the platform SaaS route.
7. Raw secrets must not appear in responses, audit payloads, logs, or test snapshots.

---

## 3. Required Behavior

### 3.1 Tenant Webhook

For `POST /payment/sepay/webhook/:tenantSlug`:

- BFF rejects a missing `x-secret-key` before forwarding.
- BFF forwards `tenantSlug`, `x-secret-key`, payload, and `processId` to Payment.
- Payment resolves the tenant payment settings by `tenantSlug` or by a trusted tenant lookup tied to that slug.
- Payment decrypts `webhook_secret_encrypted` through `PaymentSecretsService`.
- If the stored secret is missing, invalid, or mismatched, Payment rejects the webhook and does not settle a payment.
- A valid secret still requires normal `QRTBL` reference matching, incoming transfer type, idempotency, and amount checks.

### 3.2 Platform Webhook

For `POST /payment/sepay/webhook/platform`:

- BFF rejects a missing `x-secret-key` before forwarding.
- BFF forwards `x-secret-key`, payload, and `processId` to SaaS.
- SaaS verifies the value against the configured platform webhook secret before calling subscription invoice matching.
- If the secret is missing, invalid, mismatched, or unconfigured, SaaS rejects the webhook and does not mark an invoice paid.
- A valid secret still requires normal `QRSUB` reference matching, pending invoice status, idempotency, and amount checks.

---

## 4. Test Contract

Phase 5 Step 5.2 can add tests only after the verifier behavior exists.

Provider delivery, public callback reachability, and tunnel/Vercel configuration are not part of this default test contract; follow `phase-5-sepay-local-mock-testing-policy.md` for mock-vs-live separation.

Required fast tests:

- BFF controller: missing `x-secret-key` rejects for both routes.
- BFF controller: present secret forwards route context to the correct service without logging or returning the secret.
- Payment tenant verifier: valid tenant secret allows normal `QRTBL` settlement.
- Payment tenant verifier: invalid tenant secret returns unauthorized/forbidden and does not save payment changes, outbox rows, or Order `markBillPaid` calls.
- Payment tenant verifier: valid secret for tenant A cannot settle tenant B through a mismatched `tenantSlug`.
- SaaS platform verifier: valid platform secret allows normal `QRSUB` invoice payment.
- SaaS platform verifier: invalid platform secret does not mark the invoice paid or assign a subscription.
- Prefix isolation: `QRTBL` sent to the platform route and `QRSUB` sent to the tenant route do not mutate state.

Optional integration test:

- BFF to service-owner boundary with one seeded tenant secret and one seeded platform secret, proving invalid secret requests fail before domain mutation.

---

## 5. Out of Scope

- Full secret rotation UI.
- Provider certification or live SePay webhook replay.
- Public tunnel or temporary Vercel redirect validation in default automated tests.
- Replacing the Phase 3 direct HMAC webhook route.
- Multi-bank platform webhook management.

---

## 6. Acceptance Criteria

- `P0-PAY-X-SECRET-VALUE` can move from `security-gap` to `covered` only when tenant and platform secret values are verified against server-side storage and tested.
- Existing tests that only assert route presence or secret presence are not enough.
- Invalid webhook secrets leave Payment, SubscriptionInvoice, Subscription, outbox, and Order state unchanged.
