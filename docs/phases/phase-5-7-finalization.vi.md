# Phase 5–7 — Hoàn thiện: Testing, Quan sát & Triển khai Demo

> **Bản tiếng Việt** — bản tiếng Anh canonical: [phase-5-7-finalization.md](phase-5-7-finalization.md)

> **Mục tiêu:** Khóa chất lượng hệ thống QRTable SaaS POS bằng kiểm thử tự động đa tầng, làm hệ phân tán **có thể quan sát** (health service, log, metrics, trace), và đóng gói **deploy + dữ liệu mẫu + kịch bản demo** để luận văn và hội đồng tái hiện end-to-end — giảm rủi ro hồi quy nghiệp vụ (đơn lẻ, tiền mặt, đa tenant, bếp) và trình diễn luồng QR → bếp → thanh toán.
> **Ước lượng:** ~3–5 tuần (tổng Phase 5 + 6 + 7)
> **Trạng thái:** ⬜ TODO

## Điều kiện tiên quyết

- Các phase lõi đã đóng trên đường critical/demo: **0, 1, 2A, 2B, 3**, phần SaaS hoàn thành ở **4B**, và lát cắt đại diện **4A Order Confirm Saga** đã triển khai. Full hardening vận hành của Phase 4A và Phase 4C Quản lý nhân sự chưa bắt đầu; không chặn Phase 5–7 trừ khi demo bắt buộc hardening kiểu Saga state bền vững/CDC/retry worker hoặc quản lý nhân sự. Notification/email nằm ngoài phạm vi triển khai hiện tại.

## Snapshot trạng thái hiện tại (2026-06-01)

- **Tiến độ Phase 5 Testing:** ~75-80% cho workstream testing, dựa trên traceability coverage, inventory test đã có và bằng chứng integration M2 local mới nhất. Dòng roadmap gộp Phase 5-7 đang tính **25%** vì Observability và Deployment chưa bắt đầu.
- **Traceability matrix:** 52 dòng P0/P1: 38 covered, 9 partial, 1 implementation gap và 4 deferred by phase. Các P0 còn partial là Order state/stock live compensation fault injection, SaaS onboarding saga live Authorizer/User-Access proof, và suspended Customer PWA pending-bill browser exception.
- **Gate deterministic mới:** `pnpm nx test frontend-utils` pass ngày 2026-06-01 với 36 test passed và 36 runtime-dependent integration tests skip có chủ đích.
- **Gate unit/contract đầy đủ mới:** `pnpm exec nx run-many -t test --parallel=3` đã pass toàn bộ 23 projects sau khi cập nhật expectation cũ ở `guards:test` và `management-app:test` theo contract hiện tại.
- **Gate integration M2 mới:** các lệnh seeded Order, Payment, Kitchen, SaaS, frontend-utils live BFF/Keycloak và permission-matrix smoke đã pass ngày 2026-06-01. Frontend-utils integration pass `72/72` tests và permission smoke verify đủ 6 role seeded với exact counts `62/38/35/15/6/6`.
- **Bằng chứng Browser E2E:** Playwright hiện list 15 test trong 5 spec file. Artifact lưu gần nhất là run Step 2.7 fail vì Customer PWA tại `localhost:5173` không chạy; phải rerun với full app stack trước khi dùng E2E làm bằng chứng green.

## Tài liệu tham chiếu

| Tài liệu                                    | Phần liên quan                                                                                                                                       |
| ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| technical-architecture.md                   | §13 Observability — nguyên tắc log/metric/trace trong microservices                                                                                  |
| technical-architecture.md                   | §14 Deployment — deploy, compose, môi trường                                                                                                         |
| business-logic.md                           | Toàn bộ — kiểm thử tự động **xác minh** quy tắc nghiệp vụ đã mô tả (state machine, tiền, token, tenant isolation), không thay thế tài liệu nghiệp vụ |
| testing/phase-5/saga-validation-strategy.md | Chiến lược bằng chứng khóa luận cho Order Confirm Saga và SaaS Onboarding Mini-Saga                                                                  |

## Tổng quan

Ba mảng gộp trong một tài liệu vì cùng “cổng hoàn thiện” trước bàn giao: **Testing** đảm bảo hành vi đúng theo business-logic và kiến trúc đã chọn; **Observability** đảm bảo khi chạy nhiều process và message bus vẫn trả lời được _lỗi ở đâu, ai bị ảnh hưởng, nghiệp vụ có đạt SLA không_; **Docker + Demo** đảm bảo hội đồng và đồng nghiệp lặp lại cùng kịch bản không phụ thuộc máy dev cá nhân. Thứ tự gợi ý: ưu tiên nền tảng test song song với observability tối thiểu (health/log), sau đó hoàn thiện dashboard/alert, cuối cùng đóng gói compose + seed + script bảo vệ.

---

## Phase 5 — Testing (~1–2 tuần)

**Vì sao:** Sau Phase 4B, hệ thống không còn chỉ là demo đặt món QR đơn lẻ mà là SaaS POS đa tenant với Order, Kitchen, Payment, lifecycle SaaS, subscription gating, tenant payment settings và nhiều kênh realtime/cache. State machine đơn/bàn, tiền, QR/session, Redis/Kafka/WebSocket và tenant isolation — **sai một lần là sai tiền, rò dữ liệu hoặc demo hỏng**. Phase 5 phải khóa hành vi đã triển khai bằng test có mục tiêu, không đuổi số coverage đẹp.

### Rà soát sau Phase 4A/4B

Điểm cần chỉnh so với bản Phase 5 cũ:

- **Điều kiện cũ “Phase 0–4 hoàn thành” không còn đúng.** Hiện tại: Phase 0, 1, 2A, 2B, 3 và **4B** xong; **4A có lát cắt Saga đại diện**, **4C Staff Management TODO**. Test Phase 5 phải xác minh hành vi hiện có, bao gồm Order Confirm Saga, và chỉ ghi gap cho full saga-hardening hoặc quản lý nhân sự nếu nằm trong deferred scope.
- **Phase 4A không còn hoãn toàn bộ.** `OrderConfirmSagaService` và `CatalogStockGatewayService` là contract hiện tại của code. Phase 5 phải test replay confirm, lỗi tồn kho từ Catalog và compensation trả kho; Saga state bền vững, retry worker, stock ledger và CDC/Debezium vẫn là hardening tương lai.
- **Phạm vi cũ thiếu Phase 4B.** Cần bổ sung lifecycle tenant `ACTIVE/SUSPENDED/CLOSED`, subscription/pricing plan, feature gating, tenant payment settings, hai tầng tham chiếu thanh toán `QRTBL`/`QRSUB`, onboarding do admin hỗ trợ và hành vi Customer PWA suspended/read-only.
- **Phạm vi cũ gọi E2E là Supertest không khớp repo.** Hiện E2E browser dùng Playwright trong `tests/e2e`; Supertest phù hợp hơn nếu sau này thêm e2e API BFF/Nest. Phase 5 phải tách rõ `API integration/contract` và `browser E2E`.
- **Phạm vi cũ chưa phản ánh kiến trúc snapshot + realtime hint.** WebSocket/Kafka/Redis không phải source of truth cho UI; test phải xác minh client refetch REST snapshot sau hint/reconnect, không assert UI dựng state từ packet.
- **Phạm vi cũ chưa đủ ranh giới Redis/Kafka.** Cần test idempotency/outbox baseline, hàng đợi KDS chỉ Redis, OAuth state cache, cache suspended/subscription, registry Kafka topic 4P+2AP và “không có menu.updated” để tránh hồi quy kiến trúc.
- **Phạm vi cũ chưa có chiến lược CI/gate.** Repo hiện có nhiều Jest và một số Playwright smoke; Phase 5 cần chuẩn hóa lệnh nhanh cho PR, lệnh đầy đủ pre-demo/nightly, seed fixture và chính sách skip rõ cho test cần stack thật.
- **Phạm vi cũ không phân biệt test gap, implementation gap và deferred scope.** Phase 5 không được âm thầm đổi hành vi sản phẩm để “cho test pass”; quy tắc chưa có code phải phân loại `missing`, `implementation-gap`, `security-gap` hoặc `deferred-by-phase`.

### Chiến lược kiểm thử

Nguyên tắc chính:

- **Risk-based, contract-first:** Ưu tiên hành vi rủi ro cao, tenant isolation, chuyển trạng thái, auth/RBAC, nhất quán realtime và đường demo.
- **Test đúng tầng:** Unit khóa invariant/policy; integration khóa ranh giới DB/Redis/TCP/Kafka; E2E browser khóa user journey. Không lặp cùng assertion ở mọi tầng.
- **Current-code first:** Khi tài liệu phase cũ lệch `business-logic.md`, `technical-architecture.md` hoặc test/code hiện tại, test theo hành vi canonical/đã triển khai mới nhất.
- **Snapshot là source of truth:** Event realtime chỉ là hint invalidate/refetch; E2E không phụ thuộc payload packet làm canonical state.
- **Deferred rõ ràng:** Không tính thiếu test full hardening Phase 4A hoặc Phase 4C Quản lý nhân sự chưa triển khai là lỗi Phase 5. Thiếu test cho Order Confirm Saga đã triển khai không phải deferred; đó là việc test bình thường của Phase 5. Test Notification/email nằm ngoài phạm vi hiện tại nếu service chưa được đưa lại vào code.
- **Bằng chứng Saga theo nhiều lớp:** Với hai luồng Saga đại diện, kết hợp unit/contract test, integration opt-in, fault injection deterministic khi có, artifact demo UI và bằng chứng DB/outbox/log. Chiến lược chi tiết nằm ở `docs/testing/phase-5/saga-validation-strategy.md`.

### Phạm vi canonical sau Phase 4A/4B

Phase 5 chuẩn hóa test cho **hành vi đã deploy hoặc chốt là contract hiện tại**. Nếu phát hiện lệch giữa docs và code, áp dụng thứ tự nguồn sự thật trong `docs/README.md`: code/test hiện tại → spec đã chấp nhận → bản ghi phase cuối → tài liệu tổng quan. Kết quả rà soát không chỉ thêm test mà còn phân loại chính xác trạng thái từng quy tắc.

| Loại phạm vi         | Xử lý trong Phase 5                                                                                              | Ví dụ cụ thể                                                                                                                                  |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `covered`            | Giữ test hiện có, gắn ma trận traceability                                                                       | Shared transition tests, BFF guards, webhook Payment trùng, test invoice subscription SaaS                                                    |
| `partial`            | Thêm test ở tầng thấp nhất đủ chứng minh quy tắc                                                                 | Payment UI smoke có nhưng chưa chứng minh full close-session; permission unit có nhưng chưa smoke Keycloak live ổn                            |
| `missing`            | Thêm test nếu hành vi đã có code và thuộc Phase 0/1/2A/2B/3/lát cắt đại diện 4A/4B                               | Gap integration cho Order Confirm Saga; Catalog QR token invalid/rate limit; ràng buộc xóa table/menu; fixture browser route tenant suspended |
| `implementation-gap` | Không sửa hành vi trong Phase 5; ghi cần phase/PR riêng nếu quy tắc canonical chưa có code                       | Offline queue IndexedDB, UI invite staff đầy đủ, dashboard replay webhook production                                                          |
| `security-gap`       | Test contract hiện tại nếu có; đánh dấu blocker trước go-live/demo thật nếu thiếu hardening                      | Route Phase 4B tenant/platform `x-secret-key` cần verify giá trị với secret lưu, không chỉ kiểm presence                                      |
| `deferred-by-phase`  | Không tính fail Phase 5; giữ backlog full hardening Phase 4A, backlog Phase 4C Quản lý nhân sự hoặc sau luận văn | Saga state bền vững, retry worker, stock ledger, CDC/Debezium, UI invite staff đầy đủ, dashboard replay webhook production                    |

### Dải ưu tiên

| Band | Quy tắc chọn test                                                                                | Bắt buộc trong Phase 5                                                              |
| ---- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------- |
| P0   | Sai gây mất tiền, lộ dữ liệu cross-tenant, vỡ state machine, bypass auth/RBAC hoặc vỡ demo chính | Phải có test cụ thể hoặc gap ghi rõ trước khi coi Phase 5 pass                      |
| P1   | Sai UX vận hành, mất hint realtime, cache stale, thiếu visibility cho staff/Owner                | Có unit/contract hoặc integration smoke tùy blast radius                            |
| P2   | UI smoke, route không trắng, hồi quy nhỏ, docs/tooling                                           | Có thể đưa vào smoke pre-demo hoặc checklist thủ công nếu automation tốn hơn rủi ro |

### Mục tiêu ma trận test

| Vùng rủi ro             | Unit / contract                                                                                                                                      | Integration                                                                                                                   | Browser E2E / smoke                                                                                          |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| tenant isolation + RBAC | Ma trận permission, guards, metadata route permission, đếm role seed                                                                                 | Query theo tenant không trả dữ liệu cross-tenant; ngoại lệ SUPER_ADMIN có kiểm soát                                           | Owner/MANAGER/WAITER/CHEF/BARISTA thấy route đúng và 403/redirect chính                                      |
| Catalog + QR/table/menu | QR HMAC/token helpers, hằng route slug/table, upload validators, delete constraints, quota bàn theo plan                                             | Tenant isolation Catalog; QR validate/join; CRUD menu/table filter tenant; validation path Cloudinary                         | Customer QR landing/menu load; Owner quản category/item/table tối thiểu không lộ cross-tenant                |
| QR session + cart       | QR/token helpers, cart version conflict, chính sách session status                                                                                   | Redis cart/session TTL, idempotency key, khóa request bill                                                                    | Customer scan QR, join session, cart mutation, submit, reload/reconnect                                      |
| Order + table state     | Ma trận transition dùng chung, chính sách cancel, transfer request id, chính sách request bill; unit test replay/compensation của Order Confirm Saga | Order Confirm Saga với Catalog deduct stock, Order commit/outbox và compensation trả kho; nhất quán chuyển bàn; tổng hợp bill | QR → order → POS confirm → KDS → served                                                                      |
| Kitchen + realtime      | Điểm hàng đợi KDS, station access, SLA worker, suy ra room gateway                                                                                   | Kafka `order.confirmed` → ticket Redis Kitchen → BFF hint `kds.queue_changed`                                                 | Luồng station KDS, reconnect/refetch snapshot, waiter thấy ready/served                                      |
| Payment settlement      | Làm tròn VND, tham chiếu thanh toán, chính sách cash/VietQR, webhook trùng/thiếu/sau paid                                                            | Transaction Payment + Order `BILL_MARK_PAID`; outbox `payment.completed`; lịch sử payment theo tenant                         | Panel cash/VietQR POS, màn thanh toán Customer, Dashboard lịch sử thanh toán read-only                       |
| SaaS Phase 4B           | Slug, saga onboarding, lifecycle tenant, invoice subscription, payment settings, OAuth state, feature gating                                         | Compensation onboarding đa service; cache Redis suspend/subscription; khớp invoice `QRSUB`                                    | Landing public, SUPER_ADMIN tenant/plan/billing, Owner subscription/payment settings, Customer PWA suspended |
| Invariant kiến trúc     | Registry topic Kafka, chính sách truy cập Redis, không `menu.updated`, hằng route BFF, pattern TCP                                                   | Kiểm tra Redis/Kafka được phép; default topic/env khớp registry 5 topic                                                       | Browser kiểm snapshot UI cuối và hành vi refetch, không phụ thuộc nội bộ event ẩn                            |

### Các bước

#### Bước 5.1 — Inventory + Ma trận traceability (1–2 ngày)

**Mục tiêu:** Biết chính xác quy tắc nghiệp vụ nào đã có test, tầng nào, gap nào hợp lệ vì full hardening Phase 4A/Phase 4C Quản lý nhân sự chưa làm.

**Phạm vi:**

- Tạo bảng traceability từ `business-logic.md`, `technical-architecture.md`, `docs/phases/phase-2a-order-kafka.md`, `phase-2b-kitchen-websocket.md`, `phase-3-payment.md`, `phase-4a-saga-hardening.md`, `phase-4b-saas-onboarding.md` tới test hiện có.
- Gán mỗi quy tắc một trong sáu trạng thái: `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`.
- Đánh dấu test cần stack thật: PostgreSQL/Redis/Kafka/Keycloak/frontend servers.
- Xác nhận baseline: nhiều Jest cho BFF, management-app, customer-pwa, saas, order, payment, catalog, kitchen; E2E top-level hiện chủ yếu Playwright smoke/journey.

**Định dạng tối thiểu ma trận traceability:**

| Cột                    | Ý nghĩa                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| `rule_id`              | ID ổn định, ví dụ `P0-PAY-WEBHOOK-DUP`, `P0-SaaS-SUSPEND-CUSTOMER`, `P1-KDS-REFETCH`                 |
| `source`               | File/mục nguồn: business logic, architecture, bản ghi phase, spec chấp nhận                          |
| `business_rule`        | Quy tắc cần bảo vệ bằng test hoặc ghi gap                                                            |
| `risk`                 | `money`, `tenant-isolation`, `rbac`, `state-machine`, `realtime`, `demo`, `security`, `architecture` |
| `priority`             | `P0`, `P1`, `P2`                                                                                     |
| `current_test`         | File test hiện có hoặc `none`                                                                        |
| `target_layer`         | `unit-contract`, `integration`, `browser-e2e`, `manual-provider`, `deferred`                         |
| `status`               | `covered`, `partial`, `missing`, `implementation-gap`, `security-gap`, `deferred-by-phase`           |
| `notes_or_next_action` | Lý do phân loại và bước tiếp theo cụ thể                                                             |

**Anchor bắt buộc trong ma trận:**

- Phase 1/Catalog: QR/token, public menu, CRUD tenant isolation, trạng thái/xóa bàn, validation/path Cloudinary.
- Phase 2A: session/cart/idempotency, transition order/bill/service request, trừ stock khi confirm, chuyển bàn.
- Phase 2B: hàng đợi Redis KDS, `order.confirmed` trùng, station access, refetch snapshot sau realtime hint.
- Phase 3: làm tròn VND, `QRTBL`, quyết toán cash/VietQR, webhook trùng/thiếu/sau paid, lịch sử thanh toán read-only, hoàn tất payment → finalize Order.
- Phase 4A: `OrderConfirmSagaService`, contract Catalog stock gateway, replay confirm, lỗi tồn kho từ Catalog, compensation trả kho sau khi Order commit/outbox thất bại, và SaaS onboarding mini-saga là luồng saga-style đại diện thứ hai.
- Phase 4B: lifecycle tenant, subscription/plan, `QRSUB`, OAuth state, payment settings, feature gating, hành vi customer suspended/closed.
- Kiến trúc: registry 5 topic Kafka, chính sách Redis, không `menu.updated`, ranh giới BFF Direct vs Kafka, đếm ma trận permission.

**verify:** Nhìn bảng trả lời được “quy tắc này được test nào bảo vệ” hoặc “vì sao chưa test trong Phase 5”.

#### Bước 5.2 — Unit + Contract Hardening (2–3 ngày)

**Mục tiêu:** Khóa invariant thuần và contract service/UI nhanh, ổn định trong PR.

**Phạm vi ưu tiên:**

- **Order/Bill/Table:** transition hợp lệ/không hợp lệ, `DRAFT` không persist DB row, `PENDING → PROCESSING → READY → SERVED → COMPLETED`, bill `OPEN → PENDING_PAYMENT → PAID`, bàn `AVAILABLE/OCCUPIED/BILLING/CLEANING`, chính sách cancel pending/processing.
- **Catalog/QR/Menu/Table:** QR token giả mạo/đường dẫn invalid, contract hiển thị menu, delete constraints, helper chuyển trạng thái bàn, input guard quota bàn, contract upload validator/thư mục tenant.
- **Payment:** edge case làm tròn VND, sinh/collision fallback tham chiếu `QRTBL`, cash `amountReceived >= roundedTotal`, tái sử dụng VIETQR pending, webhook thiếu/trùng/sau paid, Dashboard lịch sử thanh toán read-only.
- **SaaS Phase 4B:** slug/reserved collision, ngữ nghĩa tenant status, quota feature (`max_tables`, `max_staff`, `max_orders_per_day`), khớp invoice `QRSUB`, một subscription active, bí mật OAuth state/token, permission payment settings.
- **BFF/auth:** `UserGuard → TenantGuard → PermissionGuard`, guard lifecycle customer, guard plan/status tenant, metadata permission route cho surface SaaS/payment/order/kitchen.
- **Component/hook frontend:** control disabled tenant suspended, ngoại lệ payment cho bill pending, hook refetch realtime POS/KDS, auth readiness dashboard, điều hướng theo role.
- **Test kiến trúc tĩnh:** route constant unique, pattern TCP message exposed, đếm enum/seed/matrix permission, topic Kafka giới hạn registry, không vô tình có contract event `menu.updated`.

**Ghi chú RBAC:** `permission-matrix.md` hiện có 62 permission và role seed counts đã verify live: `SUPER_ADMIN=62`, `OWNER=38`, `MANAGER=35`, `WAITER=15`, `CHEF=6`, `BARISTA=6` (đã gỡ `PRODUCT_*` cùng `apps/product`). Smoke M2 seeded đã đi qua Keycloak login, BFF `/authorizer/me`, và Mongo-backed role permissions.

**verify:** `pnpm nx affected -t test` hoặc `pnpm nx test <project>` pass cho project chạm; báo coverage là tín hiệu phụ, không thay ma trận traceability.

#### Bước 5.3 — Integration Tests cho ranh giới thật (3–5 ngày)

**Mục tiêu:** Chứng minh điều mock không chứng minh được: tenant isolation, transaction/locking, ngữ nghĩa Redis, Kafka/outbox, contract TCP và cache invalidation.

**Phạm vi ưu tiên:**

- **Tenant isolation Catalog:** tenant A/B có category/menu/table riêng; public menu và admin CRUD luôn filter tenant; request thiếu tenant bị từ chối.
- **Khóa stock đồng thời:** Hai confirm cùng lúc với stock = 1 chỉ một đơn thành công; đơn còn lại lỗi cấu trúc; stock không âm.
- **Order Confirm Saga:** `OrderConfirmSagaService` lock và validate order/bill/items, gọi Catalog deduct với `confirm-order:{orderId}`, ghi `PROCESSING` + outbox `order.confirmed`, replay order đã `PROCESSING`, không compensation lỗi nghiệp vụ Catalog trước khi deduct thành công, và trả kho với `confirm-order-compensation:{orderId}` khi Order commit/outbox lỗi sau deduct.
- **Redis order/session/cart:** Xung đột version cart, khóa cart khi bill `PENDING_PAYMENT`, TTL cache session, idempotency key chống submit trùng.
- **Đường KDS:** `order.confirmed` → ticket Redis Kitchen theo station → `kds.queue_changed` nội bộ; event Kafka trùng không tạo ticket trùng.
- **Finalize payment:** Cash/VietQR PAID ghi payment + audit + outbox; Order `BILL_MARK_PAID` idempotent; chuyển bàn `BILLING → CLEANING`; webhook trùng không settle đôi.
- **Lifecycle SaaS:** Onboarding tạo tenant/Owner/subscription/payment settings/outbox; sau lỗi compensation Owner giống code hiện tại; suspend/activate ghi/xóa Redis flag; TTL cache subscription đúng chính sách.
- **Định tuyến webhook:** Route HMAC Phase 3 và route `x-secret-key` tenant/platform Phase 4B không trộn contract; `QRTBL` vào Payment, `QRSUB` vào invoice SaaS.

**Hợp đồng test harness:**

| Chủ đề           | Quy tắc Phase 5                                                                                                                                        |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Data reset       | Integration test phải seed/reset idempotent; không dùng dữ liệu cá nhân hoặc state sót trên máy dev                                                    |
| External stack   | Test cần PostgreSQL/Redis/Kafka/Keycloak phải có readiness check và skip có giải thích, hoặc chạy profile compose/test chính thức                      |
| Chính sách skip  | Skip chỉ hợp lệ cho provider thật hoặc stack chưa bật; không skip im lặng ở PR gate cho unit/contract                                                  |
| Auth credentials | Credential seed dùng trong Playwright và integration phải trong dev seed hoặc env có tài liệu, không hardcode secret thật                              |
| Determinism      | Test dùng timestamp/server time có thể kiểm soát hoặc assert theo khoảng; không phụ thuộc giờ chạy trừ quy tắc timezone `Asia/Ho_Chi_Minh` có chủ đích |
| Concurrency      | Test stock/idempotency/webhook trùng phải assert trạng thái cuối DB/response service, không chỉ đếm mock call                                          |
| SePay bên ngoài  | Phase 5 tự động mặc định mock unit hoặc mock SePay provider local; không bắt buộc redirect Vercel, tunnel public hoặc SePay live                       |

**Security gap bắt buộc ghi:** Route webhook `x-secret-key` Phase 4B là contract hiện tại; verify giá trị với secret tenant/platform lưu là hardening trước production. Nếu chưa có implementation, Phase 5 ghi `security-gap` thay vì coi test presence route là đủ.

**Chính sách SePay local/mock:** Test OAuth/payment settings/webhook tuân `docs/testing/phase-5/specs/phase-5-sepay-local-mock-testing-policy.md`. Dev local có thể dùng `localhost` cho Keycloak/BFF/frontend; test tự động không phụ thuộc redirect URI Vercel đăng ký hoặc tunnel. SePay live chỉ là smoke thủ công/opt-in trước demo public.

**verify:** Suite integration có seed/reset rõ, không phụ thuộc dữ liệu cá nhân trên máy dev. Nếu dùng compose local thay Testcontainers, ghi lệnh chuẩn và chính sách skip.

#### Bước 5.4 — Browser E2E cho đường demo (3–4 ngày)

**Mục tiêu:** Có bằng chứng end-to-end giống người dùng cho luồng quan trọng nhất trước demo Phase 6/7.

**Phạm vi Playwright bắt buộc:**

- **Luồng A — Đặt món QR realtime:** Customer landing bằng QR → menu → cart → submit → WAITER xác nhận → CHEF/BARISTA xử lý KDS → WAITER served → Customer tracking cập nhật sau reconnect/reload.
- **Luồng B — Thanh toán đóng session:** Customer/staff request bill → POS cash hoặc VietQR → paid → bill bất biến → đóng session → bàn `Cleaning`.
- **Luồng C — Onboarding SaaS:** SUPER_ADMIN onboard tenant → Owner login → Owner xem subscription/payment settings → tạo hoặc xem tài nguyên tối thiểu theo tenant.
- **Luồng D — Tenant suspended:** tenant suspended → Customer PWA vẫn đọc menu/trạng thái cần thiết, không tạo order/cart mới, nhưng route thanh toán bill pending vẫn hoạt động.
- **Luồng E — Admin/dashboard smoke:** Landing public, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, trang OAuth invalid-state không trắng/401/500 với role seed đúng.

**SePay/OAuth trong E2E:** Luồng payment settings không tự động login SePay thật. Test seed OAuth state hợp lệ mặc định, dùng code giả, exchange qua mock SePay provider, hiển thị ngân hàng mock, chọn ngân hàng mock, verify settings đã lưu. Invalid-state redirect thẳng callback với state sai để assert UI lỗi. Login/webhook provider live tách checklist thủ công.

**Trạng thái E2E hiện tại cần phản ánh trong ma trận:**

| File hiện có                          | Đang chứng minh                                                              | Gap còn lại                                                                                               |
| ------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `tests/e2e/step-2.7-realtime.spec.ts` | QR → cart → order → POS confirm → KDS → served, reconnect/reload snapshot    | Chưa cover close-session và payment/SaaS/tenant suspended                                                 |
| `tests/e2e/phase-3-payment.spec.ts`   | Smoke màn payment/POS tab/dashboard lịch sử thanh toán khi stack dev/auth có | Chưa chứng minh full finalize payment, webhook settlement, bill bất biến, đóng session/dọn bàn end-to-end |
| Chưa có Playwright Phase 4B chuyên    | —                                                                            | Onboarding tenant, admin billing, Owner subscription/payment settings, fixture browser tenant suspended   |

**verify:** E2E chạy tuần tự với seed fixture idempotent. Test không soi nội bộ Kafka/Redis; kiểm UI cuối và snapshot sau refetch.

#### Bước 5.5 — CI, Coverage và quy tắc chạy (1–2 ngày)

**Mục tiêu:** Bộ test đủ nhanh cho PR nhưng vẫn có đường full-stack tin cậy pre-demo/nightly.

**Quality gate gợi ý:**

| Gate                    | Lệnh                                                                                                                                  | Mục đích                                                                 |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ |
| Baseline CI hiện tại    | `pnpm exec nx run-many -t lint test build`                                                                                            | Lệnh có trong GitHub Actions; Phase 5 không làm baseline flaky           |
| Gate nhanh PR           | `pnpm exec nx affected -t lint test build`                                                                                            | Bắt lỗi thường gặp khi đổi code, tối ưu thời gian khi CI chuyển affected |
| Unit/contract đầy đủ    | `pnpm exec nx run-many -t test`                                                                                                       | Chạy mọi project test Jest/Nx                                            |
| Gate domain tập trung   | `pnpm nx test bff`, `pnpm nx test catalog`, `pnpm nx test order`, `pnpm nx test kitchen`, `pnpm nx test payment`, `pnpm nx test saas` | Chạy nhanh bounded context P0/P1 khi harden test                         |
| Gate integration        | `pnpm nx test frontend-utils`, `pnpm nx test saas`, `pnpm nx test payment`, `pnpm nx test order` hoặc suite compose/test khi tách     | Test ranh giới DB/Redis/Kafka; cần chính sách readiness/seed rõ          |
| Smoke browser E2E       | `pnpm e2e:step2.7` và `pnpm exec playwright test tests/e2e/phase-3-payment.spec.ts`                                                   | Chạy smoke hiện có trên stack dev                                        |
| E2E browser mục tiêu đủ | `pnpm exec playwright test tests/e2e`                                                                                                 | Chạy journey demo sau khi có seed/stack dev chuẩn                        |
| Dry run pre-demo        | `pnpm dev:reseed -- --yes` + script serve app/backend + Playwright luồng chọn                                                         | Xác nhận stack thật trước Phase 7                                        |

**Cập nhật CI/tài liệu Phase 5 bắt buộc:**

- Nếu giữ CI hiện tại, Phase 5 phải ghi rõ Playwright/integration là gate pre-demo hoặc nightly/thủ công, không phải PR gate.
- Nếu đưa Playwright vào CI, phải thêm service stack hoặc preview/dev stack seed ổn định; không bật E2E CI khi credential/Keycloak không deterministic.
- Suite integration frontend-utils phụ thuộc runtime skip mặc định. Chỉ bật với `RUN_FRONTEND_UTILS_INTEGRATION=1` cộng `BFF_URL` và `KEYCLOAK_URL` trỏ stack local/test sẵn sàng.
- Thêm script package rõ cho E2E mới, ví dụ `e2e:phase3`, `e2e:phase4b`, hoặc `e2e:demo` chạy luồng chọn theo thứ tự.
- Báo coverage là artifact phụ; ma trận traceability mới là acceptance chính.

**Chính sách coverage:**

- Dùng coverage phát hiện vùng trống, không làm mục tiêu duy nhất.
- Ngưỡng tối thiểu Phase 5: **Order + Payment >= 60%** unit/contract như roadmap cũ, nhưng quy tắc P0 trong traceability phải có test dù đã đạt coverage.
- SaaS Phase 4B, BFF guards, Catalog, Kitchen đạt coverage theo quy tắc P0/P1 trong ma trận; không đặt cùng ngưỡng % máy móc cho mọi project vì blast radius và loại test khác nhau.

### Ngoài phạm vi Phase 5 hiện tại

- **Không bắt buộc pass test cho full hardening vận hành Phase 4A** như Saga state bền vững, retry worker, stock ledger, full CDC/Debezium hoặc framework audit mới nếu chưa triển khai. Phase 5 vẫn phải test Order Confirm Saga đã triển khai và baseline outbox/idempotency/compensation hiện có.
- **Không yêu cầu Notification/email** như email biên lai, welcome/suspend, email reset-password hoặc notification logs vì Notification Service nằm ngoài phạm vi hiện tại. Phase 4C Quản lý nhân sự cũng không là blocker của Phase 5 khi chưa triển khai.
- **Không yêu cầu offline queue đầy đủ** như IndexedDB action queue, auto-sync POS/KDS/customer khi mất mạng lâu, hoặc conflict resolver đầy đủ nếu code hiện tại chưa có. Phase 5 chỉ test hành vi reconnect/refetch/snapshot hiện có.
- **Không thay chứng nhận provider live.** SePay/OAuth/webhook provider vẫn cần validation manual/live khi có URL BFF public và credential hợp lệ; Phase 5 tự động chỉ khóa contract nội bộ và hành vi route bằng mock/local provider. Không dùng domain Vercel tạm hoặc tunnel local làm điều kiện pass mặc định.
- **Không thêm hành vi nghiệp vụ mới chỉ để test.** Nếu test phát hiện docs yêu cầu hành vi chưa có, ghi `implementation gap` hoặc `deferred scope`, không âm thầm đổi contract sản phẩm.

### Tiêu chí nghiệm thu — Phase 5

- [ ] Có ma trận traceability cho quy tắc P0/P1 trong `business-logic.md`, `technical-architecture.md`, Phase 1/2A/2B/3/4A/4B và ma trận permission, với trạng thái `covered/partial/missing/implementation-gap/security-gap/deferred-by-phase`.
- [ ] **Unit/contract:** Order + Payment đạt ít nhất **60%** coverage theo công cụ monorepo và mọi invariant P0 về state/tiền/idempotency/webhook có test cụ thể.
- [ ] **Catalog/QR:** Có test QR token/token invalid, tenant isolation public menu, filter tenant CRUD, delete constraints table/menu và validation/path upload nếu hành vi đã có.
- [ ] **SaaS Phase 4B:** Có test onboarding, lifecycle tenant, subscription/plan, payment settings/OAuth state, khớp invoice `QRSUB`, feature gating và hành vi customer suspended/closed.
- [ ] **Chính sách test SePay:** Test tự động mặc định dùng mock SePay hoặc mock unit; mọi kiểm tra SePay live có `RUN_LIVE_SEPAY=1`, URL public hợp lệ, lý do skip rõ, không nằm PR gate mặc định.
- [ ] **Integration:** Có ít nhất kịch bản tenant isolation, Order Confirm Saga stock deduct/replay/compensation, khóa stock đồng thời, finalize payment, cache Redis suspend/subscription, smoke permission/auth đại diện và tách route webhook `QRTBL`/`QRSUB`.
- [ ] **Hiển thị security gap:** Verify giá trị route `x-secret-key` Phase 4B được test nếu đã implement; nếu chưa, ghi `security-gap` blocker trước go-live/demo public.
- [ ] **E2E Playwright:** Luồng đặt món QR realtime, đóng session thanh toán, onboarding tenant và tenant suspended ổn định trên seed/stack dev chuẩn, hoặc đánh dấu `missing` kèm fixture/credential bổ sung.
- [ ] **CI/gates:** Baseline CI, gate PR nhanh, gate unit/contract đầy đủ, gate integration và lệnh browser E2E có tài liệu; test phụ thuộc stack local có chính sách skip minh bạch thay vì fail ngẫu nhiên.
- [ ] **Deferred rõ:** Full hardening Phase 4A và hành vi Phase 4C Quản lý nhân sự chưa triển khai được đánh dấu deferred/gap hợp lệ, còn Order Confirm Saga đã triển khai vẫn thuộc acceptance Phase 5. Notification/email nằm ngoài phạm vi hiện tại.
- [ ] **Bằng chứng Saga cho khóa luận:** Order Confirm Saga và SaaS Onboarding Mini-Saga có lệnh kiểm chứng, artifact kỳ vọng và giới hạn claim trong `docs/testing/phase-5/saga-validation-strategy.md`.

---

## Phase 6 — Observability (~1–2 tuần)

**Vì sao:** Hệ thống có BFF, nhiều microservice, Kafka và WebSocket; không có health + log + metric + trace thì **thời gian sửa lỗi** và **độ tin cậy demo** giảm mạnh, khó trình diễn luồng “một request qua nhiều hop”.

### Các bước

#### Bước 6.1 — Học + dựng nền tảng quan sát (bài 136–151)

**Mục tiêu:** Mỗi service có tín hiệu tối thiểu cho vận hành và debug — và trace **nối được** qua các hop nội bộ.

**Ánh xạ khóa học:**

| Bài     | Nội dung                                          |
| ------- | ------------------------------------------------- |
| 136–138 | Health Check                                      |
| 139–144 | Stack PLG (Promtail + Loki + Grafana + Pino)      |
| 145–146 | Prometheus + custom metrics                       |
| 147–151 | Tempo + OTel (auto-instrumentation + propagation) |

**Phạm vi (WHAT):**

- **Health check** toàn service — tiên quyết cho orchestrator, alert và demo “hệ thống sống”.
- **Stack PLG** (Promtail + Loki + Grafana) với **structured logger** (Pino) — log tập trung giúp truy `app`/tenant/request không cần SSH từng container.
- **Prometheus + custom metrics + dashboard** — cần thấy **tải, lỗi, độ trễ** thời gian thực, không chỉ “có log”.
- **Tempo + OpenTelemetry (auto-instrumentation)** và **context propagation** qua **TCP/Kafka** — đơn có thể đi BFF → Order → Kitchen; không nối trace thì không chứng minh được phân tán.

**verify:** Từ một request đại diện, trả lời được: log ở đâu, metric nào liên quan, trace id đi qua service nào.

#### Bước 6.2 — Grafana Dashboards (2–3 ngày)

**Mục tiêu:** Biến dữ liệu thô thành **câu chuyện vận hành và nghiệp vụ** — cho demo và phòng ngừa sự cố.

**Phạm vi (WHAT):**

- **System Overview** — sức khỏe và tải tổng thể.
- **Business Metrics** — ví dụ đơn/phút, doanh thu (theo định nghĩa thống nhất), thời gian chờ KDS trung bình — hội đồng và Owner quan tâm **nghiệp vụ**, không chỉ CPU.
- **Per-service** — request rate, error rate, P95 — định vị nhanh service nghẽn hoặc lỗi.
- **Alerting** — ví dụ service down, error rate > 5%, vi phạm SLA KDS — cần tín hiệu chủ động, không chỉ xem dashboard sau sự cố.

**verify:** Chỉ được dashboard và giải thích ý nghĩa panel chính trong < 5 phút.

### Tiêu chí nghiệm thu — Phase 6

- [ ] **Grafana** truy cập được tại **`localhost:3001`** khi stack chạy local.
- [ ] **Loki:** query `{app="order"}` (hoặc label chuẩn hóa tương đương) **thấy log** tương ứng traffic thật hoặc script tạo tải.
- [ ] **Tempo:** **một trace của đơn** (hoặc luồng đơn đại diện) đi qua **BFF → Order → Kitchen** — chứng minh propagation khớp kiến trúc.
- [ ] **Prometheus:** metric hiển thị **thời gian thực** (dashboard refresh phản ánh thay đổi theo hành vi hệ thống).
- [ ] **Alert:** Khi **cố ý dừng** service quan trọng, có **alert kích hoạt** theo quy tắc đã định — xác nhận vòng “phát hiện → tín hiệu” hoạt động.

---

## Phase 7 — Docker Deploy + Demo (~1 tuần)

**Vì sao:** Luận văn và hội đồng cần **một lệnh (hoặc chuỗi compose rõ)** lên full stack; seed và script demo giảm rủi ro “chạy được trên máy tôi”.

### Các bước

#### Bước 7.1 — Dockerfiles & Compose & Seed (bài 152–155)

**Mục tiêu:** Image **nhỏ, nhất quán, tái lập**; tách infra/app/monitoring để người mới bật đúng lớp cần dùng.

**Phạm vi (WHAT):**

- **Multi-stage** mỗi service (builder → runner) — artifact tách khỏi toolchain build, phù hợp deploy và artifact luận văn.
- **docker-compose.app.yaml** — **8 backend + 2 frontend** (theo kiến trúc cuối).
- **docker-compose.infra.yaml** — data plane: **PG, Redis, Mongo, Keycloak, Kafka** (theo technical-architecture).
- **docker-compose.monitoring.yaml** — quan sát (khớp Phase 6).
- **Seed:** **1 tenant, 5 category, 20 item, 8 bàn** — đủ demo đa bàn, menu có chiều sâu, không nhập tay lâu.

**verify:** `docker compose up` (hoặc bộ lệnh tương đương ghi trong README phase) build full stack; seed chạy idempotent hoặc có chiến lược reset rõ.

#### Bước 7.2 — Chuẩn bị demo (2–3 ngày)

**Mục tiêu:** Kịch bản bảo vệ **15–20 phút** chạy trơn, không phụ thuộc ad-hoc — vì thời gian hội đồng cố định và áp lực cao.

**Phạm vi (WHAT):**

- **Script demo** (kịch bản 15–20 phút bảo vệ luận văn):
  - **Tab 1 (Customer):** Quét QR → hiện menu → chọn món + giỏ → gửi đơn.
  - **Tab 2 (Management):** Staff xác nhận đơn → KDS hiện ticket → Chef/Barista xử lý → Thanh toán (cash hoặc VietQR/SePay) → đóng bill.
  - **Tab 3 (Monitoring):** Grafana trace xuyên suốt — chỉ trace ID từ BFF → Order → Kitchen → Payment, chứng minh phân tán.
- **Dry run full stack** ít nhất một lần end-to-end trước ngày bảo vệ — phát hiện compose/network/lỗi sớm hơn trên slide.
- **Kế hoạch dự phòng:** Script seed chạy nhanh nếu cần reset giữa các lần tập — đưa hệ thống về trạng thái sạch trong < 2 phút.

**verify:** Người không tham gia code có thể theo script và có kết quả quan sát giống nhau (UI + trace).

### Tiêu chí nghiệm thu — Phase 7

- [ ] **`docker compose up`** (theo tài liệu triển khai) → **hệ thống đầy đủ hoạt động** (login/QR/luồng chính không vỡ).
- [ ] **Script demo E2E** chạy **trơn** trong khung thời gian quy định — không có bước “chờ may mắn”.
- [ ] **Grafana trace** hiển thị **đường đi đầy đủ** (BFF → service liên quan → kitchen) cho tương tác demo điển hình.
- [ ] **Seed data** sẵn theo quy mô đã nêu — không nhập tay trước giờ G.

---

## Đầu ra (chung)

- Bộ **test** (unit + integration + E2E) neo vào `business-logic.md` và contract giữa service — tài sản tái sử dụng sau luận văn.
- Nền tảng **quan sát** (health, log, metrics, trace, dashboard, alert) **chạy local** và ghi port Grafana/Prometheus — giảm thời gian debug, tăng độ tin cậy demo.
- **Artifact triển khai** (Dockerfile multi-stage, compose phân lớp, seed, script demo) — tái lập hệ thống QRTable POS trong môi trường chuẩn không phụ thuộc cấu hình máy cá nhân.

**Trạng thái tài liệu:** roadmap/spec đã canonical hóa; bản thân Phase 5–7 vẫn **TODO** theo trạng thái phase.

## Ghi chú lộ trình

- **Critical Path:** Phase 0 → 1 → 2A → 2B → 3 → 5–7 (Demo)
- **Nhánh song song:** Phase 4B xong; Phase 4A có lát cắt Saga đại diện đã triển khai, full hardening vẫn là việc tương lai; Phase 4C Quản lý nhân sự chưa bắt đầu và phụ thuộc 4B. Step 4.5 Notification Service đã loại khỏi phạm vi hiện tại.
- **4 điểm nhấn demo ấn tượng nhất:** Phase 1 (QR + Menu), Phase 2 (Đặt món realtime), Phase 3 (Thanh toán), Phase 6 (Grafana Tracing)
