# Phase 4A — Saga + Hardening (Order / Payment)

> **Bản tiếng Việt** — bản tiếng Anh canonical: [phase-4a-saga-hardening.md](phase-4a-saga-hardening.md)

> **Mục tiêu:** Chuẩn hóa một lát cắt Saga đại diện cho đề tài: xác nhận đơn hàng trong POS core và ghi nhận mini-saga khởi tạo tenant đã có trong SaaS. Các hardening vận hành sâu hơn như Saga state bền vững, retry worker, CDC/Debezium, payment saga đầy đủ và ledger tồn kho nằm ngoài phạm vi chính.
> **Ước lượng:** ~1 tuần
> **Trạng thái:** ✅ Lát cắt đại diện đã triển khai — Order có `OrderConfirmSagaService` điều phối xác nhận đơn và compensation trả kho; SaaS onboarding mini-saga giữ nguyên từ Phase 4B. Full Phase 4A hardening vẫn là hướng mở rộng.

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

Phase 4A trong phạm vi khóa luận tập trung vào hai luồng đại diện thay vì cố gắng bao phủ toàn bộ hardening vận hành. Luồng POS core là **Order Confirm Saga**: Order điều phối, Catalog sở hữu trừ/trả tồn kho, Order ghi trạng thái `PROCESSING` và outbox `order.confirmed`, Kitchen nhận event sau commit. Nếu Catalog đã trừ kho nhưng Order không commit được, Order gọi Catalog trả kho bằng command compensation. Luồng platform là **SaaS Onboarding Mini-Saga** đã có từ Phase 4B: SaaS điều phối tenant, Owner, profile, subscription, payment settings và rollback khi lỗi.

Payment hiện được mô tả là settlement baseline với outbox + retry/idempotency, **không** claim là Payment Complete Saga đầy đủ. Các chính sách như `max_orders_per_session`, Redis SET NX cho order creation, bảng trạng thái Saga, audit table riêng và CDC/Debezium được ghi là hardening mở rộng nếu chưa có trong code hiện tại.

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

**WHAT:** Chuỗi nghiệp vụ: kiểm tra order/bill → Catalog trừ tồn kho → Order xác nhận đơn và ghi outbox → Kitchen nhận `order.confirmed` sau commit.

**Các bước Saga (Order Confirm):**

| Bước | Hành động                                                       | Service        | Compensation (lùi)                                               |
| ---- | --------------------------------------------------------------- | -------------- | ---------------------------------------------------------------- |
| 1    | Lock order `PENDING`, kiểm tra bill `OPEN`, lấy order items     | Order          | Không cần — chưa có side effect ngoài Order transaction          |
| 2    | Deduct stock bằng `confirm-order:{orderId}`                     | Catalog        | Release stock bằng `confirm-order-compensation:{orderId}`        |
| 3    | Update order/items → `PROCESSING`, ghi outbox `order.confirmed` | Order          | Nếu lỗi sau bước 2, gọi Catalog release stock                    |
| 4    | Publish Kafka `order.confirmed` để Kitchen tạo KDS ticket       | Outbox/Kitchen | Không nằm trong compensation tồn kho; consumer xử lý lặp an toàn |

Điểm commit nghiệp vụ là Order DB commit thành công với order/items `PROCESSING` và outbox `order.confirmed`.

**WHY:** Không có đơn “hợp lệ” khi hết tồn kho; không giữ tồn kho vĩnh viễn nếu bước sau thất bại.

**Compensation đã triển khai:** `OrderConfirmSagaService` gọi Catalog `releaseForOrder` nếu lỗi xảy ra sau khi Catalog deduct thành công nhưng trước khi Order commit hoàn tất.

#### Payment Settlement Baseline (không claim Payment Complete Saga đầy đủ)

**WHAT:** Payment ghi settlement, audit và outbox `payment.completed`; Order sở hữu bill/session finalization qua TCP fast path và Kafka retry path.

**WHY:** Payment không sở hữu bill/session/table; việc hoàn tất bill được đưa về Order để giữ đúng service boundary.

**Giới hạn hiện tại:** Đây là outbox + retry/idempotency baseline, chưa phải Saga đầy đủ có compensation mở lại session/revert table cho mọi failure mode.

#### Hardening chung

| Chủ đề                   | WHAT                                                                                                                | WHY                                                    |
| ------------------------ | ------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ |
| `max_orders_per_session` | Hardening mở rộng; code hiện có đang áp dụng quota theo ngày của tenant plan (`max_orders_per_day`)                 | Tránh claim sai với runtime hiện tại                   |
| Idempotency              | Order submit dùng idempotency key + unique/replay ở PostgreSQL; Redis SET NX là hướng hardening nếu cần             | Double tap/retry client không tạo đơn trùng            |
| Delete constraints       | Không xóa **Category** và **MenuItem**; không xóa **MenuItem** khi **OrderItem** đang active (IN PROCESSING, READY) | Giữ tham chiếu và lịch sử; tránh orphan và báo cáo sai |
| Audit cancel             | Log **BẮT BUỘC** khi Cancel order — **actor** (ai), **reason** (vì sao), **timestamp** (khi nào)                    | Điều tra, kiểm soát và trách nhiệm vận hành            |

#### SaaS Onboarding Mini-Saga (có từ Phase 4B)

**WHAT:** Chuỗi onboarding tenant hiện có gồm tạo tenant/subscription mặc định, tạo Owner qua Authorizer/User-Access, khởi tạo `tenant_payment_settings`, outbox `tenant.created`, rollback/cleanup khi giữa chừng lỗi.

**WHY:** Đây là luồng đa service sau spec Phase 4B. Trong phạm vi hiện tại, luồng này đủ làm bằng chứng platform saga: có orchestrator, nhiều participant, outbox `tenant.created` và compensation disable owner/xóa subscription/cache/xóa tenant khi lỗi.

**Giới hạn hiện tại:** Chưa thêm idempotency key toàn luồng onboarding, Saga execution state hoặc observability riêng cho compensation.

**Ranh giới:** Không biến onboarding thành self-service registration wizard; quyết định đó vẫn hoãn/sau luận văn theo Phase 4B.

#### Transactional Outbox đơn giản

**WHAT:** Bảng `outbox_events` (hoặc tương đương) trong **Order** và **Payment**; ghi event **cùng transaction** với thay đổi nghiệp vụ; background job/cron poll → publish Kafka → đánh dấu sent.

**Luồng dữ liệu:** Khi đổi trạng thái → ghi event vào outbox **trong cùng DB transaction** với business update → cron poll outbox định kỳ → publish Kafka → đánh dấu bản ghi sent. Đảm bảo không mất event khi service crash giữa commit DB và publish Kafka.

**WHY:** Chỉ publish Kafka sau commit thì crash giữa chừng có thể mất event; outbox gắn “đã xảy ra” với “đã persist” trước khi broker nhận.

**Ngoài phạm vi phase:** **Full CDC với Debezium** — ghi nhận **sau luận văn** (độ phức tạp vận hành/infra cao hơn; phase này chấp nhận outbox poll đơn giản).

**verify (gợi ý tổng thể):** Kịch bản lỗi mô tả trong Acceptance Criteria; outbox không để lỗi “DB committed nhưng không có outbox record” cho event đã commit.

## Tiêu chí nghiệm thu

- **Order Confirm Saga:** `OrderConfirmSagaService` điều phối confirm; nếu Catalog deduct stock thành công nhưng Order commit/outbox thất bại, Order gọi Catalog release stock.
- **Replay:** Order đã `PROCESSING` trả response hiện tại, không deduct stock lần nữa và không tạo outbox mới.
- **Catalog error:** Nếu Catalog báo thiếu kho/lỗi nghiệp vụ trước khi deduct thành công, Order không chuyển sang `PROCESSING` và không gọi compensation.
- **Payment:** Chỉ claim settlement + outbox + retry/idempotency baseline, không claim Payment Complete Saga đầy đủ.
- **Onboarding mini-saga:** Giữ nguyên mini-saga Phase 4B và ghi rõ giới hạn hardening còn lại.

## Kiểm chứng và bằng chứng cho khóa luận

Bằng chứng Phase 4A trong khóa luận được giới hạn có chủ đích ở lát cắt Saga đại diện, không claim full hardening vận hành.

- **Order Confirm Saga:** dùng `order-confirm-saga.service.spec.ts` và `catalog-stock-gateway.service.spec.ts` để chứng minh điều phối, replay, lỗi Catalog, outbox và compensation ở mức deterministic; dùng integration Order/Catalog opt-in để chứng minh ranh giới stock thật.
- **SaaS Onboarding Mini-Saga:** dùng unit/mocked integration của onboarding, `onboarding-saga-db.integration.spec.ts` cho success/rollback trên PostgreSQL thật, và `onboarding-saga-live-payment.integration.spec.ts` cho ranh giới TCP thật với Payment.
- **Artifact khóa luận:** screenshot UI, output terminal, snapshot DB/outbox và log có thể minh họa flow, nhưng lập luận nghiệm thu vẫn phải dựa trên các lớp test ở trên.
- **Giới hạn:** không claim Saga state bền vững, retry worker, CDC/Debezium, stock ledger hoặc onboarding live đầy đủ qua Keycloak/User-Access nếu chưa có artifact bổ sung.

Xem `docs/testing/phase-5/saga-validation-strategy.md` để biết kế hoạch kiểm chứng chi tiết.

## Đầu ra

- `OrderConfirmSagaService` và test bù kho cho luồng Order Confirm.
- Tài liệu mô tả hai Saga đại diện: Order Confirm và SaaS Onboarding.
- Payment, idempotency, delete constraints, session limit và CDC/Debezium được ghi đúng mức hiện có/hướng mở rộng, không overclaim.
- Roadmap ghi rõ: Saga state bền vững, retry worker, ledger tồn kho và full CDC là hardening sau phạm vi chính.
