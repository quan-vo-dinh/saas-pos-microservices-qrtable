# Ma trận traceability Phase 5 — Bước 5.1

**Phạm vi:** Chỉ rule P0 và P1. Inventory này map rule chuẩn từ `docs/business-logic.md`, `docs/technical-architecture.md`, bản ghi phase đã hoàn thành (1, 2A, 2B, 3, 4B), và `docs/architecture/permission-matrix.md` sang test hiện có. Tài liệu không thêm hay yêu cầu business behavior mới.

**Ngữ cảnh phase:** Phase 0, 1, 2A, 2B, 3, và 4B đã hoàn thành. Phase 4A deferred. Phase 4C chưa bắt đầu.

---

## Định nghĩa trạng thái

- **`covered`** — Test hiện có bảo vệ tầng đích cho rule này.
- **`partial`** — Test hiện có bảo phủ một phần rule; vẫn cần tầng mạnh hơn, fixture, chứng minh stack live, hoặc edge case.
- **`missing`** — Hành vi có vẻ đã triển khai hoặc là contract hiện tại, nhưng không tìm thấy test đủ.
- **`implementation-gap`** — Tài liệu chuẩn mô tả rule chưa rõ đã triển khai; không thêm test cho đến khi build hành vi hoặc đổi spec.
- **`security-gap`** — Hardening bảo mật chưa đủ cho production hoặc demo công khai; test hiện có có thể chỉ cover hình dạng route hoặc presence.
- **`deferred-by-phase`** — Rule thuộc Phase 4A, Phase 4C, hoặc phạm vi hardening sau luận văn / tương lai rõ ràng.

---

## Ghi chú inventory

- Test nhanh chủ yếu là Jest hoặc spec Nx dưới `apps/**` và `libs/**`.
- Browser E2E hiện giới hạn ở `tests/e2e/step-2.7-realtime.spec.ts` và `tests/e2e/phase-3-payment.spec.ts`.
- Mục **phụ thuộc stack** cần PostgreSQL, Redis, Kafka, Keycloak, dev server frontend, hoặc credential provider khi ghi chú.
- **Không tìm thấy tệp test** nghĩa là inventory không định vị spec đủ cho rule đó; không có nghĩa rule không quan trọng.

**Cách ghi vị trí test:** Đường dẫn liệt kê bullet dưới mỗi rule để xuống dòng trong editor. Phân đoạn đầu là root app hoặc lib; đường sâu hơn nằm cùng bullet khi hữu ích.

---

## Catalog và QR

### `P0-CAT-TENANT-ISOLATION` — `partial` (P0, tenant-isolation)

**Yêu cầu:** Đọc/ghi Catalog, admin, và public menu phải scope theo tenant; tenant A không được thấy dữ liệu tenant B.

**Nguồn:** `business-logic` (1.B, 2.B); `technical-architecture` (5, 6.2.4); `phase-1-catalog` Bước 1.5.

**Test:** Spec service category và menu-item Catalog; integration tenant isolation frontend dưới integration tests `libs/frontend/utils`.

**Tầng đích:** integration. **Stack:** BFF, Catalog, auth seed.

**Ghi chú:** Đã có coverage unit/service và tệp integration phụ thuộc stack; Phase 5 nên làm readiness và chính sách seed rõ ràng trước khi coi đây là gate tin cậy.

---

### `P0-CAT-QR-TOKEN` — `covered` (P0, security)

**Yêu cầu:** QR hoặc table token phải opaque, scope theo tenant và bàn, từ chối token sai định dạng hoặc không khớp, và đưa vào tạo session khách.

**Nguồn:** `business-logic` (3.B); `technical-architecture` (8.1); `phase-1-catalog` Bước 1.5.

**Test:** Spec service bàn Catalog; unit test URL QR management-app; E2E realtime Bước 2.7 (QR token seed trên dev stack).

**Tầng đích:** unit-contract. **Stack:** tùy chọn browser dev stack.

**Ghi chú:** Table service cover generate, validate, và token malformed; E2E Bước 2.7 chạy QR token đã seed.

---

### `P1-CAT-QR-RATE-LIMIT` — `implementation-gap` (P1, security)

**Yêu cầu:** Giới hạn spam quét QR và order nên giới hạn quét hoặc order quá mức mỗi session.

**Nguồn:** `business-logic` (3.B); `technical-architecture` (11.1).

**Test:** Chỉ cấu hình Throttler (`libs/configuration` throttler config); không có spec tập trung cho limit scope theo bàn.

**Tầng đích:** unit-contract. **Stack:** Redis nếu chạy BFF throttler storage.

**Ghi chú:** BFF expose Throttler provider toàn cục; không tìm thấy hành vi hoặc test `max_scans_per_table` hoặc `max_orders_per_session` scope theo bàn. Coi là hardening sản phẩm và bảo mật ngoài pass traceability này.

---

### `P0-CAT-PUBLIC-MENU` — `covered` (P0, tenant-isolation)

**Yêu cầu:** Public menu chỉ expose category active và item available, không xóa, cho tenant hiện tại.

**Nguồn:** `business-logic` (2.B); `phase-1-catalog` Bước 1.5.

**Test:** Spec service menu Catalog; integration public menu dưới `libs/frontend/utils`; spec hook `use-menu-query` customer PWA.

**Tầng đích:** integration. **Stack:** BFF, Catalog, menu seed.

**Ghi chú:** Service và integration test cover lọc chỉ-available và cache liên quan.

---

### `P1-CAT-DELETE-CONSTRAINTS` — `partial` (P1, state-machine)

**Yêu cầu:** Category có menu item và bàn active hoặc occupied không được xóa; menu item gắn order mở cần ràng buộc thuộc Order.

**Nguồn:** `business-logic` (2.B, 3.D); `phase-1-catalog` Bước 1.5.

**Test:** Spec service category, bàn, và menu-item Catalog.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Ràng buộc category và bàn đã cover. Xóa menu item khi order active chưa rõ triển khai ở Catalog hay Order; coi lát đó là implementation gap trước khi viết test.

---

### `P1-CAT-CLOUDINARY-TENANT-PATH` — `covered` (P1, security)

**Yêu cầu:** Validation upload phải enforce kiểu ảnh, kích thước, tên file an toàn, và đường folder Cloudinary cô lập theo tenant.

**Nguồn:** `business-logic` (9.D); `technical-architecture` (5.2); `phase-1-catalog` Bước 1.45.

**Test:** Spec provider Cloudinary và validator dưới `libs/providers/cloudinary`; spec upload client dưới `libs/frontend/utils`.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P1-CAT-NO-MENU-KAFKA` — `missing` (P1, architecture)

**Yêu cầu:** Thay đổi menu dùng cache hoặc invalidate query; không có contract Kafka hoặc WebSocket `menu.updated` trong phạm vi hiện tại.

**Nguồn:** `business-logic` (2.B); `technical-architecture` (7.2, 11.3); `phase-1-catalog` Bước 1.5; handoff `phase-2b-kitchen-websocket`.

**Test:** không tìm thấy.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Thêm static architecture test đảm bảo không export hoặc dùng contract `menu.updated`, `events.menuUpdated`, hoặc `events.menu.updated`. Không thêm realtime menu trong Phase 5.

---

### `P1-CAT-TABLE-PLAN-QUOTA` — `covered` (P1, tenant-isolation)

**Yêu cầu:** Tạo bàn phải tôn trọng quota subscription `max_tables`.

**Nguồn:** `business-logic` (3.D); business behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec service bàn Catalog cover enforcement ở owner service cho `max_tables`, unlimited `-1`, quota source thiếu/không khả dụng fail-closed, và `details` ổn định của `TENANT_PLAN_LIMIT_EXCEEDED`.

**Tầng đích:** unit-contract. **Stack:** mock SaaS TCP.

**Ghi chú:** Catalog hiện enforce quota trước khi persist bàn bằng cách gọi SaaS `SUBSCRIPTION.GET_CURRENT` và đếm bàn ở owner service. BFF edge feedback vẫn là tùy chọn; ranh giới owner là gate chấp nhận.

---

## Order, cart, và session

### `P0-ORD-SESSION-JOIN` — `partial` (P0, state-machine)

**Yêu cầu:** Join QR khách tạo session active bền cho bàn AVAILABLE, rejoin session active OCCUPIED, và từ chối bắt đầu session cho BILLING và CLEANING.

**Nguồn:** `business-logic` (3.C, 4.A); phạm vi cuối `phase-2a-order-kafka`.

**Test:** Spec service Order và session; E2E realtime Bước 2.7.

**Tầng đích:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP, PWA hoặc BFF cho E2E.

**Ghi chú:** Unit và hành trình browser đã có; cần integration ranh giới thật cho QR Catalog hoặc trạng thái bàn cộng ngữ nghĩa session Order trong Redis và PostgreSQL.

---

### `P0-ORD-CART-VERSION-LOCK` — `partial` (P0, state-machine)

**Yêu cầu:** Cart dùng chung dùng Redis `cartVersion`, từ chối mutation cũ, lock khi bill `PENDING_PAYMENT`, và refetch snapshot server.

**Nguồn:** `business-logic` (4.A, 6.A); `technical-architecture` (11, 12.2); quyết định chấp nhận `phase-2a-order-kafka`.

**Test:** Spec cart service Order; spec hook order và realtime customer PWA.

**Tầng đích:** integration. **Stack:** Redis; BFF hoặc PWA tùy chọn.

**Ghi chú:** Unit và hook coverage mạnh; thiếu integration conflict Redis và lock với chính sách reset và readiness rõ ràng.

---

### `P0-ORD-SUBMIT-IDEMPOTENCY` — `partial` (P0, state-machine)

**Yêu cầu:** Submit order tạo `PENDING` một lần, xóa cart một lần, dùng `idempotencyKey`, và không được persist dòng order DB `DRAFT`.

**Nguồn:** `business-logic` (4.B, 12.2); quyết định chấp nhận `phase-2a-order-kafka`.

**Test:** Spec service Order; spec hook order query customer PWA; test transition shared types.

**Tầng đích:** integration. **Stack:** PostgreSQL, Redis.

**Ghi chú:** Cần integration DB và Redis chứng minh submit trùng và trạng thái cuối idempotent.

---

### `P0-ORD-STATE-STOCK` — `partial` (P0, money)

**Yêu cầu:** Staff confirm chuyển `PENDING` sang `PROCESSING`, trừ stock qua transaction Catalog TCP, emit `order.confirmed`, và rollback khi lỗi stock.

**Nguồn:** `business-logic` (4.B, 8.B); `technical-architecture` (12.1); quyết định chấp nhận `phase-2a-order-kafka`; `phase-5-p0-order-stock-confirmation-spec`.

**Test:** Spec service Order; spec service menu-item Catalog; spec repository menu-item Catalog; spec payload order-confirmed trong Order app; spec external-stack opt-in `apps/order/src/app/modules/order/tests/order-stock-concurrency.integration.spec.ts`.

**Tầng đích:** integration. **Stack:** PostgreSQL, Catalog TCP, Kafka hoặc outbox harness.

**Ghi chú:** Coverage unit-contract Step 5.2 hiện chứng minh shape call trừ stock, chuyển `PROCESSING`, persist outbox, replay không trừ lại, contract lock sorted unique của Catalog, và simulation concurrent stock=1. Step 5.3A-1 bổ sung integration harness opt-in; chạy `RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-stock-concurrency.integration.spec.ts --runInBand` sau khi PostgreSQL, Order TCP, và Catalog TCP sẵn sàng. Giữ `partial` cho đến khi lệnh external-stack đó được chạy và pass.

---

### `P0-ORD-CANCEL-POLICY` — `covered` (P0, rbac)

**Yêu cầu:** Khách chỉ hủy order `PENDING` của chính mình; staff hủy pending; Owner hoặc Manager hủy processing có lý do và nhả stock.

**Nguồn:** `business-logic` (4.B, 8.B, 9.E); `permission-matrix` (6 đến 8); quyết định chấp nhận `phase-2a-order-kafka`.

**Test:** Spec service Order; spec BFF permission guard; spec component bảng live orders management-app.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-ORD-BILL-REQUEST` — `partial` (P0, money)

**Yêu cầu:** Yêu cầu bill cần cart rỗng và mọi order active đã served; bill chuyển `OPEN` sang `PENDING_PAYMENT`, lock cart, bàn chuyển billing.

**Nguồn:** `business-logic` (3.C, 6.A); quyết định chấp nhận `phase-2a-order-kafka`.

**Test:** Spec bill và service-request trong Order; spec hook order query customer PWA.

**Tầng đích:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP.

**Ghi chú:** Service test cover rule; chứng minh ranh giới cart lock cộng trạng thái billing bàn Catalog vẫn là mục tiêu integration.

---

### `P0-ORD-PAYMENT-FINALIZATION` — `partial` (P0, money)

**Yêu cầu:** `BILL_MARK_PAID` idempotent, đánh dấu bill `PAID`, đóng session active, xóa key session và cart Redis, chuyển bàn `BILLING` sang `CLEANING`.

**Nguồn:** `business-logic` (3.C, 6.A); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec bill và session service; spec payment events consumer trong Order.

**Tầng đích:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP, payment event harness.

**Ghi chú:** Unit coverage đã có; thiếu integration đầy đủ Payment → Order → Catalog trạng thái cuối hoặc E2E close-session.

---

### `P1-ORD-SERVICE-REQUESTS` — `covered` (P1, demo)

**Yêu cầu:** Yêu cầu dịch vụ khách scope theo session và tenant; staff acknowledge và resolve với transition đúng.

**Nguồn:** `business-logic` (4.A); business behavior cuối `phase-2a-order-kafka`.

**Test:** Spec service-request Order; spec BFF staff order controller; spec feature service-requests management-app.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P1-ORD-TABLE-TRANSFER` — `partial` (P1, state-machine)

**Yêu cầu:** Chuyển bàn dùng consistency kiểu saga: lock Redis, cập nhật DB Order và session, cập nhật trạng thái Catalog, patch metadata Redis, hint realtime.

**Nguồn:** `business-logic` (3.D); `technical-architecture` (12.1); quyết định chấp nhận `phase-2a-order-kafka`.

**Test:** Spec transfer service Order; spec id yêu cầu chuyển bàn management-app; spec component dialog chuyển bàn.

**Tầng đích:** integration. **Stack:** PostgreSQL, Redis, Catalog TCP.

**Ghi chú:** Unit test cover lock và request identifier; cần integration trạng thái session và bàn cuối cùng và compensation.

---

## Kitchen (KDS) và realtime

### `P0-KDS-ORDER-CONFIRMED-DEDUPE` — `partial` (P0, realtime)

**Yêu cầu:** `order.confirmed` tạo tối đa một ticket Redis mỗi `(tenantId, orderId, station)` và dedupe sự kiện Kafka trùng.

**Nguồn:** `business-logic` (5); `technical-architecture` (7.2); quyết định chấp nhận `phase-2b-kitchen-websocket`.

**Test:** Spec consumer order-confirmed Kitchen; spec KDS ticket service.

**Tầng đích:** integration. **Stack:** Kafka hoặc consumer harness trực tiếp, Redis.

**Ghi chú:** Unit consumer test cover dedupe và dead-letter; cần coverage Redis hoặc Kafka duplicate-delivery cho hành vi at-least-once.

---

### `P0-KDS-STATION-ACCESS` — `covered` (P0, rbac)

**Yêu cầu:** CHEF thấy kitchen, BARISTA thấy bar, Owner hoặc Manager có thể truy cập cả hai, WAITER mặc định không join phòng station KDS.

**Nguồn:** `permission-matrix` (6); quyết định chấp nhận `phase-2b-kitchen-websocket`.

**Test:** Spec BFF KDS station access service; spec kitchen controller; spec realtime auth service.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P1-KDS-FIFO-PRIORITY-SLA` — `covered` (P1, realtime)

**Yêu cầu:** Hàng đợi KDS FIFO với override priority; SLA worker emit `kitchen.sla_warning` deduped; không có contract batching hoặc grouped-prep.

**Nguồn:** `business-logic` (5.B); business behavior cuối `phase-2b-kitchen-websocket`.

**Test:** Spec Kitchen KDS score, ticket service, và SLA worker; spec policy bảng KDS management-app.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P1-KDS-REFETCH-HINT` — `covered` (P1, realtime)

**Yêu cầu:** WebSocket và sự kiện KDS chỉ là hint; KDS, PWA, và POS phải invalidate hoặc refetch snapshot REST sau sự kiện, reconnect, miss event, hoặc tab wake.

**Nguồn:** `business-logic` (5.B); `technical-architecture` (9); quyết định chấp nhận `phase-2b-kitchen-websocket`.

**Test:** Spec hook realtime KDS và staff order management-app; spec hook order realtime customer PWA; E2E Bước 2.7.

**Tầng đích:** browser-e2e. **Stack:** dev server frontend, BFF, Keycloak, user seed.

**Ghi chú:** Hook test cover refetch và invalidation; E2E Bước 2.7 kiểm tra trạng thái served khách qua reconnect và reload trên dev stack.

---

### `P1-KDS-REDIS-ONLY-RECOVERY` — `covered` (P1, architecture)

**Yêu cầu:** Kitchen chỉ sở hữu trạng thái KDS Redis, có thể rebuild ticket thiếu từ snapshot Order active, và không được thêm trạng thái KDS DB persistent.

**Nguồn:** `technical-architecture` (5.1, 11.2); technical behavior cuối `phase-2b-kitchen-websocket`.

**Test:** Spec Kitchen KDS keys, recovery service, và ticket service.

**Tầng đích:** unit-contract. **Stack:** không.

---

## Payment và billing

### `P0-PAY-ROUNDING-VND` — `covered` (P0, money)

**Yêu cầu:** Tổng bill và payment tuân policy làm tròn VND lên nghìn với `rawTotal`, `roundedTotal`, và `roundingDelta`.

**Nguồn:** `business-logic` (6.B); `technical-architecture` (6.2.7, 10.1); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec policy làm tròn VND; spec roll-up bill Order và snapshot bill; spec Payment service; spec Payment refund service; spec trang request-payment customer PWA.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Helper chuẩn hiện áp dụng `Math.ceil(rawTotal / 1000) * 1000`, reject raw total âm hoặc không phải integer, và lưu `rawTotal`, `roundedTotal`, `roundingDelta` trên snapshot bill do Order sở hữu. Payment validate consistency của snapshot, persist total từ snapshot Order, dùng `roundedTotal` cho so sánh VietQR/cash/webhook, và fallback `paidAmount ?? roundedTotal` cho số tiền full refund.

---

### `P0-PAY-QRTBL-REFERENCE` — `covered` (P0, money)

**Yêu cầu:** Reference VietQR bill nhà hàng dùng prefix `QRTBL` ổn định, fallback collision, và trích từ code hoặc nội dung SePay.

**Nguồn:** `business-logic` (6.A); `technical-architecture` (10.1); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec payment reference service; spec SaaS constants; spec trang request-payment customer PWA.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-PAY-CASH-VIETQR-SETTLEMENT` — `covered` (P0, money)

**Yêu cầu:** Cash cần `amountReceived >= roundedTotal`; tạo VietQR tái sử dụng payment pending và dùng tenant payment settings thay vì fallback platform.

**Nguồn:** `business-logic` (6.A); business behavior cuối `phase-3-payment`.

**Test:** Spec payment service; spec panel bill settlement management-app; spec BFF customer order controller.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-PAY-WEBHOOK-UNDERPAID` — `covered` (P0, money)

**Yêu cầu:** Chuyển khoản SePay underpaid giữ payment pending và ghi `SEPAY_WEBHOOK_UNDERPAID`; không được finalize bill.

**Nguồn:** `business-logic` (6.A); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec payment service (đường settlement).

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-PAY-WEBHOOK-DUP-AFTER-PAID` — `covered` (P0, money)

**Yêu cầu:** Identifier giao dịch SePay trùng và webhook sau thanh toán terminal không được double-settle hoặc gọi Order lại; phải audit.

**Nguồn:** `business-logic` (6.A); `technical-architecture` (12.2); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec payment service.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-PAY-COMPLETED-ORDER-BRIDGE` — `partial` (P0, money)

**Yêu cầu:** Hoàn tất payment ghi payment và outbox và đồng bộ Order qua `BILL_MARK_PAID`; bridge realtime BFF chỉ hint UI refetch.

**Nguồn:** `technical-architecture` (7.2, 9.2, 10.1); technical behavior cuối `phase-3-payment`.

**Test:** Spec payment service; spec Order payment events consumer; spec BFF realtime Kafka bridge; spec hook order realtime customer PWA; harness external-stack opt-in `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts`.

**Tầng đích:** integration. **Stack:** DB Payment, DB Order, DB Catalog, TCP Order, TCP Catalog, Redis cho close session của Order.

**Ghi chú:** Unit và bridge test đã có, và harness opt-in đã được thêm. Mặc định harness bị skip, chỉ chạy bằng `RUN_PHASE5_PAY_COMPLETED_ORDER_BRIDGE=1 pnpm nx test payment --testPathPatterns=payment-completed-order-bridge.integration.spec.ts --runInBand` sau khi start local external stack. Giữ status `partial` cho đến khi lần chạy opt-in chứng minh một trạng thái DB cuối thống nhất qua Payment, Order, và Catalog với replay idempotent.

---

### `P0-PAY-REFUND-FULL-ONLY` — `covered` (P0, money)

**Yêu cầu:** Refund chỉ manual full refund, một refund active hoặc confirmed tại một thời điểm, và không mở lại bill.

**Nguồn:** `business-logic` (6.B); quyết định chấp nhận `phase-3-payment`.

**Test:** Spec payment refund service; spec section refund orders management-app; E2E payment Phase 3.

**Tầng đích:** unit-contract. **Stack:** tùy chọn browser dev stack.

---

### `P1-PAY-DIRECT-HMAC-WEBHOOK` — `covered` (P1, security)

**Yêu cầu:** Route webhook SePay Phase 3 direct phải verify raw-body HMAC và timestamp và trả raw success response theo yêu cầu provider.

**Nguồn:** `business-logic` (6.A); technical behavior cuối `phase-3-payment`.

**Test:** Spec BFF payment controller.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-PAY-X-SECRET-VALUE` — `covered` (P0, security)

**Yêu cầu:** Webhook tenant và platform Phase 4B `x-secret-key` phải validate giá trị với secret tenant hoặc platform đã lưu trước exposure production hoặc demo công khai.

**Nguồn:** `business-logic` (6.A); handoff `phase-4b-saas-onboarding`; ghi chú webhook `docs/specs/business-logic-phase-4b-spec.md`.

**Test:** Spec BFF SePay webhook controller (SaaS module); spec settlement Payment service; spec subscription invoice service SaaS; spec redaction TCP logging interceptor.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** BFF reject thiếu `x-secret-key` và forward route context mà không trả raw secret; TCP logging redact các field giống secret trước khi serialize params. Payment tenant webhook verify bằng cách resolve `tenantSlug` server-side, decrypt webhook secret đã lưu trong tenant payment settings, so sánh với header nhận được, reject secret invalid/unconfigured/mismatched trước mọi mutation payment/outbox/Order, và giữ payload `QRSUB` tách khỏi tenant settlement. SaaS platform webhook so sánh `x-secret-key` với `SEPAY_PLATFORM_WEBHOOK_SECRET`, reject secret invalid/unconfigured trước mọi mutation invoice/subscription, và giữ payload `QRTBL` tách khỏi xử lý invoice platform. Test dùng unit mock, không gọi SePay live.

---

### `P1-PAY-BROWSER-CLOSE-SESSION` — `partial` (P1, demo)

**Yêu cầu:** Browser E2E nên chứng minh payment close-session: bill immutable, session đóng, bàn chuyển Cleaning sau cash hoặc VietQR.

**Nguồn:** `phase-5-7-finalization` Bước 5.4; bằng chứng chấp nhận `phase-3-payment`.

**Test:** Chỉ `tests/e2e/phase-3-payment.spec.ts`.

**Tầng đích:** browser-e2e. **Stack:** PWA, management-app, BFF, Payment, Order, Catalog, Keycloak, bill paid và pending seed.

**Ghi chú:** Coverage Playwright hiện là smoke màn hình, tab, và hiển thị refund; thêm hành trình close-session deterministic khi seed hoặc fixture ổn định.

---

## SaaS, onboarding, và vòng đời tenant

### `P0-SAAS-ONBOARDING-SAGA` — `partial` (P0, tenant-isolation)

**Yêu cầu:** Onboarding SUPER_ADMIN tạo tenant, owner, profile, subscription mặc định, payment settings, và `tenant.created`; lỗi rollback DB và dọn user Keycloak orphan.

**Nguồn:** `business-logic` (1.A); quyết định chấp nhận `phase-4b-saas-onboarding`.

**Test:** Spec unit và integration saga onboarding SaaS; spec Authorizer Keycloak admin service; spec tenant user service User-Access.

**Tầng đích:** integration. **Stack:** DB SaaS, Authorizer và Keycloak, User-Access, Payment TCP, Kafka hoặc outbox.

**Ghi chú:** Integration mock cover orchestration và compensation; cần ranh giới service thật hoặc integration seed khi có stack harness.

---

### `P0-SAAS-TENANT-LIFECYCLE` — `covered` (P0, tenant-isolation)

**Yêu cầu:** Trạng thái tenant là `ACTIVE`, `SUSPENDED`, hoặc `CLOSED`; suspended read-only có exception thanh toán; closed chặn truy cập vận hành.

**Nguồn:** `business-logic` (1.B); quyết định chấp nhận `phase-4b-saas-onboarding`.

**Test:** Spec vòng đời tenant và SaaS service; tenant status guard; spec BFF customer tenant lifecycle guard.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-SAAS-SUSPENDED-CUSTOMER-PWA` — `partial` (P0, demo)

**Yêu cầu:** Với tenant suspended, customer PWA vẫn đọc được, vô hiệu hóa mutation order và cart mới, giữ đường thanh toán bill pending, và hiển thị banner.

**Nguồn:** `business-logic` (1.B); business behavior cuối `phase-4b-saas-onboarding`.

**Test:** BFF customer tenant lifecycle guard; spec hook tenant status và banner customer PWA; spec hook order realtime customer PWA.

**Tầng đích:** browser-e2e. **Stack:** PWA, BFF, tenant suspended và session seed.

**Ghi chú:** Unit và component coverage đã có; thiếu fixture Playwright hoặc route seed tenant suspended dedicated theo handoff Phase 4B.

---

### `P0-SAAS-SUBSCRIPTION-INVOICE-QRSUB` — `covered` (P0, money)

**Yêu cầu:** Hóa đơn subscription tenant dùng `QRSUB`; underpaid không kích hoạt; thanh toán đủ đánh dấu paid và gán plan; webhook trùng không double-assign.

**Nguồn:** `business-logic` (1.A, 6.A); business behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec subscription invoice service SaaS; spec entity shape Phase 4B; spec SaaS constants.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-SAAS-ONE-ACTIVE-SUBSCRIPTION` — `covered` (P0, tenant-isolation)

**Yêu cầu:** Mỗi tenant một subscription active; gán plan mới supersede subscription active trước và refresh cache quota summary.

**Nguồn:** `business-logic` (1.A); business behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec subscription và tenant status cache service SaaS; spec tenant plan guard.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P1-SAAS-AUTO-SUSPEND` — `covered` (P1, tenant-isolation)

**Yêu cầu:** Auto-suspend chạy hàng ngày lúc `02:00 Asia/Ho_Chi_Minh` và suspend subscription hết hạn vượt cửa sổ grace 24 giờ.

**Nguồn:** `business-logic` (1.A); quyết định chấp nhận `phase-4b-saas-onboarding`.

**Test:** Spec SaaS tenant suspend cron service.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-SAAS-FEATURE-GATING-QUOTAS` — `covered` (P0, tenant-isolation)

**Yêu cầu:** `max_tables`, `max_staff`, và `max_orders_per_day` phải được enforce bởi guard hoặc logic edge cộng check backup owner tài nguyên.

**Nguồn:** `business-logic` (1.A); `technical-architecture` (15.1); quyết định chấp nhận `phase-4b-saas-onboarding`.

**Test:** Spec service bàn Catalog; spec service user và tenant-user User-Access; spec service Order và Order quota; spec BusinessException và interceptor cho propagate `details` lỗi quota; spec entity shape Phase 4B SaaS.

**Tầng đích:** unit-contract. **Stack:** mock SaaS TCP và quota counter dạng Redis-like.

**Ghi chú:** Enforcement ở owner service hiện cover `max_tables`, `max_staff`, và `max_orders_per_day`; quota source thiếu/inactive/không khả dụng fail closed; `-1` là unlimited; user disabled không tính vào staff quota; order quota dùng Redis reservation atomic, release khi bị từ chối hoặc tạo fail, và bỏ qua retry idempotent. BFF edge checks vẫn là coverage fast-feedback tùy chọn.

---

### `P1-SAAS-OAUTH-STATE-SECRETS` — `partial` (P1, security)

**Yêu cầu:** SePay OAuth dùng `oauth_state:{state}` ngắn hạn, callback consume state, và trình duyệt không bao giờ thấy client secret hoặc access/refresh token.

**Nguồn:** `business-logic` (1.A); `technical-architecture` (11.2); business behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec Payment SePay OAuth client và payment secrets service; spec BFF dashboard payment settings controller.

**Tầng đích:** unit-contract. **Stack:** Redis cho OAuth state; chỉ dùng mock SePay local nếu test provider exchange.

**Ghi chú:** Test cover authorize URL, mã hóa secret, và forward callback BFF; cần test cấp service cho TTL Redis state, consume, và từ chối replay. Test có dính provider phải theo `[specs/phase-5-sepay-local-mock-testing-policy.md](specs/phase-5-sepay-local-mock-testing-policy.md)`; SePay live chỉ manual opt-in.

---

### `P1-SAAS-PAYMENT-SETTINGS` — `covered` (P1, security)

**Yêu cầu:** Payment Service sở hữu tenant payment settings, tạo dòng rỗng idempotent, lưu ngân hàng chọn và webhook settings, và mã hóa token.

**Nguồn:** `business-logic` (1.A); technical behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec tenant payment settings và payment secrets service; spec BFF dashboard payment settings controller.

**Tầng đích:** unit-contract. **Stack:** không cho unit; mock SePay local cho integration quanh bank list hoặc webhook upsert.

**Ghi chú:** Default test không yêu cầu SePay thật, redirect URI Vercel, hoặc public tunnel. Dùng `[specs/phase-5-sepay-local-mock-testing-policy.md](specs/phase-5-sepay-local-mock-testing-policy.md)` cho coverage integration/E2E của payment settings.

---

### `P1-SAAS-ADMIN-DASHBOARD-ROUTES` — `missing` (P1, demo)

**Yêu cầu:** Public landing, `/admin/tenants`, `/admin/plans`, `/admin/billing`, `/dashboard/subscription`, `/dashboard/payment-settings`, và OAuth invalid-state không được trắng, 401, hoặc 500 với role seed.

**Nguồn:** UI surface `phase-4b-saas-onboarding`; `phase-5-7-finalization` Bước 5.4.

**Test:** Spec contract Phase 4B BFF; spec SaaS controller; spec management-app dashboard query auth readiness.

**Tầng đích:** browser-e2e. **Stack:** management-app, BFF, Keycloak, SUPER_ADMIN, OWNER, và MANAGER seed.

**Ghi chú:** Không có spec Playwright Phase 4B dedicated; thêm route smoke sau khi credential seed deterministic. OAuth invalid-state và callback smoke dùng policy SePay local/mock, không dùng login provider thật.

---

## RBAC, guard, và architecture invariants

### `P0-RBAC-GUARD-CHAIN` — `covered` (P0, rbac)

**Yêu cầu:** API được bảo vệ enforce `UserGuard` rồi `TenantGuard` rồi `PermissionGuard`; API customer dùng session và lifecycle guard, không dùng role seed.

**Nguồn:** `business-logic` (9.C); `technical-architecture` (8.2); `permission-matrix` (10).

**Test:** Spec BFF user, tenant, permission, session, và customer tenant lifecycle guard.

**Tầng đích:** unit-contract. **Stack:** không.

---

### `P0-RBAC-PERMISSION-MATRIX-COUNTS` — `partial` (P0, rbac)

**Yêu cầu:** RBAC seed chuẩn có sáu role và sáu mươi sáu permission với count role `SUPER_ADMIN=66`, `OWNER=38`, `MANAGER=35`, `WAITER=15`, `CHEF=6`, `BARISTA=6`; smoke login live nên verify permission đại diện.

**Nguồn:** `permission-matrix` (4, 6, 9.3).

**Test:** Spec User-Access role seeder; spec BFF permission guard; script repo `tools/verify-permission-matrix.sh`.

**Tầng đích:** integration. **Stack:** Keycloak, BFF, Authorizer, credential MongoDB seed.

**Ghi chú:** Static seed và guard coverage đã có; smoke live partial vì tài liệu ghi credential SUPER_ADMIN và MANAGER hoặc lỗi login 2026-05-13.

---

### `P0-RBAC-TENANT-ISOLATION-API` — `partial` (P0, tenant-isolation)

**Yêu cầu:** Actor không SUPER_ADMIN không được override tenant scope từ client input; truy cập cross-tenant SUPER_ADMIN phải explicit và kiểm soát.

**Nguồn:** `business-logic` (9.D); `technical-architecture` (5.2); `permission-matrix` (10).

**Test:** Spec BFF tenant guard; spec authenticated client management-app; integration tenant isolation frontend dưới `libs/frontend/utils`.

**Tầng đích:** integration. **Stack:** BFF, auth seed, service databases.

**Ghi chú:** Guard và client test đã có; integration stack cần readiness, chính sách seed, và endpoint đại diện rộng hơn.

---

### `P1-ARCH-KAFKA-5-TOPIC-REGISTRY` — `missing` (P1, architecture)

**Yêu cầu:** Kafka topic registry chính xác là các topic miền hiện tại: `order.confirmed`, `payment.completed`, `payment.refunded`, `kitchen.sla_warning`, `tenant.created`; không có topic Kafka chỉ UI.

**Nguồn:** `technical-architecture` (7.2, 7.4); neo architecture `phase-5-7-finalization`.

**Test:** Spec độ đầy đủ enum shared types cho event payload types; spec SaaS constants cho `tenant.created` và prefix constants.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Thêm static configuration hoặc constant test cho registry đúng năm topic và tên topic môi trường mặc định.

---

### `P1-ARCH-REDIS-ACCESS-POLICY` — `missing` (P1, architecture)

**Yêu cầu:** Truy cập Redis giới hạn BFF, Order, Kitchen, WebSocket adapter, SaaS, và Payment OAuth state; Catalog, Authorizer, và User-Access không được thêm dùng Redis trực tiếp.

**Nguồn:** `technical-architecture` (11.2); neo architecture `phase-5-7-finalization`.

**Test:** Spec Order cart service; spec Kitchen KDS keys; spec SaaS tenant status cache service (chỉ user được phép).

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Thêm static architecture test quét import hoặc provider project để phát hiện truy cập Redis không được phép.

---

### `P1-ARCH-BFF-DIRECT-NOT-KAFKA` — `partial` (P1, architecture)

**Yêu cầu:** Side effect UI dùng BFF Direct hoặc hint nội bộ Redis sau khi source service commit; Kafka không phải UI proxy.

**Nguồn:** `technical-architecture` (7.3, 7.4); quyết định chấp nhận `phase-2a-order-kafka` và `phase-2b-kitchen-websocket`.

**Test:** Spec BFF realtime events, subscriber KDS internal events, và realtime Kafka bridge; spec hook order realtime customer PWA.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Event và hook test đã có; thêm static contract test no-Kafka-for-UI gắn topic registry, đặc biệt cho menu hoặc order UI-only events.

---

### `P1-ARCH-TCP-PATTERN-COVERAGE` — `partial` (P1, architecture)

**Yêu cầu:** Hằng số route BFF và pattern message TCP service giữ alignment cho SaaS, payment, order, và kitchen surface quan trọng.

**Nguồn:** `technical-architecture` (6, 7.1); technical behavior cuối `phase-4b-saas-onboarding`.

**Test:** Spec contract SaaS controller; spec contract Phase 4B BFF; spec TCP configuration; spec BFF order và kitchen controller.

**Tầng đích:** unit-contract. **Stack:** không.

**Ghi chú:** Route SaaS và BFF đã cover explicit; registry pattern TCP toàn service rộng hơn vẫn không đều.

---

## Deferred và ngoài phạm vi

### `P1-OFFLINE-QUEUE-FULL` — `deferred-by-phase` (P1, demo)

**Yêu cầu:** Full IndexedDB offline action queue, background sync, conflict resolver, và auto-sync mất mạng lâu cho POS, KDS, và khách.

**Nguồn:** `business-logic` (7); `technical-architecture` (16); ngoài phạm vi `phase-5-7-finalization`.

**Test:** Chỉ spec pill trạng thái realtime customer PWA và management-app.

**Tầng đích:** deferred. **Stack:** frontend hoặc offline browser harness.

**Ghi chú:** Code hiện cover UI degraded và reconnecting, không phải full offline queue. Tài liệu Phase 5 loại trừ full offline queue; theo dõi hardening tương lai.

---

### `P1-PHASE4A-SAGA-HARDENING` — `deferred-by-phase` (P1, architecture)

**Yêu cầu:** CDC bền hoặc Debezium, hardening transactional outbox đầy đủ, saga observability sâu, và dashboard replay.

**Nguồn:** `technical-architecture` (12); prerequisite và ngoài phạm vi `phase-5-7-finalization`.

**Test:** không.

**Tầng đích:** deferred. **Stack:** Kafka, PostgreSQL, observability stack.

**Ghi chú:** Phase 4A deferred; không fail Phase 5 Bước 5.1 vì thiếu test. Theo dõi khi Phase 4A tiếp tục.

---

### `P1-PHASE4C-NOTIFICATIONS` — `deferred-by-phase` (P1, demo)

**Yêu cầu:** Email biên lai; email welcome, suspend, và expiry; email reset-password; log notification và runtime service.

**Nguồn:** handoff `phase-4b-saas-onboarding`; handoff `phase-3-payment`; `technical-architecture` (6.2.9).

**Test:** không.

**Tầng đích:** deferred. **Stack:** SMTP hoặc provider, hoặc Notification service.

**Ghi chú:** Phase 4C chưa bắt đầu; không thêm test hoặc behavior sản phẩm trong Phase 5; giữ backlog Phase 4C.

---

## Khoảng trống ưu tiên cho bước tiếp

Sắp xếp theo độ khẩn; mỗi dòng là **priority**, **rule id**, **status**, và **next action**.

1. **P0** — `P0-ORD-STATE-STOCK` — `partial` — Chạy integration external-stack Step 5.3 cho lock stock đồng thời và trạng thái cuối (`stock=1`, hai confirm, một thành công).
2. **P0** — `P0-PAY-COMPLETED-ORDER-BRIDGE` — `partial` — Chạy harness external-stack opt-in cho hoàn tất Payment đến Order `BILL_MARK_PAID` đến bàn Cleaning với replay idempotent.
3. **P0** — `P0-RBAC-PERMISSION-MATRIX-COUNTS` — `partial` — Refresh credential seed SUPER_ADMIN và MANAGER deterministic và chạy lại `tools/verify-permission-matrix.sh`.
4. **P0** — `P0-SAAS-SUSPENDED-CUSTOMER-PWA` — `partial` — Thêm fixture seed tenant suspended hoặc session và hành trình Playwright read-only cộng exception thanh toán.
5. **P1** — `P1-SAAS-ADMIN-DASHBOARD-ROUTES` — `missing` — Thêm route smoke Playwright Phase 4B sau khi role seed tin cậy.
6. **P1** — `P1-ARCH-KAFKA-5-TOPIC-REGISTRY` — `missing` — Thêm static test cho topic registry chuẩn và không có topic chỉ UI.
7. **P1** — `P1-ARCH-REDIS-ACCESS-POLICY` — `missing` — Thêm static test cho truy cập Redis được phép theo project.
8. **P1** — `P1-CAT-NO-MENU-KAFKA` — `missing` — Thêm static test đảm bảo không dùng contract `menu.updated`; không triển khai menu realtime trong Phase 5.

---

## Ứng viên lô P0 đầu tiên

1. **Integration:** `P0-ORD-STATE-STOCK`, `P0-ORD-CART-VERSION-LOCK`, `P0-PAY-COMPLETED-ORDER-BRIDGE`, `P0-SAAS-ONBOARDING-SAGA`.
2. **Browser E2E:** `P0-SAAS-SUSPENDED-CUSTOMER-PWA`, sau đó coverage close-session thanh toán từ `P1-PAY-BROWSER-CLOSE-SESSION` nếu nâng mức rủi ro demo.
3. **Fast feedback tùy chọn:** BFF quota edge checks cho `P0-SAAS-FEATURE-GATING-QUOTAS` nếu UI cần upgrade prompt trước khi forward.

---

## Kiểm tra chấp nhận cho Bước 5.1

- Mỗi neo Phase 5 bắt buộc có ít nhất một mục: Catalog và QR, Order và cart và session, Kitchen và realtime, Payment và refund, SaaS 4B, RBAC và auth, và architecture invariants.
- Mỗi mục P0 hoặc đặt tên vị trí test cụ thể trong văn bản (app hoặc lib cộng mục đích spec) hoặc nêu `notes` hoặc next action cụ thể khi thiếu test.
- Mục Phase 4A và Phase 4C được đánh dấu rõ `deferred-by-phase`.
- Tài liệu này không gồm bước triển khai test hay code.
