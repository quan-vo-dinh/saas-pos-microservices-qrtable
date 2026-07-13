# Plan A - Refactor Chương 4-5 QRTable

> Ngày tách plan: 2026-06-04.
> Phạm vi độc lập: bổ sung thiết kế dữ liệu/database schema cho Chương 4 và refactor Chương 5 theo hướng luồng vận hành cốt lõi.
> Dùng plan này khi chỉ làm Chương 4-5. Không cần load toàn bộ plan Chương 6-7 trừ khi đang cập nhật bảng đánh giá hoặc kết luận.
> Trạng thái sync 2026-06-04: đã triển khai và verify bằng XeLaTeX/TeX Live. `.lot` xác nhận Bảng 4.1-Bảng 4.5 và Chương 5 chỉ còn Bảng 5.1; `.lof` xác nhận Hình 5.1-Hình 5.5. Đây là nguồn đáng tin nhất cho trạng thái Plan A.

## 0. Protocol bắt buộc khi thực thi plan

Lưu ý chung:

- Viết tài liệu bằng tiếng Việt. Chỉ giữ tiếng Anh khi là tên công nghệ, tên thành phần, vai trò mã nguồn hoặc thuật ngữ chuyên ngành khó dịch chính xác.
- Có thể dùng web/browser để kiểm chứng nguồn học thuật, nguồn chính thức, DOI/link và metadata khi có phát sinh citation hoặc thông tin có khả năng thay đổi.
- Dùng Context7/`ctx7` khi cần tra tài liệu hiện tại của library, framework, SDK, API, CLI tool hoặc cloud service theo `AGENTS.md`.
- Không invent citation, không thêm nguồn giả vào `references.bib`.
- Chỉ thêm nguồn thật, đủ chắc và có khả năng dùng thật trong nội dung khóa luận.
- Cuối session phải build LaTeX và cập nhật `docs/graduation-thesis-resources/thesis-workflow-plan.md`.

Use relevant installed skills khi cần:

- `Zoom Out`: ưu tiên dùng khi cần nhìn hệ thống ở mức actor/domain/use case, đặc biệt trước khi viết lại Chương 4-5 để tránh sa vào source tree.
- `Grill with Docs`: ưu tiên dùng để audit assumption, contradiction, thuật ngữ, reviewer-style questions và đối chiếu với docs/code hiện có.
- `Writing Plans`: dùng khi cần cấu trúc hóa checkpoint, tách task nhỏ hoặc tiếp tục chia plan để tránh tràn ngữ cảnh.
- `Doc Coauthoring`: chỉ dùng khi cần refine cấu trúc tài liệu/audit hoặc reader testing; không dùng để draft chương dài một mạch.
- Có thể dùng thêm skill khác nếu phù hợp với phần việc, nhưng không biến việc dùng skill thành lý do mở rộng scope.

## 1. Bối cảnh tối thiểu

Mục tiêu của plan này là biến Chương 4-5 thành phần nối mạch từ thiết kế kiến trúc sang hệ thống đã hiện thực:

- Chương 4 cần bổ sung `Thiết kế cơ sở dữ liệu theo ranh giới dịch vụ`.
- Chương 5 cần giảm mức code-level, trình bày theo luồng nghiệp vụ, invariant và bằng chứng.
- Technical Phase 6 Observability không phải trụ cột nội dung; chỉ nhắc ngắn như nền hỗ trợ vận hành nếu thật sự cần.
- Technical Phase 7 Production Deployment chắc chắn sẽ triển khai trong vài ngày tới; Chương 5 chỉ viết khung ngắn trước và bổ sung artifact sau khi deploy thật.
- Diagram Chương 5 không bị phân rã từ overview thành nhiều hình nhỏ thay thế. Chỉ bổ sung diagram phụ trợ riêng cho vấn đề/mục con cụ thể.

Đối tượng đọc là giảng viên, hội đồng và người phản biện có nền tảng CNTT, không nhất thiết quen NestJS/Nx/Redis internals. Vì vậy Chương 5 không nên đọc như README mã nguồn.

## 2. Nguồn bắt buộc và nguồn không dùng

Trước khi sửa LaTeX dài:

- Đọc `AGENTS.md`.
- Đọc `docs/graduation-thesis-resources/thesis-workflow-plan.md`.
- Đọc các file LaTeX Chương 4-5 hiện tại.
- Dùng CodeGraph trước khi chỉnh sửa phần codebase-derived content.

Nguồn code ưu tiên cho database/schema:

- `TypeOrmModule.forFeature(...)`.
- `MongooseModule.forFeature(...)`.
- TypeORM entity trong `libs/entities/src/lib/`.
- Payment entity riêng trong `apps/payment/src/app/modules/payment/entities/`.
- Mongoose schema trong `libs/schemas/src/lib/`.
- Module/repository registration thật.
- Runtime introspection PostgreSQL/MongoDB chỉ dùng khi đã đối chiếu với code.

Không dùng làm source of truth:

- Các DBML/ERD legacy đã retire hoặc chưa regenerate từ code.

Nếu DBML/ERD cũ mâu thuẫn với entity/schema/module registration, codebase hiện tại thắng.

## 3. Quyết định nội dung Chương 4

### 3.1. Mục cần bổ sung

Thêm một mục riêng:

- `4.x. Thiết kế cơ sở dữ liệu theo ranh giới dịch vụ`

Vị trí tốt nhất: sau phần ranh giới service/kiến trúc giao tiếp và trước hoặc gần phần Redis/Kafka/payment. Lý do: thiết kế dữ liệu là cầu nối giữa service boundary và các luồng triển khai ở Chương 5.

### 3.2. Cấu trúc đề xuất

1. `4.x.1. Nguyên tắc sở hữu dữ liệu`

- Mỗi service sở hữu tập dữ liệu nghiệp vụ của mình.
- Service khác không đọc/ghi trực tiếp database của service này.
- PostgreSQL/MongoDB là durable state.
- Redis là cache/session/projection/queue khi vận hành.
- `tenant_id`, outbox và integration contract chỉ nhắc ở mức thiết kế.

2. `4.x.2. Bảng tổng hợp schema theo service`

- Đây là phần chính.
- Dùng bảng `service / storage / table hoặc collection / dữ liệu sở hữu / ghi chú thiết kế`.
- Không tách từng table thành từng section riêng trong chương chính.

3. `4.x.3. Thiết kế dữ liệu cho các service nghiệp vụ`

- Mỗi service có 1-3 đoạn giải thích.
- Không liệt kê toàn bộ cột/constraint/index nếu không phục vụ luận điểm.

4. `4.x.4. Ý nghĩa đối với kiến trúc microservices`

- Chốt lại schema ownership là bằng chứng của service boundary.
- Giải thích vì sao Chương 5 dùng TCP/Kafka thay vì cross-database join.

### 3.3. Bảng ownership đề xuất

| Service        | Storage chính                   | Bảng/collection tiêu biểu                                                             | Dữ liệu sở hữu                                                  | Ghi chú thiết kế                                                                    |
| -------------- | ------------------------------- | ------------------------------------------------------------------------------------- | --------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| Catalog        | PostgreSQL                      | `areas`, `tables`, `categories`, `menu_items`                                         | Khu vực, bàn, menu, tồn kho/khả dụng món                        | Catalog là service duy nhất ghi dữ liệu catalog/tồn kho; Order chỉ gọi qua contract |
| Order          | PostgreSQL + Redis              | `sessions`, `orders`, `order_items`, `bills`, `service_requests`, `outbox_events`     | Phiên gọi món, đơn hàng, hóa đơn, yêu cầu phục vụ, event outbox | Order sở hữu vòng đời order/bill; Redis hỗ trợ cart/session runtime                 |
| Kitchen        | Redis                           | runtime projection/queue                                                              | Ticket KDS khi vận hành                                         | Không có durable business database riêng trong audit hiện tại; nhận event từ Order  |
| Payment        | PostgreSQL                      | `payments`, `audit_payments`, `tenant_payment_settings`, `outbox_events`              | Giao dịch, cấu hình SePay/VietQR, audit, event thanh toán       | Payment sở hữu payment record; Order vẫn sở hữu bill/session                        |
| SaaS           | PostgreSQL + Redis cache        | `tenants`, `pricing_plans`, `subscriptions`, `subscription_invoices`, `outbox_events` | Tenant, gói dịch vụ, subscription, hóa đơn thuê bao             | SaaS sở hữu lifecycle tenant/plan và entitlement                                    |
| User-Access    | MongoDB + Keycloak integration  | `user`, `role`                                                                        | Hồ sơ người dùng, vai trò nghiệp vụ, staff                      | Keycloak là identity provider; User-Access giữ dữ liệu nghiệp vụ về user/role       |
| BFF/Authorizer | Không sở hữu DB nghiệp vụ chính | Không áp dụng                                                                         | Gateway/auth verification                                       | Không trình bày như service sở hữu bảng domain                                      |

Lưu ý: bảng trên là khung refactor từ audit code hiện tại. Trước khi đưa vào LaTeX chính thức, đối chiếu lại tên entity/table lần cuối. Không tự động thêm `Product` vào nhóm core thesis nếu chưa quyết định lại phạm vi.

### 3.4. Diagram phụ trợ Chương 4

Có thể thêm:

- `chapter4-data-ownership-by-service.mmd`.

Mục tiêu hình: thể hiện service -> storage -> dữ liệu sở hữu. Không tái dùng ERD cũ nếu chưa regenerate/verify. Nếu page budget chặt, chỉ cần bảng tổng hợp, không bắt buộc thêm diagram.

Ghi chú sync 2026-06-04: nếu cần sơ đồ database chi tiết cho từng service bằng dbdiagram.io, không mở rộng Plan A nữa. Dùng Plan C tại `docs/graduation-thesis-resources/chapter-04-database-dbdiagram-plan.md` để tạo DBML per-service và ảnh export.

## 4. Quyết định nội dung Chương 5

Tên đề xuất ưu tiên:

- `Hiện thực các luồng vận hành cốt lõi của QRTable`

Tên thay thế:

- `Triển khai và minh chứng các luồng nghiệp vụ của QRTable`.
- `Hiện thực QRTable từ kiến trúc đến luồng vận hành`.

### 4.1. Cấu trúc đề xuất

1. `5.1. Mục tiêu triển khai và phạm vi minh chứng`

- Vai trò của Chương 5 là nối từ Chương 4 sang hệ thống đã hiện thực.
- Nêu quy tắc: không giải thích mã nguồn chi tiết, chỉ đưa chi tiết nội bộ khi phục vụ invariant hoặc bằng chứng.

2. `5.2. Nền tảng triển khai và ranh giới trách nhiệm`

- Gom backend/frontend hiện tại thành mục tổng quan ngắn.
- Nhắc shared contract bằng 1-2 đoạn.
- Không giữ bảng alias thư viện dài trong chương chính.
- Nhắc lại schema/table/collection đã trình bày ở Chương 4; Chương 5 chỉ dùng database như bằng chứng triển khai cho từng luồng.

3. `5.3. Khách quét QR, tạo phiên và giỏ món dùng chung`

- Phiên gọi món, bàn, QR token, Redis/DB ở mức khái niệm.
- Giỏ món dùng chung và cart version ở mức invariant.
- Không mô tả từng command Redis.

4. `5.4. Xác nhận đơn hàng và bảo toàn tồn kho`

- Điểm commit nghiệp vụ là staff confirm.
- Catalog sở hữu tồn kho; Order sở hữu vòng đời order.
- Nói rõ vì sao giao tiếp qua contract thay vì join database.
- Saga/compensation ở mức hội đồng hiểu được.

5. `5.5. Điều phối bếp/KDS và cập nhật thời gian thực`

- KDS là projection khi vận hành trên Redis.
- Kafka nhận `order.confirmed`.
- WebSocket chỉ là hint/refetch.

6. `5.6. Ghi nhận thanh toán tiền mặt, VietQR và SePay`

- Payment sở hữu payment record.
- Order sở hữu bill/session finalization.
- Nêu rõ vì sao `payments`/payment settings nằm ở Payment còn `bills` nằm ở Order.
- Verification/idempotency/underpaid đặt trong bảng ngắn hoặc đoạn tóm tắt.

7. `5.7. Khởi tạo đơn vị thuê bao và vòng đời gói dịch vụ`

- Super Admin onboarding.
- Tenant/subscription/payment settings.
- Schema SaaS là nguồn dữ liệu của entitlement và lifecycle.
- SaaS Onboarding Mini-Saga và bù trừ khi lỗi.

8. `5.8. Bảng điều khiển và báo cáo theo gói dịch vụ`

- Backfill technical Phase 4D.
- Owner/Manager thấy dashboard theo tenant và plan entitlement.
- Super Admin xem analytics/platform drilldown theo permission, không bị plan của tenant đang xem giới hạn.

9. `5.9. Đóng gói và triển khai production/pilot`

- Viết khung ngắn trước vì Phase 7 sẽ triển khai trong vài ngày tới.
- Trước khi deploy xong, chỉ mô tả mục tiêu và artifact sẽ bổ sung.
- Sau deploy, cập nhật domain/TLS, public BFF/frontends, service config, PostgreSQL/Redis/Kafka/Keycloak, SePay webhook callback, health check và smoke test.
- Không claim production-ready/high availability nếu chưa có backup, rollback, alerting, load test và runbook.

10. `5.10. Tổng hợp minh chứng triển khai`

- Bảng evidence tổng hợp mới, ngắn hơn.
- Liệt kê diagram, test, code/docs, optional screenshot/phụ lục, production/pilot evidence nếu có.

### 4.2. Mức độ chi tiết cần giảm

Trong Chương 5, giảm hoặc chuyển khỏi prose chính:

- Tên class/service như `SessionService`, `OrderConfirmSagaService`, `KdsRedisRepository`, `OnboardingSagaService`.
- Redis command/key nội bộ như `HGET`, `HSET`, `PEXPIRE`, `cartVersion`, `session:{tenantId}:{sessionId}`.
- Field quá thấp như `raw total`, `rounded total`, `rounding delta`, `ownerId`, `empty payment settings row`, `schemaVersion = 1`.
- Bảng shared libraries kiểu source-tree catalog.

Giữ lại:

- Mục tiêu nghiệp vụ.
- Service ownership.
- Invariant.
- Saga/compensation/idempotency ở mức thiết kế.
- Bằng chứng triển khai/kiểm chứng.
- Giới hạn.

## 5. Diagram Chương 5

Không phân rã diagram overview hiện có thành nhiều diagram nhỏ thay thế. Chỉ bổ sung diagram phụ trợ nếu nó trả lời một câu hỏi phản biện hoặc làm rõ một invariant.

Định hướng:

- `chapter5-qr-ordering-session.mmd`: giữ overview, giảm Redis command/key. Có thể bổ sung diagram phụ trợ về session/cart invariant.
- `chapter5-order-confirm-stock.mmd`: giữ vì là Saga đại diện. Giảm exact idempotency key và class name; có thể bổ sung bảng/mini-diagram "điểm commit - lỗi - bù trừ".
- `chapter5-kds-ticket-lifecycle.mmd`: giữ, giảm repository/class label và `schemaVersion`; nhấn mạnh event -> Redis projection -> WebSocket hint -> refetch.
- `chapter5-payment-settlement.mmd`: giữ overview cho payment settlement. Có thể bổ sung diagram phụ trợ cho SePay webhook/idempotency.
- `chapter5-saas-onboarding-saga.mmd`: giữ vì là Saga đại diện thứ hai; rút gọn chi tiết row/field.
- Không ưu tiên thêm `chapter5-observability-baseline.mmd`.
- Nếu Phase 7 cần hình, thêm diagram phụ trợ ngắn về production/pilot topology hoặc smoke-check boundary.

Sau khi sửa diagram:

- Sửa `.mmd`, không sửa trực tiếp PDF.
- Render lại PDF bằng Mermaid CLI.
- Build LaTeX.
- Kiểm tra danh mục hình nếu caption/filename thay đổi.

## 6. Ngôn ngữ

Ưu tiên tiếng Việt học thuật. Chỉ giữ tiếng Anh khi là tên công nghệ, vai trò mã nguồn hoặc thuật ngữ chuyên ngành khó dịch.

Gợi ý thay thế:

| Đang dùng          | Hướng viết lại                                   |
| ------------------ | ------------------------------------------------ |
| implementation     | hiện thực / triển khai                           |
| flow               | luồng                                            |
| runtime            | khi vận hành / thời gian chạy                    |
| evidence           | bằng chứng / minh chứng                          |
| artifact           | minh chứng / hiện vật kỹ thuật                   |
| backend services   | các dịch vụ phía máy chủ / các dịch vụ nghiệp vụ |
| frontend           | ứng dụng phía người dùng / giao diện ứng dụng    |
| shared libraries   | thư viện dùng chung                              |
| shared cart        | giỏ món dùng chung                               |
| payment settlement | ghi nhận / đối soát thanh toán                   |
| deployment         | đóng gói triển khai (deployment)                 |
| observability      | khả năng quan sát hệ thống (observability)       |

Vẫn giữ: `SaaS`, `POS`, `QR`, `microservices`, `BFF`, `Kafka`, `Redis`, `WebSocket`, `OpenTelemetry`, `Prometheus`, `Loki`, `Tempo`, `Grafana`, `Keycloak`, `JWT`, `OIDC`, `RBAC`, `Saga`, `idempotency`, `tenant isolation`, `service boundary`, `contract`, `outbox`, `webhook`, `VietQR`, `SePay`.

## 7. Checkpoints thực thi

### Checkpoint A1 - Backfill database/schema cho Chương 4

Việc cần làm:

- Audit từ codebase hiện tại, không lấy DBML/ERD cũ làm nguồn sự thật.
- Lập bảng ownership theo service.
- Ghi rõ durable state và runtime state.
- Ghi rõ `tenant_id` và outbox khi liên quan.
- Quyết định rõ `Product` nếu xuất hiện trong codebase: loại khỏi core thesis hoặc cập nhật boundary có chủ đích.
- Nếu thêm diagram, tạo từ code audit.

Verification:

- Không có table/collection nào được đưa vào LaTeX chỉ vì xuất hiện trong ERD cũ.
- Chương 4 có ít nhất một bảng tổng hợp database ownership.
- Build LaTeX pass.

### Checkpoint B - Refactor Chương 5

Việc cần làm:

- Đổi tên chương.
- Gộp backend/frontend thành nền tảng triển khai/ranh giới trách nhiệm.
- Bỏ mục shared libraries độc lập.
- Rút gọn prose code-level.
- Thêm Dashboard/Reporting.
- Không thêm mục Observability baseline riêng.
- Thêm khung ngắn Production/Pilot.
- Viết lại bảng evidence ngắn hơn.

Verification:

- Mỗi flow có mục tiêu nghiệp vụ, invariant, bằng chứng và giới hạn.
- Tiêu đề mục tiếng Việt.
- Không claim production-ready.
- Build LaTeX pass.

### Checkpoint C - Diagram Chương 5

Việc cần làm:

- Rút gọn label nội bộ của 5 diagram hiện có.
- Bổ sung diagram phụ trợ khi thật sự cần.
- Không phân rã overview diagram thành nhiều hình thay thế.
- Render lại PDF.
- Build LaTeX.

Verification:

- Hình không trắng, không quá dài, caption đúng.
- Diagram thể hiện service ownership/hint-refetch/compensation.

## 8. Done criteria

Plan A hoàn tất khi:

- Chương 4 có mục riêng về thiết kế dữ liệu theo ranh giới dịch vụ.
- Phần database lấy từ codebase hiện tại, không lấy DBML/ERD cũ làm nguồn sự thật.
- Chương 4 có bảng service/storage/table hoặc collection/data ownership/design note.
- Chương 5 nhắc database/schema ở mức bằng chứng cho flow, không lặp lại toàn bộ schema.
- Chương 5 không còn mục shared libraries độc lập theo kiểu source-tree catalog.
- Nội dung code-level trong Chương 5 được hạ xuống mức concept/evidence.
- Dashboard/Reporting đã được phản ánh ở Chương 5.
- Phase 6 Observability không lấn vào trọng tâm.
- Phase 7 có khung ngắn, chưa claim nếu chưa có artifact thật.
- Diagram Chương 5 được rút gọn hoặc bổ sung có chọn lọc.
- LaTeX build pass và workflow plan được cập nhật.
