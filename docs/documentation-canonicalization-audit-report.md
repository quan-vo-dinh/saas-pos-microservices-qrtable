# Báo cáo audit về chuẩn hóa tài liệu QRTable

> **Trạng thái:** Tài liệu audit tạm thời
>
> **Ngày audit:** 2026-07-11
>
> **Ngôn ngữ:** Tiếng Việt; giữ nguyên các technical terms cần thiết
>
> **Phạm vi:** Tài liệu kỹ thuật, phase records, tài nguyên khóa luận, mã nguồn LaTeX và Mermaid
>
> **Loại trừ:** Không audit nội dung trong **docs/guides/**
>
> **Chính sách thay đổi:** Báo cáo này không xóa, di chuyển hoặc viết lại tài liệu hiện có. Báo cáo chỉ ghi nhận phát hiện và đề xuất chiến lược cô đọng tài liệu.

## 1. Kết luận điều hành

Hiện trạng triển khai của QRTable đã đi trước đáng kể so với tài liệu. Repository đã có phần triển khai cho phạm vi khóa luận được chấp nhận, hệ thống test và observability tương đối đầy đủ, cùng các deployment artifacts. Tuy nhiên, tài liệu hiện vẫn trộn lẫn bốn trạng thái khác nhau:

1. implementation plan ban đầu;
2. các phase plan trung gian và ghi chú làm việc với AI;
3. hành vi thực tế của source code hiện tại;
4. môi trường demo khóa luận mới chỉ được triển khai một phần.

Vì vậy, hướng xử lý quan trọng nhất không phải là xóa hàng loạt. Cần thực hiện một quá trình migration có kiểm soát: trước hết hấp thụ các thông tin duy nhất còn giá trị vào một bộ canonical docs nhỏ, kiểm chứng chúng với code, sau đó mới xóa các plan và bản sao đã bị thay thế.

Trạng thái dự án nên được mô tả thống nhất như sau:

> **Phạm vi chức năng QRTable được chấp nhận cho khóa luận đã được triển khai và kiểm chứng ở mức local/integration. Repository đã có deployment artifacts và frontend đã được triển khai một phần, nhưng full public production deployment vẫn chưa hoàn tất.**

Phạm vi chức năng và tài liệu của khóa luận được xem là gần hoàn tất; công việc còn mở duy nhất ở cấp dự án là Phase 7 public deployment.

Cách diễn đạt này loại bỏ sự nhập nhằng hiện tại giữa ba trạng thái **IMPLEMENTED**, **VERIFIED** và **DEPLOYED**.

### Tóm tắt theo mức ưu tiên

| Mức | Phát hiện                                                                                                                                             | Hướng xử lý bắt buộc                                                                                     |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- |
| P0  | **README.md** ở root vẫn mô tả Nx starter “Einvoice” và tham chiếu tới invoice app đã bị xóa                                                          | Viết lại thành entry point chính thức của repository QRTable                                             |
| P0  | **AGENTS.md**, **technical-architecture.md** và **business-logic.md** khẳng định có automatic TypeORM tenant filtering nhưng cơ chế này không tồn tại | Mô tả đúng explicit tenant filtering trong repository/query và giới hạn đúng trách nhiệm của middleware  |
| P0  | DBML Chapter 4 của khóa luận thiếu các trường liên quan đến stock reservation, dù Chapter 5 đã giải thích và code đã triển khai                       | Bổ sung **stock_reservations** và **orders.stock_reservation_version**, sau đó render lại schema figures |
| P0  | Project status và phase documents vẫn ghi Phase 4C và Phase 6 chưa hoàn thành                                                                         | Thay các tỷ lệ/phần trăm của plan bằng trạng thái hiện tại dựa trên evidence                             |
| P1  | Tài liệu kỹ thuật mô tả customer session bằng cookie và offline write queue bằng IndexedDB                                                            | Đổi sang cơ chế header/localStorage đang được triển khai; đánh dấu offline write là future work          |
| P1  | Tài liệu deployment đánh đồng observability đã được đóng gói/kiểm chứng local với production deployment                                               | Áp dụng thống nhất mô hình ba trạng thái                                                                 |
| P1  | Các thư mục phase/spec/testing/superpowers giữ completed plans như thể vẫn là yêu cầu hiện hành                                                       | Hấp thụ accepted decisions và evidence, sau đó xóa temporary artifacts đã hoàn tất                       |
| P1  | Thesis resources không có canonical index và đang trộn official sources, report source, evidence, plan, prompt và defense material                    | Tạo thesis resource map, tách report, sources, evidence và defense deliverables                          |
| P2  | Deprecated Mermaid, converted documents trùng lặp, placeholder screenshots, cache files và absolute file links vẫn còn                                | Xóa sau khi vượt qua reference gate và provenance gate                                                   |

## 2. Phương pháp audit và thứ tự nguồn thẩm quyền

### 2.1 Kiểm chứng mã nguồn bằng CodeGraph

CodeGraph đã được đồng bộ trước khi thực hiện bất kỳ chỉnh sửa nào, đúng theo yêu cầu. Tại thời điểm audit, graph đã đồng bộ ghi nhận:

- 1.255 source files được index;
- 16.097 symbols/nodes;
- 31.404 relationships/edges;
- TypeScript/TSX là ngôn ngữ triển khai chủ đạo;
- code graph ở trạng thái up to date.

CodeGraph được dùng để lập bản đồ actor, service boundary, quan hệ gọi của **OrderService**, customer order facade và file được đính kèm **apps/order/src/app/app.module.ts**. Vì CodeGraph không index Markdown và LaTeX như program symbols, các claim trong tài liệu sau đó được kiểm tra trực tiếp với source files, runtime configuration, tests, schemas và report sources.

### 2.2 Thứ tự ưu tiên của nguồn đối chiếu

Khi các tài liệu mâu thuẫn, audit sử dụng thứ tự ưu tiên sau:

1. source code, database entities, runtime configuration và executable tests hiện tại;
2. accepted contracts/constants và deployment manifests hiện hành;
3. canonical technical docs sau khi đã reconcile;
4. concise final phase records;
5. thesis narrative và evidence maps;
6. plan cũ, prompt, audit note, converted source document và presentation working note.

Thứ tự này phù hợp với chính sách trong **docs/README.md**, ngoại trừ việc repository hiện chưa hoàn thành cleanup như chính sách đó yêu cầu.

### 2.3 Phạm vi loại trừ

- Không audit hoặc viết lại nội dung trong **docs/guides/**.
- Các path trong guides chỉ được xem xét khi **AGENTS.md** hoặc anchor file tham chiếu tới chúng.
- Không cần dùng browser hoặc Context7 vì các điểm tranh chấp đều đặc thù cho repository và source code là nguồn thẩm quyền mạnh hơn.
- Không chỉnh sửa tài liệu cũ hoặc thay đổi code của người dùng trong lượt audit này.

## 3. Hiện trạng hệ thống theo actor, domain và use case

### 3.1 Các actor

| Actor            | Use case chính hiện tại                                                                          | Entry point chính                    |
| ---------------- | ------------------------------------------------------------------------------------------------ | ------------------------------------ |
| Customer         | Mở QR session, xem menu, quản lý cart, submit order, gửi service request, xem bill/payment state | Customer PWA qua BFF                 |
| Waiter           | Quản lý floor/table operations, hỗ trợ order và service request                                  | Management App qua BFF               |
| Chef / Barista   | Nhận và cập nhật KDS ticket theo thời gian thực                                                  | Management App KDS qua BFF/WebSocket |
| Manager          | Vận hành catalog, staff, reporting và restaurant workflow theo permission                        | Management App qua BFF               |
| Owner            | Quản lý business configuration, staff, subscription và reporting trong tenant                    | Management App qua BFF               |
| Super Admin      | Quản trị SaaS ở phạm vi cross-tenant                                                             | Management App qua BFF               |
| Payment provider | Gửi callback thanh toán SePay/VietQR                                                             | Các BFF/payment webhook routes       |

### 3.2 Các bounded context đã triển khai

| Boundary    | Trách nhiệm đã triển khai                                                                    | Persistence/transport quan sát được               |
| ----------- | -------------------------------------------------------------------------------------------- | ------------------------------------------------- |
| BFF         | HTTP/WebSocket edge, guard chain, request routing, không sở hữu domain database              | HTTP, WebSocket, TCP/gRPC clients                 |
| Authorizer  | Xác thực staff JWT/OIDC và tích hợp Keycloak                                                 | gRPC/Keycloak                                     |
| Catalog     | Area, table, menu/category, QR token, stock và stock reservation                             | PostgreSQL **qrtable_catalog**, TCP               |
| Order       | Customer session/cart, order state machine, confirmation saga, bill, service request, outbox | PostgreSQL **qrtable_order**, Redis, TCP/Kafka    |
| Kitchen     | Redis-backed KDS projection và ticket lifecycle                                              | Redis Sorted Sets, Kafka, TCP/WebSocket hints     |
| Payment     | Cash và SePay/VietQR flow, settings, audit/outbox                                            | PostgreSQL **qrtable_payment**, webhook/TCP/Kafka |
| SaaS        | Tenant, subscription, plan, entitlement, quota/onboarding coordination                       | PostgreSQL **qrtable_saas**, TCP/Kafka            |
| User Access | Profile, role, permission và staff management                                                | MongoDB **qrtable_auth**, TCP                     |

Repository hiện có bảy backend domain services cộng với BFF, hai frontend applications và một Keycloak theme application.

### 3.3 Hai luồng Order được đính kèm

Hai file người dùng cung cấp xác nhận hai layer riêng biệt mà tài liệu không được đánh đồng:

- **apps/customer-pwa/src/features/order/services/order.service.ts** là frontend HTTP facade. File này chuyển các thao tác cart, order, service request và bill tới **customerApi**, sau đó được React Query hooks/pages sử dụng.
- **apps/order/src/app/app.module.ts** là composition root của Order service. File này kết nối configuration, logging/metrics, PostgreSQL entities, Redis, Kafka health và **OrderModule**.
- **apps/order/src/app/order/order.module.ts** thực hiện domain composition cho session/cart, submit, confirmation saga, stock gateway, transition rule, KDS mapping, quota, bill, service request, transfer, payment consumption, outbox và repositories.

Điều này củng cố mô tả canonical: service trong PWA là API adapter, còn backend Order service sở hữu business invariants.

### 3.4 Các sự thật từ implementation phải trở thành canonical

- TypeScript aliases hiện tại chủ yếu là **@common/\*** và **@einvoice/\*** theo **tsconfig.base.json**; nhóm alias **@qrtable/\*** được mô tả rộng rãi trong **AGENTS.md** không khớp repository.
- Customer session context được lưu trong browser localStorage/in-memory state và gửi qua header **x-session-id** cùng **x-tenant-id**; hiện không phải HttpOnly cookie session.
- Tenant isolation được thực thi bằng tenant-aware guards/context kết hợp với explicit tenant predicates trong repositories/queries. Không tìm thấy TypeORM subscriber hoặc global automatic query filter.
- Năm Kafka topics dùng chung là **order.confirmed**, **order.status_changed**, **payment.completed**, **kitchen.sla_warning** và **tenant.created**.
- Kitchen chỉ dùng Redis và không sở hữu relational database.
- Bill thuộc sở hữu của Order, không phải Payment.
- Catalog là stock owner và hiện đã có stock reservation behavior.
- Staff Management đã được triển khai xuyên suốt User Access, BFF và Management App.
- Observability code, dashboards, Compose configuration và validation assets đã tồn tại. Điều này chứng minh trạng thái packaging/local verification, không chứng minh full public deployment.
- Dockerfiles, layered Compose, Caddy, bootstrap/preflight/build scripts và environment templates đã tồn tại. Full public backend deployment, HTTPS smoke evidence và production rollback/backup evidence vẫn còn thiếu.
- Không tìm thấy production offline order write queue, Background Sync implementation, bảng **audit_trail** dùng chung, table-status Redis cache hoặc QR PDF export implementation.

## 4. Kiểm kê tài liệu và vòng đời thông tin

Snapshot này chủ động loại trừ nội dung trong **docs/guides/**.

| Khu vực                    |        Số artifact đã khảo sát | Chẩn đoán                                                                                         |
| -------------------------- | -----------------------------: | ------------------------------------------------------------------------------------------------- |
| Markdown ở repository root |                              3 | Root README lỗi thời; database split plan đã hoàn thành; AGENTS bị stale một phần                 |
| Root của **docs/**         |       9 files và **.DS_Store** | Canonical docs bị trộn với duplicate/stale analysis files                                         |
| **docs/phases/**           |                   16 artifacts | Final records, implementation plans, Vietnamese duplicates và presentation HTML bị trộn           |
| **docs/architecture/**     |                              7 | Permission matrix còn giá trị; system/ERD assets đã cũ và có nội dung sai                         |
| **docs/specs/**            |                              6 | Specs đã được chấp nhận và triển khai vẫn cạnh tranh thẩm quyền với final behavior docs           |
| **docs/testing/**          |                             15 | Execution plans, handoff notes, mini-specs, strategy và traceability bị trộn                      |
| **docs/superpowers/**      |                             14 | Phần lớn là completed temporary plans/specs; Phase 7 vẫn còn active có điều kiện                  |
| Root thesis resources      | 56 files, trong đó 52 Markdown | Không có index; canonical report/source/evidence bị trộn với prompt, plan, report và defense note |
| LaTeX                      |               18 file **.tex** | Build thành công nhưng schema và source structure bị drift                                        |
| Mermaid                    |               36 file **.mmd** | 12 file legacy/deprecated, 23 active report sources, 1 defense-specific source                    |

Nguyên nhân gốc là repository chưa có document lifecycle rõ ràng. “Plan”, “accepted decision”, “final behavior”, “evidence” và “official source” đang nằm chung trong các thư mục mà không có status metadata hoặc deletion gate.

## 5. Phát hiện mâu thuẫn và nội dung lỗi thời

### 5.1 Tài liệu kỹ thuật

| ID       | Mức | Claim/trạng thái trong tài liệu                                                                                         | Evidence từ code/repository                                                                | Hướng xử lý                                                                                                          |
| -------- | --- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| TECH-001 | P0  | Root **README.md** là Nx starter “Einvoice” và tham chiếu invoice app                                                   | Workspace hiện tại là QRTable và app được tham chiếu không tồn tại                         | Viết lại README với product map, apps/libs, setup, validation, docs entry points và deployment status                |
| TECH-002 | P0  | **AGENTS.md** liệt kê nhóm thư viện/alias **@qrtable/\*** như hiện trạng                                                | **tsconfig.base.json** cung cấp **@common/\***, **@einvoice/\*** và layout thư viện khác   | Đồng bộ shared-library table với alias thực; ghi nhận legacy naming **@einvoice** là technical debt thay vì che giấu |
| TECH-003 | P0  | **AGENTS.md** nói TypeORM subscriber inject tenant ID và global filter tự thêm tenant predicate                         | Không có subscriber/global filter; tenant-scoped repository filter rõ ràng                 | Thay bằng invariant thực tế về guard/context và explicit query; thêm tests/anchors tới representative repositories   |
| TECH-004 | P0  | **implementation_plan.md** ghi Phase 4C 0%, Phase 6 TODO, Phase 5–7 25%, tổng 81,7%                                     | Staff Management, observability, tests và deployment packaging đã tồn tại                  | Ngừng dùng implementation plan theo phần trăm; thay bằng **project-status.md** dựa trên evidence                     |
| TECH-005 | P1  | **technical-architecture.md** mô tả customer session dựa trên cookie                                                    | **customer-pwa/src/lib/api-client.ts** lưu context và gửi bằng header                      | Mô tả cơ chế header/localStorage hiện tại và security boundary của nó                                                |
| TECH-006 | P1  | **technical-architecture.md** và **business-logic.md** mô tả IndexedDB/background-sync order writes là hành vi hiện tại | Không tồn tại production implementation tương ứng                                          | Chuyển thiết kế này sang future work; mô tả đúng online failure/retry behavior hiện tại                              |
| TECH-007 | P1  | Nhiều phần architecture/business docs mô tả automatic tenant filtering                                                  | Implementation dùng explicit repository predicates                                         | Reconcile toàn bộ tenancy sections; không giữ song song hai cơ chế mà thiếu status label                             |
| TECH-008 | P1  | Architecture docs đề cập QR PDF export và table-status Redis cache                                                      | Không tìm thấy implementation tương ứng                                                    | Xóa khỏi implemented behavior hoặc đánh dấu deferred rõ ràng                                                         |
| TECH-009 | P1  | **business-logic.md** đề cập bảng **audit_trail** dùng chung                                                            | Chỉ tìm thấy bounded audit records, ví dụ payment audit data                               | Gọi đúng tên các bounded audit entities; không ngụ ý có platform-wide table                                          |
| TECH-010 | P1  | **technical-architecture.md** nói production monitoring đã deploy, đồng thời lại ghi public deployment còn pending      | Observability stack/configuration đã có nhưng full public production rollout chưa hoàn tất | Dùng độc lập ba trạng thái **IMPLEMENTED**, **VERIFIED**, **DEPLOYED**                                               |
| TECH-011 | P1  | BFF được mô tả ở cả port 3000 và 3300                                                                                   | Default application configuration khác repository Compose/env convention                   | Mô tả port là configurable và chỉ rõ 3300 là giá trị chuẩn trong composed repository                                 |
| TECH-012 | P1  | **docs/architecture/erd_explanation.md** đặt Bill trong Payment                                                         | Order module đăng ký và sở hữu **Bill**                                                    | Thay global cross-service ERD bằng per-service ownership diagrams hoặc logical relationship map                      |
| TECH-013 | P1  | **docs/architecture/architec.mmd** chứa Product concepts cũ và ghi observability mới ở trạng thái planned               | Domain hiện tại dùng MenuItem/Catalog và observability assets đã có                        | Hấp thụ topology còn hữu ích rồi xóa; tạo diagram mới từ canonical boundaries                                        |
| TECH-014 | P1  | **phase-4c-staff-management.md** vẫn là TODO                                                                            | Staff service/controller/UI/test paths đã tồn tại                                          | Viết lại thành concise final phase record có evidence anchors                                                        |
| TECH-015 | P1  | Former combined Phase 5–7 record nói testing đang làm và Phase 4C chưa bắt đầu                                          | Source và test inventory mâu thuẫn trực tiếp                                               | Thay bằng ba final records riêng cho Testing, Observability và Deployment                                            |
| TECH-016 | P1  | Former Phase 6 plan là plan dài chưa check acceptance                                                                   | Observability library/config/tests/dashboard assets đã tồn tại                             | Trích final behavior/evidence vào Phase 6 record ngắn gọn rồi xóa plan                                               |
| TECH-017 | P1  | **DOC-CODE-ANCHORS.md** trỏ tới **apps/management-app/src/components/pos/table-detail-panel.tsx**                       | File thật nằm trong **features/pos/components/**                                           | Sửa anchor và chạy repository verifier                                                                               |
| TECH-018 | P2  | Bản English và Vietnamese cùng tồn tại cho business logic, architecture và nhiều phases                                 | File English thường mới hơn; bản Vietnamese chứa absolute local paths                      | Giữ English là canonical language cho technical docs; xóa **.vi.md** sau khi merge unique facts                      |
| TECH-019 | P2  | **redis-usage-analysis.md** trộn projections, recommendations và current state                                          | Một số mục “not in code” đã được triển khai, một số proposed key chưa từng có              | Chỉ chuyển Redis ownership/key/TTL hiện tại vào architecture rồi xóa analysis artifact                               |
| TECH-020 | P2  | Completed specs/plans được giữ như long-lived documentation                                                             | **docs/README.md** yêu cầu xóa temporary plans/reports sau khi absorption                  | Áp dụng migration/deletion gates ở Phần 7                                                                            |

### 5.2 Tài nguyên khóa luận và LaTeX

| ID         | Mức | Hiện trạng thesis                                                                                                                 | Evidence hiện tại                                                                  | Hướng xử lý                                                                                                                   |
| ---------- | --- | --------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| THESIS-001 | P0  | Catalog DBML ở Chapter 4 thiếu **stock_reservations**                                                                             | Catalog entities và Chapter 5 mô tả reservation behavior                           | Cập nhật **chapter4-catalog-schema.dbml** và render lại figure                                                                |
| THESIS-002 | P0  | Order DBML ở Chapter 4 thiếu **orders.stock_reservation_version**                                                                 | Order entity và Chapter 5 confirmation flow sử dụng version này                    | Cập nhật **chapter4-order-schema.dbml** và render lại figure                                                                  |
| THESIS-003 | P1  | Main title macro bọc official title bằng màu đỏ                                                                                   | Title trong proposal khớp; màu đỏ có dấu hiệu là editing marker                    | Xóa red styling sau khi visual confirmation                                                                                   |
| THESIS-004 | P1  | **frontmatter/council.tex** tồn tại nhưng không được main report include                                                          | Official outline yêu cầu council information                                       | Include ở vị trí đúng hoặc ghi rõ trường sẽ chèn bên ngoài                                                                    |
| THESIS-005 | P1  | **thesis-workflow-plan.md** là append-only log chứa TODO cũ và chỉ dẫn giữ obsolete prompts                                       | LaTeX report và code đã vượt xa các checkpoint đó                                  | Viết lại thành workflow hiện tại ngắn gọn; không append thêm historical section                                               |
| THESIS-006 | P1  | **thesis-official-outline.md**, **thesis-evidence-map.md** và **thesis-artifact-backlog.md** chứa trạng thái trước khi hoàn thiện | Report hiện có đủ bảy chapters cùng stock/benchmark evidence mới hơn               | Refresh theo built PDF và code hiện tại; thay backlog bằng concise artifact register                                          |
| THESIS-007 | P1  | Chapter 1 ghi chung “staff management” là ngoài phạm vi                                                                           | Staff Management đã được triển khai                                                | Thu hẹp nội dung loại trừ thành advanced HR/staff administration, giữ implemented RBAC/staff scope                            |
| THESIS-008 | P1  | Report-condensation plan đặt mục tiêu dưới 170 trang                                                                              | Main PDF hiện build ra 200 trang                                                   | Quyết định rõ execute/cancel trước khi xóa plan; không được ngầm tuyên bố mục tiêu đã đạt                                     |
| THESIS-009 | P1  | README của thesis assets mô tả diagram source type khác với pipeline hiện tại                                                     | Chapter 4 dùng PlantUML; Chapter 2/3 có canonical PlantUML; Chapter 5 dùng Mermaid | Viết lại asset source registry và chọn một authoritative source format cho mỗi diagram                                        |
| THESIS-010 | P2  | Tám Chapter 2 Mermaid và hai Chapter 3 Mermaid vẫn còn dù đã superseded/deprecated                                                | Active report pipeline dùng PlantUML replacements                                  | Xóa sau khi xác nhận rendered outputs và LaTeX references dùng canonical sources                                              |
| THESIS-011 | P2  | **chapter5-order-confirm-stock-slide22.mmd** nằm chung với report diagrams                                                        | Không có **.tex** reference và đây là defense-specific file                        | Chuyển vào defense asset directory; giữ 23 Chapter 5 Mermaid report sources còn lại                                           |
| THESIS-012 | P2  | 49 PNG trong Appendix A là placeholder giống hệt nhau và không còn được include                                                   | Byte-level comparison và LaTeX reference scan cho thấy không được sử dụng          | Xóa sau một tracked-reference check cuối                                                                                      |
| THESIS-013 | P2  | Các converted institutional Markdown có broken image links và trùng nội dung DOCX/PDF                                             | Local link audit tìm thấy bảy broken image references                              | Giữ official DOCX/PDF làm provenance; hấp thụ rules vào thesis map/style checklist rồi xóa conversion không đáng tin          |
| THESIS-014 | P2  | Defense plans/scripts/QA notes nằm lẫn ở thesis root trong khi canonical presentation directory được nhắc tới lại không tồn tại   | Chưa có **docs/presentations/qrtable-defense-deck** thực tế                        | Consolidate vào **defense/** sau khi chọn real deck source/export; giữ nguyên trạng thái deleted PPTX hiện tại của người dùng |
| THESIS-015 | P2  | Appendix source có tên **d-\***, **e-\***, **f-\*** nhưng render thành A/B/C                                                      | LaTeX **\\appendix** quyết định A/B/C                                              | Rename theo A/B/C và cập nhật input references trong một atomic change                                                        |
| THESIS-016 | P2  | Tracked Python bytecode/cache và temporary screenshot directories nằm trong report resources                                      | Đây là generated artifacts, không phải report source/evidence                      | Xóa tracked generated files và củng cố ignore rules sau reference check                                                       |
| THESIS-017 | P2  | Research surveys là internal summaries nhưng có thể bị hiểu nhầm thành citation authorities                                       | **references.bib** mới là citation source thực tế                                  | Migrate primary sources hợp lệ vào BibTeX có provenance rồi xóa narrative survey notes                                        |

## 6. Đề xuất bộ tài liệu canonical

### 6.1 Bộ tài liệu kỹ thuật canonical

Bộ technical docs cuối cùng cần được chủ động giữ nhỏ:

| Tài liệu canonical                           | Mục đích                                                                                                 | Hành động                                                    |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| **README.md**                                | Repository entry point, product summary, workspace map, setup/verification và documentation map          | Viết lại                                                     |
| **AGENTS.md**                                | Engineering invariants và alias/boundary thực tế                                                         | Sửa theo code                                                |
| **docs/README.md**                           | Chính sách canonical docs, lifecycle và navigation                                                       | Cô đọng và bổ sung status vocabulary                         |
| **docs/DOC-CODE-ANCHORS.md**                 | Topic-to-code evidence có thể kiểm chứng                                                                 | Sửa và chỉ mở rộng cho canonical claims                      |
| **docs/business-logic.md**                   | Actor/use case/domain rules và state transitions                                                         | Reconcile với implemented behavior                           |
| **docs/technical-architecture.md**           | Containers, service ownership, data, transport, security, observability và deployment packaging hiện tại | Reconcile và cô đọng                                         |
| **docs/project-status.md**                   | Ma trận **IMPLEMENTED**/**VERIFIED**/**DEPLOYED** và deployment work còn lại                             | Tạo mới từ **implementation_plan.md**, sau đó retire file cũ |
| **docs/architecture/permission-matrix.md**   | Role/permission contract                                                                                 | Giữ và cập nhật database/environment details                 |
| **docs/phases/phase-\*.md**                  | Concise final records, không phải task lists                                                             | Chuẩn hóa theo final-record template                         |
| **docs/testing/README.md**                   | Stable testing strategy và commands                                                                      | Tạo từ Phase 5 material còn giá trị                          |
| **docs/testing/traceability-matrix.md**      | Requirement-to-test/evidence map                                                                         | Refresh                                                      |
| **docs/testing/saga-validation-strategy.md** | Durable distributed-flow validation strategy                                                             | Giữ/cập nhật                                                 |

Không nên tạo thêm repository archive folder. Git history đã là archive; archive nằm trong repository sẽ duy trì chính sự nhập nhằng mà đợt cleanup này cần loại bỏ.

### 6.2 Mẫu cho phase record

Mọi phase document còn lại nên dùng cùng một cấu trúc ngắn gọn:

1. **Status** theo mô hình ba trạng thái;
2. **Final Scope** và explicit exclusions;
3. **Accepted Decisions**;
4. **Implemented Behavior**;
5. **Evidence Anchors** trỏ tới code/tests/runtime artifacts;
6. **Deferred Work**;
7. **Handoff** chỉ khi phase sau thực sự phụ thuộc.

Không giữ task checklist, dated work log, prompt, speculative variant hoặc completion percentage trong final phase records.

### 6.3 Bộ tài nguyên khóa luận canonical

Tạo **docs/graduation-thesis-resources/README.md** làm entry point duy nhất, phân loại như sau:

| Nhóm     | Nội dung canonical                                                                                              |
| -------- | --------------------------------------------------------------------------------------------------------------- |
| Report   | **thesis-report/** LaTeX source, referenced figures/assets, **references.bib**, reproducible build instructions |
| Workflow | Một workflow/status file hiện hành ngắn gọn và official outline                                                 |
| Evidence | Evidence map hiện tại, artifact register, benchmark run manifest, screenshots/results được chọn                 |
| Sources  | Official institutional DOCX/PDF và citation provenance; không dùng converted working copies làm authority       |
| Defense  | Actual deck source/export, một presentation script, một demo playbook và một reviewer Q&A document              |

Khóa luận có thể tiếp tục dùng tiếng Việt, trong khi long-lived engineering docs dùng tiếng Anh. Translation duplicates không được xem là hai nguồn thẩm quyền độc lập.

## 7. Kế hoạch xử lý từng nhóm tài liệu

### 7.1 Repository root và thư mục docs

| Tài liệu                               | Quyết định   | Điều kiện migration                                                                      |
| -------------------------------------- | ------------ | ---------------------------------------------------------------------------------------- |
| **README.md**                          | Viết lại/giữ | Nhận diện đúng QRTable và chỉ liệt kê verified commands                                  |
| **AGENTS.md**                          | Sửa/giữ      | Alias, library, tenant, Redis và deployment claims đã được kiểm chứng với code           |
| **database-per-service-split-plan.md** | Hấp thụ/xóa  | Database ownership và final verification đã có trong architecture/status docs            |
| **docs/README.md**                     | Cập nhật/giữ | Canonical map và document lifecycle mới được chấp nhận                                   |
| **docs/DOC-CODE-ANCHORS.md**           | Cập nhật/giữ | **pnpm verify:doc-anchors** pass                                                         |
| **docs/business-logic.md**             | Cập nhật/giữ | Offline/session/tenant/audit claims đã reconcile                                         |
| **docs/technical-architecture.md**     | Cập nhật/giữ | Ownership, alias, session, tenant, port, observability và deployment status đã reconcile |
| **docs/implementation_plan.md**        | Thay thế/xóa | **docs/project-status.md** đã chứa mọi fact còn hiện hành                                |
| **docs/redis-usage-analysis.md**       | Hấp thụ/xóa  | Redis registry/ownership/TTL hiện tại đã có trong architecture                           |
| **docs/business-logic.vi.md**          | Hấp thụ/xóa  | Unique facts đã được so sánh và merge vào canonical English file                         |
| **docs/technical-architecture.vi.md**  | Hấp thụ/xóa  | Unique facts đã được so sánh và merge vào canonical English file                         |

### 7.2 Thư mục docs/phases

| Artifact/nhóm                                                                          | Quyết định                                                                                                 |
| -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| **phase-0-foundation.md**, **phase-1-catalog.md**                                      | Viết lại thành concise historical final records; bỏ template/course assumptions lỗi thời                   |
| **phase-2a-order-kafka.md**, **phase-2b-kitchen-websocket.md**, **phase-3-payment.md** | Giữ và chuẩn hóa; kiểm chứng evidence anchors                                                              |
| **phase-4a-saga-hardening.md**                                                         | Ghi complete cho accepted representative thesis scope; liệt kê additional production hardening là deferred |
| **phase-4b-saas-onboarding.md**, **phase-4d-dashboard-reporting.md**                   | Giữ/cập nhật thành final records                                                                           |
| **phase-4c-staff-management.md**                                                       | Viết lại từ TODO plan thành implemented final record                                                       |
| **Former combined Phase 5–7 record**                                                   | Thay bằng records riêng cho Phase 5 Testing, Phase 6 Observability và Phase 7 Deployment                   |
| **Former Phase 6 plan**                                                                | Hấp thụ vào final Phase 6 record rồi xóa                                                                   |
| Bốn phase duplicate **.vi.md**                                                         | So sánh unique facts rồi xóa                                                                               |
| **Unreferenced generated artifact**                                                    | Loại khỏi phase docs; chỉ chuyển nếu được chọn làm defense source thực, nếu không thì xóa                  |

### 7.3 Specs, testing và các plan tạm thời

| Khu vực                     | Giữ/cập nhật                                                      | Hấp thụ/xóa sau gate                                                                     | Có điều kiện                                                                                                                                                              |
| --------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **docs/specs/**             | Không giữ làm independent long-lived authority                    | Xóa cả sáu specs sau khi accepted behavior đã có trong business/architecture/phase docs  | Vercel demo evidence có thể được link từ Phase 7 trước khi xóa                                                                                                            |
| **docs/testing/phase-5/**   | **saga-validation-strategy.md** và traceability matrix đã refresh | Năm execution plans, README/handoff và năm mini-specs sau khi final testing docs tồn tại | Chỉ giữ tạm item có unresolved test gap                                                                                                                                   |
| **docs/testing/testing.md** | Không giữ độc lập                                                 | Merge unique scenario coverage vào testing strategy rồi xóa                              | —                                                                                                                                                                         |
| **docs/superpowers/**       | Không file nào là final canonical doc                             | Completed Phase 4C/4D/6, refactor, Vercel demo và order-stock plans/specs sau absorption | Chỉ giữ **2026-06-06-phase-7-docker-digitalocean-deployment.md** cho tới khi public deployment hoàn thành hoặc bị cancel rõ ràng; xóa Vietnamese duplicate sau comparison |

### 7.4 Tài nguyên kiến trúc

| Tài liệu                                                       | Quyết định                                                                                                                        |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- |
| **docs/architecture/permission-matrix.md**                     | Giữ/cập nhật                                                                                                                      |
| **architec.mmd**                                               | Hấp thụ topology còn hữu ích rồi xóa                                                                                              |
| **erd.dbml**, **erd.mmd**, **erd.png**, **erd_explanation.md** | Thay global physical ERD gây hiểu sai bằng current per-service ownership hoặc logical relationship view, sau đó xóa bộ cũ         |
| **docs/architecture/README.md**                                | Viết lại thành source/render registry nhỏ nếu còn architecture assets; nếu không, merge navigation vào **docs/README.md** rồi xóa |

### 7.5 Tài nguyên ở root thư mục khóa luận

#### Giữ và cập nhật

- **thesis-report/** cùng mọi asset đang được LaTeX tham chiếu;
- **thesis-proposal-vodinhminhquan-v1.docx** làm proposal provenance;
- **phuluc2_hinhthuctrinhbay.docx** và **.pdf** làm official institutional sources;
- **thesis-official-outline.md** sau khi reconcile;
- **thesis-evidence-map.md** sau khi reconcile;
- **thesis-workflow-plan.md** đã được viết lại, ưu tiên rename thành **thesis-workflow.md**;
- artifact register ngắn gọn thay cho **thesis-artifact-backlog.md**;
- benchmark result directories, kèm manifest chỉ rõ run/metrics/figures nào thực sự được trích dẫn;
- citation pipeline và **references.bib** làm reference authority.

#### Hấp thụ rồi xóa

- completed **chapter-\*-plan.md**, **chapter-\*-prompt.md**, polish/refactor/scaffold plans, completion reports và restructure summaries;
- **thesis-agent-prompt-bank.md** sau khi chuyển reusable rules vào thesis README/workflow;
- **thesis-source-backbone.md** sau khi merge citation policy/provenance;
- stale Phase 5 evidence audits và screenshot scaffold instructions sau khi evidence map đã current;
- **k6-observability-\*plan.md**, **k6-observability-test.md** và explanatory notes sau khi benchmark README/manifest chứa reproducible commands và selected results;
- converted DOCX/PDF Markdown files sau khi ghi lại unique institutional rules;
- research-survey narratives sau khi valid primary sources có mặt trong **references.bib**;
- language/style audit reports sau khi accepted rules có trong report style/build checklist.

#### Có điều kiện, chưa được xóa

- **thesis-report-condensation-plan.md**: giữ tới khi mục tiêu 170 trang được thực hiện, điều chỉnh hoặc cancel rõ ràng;
- defense working files: giữ tới khi actual deck source/export tồn tại và unique content được rút thành một script, một demo playbook và một Q&A file;
- mọi evidence file đang được thesis tham chiếu cho tới khi reference scans và clean build chứng minh file không còn dùng.

### 7.6 Mermaid và tài nguyên được sinh tự động

| Nhóm                                         |      Số lượng | Quyết định                                                      |
| -------------------------------------------- | ------------: | --------------------------------------------------------------- |
| Legacy technical architecture Mermaid        |             2 | Xóa sau khi có current architecture replacement                 |
| Deprecated Chapter 2 Mermaid                 |             8 | Xóa sau khi xác nhận PlantUML/rendered replacements đang active |
| Superseded Chapter 3 Mermaid                 |             2 | Xóa sau khi xác nhận PlantUML/rendered replacements đang active |
| Chapter 5 report Mermaid                     |            23 | Giữ; tất cả render thành công                                   |
| Chapter 5 defense-only Mermaid               |             1 | Chuyển vào **defense/assets/**                                  |
| Identical unused Appendix A placeholder PNGs |            49 | Xóa sau final tracked-reference scan                            |
| Temporary screenshots/cache/bytecode         | Không cố định | Xóa generated artifacts và cập nhật ignore rules                |

## 8. Các quyết định đã chốt từ audit

Các câu hỏi sau cần được chốt tại checkpoint đầu tiên của implementation plan. Báo cáo kèm recommended answer để không phải mở lại những implementation facts đã rõ.

### Q1. QRTable đã “hoàn thành” chưa?

**Quyết định đề xuất:** Accepted thesis feature scope đã được triển khai. Mức verification cần được ghi theo từng capability. Full public production deployment chưa hoàn thành. Không dùng một tỷ lệ phần trăm duy nhất để gộp ba trạng thái này.

### Q2. Phase 4A Saga Hardening đã hoàn tất chưa?

**Quyết định đề xuất:** Complete đối với accepted representative thesis flows và invariants hiện tại. Additional production hardening, chaos testing và operational automation được ghi là deferred. Cách này vừa bảo toàn kết quả đã triển khai, vừa trung thực về giới hạn.

### Q3. Mô tả tenancy nào là canonical?

**Quyết định đề xuất:** Request guards/context xác lập tenant identity; tenant-aware repositories và queries áp dụng explicit predicates. Không khẳng định có automatic TypeORM subscriber/global query filter nếu cơ chế đó chưa được triển khai.

### Q4. Cơ chế customer session nào là canonical?

**Quyết định đề xuất:** Browser state/localStorage kết hợp header **x-session-id** và **x-tenant-id** là cơ chế hiện tại. Cookie và offline queue design thuộc future work/security improvement.

### Q5. “Observability deployed” có đồng nghĩa production deployed không?

**Quyết định đề xuất:** Không. Tách riêng code/configuration đã implement, local/integration verification và public production deployment. Mỗi trạng thái phải có evidence riêng.

### Q6. Có nên giữ các plan đã hoàn tất để lưu lịch sử không?

**Quyết định đề xuất:** Không tạo repository archive. Merge unique decisions/evidence, xóa plan và dùng Git history khi cần truy vết lịch sử.

### Q7. Tài liệu kỹ thuật có nên có bản tiếng Việt song song không?

**Quyết định đề xuất:** Không. Long-lived engineering canonical docs dùng tiếng Anh theo repository policy hiện tại. Khóa luận chính thức dùng tiếng Việt. Điều này loại bỏ hai nguồn thẩm quyền drift độc lập.

### Q8. Có nên xóa mọi benchmark run và screenshot không xuất hiện trong PDF?

**Quyết định đề xuất:** Giữ reproducible raw evidence có manifest và retention purpose; xóa generated duplicate/placeholder cùng transient output không được mô tả. Evidence không phải canonical narrative nhưng vẫn có thể là provenance cần thiết.

### Q9. Có thể coi kế hoạch rút gọn đã hoàn tất vì khóa luận build thành công không?

**Quyết định đề xuất:** Không. Build thành công 200 trang không đáp ứng target dưới 170 trang. Phải execute, revise hoặc cancel rõ ràng.

### Q10. Có thể xóa defense notes ngay không?

**Quyết định đề xuất:** Chưa. Trước hết phải tạo hoặc chọn actual deck source và export. Sau đó mới rút gọn working notes về minimal defense set và xóa phần còn lại.

### Q11. Có nên sửa docs/guides trong đợt canonicalization này không?

**Quyết định đề xuất:** Không thay đổi nội dung trong pass này. Sửa canonical docs trước, sau đó audit guides với stabilized contracts trong một pass riêng.

## 9. Chiến lược triển khai kế hoạch

Nên dùng hai implementation plans tuần tự và tạm thời. Technical canonicalization phải đi trước thesis cleanup vì thesis evidence map cần tham chiếu tới technical facts đã ổn định.

### Plan A — Chuẩn hóa tài liệu kỹ thuật

Đường dẫn đề xuất:

**docs/superpowers/plans/2026-07-11-canonical-technical-docs-consolidation.md**

Các checkpoint đề xuất:

1. **Freeze và phân loại:** Lưu machine-readable inventory cùng source-to-target migration table; ghi nhận dirty-worktree baseline.
2. **Sửa nguồn thẩm quyền:** Viết lại root README và reconcile **AGENTS.md**, **docs/README.md** cùng code anchors.
3. **Sửa hành vi canonical:** Reconcile business logic và technical architecture với source/tests/config.
4. **Thay status model:** Tạo **project-status.md**; loại bỏ percentage/TODO claims khỏi final records.
5. **Chuẩn hóa phases:** Tạo concise final Phase 0–7 records, gồm records riêng cho Testing, Observability và Deployment.
6. **Chuẩn hóa testing:** Tạo stable testing index/strategy và refresh traceability.
7. **Hấp thụ rồi xóa:** Loại superseded technical specs, plans, duplicates và legacy architecture assets sau unique-content comparison.
8. **Kiểm chứng:** Chạy anchors, local-link checks, terminology/claim scans, Markdown lint nếu đã cấu hình và source-specific tests được tài liệu tham chiếu.

### Plan B — Chuẩn hóa tài nguyên khóa luận

Đường dẫn đề xuất:

**docs/superpowers/plans/2026-07-11-thesis-resource-consolidation.md**

Các checkpoint đề xuất:

1. **Tạo thesis map:** Thêm resource classes, authority, ownership và generated-file policy.
2. **Reconcile report facts:** Sửa DBML, staff-scope wording, title marker, council-page decision và diagram registry.
3. **Refresh workflow/evidence:** Viết lại workflow, outline, evidence map và artifact register theo built report cùng canonical technical docs.
4. **Chuẩn hóa sources/evidence:** Tách institutional sources, bibliography provenance, benchmark manifest và selected evidence.
5. **Chuẩn hóa diagrams/assets:** Giữ active sources, chuyển defense-only files, xóa deprecated sources/placeholders/cache sau reference checks.
6. **Consolidate defense:** Chọn actual deck source/export; rút scripts, demo notes và Q&A về minimal set.
7. **Chốt page target:** Execute, revise hoặc cancel condensation plan một cách rõ ràng.
8. **Kiểm chứng và xóa temporary docs:** Clean LaTeX build, bibliography check, Mermaid/PlantUML render, link/reference scan, PDF visual sampling, sau đó xóa absorbed plans/prompts/reports.

### Cấu trúc bắt buộc cho mỗi task trong plan

Theo writing-plan discipline, mỗi task phải có:

- file chính xác cần sửa, tạo, di chuyển hoặc xóa;
- source document chứa unique facts cần được hấp thụ;
- các bước nhỏ theo thứ tự, mỗi bước có một observable result;
- verification commands chính xác cùng expected outcome;
- deletion gate và rollback note;
- atomic checkpoint/commit boundary;
- không dùng chỉ dẫn mơ hồ như “cập nhật tài liệu khi cần”.

### Thứ tự thực hiện đề xuất

    Plan A: authority + architecture + status
      -> Plan A: phases + testing
      -> Plan A: technical deletion gate
      -> Plan B: thesis map + factual corrections
      -> Plan B: evidence/assets/defense
      -> Plan B: thesis deletion gate
      -> audit docs/guides trong pass riêng

Báo cáo audit này và hai implementation plans đều là temporary artifacts. Xóa chúng sau khi toàn bộ accepted decisions đã được hấp thụ và verification pass.

## 10. Điều kiện an toàn trước khi xóa

Không xóa file nào nếu chưa vượt qua tất cả gate liên quan:

1. **Unique-content gate:** So sánh candidate với canonical target; migrate mọi fact còn đúng.
2. **Reference gate:** Xác nhận không có Markdown, LaTeX, script, build manifest hoặc application path đang active tham chiếu.
3. **Generated-source gate:** Trước khi xóa rendered image, xác nhận canonical source và reproducible render command tồn tại.
4. **Evidence gate:** Trước khi xóa benchmark/test assets, xác nhận chúng không được trích dẫn và selected evidence có provenance.
5. **Build gate:** Compile thesis từ clean temporary output directory.
6. **Diagram gate:** Render mọi Mermaid/PlantUML/DBML source được report giữ lại.
7. **Anchor/link gate:** Tất cả canonical code anchors và local links phải pass.
8. **Dirty-worktree gate:** Không stage, restore, move hoặc overwrite unrelated user changes.
9. **Git gate:** Review **git diff --stat**, **git diff --check** và deletion lists trước khi commit.

Dirty-worktree baseline hiện tại gồm user changes trong KDS files, các Allure results bị xóa, **.cursor/settings.json** và một presentation PPTX đang ở trạng thái deleted. Các thay đổi này phải nằm ngoài documentation canonicalization patch, trừ khi người dùng chủ động đưa chúng vào scope sau này.

## 11. Kết quả kiểm chứng baseline

| Kiểm tra                               | Kết quả       | Diễn giải                                                                                                  |
| -------------------------------------- | ------------- | ---------------------------------------------------------------------------------------------------------- |
| CodeGraph sync/status                  | PASS          | Code graph đã current trước khi report được viết                                                           |
| Main XeLaTeX build trong **/tmp**      | PASS          | Tạo được PDF 200 trang; bibliography được resolve ở final build                                            |
| LaTeX layout warnings                  | WARN          | Còn một overfull box; font-size substitutions và PDF-object warnings cần review nhưng không làm build fail |
| Chapter 5 Mermaid render               | PASS          | 24/24 sources render thành công, gồm cả defense-only source                                                |
| **pnpm verify:doc-anchors**            | FAIL          | Còn một Management App POS path lỗi thời cần sửa                                                           |
| Local Markdown asset scan ngoài guides | FAIL          | Có bảy broken image links trong converted documents                                                        |
| Absolute local-file link scan          | FAIL          | Có 17 link **file:///Users/...** làm tài liệu không portable                                               |
| Main PDF page target                   | OPEN DECISION | PDF hiện tại 200 trang, chưa đạt target dưới 170 trang trong condensation plan                             |

## 12. Tiêu chí hoàn thành đợt chuẩn hóa

Đợt chuẩn hóa chỉ được xem là hoàn thành khi:

- root README và **AGENTS.md** mô tả đúng QRTable workspace cùng implementation conventions;
- mọi canonical behavior claim đều có code/test/config anchor;
- không canonical doc nào khẳng định automatic tenant filtering, cookie session, offline write, QR PDF export hoặc deployed production infrastructure khi chưa có code/evidence;
- project status phân biệt rõ implemented, verified và deployed;
- Phase 0–7 records là concise final records có current evidence;
- completed specs/plans/prompts/reports đã được xóa sau absorption;
- technical documentation chỉ có một English authority cho mỗi topic;
- thesis resources có index và boundary rõ giữa report/source/evidence/defense;
- Chapter 4 schema diagrams khớp stock-reservation entities hiện tại;
- retained diagrams render được và retained assets được tham chiếu hoặc được ghi rõ là evidence;
- LaTeX build đủ sạch để submit, citations/references được resolve và layout warnings đã review;
- mọi canonical anchors và local links đều pass;
- **docs/guides/** không thay đổi cho tới follow-up audit riêng;
- final diff không chứa unrelated user changes.

## 13. Quyết định khởi động được đề xuất

Trước tiên, cần chấp nhận target canonical set và status vocabulary ba trạng thái. Sau đó mới tạo Plan A với source-to-target migrations chính xác. Không bắt đầu xóa chỉ dựa trên tuổi file, tên file hoặc cảm giác nội dung trùng lặp: một số file lỗi thời vẫn chứa accepted decisions hoặc evidence duy nhất cần được chuyển trước khi loại bỏ.
