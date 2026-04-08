# Phase 3 — Payment

> **Mục tiêu:** Khép kín luồng thanh toán tiền mặt và Stripe (VND) trên POS/Dashboard và Customer PWA — làm tròn đúng quy tắc VND, bill bất biến sau Paid, hoàn tiền có vết audit — để doanh thu và trạng thái bàn/session phản ánh thực tế thu ngân.
> **Ước lượng:** ~1-2 tuần
> **Trạng thái:** ⬜ TODO

## Prerequisites

- Phase 2B hoàn thành — [phase-2b-kitchen-websocket.md](phase-2b-kitchen-websocket.md) (đơn/bếp ổn định, WebSocket và Kafka nền tảng sẵn sàng cho sự kiện downstream)
- Order Service cung cấp `billId` và tổng hợp bill là nguồn sự thật cho tổng tiền trước thanh toán — Payment Service không sở hữu nghiệp vụ bill

## Tham Chiếu

| Tài liệu                  | Section liên quan                                         |
| ------------------------- | --------------------------------------------------------- |
| technical-architecture.md | §6.2.7 Payment Service, §10 Tích hợp thanh toán           |
| business-logic.md         | §6 Luồng thanh toán & đối soát (Payment & Reconciliation) |

## Tổng Quan

Phase 3 tách trách nhiệm thanh toán khỏi Order Service để tuân thủ bounded context: Payment Service chỉ ghi nhận và điều phối tiền (Stripe, tiền mặt), làm tròn VND, refund và audit — còn bill/order lifecycle vẫn do Order Service dẫn dắt qua `billId` được truyền vào. Stripe Checkout Session với `currency: "vnd"` đảm bảo khách thanh toán đúng mệnh giá thị trường; webhook vào BFF với **raw body + verify chữ ký** vì Stripe yêu cầu payload gốc để xác thực — tránh đặt verify sai lớp làm hỏng trust chain. Tiền mặt không đi Stripe: staff xác nhận trên POS là điểm cam kết nghiệp vụ, sau đó `payment.completed` qua Kafka để Order/BFF/session/table cùng kết thúc phiên một cách nhất quán và có thể replay. Làm tròn `Math.ceil(amount / 1000) * 1000` cùng lưu `raw_total`, `rounded_total`, `rounding_delta` phục vụ đối soát và minh bạch với khách (ví dụ 127.500 → 128.000). Hai topic `payment.completed` và `payment.refunded` là contract ổn định cho các consumer ưu tiên P1–P3 (đóng bill, realtime, báo cáo).

## Steps

### Step 3.1 — Học Stripe (2-3 ngày, song song với Step 3.2)

**Mục tiêu:** Hiểu mô hình Checkout Session, webhook signing, refund và giới hạn test/live — để các quyết định ở §6.2.7 / §10 không bị sai lệch khi triển khai.

**Phạm vi:** Bài 111–113 (khóa học nội bộ); tập trung vào luồng hosted checkout, metadata gắn `billId` / tenant / bàn, và cách Stripe báo sự kiện về hạ tầng của mình.

**Verify:** Có thể giải thích được end-to-end từ tạo session → redirect → webhook → cập nhật trạng thái thanh toán mà không nhầm lẫn raw body với JSON đã parse.

### Step 3.2 — Mock UI (Customer + POS + Dashboard)

**Mục tiêu:** Cố định UX và dữ liệu hiển thị trước khi gắn service thật — giảm rework khi rounding và hai tab thanh toán đã được staff/khách “nhìn thấy” cùng một cách.

**Phạm vi:**

- **Customer PWA:** Nút **“Yêu cầu thanh toán”** (trạng thái bàn/đơn phù hợp nghiệp vụ §6 — ví dụ chặn khi còn món chưa xong).
- **POS:** Route `/pos/payment` — tóm tắt bill, hiển thị làm tròn VND; tab **Tiền mặt** với máy tính tiền thừa; tab **Stripe** (CTA mở link / QR tùy mock).
- **Dashboard:** `/dashboard/orders` (hoặc màn bill history đã thống nhất) — lịch sử hóa đơn/thanh toán và luồng **hoàn tiền** (mock).

**Verify:** Các màn render đúng với mock; rounding minh họa đúng công thức đã chọn (ví dụ 127.500 → 128.000).

### Step 3.3 & 3.4 — Shared Types + Payment Service (PostgreSQL)

**Mục tiêu:** Một contract type dùng chung FE/BFF/service và một persistence layer thanh toán tách biệt — để audit, refund và Kafka payload không phụ thuộc vào implementation UI.

**Shared types (thư viện dùng chung):** `IPayment`, enum `IPaymentMethod`, `IRefund`, `IBillFinal` (và các field cần thiết để rounding / trạng thái / tham chiếu Stripe) — phản ánh semantics nghiệp vụ, không dư thừa field Order.

**Payment Service (PostgreSQL):**

- **Entities:** `payments` (gồm `rounded_amount`, `rounding_delta`, tham chiếu method/status/Stripe), `refunds`, `audit_payments`.
- **Stripe:** Checkout Session với **`currency: "vnd"`**; webhook xử lý sau khi BFF nhận **POST `/payment/stripe/webhook`** với raw body và verify signature — Payment Service là nơi interpret event và cập nhật trạng thái.
- **Tiền mặt:** Staff xác nhận thu đủ → service ghi nhận và emit **`payment.completed`** qua Kafka.
- **Làm tròn:** `rounded_total = Math.ceil(raw_total / 1000) * 1000`, `rounding_delta = rounded_total - raw_total`, lưu đủ raw/rounded/delta trên bản ghi thanh toán (align §6.2.7).
- **Refund:** Stripe qua API + theo dõi trạng thái; tiền mặt qua bản ghi refund do staff/manager xác nhận; audit bắt buộc.
- **Kafka:** Publish **`payment.completed`** (consumer P1+P2+P3 đã contract); **`payment.refunded`** (P1+P3). Bill **bất biến sau trạng thái Paid** — mọi điều chỉnh đi qua refund, không sửa bill đã khóa.

**Verify:** Unit/integration tại mức service: rounding, immutability sau Paid, webhook path an toàn (signature), Kafka message schema ổn định.

### Step 3.5 — Tích hợp FE ↔ BE + xác minh E2E

**Mục tiêu:** Thay mock bằng luồng thật qua BFF/guard chain và TCP tới Payment Service — để tiền mặt và Stripe đều kết thúc ở cùng contract Kafka và UI phản ánh đúng.

**Phạm vi:** Hooks/API clients, xử lý lỗi và trạng thái loading; kịch bản E2E tiền mặt + Stripe (test mode); kiểm tra rounding và refund trên UI sau khi backend đã emit đúng topic.

**Verify:** Một phiên bàn có thể đi từ yêu cầu thanh toán → POS xác nhận hoặc Stripe → bill Paid không chỉnh sửa được → refund hiển thị và event `payment.refunded` phù hợp.

## Acceptance Criteria

- [ ] **Cash + Stripe E2E:** Hai luồng đều đưa bill tới Paid và các màn Customer/POS/Dashboard phản ánh đúng.
- [ ] **VND rounding:** Ví dụ 127.500 → 128.000; `rounding_delta` và tổng làm tròn khớp công thức đã chọn.
- [ ] **Bill immutable after Paid:** Không chỉnh sửa bill đã đóng; điều chỉnh chỉ qua refund có audit.
- [ ] **Refund:** Hoàn Stripe và hoàn tiền mặt (ghi nhận) đều tạo dấu vết `refunds` / `audit_payments` và emit `payment.refunded` đúng contract.
- [ ] **Webhook:** Endpoint BFF giữ raw body + verify chữ ký Stripe trước khi ủy quyền cập nhật cho Payment Service.
- [ ] **Kafka:** `payment.completed` và `payment.refunded` xuất hiện với payload đủ cho consumer P1–P3 đã thống nhất.

## Outputs cho Phase tiếp theo

- Contract type thanh toán (`IPayment`, method enum, refund, bill final) tái sử dụng được trên toàn monorepo.
- Payment Service với schema `payments` / `refunds` / `audit_payments` và sự kiện Kafka ổn định — Order Service chỉ cần phản ứng theo `billId` và topic, không duplicate logic làm tròn.
- BFF webhook Stripe (`POST /payment/stripe/webhook`) và luồng TCP tới Payment Service là mẫu cho gateway thanh toán mở rộng sau này.
- UI POS/Dashboard/Customer đã chứng minh được UX rounding, tiền thừa, Stripe và refund — sẵn sàng gắn báo cáo đối soát, thông báo (Notification Service), hoặc in hóa đơn ở phase sau mà không đổi contract cốt lõi.
