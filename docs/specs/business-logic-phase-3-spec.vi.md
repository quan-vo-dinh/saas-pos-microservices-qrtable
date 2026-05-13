# Phase 3 — Đặc Tả Nghiệp Vụ & Kiến Trúc Payment Service Chính Thức

> **Giai đoạn:** Phase 3 — Payment Service (SePay/VietQR + Cash)  
> **Ngày:** 2026-05-08  
> **Trạng thái:** Chốt sau audit Phase 3 và quyết định Q1-Q6 của project owner.
> **Mục đích:** Tài liệu này là tiêu chuẩn nghiệp vụ/kỹ thuật cho Phase 3. Đây không phải implementation plan và không phân rã task code.

---

## 0. Biên Bản Quyết Định

| Câu hỏi | Quyết định  | Nội dung chốt                                                                                                                                        |
| ------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| Q1      | Phương án A | Nếu khách chuyển thiếu tiền qua VietQR, giữ payment `PENDING`, ghi audit `SEPAY_WEBHOOK_UNDERPAID`, trả webhook HTTP 200 và để staff xử lý thủ công. |
| Q2      | Phương án A | Nếu khách chuyển dư tiền qua VietQR, chấp nhận `PAID`, lưu `paidAmount = transferAmount`, không tự tạo refund cho phần chênh.                        |
| Q3      | Phương án A | Phase 3 chỉ hỗ trợ **full refund**, tối đa một refund active/confirmed cho mỗi payment.                                                              |
| Q4      | Phương án A | WAITER được quyền `payment.create` để tạo QR VietQR trên POS.                                                                                        |
| Q5      | Phương án A | Webhook không khớp bill/payment chỉ ghi application log và trả HTTP 200; không persist vào `audit_payments`.                                         |
| Q6      | Phương án A | `billReference = "QRTBL" + first 8 chars of billId`, nếu đụng unique thì regenerate bằng suffix đơn giản.                                            |

### 0.1 Tài Liệu Này Override Điểm Nào?

1. Phase 3 không dùng Stripe, không redirect sang hosted checkout, không verify raw-body signature.
2. Payment online của Phase 3 là **SePay + VietQR inline**: hệ thống build QR URL và chờ webhook xác nhận.
3. `PaymentMethod` Phase 3 chỉ mở rộng thêm `VIETQR`. Không thêm `CARD`, `MOMO`, `ZALOPAY`, `BANK_TRANSFER` trong scope này.
4. Refund Phase 3 là **manual full refund**: staff/owner chuyển khoản tay ngoài hệ thống rồi xác nhận trong Dashboard.
5. Không thiết kế distributed lock, Redis lock, saga riêng, hoặc replay queue riêng cho webhook. PostgreSQL transaction + constraint là baseline.

---

## 1. Cơ Sở Tài Liệu và Context7

### 1.1 Cơ Sở Trong Repo

- `docs/phases/phase-3-payment.md`
- `docs/phases/phase-3-payment.md`
- `docs/business-logic.md` §6
- `docs/technical-architecture.md` §6.2.7, §7.2-7.4, §10
- `docs/implementation_plan.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `docs/specs/business-logic-step-2.4-spec.vi.md`
- Code hiện tại: `Bill`, `BillStatus`, `PaymentMethod`, `OutboxEvent`, Order outbox publisher.

### 1.2 Kết Quả Context7 Dùng Cho Spec

Tài liệu SePay từ Context7 (`/websites/developer_sepay_vn`) xác nhận:

- VietQR image URL có format:

```text
https://qr.sepay.vn/img?acc=SO_TAI_KHOAN&bank=NGAN_HANG&amount=SO_TIEN&des=NOI_DUNG
```

- SePay webhook gửi JSON body thông thường.
- Webhook có header:

```http
X-Secret-Key: <secret_key>
Content-Type: application/json
```

- Payload webhook có các field chính: `id`, `gateway`, `transactionDate`, `accountNumber`, `code`, `content`, `transferType`, `transferAmount`, `accumulated`, `subAccount`, `referenceCode`, `description`.
- `code` có thể `null`; hệ thống phải fallback parse từ `content`.

---

## 2. Phạm Vi và Ngoài Phạm Vi

### 2.1 Trong Phạm Vi Phase 3

1. Tạo Payment Service mới (`apps/payment`) với PostgreSQL riêng `qrtable_payment`.
2. Tạo và hiển thị VietQR cho bill ở trạng thái `PENDING_PAYMENT`.
3. Nhận webhook SePay qua BFF endpoint public có `X-Secret-Key`.
4. Xác nhận thanh toán tiền mặt trên POS.
5. Chống duplicate webhook bằng DB unique constraint.
6. Chống race Cash vs VietQR bằng transaction + row lock trên payment.
7. Emit Kafka:
   - `payment.completed`
   - `payment.refunded`
8. Manual full refund có audit.
9. Payment history cơ bản cho POS/Dashboard.
10. Cập nhật shared type, permission, config cần thiết.

### 2.2 Ngoài Phạm Vi Phase 3

1. Không split bill.
2. Không partial refund.
3. Không auto payout/auto bank transfer refund.
4. Không đối soát ngân hàng tự động cuối ngày.
5. Không hỗ trợ nhiều gateway song song.
6. Không tạo webhook replay dashboard.
7. Không tạo Redis lock hoặc distributed lock.
8. Không đảm bảo chính xác tuyệt đối cho trường hợp khách chuyển khoản sai nội dung và staff tự đối soát thủ công. Trường hợp này chỉ application log trong Phase 3.

---

## 3. Service Boundary và Ownership

### 3.1 Ownership

| Domain object   | Owner                    | Storage                          | Ghi chú                                                                                                                   |
| --------------- | ------------------------ | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Bill            | Order Service            | `qrtable_order.bills`            | Payment Service chỉ nhận `billId`, không sở hữu lifecycle bill.                                                           |
| Payment         | Payment Service          | `qrtable_payment.payments`       | Source of truth cho method, paid amount, SePay transaction.                                                               |
| Refund          | Payment Service          | `qrtable_payment.refunds`        | Manual full refund, audit bắt buộc.                                                                                       |
| Payment audit   | Payment Service          | `qrtable_payment.audit_payments` | Truy vết payment/refund.                                                                                                  |
| Table status    | Catalog Service          | `qrtable_catalog.tables`         | Order `BillService.markPaid` gọi Catalog TCP `TABLE.UPDATE_STATUS` sau fast path hoặc Kafka `payment.completed` consumer. |
| User/permission | User-Access + Authorizer | MongoDB + Keycloak               | BFF enforce permission với staff routes.                                                                                  |

### 3.2 Communication

| Flow                                        | Protocol                      | Lý do                                                  |
| ------------------------------------------- | ----------------------------- | ------------------------------------------------------ |
| Client -> BFF payment endpoints             | HTTP REST                     | BFF là API gateway duy nhất.                           |
| BFF -> Payment Service                      | TCP                           | Theo pattern service hiện tại.                         |
| Payment Service -> Order Service query bill | TCP                           | Payment cần snapshot bill để tạo payment/QR.           |
| Payment Service -> Kafka                    | Kafka via local outbox        | Domain events `payment.completed`, `payment.refunded`. |
| SePay -> BFF webhook                        | HTTP POST                     | External callback.                                     |
| BFF -> clients realtime                     | WebSocket bridge / BFF Direct | UI status update, không thay source of truth.          |

---

## 4. State Machines

### 4.1 Bill State

Bill state vẫn thuộc Order Service:

```text
OPEN -> PENDING_PAYMENT -> PAID
```

Phase 3 chỉ được hoàn tất bill khi nhận `payment.completed`.

Rules:

- Chỉ tạo payment khi bill đang `PENDING_PAYMENT`.
- Bill `PAID` là immutable.
- Nếu payment underpaid, bill vẫn `PENDING_PAYMENT`.
- Refund không reopen bill; bill vẫn `PAID`.

### 4.2 Payment State

```text
PENDING -> PAID -> REFUND_PENDING -> REFUNDED
             ↘
              FAILED
```

Rules:

- `PENDING`: đã tạo payment row/QR hoặc chuẩn bị cash confirm.
- `PAID`: cash hoặc SePay đã xác nhận đủ tiền.
- `REFUND_PENDING`: Owner/Manager đã tạo refund request, chờ chuyển khoản tay.
- `REFUNDED`: staff/owner xác nhận đã hoàn tiền tay.
- `FAILED`: chỉ dùng cho lỗi nghiệp vụ có chủ đích sau này. Underpaid không chuyển `FAILED` trong Phase 3.

### 4.3 Refund State

```text
PENDING_STAFF_ACTION -> CONFIRMED
                    ↘
                     CANCELED
```

Rules:

- Phase 3 chỉ full refund.
- Mỗi payment có tối đa một refund active/confirmed.
- `CONFIRMED` nghĩa là người dùng nội bộ đã xác nhận đã chuyển khoản ngoài hệ thống.
- Hệ thống không gọi API ngân hàng để chuyển tiền refund.

---

## 5. Data Schema Chính Thức

### 5.1 Bảng `payments`

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

| Field                  | Ý nghĩa                                                       |
| ---------------------- | ------------------------------------------------------------- |
| `tenant_id`            | Tenant scope bắt buộc.                                        |
| `bill_id`              | Bill thuộc Order Service.                                     |
| `bill_reference`       | Mã đưa vào nội dung VietQR, format `QRTBL` + 8 chars.         |
| `method`               | `CASH` hoặc `VIETQR`; có thể null khi payment mới pending.    |
| `raw_total`            | Tổng gốc từ bill/order snapshot.                              |
| `rounded_total`        | Số tiền phải thu sau rounding.                                |
| `rounding_delta`       | `rounded_total - raw_total`.                                  |
| `paid_amount`          | Số tiền thực thu; VietQR overpaid lưu số tiền chuyển thực tế. |
| `amount_received`      | Tiền mặt khách đưa, chỉ dùng cho `CASH`.                      |
| `change_amount`        | Tiền thừa, chỉ dùng cho `CASH`.                               |
| `sepay_transaction_id` | `payload.id` từ SePay, dùng chống webhook duplicate.          |

### 5.2 Bảng `refunds`

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

- `amount` phải bằng `payment.rounded_total` trong Phase 3 full refund.
- `requested_by_user_id` là Owner/Manager tạo yêu cầu.
- `confirmed_by_user_id` là người bấm xác nhận đã hoàn tiền tay.
- `customer_bank_account` nên bắt buộc ở UI nếu refund qua chuyển khoản.

### 5.3 Bảng `audit_payments`

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

- Unmatched webhook không persist vào `audit_payments`; chỉ application log.
- Matched underpaid webhook phải ghi audit để staff thấy lý do payment vẫn pending.
- `actor_type = 'SEPAY'` cho webhook.
- `actor_type = 'USER'` cho cash/refund actions.

### 5.4 Bảng `outbox_events`

Payment Service dùng cùng schema tối giản như Order Service:

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

| Endpoint                                | Actor                | Guard/Permission                                                | Mục đích                                    |
| --------------------------------------- | -------------------- | --------------------------------------------------------------- | ------------------------------------------- |
| `POST /api/v1/payment/vietqr/create-qr` | OWNER/MANAGER/WAITER | `UserGuard -> TenantGuard -> PermissionGuard`, `payment.create` | Tạo/reuse payment pending và trả QR URL.    |
| `POST /api/v1/payment/cash/confirm`     | OWNER/MANAGER/WAITER | `payment.confirm_cash`                                          | Xác nhận thu tiền mặt.                      |
| `POST /api/v1/payment/sepay/webhook`    | SePay                | Public endpoint + `X-Secret-Key`                                | Nhận webhook SePay. Không dùng JWT guards.  |
| `POST /api/v1/payment/refund/request`   | OWNER/MANAGER        | `payment.refund`                                                | Tạo yêu cầu full refund.                    |
| `POST /api/v1/payment/refund/confirm`   | OWNER/MANAGER        | `payment.refund`                                                | Xác nhận đã hoàn tiền tay.                  |
| `GET /api/v1/payment/history`           | OWNER/MANAGER/WAITER | `payment.get_history`                                           | Xem lịch sử payment theo tenant/bill/table. |

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

- Nếu payment pending đã tồn tại cho bill, return existing QR.
- Nếu payment đã `PAID`, trả conflict hoặc current paid state để UI hiển thị đã thanh toán.
- Nếu bill không ở `PENDING_PAYMENT`, reject `409`.

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

The BFF must return HTTP 401 for:

- Missing or invalid `X-Secret-Key`.

### 6.5 Refund Request

Request:

```json
{
  "paymentId": "uuid",
  "reason": "Khách yêu cầu hoàn tiền vì nhập nhầm hóa đơn",
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

Chốt theo Q6-A:

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
2. Fallback regex trên `payload.content`.
3. Nếu không tìm được, application log và HTTP 200.

### 7.4 Verify SePay Webhook

```ts
function verifySepaySecret(received: string | undefined, expected: string): boolean {
  return Boolean(received) && received === expected;
}
```

Rules:

- This happens in BFF before TCP call.
- No raw body required.
- No HMAC required.
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

Webhook endpoint does not use JWT guards:

```text
Public HTTP endpoint -> X-Secret-Key verification -> Payment Service TCP
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
- Rounding line.
- `roundedTotal`.
- QR image.
- `billReference`.
- Status pill:
  - `PENDING`: Đang chờ chuyển khoản.
  - `PAID`: Đã thanh toán.
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

## 14. Test Matrix Tối Thiểu

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

## 15. Inputs Cho Bước `writing-plans`

Implementation plan sau tài liệu này nên tạo các nhóm việc:

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
