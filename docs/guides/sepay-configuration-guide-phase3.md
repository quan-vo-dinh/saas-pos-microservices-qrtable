# SePay configuration instructions for QRTable — VietQR, webhooks, OAuth Connect

This document describes **from start to finish** the steps needed **outside the codebase** (SePay dashboard, bank account, public URL, environment variables) so QRTable can receive Bank Hub webhooks and run **Tier 1 OAuth Connect** (tenant bill payments) and **Tier 2 subscription** (platform `QRSUB`) flows.

**Internal references:** [phase-3-payment.md](../phases/phase-3-payment.md), [phase-4b-saas-onboarding.md](../phases/phase-4b-saas-onboarding.md), [phase-5-sepay-local-mock-testing-policy.md](../testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md), [tools/sepay/README.md](../../tools/sepay/README.md) (manual OAuth smoke before go-live).

**SePay technical reference:** [developer.sepay.vn](https://developer.sepay.vn) — Bank Hub webhook, OAuth2 Connect, sandbox transaction API.

> **Last synced with code:** 2026-05-26 (`a484992` tenant OAuth connect hardening, `867bd09` platform webhook `Authorization: Apikey`, `QRSUB` match from `content` when `code` is null).

---

## 0. Three BFF webhook routes (do not mix them)

All paths are under BFF global prefix `api/v1` (see `AppModule.CONFIGURATION.GLOBAL_PREFIX`).

| Route                          | Full path                                        | Tier                           | Auth accepted by BFF                                                        | Secret / verification                                   | Billing reference                                  |
| ------------------------------ | ------------------------------------------------ | ------------------------------ | --------------------------------------------------------------------------- | ------------------------------------------------------- | -------------------------------------------------- |
| **Legacy direct (Phase 3)**    | `POST /api/v1/payment/sepay/webhook`             | Dev/legacy VietQR              | `X-SePay-Signature` + `X-SePay-Timestamp` (HMAC raw body)                   | `SEPAY_WEBHOOK_SECRET`                                  | `QRTBL` + 8 chars (`code` or `content`)            |
| **Tenant (Phase 4B Tier 1)**   | `POST /api/v1/payment/sepay/webhook/:tenantSlug` | Customer → tenant bills        | `x-secret-key`, `api-key`, `x-api-key`, or `Authorization: Apikey <secret>` | Per-tenant secret stored by Payment after OAuth Connect | `QRTBL`                                            |
| **Platform (Phase 4B Tier 2)** | `POST /api/v1/payment/sepay/webhook/platform`    | Tenant → platform subscription | Same headers as tenant route                                                | `SEPAY_PLATFORM_WEBHOOK_SECRET` (SaaS verifies)         | `QRSUB` (+ match from `content` if `code` is null) |

**Common mistakes during re-setup:**

- Registering only the Phase 3 URL while testing **subscription** (`QRSUB`) — use **`/webhook/platform`**.
- Registering tenant URL without **tenant slug** in the path — URL must match `PUBLIC_API_BASE_URL` + `/api/v1/payment/sepay/webhook/{slug}` (shown in Management App payment settings after connect).
- SePay dashboard sends `Authorization: Apikey <secret>` but BFF was configured only for `x-secret-key` — current BFF accepts both (since 2026-05-26).

Tier 1 webhook URL is **created/configured during OAuth Connect** (Payment service), not copied from the Phase 3 single URL.

---

## 1. Which “branch” of SePay are you integrating?

SePay has many products. **QRTable Phase 3** uses the model:

| Ingredients                          | Role                                                                                                                                                                                           |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **VietQR (QR photo)**                | Build URL `https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...` — **no redirect**, embed `<img>` on POS/PWA.                                                                           |
| **Bank Hub / Transactional Webhook** | When there is a money change in the connected account, SePay **POST JSON** to the webhook URL you configured; Authenticate with header **`X-Secret-Key`** if you choose type **`SECRET_KEY`**. |

**Not to be confused with:** IPN / “Payment Gateway” (different JSON schema, for example there are `notification_type`, `order`, `transaction` — see IPN documentation on [developer.sepay.vn](https://developer.sepay.vn)). Your Phase 3 backend matches the **payload Bank Hub** which has fields of type `id`, `transferType`, `transferAmount`, `code`, `content`, … like the document entry [Webhook integration](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook).

---

## 2. Prepare before opening the dashboard

1. **Environmental decisions**
   - **Sandbox:** suitable for dev/demo; There is a transaction simulation API (see section 9).
   - **Production:** needs a real HTTPS domain, a bank account to receive real money linked to SePay.

2. **Prepare QRTable webhook URLs (BFF)** — pick the row from section 0:

   ```text
   # Phase 3 legacy / HMAC lab
   https://<bff-host>/api/v1/payment/sepay/webhook

   # Phase 4B Tier 1 — replace {tenantSlug} (e.g. pho-viet)
   https://<bff-host>/api/v1/payment/sepay/webhook/{tenantSlug}

   # Phase 4B Tier 2 — platform subscription
   https://<bff-host>/api/v1/payment/sepay/webhook/platform
   ```

   `<bff-host>` must be reachable from the internet (tunnel or staging). Management App shows the tenant webhook URL when `PUBLIC_API_BASE_URL` is set.

3. **Prepare env values** (see `.env.example`):

   | Variable                                             | Used for                                                                                    |
   | ---------------------------------------------------- | ------------------------------------------------------------------------------------------- |
   | `SEPAY_WEBHOOK_SECRET`                               | HMAC route `POST .../payment/sepay/webhook` only                                            |
   | `SEPAY_PLATFORM_WEBHOOK_SECRET`                      | Platform route `.../webhook/platform` (`QRSUB`)                                             |
   | `SEPAY_OAUTH_*`                                      | Tier 1 OAuth Connect (`SEPAY_OAUTH_BASE_URL`, `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI`) |
   | `PUBLIC_API_BASE_URL`                                | BFF public origin for generated tenant webhook URLs                                         |
   | `PAYMENT_SECRETS_ENCRYPTION_KEY`                     | Encrypt tenant OAuth tokens and webhook secrets in Payment DB                               |
   | `PAYMENT_SEPAY_QR_ACCOUNT` / `PAYMENT_SEPAY_QR_BANK` | Static VietQR `acc` / `bank` when not using tenant OAuth account                            |
   | `BILL_REF_PREFIX`                                    | Default `QRTBL`; subscription uses `QRSUB` via `BILL_REF_PREFIXES.SUBSCRIPTION` in code     |

---

## 3. Step 1 — SePay account and bank link

**Goal:** SePay has the right to read statement / SMS changes (depending on actual configuration) to detect transfer to the correct **account number** you used in QR.

1. Register/login [SePay](https://sepay.vn) (or sandbox environment according to SePay instructions).
2. In the dashboard, make **connect your business bank account** (or equivalent sandbox account).
3. Record:
   - **Account number** (`acc` in VietQR URL).
   - **Bank name** in correct SePay format (eg `Vietcombank`) — parameter `bank` in VietQR URL.

**Explanation:** The project's VietQR **does not call the SePay API to "create an order"** before displaying the QR; Just need the correct URL + SePay to receive the transaction to the correct account for the webhook to be sent to BFF.

---

## 4. Step 2 — Configure Webhook (Bank Hub)

**Goal:** Every time there is a **money in** transaction (`transferType`: `in`), SePay **POST** JSON to your server.

### 4.1. Important fields (according to SePay documentation)

Pick the URL from **section 0** (legacy HMAC vs `/{tenantSlug}` vs `/platform`). Examples:

- Tier 2 platform: `https://api.yourdomain.com/api/v1/payment/sepay/webhook/platform`
- Tier 1 tenant: `https://api.yourdomain.com/api/v1/payment/sepay/webhook/{tenantSlug}`
- Phase 3 lab only: `https://api.yourdomain.com/api/v1/payment/sepay/webhook` (HMAC — not for `QRSUB`)

- **`auth_type`:** for tenant/platform routes, **`SECRET_KEY`** with header **`X-Secret-Key`** or **`Authorization: Apikey <secret>`** (BFF accepts both). Legacy HMAC route uses `X-SePay-Signature` / `X-SePay-Timestamp` instead.
- **`secret_key`:** platform → `SEPAY_PLATFORM_WEBHOOK_SECRET`; tenant → stored per tenant after OAuth Connect; legacy → `SEPAY_WEBHOOK_SECRET`.
- **`active`:** enable webhooks (e.g. `1`).
- **`allow_events`:** SePay UI/API dependency; You can use `["*"]` to receive all events (follow the Upsert webhook API example in the Bank Hub documentation). For Phase 3, the main flow is **input transactions** — making sure not to accidentally turn off the relevant event type.

### 4.2. Two ways to create/update (choose one)

**Method A — Via SePay dashboard (popular for operators)**
Go to the **Webhook / Bank Hub** management section (menu name may change according to dashboard version), fill in the corresponding fields in section 4.1.

**Method B — Via API (sandbox)**
The SePay documentation describes the webhook upsert endpoint, for example:

- `POST https://bankhub-api-sandbox.sepay.vn/v1/webhook`
- Body JSON includes `webhook_url`, `auth_type`, `secret_key`, `active`, `allow_events` (needs a valid **access token** according to SePay's OAuth/API guidelines).

**Note SSRF / URL:** The API may reject invalid URLs or internal IPs — use public hostname (tunnel or staging).

---

## 5. Step 3 — Understand webhook payload (to test properly)

According to [Webhook integration](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), the body includes typical fields:

| Field                          | Short meaning                                                                           |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| `id`                           | Transaction ID on SePay                                                                 |
| `gateway`                      | Name/bank                                                                               |
| `transactionDate`              | Time                                                                                    |
| `accountNumber`                | STK                                                                                     |
| `code`                         | **Optional** — the payment code SePay attempts to identify from the content; can `null` |
| `content`                      | Transfer content                                                                        |
| `transferType`                 | `in` = money in, `out` = money out                                                      |
| `transferAmount`               | Amount (VND, integer)                                                                   |
| `referenceCode`, `description` | Reference / SMS raw                                                                     |

**Phase 3 QRTable** only handles **`transferType === "in"`** and matches bill codes (`QRTBL` + 8 characters) via `code` or regex on `content` — see [phase-3-payment.md](../phases/phase-3-payment.md).

---

## 6. Step 4 — Configure payment code recognition (`QRTBL` and `QRSUB`)

### 6.1 Restaurant bills — prefix `QRTBL`

According to the SePay documentation, field `code` is populated when SePay **recognizes** a pattern in the content — the configuration is located at **Company → General Configuration** (dashboard).

**What you need to do for QRTable:**

1. Enable/configure code recognition with prefix **`QRTBL`** (matches `BILL_REF_PREFIX` in env).
2. Purpose: when a customer transfers money with content containing `QRTBLXXXXXXXX`, the webhook may have a different `code` than `null`, helping to match the bill faster; if still `null`, the backend can still fallback the regex on `content`.

### 6.2 Platform subscription — prefix `QRSUB`

For Tier 2 subscription invoices, transfer content must contain a reference matching `QRSUB` + 10 alphanumeric characters (see `subscription-invoice.service.ts`). Configure SePay code recognition for **`QRSUB`** when possible.

If SePay leaves `code` null, SaaS still parses `content` / `referenceCode` (fixed 2026-05-26). Always include the full `QRSUB…` string in the transfer description when testing manually.

Platform webhook URL: `https://<bff>/api/v1/payment/sepay/webhook/platform` with secret `SEPAY_PLATFORM_WEBHOOK_SECRET` (header `x-secret-key` or `Authorization: Apikey …`).

---

## 7. Step 5 — Synchronize application environment variables

Once you have the value from SePay and your bank account, configure the monorepo side (BFF + Payment service — your `.env` / secret manager file):

| Variable                        | Source of truth                                                                                                                                                                                                                    |
| ------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `SEPAY_WEBHOOK_SECRET`          | Secret used for selected webhook auth: direct Phase 3 route now uses HMAC raw-body; SePay's SECRET_KEY mode uses the `X-Secret-Key` header if the route is configured according to that path.                                      |
| `SEPAY_PLATFORM_WEBHOOK_SECRET` | Current server-side secret for Webhook subscription platform Phase 4B (`QRSUB`). tenant route `QRTBL` does not get the secret from this public env; Payment verify with `tenant_payment_settings.webhook_secret_encrypted`.        |
| `BFF_PAYMENT_TCP_TIMEOUT_MS`    | Timeout BFF waits for Payment service via TCP; default `5000`                                                                                                                                                                      |
| `PAYMENT_SEPAY_QR_ACCOUNT`      | STK receives money (same as `acc` in VietQR URL)                                                                                                                                                                                   |
| `PAYMENT_SEPAY_QR_BANK`         | Bank name SePay accepts (same as `bank` in URL)                                                                                                                                                                                    |
| `PAYMENT_ORDER_TCP_TIMEOUT_MS`  | Timeout Payment service waits for Order service via TCP; default `5000`                                                                                                                                                            |
| `BILL_REF_PREFIX`               | Usually `QRTBL`                                                                                                                                                                                                                    |
| `PAYMENT_TYPEORM_DATABASE`      | **Staging/production:** separate database for Payment (eg `qrtable_payment`). Dev can fallback `TYPEORM_DATABASE`; See phase record `docs/phases/phase-3-payment.md` and Payment architecture in `docs/technical-architecture.md`. |

**Authentication explanation:**

- **Direct route:** HMAC only (`verify-sepay-webhook-secret.ts` + `SepayWebhookSecretGuard`).
- **Tenant/platform routes:** Plain secret in header — `x-secret-key`, `api-key`, `x-api-key`, or `Authorization: Apikey <token>` / `Bearer <token>`. SaaS/Payment compare to stored platform or per-tenant secret.
- **OAuth Connect:** Requires `SEPAY_OAUTH_CLIENT_ID`, `SEPAY_OAUTH_CLIENT_SECRET`, `SEPAY_OAUTH_REDIRECT_URI` registered in SePay; Payment validates secrets before consuming OAuth `state` (commit `a484992`). Manual credential check: [tools/sepay/README.md](../../tools/sepay/README.md).

Do not point all three routes at the same SePay webhook entry unless you intentionally use the same auth model (they differ).

**Pipeline webhook BFF (safe refactor):** (1) `SepayWebhookSecretGuard` or equivalent — reject early if secret is wrong; (2) `ValidationPipe` + DTO runtime (`class-validator`) on Bank Hub body — reject malformed payload before calling Payment over TCP. The endpoint is still a public URL but **doesn't** receive arbitrary, unvalidated JSON.

**Response explanation:** The webhook endpoint returns the raw body `{"success": true}` after passing the payload to the Payment service. Do not use the `ResponseDto` wrapper for this callback alone, because the SePay documentation requires the success body to be in the form `{"success": true}` and complete in 30 seconds.

---

## 8. Step 6 — Dev local: how can SePay call your phone?

SePay sends a webhook **from the internet** to `webhook_url`. The `localhost` **does not** receive directly unless you use:

- **HTTPS Tunnel:** ngrok, Cloudflare Tunnel, localtunnel, …
- Or deploy BFF to **staging with HTTPS**.

**Checklist nhanh:**

- [ ] URL in SePay dashboard **correct** path `/api/v1/payment/sepay/webhook`
- [ ] Tunnel points to the correct BFF port (usually `3000` according to AGENTS.md)
- [ ] Firewall / security group allows inbound (if staging)

---

## 9. Step 7 — Test sandbox using transaction simulator API (optional but recommended)

The SePay documentation describes the **sandbox only** endpoint:

```http
POST https://bankhub-api-sandbox.sepay.vn/v1/transaction/create
```

Body includes:

- `bank_account_xid` (UUID of bank account registered in Bank Hub)
- `transfer_type`: `credit` (money in)
- `amount`: VND amount
- `transaction_content`: should contain `QRTBL...` code like real stream

Request with **access token** OAuth/API (401 if wrong token). This endpoint helps **end-to-end webhook testing** without the need for a physical bank transfer.

---

## 10. Step 8 — Manual end-to-end testing (recommended before demo)

1. Run BFF + Payment + dependency (Order, ...) according to the deployment plan.
2. From POS/PWA, create VietQR for a bill (URL contains rounded `amount` and `des` contains code `QRTBL...`).
3. Make a **sandbox or real** transfer with the correct amount and content.
4. Observe:
   - Log BFF: is there a request for `POST` webhook? Do the Auth headers match the route being used (`X-SePay-Signature`/timestamp for the current direct route, or `x-secret-key` for the tenant/platform path)?
   - Payment service: payment transfer `PAID`, emit Kafka if connected.

---

## 11. Summary checklist (print and tick)

| #   | Things to do                                                                                | Done |
| --- | ------------------------------------------------------------------------------------------- | ---- |
| 1   | SePay account + bank linked (tenant + platform accounts as needed)                          | ☐    |
| 2   | **Tier 1:** OAuth app + `SEPAY_OAUTH_*` + redirect URI matches Management callback          | ☐    |
| 3   | **Tier 1:** Connect in `/dashboard/payment-settings` → select bank → webhook URL shows slug | ☐    |
| 4   | **Tier 2:** Webhook URL = `.../api/v1/payment/sepay/webhook/platform` + platform secret     | ☐    |
| 5   | **Phase 3 lab (optional):** `.../payment/sepay/webhook` + HMAC `SEPAY_WEBHOOK_SECRET`       | ☐    |
| 6   | SePay code rules: `QRTBL` (bills) and `QRSUB` (subscription)                                | ☐    |
| 7   | `PUBLIC_API_BASE_URL` points to public BFF (tunnel/staging/prod)                            | ☐    |
| 8   | Test: sandbox `transaction/create` or real transfer with correct `content`                  | ☐    |

---

## 12. Troubleshooting common problems

| Symptoms                                  | Processing directions                                                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| Webhook not reaching BFF                  | Tunnel alive; URL matches **tier** (platform vs `/{slug}` vs legacy); path includes `/api/v1`.                                  |
| 401 on platform subscription              | Use `SEPAY_PLATFORM_WEBHOOK_SECRET`; try `Authorization: Apikey <secret>` if dashboard sends that instead of `x-secret-key`.    |
| 401 on tenant bills                       | Re-connect SePay; secret is per-tenant in DB, not `SEPAY_PLATFORM_WEBHOOK_SECRET`.                                              |
| 401 on legacy route                       | HMAC headers + `SEPAY_WEBHOOK_SECRET`; raw body must be preserved for signature.                                                |
| OAuth callback fails / invalid state      | `SEPAY_OAUTH_REDIRECT_URI` must match SePay app exactly; `PUBLIC_API_BASE_URL` set; secrets validated before state consume.     |
| Webhook OK but bill not paid              | `content` missing `QRTBL…`; amount &lt; rounded total; `transferType` not `in`.                                                 |
| Webhook OK but subscription not activated | Wrong URL (not `/platform`); `content` missing `QRSUB…`; amount mismatch; invoice still `PENDING` past `qrExpiresAt` (expired). |
| `code` is null                            | Configure SePay prefixes; backend still parses `content` for `QRTBL`/`QRSUB` when content is complete.                          |

---

## 13. Reference source (Context7 / SePay)

- **Library ID (Context7):** `/websites/developer_sepay_vn`
- **Webhook Bank Hub:** [Webhook Integration](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), [Quick Start](https://sepay.vn)
- **verify `X-Secret-Key`:** [Update webhook (Bank Hub API)](https://developer.sepay.vn/vi/bankhub/api/api-webhook/cap-nhat-webhook)
- **Sandbox transaction emulation:** [Transaction emulation](https://developer.sepay.vn/vi/bankhub/api/api-giao-dich/gia-lap-giao-dich)
- **IPN / payment gateway (other schema):** [IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN) — used when integrating a “payment gateway” product, **does not** replace Phase 3's Bank Hub payload if you are following VietQR + transaction webhook as phase document.

---

_If the SePay dashboard changes menu names, please refer back to “Webhook / Bank Hub” and “Company → General Configuration” on the latest official document at [developer.sepay.vn](https://developer.sepay.vn)._
