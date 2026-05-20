# Phase 3 — Final Payment service Architecture & Business Specification

> **Phase:** Phase 3 — Payment service (SePay/VietQR + Cash)
> **Date:** 2026-05-08
> **Status:** Finalized after Phase 3 audit and project Owner's Q1-Q6 decision.
> **Purpose:** This document is a business/technical standard for Phase 3. This is not an implementation plan and does not disassemble task code.
> **Implementation note (2026-05-14):** Original Spec Phase 3 latches according to `X-Secret-Key` mechanism. The current code for the direct route `POST /api/v1/payment/sepay/webhook` has been hardened to HMAC raw-body (`X-SePay-Signature` + `X-SePay-Timestamp`). tenant/platform routes added in Phase 4B still use their own `x-secret-key` path. When deviating, prioritize the current phase record and code/tests.

---

## 0. Minutes of Decision

| Question | Decision | Closing content                                                                                                                                                                 |
| -------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1       | Option A | If the customer transfers insufficient money via VietQR, keep payment `PENDING`, record audit `SEPAY_WEBHOOK_UNDERPAID`, pay webhook HTTP 200 and let staff handle it manually. |
| Q2       | Option A | If the customer transfers excess money via VietQR, accept `PAID`, save `paidAmount = transferAmount`, do not create a refund for the difference.                                |
| Q3       | Option A | Phase 3 only supports **full refund**, maximum one active/confirmed refund per payment.                                                                                         |
| Q4       | Option A | WAITER is authorized `payment.create` to create QR VietQR on POS.                                                                                                               |
| Q5       | Option A | Webhook that does not match bill/payment only records application log and returns HTTP 200; Do not persist to `audit_payments`.                                                 |
| Q6       | Option A | `billReference = "QRTBL" + first 8 chars of billId`, if unique, regenerate with simple suffix.                                                                                  |

### 0.1 What Points Does This Document Override?

1. Phase 3 does not use Stripe, does not redirect to hosted checkout. The original spec did not require a raw-body signature, but the current implementation has changed the route directly to HMAC raw-body to harden the webhook.
2. Phase 3's online payment is **SePay + VietQR inline**: the system builds QR URL and waits for webhook to confirm.
3. `PaymentMethod` Phase 3 only expands `VIETQR`. Do not add `CARD`, `MOMO`, `ZALOPAY`, `BANK_TRANSFER` in this scope.
4. Refund Phase 3 is **manual full refund**: staff/Owner transfers money manually outside the system and then confirms in Dashboard.
5. Do not design separate distributed lock, Redis lock, separate saga, or separate replay queue for webhooks. PostgreSQL transaction + constraint is baseline.

---

## 1. Document Base and Context7

### 1.1 Facility in Repo

- `docs/phases/phase-3-payment.md`
- `docs/phases/phase-3-payment.md`
- `docs/business-logic.md` §6
- `docs/technical-architecture.md` §6.2.7, §7.2-7.4, §10
- `docs/implementation_plan.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `docs/specs/business-logic-step-2.4-spec.md`
- Current code: `Bill`, `BillStatus`, `PaymentMethod`, `OutboxEvent`, Order outbox publisher.

### 1.2 Context7 Results Used for Spec

SePay documentation from Context7 (`/websites/developer_sepay_vn`) confirms:

- VietQR image URL has the format:

```text
https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
```

- SePay webhook sends regular JSON body.
- Original Spec Phase 3 chose SECRET_KEY mode so the webhook has the header:

```http
X-Secret-Key: <secret_key>
Content-Type: application/json
```

- Current implementation of direct Phase 3 route has been hardened to HMAC raw-body (`X-SePay-Signature` / `X-SePay-Timestamp`). Phase 4B tenant/platform routes still follow their own `x-secret-key` path.

- Payload webhook has main fields: `id`, `gateway`, `transactionDate`, `accountNumber`, `code`, `content`, `transferType`, `transferAmount`, `accumulated`, `subAccount`, `referenceCode`, `description`.
- `code` can `null`; The system must fallback parse from `content`.

---

## 2. Scope and Out of Scope

### 2.1 Within Phase 3

1. Create a new Payment service (`apps/payment`) with private PostgreSQL `qrtable_payment`.
2. Create and display VietQR for the bill in status `PENDING_PAYMENT`.
3. Receive SePay webhook via BFF public endpoint. Original spec uses `X-Secret-Key`; The current code of the direct route uses HMAC headers `X-SePay-Signature` / `X-SePay-Timestamp`.
4. Confirm cash payment on POS.
5. Prevent duplicate webhooks with DB unique constraint.
6. Prevent Cash vs VietQR race by transaction + row lock on payment.
7. Emit Kafka:
   - `payment.completed`
   - `payment.refunded`
8. Manual full refund with audit.
9. Basic payment history for POS/Dashboard.
10. Update necessary shared types, permissions, and config.

### 2.2 Out of Range Phase 3

1. Do not split the bill.
2. No partial refund.
3. No auto payout/auto bank transfer refund.
4. No automatic bank reconciliation at the end of the day.
5. Does not support multiple parallel gateways.
6. Do not create dashboard replay webhooks.
7. Do not create Redis lock or distributed lock.
8. Absolute accuracy is not guaranteed in cases where customers transfer money with incorrect content and staff manually check. In this case, only application log is in Phase 3.

---

## 3. service Boundary and Ownership

### 3.1 Ownership

| Domain object   | Owner                    | Storage                          | Notes                                                                                                                       |
| --------------- | ------------------------ | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Bill            | Order service            | `qrtable_order.bills`            | Payment service only receives `billId`, does not own the lifecycle bill.                                                    |
| Payment         | Payment service          | `qrtable_payment.payments`       | Source of truth for method, paid amount, SePay transaction.                                                                 |
| Refund          | Payment service          | `qrtable_payment.refunds`        | Manual full refund, mandatory audit.                                                                                        |
| Payment audit   | Payment service          | `qrtable_payment.audit_payments` | Track payments/refunds.                                                                                                     |
| Table status    | service Catalog          | `qrtable_catalog.tables`         | Order `BillService.markPaid` calls TCP Catalog `TABLE.UPDATE_STATUS` after fast path or Kafka `payment.completed` consumer. |
| User/permission | User-Access + Authorizer | MongoDB + Keycloak               | BFF enforce permission with staff routes.                                                                                   |

### 3.2 Communication

| Flow                                        | Protocols                     | Reason                                                 |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Client -> BFF payment endpoints             | HTTP REST                     | BFF is the only API gateway.                           |
| BFF -> Payment service                      | TCP                           | According to the current service pattern.              |
| Payment service -> Order service query bill | TCP                           | Payment needs a snapshot bill to create payment/QR.    |
| Payment service -> Kafka                    | Kafka via local outbox        | Domain events `payment.completed`, `payment.refunded`. |
| SePay -> BFF webhook                        | HTTP POST                     | External callbacks.                                    |
| BFF -> realtime clients                     | WebSocket bridge / BFF Direct | UI status updated, source of truth not changed.        |

---

## 4. State Machines

### 4.1 Bill State

Bill state still belongs to Order service:

```text
OPEN -> PENDING_PAYMENT -> PAID
```

Phase 3 can only complete the bill when receiving `payment.completed`.

Rules:

- Only create payment when bill is `PENDING_PAYMENT`.
- Bill `PAID` is immutable.
- If payment is underpaid, bill is still `PENDING_PAYMENT`.
- Refund does not reopen bill; bill is still `PAID`.

### 4.2 Payment State

```text
PENDING -> PAID -> REFUND_PENDING -> REFUNDED
             ↘
              FAILED
```

Rules:

- `PENDING`: created payment row/QR or prepared cash confirmation.
- `PAID`: cash or SePay has confirmed sufficient funds.
- `REFUND_PENDING`: Owner/Manager has created a refund request, waiting for manual transfer.
- `REFUNDED`: staff/Owner confirms refund has been received.
- `FAILED`: only used for future intentional business errors. Underpaid does not transfer `FAILED` in Phase 3.

### 4.3 Refund State

```text
PENDING_STAFF_ACTION -> CONFIRMED
                    ↘
                     CANCELED
```

Rules:

- Phase 3 only full refund.
- Each payment has a maximum of one active/confirmed refund.
- `CONFIRMED` means the internal user has confirmed the transfer outside the system.
- The system does not call the banking API to transfer refund money.

---

## 5. Official Data Schema

### 5.1 Table `payments`

```sql
CREATE TABLE payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  bill_id UUID NOT NULL,
  bill_reference VARCHAR(32) NOT NULL,

  method VARCHAR(20),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING',

  raw_total INTEGER NOT NULL,
  rounded_total INTEGER NOT NULL,
  rounding_delta INTEGER NOT NULL,
  paid_amount INTEGER,

  amount_received INTEGER,
  change_amount INTEGER,

  sepay_transaction_id INTEGER,
  sepay_reference_code VARCHAR(120),
  sepay_gateway VARCHAR(80),
  sepay_account_number VARCHAR(64),
  sepay_transfer_content TEXT,
  sepay_transaction_date TIMESTAMPTZ,

  paid_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_payment_status
    CHECK (status IN ('PENDING', 'PAID', 'REFUND_PENDING', 'REFUNDED', 'FAILED')),
  CONSTRAINT chk_payment_method
    CHECK (method IS NULL OR method IN ('CASH', 'VIETQR')),
  CONSTRAINT chk_payment_amounts_non_negative
    CHECK (
      raw_total >= 0
      AND rounded_total >= 0
      AND rounding_delta >= 0
      AND (paid_amount IS NULL OR paid_amount >= 0)
      AND (amount_received IS NULL OR amount_received >= 0)
      AND (change_amount IS NULL OR change_amount >= 0)
    )
);

CREATE UNIQUE INDEX uq_payments_tenant_bill
  ON payments (tenant_id, bill_id);

CREATE UNIQUE INDEX uq_payments_tenant_bill_reference
  ON payments (tenant_id, bill_reference);

CREATE UNIQUE INDEX uq_payments_sepay_transaction_id
  ON payments (sepay_transaction_id)
  WHERE sepay_transaction_id IS NOT NULL;

CREATE INDEX idx_payments_tenant_status_created
  ON payments (tenant_id, status, created_at DESC);
```

Field semantics:

| Field                  | Meaning                                                                    |
| ---------------------- | -------------------------------------------------------------------------- |
| `tenant_id`            | tenant scope required.                                                     |
| `bill_id`              | Bill belongs to Order service.                                             |
| `bill_reference`       | Code included in VietQR content, format `QRTBL` + 8 chars.                 |
| `method`               | `CASH` or `VIETQR`; Can be null when payment is pending.                   |
| `raw_total`            | Original total from bill/order snapshot.                                   |
| `rounded_total`        | Amount receivable after rounding.                                          |
| `rounding_delta`       | `rounded_total - raw_total`.                                               |
| `paid_amount`          | Actual amount collected; VietQR overpaid saves the actual transfer amount. |
| `amount_received`      | Cash given by customers can only be used for `CASH`.                       |
| `change_amount`        | Excess money, only used for `CASH`.                                        |
| `sepay_transaction_id` | `payload.id` from SePay, used to prevent duplicate webhooks.               |

### 5.2 Table `refunds`

```sql
CREATE TABLE refunds (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  payment_id UUID NOT NULL REFERENCES payments(id),

  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  customer_bank_account VARCHAR(120),
  customer_bank_name VARCHAR(80),
  customer_account_name VARCHAR(120),

  status VARCHAR(30) NOT NULL DEFAULT 'PENDING_STAFF_ACTION',
  requested_by_user_id UUID NOT NULL,
  requested_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  confirmed_by_user_id UUID,
  confirmed_at TIMESTAMPTZ,
  canceled_by_user_id UUID,
  canceled_at TIMESTAMPTZ,
  cancel_reason TEXT,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_refund_status
    CHECK (status IN ('PENDING_STAFF_ACTION', 'CONFIRMED', 'CANCELED')),
  CONSTRAINT chk_refund_amount_positive
    CHECK (amount > 0)
);

CREATE UNIQUE INDEX uq_refunds_one_active_or_confirmed_per_payment
  ON refunds (payment_id)
  WHERE status IN ('PENDING_STAFF_ACTION', 'CONFIRMED');

CREATE INDEX idx_refunds_tenant_payment
  ON refunds (tenant_id, payment_id);

CREATE INDEX idx_refunds_tenant_status_created
  ON refunds (tenant_id, status, created_at DESC);
```

Rules:

- `amount` must be equal to `payment.rounded_total` in Phase 3 full refund.
- `requested_by_user_id` is the Owner/Manager who created the request.
- `confirmed_by_user_id` is the person who clicked to confirm the refund.
- `customer_bank_account` should be required in UI if refund is via bank transfer.

### 5.3 Table `audit_payments`

```sql
CREATE TABLE audit_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  payment_id UUID REFERENCES payments(id),
  refund_id UUID REFERENCES refunds(id),

  action VARCHAR(60) NOT NULL,
  actor_type VARCHAR(20) NOT NULL,
  actor_id UUID,
  reason TEXT,
  meta JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT chk_audit_actor_type
    CHECK (actor_type IN ('USER', 'SEPAY', 'SYSTEM')),
  CONSTRAINT chk_audit_action
    CHECK (action IN (
      'PAYMENT_CREATED',
      'CASH_CONFIRMED',
      'SEPAY_WEBHOOK_RECEIVED',
      'SEPAY_WEBHOOK_DUPLICATE',
      'SEPAY_WEBHOOK_UNDERPAID',
      'SEPAY_WEBHOOK_AFTER_PAID',
      'PAYMENT_COMPLETED',
      'REFUND_REQUESTED',
      'REFUND_CONFIRMED',
      'REFUND_CANCELED'
    ))
);

CREATE INDEX idx_audit_payments_payment_created
  ON audit_payments (payment_id, created_at DESC);

CREATE INDEX idx_audit_payments_tenant_created
  ON audit_payments (tenant_id, created_at DESC);
```

Rules:

- Unmatched webhook does not persist to `audit_payments`; application log only.
- Matched underpaid webhook must record an audit so staff can see why the payment is still pending.
- `actor_type = 'SEPAY'` for webhooks.
- `actor_type = 'USER'` for cash/refund actions.

### 5.4 Table `outbox_events`

Payment service uses the same minimalist schema as Order service:

```sql
CREATE TABLE outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id VARCHAR(64) NOT NULL,
  topic VARCHAR(120) NOT NULL,
  event_type VARCHAR(120) NOT NULL,
  aggregate_id UUID NOT NULL,
  partition_key VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  published_at TIMESTAMPTZ,
  attempt_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_payment_outbox_status_created
  ON outbox_events (status, created_at);
```

---

## 6. API/TCP Contract

### 6.1 BFF HTTP Endpoints

| Endpoints                               | Actor                | Guard/Permission                                                | Purpose                                      |
| --------------------------------------- | -------------------- | --------------------------------------------------------------- | -------------------------------------------- |
| `POST /api/v1/payment/vietqr/create-qr` | Owner/MANAGER/WAITER | `UserGuard -> TenantGuard -> PermissionGuard`, `payment.create` | Create/reuse pending payment and pay QR URL. |
| `POST /api/v1/payment/cash/confirm`     | Owner/MANAGER/WAITER | `payment.confirm_cash`                                          | Confirmation of cash collection.             |
| `POST /api/v1/payment/sepay/webhook`    | SePay                | Public endpoint + HMAC raw-body verification                    | Get SePay webhook. Do not use JWT guards.    |
| `POST /api/v1/payment/refund/request`   | Owner/MANAGER        | `payment.refund`                                                | Create a full refund request.                |
| `POST /api/v1/payment/refund/confirm`   | Owner/MANAGER        | `payment.refund`                                                | Confirmed refund received.                   |
| `GET /api/v1/payment/history`           | Owner/MANAGER/WAITER | `payment.get_history`                                           | View payment history by tenant/bill/table.   |

### 6.2 Request/Response: Create VietQR

Request:

```json
{
  "billId": "uuid"
}
```

Response:

```json
{
  "paymentId": "uuid",
  "billId": "uuid",
  "billReference": "QRTBLB1A2C3D4",
  "rawTotal": 127500,
  "roundedTotal": 128000,
  "roundingDelta": 500,
  "qrUrl": "https://qr.sepay.vn/img?acc=9332770502&bank=Vietcombank&amount=128000&des=QRTBLB1A2C3D4",
  "status": "PENDING"
}
```

Rules:

- If pending payment already exists for the bill, return existing QR.
- If payment is already `PAID`, pay in conflict or current paid state so that the UI displays payment.
- If bill is not in `PENDING_PAYMENT`, reject `409`.

### 6.3 Request/Response: Confirm Cash

Request:

```json
{
  "billId": "uuid",
  "amountReceived": 200000
}
```

Response:

```json
{
  "paymentId": "uuid",
  "billId": "uuid",
  "method": "CASH",
  "status": "PAID",
  "roundedTotal": 128000,
  "amountReceived": 200000,
  "changeAmount": 72000,
  "paidAt": "2026-05-08T08:00:00.000Z"
}
```

Rules:

- `amountReceived >= roundedTotal`.
- Lock payment row before status update.
- If already `PAID`, reject `409`.

### 6.4 SePay Webhook Payload

Input from SePay:

```json
{
  "id": 92704,
  "gateway": "Vietcombank",
  "transactionDate": "2026-05-08 14:02:37",
  "accountNumber": "0010000000355",
  "code": "QRTBLB1A2C3D4",
  "content": "QRTBLB1A2C3D4 thanh toan ban 05",
  "transferType": "in",
  "transferAmount": 128000,
  "accumulated": 1919000,
  "subAccount": null,
  "referenceCode": "MBVCB.3278907687",
  "description": "SMS raw content here"
}
```

Response:

```json
{
  "status": "success"
}
```

The BFF must return HTTP 200 for:

- Paid successfully.
- Duplicate webhook.
- Underpaid matched webhook.
- Unmatched webhook.
- Outbound `transferType`.
- Payment already paid by cash.

The BFF must return HTTP 401 for the current direct Phase 3 route when:

- Missing or invalid `X-SePay-Signature` / `X-SePay-Timestamp`.
- Webhook secret is not configured.

### 6.5 Refund Request

Request:

```json
{
  "paymentId": "uuid",
  "reason": "Customer requested a refund because he entered the wrong invoice",
  "customerBankAccount": "0123456789",
  "customerBankName": "Vietcombank",
  "customerAccountName": "NGUYEN VAN A"
}
```

Response:

```json
{
  "refundId": "uuid",
  "paymentId": "uuid",
  "amount": 128000,
  "status": "PENDING_STAFF_ACTION",
  "requestedByUserId": "uuid",
  "requestedAt": "2026-05-08T08:10:00.000Z"
}
```

Rules:

- Payment must be `PAID`.
- Amount is full `payment.rounded_total`.
- Payment becomes `REFUND_PENDING`.
- Create audit `REFUND_REQUESTED`.

### 6.6 Refund Confirm

Request:

```json
{
  "refundId": "uuid"
}
```

Response:

```json
{
  "refundId": "uuid",
  "paymentId": "uuid",
  "status": "CONFIRMED",
  "confirmedByUserId": "uuid",
  "confirmedAt": "2026-05-08T08:15:00.000Z"
}
```

Rules:

- Refund must be `PENDING_STAFF_ACTION`.
- Payment becomes `REFUNDED`.
- Create audit `REFUND_CONFIRMED`.
- Emit `payment.refunded`.

---

## 7. Core Algorithms

### 7.1 Rounding

```ts
rawTotal = sum(item.price * item.quantity);
roundedTotal = Math.ceil(rawTotal / 1000) * 1000;
roundingDelta = roundedTotal - rawTotal;
```

All amounts are integer VND.

### 7.2 Bill Reference Generation

Closing according to Q6-A:

```ts
function createBillReference(billId: string): string {
  return `QRTBL${billId.replaceAll('-', '').slice(0, 8).toUpperCase()}`;
}
```

Collision policy:

- Insert payment with `UNIQUE(tenant_id, bill_reference)`.
- If collision occurs, regenerate by using another deterministic slice or short suffix, for example `QRTBL${billIdWithoutDash.slice(8, 16)}`.
- Collision is expected to be rare; no separate reference service is needed.

### 7.3 Extract Bill Reference From SePay Payload

```ts
const BILL_REF_REGEX = /QRTBL[A-Z0-9]{8}/i;

function extractBillReference(payload: SepayWebhookPayload): string | null {
  const code = payload.code?.trim().toUpperCase();
  if (code) {
    const codeMatch = code.match(BILL_REF_REGEX);
    if (codeMatch) {
      return codeMatch[0].toUpperCase();
    }
  }

  const content = payload.content?.trim() ?? '';
  const contentMatch = content.match(BILL_REF_REGEX);
  return contentMatch?.[0]?.toUpperCase() ?? null;
}
```

Priority:

1. Parse `payload.code`.
2. Fallback regex on `payload.content`.
3. If not found, application log and HTTP 200.

### 7.4 Verify SePay Webhook

Current direct Phase 3 route verification is HMAC-based in BFF: signature over `{timestamp}.{rawBody}` using `SEPAY_WEBHOOK_SECRET`.

Rules:

- This happens in BFF before TCP call.
- Raw body is required for the direct route HMAC verification.
- Tenant/platform routes introduced by Phase 4B use a separate `x-secret-key` path.
- Invalid secret returns 401.
- Valid secret delegates payload to Payment Service.

### 7.5 Handle SePay Webhook

```ts
async function handleSepayWebhook(payload: SepayWebhookPayload) {
  const billReference = extractBillReference(payload);

  if (!billReference || payload.transferType !== 'in') {
    logger.warn({ payload }, 'Unmatched or non-incoming SePay webhook');
    return { status: 'success' };
  }

  return dataSource.transaction(async (manager) => {
    const payment = await manager
      .createQueryBuilder(PaymentEntity, 'payment')
      .setLock('pessimistic_write')
      .where('payment.bill_reference = :billReference', { billReference })
      .getOne();

    if (!payment) {
      logger.warn({ billReference, payload }, 'SePay webhook matched no payment');
      return { status: 'success' };
    }

    await audit(manager, payment, 'SEPAY_WEBHOOK_RECEIVED', 'SEPAY', null, { payload });

    if (payment.sepayTransactionId === payload.id) {
      await audit(manager, payment, 'SEPAY_WEBHOOK_DUPLICATE', 'SEPAY', null, { payload });
      return { status: 'success' };
    }

    if (payment.status === 'PAID' || payment.status === 'REFUND_PENDING' || payment.status === 'REFUNDED') {
      await audit(manager, payment, 'SEPAY_WEBHOOK_AFTER_PAID', 'SEPAY', null, { payload });
      return { status: 'success' };
    }

    if (payload.transferAmount < payment.roundedTotal) {
      await audit(manager, payment, 'SEPAY_WEBHOOK_UNDERPAID', 'SEPAY', null, {
        expectedAmount: payment.roundedTotal,
        actualAmount: payload.transferAmount,
        payload,
      });
      return { status: 'success' };
    }

    payment.method = 'VIETQR';
    payment.status = 'PAID';
    payment.paidAmount = payload.transferAmount;
    payment.sepayTransactionId = payload.id;
    payment.sepayReferenceCode = payload.referenceCode;
    payment.sepayGateway = payload.gateway;
    payment.sepayAccountNumber = payload.accountNumber;
    payment.sepayTransferContent = payload.content;
    payment.sepayTransactionDate = parseSepayDate(payload.transactionDate);
    payment.paidAt = new Date();

    await manager.save(payment);
    await audit(manager, payment, 'PAYMENT_COMPLETED', 'SEPAY', null, { method: 'VIETQR' });
    await createOutboxPaymentCompleted(manager, payment);

    return { status: 'success' };
  });
}
```

### 7.6 Cash vs VietQR Race

Every code path that changes payment to `PAID` must:

1. Open DB transaction.
2. Lock payment row with `pessimistic_write` / `SELECT ... FOR UPDATE`.
3. Check current status.
4. Only update if status is still `PENDING`.
5. Save payment and outbox in same transaction.

If Cash wins:

- Later SePay webhook returns 200 and audits `SEPAY_WEBHOOK_AFTER_PAID`.

If SePay wins:

- Later cash confirm returns 409 conflict to POS.

---

## 8. Kafka Contracts

### 8.1 Topic `payment.completed`

Producer: Payment Service
Current consumers in code: Order Service and BFF realtime bridge. Catalog table status is updated by Order through TCP inside `BillService.markPaid`; Notification is Phase 4C+.

```json
{
  "eventId": "uuid",
  "eventType": "payment.completed",
  "tenantId": "tenant-id",
  "billId": "bill-id",
  "paymentId": "payment-id",
  "method": "VIETQR",
  "amount": 128000,
  "paidAt": "2026-05-08T08:00:00.000Z",
  "correlationId": "process-id"
}
```

Rules:

- `amount` is actual received amount for VietQR, rounded total for cash.
- Kafka key: `tenantId`.
- `eventId` must be stable per outbox row.
- Consumers must be idempotent:
  - Order Service: if bill already `PAID`, no-op.
  - Order → Catalog TCP table update: if table already `Cleaning`, no-op/equivalent idempotent transition.
  - BFF: WebSocket hint only.

### 8.2 Topic `payment.refunded`

Producer: Payment Service
Current consumers in code: none. The event is emitted by Payment outbox for audit/future integration; Notification and BFF dashboard handling are Phase 4C+ extensions.

```json
{
  "eventId": "uuid",
  "eventType": "payment.refunded",
  "tenantId": "tenant-id",
  "billId": "bill-id",
  "paymentId": "payment-id",
  "refundId": "refund-id",
  "amount": 128000,
  "confirmedByUserId": "user-id",
  "confirmedAt": "2026-05-08T08:15:00.000Z",
  "correlationId": "process-id"
}
```

Rules:

- `amount` equals full `payment.rounded_total`.
- Bill remains `PAID`.
- Reporting/revenue adjustment is consumer responsibility.

### 8.3 Kafka Config Additions

Payment Service / shared config needs:

```yaml
KAFKA_PAYMENT_COMPLETED_TOPIC: payment.completed
KAFKA_PAYMENT_REFUNDED_TOPIC: payment.refunded
KAFKA_PAYMENT_CLIENT_ID: qrtable-payment-service
```

BFF bridge / consumers may need:

```yaml
KAFKA_BFF_CONSUMER_GROUP: bff-kafka-bridge
```

---

## 9. Authorization Policy

### 9.1 Staff/JWT Endpoints

All non-webhook payment endpoints use:

```text
UserGuard -> TenantGuard -> PermissionGuard
```

Permissions:

| Action                | Permission             | Roles                               |
| --------------------- | ---------------------- | ----------------------------------- |
| Create VietQR QR      | `payment.create`       | SUPER_ADMIN, OWNER, MANAGER, WAITER |
| Confirm cash          | `payment.confirm_cash` | SUPER_ADMIN, OWNER, MANAGER, WAITER |
| Request refund        | `payment.refund`       | SUPER_ADMIN, OWNER, MANAGER         |
| Confirm manual refund | `payment.refund`       | SUPER_ADMIN, OWNER, MANAGER         |
| View payment history  | `payment.get_history`  | SUPER_ADMIN, OWNER, MANAGER, WAITER |

Required doc/code update:

- `permission-matrix.md` currently should grant WAITER `payment.create` for Phase 3.

### 9.2 SePay Webhook Endpoint

Webhook endpoint does not use JWT guards. Current direct Phase 3 route:

```text
Public HTTP endpoint -> HMAC signature verification -> Payment Service TCP
```

Rules:

- Do not accept tenant from request header.
- Do not accept user identity.
- Resolve tenant from matched `payments.bill_reference`.
- Invalid secret returns 401.
- Valid secret returns 200 for all business outcomes.

---

## 10. Error and Status Policy

| Case                                  | HTTP | Payment state | Audit/log                            | UI impact                                              |
| ------------------------------------- | ---- | ------------- | ------------------------------------ | ------------------------------------------------------ |
| Invalid webhook secret                | 401  | unchanged     | security log                         | none                                                   |
| Webhook no bill reference             | 200  | unchanged     | application log only                 | none                                                   |
| Webhook non-`in` transfer             | 200  | unchanged     | application log only                 | none                                                   |
| Webhook matched but underpaid         | 200  | `PENDING`     | `SEPAY_WEBHOOK_UNDERPAID`            | POS shows pending/underpaid note after status refresh. |
| Webhook duplicate same transaction id | 200  | unchanged     | `SEPAY_WEBHOOK_DUPLICATE` if matched | no-op                                                  |
| Webhook after cash paid               | 200  | unchanged     | `SEPAY_WEBHOOK_AFTER_PAID`           | staff handles bank transfer manually if needed.        |
| Cash confirm after VietQR paid        | 409  | unchanged     | application log                      | POS shows bill already paid.                           |
| Refund request for non-paid payment   | 409  | unchanged     | application log                      | Dashboard shows invalid state.                         |
| Refund confirm before request         | 409  | unchanged     | application log                      | Dashboard shows invalid state.                         |

---

## 11. Frontend UX Contract

### 11.1 POS VietQR

POS shows:

- Bill summary.
- Rounding lines.
- `roundedTotal`.
- QR images.
- `billReference`.
- Status pills:
  - `PENDING`: Waiting for transfer.
  - `PAID`: Paid.
  - underpaid note if latest audit has `SEPAY_WEBHOOK_UNDERPAID`.

Polling fallback:

- `GET /payment/{paymentId}/status` every 3s while QR tab is active.
- Stop polling after paid, closed tab, or 10 minutes.

### 11.2 Customer PWA

Customer does not need to create payment directly unless later UX decides to show QR on customer device. Phase 3 baseline:

- Customer requests bill.
- Staff handles payment on POS.
- Customer receives payment completed status through existing realtime/polling path.

### 11.3 Refund Dashboard

Dashboard refund UI:

- Only shown for `PAID` payments.
- Full amount fixed to `payment.roundedTotal`.
- Requires reason.
- Collects customer bank fields.
- Shows pending refund action until owner/manager confirms manual transfer.

---

## 12. Implementation Constraints

1. Use TypeORM transactions for payment completion paths.
2. Use `pessimistic_write` lock or equivalent SQL `FOR UPDATE`.
3. Use DB constraints for idempotency, not custom in-memory state.
4. Store all money as integer VND.
5. Do not access Order DB directly from Payment Service.
6. Payment Service reads bill snapshot via Order TCP command.
7. Payment Service emits Kafka through local outbox.
8. Do not publish Kafka event before DB commit.
9. Do not use Redis in Payment Service for Phase 3.
10. Do not add new gateway abstraction unless a second real gateway is implemented.

---

## 13. Acceptance Criteria

1. Cash payment can mark a `PENDING_PAYMENT` bill as paid.
2. VietQR payment can mark a `PENDING_PAYMENT` bill as paid after valid SePay webhook.
3. Duplicate SePay webhook does not create duplicate event or corrupt payment.
4. Cash vs VietQR race results in exactly one successful payment completion.
5. Underpaid VietQR keeps payment pending and creates audit.
6. Overpaid VietQR marks payment paid and stores actual `paidAmount`.
7. Unmatched webhook returns 200 and does not persist payment audit.
8. Full manual refund creates request, confirm action, audit, and `payment.refunded`.
9. Bill remains immutable after `PAID`; refund does not reopen bill.
10. WAITER can create VietQR QR and confirm cash on POS.
11. OWNER/MANAGER can request and confirm manual refund.
12. `payment.completed` and `payment.refunded` payloads match this spec.

---

## 14. Minimum Test Matrix

### Unit Tests

- Rounding function.
- Bill reference generation.
- Bill reference extraction from `code`.
- Bill reference extraction fallback from `content`.
- Webhook secret verification.
- Underpaid policy.
- Overpaid policy.

### Service Tests

- Create VietQR reuses existing pending payment.
- Confirm cash rejects insufficient `amountReceived`.
- Confirm cash marks payment paid and creates outbox.
- SePay webhook marks payment paid and creates outbox.
- Duplicate `sepay_transaction_id` is no-op.
- Refund request full amount only.
- Refund confirm emits outbox.

### Integration/E2E Demo Tests

- Customer request bill -> POS create VietQR -> simulate SePay webhook -> bill paid.
- POS cash confirm -> bill paid.
- Race simulation: cash confirm and webhook for same bill -> one wins, one no-ops/conflicts.
- Refund full payment -> audit and event present.

---

## 15. Historical Implementation Scope

Implementation plan Phase 3 used this document to organize work groups:

1. Scaffold `apps/payment` + PostgreSQL connection.
2. Add Payment entities and migrations.
3. Extend shared `PaymentMethod` with `VIETQR`.
4. Add Kafka config for payment topics.
5. Add BFF payment controller and SePay webhook endpoint.
6. Add Payment TCP handlers.
7. Add Order TCP query/command support needed by Payment:
   - get bill payment snapshot
   - apply payment completed
8. Add outbox publisher in Payment Service.
9. Update permission matrix/code seed for WAITER `payment.create`.
10. Add POS/Dashboard/PWA integration.
