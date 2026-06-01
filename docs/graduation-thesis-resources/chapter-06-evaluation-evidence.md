# Phase 6A - Evaluation tables và claim policy cho Chương 6

> Tài liệu này là kết quả Phase 6A của workflow khóa luận QRTable.
> Mục tiêu: chuẩn bị ma trận/bảng đánh giá cho Chương 6, chưa viết nội dung chương dài.
> Cập nhật: 2026-05-31. Addendum note: 2026-06-01.

## 1. Phạm vi và nguyên tắc sử dụng

Chương 6 cần đánh giá hệ thống dựa trên bằng chứng đã có, không tạo benchmark hoặc claim vận hành nếu chưa chạy kiểm chứng thật. Tài liệu này dùng làm nguồn nội bộ cho Phase 6B khi viết `thesis-report/chapters/06-danh-gia.tex`.

Thứ tự ưu tiên bằng chứng:

1. Source code và tests hiện tại trong `apps/`, `libs/`, `tests/`.
2. `docs/testing/phase-5/traceability-matrix.md` và `docs/testing/phase-5/phase-5-handoff.md`.
3. Canonical docs: `docs/README.md`, `docs/DOC-CODE-ANCHORS.md`, `docs/technical-architecture.md`, `docs/business-logic.md`, `docs/architecture/permission-matrix.md`.
4. Audit khóa luận đã hoàn tất: `chapter-03-requirement-evidence.md`, `chapter-04-architecture-evidence.md`, `thesis-phase5a-evidence-audit.md`.
5. Thesis outline/evidence map để kiểm soát phạm vi và overclaim.

Không dùng tài liệu này để viết rằng hệ thống đã production-ready, đã stress test, đã chứng minh high availability, hoặc đã kiểm chứng live SePay nếu chưa có evidence tương ứng.

Addendum 2026-06-01: technical Phase 4D Dashboard & Reporting đã được bổ sung sau khi Phase 6A/6B draft xong. Chương 6 hiện chưa đánh giá đầy đủ dashboard/reporting và plan entitlement. Lượt polish sau cần thêm bằng chứng cho BFF reporting guard specs, `PlanFeatureGuard`, frontend entitlement UI và screenshot/browser evidence nếu có; không được tự nâng claim thành benchmark hoặc full E2E nếu chưa chạy.

## 2. Kết quả zoom-out ở mức actor/domain/use case

Ở mức đánh giá, QRTable nên được xem theo bảy cụm evidence thay vì theo từng service riêng lẻ:

| Cụm đánh giá             | Actor/use case chính                             | Bằng chứng mạnh nhất                                                                    | Cách dùng trong Chương 6                                                                                                                                      |
| ------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog và QR            | Owner/Manager quản lý menu/bàn; Customer quét QR | Traceability `P0-CAT-*`, Catalog specs, QR token tests                                  | Đánh giá public menu, QR token, quota table; tenant A/B live gate vẫn partial.                                                                                |
| Order/session/cart/bill  | Customer, Staff/Waiter                           | Traceability `P0-ORD-*`, Order integration specs                                        | Đây là cụm functional validation mạnh nhất cho QR ordering và consistency.                                                                                    |
| Kitchen/KDS realtime     | Chef/Barista, KDS UI                             | Traceability `P0-KDS-*`, `P1-KDS-*`, Redis integration                                  | Đánh giá KDS queue, station access, dedupe và refetch-hint model.                                                                                             |
| Payment settlement       | Customer/Staff, SePay webhook                    | Traceability `P0-PAY-*`, Payment specs, opt-in bridge integration                       | Đánh giá cash/VietQR/SePay unit-contract và integration; live provider vẫn manual/opt-in.                                                                     |
| SaaS lifecycle           | Super Admin, Owner, Manager                      | Traceability `P0-SAAS-*`, SaaS DB/live Payment slice                                    | Đánh giá tenant lifecycle, subscription, quota; onboarding full live Authorizer/User-Access còn partial.                                                      |
| Dashboard/reporting      | Owner/Manager, Super Admin                       | Technical Phase 4D docs, BFF reporting specs, `PlanFeatureGuard`, reports frontend code | Backfill vào Chương 6: đánh giá report permissions, plan feature entitlement và UI lock states; browser proof/screenshot còn cần capture nếu muốn claim demo. |
| RBAC và tenant isolation | Staff roles, Super Admin, Customer session       | Permission matrix, guard specs, traceability `P0-RBAC-*`                                | Đánh giá guard chain và role seed; representative live tenant API isolation vẫn partial.                                                                      |
| Architecture invariants  | Toàn hệ thống                                    | Architecture contract specs, Chương 4 audit                                             | Đánh giá Kafka registry, Redis access policy, selective TCP/Kafka/WebSocket; một số contract rộng còn partial.                                                |

## 3. Requirement traceability summary

Nguồn chính: `docs/testing/phase-5/traceability-matrix.md` và `docs/testing/phase-5/phase-5-handoff.md`.

### 3.1 Tổng quan trạng thái

| Scope               | Tổng dòng | Covered |      Partial | Implementation gap | Deferred by phase | Ghi chú dùng trong Chương 6                                                                  |
| ------------------- | --------: | ------: | -----------: | -----------------: | ----------------: | -------------------------------------------------------------------------------------------- |
| P0/P1 toàn hệ thống |        52 |      36 |           11 |                  1 |                 4 | Dùng để nói hệ thống có traceability test đáng kể nhưng còn gap/deferred rõ ràng.            |
| P0                  |        29 |       - | 5 partial P0 |                  0 |                 1 | Không được viết "toàn bộ P0 đã covered" vì còn năm dòng partial và một dòng refund deferred. |
| P1                  |        23 |       - | 6 partial P1 |                  1 |                 3 | P1 chứa nhiều hardening/demo/future scope.                                                   |

Traceability handoff ghi nhận lệnh default `pnpm exec nx run-many -t test --parallel=3` đã pass cho 23 projects vào 2026-05-22/2026-05-23. Đến 2026-05-31, SaaS onboarding DB integration và live Payment TCP integration đã được re-verify cho chiến lược bằng chứng Saga. Một số gate phụ thuộc full stack, seed, provider hoặc browser vẫn được đánh dấu manual/opt-in.

### 3.2 Summary theo domain

| Domain                   | Covered | Partial |         Gap/deferred | Claim được phép viết                                                                                                                                                                               |
| ------------------------ | ------: | ------: | -------------------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Catalog và QR            |       5 |       2 | 1 implementation gap | Public menu, QR token và quota table có evidence; tenant A/B live gate và delete constraint chưa phủ toàn diện; QR scan rate limit là implementation gap.                                          |
| Order/session/cart/bill  |       7 |       2 |                    0 | Core ordering, cart version, submit idempotency, bill request và payment finalization có coverage mạnh; Order Confirm Saga live fault injection và table transfer cần integration sâu hơn.         |
| Kitchen/KDS realtime     |       5 |       0 |                    0 | KDS dedupe, station RBAC, FIFO/priority/SLA, refetch hint và Redis-only recovery có thể viết là đã kiểm chứng ở mức test hiện có.                                                                  |
| Payment settlement       |       8 |       1 |           1 deferred | Cash/VietQR/Webhook/idempotency/lịch sử thanh toán read-only có unit-contract và một số opt-in integration; refund và browser close-session không nằm trong claim chính; live SePay không tự động. |
| SaaS lifecycle           |       7 |       3 |                    0 | Tenant lifecycle, subscription invoice, quota, payment settings và admin routes có evidence; onboarding full live stack, suspended pending-bill browser path và OAuth state tests còn partial.     |
| RBAC và tenant isolation |       2 |       1 |                    0 | Guard chain và permission matrix counts mạnh; representative live tenant-isolation API gate còn partial.                                                                                           |
| Architecture invariants  |       2 |       2 |                    0 | Kafka 5-topic registry và Redis access policy mạnh; BFF Direct/no-Kafka-for-UI và TCP pattern coverage còn partial.                                                                                |
| Deferred/out of scope    |       0 |       0 |           4 deferred | Full offline queue, phần hardening ngoài lát cắt Saga đại diện, Notification/email ngoài phạm vi hiện tại và các scope bị hoãn không viết như kết quả đã hoàn thành.                               |

### 3.3 P0 partial cần giữ nguyên trong Chương 6

| Rule ID                          | Lý do còn partial                                                                                                                                                  | Cách viết an toàn                                                                                                                                                        |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `P0-CAT-TENANT-ISOLATION`        | Có unit/service coverage và opt-in integration skeleton, nhưng live BFF/Keycloak/Catalog tenant A/B gate chưa được chạy ổn định như acceptance gate.               | Viết tenant isolation là requirement trọng tâm đã có guard/source/test một phần; chưa claim toàn bộ API surface đã được chứng minh bằng live tenant A/B test.            |
| `P0-ORD-STATE-STOCK`             | Order Confirm Saga có unit/contract và integration stock boundary, nhưng chưa có live fault-injection harness cho lỗi Order commit/outbox sau Catalog deduct thật. | Viết Order Confirm Saga đã kiểm chứng điều phối/replay/compensation ở service layer và ranh giới stock opt-in; live compensation fault injection là hardening tiếp theo. |
| `P0-SAAS-ONBOARDING-SAGA`        | DB success/compensation và live Payment TCP slice đã pass; Authorizer + Keycloak và User-Access vẫn là contract doubles trong full flow.                           | Viết onboarding saga đã kiểm chứng phần DB/Payment/compensation, chưa gọi là end-to-end live multi-service proof đầy đủ.                                                 |
| `P0-SAAS-SUSPENDED-CUSTOMER-PWA` | Có unit/component và browser smoke cho suspended tenant; pending-bill payment exception browser path chưa đủ.                                                      | Viết behavior suspended tenant đã có coverage chính, pending-bill browser payment path còn cần demo/E2E bổ sung.                                                         |
| `P0-RBAC-TENANT-ISOLATION-API`   | Guard/client tests có, nhưng representative seeded BFF/Keycloak/service database gate chưa đủ rộng.                                                                | Viết RBAC guard chain và seed counts đã kiểm chứng; cross-tenant API surface vẫn là limitation.                                                                          |

### 3.4 Saga evidence strategy

Nguồn chính: `docs/testing/phase-5/saga-validation-strategy.md`.

Chương 6 nên chứng minh Saga bằng chuỗi bằng chứng nhiều lớp, không chỉ dựa vào tên service:

- Order Confirm Saga: unit/contract chứng minh điều phối, replay, lỗi Catalog, outbox và compensation; integration opt-in chứng minh ranh giới Order-Catalog stock; live fault-injection harness cho lỗi commit/outbox sau deduct thật vẫn là hướng hardening.
- SaaS Onboarding Mini-Saga: PostgreSQL integration chứng minh success/rollback; live Payment TCP chứng minh tạo `tenant_payment_settings`; Authorizer/Keycloak và User-Access vẫn là contract double trong proof tự động hiện tại.
- Artifact demo nên gồm screenshot UI happy path, terminal output, snapshot DB/outbox và log; artifact này minh họa, không thay thế test.

## 4. Architecture/NFR evidence status

| NFR/architecture claim          | Evidence hiện có                                                                                                                    | Trạng thái đánh giá                   | Cách viết trong Chương 6                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Tenant isolation                | `tenant_id`, TenantGuard, Redis/event tenant-aware patterns, traceability `P0-CAT-TENANT-ISOLATION`, `P0-RBAC-TENANT-ISOLATION-API` | Một phần                              | Có cơ sở thiết kế và test, nhưng chưa phủ toàn bộ live API surface bằng tenant A/B gate.                                      |
| Authentication/RBAC             | Keycloak/JWT cho staff/admin, session guard cho customer, 6 roles/67 permissions verified                                           | Mạnh                                  | Có thể viết là guard chain và permission seed đã được kiểm chứng bằng unit/contract/live smoke script.                        |
| Dashboard/reporting entitlement | `report.read_own`, `report.read_any`, `PlanFeatureGuard`, reports frontend entitlement UI                                           | Mạnh ở code/spec; cần backfill report | Viết là permission/feature-gated reporting đã có bằng chứng kỹ thuật; chỉ gọi demo/browser-verified khi đã capture/chạy thật. |
| QR/webhook/payment security     | QR token tests, HMAC/x-secret webhook tests, secret redaction, Payment secrets specs                                                | Mạnh ở unit/contract                  | Không viết đã kiểm chứng public exposure/live SePay production nếu chưa chạy provider thật.                                   |
| Consistency/idempotency         | Cart version, submit idempotency, stock deduct/release, payment finalization, webhook duplicate handling, outbox baseline           | Mạnh cho core flows                   | Viết mạnh cho core flows; full CDC/Debezium/exactly-once không thuộc claim.                                                   |
| Realtime feedback               | WebSocket hint/refetch specs, KDS/customer realtime hooks, Step 2.7 E2E                                                             | Mạnh                                  | Viết WebSocket giúp giảm độ trễ nhận biết UI, nhưng không là source of truth.                                                 |
| Maintainability/modifiability   | Nx monorepo, service/data ownership, shared libs, architecture contract specs                                                       | Mạnh ở mức kiến trúc/code structure   | Viết như qualitative evaluation, không gán số liệu productivity.                                                              |
| Scalability                     | Service boundaries, Kafka consumer group, Redis cache/queue, Socket.IO room model                                                   | Hỗ trợ bởi thiết kế                   | Chỉ viết hỗ trợ mở rộng ở mức kiến trúc; không claim đã chứng minh bằng load/stress test.                                     |
| Performance efficiency          | Không có benchmark throughput/latency/stress test được traceability ghi nhận                                                        | Chưa có đo lường                      | Không tạo số; chỉ nêu future work cho load test và đo latency/throughput.                                                     |
| Observability/deployment        | Docker/Grafana/Loki/Prometheus/Tempo có trong docs/compose, thiếu dashboard/trace proof hoàn chỉnh                                  | Giới hạn                              | Viết là design/demo-limited hoặc hướng phát triển, không production-grade.                                                    |
| Offline resilience              | Degraded/reconnect/refetch UI có spec; full offline action queue deferred                                                           | Giới hạn/hướng phát triển             | Không viết full offline queue đã implement.                                                                                   |
| Notification/email              | Ngoài phạm vi triển khai hiện tại                                                                                                   | Hướng phát triển                      | Không đưa notification/email receipt như kết quả đánh giá.                                                                    |

## 5. Evaluation claim policy table

| Mức claim                              | Điều kiện evidence                                                                      | Cách diễn đạt được phép                                                          | Ví dụ QRTable                                                                                  |
| -------------------------------------- | --------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| A - Đã kiểm chứng tự động              | Có unit/contract/integration/E2E pass trong traceability, command hoặc test location rõ | "đã được kiểm chứng bằng unit/contract/integration test"                         | VND rounding, order submit idempotency, KDS dedupe Redis integration, Kafka 5-topic registry.  |
| B - Đã kiểm chứng một phần/opt-in      | Có opt-in integration hoặc browser smoke, nhưng cần stack/seed/provider riêng           | "đã được kiểm chứng trong phạm vi opt-in/local stack; chưa phải default CI gate" | SaaS live Payment onboarding slice, KDS Redis dedupe, Payment completed -> Order bridge.       |
| C - Hỗ trợ bởi thiết kế/code structure | Có docs/source/architecture contracts nhưng thiếu live/full-stack proof                 | "được hỗ trợ bởi thiết kế và cấu trúc triển khai"                                | Scalability theo service boundary/Kafka/Redis, maintainability nhờ Nx/shared libs.             |
| D - Demo-limited                       | Có screenshot/smoke/manual demo hoặc browser route smoke, chưa đủ regression gate       | "được minh họa bằng demo/smoke test"                                             | Admin dashboard routes, suspended tenant browser smoke.                                        |
| E - Giới hạn/hướng phát triển          | Traceability `partial`, `implementation-gap`, `deferred-by-phase`, hoặc thiếu evidence  | "là giới hạn hiện tại/hướng phát triển tiếp theo"                                | QR rate limit table-scoped, full offline queue, notification emails, production observability. |

## 6. Limitation vs future work table

| Limitation hiện tại                                                         | Evidence/gap                                                                         | Tác động đến đánh giá                                                         | Future work phù hợp                                                                                       |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Chưa có benchmark throughput/latency/stress test                            | Traceability không ghi nhận benchmark được chấp nhận                                 | Không được claim performance/scalability đã chứng minh dưới tải lớn           | Thiết kế kịch bản load test cho QR join, submit order, KDS queue và payment webhook; ghi số liệu thật.    |
| Live tenant A/B API isolation chưa phủ rộng                                 | `P0-CAT-TENANT-ISOLATION`, `P0-RBAC-TENANT-ISOLATION-API` còn partial                | Tenant isolation chỉ nên đánh giá là mạnh ở design/unit, partial ở live-stack | Chuẩn hóa seeded stack BFF/Keycloak/service DB và chạy representative cross-tenant API suite.             |
| SaaS onboarding chưa có full live Authorizer/Keycloak/User-Access harness   | `P0-SAAS-ONBOARDING-SAGA` partial                                                    | Không gọi onboarding là fully E2E validated                                   | Bổ sung full multi-service onboarding test với Keycloak, User-Access, Payment TCP và outbox.              |
| Pending-bill payment path khi tenant suspended chưa có browser proof đầy đủ | `P0-SAAS-SUSPENDED-CUSTOMER-PWA` partial                                             | Suspended tenant behavior đánh giá được một phần                              | Tạo deterministic fixture và E2E Flow B/B+D cho pending bill payment exception.                           |
| Dashboard/reporting chưa được backfill vào traceability/report chính        | Technical Phase 4D docs/source/spec đã có nhưng Phase 6A/6B draft trước lần sync này | Chưa nên claim trong Chương 6 nếu chưa thêm bảng/evidence tương ứng           | Bổ sung report guard tests, frontend entitlement tests và screenshot/demo capture cho Owner/Super Admin.  |
| Live SePay provider validation không chạy mặc định                          | Handoff ghi live SePay manual, cần `RUN_LIVE_SEPAY=1` và credentials/public callback | Không claim production live provider validation                               | Dùng local mock SePay cho regression; chạy live provider checklist riêng trước demo/nộp nếu cần.          |
| Full offline action queue chưa implement                                    | `P1-OFFLINE-QUEUE-FULL` deferred                                                     | Chỉ đánh giá reconnect/refetch, không offline-first write queue               | Thiết kế IndexedDB action queue, conflict resolver và background sync nếu scope mở rộng.                  |
| Observability/deployment production-grade thiếu artifact runtime            | Evidence map đánh dấu trung bình-thấp; traceability chưa có dashboard/trace proof    | Không claim HA/production-ready/chaos/trace coverage đầy đủ                   | Chuẩn hóa Docker deployment package, dashboard screenshot, trace/log walkthrough và health-check runbook. |
| Notification/email nằm ngoài phạm vi triển khai hiện tại                    | `P2-OUT-OF-SCOPE-NOTIFICATIONS` deferred                                             | Không dùng email/welcome/receipt làm kết quả                                  | Có thể tích hợp Notification service hoặc SMTP/provider nếu scope mở rộng.                                |

## 7. Danh sách claim được phép và không được phép viết

### 7.1 Claim được phép viết

| Nhóm claim              | Câu viết an toàn                                                                                                                                                          |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional coverage     | Các flow cốt lõi như QR session, shared cart, order submit, stock consistency, KDS queue, payment settlement và subscription/quota đã có mapping sang test/code evidence. |
| Traceability            | Phase 5 traceability ghi nhận 52 dòng P0/P1, trong đó 36 covered, 11 partial, 1 implementation gap và 4 deferred-by-phase.                                                |
| Order consistency       | Cart version, idempotency key, stock deduct qua Catalog TCP, bill finalization và webhook duplicate handling đã được kiểm chứng ở mức unit/contract/integration tùy flow. |
| KDS realtime            | KDS dùng Redis runtime state, Kafka `order.confirmed` và WebSocket hint/refetch; duplicate event handling có integration proof với Redis.                                 |
| RBAC                    | Guard chain, six-role permission seed và permission counts có test/smoke evidence; Customer là session actor, không dùng Keycloak.                                        |
| Architecture validation | Kafka registry 5 topic và Redis access policy có architecture contract tests; WebSocket không phải source of truth.                                                       |
| Scalability             | Kiến trúc service boundary, Kafka, Redis và Socket.IO tạo cơ sở thiết kế cho mở rộng từng phần, nhưng chưa có load test định lượng.                                       |

### 7.2 Claim không được phép viết

| Claim cần tránh                                                                           | Lý do                                                                                                    |
| ----------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| "Hệ thống đã production-ready"                                                            | Không có evidence đầy đủ về HA, security hardening, deployment runbook và production observability.      |
| "Đã chứng minh khả năng chịu tải lớn/scalability bằng benchmark"                          | Chưa có benchmark số.                                                                                    |
| "Tất cả P0 đã covered"                                                                    | Còn năm P0 partial và một dòng refund deferred.                                                          |
| "Tenant isolation đã được chứng minh trên toàn bộ API surface"                            | Live-stack tenant A/B API gate còn partial.                                                              |
| "Onboarding SaaS đã full E2E live với Keycloak/User-Access/Payment/Kafka"                 | Authorizer/Keycloak và User-Access full live harness còn thiếu.                                          |
| "Live SePay production đã được validate tự động"                                          | Live provider checks là manual/opt-in.                                                                   |
| "WebSocket là source of truth realtime"                                                   | WebSocket chỉ là hint/refetch; DB/Redis/service owner là authoritative state.                            |
| "Kafka xử lý mọi giao tiếp hoặc mọi consistency"                                          | QRTable dùng selective TCP/gRPC/Kafka/BFF Direct; consistency chính của stock nằm ở Catalog transaction. |
| "Full offline queue, Notification Service/email, CDC/Debezium/saga hardening đã hoàn tất" | Các mục này nằm ngoài phạm vi hiện tại, là implementation-gap/deferred hoặc future scope.                |

## 8. Bảng đề xuất đưa vào Chương 6

| Artifact dự kiến                           | Nội dung             | Nguồn                            | Ghi chú cho Phase 6B                                                      |
| ------------------------------------------ | -------------------- | -------------------------------- | ------------------------------------------------------------------------- |
| Bảng 6.1. Requirement traceability summary | Rút gọn từ §3.1-§3.2 | Traceability matrix + handoff    | Nên dùng bảng tổng hợp, không liệt kê toàn bộ 52 dòng trong chương chính. |
| Bảng 6.2. Evaluation claim policy          | Mức A-E từ §5        | Evidence map + traceability      | Đặt sớm ở Chương 6 để kiểm soát ngôn ngữ đánh giá.                        |
| Bảng 6.3. NFR/architecture evidence status | Rút gọn từ §4        | Chapter 3/4 audit + traceability | Dùng cho mục Architecture/NFR validation.                                 |
| Bảng 6.4. Limitations and future work      | Rút gọn từ §6        | Handoff + evidence map           | Có thể đặt cuối Chương 6 hoặc chuyển một phần sang Chương 7.              |

Không cần tạo thêm diagram cho Phase 6A. Nếu Phase 6B cần artifact đánh giá bổ sung, ưu tiên bảng ngắn trong chương chính và đưa log/test output dài xuống phụ lục.

## 9. Reviewer-style questions cho Chương 6

| Câu hỏi phản biện                                                            | Câu trả lời khuyến nghị                                                                                                                                                              |
| ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Nếu chưa có benchmark thì đánh giá scalability bằng gì?                      | Đánh giá scalability ở mức kiến trúc: service boundary, Kafka, Redis, WebSocket rooms và khả năng tách concern. Không claim chứng minh tải lớn; đề xuất load test là future work.    |
| Vì sao có thể nói tenant isolation quan trọng nếu live API gate còn partial? | Vì tenant isolation là requirement và design invariant đã có guard/source/unit evidence. Chương 6 phải ghi rõ live-stack cross-tenant API proof còn là limitation.                   |
| Hệ thống có đủ evidence cho payment không?                                   | Có evidence unit/contract/integration cho cash, VietQR reference, SePay webhook idempotency, underpaid và payment-to-order bridge. Live SePay provider validation vẫn manual/opt-in. |
| WebSocket có đảm bảo dữ liệu realtime chính xác không?                       | WebSocket chỉ giúp UI biết cần refetch; nguồn đúng là service owner/DB/Redis. Đây là điểm mạnh về consistency vì không đặt state authoritative trong socket event.                   |
| Có thể gọi đây là Event-Driven Microservices không?                          | Có thể, nhưng phải ghi là selective event-driven microservices: Kafka dùng cho domain events bất đồng bộ, TCP/gRPC dùng cho command/query cần phản hồi tức thời.                     |
| Những gì nên chuyển sang Chương 7?                                           | Các limitation mang tính hướng phát triển dài hạn: benchmark, observability/deployment hardening, offline queue, notification/email, full saga hardening.                            |

## 10. Kết luận Phase 6A

Phase 6A đủ điều kiện để chuyển sang Phase 6B. Bộ bảng đánh giá nên tập trung vào traceability, functional validation, architecture/NFR validation và limitation/future work. Chương 6 phải giữ policy: claim mạnh chỉ dùng cho flow đã có test/evidence rõ; claim scalability/observability/deployment chỉ viết ở mức thiết kế hoặc giới hạn nếu chưa có bằng chứng runtime.
