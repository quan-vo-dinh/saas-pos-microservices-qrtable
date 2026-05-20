# SePay configuration instructions for QRTable — Phase 3 (VietQR + Webhook)

This document describes **from start to finish** the steps that need to be taken **in addition to the codebase** (SePay dashboard, bank account, public URL, environment variables) to get the static **VietQR flow + receive transactions via Bank Hub** to work with BFF/Payment service according to the Phase 3 design.

**Internal reference:** [phase-3-payment.md](../phases/phase-3-payment.md)
**SePay technical reference (Context7 — `developer.sepay.vn`):** Bank Hub webhook, JSON payload, header `X-Secret-Key`, API sandbox.

> **Status after refactor docs 2026-05-14:** This guide is still useful for configuring SePay Bank Hub/SECRET_KEY mode in the dashboard, but the current code of direct Phase 3 route has been harden to HMAC raw-body (`X-SePay-Signature` / `X-SePay-Timestamp`). Route tenant/platform Phase 4B uses its own `x-secret-key` path. Before production, clearly select the actual route/auth and re-sync the SePay dashboard, BFF guard, and this document.

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

2. **Prepare QRTable webhook URL (BFF)**
   Destination endpoint after deploying code (according to repo documentation):

   ```text
   https://<bff-host>/api/v1/payment/sepay/webhook
   ```

- `<bff-host>`: BFF's public hostname (local dev often needs **tunnel** — see section 8).
  - **HTTPS** is a production standard; The Bank Hub API documentation also notes that HTTPS is required in real time.

3. **Prepare the env value to match the selected auth webhook**
   - `SEPAY_WEBHOOK_SECRET` — secret used for the current HMAC direct route or SECRET_KEY mode if the route is configured according to that path.
   - `SEPAY_PLATFORM_WEBHOOK_SECRET` — secret server-side for route platform subscription Phase 4B (`QRSUB`).
   - `PAYMENT_SEPAY_QR_ACCOUNT`, `PAYMENT_SEPAY_QR_BANK` — **correct** receiving account used in VietQR URL (`acc`, `bank`).
   - `BILL_REF_PREFIX` — by default the project uses `QRTBL` (bill reference code in the CK content).

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

- **`webhook_url`:** BFF's full HTTPS URL, e.g.:

  `https://api.yourdomain.com/api/v1/payment/sepay/webhook`

- **`auth_type`:** select **`SECRET_KEY`** — SePay will send header **`X-Secret-Key`** (only if you configure this type).
- **`secret_key`:** secret string; You copy **the same value** into env `SEPAY_WEBHOOK_SECRET` on the BFF side.
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

## 6. Step 4 — Configure “payment code” recognition (prefix `QRTBL`)

According to the SePay documentation, field `code` is populated when SePay **recognizes** a pattern in the content — the configuration is located at **Company → General Configuration** (dashboard).

**What you need to do for QRTable:**

1. Enable/configure code recognition with prefix **`QRTBL`** (matches `BILL_REF_PREFIX` in env).
2. Purpose: when a customer transfers money with content containing `QRTBLXXXXXXXX`, the webhook may have a different `code` than `null`, helping to match the bill faster; if still `null`, the backend can still fallback the regex on `content`.

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

**Authentication explanation:** Original Guide Phase 3 configures SePay SECRET_KEY mode (`X-Secret-Key`). The current BFF code for the direct route verifies the HMAC raw-body with `SEPAY_WEBHOOK_SECRET`; tenant/platform routes Phase 4B uses its own `x-secret-key` path. tenant route `QRTBL` verify secret stored by tenant in Payment DB; platform route `QRSUB` now verifies with `SEPAY_PLATFORM_WEBHOOK_SECRET`. Do not mix these paths during demo/production.

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

| #   | Things to do                                                                                   | Done |
| --- | ---------------------------------------------------------------------------------------------- | ---- |
| 1   | Have a SePay account + STK link to receive money                                               | ☐    |
| 2   | Webhook URL = `https://<bff>/api/v1/payment/sepay/webhook`                                     | ☐    |
| 3   | Select the current auth: direct HMAC webhook or the SECRET_KEY route/path that needs hardening | ☐    |
| 4   | Copy/transfer the corresponding secret to `SEPAY_WEBHOOK_SECRET`                               | ☐    |
| 5   | `PAYMENT_SEPAY_QR_ACCOUNT` / `PAYMENT_SEPAY_QR_BANK` matches VietQR                            | ☐    |
| 6   | Prefix identification configuration `QRTBL` (Company → General configuration)                  | ☐    |
| 7   | BFF public HTTPS (tunnel/staging) for dev                                                      | ☐    |
| 8   | Test sandbox `transaction/create` or real CK                                                   | ☐    |

---

## 12. Troubleshooting common problems

| Symptoms                                       | Processing directions                                                                                                              |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Webhook not reaching BFF                       | Check SePay URL, tunnel is alive, correct path `/api/v1/payment/sepay/webhook`.                                                    |
| 401 Unauthorized                               | Wrong auth header according to route being used or env `SEPAY_WEBHOOK_SECRET` wrong characters/spaces.                             |
| There is a webhook but the bill does not match | `content` does not contain `QRTBL...`; or amount `< rounded_total`; or `transferType` not `in`.                                    |
| `code` is also `null`                          | Check the code identification configuration at SePay; Matching via regex `content` is still possible if the content is sufficient. |

---

## 13. Reference source (Context7 / SePay)

- **Library ID (Context7):** `/websites/developer_sepay_vn`
- **Webhook Bank Hub:** [Webhook Integration](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook), [Quick Start](https://sepay.vn)
- **verify `X-Secret-Key`:** [Update webhook (Bank Hub API)](https://developer.sepay.vn/vi/bankhub/api/api-webhook/cap-nhat-webhook)
- **Sandbox transaction emulation:** [Transaction emulation](https://developer.sepay.vn/vi/bankhub/api/api-giao-dich/gia-lap-giao-dich)
- **IPN / payment gateway (other schema):** [IPN](https://developer.sepay.vn/vi/cong-thanh-toan/IPN) — used when integrating a “payment gateway” product, **does not** replace Phase 3's Bank Hub payload if you are following VietQR + transaction webhook as phase document.

---

_If the SePay dashboard changes menu names, please refer back to “Webhook / Bank Hub” and “Company → General Configuration” on the latest official document at [developer.sepay.vn](https://developer.sepay.vn)._
