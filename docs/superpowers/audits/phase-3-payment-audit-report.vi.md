# Báo Cáo Audit Kiến Trúc Phase 3 Payment

> Phạm vi: Phase 3 — Payment Service (SePay/VietQR + Cash)  
> Vai trò: Kiến trúc sư backend, định hướng baseline thực dụng cho production  
> Trạng thái: Bản nháp chờ phê duyệt policy. Dừng tại đây trước khi viết spec cuối.

## 1. Nguồn đã đối chiếu

- `docs/phases/phase-3-payment.md`
- `docs/business-logic.md` §6 Payment & Reconciliation
- `docs/technical-architecture.md` §6.2.7, §7.2-7.4, §10
- `docs/implementation_plan.md`
- `docs/architecture/permission-matrix.md`
- `docs/references/auth-system-reference.md`
- `docs/business-logic-step-2.4-spec.vi.md`
- Quét code hiện tại: `Bill`, `OutboxEvent`, Order outbox publisher, shared `BillStatus`, `PaymentMethod`
- Context7 SePay docs: VietQR QR image URL và webhook/IPN SePay với `X-Secret-Key`

### Ghi chú codebase hiện tại

- Chưa có `apps/payment`. Phase 3 sẽ thêm service này.
- `Bill` đã có trong `libs/entities` và thuộc ownership của Order Service.
- `BillStatus` đã hỗ trợ `OPEN -> PENDING_PAYMENT -> PAID`.
- `PaymentMethod` hiện chỉ có `CASH`; cần mở rộng thêm `VIETQR`.
- `OutboxEvent` và `OutboxPublisherService` đã có ở Order Service. Payment Service nên tái sử dụng cùng mẫu outbox đơn giản cho `payment.completed` / `payment.refunded`.
- Kafka config hiện chỉ có `order.confirmed` và `kitchen.sla_warning`; Phase 3 cần thêm key config cho `payment.completed` và `payment.refunded`.

## 2. Tóm tắt audit kiến trúc

Hướng SePay + Cash là hợp lý cho luồng demo/production-real: tránh độ phức tạp cổng thẻ, bám sát hành vi chuyển khoản nội địa, đồng thời giữ Payment Service là owner bản ghi thanh toán còn Order Service vẫn là owner của bill.

Các phần còn thiếu chủ yếu không phải lỗ hổng kiến trúc lớn, mà là những quyết định policy nhỏ nhưng quan trọng:

- Một `payment` active cho mỗi `billId` trong Phase 3.
- Dùng DB transaction + row lock là đủ để xử lý race Cash vs VietQR.
- Idempotency webhook nên chốt bằng `UNIQUE(sepay_transaction_id)` cộng kiểm tra trạng thái.
- Webhook chuyển khoản thiếu tiền (underpaid) không được làm crash hay đánh dấu bill là paid.
- Audit hoàn tiền cần tách riêng người yêu cầu và người xác nhận.
- Permission Matrix nhiều khả năng cần cho WAITER quyền tạo QR VietQR từ POS, nếu không luồng VietQR tại POS sẽ bị chặn.

## 3. Review luồng nghiệp vụ

### 3.1 Luồng Cash

Luồng đề xuất là chấp nhận được:

1. Bill đã ở trạng thái `PENDING_PAYMENT`.
2. Nhân viên nhập số tiền khách đưa.
3. Payment Service validate `amountReceived >= roundedTotal`.
4. Payment Service khóa row payment của bill.
5. Nếu trạng thái đã là `PAID` thì reject conflict.
6. Nếu chưa paid thì set method `CASH`, status `PAID`, cập nhật các field thanh toán và emit `payment.completed`.

Rủi ro rõ ràng:

- Nếu QR VietQR đã hiển thị từ trước, khách vẫn có thể chuyển khoản sau khi nhân viên đã thu tiền mặt. Không thể tránh hoàn toàn ở tầng UI. Row lock + status check ở DB phải đảm bảo webhook trở thành no-op nếu cash đã thắng trước.

Quyết định thực dụng:

- Không cố làm distributed lock bằng Redis.
- Không tạo saga giữa Cash và SePay.
- Dùng một DB transaction trên bảng `payments` và một ràng buộc `UNIQUE(tenant_id, bill_id)`.

### 3.2 Luồng SePay / VietQR

Luồng đề xuất là chấp nhận được:

1. Payment Service tạo mới hoặc tái sử dụng payment row đang pending cho bill.
2. Sinh `bill_reference`, ví dụ `QRTBL` + 8-12 ký tự in hoa.
3. Trả về `qrUrl = https://qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...`.
4. SePay gọi webhook với JSON body và `X-Secret-Key`.
5. BFF verify `X-Secret-Key`.
6. Payment Service trích xuất `billReference`, khóa payment row, validate số tiền, đánh dấu paid, emit `payment.completed`.

Rủi ro rõ ràng:

- `code` có thể null, nên cần fallback regex trên `content`.
- `transferAmount` có thể nhỏ hơn, bằng hoặc lớn hơn tổng bill.
- SePay có thể gửi webhook trùng.
- Webhook có thể đến sau khi nhân viên đã xác nhận cash.

Quyết định thực dụng:

- Nếu `transferAmount >= rounded_total`, chấp nhận và lưu actual amount nhận được.
- Nếu `transferAmount < rounded_total`, giữ payment ở `PENDING`, ghi audit log nếu match được payment, trả 200 để tránh retry loop, và hiển thị trạng thái "chuyển thiếu tiền" cho staff qua lịch sử/trạng thái payment.
- Nếu webhook trùng cùng `sepayTransactionId`, trả 200 no-op.
- Nếu payment đã `PAID` bởi phương thức khác, trả 200 no-op và audit `WEBHOOK_AFTER_PAID`.

### 3.3 Bảo mật webhook

Context7 SePay docs xác nhận:

- SePay gửi JSON body.
- Secret nằm ở header `X-Secret-Key`.
- Verify bằng cách so sánh header với secret cấu hình.
- Không cần verify chữ ký raw-body kiểu Stripe.

Policy BFF khuyến nghị:

- Endpoint webhook là public nhưng guard bằng `X-Secret-Key`.
- Không dùng `UserGuard`, `TenantGuard`, `PermissionGuard` cho SePay webhook.
- Không tin `tenant_id` từ header ở endpoint này.
- Resolve tenant sau khi đã tìm được payment theo `billReference`.
- Trả:
  - `401` nếu thiếu/sai secret.
  - `200` cho duplicate, unmatched, underpaid, hoặc webhook sau khi đã paid (sau khi đã log nội bộ). Non-2xx chỉ nên dành cho auth failure hoặc hạ tầng lỗi tạm thời.

### 3.4 Luồng hoàn tiền thủ công (manual refund)

Mô hình manual refund phù hợp cho demo/luận văn:

1. Owner/Manager gửi yêu cầu hoàn tiền với lý do và tài khoản ngân hàng nhận.
2. Hệ thống tạo refund row với `PENDING_STAFF_ACTION`.
3. Staff/Owner chuyển khoản thủ công trên app ngân hàng.
4. Staff/Owner xác nhận hoàn tiền trên Dashboard.
5. Hệ thống ghi audit và emit `payment.refunded`.

Khoảng trống rõ trong mô tả Phase 3 hiện tại:

- `refunds.refunded_by` bị mơ hồ. Cần cả `requested_by_user_id` và `confirmed_by_user_id`.
- `audit_payments.actor_id` cần hỗ trợ actor hệ thống/external cho sự kiện webhook SePay.
- Permission Matrix có `PAYMENT_REFUND`, nhưng Phase 3 nhắc `PAYMENT_REFUND_CONFIRM`. Nên giữ đơn giản: dùng một quyền `payment.refund` cho cả request và confirm, giới hạn OWNER/MANAGER.

Đơn giản hóa khuyến nghị:

- Phase 3 hỗ trợ một bản ghi refund cho mỗi payment, mặc định full refund.
- Giữ trường `amount` trong schema để không chặn khả năng partial refund sau này, nhưng UI có thể mặc định full amount và (tùy chọn) khóa không cho sửa.

## 4. Bản nháp schema dữ liệu đề xuất

Bản nháp này giả định Phase 3 chưa hỗ trợ split bill hoặc nhiều payment thành công cho một bill.

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

Ghi chú:

- `UNIQUE(tenant_id, bill_id)` là quy tắc chính để chặn race ở Phase 3.
- `UNIQUE(sepay_transaction_id)` là lớp guard idempotency cho webhook.
- `method` có thể null khi đã tạo QR nhưng chưa thanh toán thành công.
- `paid_amount` lưu actual amount nhận được (cash/VietQR). Với overpaid, giá trị này có thể lớn hơn `rounded_total`.

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

Tùy chọn nhưng khuyến nghị cho demo full-refund-only:

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

Ghi chú:

- `payment_id` để nullable để có thể audit unmatched webhook nếu cần persist. Nếu thấy nặng cho Phase 3, unmatched webhook có thể chỉ log ở application log.
- Với webhook events: `actor_type = 'SEPAY'`, `actor_id = NULL`.

## 5. Thuật toán cốt lõi

### 5.1 Trích xuất Bill Reference

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

Độ dài reference khuyến nghị:

- Ưu tiên `QRTBL` + 10-12 ký tự random/base32 nếu có thể.
- Tránh chỉ dùng `billId.slice(0, 8)` nếu rủi ro collision UUID không chấp nhận được.
- Cho demo Phase 3, `QRTBL` + 8 ký tự đầu in hoa là chấp nhận được nếu `UNIQUE(tenant_id, bill_reference)` bắt collision và regenerate.

### 5.2 Xử lý SePay Webhook

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

### 5.3 Xử lý race Cash vs VietQR

Cùng payment row, cùng lock:

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

Không cần Redis lock.

## 6. Bản nháp hợp đồng Kafka

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

Khuyến nghị thực dụng:

- Dùng bảng `outbox_events` local trong Payment Service cùng shape với Order Service.
- Không cố làm cross-service transaction giữa Payment DB và Order DB.
- Consumer phía Order/Catalog phải idempotent theo `eventId` hoặc theo current state checks (`BillStatus.PAID` => no-op).

## 7. Phát hiện bảo mật và phân quyền

| Phát hiện                                                                                                               | Mức độ | Khuyến nghị                                                                                                                                    |
| ----------------------------------------------------------------------------------------------------------------------- | ------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Webhook phải bypass JWT guards thông thường nhưng verify `X-Secret-Key`.                                                | High   | Dùng public endpoint với secret-header auth. Resolve tenant qua payment record.                                                                |
| Permission Matrix cấp `payment.create` cho OWNER/MANAGER, không có WAITER. POS waiter nhiều khả năng cần tạo QR VietQR. | Medium | Hoặc cấp `PAYMENT_CREATE` cho WAITER, hoặc thêm quyền hẹp hơn `PAYMENT_CREATE_VIETQR`. Đơn giản nhất cho Phase 3: cấp WAITER `payment.create`. |
| Phase 3 nhắc `PAYMENT_REFUND_CONFIRM`, nhưng matrix chỉ có `PAYMENT_REFUND`.                                            | Low    | Dùng lại `PAYMENT_REFUND` cho cả request và confirm. Tránh thêm permission mới nếu UX chưa cần tách role.                                      |
| Shared `PaymentMethod` hiện vẫn ghi chú sẽ thêm card/MoMo/ZaloPay/bank transfer ở Phase 3.                              | Low    | Trong scope SePay hiện tại, chỉ cần thêm `VIETQR`.                                                                                             |
| `phase-3-payment.md` có lỗi Markdown quanh định dạng `X-Secret-Key`.                                                    | Low    | Sửa trước khi chốt spec cuối.                                                                                                                  |

## 8. Câu hỏi mở cần phê duyệt

Vui lòng chốt các câu này trước khi tôi viết `docs/specs/business-logic-phase-3-spec.vi.md`.

1. **VietQR chuyển thiếu tiền (underpaid):** Nếu khách chuyển ít hơn `rounded_total`, chọn:
   - A. Giữ payment ở `PENDING`, audit `SEPAY_WEBHOOK_UNDERPAID`, staff xử lý thủ công. Khuyến nghị.
   - B. Đánh dấu payment `FAILED` và yêu cầu tạo QR/payment mới.

2. **VietQR chuyển dư tiền (overpaid):** Nếu khách chuyển nhiều hơn `rounded_total`, chọn:
   - A. Chấp nhận `PAID`, lưu `paid_amount = transferAmount`, không auto-refund. Khuyến nghị.
   - B. Chấp nhận `PAID` và tự động tạo refund request cho phần chênh.

3. **Phạm vi refund cho Phase 3:**
   - A. Chỉ full refund, mỗi payment một refund. Khuyến nghị cho demo.
   - B. Cho phép nhập amount partial refund, vẫn manual.

4. **Quyền WAITER để tạo QR VietQR:**
   - A. Cấp WAITER quyền `payment.create` để POS tạo QR được. Khuyến nghị.
   - B. Chỉ OWNER/MANAGER được tạo VietQR; WAITER chỉ xác nhận cash.

5. **Lưu unmatched webhook:**
   - A. Chỉ application log, trả 200. Khuyến nghị để giữ đơn giản.
   - B. Persist vào `audit_payments` với `payment_id` nullable.

6. **Định dạng bill reference:**
   - A. `QRTBL` + 8 ký tự đầu của `billId`, regenerate nếu trùng unique. Đơn giản và khớp tài liệu Phase 3 hiện tại.
   - B. `QRTBL` + token random/base32 10-12 ký tự lưu trên payment. Khuyến nghị nếu muốn giảm rủi ro collision.

## 9. Bộ quyết định khuyến nghị

Nếu mục tiêu là con đường demo production-real đơn giản nhất, tôi đề xuất:

- Q1: A — underpaid giữ pending và ghi audit.
- Q2: A — overpaid chấp nhận, lưu actual amount.
- Q3: A — chỉ full refund.
- Q4: A — WAITER được tạo QR VietQR.
- Q5: A — unmatched webhook chỉ log ở application layer.
- Q6: B — bill reference random/base32, không dùng UUID slice.
