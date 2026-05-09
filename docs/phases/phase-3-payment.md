# Phase 3 — Payment

> **Mục tiêu:** Khép kín luồng thanh toán tiền mặt và VietQR/SePay (VND) trên POS/Dashboard và Customer PWA — làm tròn đúng quy tắc VND, bill bất biến sau Paid, hoàn tiền có vết audit — để doanh thu và trạng thái bàn/session phản ánh thực tế thu ngân.
> **Ước lượng:** ~1-2 tuần
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 2B hoàn thành — [phase-2b-kitchen-websocket.md](phase-2b-kitchen-websocket.md) (đơn/bếp ổn định, WebSocket và Kafka nền tảng sẵn sàng cho sự kiện downstream)
- Order Service cung cấp `billId` và tổng hợp bill là nguồn sự thật cho tổng tiền trước thanh toán — Payment Service không sở hữu nghiệp vụ bill
- Tài khoản ngân hàng doanh nghiệp đã kết nối SePay (sandbox cho dev/demo, live cho production)

## Tham Chiếu


| Tài liệu                  | Section liên quan                                         |
| ------------------------- | --------------------------------------------------------- |
| technical-architecture.md | §6.2.7 Payment Service, §10 Tích hợp thanh toán           |
| business-logic.md         | §6 Luồng thanh toán & đối soát (Payment & Reconciliation) |


## Tổng Quan

Phase 3 sử dụng **SePay** làm cổng nhận thanh toán chuyển khoản ngân hàng qua **VietQR động** — không có redirect sang hosted page. Payment Service tách trách nhiệm thanh toán khỏi Order Service theo đúng bounded context: chỉ ghi nhận và điều phối tiền (VietQR/SePay, tiền mặt), làm tròn VND, refund và audit — còn bill/order lifecycle vẫn do Order Service dẫn dắt qua `billId`.

**Luồng VietQR:** Payment Service tạo URL QR tĩnh nhúng trực tiếp (`qr.sepay.vn/img?acc=...&bank=...&amount=...&des=...`) với số tiền đã làm tròn và mã tham chiếu bill (pattern `QRTBL{billId_8}`) được nhúng vào nội dung chuyển khoản → POS/Customer hiển thị QR → Khách quét và chuyển khoản → SePay phát hiện giao dịch → POST webhook tới BFF với `X-Secret-Key` header → BFF xác thực bằng so sánh header token (không dùng raw-body HMAC như Stripe) → extract `code` hoặc khớp `content` → Payment Service cập nhật trạng thái "Paid".

**Tiền mặt** không đi SePay: staff xác nhận trên POS là điểm cam kết nghiệp vụ, sau đó `payment.completed` qua Kafka.

**Refund (Demo/Luận văn):** SePay không cung cấp API chuyển tiền hoàn lại tự động cho tài khoản ngân hàng thông thường. Luồng refund được thiết kế theo mô hình **Staff-confirmed Manual Refund**: Owner/Manager tạo refund record trên Dashboard (ghi rõ số tiền + lý do + số tài khoản khách), Staff thực hiện chuyển khoản tay qua app ngân hàng, sau đó bấm **"Xác nhận đã hoàn tiền"** trên Dashboard để hệ thống ghi `refunds` + `audit_payments` + emit `payment.refunded`.

Làm tròn `Math.ceil(amount / 1000) * 1000` với lưu `raw_total`, `rounded_total`, `rounding_delta` phục vụ đối soát. Hai topic `payment.completed` và `payment.refunded` là contract ổn định cho các consumer P1–P3.

---

## SePay — Tổng quan Tích hợp

### VietQR URL Format

SePay cung cấp endpoint tạo ảnh QR code trực tiếp, không cần SDK:

```
https://qr.sepay.vn/img?acc={SO_TAI_KHOAN}&bank={TEN_NGAN_HANG}&amount={SO_TIEN}&des={NOI_DUNG}
```


| Tham số  | Ví dụ           | Mô tả                                             |
| -------- | --------------- | ------------------------------------------------- |
| `acc`    | `9332770502`    | Số tài khoản ngân hàng (bắt buộc)                 |
| `bank`   | `Vietcombank`   | Tên ngân hàng SePay-compatible (bắt buộc)         |
| `amount` | `128000`        | Số tiền VND đã làm tròn (tùy chọn, nên truyền)    |
| `des`    | `QRTBLB1A2C3D4` | Nội dung chuyển khoản có mã tham chiếu (tùy chọn) |


**Ví dụ thực tế:**

```
https://qr.sepay.vn/img?acc=9332770502&bank=Vietcombank&amount=128000&des=QRTBLB1A2C3D4
```

QR code này nhúng trực tiếp qua thẻ `<img>` hoặc hiển thị bằng `next/image`. Không cần redirect. POS/PWA chỉ render ảnh và lắng nghe WebSocket để nhận confirmation.

### Webhook Payload (SePay → BFF)

Khi giao dịch phát sinh, SePay POST tới `BFF_WEBHOOK_URL` đã cấu hình:

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


| Field            | Ý nghĩa                                                                    |
| ---------------- | -------------------------------------------------------------------------- |
| `transferType`   | `"in"` = tiền vào, `"out"` = tiền ra — chỉ xử lý `"in"`                    |
| `transferAmount` | Số tiền thực tế chuyển (integer, VND)                                      |
| `code`           | Mã thanh toán SePay tự detect từ `content`. Có thể `null` nếu không detect |
| `content`        | Nội dung chuyển khoản do khách nhập                                        |


**Matching logic** (theo thứ tự ưu tiên):

```typescript
// 1. Ưu tiên: khớp qua field `code` (SePay tự detect)
if (payload.code && payload.code.startsWith('QRTBL')) {
  billRef = payload.code; // "QRTBLB1A2C3D4"
}
// 2. Fallback: tìm pattern trong content
else {
  const match = payload.content.match(/QRTBL[A-Z0-9]{8}/i);
  billRef = match ? match[0] : null;
}

// Verify
const isValid = payload.transferType === 'in' && billRef !== null && payload.transferAmount >= bill.rounded_total;
```

### Webhook Authentication (X-Secret-Key)

SePay xác thực webhook bằng `**X-Secret-Key` header** — khác hoàn toàn với Stripe raw-body HMAC. BFF đọc header và so sánh trực tiếp:

```typescript
// BFF Webhook Controller
@Post('sepay/webhook')
async handleSepayWebhook(
  @Headers('x-secret-key') secretKey: string,
  @Body() payload: SepayWebhookDto,
) {
  const expectedSecret = this.configService.get('SEPAY_WEBHOOK_SECRET');

  if (!secretKey || secretKey !== expectedSecret) {
    throw new UnauthorizedException('Invalid webhook secret');
  }

  // Delegate to Payment Service via TCP, then return SePay's required raw body.
  await this.paymentClient.send(TCP_SEPAY_WEBHOOK, payload);
  return { success: true };
}
```

> **Lưu ý:** Không cần parse raw body riêng, không cần HMAC. BFF có thể dùng `@Body()` bình thường — không bị ảnh hưởng bởi JSON parse vì SePay không yêu cầu raw body.
> **Lưu ý response:** endpoint webhook là ngoại lệ của internal `ResponseDto` wrapper; SePay yêu cầu body thành công đúng dạng `{"success": true}` và phản hồi trong 30 giây.

### Environment Variables

```yaml
# Payment Service / BFF
SEPAY_WEBHOOK_SECRET: 'your_sepay_webhook_secret_key' # Khớp với secret_key trong SePay dashboard
BFF_PAYMENT_TCP_TIMEOUT_MS: 5000 # BFF chờ Payment Service qua TCP
PAYMENT_SEPAY_QR_ACCOUNT: '0010000000355' # Số tài khoản ngân hàng nhận tiền
PAYMENT_SEPAY_QR_BANK: 'Vietcombank' # Tên ngân hàng
PAYMENT_ORDER_TCP_TIMEOUT_MS: 5000 # Payment Service chờ Order Service qua TCP
BILL_REF_PREFIX: 'QRTBL' # Prefix nhận diện trong content
```

---

## Steps

### Step 3.1 — Tìm hiểu SePay + Thiết lập Tài khoản (1-2 ngày)

**Mục tiêu:** Hiểu mô hình webhook SePay, cách SePay detect payment code từ content, cấu hình tài khoản ngân hàng và webhook endpoint — để quyết định tại §6.2.7 / §10 được triển khai đúng.

**Phạm vi:**

- Đăng ký/đăng nhập SePay, kết nối tài khoản ngân hàng (sandbox hoặc real)
- Cấu hình webhook: `webhook_url = https://<bff-host>/api/v1/payment/sepay/webhook`, `auth_type = SECRET_KEY`, `event_type = In_only`, `is_verify_payment = 1`
- Cấu hình payment code detection trong SePay dashboard (Công ty → Cấu hình chung): nhận diện pattern `QRTBL` prefix
- Test thủ công: gửi chuyển khoản sandbox → verify BFF nhận webhook với `X-Secret-Key` hợp lệ
- Hiểu luồng end-to-end: tạo QR → khách quét → SePay detect giao dịch → POST webhook → BFF xác thực → Payment Service cập nhật

**Verify:** Có thể giải thích được: (1) khác gì Stripe về UX (không redirect, QR inline), (2) xác thực `X-Secret-Key` không phải HMAC, (3) `code` field là optional và fallback sang content regex, (4) refund phải manual.

---

### Step 3.2 — UI Contract (Customer + POS + Dashboard)

**Mục tiêu:** Cố định UX và dữ liệu hiển thị trước khi gắn service thật — sau khi tích hợp, UI phải giữ cùng contract nhưng đọc dữ liệu qua BFF/Payment/Order thay vì mock store.

**Phạm vi:**

- **Customer PWA (`/table/[id]`):** Nút "Yêu cầu thanh toán" → hiển thị **confirmation dialog** (chặn khi còn món chưa xong per §6 business-logic). Sau xác nhận → bàn chuyển trạng thái Billing → Customer thấy màn hình chờ "Đang thanh toán, vui lòng đợi nhân viên xác nhận" (polling/WS).
- **POS (`/pos/bills` canonical; `/pos/payment` chỉ redirect):** Staff thấy danh sách bill `PENDING_PAYMENT`, chọn bill bằng `?billId=...`, rồi thao tác **Bill settlement** ở panel bên phải.
  - **Tab "Tiền mặt":** Input tiền khách đưa → auto tính tiền thừa (`change = received − rounded_total`) → nút Confirm.
  - **Tab "VietQR":** Hiển thị **ảnh QR** (`<img src="https://qr.sepay.vn/img?...">`) với số tiền và mã bill. UI theo dõi trạng thái bằng payment history polling/WS khi có webhook.
- **Dashboard (`/dashboard/orders`):** Lịch sử thanh toán lấy từ `GET /payment/history` + nút **Refund** trên mỗi payment đã `PAID` (không dùng mock bill store). Refund dialog gồm: số tiền, lý do, số tài khoản/SĐT khách nếu cần đối soát, nút "Xác nhận đã chuyển khoản xong".

**Verify:** Màn render không phụ thuộc mock bill/payment store; rounding đúng công thức (ví dụ 127.500 → 128.000); QR hiển thị bằng URL trả về từ Payment Service; refund đọc payment history thật.

---

### Step 3.3 & 3.4 — Shared Types + Payment Service (PostgreSQL)

**Mục tiêu:** Contract type dùng chung FE/BFF/service và persistence layer thanh toán tách biệt — audit, refund và Kafka payload không phụ thuộc implementation UI.

**Shared types:**

```typescript
// libs/shared/types/src/lib/payment.types.ts
export enum PaymentMethod {
  CASH = 'CASH',
  VIETQR = 'VIETQR', // SePay chuyển khoản ngân hàng
  // MOMO = 'MOMO',             // mở rộng sau
  // ZALOPAY = 'ZALOPAY',       // mở rộng sau
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  REFUND_PENDING = 'REFUND_PENDING',
  REFUNDED = 'REFUNDED',
  FAILED = 'FAILED',
}

export interface Payment {
  id: string;
  tenantId: string;
  billId: string;
  method: PaymentMethod | null; // null khi payment record mới tạo và chưa xác nhận phương thức
  rawTotal: number;
  roundedTotal: number;
  roundingDelta: number;
  paidAmount?: number; // VietQR có thể lớn hơn roundedTotal
  amountReceived?: number; // tiền mặt: khách đưa bao nhiêu
  changeAmount?: number; // tiền mặt: tiền thừa
  sepayTransactionId?: number; // SePay webhook payload.id
  sepayReferenceCode?: string; // payload.referenceCode
  billReference: string; // "QRTBL" + billId_8chars (dùng trong QR content)
  status: PaymentStatus;
  paidAt?: Date;
}

export interface Refund {
  id: string;
  tenantId: string;
  paymentId: string;
  amount: number;
  reason: string;
  requestedByUserId: string; // userId tạo yêu cầu refund
  requestedAt: Date;
  confirmedByUserId?: string; // userId xác nhận đã chuyển tiền
  customerBankAccount?: string; // số TK/SĐT khách để staff tham chiếu khi chuyển tay
  customerBankName?: string;
  customerAccountName?: string;
  confirmedAt?: Date; // khi staff bấm "Xác nhận đã chuyển"
  status: 'PENDING_STAFF_ACTION' | 'CONFIRMED' | 'CANCELED';
}
```

**Payment Service (PostgreSQL — `qrtable_payment`):**

- **Entities:** `payments`, `refunds`, `audit_payments`
- **BFF REST Endpoints:**
  - `POST /payment/vietqr/create-qr` — tạo QR data cho bill (Customer/Staff) — không cần auth SePay API, chỉ build URL
  - `POST /payment/cash/confirm` — Staff xác nhận thu tiền mặt — `PAYMENT_CONFIRM_CASH`
  - `POST /payment/sepay/webhook` — SePay webhook receiver — `X-Secret-Key` verify (raw body không cần)
  - `POST /payment/refund/request` — Owner/Manager tạo refund record — `PAYMENT_REFUND`
  - `POST /payment/refund/confirm` — Owner/Manager xác nhận đã chuyển tiền tay — `PAYMENT_REFUND`
  - `GET /payment/history` — Staff, `PAYMENT_GET_HISTORY`

**VietQR Flow (chi tiết):**

```
1. Customer nhấn "Yêu cầu thanh toán"
   → Order Service: bill chuyển PENDING_PAYMENT, table chuyển Billing
   → BFF emit WS → POS thấy yêu cầu

2. Staff mở `/pos/bills`, chọn bill `PENDING_PAYMENT` → chọn tab "VietQR"
   → BFF → Payment Service (TCP): createVietQR({ billId, tenantId })
   → Payment Service:
       a. Tính rounded_total từ bill (qua Order Service TCP lấy billId subtotal)
       b. Sinh billReference = "QRTBL" + billId.slice(0, 8).toUpperCase()
       c. Build QR URL:
          "https://qr.sepay.vn/img?acc={BANK_ACCOUNT}&bank={BANK_NAME}
           &amount={rounded_total}&des={billReference}"
       d. Tạo payment record với status = PENDING
       e. Trả về { qrUrl, rounded_total, billReference, paymentId }

3. POS render <img src={qrUrl} /> — Khách/Staff quét mã

4. Khách chuyển khoản qua app ngân hàng với nội dung tự điền từ QR

5. SePay detect giao dịch → POST /api/v1/payment/sepay/webhook
   Headers: { X-Secret-Key: "..." }
   Body: { id, gateway, transferType: "in", transferAmount, code, content, ... }

6. BFF:
   a. So sánh header X-Secret-Key với env.SEPAY_WEBHOOK_SECRET
   b. Nếu khớp → gửi TCP tới Payment Service

7. Payment Service:
   a. Tìm billReference trong code hoặc content (regex QRTBL[A-Z0-9]{8})
   b. Verify: transferType == "in" && transferAmount >= bill.rounded_total
   c. Update payment: status = PAID, sepayTransactionId = payload.id, paidAt = now()
   d. Emit Kafka: payment.completed { tenantId, billId, method: "VIETQR" }

8. Kafka consumer (Order Service):
   → Bill status = PAID (bất biến)
   → Table status = Cleaning
   → Session closed

9. BFF Kafka bridge → WS → session:{sid}:customer: "Thanh toán thành công"
   → POS tab tự chuyển sang "Đã thanh toán ✓"
```

**Cash Flow:**

```
1. Staff chọn tab "Tiền mặt" trên POS
2. Nhập số tiền khách đưa → hệ thống hiển thị tiền thừa = received - rounded_total
3. Staff nhấn "Xác nhận đã thu tiền"
4. BFF → Payment Service (TCP): confirmCash({ billId, amountReceived })
5. Payment Service:
   - calculate change = amountReceived - rounded_total
   - update payment: status = PAID, method = CASH, amountReceived, changeAmount
   - Emit Kafka: payment.completed
```

**VND Rounding:**

```typescript
raw_total = Σ(item_price × quantity)
rounded_total = Math.ceil(raw_total / 1000) * 1000
rounding_delta = rounded_total - raw_total
// Lưu cả 3 giá trị: raw_total, rounded_total, rounding_delta (align §6.2.7)
```

**Refund Flow (Demo — Manual Bank Transfer):**

```
Luận văn Context: SePay không có API chuyển tiền hoàn lại tự động
cho tài khoản ngân hàng thông thường → Dùng mô hình Staff-confirmed Manual Refund.

1. Owner/Manager trên Dashboard → chọn bill đã Paid → nhấn "Refund"
2. Điền form: amount (partial/full), reason, customer_bank_account (SĐT/TK nhận tiền)
3. BFF → Payment Service: createRefundRequest({ paymentId, amount, reason, customerBankAccount })
4. Payment Service:
   - Tạo refund record status = PENDING_STAFF_ACTION
   - Update payment status = REFUND_PENDING
   - Ghi audit_payments { action: "REFUND_REQUESTED", actor, timestamp }
   - Trả về refund record

5. Staff/Owner thấy refund trên Dashboard với trạng thái "Chờ chuyển khoản"
   → Thông tin hiển thị: số tiền cần hoàn, tài khoản nhận

6. Staff/Owner thực hiện chuyển khoản tay qua app ngân hàng cá nhân

7. Staff/Owner bấm "Xác nhận đã hoàn tiền" trên Dashboard
8. BFF → Payment Service: confirmRefund({ refundId, confirmedBy })
9. Payment Service:
   - Update refund: status = CONFIRMED, confirmedAt = now()
   - Update payment: status = REFUNDED
   - Ghi audit_payments { action: "REFUND_CONFIRMED", actor, timestamp }
   - Emit Kafka: payment.refunded { tenantId, paymentId, amount }
   - Bill status giữ PAID (không reopen) — immutability cho reconciliation
```

> **Trade-off accepted (Luận văn):** Manual refund đủ để demo audit trail và immutability của bill. Không có SLA guarantee về thời gian hoàn tiền — đây là constraint của việc không dùng payment gateway có API payout (Stripe, VNPAY, ZaloPay doanh nghiệp).

**Kafka Events:**

- `payment.completed` → Order Service (PAID bill, Cleaning table), Notification Service (receipt email)
- `payment.refunded` → Order Service (adjust revenue), Notification Service

**Bill finalization:** Bill **bất biến sau trạng thái PAID** — mọi điều chỉnh đi qua refund flow, không sửa bill đã khóa.

**Entity schemas (PostgreSQL — `qrtable_payment`):**

```sql
-- payments
id UUID PRIMARY KEY,
tenant_id VARCHAR(64) NOT NULL,
bill_id UUID NOT NULL,
bill_reference VARCHAR(32) NOT NULL,      -- "QRTBLXXXXXXXX" dùng trong QR
method VARCHAR(20),                       -- CASH | VIETQR; nullable khi PENDING
raw_total INTEGER NOT NULL,
rounded_total INTEGER NOT NULL,
rounding_delta INTEGER NOT NULL,
paid_amount INTEGER,                      -- số tiền thực nhận qua VietQR/cash
amount_received INTEGER,                  -- tiền mặt: tiền khách đưa
change_amount INTEGER,                    -- tiền mặt: tiền thừa
sepay_transaction_id INTEGER,             -- webhook payload.id
sepay_reference_code VARCHAR(120),        -- webhook payload.referenceCode
sepay_gateway VARCHAR(80),
sepay_account_number VARCHAR(64),
sepay_transfer_content TEXT,
sepay_transaction_date TIMESTAMPTZ,
status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
paid_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now()

-- refunds
id UUID PRIMARY KEY,
tenant_id VARCHAR(64) NOT NULL,
payment_id UUID NOT NULL REFERENCES payments(id),
amount INTEGER NOT NULL,
reason TEXT NOT NULL,
requested_by_user_id UUID NOT NULL,      -- userId tạo yêu cầu refund
requested_at TIMESTAMPTZ DEFAULT now(),
confirmed_by_user_id UUID,               -- userId xác nhận đã chuyển tiền
customer_bank_account VARCHAR(100),      -- SĐT/TK nhận tiền hoàn
customer_bank_name VARCHAR(80),
customer_account_name VARCHAR(120),
status VARCHAR(30) NOT NULL DEFAULT 'PENDING_STAFF_ACTION',
confirmed_at TIMESTAMPTZ,
created_at TIMESTAMPTZ DEFAULT now()

-- audit_payments
id UUID PRIMARY KEY,
payment_id UUID NOT NULL,
action VARCHAR(50) NOT NULL,             -- PAYMENT_INITIATED | PAID | REFUND_REQUESTED | REFUND_CONFIRMED
actor_id UUID NOT NULL,
meta JSONB,
timestamp TIMESTAMPTZ DEFAULT now()
```

**Verify:** Unit/integration tại mức service: rounding, immutability sau Paid, webhook path xác thực `X-Secret-Key`, matching logic `code`/`content`, Kafka message schema ổn định.

---

### Step 3.5 — Tích hợp FE ↔ BE + Xác minh E2E

**Mục tiêu:** Thay mock bằng luồng thật qua BFF/guard chain và TCP tới Payment Service — tiền mặt và VietQR đều kết thúc ở cùng contract Kafka và UI phản ánh đúng.

**Phạm vi:** Hooks/API clients, xử lý lỗi và trạng thái loading; kịch bản E2E tiền mặt + VietQR (sandbox SePay hoặc test webhook thủ công); kiểm tra rounding và refund trên UI sau khi backend emit đúng topic.

**POS bill source:** `/pos/bills` phải lấy danh sách bill từ BFF/Order Service (`GET /admin/bills?status=PENDING_PAYMENT`) và chia sẻ bill được chọn bằng URL query (`?billId=...`). Không giữ danh sách bill/payment state trong mock store ở luồng POS settlement; sau mutation chỉ invalidate/refetch server-state query.

**Kịch bản xác minh cụ thể:**

- **Yêu cầu thanh toán:** Customer nhấn nút → confirmation dialog → bàn chuyển Billing → Staff thấy yêu cầu trên POS.
- **VietQR:** Staff chọn tab VietQR → POS hiển thị QR với số tiền đúng + mã bill → Khách quét → chuyển khoản (sandbox hoặc real) → SePay POST webhook → BFF verify `X-Secret-Key` → match `code`/`content` → Payment Service cập nhật PAID → WS push → POS/Customer thấy "Đã thanh toán" → bill lock → bàn chuyển Cleaning.
- **Cash:** Staff chọn tab Tiền mặt → nhập tiền nhận → confirm → bill lock → bàn chuyển Cleaning.
- **Refund:** Owner vào Dashboard → chọn payment đã `PAID` từ `GET /payment/history` → nhấn Refund → điền lý do/thông tin ngân hàng nếu có → Tạo record `PENDING_STAFF_ACTION` → Staff/Owner chuyển khoản tay → bấm "Xác nhận đã hoàn tiền" → audit log ghi nhận → `payment.refunded` emit.

**Polling / Real-time strategy cho tab VietQR:**

Khi POS đang hiển thị QR và chờ khách thanh toán, UI cần phản ánh kết quả ngay khi webhook arrive:

```typescript
// BFF nhận webhook → emit WS tới room tenant:{tid}:staff + session:{sid}:customer
// POS đang mở /pos/bills?billId=... → subscribe WS event "payment.received"
// Customer PWA → subscribe WS event "payment.completed"

// Fallback polling (nếu WS disconnected):
// GET /payment/{paymentId}/status mỗi 3s, tối đa 10 phút
```

**Verify:** Một phiên bàn đi từ yêu cầu thanh toán → POS xác nhận (cash) hoặc VietQR webhook → bill PAID không chỉnh sửa được → refund hiển thị và event `payment.refunded` phù hợp.

---

## Acceptance Criteria

- **Cash + VietQR E2E:** Hai luồng đều đưa bill tới PAID và các màn Customer/POS/Dashboard phản ánh đúng.
- **VND rounding:** Ví dụ 127.500 → 128.000; `rounding_delta` và tổng làm tròn khớp công thức đã chọn.
- **Bill immutable after PAID:** Không chỉnh sửa bill đã đóng; điều chỉnh chỉ qua refund có audit.
- **Webhook security:** Endpoint BFF xác thực `X-Secret-Key` header so sánh với `SEPAY_WEBHOOK_SECRET`; reject nếu không khớp (401).
- **Payment matching:** Webhook chỉ xử lý khi `transferType == "in"` AND `transferAmount >= rounded_total` AND `billReference` tìm được trong `code` hoặc `content`.
- **Refund (manual):** Owner/Manager tạo refund request có `customer_bank_account`, Staff confirm sau khi chuyển tay → `refunds` + `audit_payments` ghi đầy đủ + `payment.refunded` emit.
- **Kafka:** `payment.completed` và `payment.refunded` xuất hiện với payload đủ cho consumer P1–P3 đã thống nhất.
- **QR display:** QR image load từ `qr.sepay.vn` hiển thị đúng trên POS với số tiền và mã bill; không có bước redirect sang trang ngoài.

---

## Outputs cho Phase tiếp theo

- Contract type thanh toán (`Payment`, `PaymentMethod` enum với `CASH`/`VIETQR`, `Refund`, `Bill` final) tái sử dụng được trên toàn monorepo.
- Payment Service với schema `payments` / `refunds` / `audit_payments` và sự kiện Kafka ổn định — Order Service chỉ phản ứng theo `billId` và topic, không duplicate logic làm tròn.
- BFF webhook SePay (`POST /payment/sepay/webhook`) với xác thực `X-Secret-Key` header — làm template cho cổng thanh toán VN mở rộng (MoMo, ZaloPay, VNPAY) nếu cần.
- UI POS/Dashboard/Customer đã chứng minh được UX rounding, tiền thừa, VietQR inline và refund manual — sẵn sàng gắn báo cáo đối soát, thông báo, hoặc in hóa đơn ở phase sau mà không đổi contract cốt lõi.
- Pattern **manual refund with audit trail** phù hợp demo luận văn; nếu cần tự động hóa sau, có thể thay `confirmRefund` bằng gọi API payout khi nâng cấp lên SePay Enterprise hoặc chuyển sang cổng có payout API.
