# Phase 4A — Saga + Hardening (Order / Payment)

> **Mục tiêu:** Chuẩn hóa giao dịch đa bước cho xác nhận đơn và hoàn tất thanh toán — có bù trừ (compensation) rõ ràng, giới hạn và idempotency chống double-submit, ràng buộc xóa dữ liệu và audit hủy đơn; đưa transactional outbox đơn giản vào Order/Payment để Kafka không mất sự kiện khi commit DB thành công.
> **Ước lượng:** ~1 tuần
> **Trạng thái:**

## Prerequisites

- Phase 3 hoàn thành — [phase-3-payment.md](phase-3-payment.md) (luồng thanh toán, billing/session đã ổn định làm nền cho saga thanh toán và validation)
- Phase 2A/2B: Order, Kafka, KDS/realtime đã có — saga xác nhận đơn bám vào khóa tồn, tạo đơ, thông báo bếp

## Tham Chiếu

| Tài liệu                  | Section liên quan                                                                  |
| ------------------------- | ---------------------------------------------------------------------------------- |
| technical-architecture.md | §12 Distributed Transactions (xử lý giao dịch phân tán / saga & đảm bảo nhất quán) |
| business-logic.md         | §4.B Ordering rules (điều kiện đặt/xác nhận đơn, trạng thái line-item)             |
| business-logic.md         | §6.B Payment rules (điều kiện thanh toán, đóng phiên, hóa đơn)                     |

## Tổng Quan

Phase 4A nâng độ tin cậy của luồng lõi POS: mọi "chuỗi hành động" có nhiều bước (tồn kho → đơn → thông báo; kiểm tra billing → đóng phiên → cập nhật bàn → lưu trữ bill) được mô hình hóa như saga có compensation — để khi một bước thất bại, hệ thống không để lại trạng thái nửa vời mà có đường lui có kiểm soát. Đồng thời phase cố định các policy vận hành (giới hạn đơn theo phiên, idempotency, delete constraints, audit hủy) và một lớp outbox tối giản để đồng bộ "đã ghi DB" với "đã publish Kafka", tránh mất sự kiện. Full CDC (Debezium) được ghi nhận là hướng sau luận án — không nằm trong phạm vi phase này.

## Steps

### Step 4.1 — Học Saga (3–4 ngày)

**Mục tiêu:** Có nền lý thuyết và từ vựng chung (orchestration/choreography, compensation, idempotency) trước khi gắn vào Order/Payment — giảm thiết kế sai ngay từ đầu.

**Yêu cầu chính (WHAT + WHY):**

- Hoàn thành bài **124–129** trong lộ trình khóa học (saga, giao dịch phân tán, failure modes).
- **Why:** Các luồng confirm order và complete payment là đa bước và cross-cutting; không có khung saga thì dễ lệ thuộc "happy path" và khó reasoning khi timeout/retry.

**Verify:** Có thể mô tả bằng lời: điểm commit, điểm có thể retry, điểm bắt buộc compensation, và vì sao idempotency không thể thiếu ở biên HTTP.

### Step 4.2 — Triển khai & hardening (4–5 ngày)

**Mục tiêu:** Saga và policy vận hành được phản ánh trong hành vi hệ thống (không chỉ tài liệu), đồng bộ với quy tắc nghiệp vụ ordering/payment.

#### Order Confirm Saga

**WHAT:** Chuỗi nghiệp vụ: khóa/giữ tồn kho phù hợp → tạo/ghi nhận đơn → thông báo KDS (hoặc kênh bếp tương đương).

**Saga Steps (Order Confirm):**

| Step | Action                                   | Service | Compensation (reverse)       |
| ---- | ---------------------------------------- | ------- | ---------------------------- |
| 1    | Validate & Lock Stock                    | Catalog | Release locked stock         |
| 2    | Update Order → Processing                | Order   | Mark order failed / rollback |
| 3    | Route to KDS via Kafka `order.confirmed` | Kitchen | Notify customer of failure   |

Compensation thực hiện theo thứ tự ngược: Step 3 → Step 2 → Step 1.

**WHY:** Đảm bảo không có đơn "đã tạo" khi tồn không còn đủ, và không để tồn bị giữ vĩnh viễn nếu bước sau thất bại.

**Compensation (ý định):** Hoàn tác phần tồn đã lock; đánh dấu đơn/thao tác thất bại theo rule nghiệp vụ; thông báo khách (hoặc kênh phù hợp) khi luồng không hoàn tất — để staff/khách không kỳ vọng đơn đã vào bếp.

#### Payment Complete Saga

**WHAT:** Chuỗi nghiệp vụ: **validate billing** — toàn bộ line-item phải ở trạng thái cho phép thanh toán theo rule (ví dụ Ready/Served như §6.B) → đóng session → cập nhật trạng thái bàn → archive bill (lưu trữ hóa đơn/phiên theo policy).

**Saga Steps (Payment Complete):**

| Step | Action                                   | Service | Compensation (reverse)                   |
| ---- | ---------------------------------------- | ------- | ---------------------------------------- |
| 1    | Validate billing: all items Ready/Served | Order   | —                                        |
| 2    | Close Session                            | Order   | Reopen session                           |
| 3    | Update Table → Cleaning                  | Catalog | Revert table status                      |
| 4    | Archive Bill                             | Order   | Unarchive bill, revert to previous state |

Compensation thực hiện theo thứ tự ngược: Step 4 → Step 3 → Step 2 → Step 1.

**WHY:** Thanh toán chỉ được phép khi nghiệp vụ "đã phục vụ đủ điều kiện"; tránh đóng tiền trên đơn chưa sẵn sàng và tránh bàn/phiên lệch với thực tế thanh toán.

**Compensation (ý định):** Mở lại session nếu đã đóng nhưng bước sau lỗi; revert cập nhật bàn về trạng thái nhất quán trước bước lỗi — để không khóa bàn vĩnh viễn hoặc ghi nhận sai occupancy.

#### Hardening chung

| Chủ đề                   | WHAT                                                                                                                        | WHY                                                             |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `max_orders_per_session` | Giới hạn số đơn tối đa mỗi phiên (mặc định 20), **cấu hình theo tenant plan** — chống spam/đơn ảo                           | Chống abuse/spam đặt hàng và giữ vận hành POS ổn định           |
| Idempotency              | Redis SET NX cho order creation — cùng idempotency key chỉ thắng lần đầu, prevent double-submit                             | Double-submit (double tap, retry client) không tạo trùng đơn    |
| Delete constraints       | Không xóa **Category** còn **MenuItem**; không xóa **MenuItem** còn **OrderItem** đang active (status IN PROCESSING, READY) | Bảo toàn tham chiếu và lịch sử đơn; tránh orphan và sai báo cáo |
| Audit cancel             | **BẮT BUỘC** ghi log khi Cancel order — **actor** (who), **reason** (why), **timestamp** (when)                             | Phục vụ điều tra, đối soát và trách nhiệm vận hành              |

#### Simplified Transactional Outbox

**WHAT:** Bảng `outbox_events` (hoặc tên tương đương) trong **Order** và **Payment**; ghi event **cùng transaction** với thay đổi nghiệp vụ; job/cron nền poll → publish Kafka → đánh dấu đã gửi.

**Data flow:** Khi state change xảy ra → ghi event vào bảng outbox **cùng DB transaction** với update nghiệp vụ → background cron poll outbox định kỳ → publish event lên Kafka → mark outbox record là "sent". Đảm bảo event không mất khi service crash giữa chừng (giữa commit DB và publish Kafka).

**WHY:** Nếu chỉ publish Kafka sau khi commit, crash giữa chừng có thể làm mất sự kiện; outbox gắn "đã xảy ra" với "đã persist" trước khi broker nhận.

**Phạm vi ngoài phase:** **Full CDC với Debezium** — ghi chú là **post-thesis** (độ phức tạp vận hành/infra cao hơn; phase này chấp nhận outbox poll đơn giản).

**Verify (gợi ý tổng thể):** Scenario failure được diễn tả trong Acceptance Criteria; outbox không để lệch "DB đã commit nhưng không có bản ghi outbox" cho các sự kiện đã cam kết.

## Acceptance Criteria

- **Saga compensation (order):** Khi khóa/giữ tồn thất bại → **không** tạo đơn hợp lệ; tồn và trạng thái hệ thống không ở trạng thái "có đơn nhưng không có đủ hàng".
- **Billing validation (payment):** Thanh toán **bị chặn** khi còn line-item chưa đạt điều kiện Ready/Served (theo rule §6.B / cấu hình nghiệp vụ đã thống nhất).
- **Idempotency:** Gửi trùng cùng idempotency key (double-submit) → **một** đơn/hành động tương ứng, không nhân đôi side-effect.
- **Delete constraints:** Không xóa được Category còn MenuItem; không xóa được MenuItem còn OrderItem active — API/DB phản hồi lỗi rõ ràng.
- **Audit cancel:** Mọi thao tác hủy đơn có bản ghi audit với **actor, reason, timestamp** đủ để tra cứu sau.

## Outputs

- Luồng **Order Confirm Saga** và **Payment Complete Saga** được mô tả bằng hành vi có compensation, khớp technical-architecture §12 và business-logic §4.B / §6.B.
- Policy `**max_orders_per_session`\*\* (mặc định 20, configurable theo tenant) áp dụng nhất quán trên luồng đặt/xác nhận.
- Idempotency và delete constraints là **bất biến** trong integration/API tests hoặc checklist QA tương đương.
- Outbox đơn giản trên Order + Payment: event ghi cùng transaction, worker/cron đẩy Kafka và đánh dấu sent.
- Roadmap ghi rõ: **Debezium / full CDC** — sau luận án.
