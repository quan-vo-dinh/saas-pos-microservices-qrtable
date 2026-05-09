# Phase 3 Payment — Architecture Audit Report

> Scope: Phase 3 — Payment Service (SePay/VietQR + Cash)  
> Role: Backend Architect, pragmatic production baseline  
> Status: Draft for policy approval. Stop here before writing final spec.

## 1. Sources Reviewed

- `docs/phases/phase-3-payment.md`
- `docs/business-logic.md` §6 Payment & Reconciliation
- `docs/technical-architecture.md` §6.2.7, §7.2-7.4, §10
- `docs/implementation_plan.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `docs/business-logic-step-2.4-spec.vi.md`
- Current code scan: `Bill`, `OutboxEvent`, Order outbox publisher, shared `BillStatus`, `PaymentMethod`
- Context7 SePay docs: VietQR QR image URL and SePay webhook/IPN with `X-Secret-Key`

### Current Codebase Notes

- There is no `apps/payment` yet. Phase 3 will add it.
- `Bill` already exists in `libs/entities` and is owned by Order Service.
- `BillStatus` already supports `OPEN -> PENDING_PAYMENT -> PAID`.
- `PaymentMethod` is currently `CASH` only and must be extended with `VIETQR`.
- `OutboxEvent` and `OutboxPublisherService` already exist in Order Service. Payment Service should reuse the same simple outbox shape for `payment.completed` / `payment.refunded`.
- Kafka config currently only includes `order.confirmed` and `kitchen.sla_warning`; Phase 3 needs `payment.completed` and `payment.refunded` config keys.

## 2. Architecture Audit Summary

The SePay + Cash direction is sound for the demo/production-real flow: it avoids card gateway complexity, uses local bank transfer behavior, and keeps Payment Service as the owner of payment records while Order Service remains the owner of bills.

The main missing pieces are not large architecture gaps. They are small but important policy decisions:

- One active `payment` row per `billId` for Phase 3.
- A DB transaction with row lock is enough to resolve Cash vs VietQR races.
- Webhook idempotency should be enforced with `UNIQUE(sepay_transaction_id)` plus status checks.
- Underpaid VietQR webhooks should not crash or mark the bill paid.
- Refund audit needs separate requester and confirmer fields.
- Permission Matrix likely needs to allow WAITER to create a VietQR payment QR from POS, or POS VietQR will be blocked.

## 3. Review Luồng Nghiệp Vụ

### 3.1 Cash Flow

Proposed flow is acceptable:

1. Bill is already `PENDING_PAYMENT`.
2. Staff enters received cash amount.
3. Payment Service validates `amountReceived >= roundedTotal`.
4. Payment Service locks the payment row for the bill.
5. If status is already `PAID`, reject as conflict.
6. Otherwise set method `CASH`, status `PAID`, paid fields, and emit `payment.completed`.

Clear risk:

- If VietQR QR was already displayed, a customer may still transfer after staff collected cash. This is not avoidable at UI level only. The DB lock/status check must make the webhook a no-op after cash has already won.

Pragmatic decision:

- Do not attempt distributed locking with Redis.
- Do not create a saga between Cash and SePay.
- Use one DB transaction on `payments` and one `UNIQUE(tenant_id, bill_id)` constraint.

### 3.2 SePay / VietQR Flow

Proposed flow is acceptable:

1. Payment Service creates or reuses a pending payment row for the bill.
2. It generates `bill_reference`, for example `QRTBL` + 8-12 uppercase chars.
3. It returns `qrUrl = https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...`.
4. SePay sends webhook with JSON body and `X-Secret-Key`.
5. BFF verifies `X-Secret-Key`.
6. Payment Service extracts `billReference`, locks the payment row, validates amount, marks paid, emits `payment.completed`.

Clear risks:

- `code` may be null, so fallback regex on `content` is required.
- `transferAmount` can be lower, equal, or higher than bill total.
- SePay may send duplicate webhook deliveries.
- A webhook may arrive after staff already confirmed cash.

Pragmatic decisions:

- If `transferAmount >= rounded_total`, accept and store actual received amount.
- If `transferAmount < rounded_total`, keep payment `PENDING`, write audit log if payment is matched, return 200 to avoid retry loops, and surface "underpaid transfer" to staff through payment history/status.
- If duplicate webhook uses same `sepayTransactionId`, return 200 no-op.
- If payment is already `PAID` by another method, return 200 no-op and audit `WEBHOOK_AFTER_PAID`.

### 3.3 Webhook Security

Context7 SePay docs confirm:

- SePay sends JSON body.
- Secret is delivered in `X-Secret-Key`.
- Verification is a header comparison against configured secret.
- No Stripe-style raw body signature verification is required.

Recommended BFF policy:

- Webhook endpoint is public but guarded by `X-Secret-Key`.
- Do not use `UserGuard`, `TenantGuard`, or `PermissionGuard` for SePay webhook.
- Do not trust `tenant_id` from headers on this endpoint.
- Tenant resolution must happen after finding the payment by `billReference`.
- Return:
  - `401` for missing/invalid secret.
  - `200` for duplicate, unmatched, underpaid, or already-paid webhook after internal logging. Non-2xx should be reserved for authentication or temporary infrastructure failure.

### 3.4 Manual Refund Flow

The manual refund model is appropriate for demo/luận văn:

1. Owner/Manager requests refund with reason and customer bank target.
2. System creates refund row with `PENDING_STAFF_ACTION`.
3. Staff/Owner transfers manually in bank app.
4. Staff/Owner confirms refund in Dashboard.
5. System writes audit and emits `payment.refunded`.

Clear gap in current Phase 3 text:

- `refunds.refunded_by` is ambiguous. We need both `requested_by_user_id` and `confirmed_by_user_id`.
- `audit_payments.actor_id` should support system/external actor for SePay webhook events.
- Permission Matrix has `PAYMENT_REFUND`, but Phase 3 mentions `PAYMENT_REFUND_CONFIRM`. Keep it simple: use one `payment.refund` permission for request and confirm, restricted to OWNER/MANAGER.

Recommended simplification:

- Phase 3 supports one refund record per payment, full refund by default.
- Keep `amount` in schema so partial refund is not impossible later, but UI can default to full amount and optionally disable editing.

## 4. Proposed Data Schema Draft

This draft assumes Phase 3 does not support split bill or multiple successful payments per bill.

### 4.1 `payments`

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

Notes:

- `UNIQUE(tenant_id, bill_id)` is the main race prevention rule for Phase 3.
- `UNIQUE(sepay_transaction_id)` is the webhook idempotency guard.
- `method` may be null while QR is generated but not yet paid.
- `paid_amount` stores actual cash/VietQR amount received. For overpayment, it can be higher than `rounded_total`.

### 4.2 `refunds`

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

CREATE INDEX idx_refunds_tenant_payment
  ON refunds (tenant_id, payment_id);

CREATE INDEX idx_refunds_tenant_status_created
  ON refunds (tenant_id, status, created_at DESC);
```

Optional but recommended for full-refund-only demo:

```sql
CREATE UNIQUE INDEX uq_refunds_one_active_per_payment
  ON refunds (payment_id)
  WHERE status IN ('PENDING_STAFF_ACTION', 'CONFIRMED');
```

### 4.3 `audit_payments`

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
      'SEPAY_WEBHOOK_UNMATCHED',
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

Notes:

- `payment_id` is nullable so unmatched webhook can still be audited if we want to persist it. If this feels too much for Phase 3, unmatched webhook can be application log only.
- `actor_type = 'SEPAY'` and `actor_id = NULL` for webhook events.

## 5. Core Algorithms

### 5.1 Bill Reference Extraction

```ts
const BILL_REF_REGEX = /QRTBL[A-Z0-9]{8,12}/i;

function extractBillReference(payload: SepayWebhookPayload): string | null {
  const code = payload.code?.trim().toUpperCase();
  if (code && BILL_REF_REGEX.test(code)) {
    return code.match(BILL_REF_REGEX)?.[0].toUpperCase() ?? null;
  }

  const content = payload.content?.trim() ?? '';
  return content.match(BILL_REF_REGEX)?.[0]?.toUpperCase() ?? null;
}
```

Recommended reference length:

- Use `QRTBL` + 10-12 random/base32 chars if possible.
- Avoid only `billId.slice(0, 8)` if UUID collision risk is unacceptable.
- For Phase 3 demo, `QRTBL` + first 8 uppercase chars is acceptable if `UNIQUE(tenant_id, bill_reference)` catches collisions and regenerates.

### 5.2 SePay Webhook Handling

```ts
async function handleSepayWebhook(payload: SepayWebhookPayload) {
  const billReference = extractBillReference(payload);

  if (!billReference || payload.transferType !== 'in') {
    auditOrLog('SEPAY_WEBHOOK_UNMATCHED', payload);
    return { status: 'ignored' }; // HTTP 200
  }

  return dataSource.transaction(async (manager) => {
    const payment = await manager
      .createQueryBuilder(Payment, 'payment')
      .setLock('pessimistic_write')
      .where('payment.bill_reference = :billReference', { billReference })
      .getOne();

    if (!payment) {
      auditOrLog('SEPAY_WEBHOOK_UNMATCHED', payload);
      return { status: 'ignored' };
    }

    if (payment.sepayTransactionId === payload.id || payment.status === 'PAID') {
      await audit(payment, 'SEPAY_WEBHOOK_DUPLICATE', { payload });
      return { status: 'duplicate' };
    }

    if (payload.transferAmount < payment.roundedTotal) {
      await audit(payment, 'SEPAY_WEBHOOK_UNDERPAID', { payload });
      return { status: 'underpaid' };
    }

    payment.status = 'PAID';
    payment.method = 'VIETQR';
    payment.paidAmount = payload.transferAmount;
    payment.sepayTransactionId = payload.id;
    payment.sepayReferenceCode = payload.referenceCode;
    payment.sepayGateway = payload.gateway;
    payment.sepayTransferContent = payload.content;
    payment.paidAt = new Date();

    await manager.save(payment);
    await createOutbox(manager, 'payment.completed', payment.billId, {
      tenantId: payment.tenantId,
      billId: payment.billId,
      paymentId: payment.id,
      method: 'VIETQR',
      amount: payment.paidAmount,
      paidAt: payment.paidAt.toISOString(),
    });

    return { status: 'paid' };
  });
}
```

### 5.3 Cash vs VietQR Race Handling

Same payment row, same lock:

```ts
await dataSource.transaction(async (manager) => {
  const payment = await findOrCreatePaymentForBill(manager, tenantId, billId);

  await manager
    .createQueryBuilder(Payment, 'payment')
    .setLock('pessimistic_write')
    .where('payment.id = :id', { id: payment.id })
    .getOneOrFail();

  if (payment.status === 'PAID') {
    throw new ConflictException('Bill already paid');
  }

  payment.method = 'CASH';
  payment.status = 'PAID';
  payment.amountReceived = amountReceived;
  payment.changeAmount = amountReceived - payment.roundedTotal;
  payment.paidAmount = payment.roundedTotal;
  payment.paidAt = new Date();

  await manager.save(payment);
  await createOutbox(manager, 'payment.completed', payment.billId, ...);
});
```

No Redis lock is required.

## 6. Kafka Contract Draft

### `payment.completed`

Producer: Payment Service  
Consumers: Order Service, Catalog Service, Notification Service, BFF bridge

```json
{
  "eventId": "uuid",
  "eventType": "payment.completed",
  "tenantId": "tenant-id",
  "billId": "bill-id",
  "paymentId": "payment-id",
  "method": "CASH",
  "amount": 128000,
  "paidAt": "2026-05-08T07:00:00.000Z",
  "correlationId": "process-id"
}
```

### `payment.refunded`

Producer: Payment Service  
Consumers: Order Service, Notification Service, BFF bridge

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
  "confirmedAt": "2026-05-08T07:10:00.000Z",
  "correlationId": "process-id"
}
```

Pragmatic recommendation:

- Use a Payment Service local `outbox_events` table with the same shape as Order Service.
- Do not attempt cross-service transaction between Payment DB and Order DB.
- Order/Catalog consumers must be idempotent by `eventId` or by current state checks (`BillStatus.PAID` no-op).

## 7. Security and Authorization Findings

| Finding                                                                                                              | Severity | Recommendation                                                                                                                                       |
| -------------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook must bypass normal JWT guards but verify `X-Secret-Key`.                                                     | High     | Public endpoint with secret-header auth only. Resolve tenant via payment record.                                                                     |
| Permission Matrix grants `payment.create` to OWNER/MANAGER, not WAITER. POS waiter likely needs to create VietQR QR. | Medium   | Either grant `PAYMENT_CREATE` to WAITER or create a narrower `PAYMENT_CREATE_VIETQR` permission. Simpler: grant WAITER `payment.create` for Phase 3. |
| Phase 3 mentions `PAYMENT_REFUND_CONFIRM`, but matrix only has `PAYMENT_REFUND`.                                     | Low      | Reuse `PAYMENT_REFUND` for both request and confirm. Avoid a new permission unless UX requires separate roles.                                       |
| Current shared `PaymentMethod` still says Phase 3 will add card/MoMo/ZaloPay/bank transfer.                          | Low      | For SePay scope, extend with `VIETQR` only.                                                                                                          |
| `phase-3-payment.md` has a Markdown typo around `X-Secret-Key` formatting.                                           | Low      | Fix before final spec.                                                                                                                               |

## 8. Open Questions for Approval

Please answer these before I write `docs/specs/business-logic-phase-3-spec.vi.md`.

1. **Underpaid VietQR:** If customer transfers less than `rounded_total`, choose one:
   - A. Keep payment `PENDING`, audit `SEPAY_WEBHOOK_UNDERPAID`, staff handles manually. Recommended.
   - B. Mark payment `FAILED` and require new QR/payment.

2. **Overpaid VietQR:** If customer transfers more than `rounded_total`, choose one:
   - A. Accept as `PAID`, store `paid_amount = transferAmount`, no auto-refund. Recommended.
   - B. Accept as `PAID` and automatically create refund request for the difference.

3. **Refund scope for Phase 3:**
   - A. Full refund only, one refund per payment. Recommended for demo.
   - B. Allow partial refund amount input, but still manual.

4. **WAITER permission for VietQR creation:**
   - A. Grant WAITER `payment.create` so POS can create QR. Recommended.
   - B. Only OWNER/MANAGER can create VietQR; WAITER can only confirm cash.

5. **Unmatched webhook persistence:**
   - A. Application log only, return 200. Recommended for simplicity.
   - B. Persist in `audit_payments` with nullable `payment_id`.

6. **Bill reference format:**
   - A. `QRTBL` + first 8 chars of `billId`, regenerate on unique collision. Simple and matches current Phase 3 doc.
   - B. `QRTBL` + 10-12 char random/base32 token stored on payment. Recommended if you want lower collision risk.

## 9. Recommended Decisions

If you want the simplest production-real demo path, I recommend:

- Q1: A — underpaid remains pending with audit.
- Q2: A — overpaid accepted, actual amount stored.
- Q3: A — full refund only.
- Q4: A — WAITER can create VietQR QR.
- Q5: A — unmatched webhook is application log only.
- Q6: B — random/base32 reference, not UUID slice.
