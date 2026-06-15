# QRTable Defense Slide Content Guide

> Tài liệu đi song song với
> `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`.
> File plan quyết định narrative và thứ tự slide. File này quyết định cách xây
> nội dung từng slide dựa trên codebase, kiến trúc thực tế, tài liệu kỹ thuật và
> report khóa luận.

## 1. Mục tiêu

Tài liệu này được dùng trước khi dựng lại PPTX chính thức cho defense deck
QRTable.

Mục tiêu:

- Tránh slide trông như bản tóm tắt chung chung hoặc slide sinh tự động.
- Mỗi slide phải có một luận điểm kỹ thuật rõ ràng.
- Mỗi claim quan trọng phải có neo vào code, test, docs hoặc report.
- Diagram, ảnh, screenshot, DB state, log và test output chỉ được đặt qua slot
  có ID rõ ràng để người dùng thay thủ công sau.
- Placeholder không được xem là evidence thật.
- Không dùng thứ tự Chương 1 đến Chương 7 của report làm thứ tự slide mặc định.
- Không đưa SaaS onboarding vào slide chính hoặc appendix.

## 2. Quan hệ với plan deck

File methodology plan trả lời:

- Deck có bao nhiêu slide chính.
- Narrative đi theo hướng nào.
- Cụm kỹ thuật nào bắt buộc xuất hiện.
- Demo và appendix nằm ở đâu.
- Visual direction tổng thể là gì.

File content guide này trả lời:

- Slide đó cần chứng minh điều gì.
- Claim nào được phép nói.
- Claim nào không được phép overclaim.
- Source nào phải đọc để xác minh.
- Asset slot nào cần chuẩn bị.
- Speaker nên dẫn logic theo hướng nào.

Khi hai file có vẻ mâu thuẫn, ưu tiên:

1. Quyết định narrative trong methodology plan.
2. Code/test hiện tại để xác định implementation thật.
3. Content guide này để viết nội dung và kiểm claim.

## 3. Thứ tự nguồn khi viết slide

| Ưu tiên | Nguồn                            | Vai trò                                                   |
| ------- | -------------------------------- | --------------------------------------------------------- |
| 1       | Code và test hiện tại            | Xác định hệ thống thực sự làm gì                          |
| 2       | `docs/README.md`                 | Xác định thứ tự source of truth                           |
| 3       | `docs/DOC-CODE-ANCHORS.md`       | Tìm canonical code/doc path                               |
| 4       | `docs/technical-architecture.md` | Giải thích boundary, communication, data ownership        |
| 5       | `docs/business-logic.md`         | Giải thích nghiệp vụ hiện tại                             |
| 6       | Phase/test evidence docs         | Đánh giá mức bằng chứng                                   |
| 7       | LaTeX report                     | Lấy phạm vi học thuật, wording chính thức, citation đã có |

Nếu report khác code/test:

- Không âm thầm chọn một bên.
- Ghi là `document drift` hoặc `contradiction`.
- Dùng code/test để mô tả implementation hiện tại.
- Không sửa report trong session dựng deck nếu người dùng chưa yêu cầu.

## 4. Contract nội dung cho mỗi slide

Mỗi slide chính nên có các trường sau trước khi đưa vào PPTX:

| Trường                 | Nội dung cần có                                                 |
| ---------------------- | --------------------------------------------------------------- |
| `audienceQuestion`     | Hội đồng đang cần được thuyết phục điều gì?                     |
| `mainClaim`            | Một câu khẳng định chính của slide                              |
| `systemInvariant`      | Bất biến hệ thống (system invariant) cần bảo vệ                 |
| `mechanism`            | Cơ chế hoặc mẫu thiết kế QRTable dùng                           |
| `implementationAnchor` | Code/test/doc/report chứng minh claim                           |
| `visualSlot`           | Diagram, screenshot, DB state, log hoặc test output cần đặt vào |
| `speakerIntent`        | Người trình bày nói gì trong 20-60 giây                         |
| `doNotClaim`           | Những câu không được nói vì chưa đủ evidence                    |

Slide không có `mainClaim` sẽ dễ thành slide liệt kê. Slide không có
`implementationAnchor` sẽ dễ thành slide chung chung.

## 5. Nguyên tắc viết để không giống slide AI

### 5.1. Title phải là luận điểm

Không dùng:

- `Kiến trúc hệ thống`
- `Microservices`
- `Kết quả kiểm thử`

Dùng:

- `QRTable tách ownership để tránh cross-service database coupling`
- `Order chỉ được xác nhận sau khi Catalog xử lý tồn kho thành công`
- `WebSocket chỉ là tín hiệu realtime, không phải source of truth`

### 5.2. Bullet phải mô tả cơ chế, không liệt kê công nghệ

Không viết:

- `Hệ thống sử dụng Kafka, Redis, PostgreSQL, WebSocket`

Viết:

- `Order commit tạo outbox event order.confirmed`.
- `Kitchen consume event và cập nhật Redis KDS projection`.
- `BFF phát kds.queue_changed qua WebSocket`.
- `Client refetch snapshot, không xem WebSocket là dữ liệu cuối cùng`.

### 5.3. Mỗi visual chỉ chứng minh một ý

- Sequence diagram: chứng minh thứ tự gọi và nhánh lỗi.
- DB screenshot: chứng minh state thật đã chuyển.
- Log/trace: chứng minh đường đi liên dịch vụ.
- Test output: chứng minh invariant có thể kiểm tra lặp lại.
- UI screenshot: chứng minh hành vi người dùng nhìn thấy.

Không dùng ảnh chỉ để trang trí nếu ảnh không giúp chứng minh claim.

## 6. Canonical anchors cần dùng

### 6.1. Kiến trúc và service ownership

| Chủ đề                | Anchor                                             |
| --------------------- | -------------------------------------------------- |
| Documentation map     | `docs/README.md`                                   |
| Code/doc map          | `docs/DOC-CODE-ANCHORS.md`                         |
| Architecture overview | `docs/technical-architecture.md`                   |
| Business rules        | `docs/business-logic.md`                           |
| Catalog ownership     | `apps/catalog/src/database/catalog.data-source.ts` |
| Order ownership       | `apps/order/src/database/order.data-source.ts`     |
| Payment ownership     | `apps/payment/src/database/payment.data-source.ts` |
| SaaS ownership        | `apps/saas/src/database/saas.data-source.ts`       |

### 6.2. Authorization và tenant isolation

| Chủ đề                  | Anchor                                                                                          |
| ----------------------- | ----------------------------------------------------------------------------------------------- |
| Tenant guard            | `libs/guards/src/lib/tenant.guard.ts`                                                           |
| RBAC matrix             | `docs/architecture/permission-matrix.md`                                                        |
| Report security section | `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex` |

Claim an toàn:

- Staff/admin dùng Keycloak JWT/OIDC và Authorizer boundary.
- Customer dùng QR/session context.
- RBAC, tenant isolation và entitlement là các lớp khác nhau.
- TenantGuard kiểm tenant claim/session và reject mismatch.

Không claim:

- RBAC tự nó giải quyết tenant isolation.
- Tenant isolation là physical database per tenant.

### 6.3. Order Confirm Saga

| Chủ đề                 | Anchor                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------ |
| Saga implementation    | `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`            |
| Catalog stock gateway  | `apps/order/src/app/modules/order/services/catalog-stock-gateway.service.ts`         |
| Saga tests             | `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`          |
| Saga evidence strategy | `docs/testing/phase-5/saga-validation-strategy.md`                                   |
| Report implementation  | `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex` |

Claim an toàn:

- Order service điều phối xác nhận đơn.
- Catalog service là owner của stock.
- Order dùng local transaction và lock order/bill liên quan.
- Stock deduction gọi Catalog qua boundary có idempotency key.
- Nếu Catalog đã deduct nhưng Order commit/outbox fail, Order gọi compensation.
- Outbox event `order.confirmed` là cầu nối sang KDS.

Không claim:

- Saga đã chứng minh mọi failure path bằng live fault injection.
- QRTable có exactly-once messaging.
- Payment complete là Saga chính trong deck này.

### 6.4. KDS projection và realtime

| Chủ đề               | Anchor                                                                        |
| -------------------- | ----------------------------------------------------------------------------- |
| Kitchen consumer     | `apps/kitchen/src/app/modules/kitchen/services/order-confirmed.consumer.ts`   |
| KDS Redis repository | `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`   |
| KDS key design       | `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`                      |
| Realtime bridge      | `apps/bff/src/app/modules/realtime/services/realtime-kafka-bridge.service.ts` |
| Realtime events      | `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`       |

Claim an toàn:

- Kitchen consume `order.confirmed`.
- KDS projection nằm trong Redis theo tenant/station.
- BFF phát WebSocket để client biết cần cập nhật.
- Client refetch snapshot; WebSocket không phải source of truth.

### 6.5. Payment finalization

| Chủ đề                     | Anchor                                                                                          |
| -------------------------- | ----------------------------------------------------------------------------------------------- |
| SePay guide                | `docs/guides/sepay-configuration-guide-phase3.md`                                               |
| Payment completed consumer | `apps/order/src/app/modules/order/services/payment-events-consumer.service.ts`                  |
| Payment to Order gateway   | `apps/payment/src/app/modules/payment/services/payment-order.gateway.ts`                        |
| Integration test           | `apps/payment/src/app/modules/payment/tests/payment-completed-order-bridge.integration.spec.ts` |

Claim an toàn:

- `QRTBL` route dùng cho bill payment.
- `QRSUB` route thuộc subscription/platform payment, không đưa vào main deck.
- Payment emit `payment.completed`, Order consume event để mark bill paid.
- Payment bridge có integration evidence đại diện.

Không claim:

- Payment và Order nằm trong cùng một distributed ACID transaction.
- Mọi payment edge case production đã được cover.

### 6.6. Evaluation và evidence

| Chủ đề              | Anchor                                                                    |
| ------------------- | ------------------------------------------------------------------------- |
| Traceability matrix | `docs/testing/phase-5/traceability-matrix.md`                             |
| Saga validation     | `docs/testing/phase-5/saga-validation-strategy.md`                        |
| Phase 5-7 status    | `docs/phases/phase-5-7-finalization.md`                                   |
| Report evaluation   | `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex` |

Claim an toàn:

- Có covered/partial/gap/deferred, không nói toàn bộ đã green nếu matrix chưa nói vậy.
- Unit/contract và một số integration gate có evidence đã ghi nhận.
- Browser E2E không được tóm tắt là green nếu artifact mới nhất đang red/blocked.

## 7. Guide nội dung 30 slide chính

### Slide 1 — Cover

Claim: QRTable là hệ thống QR ordering/POS multi-tenant được dùng làm case study
kỹ thuật phần mềm.

Nội dung:

- Tên đề tài.
- Sinh viên, giảng viên hướng dẫn.
- Trường/khoa.

Visual slot:

- `GLOBAL_SCHOOL_LOGO`: logo UIT chính thức.
- `S01_COVER_CONTEXT_IMAGE`: ảnh domain QR/POS nếu có.

### Slide 2 — Roadmap

Claim: Bài trình bày đi từ nghiệp vụ đến quyết định kiến trúc và bằng chứng.

Nội dung:

- Business problem.
- Architecture drivers.
- Design mechanisms.
- Implementation evidence.
- Demo/fallback.

Visual slot:

- `S02_ARGUMENT_ROADMAP`.

### Slide 3 — F&B operating context

Claim: QRTable không phải CRUD một người dùng; một order lifecycle đi qua nhiều
actor.

Nội dung:

- Customer.
- Staff/waiter.
- Kitchen/bar.
- Manager/owner.
- Payment provider.

Visual slot:

- `S03_ACTOR_CONTEXT_DIAGRAM`.

### Slide 4 — Golden business flow

Claim: Luồng trung tâm là `QR -> Cart -> Order -> KDS -> Payment`.

Nội dung:

- Scan QR và tạo session.
- Chọn món và cart.
- Tạo order/bill.
- Bếp nhận order.
- Thanh toán và finalize bill.

Visual slot:

- `S04_GOLDEN_FLOW_DIAGRAM`.

Không đưa SaaS onboarding vào flow này.

### Slide 5 — Operational risks

Claim: Luồng F&B tạo ra rủi ro kỹ thuật về stale state, duplicate action, tenant
scope, realtime và payment mismatch.

Visual slot:

- `S05_RISK_MAP`.

### Slide 6 — System problem statement

Claim: QRTable phải phối hợp ordering, kitchen, payment, realtime và authorization
khi mỗi service sở hữu state riêng.

Visual slot:

- `S06_PROBLEM_STATEMENT_CANVAS`.

### Slide 7 — Scope and guardrails

Claim: Khóa luận tập trung vào core QR ordering/POS flow, cơ chế kiến trúc và
evidence đại diện.

Nội dung:

- In scope: QR, cart, order, KDS, payment, auth, tenant isolation, evidence.
- Out of final claim: full production hardening, load benchmark, every payment
  edge case.

Visual slot:

- `S07_SCOPE_BOUNDARY_TABLE`.

### Slide 8 — Actors and use cases

Claim: Mỗi actor cần identity và authorization model khác nhau.

Visual slot:

- `S08_USE_CASE_MAP`.

### Slide 9 — Thesis contribution

Claim: Đóng góp là một hệ thống POS microservices có implementation và evidence
cho core flow.

Visual slot:

- `S09_CONTRIBUTION_STACK`.

### Slide 10 — Architecture drivers

Claim: Các driver chính là tenant isolation, service ownership, realtime,
payment integration và consistency under failure.

Visual slot:

- `S10_ARCHITECTURE_DRIVER_MATRIX`.

### Slide 11 — Why microservices here

Claim: Microservices phù hợp vì QRTable có boundary rõ, nhưng kéo theo chi phí
distributed system.

Nội dung:

- Catalog owns menu/table/stock.
- Order owns session/order/bill.
- Kitchen owns KDS projection.
- Payment owns payment/audit/settings.
- Trade-off: network failure, eventual consistency, idempotency, observability.

Visual slot:

- `S11_SERVICE_BOUNDARY_TRADEOFF`.

### Slide 12 — Microservices challenges

Claim: Kiến trúc tạo ra các challenge cụ thể mà phần sau sẽ giải quyết.

Nội dung:

- Communication.
- Authentication context.
- Authorization layers.
- Tenant isolation.
- Consistency/idempotency.
- Distributed transaction.
- Realtime projection.

Visual slot:

- `S12_CHALLENGE_MAP`.

### Slide 13 — Overall architecture

Claim: QRTable tách client edge, domain services, data stores và event
infrastructure.

Visual slot:

- `S13_OVERALL_ARCHITECTURE_DIAGRAM`.

### Slide 14 — Data ownership

Claim: Mỗi service sở hữu data model riêng; cross-service behavior đi qua TCP
hoặc Kafka.

Visual slot:

- `S14_DATA_OWNERSHIP_TABLE`.

### Slide 15 — Decision analysis framework

Claim: Mỗi cơ chế được bảo vệ bằng chuỗi
`challenge -> invariant -> design decision -> implementation -> evidence`.

Visual slot:

- `S15_DECISION_FRAMEWORK`.

### Slide 16 — Evidence layers

Claim: Demo UI không đủ; evidence cần nhiều lớp.

Nội dung:

- UI demo.
- DB/Redis state.
- Logs/traces.
- Automated tests.
- Traceability.

Visual slot:

- `S16_EVIDENCE_LAYER_MODEL`.

### Slide 17 — Sync vs async communication

Claim: QRTable chọn sync/async dựa trên việc caller cần quyết định tức thì hay
chỉ cần side effect.

Visual slot:

- `S17_SYNC_ASYNC_DECISION_DIAGRAM`.

### Slide 18 — QRTable communication model

Claim: QRTable dùng HTTP/WebSocket ở edge, TCP/gRPC cho request-response nội bộ,
Kafka cho event side effect.

Visual slot:

- `S18_QRTABLE_COMMUNICATION_PATHS`.

### Slide 19 — Authentication and request context

Claim: QRTable thiết lập trusted request context trước khi áp dụng authorization
và tenant rules.

Visual slot:

- `S19_AUTH_CONTEXT_FLOW`.

### Slide 20 — Layered authorization

Claim: QRTable tách identity, RBAC, tenant scope, plan entitlement và platform
admin boundary.

Visual slot:

- `S20_GUARD_CHAIN_DIAGRAM`.

### Slide 21 — Tenant isolation

Claim: Request phải mang tenant context khớp identity/session trước khi truy cập
dữ liệu tenant-scoped.

Visual slot:

- `S21_TENANT_ISOLATION_FLOW`.

### Slide 22 — Consistency and idempotency principle

Claim: QRTable kết hợp consistency cục bộ trong từng service với eventual
consistency giữa service, được bảo vệ bằng idempotency/deduplication.

Visual slot:

- `S22_CONSISTENCY_MODEL`.

Không claim exactly-once messaging.

### Slide 23 — QRTable consistency mechanisms

Claim: QRTable dùng local transaction, outbox, idempotency key, dedupe key và
authoritative snapshot theo từng flow.

Visual slot:

- `S23_CONSISTENCY_MECHANISM_MAP`.

### Slide 24 — Saga principle

Claim: Khi một business action đi qua nhiều service-owned database, QRTable dùng
Saga-style local transaction và compensation.

Visual slot:

- `S24_SAGA_PRINCIPLE_DIAGRAM`.

### Slide 25 — Order Confirm Saga

Claim: Order chỉ được confirm hợp lệ khi Order lock/validate state và Catalog
deduct stock qua boundary có idempotency.

Visual slot:

- `S25_ORDER_CONFIRM_SEQUENCE`.

### Slide 26 — Saga failure, compensation and evidence

Claim: Order Confirm Saga có evidence cho orchestration, replay, Catalog error
handling, outbox creation và compensation ở mức đại diện; full live deterministic
fault injection vẫn là future hardening.

Visual slot:

- `S26_SAGA_EVIDENCE_PANEL`.

### Slide 27 — KDS projection and realtime

Claim: KDS dùng Redis projection cập nhật từ `order.confirmed`; WebSocket chỉ là
hint để client cập nhật/refetch.

Visual slot:

- `S27_KDS_REALTIME_FLOW`.

### Slide 28 — Integration proof through golden flow

Claim: Golden flow có giá trị vì mỗi bước UI có thể nối với state transition
hoặc event phía sau.

Visual slot:

- `S28_GOLDEN_FLOW_EVIDENCE_MAP`.

### Slide 29 — Traceability and limitations

Claim: QRTable có evidence đại diện cho core architecture, đồng thời còn partial
hoặc deferred ở các phần production hardening/E2E/performance.

Visual slot:

- `S29_TRACEABILITY_SUMMARY`.

### Slide 30 — Conclusion and next work

Claim: QRTable chứng minh cách decomposed một QR ordering/POS flow thành các
service-owned boundary và kiểm chứng qua cơ chế kiến trúc.

Visual slot:

- `S30_CONCLUSION_SUMMARY`.

## 8. Appendix guide

Appendix dùng để trả lời phản biện, không tính vào 20-25 phút trình bày chính.

Nên có:

| Appendix topic              | Purpose                            | Asset slot                         |
| --------------------------- | ---------------------------------- | ---------------------------------- |
| Service boundary detail     | Defend ownership                   | `APP_SERVICE_BOUNDARY_TABLE`       |
| DataSource/entity ownership | Show DB ownership                  | `APP_DATASOURCE_OWNERSHIP`         |
| Permission matrix           | Answer RBAC questions              | `APP_PERMISSION_MATRIX`            |
| TenantGuard detail          | Answer tenant isolation questions  | `APP_TENANT_GUARD_CODE_EXCERPT`    |
| Order Confirm Saga detail   | Answer compensation questions      | `APP_ORDER_SAGA_DETAILED_SEQUENCE` |
| Kafka topics                | Answer event contract questions    | `APP_KAFKA_TOPIC_TABLE`            |
| Redis KDS keys              | Answer projection/dedup questions  | `APP_KDS_REDIS_KEY_TABLE`          |
| Payment bridge              | Answer Payment -> Order questions  | `APP_PAYMENT_BRIDGE_SEQUENCE`      |
| Traceability details        | Answer evidence coverage questions | `APP_TRACEABILITY_DETAILS`         |
| Test/log samples            | Answer reproducibility questions   | `APP_TEST_LOG_EVIDENCE`            |

Không đưa vào appendix:

- SaaS onboarding.
- Pricing/onboarding marketing material.
- Full report chapter summaries.
- Evidence placeholder chưa thay bằng asset thật.

## 9. Asset slot và registry

Người dùng sẽ tự tạo hoặc thay diagram, ảnh, screenshot và evidence file thủ
công. Nhiệm vụ của source deck là map đúng file vào đúng vị trí.

Mỗi asset registry entry phải có:

| Field             | Requirement                                                                      |
| ----------------- | -------------------------------------------------------------------------------- |
| `id`              | Stable ID dùng trong deck source                                                 |
| `type`            | `logo`, `diagram`, `screenshot`, `database-state`, `log`, `test-output`, `photo` |
| `status`          | `placeholder`, `ready`, hoặc `verified`                                          |
| `targetPath`      | File path dự kiến để người dùng thay thủ công                                    |
| `purpose`         | Claim mà asset chứng minh                                                        |
| `requiredContent` | Node, actor, state, row, log line hoặc annotation bắt buộc                       |
| `sourceAnchor`    | Code/test/doc/runtime dùng để tạo asset                                          |
| `aspectRatio`     | Tỉ lệ khung cố định                                                              |
| `caption`         | Caption một câu                                                                  |

Recommended folder:

```text
docs/presentations/qrtable-defense-deck/assets/
  logo/
  diagrams/
  screenshots/
  evidence/
  placeholders/
```

Example:

```text
id: S25_ORDER_CONFIRM_SEQUENCE
type: diagram
status: placeholder
targetPath: docs/presentations/qrtable-defense-deck/assets/diagrams/s25-order-confirm-sequence.png
purpose: Show that Order coordinates confirmation while Catalog owns stock.
requiredContent: Staff, Order, Catalog, Order DB, Outbox, success path, compensation path.
sourceAnchor: apps/order/src/app/modules/order/services/order-confirm-saga.service.ts
aspectRatio: 16:9
caption: Order confirmation is safe only after stock deduction succeeds.
```

Placeholder không phải evidence. Khi asset thật có sẵn, cập nhật `path/status`
trong registry rồi generate lại PPTX/PDF.

## 10. Claim guardrails

| Topic            | Safe wording                                                                                        | Unsafe wording                                                                   |
| ---------------- | --------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Microservices    | `phù hợp với service ownership của QRTable, kèm đánh đổi distributed system`                        | `microservices giúp hệ thống luôn tối ưu và dễ scale`                            |
| Tenant isolation | `tenant context được guard kiểm tra trước tenant-scoped access`                                     | `mỗi tenant có database riêng`                                                   |
| Kafka            | `Kafka dùng cho side effect bất đồng bộ và cần idempotency/dedup`                                   | `Kafka đảm bảo exactly-once toàn hệ thống`                                       |
| WebSocket        | `WebSocket là hint realtime để client cập nhật/refetch`                                             | `WebSocket là source of truth`                                                   |
| Saga             | `Order Confirm Saga có evidence đại diện cho orchestration, replay, error handling và compensation` | `Saga cover mọi lỗi production`                                                  |
| Payment          | `Payment completed bridge có integration evidence đại diện`                                         | `Payment và Order nằm trong một ACID transaction`                                |
| Testing          | `traceability có covered/partial/gap/deferred`                                                      | `toàn bộ P0/P1 đã hoàn tất nếu matrix còn partial/gap`                           |
| Deployment       | `foundation/deployment artifacts đã có theo phase docs`                                             | `production-ready hoàn chỉnh nếu chưa có external smoke/HTTPS/rollback evidence` |

## 11. Checklist trước khi dựng PPTX

- Mỗi slide có title dạng claim.
- Mỗi slide có `mainClaim`.
- Claim kỹ thuật có source anchor.
- Visual slot có ID và target path.
- Placeholder không được ghi như evidence thật.
- Saga chỉ đào sâu Order Confirm Saga.
- WebSocket luôn được mô tả là realtime hint/refetch.
- Không claim exactly-once messaging.
- Không claim production-ready nếu evidence deployment chưa đủ.
- Không đưa SaaS onboarding vào slide chính hoặc appendix.
- Slide evidence dùng số liệu đã reconcile từ traceability và phase docs.

## 12. Workflow dựng lại deck

1. Dùng file này làm content contract.
2. Tạo asset registry từ toàn bộ `visualSlot`.
3. Tạo placeholder có cấu trúc cho asset chưa có.
4. Người dùng thay thủ công file ảnh/diagram/evidence tại `targetPath`.
5. Source deck đọc registry và map file vào đúng slide.
6. Generate PPTX.
7. Export PDF từ PPTX.
8. QA text overflow, font, contrast, asset status, claim guardrail và PDF export.
