# Phase 4A — Saga + Hardening (Order / Payment)

> **Bản tiếng Việt** — bản tiếng Anh canonical: [phase-4a-saga-hardening.md](phase-4a-saga-hardening.md)

> **Mục tiêu:** Chuẩn hóa giao dịch nhiều bước cho xác nhận đơn hàng và hoàn tất thanh toán — có compensation rõ ràng, giới hạn và idempotency chống double-submit, ràng buộc xóa dữ liệu, audit hủy đơn; đặt transactional outbox đơn giản ở Order/Payment để Kafka không mất event khi DB đã commit thành công.
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ⏸ Hoãn — chưa triển khai/đóng phase riêng sau Phase 3; một phần hardening cục bộ đã có trong Phase 3/4B nhưng **không** được tính là hoàn thành Phase 4A.

## Điều kiện tiên quyết

- Phase 3 hoàn thành — [phase-3-payment.md](phase-3-payment.md) (luồng thanh toán, billing/session ổn định làm nền cho payment và validation saga)
- Phase 2A/2B: Order, Kafka, KDS/realtime sẵn sàng — saga xác nhận đơn dựa trên khóa tồn kho, tạo đơn, thông báo bếp
- Phase 4B đã có mini-saga onboarding trong SaaS service — nếu mở lại Phase 4A, hardening phải coi đây là luồng đã tồn tại để chuẩn hóa retry/observe, **không** thiết kế lại từ đầu.

## Tài liệu tham chiếu

| Tài liệu                  | Phần liên quan                                                                     |
| ------------------------- | ---------------------------------------------------------------------------------- |
| technical-architecture.md | §12 Distributed Transactions (xử lý giao dịch phân tán / saga & đảm bảo nhất quán) |
| business-logic.md         | §4.B Quy tắc đặt hàng (điều kiện đơn/xác nhận, trạng thái line-item)               |
| business-logic.md         | §6.B Quy tắc thanh toán (điều kiện thanh toán, đóng session, hóa đơn)              |

## Tổng quan

Phase 4A tăng độ tin cậy của luồng POS lõi: mọi chuỗi hành động nhiều bước (tồn kho → đơn → thông báo; kiểm tra billing → đóng session → cập nhật bàn → lưu hóa đơn) được mô hình hóa thành saga có compensation — khi một bước lỗi, hệ thống không kẹt ở trạng thái nửa vời mà có lùi có kiểm soát. Sau Phase 4B, phase này cũng phải nhận diện onboarding tenant/Owner/payment settings là mini-saga trong SaaS: phạm vi 4A là harden retry/observability/compensation nếu cần, **không** đổi ownership nghiệp vụ đã đóng. Đồng thời phase cố định chính sách vận hành (giới hạn session, idempotency, ràng buộc xóa, audit hủy đơn) và lớp outbox tối giản để đồng bộ “DB đã ghi” với “Kafka đã publish”, tránh mất event. Full CDC (Debezium) là hướng sau luận văn — **không** nằm trong phạm vi phase này.

## Các bước

### Bước 4.1 — Học Saga (3–4 ngày)

**Mục tiêu:** Có nền tảng lý thuyết và từ vựng (orchestration/choreography, compensation, idempotency) trước khi gắn vào Order/Payment — giảm sai sót thiết kế ngay từ đầu.

**Yêu cầu chính (WHAT + WHY):**

- Hoàn thành bài **124–129** trong lộ trình khóa học (saga, giao dịch phân tán, failure modes).
- **Vì sao:** Luồng confirm order và complete payment là đa bước, xuyên service; không có khung saga thì dễ phụ thuộc “happy path” và khó lý giả timeout/retry.

**verify:** Mô tả được bằng lời: điểm commit, điểm retry, điểm compensation bắt buộc, và vì sao idempotency không thể thiếu ở HTTP edge.

### Bước 4.2 — Triển khai & hardening (4–5 ngày)

**Mục tiêu:** Saga và chính sách vận hành phản ánh vào hành vi hệ thống (không chỉ tài liệu), khớp quy tắc nghiệp vụ đặt hàng/thanh toán.

#### Order Confirm Saga

**WHAT:** Chuỗi nghiệp vụ: khóa/giữ tồn kho phù hợp → tạo/ghi đơn → thông báo KDS (hoặc kênh bếp tương đương).

**Các bước Saga (Order Confirm):**

| Bước | Hành động                                | Service | Compensation (lùi)           |
| ---- | ---------------------------------------- | ------- | ---------------------------- |
| 1    | Validate & Lock Stock                    | Catalog | Release locked stock         |
| 2    | Update Order → Processing                | Order   | Mark order failed / rollback |
| 3    | Route to KDS qua Kafka `order.confirmed` | Kitchen | Notify customer of failure   |

Compensation thực hiện ngược thứ tự: Bước 3 → Bước 2 → Bước 1.

**WHY:** Không có đơn “hợp lệ” khi hết tồn kho; không giữ tồn kho vĩnh viễn nếu bước sau thất bại.

**Compensation (ý định):** Hoàn phần đã khóa; đánh dấu đơn/thao tác failed theo quy tắc nghiệp vụ; thông báo khách (hoặc kênh phù hợp) khi luồng không hoàn tất — staff/khách không kỳ vọng đơn đã vào bếp.

#### Payment Complete Saga

**WHAT:** Chuỗi nghiệp vụ: **validate billing** — toàn bộ line-item phải ở trạng thái cho phép thanh toán theo quy tắc (ví dụ Ready/Served theo §6.B) → đóng session → cập nhật trạng thái bàn → lưu hóa đơn (archive bill/session theo chính sách).

**Các bước Saga (Payment Complete):**

| Bước | Hành động                                | Service | Compensation (lùi)                       |
| ---- | ---------------------------------------- | ------- | ---------------------------------------- |
| 1    | Validate billing: all items Ready/Served | Order   | —                                        |
| 2    | Close Session                            | Order   | Reopen session                           |
| 3    | Update Table → Cleaning                  | Catalog | Revert table status                      |
| 4    | Archive Bill                             | Order   | Unarchive bill, revert to previous state |

Compensation thực hiện ngược thứ tự: Bước 4 → Bước 3 → Bước 2 → Bước 1.

**WHY:** Chỉ cho thanh toán khi phục vụ “đủ điều kiện”; tránh thanh toán khi món chưa sẵn sàng và session lệch thực tế.

**Compensation (ý định):** Mở lại session nếu đã đóng nhưng bước sau lỗi; revert bàn về trạng thái nhất quán trước bước lỗi — không khóa bàn vĩnh viễn hoặc ghi occupancy sai.

#### Hardening chung

| Chủ đề                   | WHAT                                                                                                                | WHY                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `max_orders_per_session` | Giới hạn số đơn tối đa mỗi session (mặc định 20), **cấu hình theo gói tenant** — chống spam/đơn ảo                  | Chống lạm dụng đặt hàng, giữ POS ổn định               |
| Idempotency              | Redis SET NX khi tạo đơn — cùng idempotency key chỉ thắng lần đầu, chống double-submit                              | Double tap/retry client không tạo đơn trùng            |
| Delete constraints       | Không xóa **Category** và **MenuItem**; không xóa **MenuItem** khi **OrderItem** đang active (IN PROCESSING, READY) | Giữ tham chiếu và lịch sử; tránh orphan và báo cáo sai |
| Audit cancel             | Log **BẮT BUỘC** khi Cancel order — **actor** (ai), **reason** (vì sao), **timestamp** (khi nào)                    | Điều tra, kiểm soát và trách nhiệm vận hành            |

#### SaaS Onboarding Mini-Saga (có từ Phase 4B)

**WHAT:** Chuỗi onboarding tenant hiện có gồm tạo tenant/subscription mặc định, tạo Owner qua Authorizer/User-Access, khởi tạo `tenant_payment_settings`, outbox `tenant.created`, rollback/cleanup khi giữa chừng lỗi.

**WHY:** Đây là luồng đa service sau spec Phase 4B. Nếu triển khai Phase 4A sau 4B, phải harden cùng Order/Payment: idempotency key cho onboarding, compensation có audit rõ, retry/cleanup user Keycloak orphan với metrics/log, không mất outbox event sau DB commit.

**Ranh giới:** Không biến onboarding thành self-service registration wizard; quyết định đó vẫn hoãn/sau luận văn theo Phase 4B.

#### Transactional Outbox đơn giản

**WHAT:** Bảng `outbox_events` (hoặc tương đương) trong **Order** và **Payment**; ghi event **cùng transaction** với thay đổi nghiệp vụ; background job/cron poll → publish Kafka → đánh dấu sent.

**Luồng dữ liệu:** Khi đổi trạng thái → ghi event vào outbox **trong cùng DB transaction** với business update → cron poll outbox định kỳ → publish Kafka → đánh dấu bản ghi sent. Đảm bảo không mất event khi service crash giữa commit DB và publish Kafka.

**WHY:** Chỉ publish Kafka sau commit thì crash giữa chừng có thể mất event; outbox gắn “đã xảy ra” với “đã persist” trước khi broker nhận.

**Ngoài phạm vi phase:** **Full CDC với Debezium** — ghi nhận **sau luận văn** (độ phức tạp vận hành/infra cao hơn; phase này chấp nhận outbox poll đơn giản).

**verify (gợi ý tổng thể):** Kịch bản lỗi mô tả trong Acceptance Criteria; outbox không để lỗi “DB committed nhưng không có outbox record” cho event đã commit.

## Tiêu chí nghiệm thu

- **Saga compensation (order):** Khi lock/giữ tồn kho thất bại → **không** tạo đơn hợp lệ; tồn kho và trạng thái hệ thống không ở dạng “có đơn nhưng không đủ hàng”.
- **Billing validation (payment):** Billing **bị chặn** khi còn line-item chưa đạt Ready/Served (theo §6.B / cấu hình nghiệp vụ thống nhất).
- **Idempotency:** Gửi cùng idempotency key (double-submit) → **một** hành động tương ứng, không nhân đôi side-effect.
- **Delete constraints:** Không xóa Category khi còn MenuItem; không xóa MenuItem khi OrderItem active — API/DB trả lỗi rõ.
- **Audit cancel:** Mọi thao tác hủy có bản ghi audit đủ **actor, reason, timestamp** để tra cứu sau.
- **Onboarding mini-saga hardening:** Nếu mở lại Phase 4A sau 4B, onboarding tenant có idempotency/compensation/audit/observability rõ và không đổi quyết định onboarding do admin hỗ trợ.

## Đầu ra

- Luồng **Order Confirm Saga** và **Payment Complete Saga** được mô tả theo hành vi kèm compensation, khớp technical-architecture §12 và business-logic §4.B / §6.B.
- Chính sách **`max_orders_per_session`** (mặc định 20, cấu hình theo tenant) áp dụng nhất quán trên luồng order/confirm.
- Idempotency và delete constraints là **bất biến** trong integration/API test hoặc checklist QA tương đương.
- Outbox đơn giản trên Order + Payment: event ghi cùng transaction, worker/cron đẩy Kafka và đánh dấu sent.
- Roadmap ghi rõ: **Debezium / full CDC** — sau luận văn.
