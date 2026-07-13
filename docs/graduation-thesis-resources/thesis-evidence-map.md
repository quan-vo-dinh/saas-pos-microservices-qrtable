# Bản đồ bằng chứng phục vụ viết khóa luận QRTable

> Tài liệu làm việc phục vụ quá trình viết khóa luận tốt nghiệp.
> Lần khảo sát gần nhất: 2026-06-01.
> Nếu tiếp tục công việc sau khi mất/compact context, đọc `thesis-workflow-plan.md` trước.

## 1. Mục đích

Tài liệu này dùng để ánh xạ các luận điểm trong khóa luận với nguồn bằng chứng mạnh nhất hiện có trong dự án. Đây chưa phải là một chương hoàn chỉnh của khóa luận, mà là bản đồ định hướng để hỗ trợ viết một bản báo cáo đầy đủ, logic và có tính học thuật.

Nguyên tắc quan trọng: thesis proposal chỉ là tài liệu định hướng ban đầu cho tên đề tài, phạm vi nghiên cứu và động lực thực hiện. Khi viết báo cáo chính thức, không cần nhắc lại việc implementation đã điều chỉnh như thế nào so với proposal. Báo cáo nên trình bày hệ thống QRTable như một thiết kế và sản phẩm hoàn chỉnh theo hiện trạng/định hướng cuối cùng, thay vì viết như nhật ký thay đổi từ proposal sang code.

Tuy nhiên, tài liệu evidence map này vẫn cần giữ một lớp ghi chú nội bộ cho AI/dev: phần nào đã có implementation thật, phần nào đang là thiết kế/định hướng để viết bản nháp đầy đủ, và phần nào cần cập nhật bằng chứng sau khi implement. Lớp ghi chú nội bộ này không được bê nguyên văn vào khóa luận.

Khi các nguồn thông tin có mâu thuẫn, áp dụng thứ tự ưu tiên trong `docs/README.md`:

1. Source code và tests hiện tại.
2. Accepted specs mới nhất.
3. Phase records cuối cùng trong `docs/phases/`.
4. Các tài liệu gốc hoặc tài liệu hỗ trợ cũ sau khi đã kiểm chứng.
5. Thesis proposal chỉ được xem là định hướng nghiên cứu ban đầu, không phải nguồn sự thật tuyệt đối cho implementation hiện tại.

Ghi chú cập nhật 2026-06-01: canonical technical docs đã bổ sung **Phase 4D kỹ thuật - Dashboard & Reporting** và addendum **Phase 4D.1 - Dashboard entitlements/UI polish**. Các tài liệu report/LaTeX hiện tại trong `docs/graduation-thesis-resources/thesis-report/` được draft trước lần sync này, nên chưa phản ánh đầy đủ dashboard/reporting, plan feature entitlement và analytics UI. Khi polish khóa luận, cần backfill có kiểm soát vào Chương 3-6 và screenshot/demo artifacts; không viết trong bản chính thức rằng đây là “phase chưa làm”, chỉ dùng như ghi chú nội bộ.

## 2. Nguyên tắc viết bản khóa luận gửi giảng viên

Bản nháp gửi giảng viên hướng dẫn cần được viết như một báo cáo hoàn chỉnh, có đầy đủ các phần nghiên cứu, phân tích, thiết kế, triển khai, đánh giá, kết luận và hướng phát triển. Không nên viết theo kiểu “dự án hiện mới làm tới Phase X nên báo cáo chỉ dừng ở Phase X”.

Khi gặp các phần chưa implement đầy đủ như full hardening Phase 4A, Phase 4C, Phase 6 hoặc Phase 7, cách xử lý nên là:

- Trong bản khóa luận: trình bày chúng như một phần của thiết kế tổng thể hoặc phương án hoàn thiện hệ thống, nếu chúng cần thiết để cấu trúc báo cáo đầy đủ và thuyết phục.
- Trong evidence map nội bộ: đánh dấu rõ trạng thái thực tế để agent/dev sau biết phần nào cần implement hoặc cần bổ sung bằng chứng.
- Trong chương đánh giá: chỉ claim kết quả kiểm thử, benchmark, observability trace, live deployment hoặc live provider validation khi đã có bằng chứng thật.
- Trong phụ lục hoặc tài liệu nội bộ: ghi lại các phần cần backfill sau khi code đã triển khai.

Nói cách khác, báo cáo có thể mô tả hệ thống ở trạng thái hoàn chỉnh về mặt thiết kế và nghiệp vụ, nhưng không dùng cách diễn đạt “phase này chưa làm” trong bản gửi giảng viên nếu điều đó không phục vụ lập luận học thuật. Các ghi chú “chưa implement”, “cần backfill” hoặc “partial” chỉ nên nằm trong evidence map/tài liệu nội bộ. Riêng các claim về “đã kiểm chứng”, “đã đo lường”, “đã triển khai production-like” vẫn phải đi kèm bằng chứng.

### Ràng buộc hình thức từ phụ lục trình bày

Nguồn hình thức hiện tại: `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md`. Evidence map này là tài liệu nội bộ nên không cần áp dụng font, lề hoặc đánh số trang; tuy nhiên khi chuyển sang bản khóa luận chính thức cần tuân thủ các điểm sau:

- Trước phần nội dung chính cần có bìa, bìa phụ, thông tin hội đồng, lời cảm ơn, mục lục, danh mục hình, danh mục bảng và danh mục từ viết tắt. Danh mục từ viết tắt chỉ nên đưa các thuật ngữ xuất hiện nhiều, xếp theo thứ tự bảng chữ cái.
- Cần có phần Tóm tắt khóa luận/Abstract dài khoảng 1-2 trang, nêu vấn đề nghiên cứu, hướng tiếp cận, cách giải quyết và kết quả đạt được.
- Nội dung chính nên có tối thiểu khoảng 50 trang A4. Quy định hình thức khuyến nghị không vượt quá 100 trang, nhưng theo định hướng từ giảng viên hướng dẫn và tham khảo các báo cáo khóa luận tốt nghiệp trước đây, bản khóa luận có thể viết trên 100 trang nếu cần chiều sâu học thuật/kỹ thuật. Khi lập kế hoạch viết, nên nhắm khoảng 105-130 trang cho bản nháp đầy đủ, nhưng phần vượt 100 trang phải đến từ nội dung có giá trị, không phải do lặp ý hoặc nhồi screenshot.
- Cấu trúc 7 chương đề xuất vẫn phù hợp, nhưng khi biên tập bản chính thức cần map rõ với khung bắt buộc: Mở đầu, Tổng quan/công trình liên quan, cơ sở lý thuyết/phương pháp/giải pháp, trình bày và đánh giá kết quả, kết luận, hướng phát triển, tài liệu tham khảo và phụ lục.
- Chương 7 có thể giữ tên “Kết luận và hướng phát triển”, nhưng bên trong nên tách rõ hai mục “Kết luận” và “Hướng phát triển” vì quy định hình thức xem đây là hai phần riêng.
- Tất cả hình, bảng, sơ đồ, đồ thị phải có caption, đánh số theo chương và nêu rõ nguồn trích/sao chụp/tự xây dựng. Ví dụ: “Hình 4.2. Kiến trúc tổng thể QRTable. Nguồn: tác giả xây dựng từ source code và tài liệu thiết kế.”
- Tài liệu tham khảo theo chuẩn IEEE; danh mục References chỉ gồm các tài liệu thật sự được trích dẫn/sử dụng trong khóa luận, và cần tách riêng tài liệu tiếng Việt và tiếng Anh theo yêu cầu của phụ lục hình thức.
- Phụ lục và gói nộp cuối nên chuẩn bị thêm GitHub/release/commit, source code, dữ liệu thử, hướng dẫn setup, demo script, screenshot/video demo và bản PDF/DOC của báo cáo.

## 3. Định vị khóa luận ở mức tổng thể

Cách định vị an toàn nhất cho khóa luận:

> QRTable là một nền tảng SaaS POS trong lĩnh vực F&B, tích hợp đặt món qua mã QR, điều phối real-time giữa khách hàng, nhân viên và bếp, quản lý vận hành theo tenant, và thanh toán VietQR/SePay. Hệ thống được nghiên cứu, thiết kế và xây dựng theo kiến trúc microservices với event-driven communication có chọn lọc: TCP/gRPC đồng bộ được dùng cho các command cần phản hồi tức thời, còn Kafka được dùng cho các domain event cần xử lý bất đồng bộ, temporal decoupling và side effect bền vững.

Các claim cần tránh trong phần kết quả/đánh giá nếu chưa có bằng chứng:

- Hệ thống đã production-ready.
- Tất cả giao tiếp đều đi qua Kafka.
- Kafka thay thế hoàn toàn TCP/gRPC.
- WebSocket là source of truth của trạng thái nghiệp vụ.
- Payment service sở hữu bill.
- Order service cập nhật trực tiếp bảng stock của Catalog.
- Customer dùng Keycloak để xác thực.
- Full offline queue, Notification Service, saga hardening đầy đủ, observability/deployment đầy đủ đã được kiểm chứng bằng code/test/demo nếu thực tế chưa có bằng chứng. Riêng hai luồng Saga đại diện đã có bằng chứng là Order Confirm Saga và SaaS Onboarding Mini-Saga.

## 4. Bản đồ nguồn bằng chứng

| Khu vực nội dung                          | Nguồn mạnh nhất                                                                                                                                                                                                | Mức tin cậy hiện tại                             | Ghi chú                                                                                                                                                                                                                                          |
| ----------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Tên đề tài, động lực, bối cảnh thị trường | Thesis proposal `.docx`; `docs/graduation-thesis-resources/research-survey/*`                                                                                                                                  | Trung bình                                       | Phù hợp cho Chương 1 và bối cảnh liên quan. Các số liệu thị trường cần được trích dẫn cẩn trọng từ proposal hoặc survey notes.                                                                                                                   |
| Quy tắc xác định nguồn sự thật            | `docs/README.md`; `docs/DOC-CODE-ANCHORS.md`                                                                                                                                                                   | Cao                                              | Dùng để giải thích vì sao implementation docs được ưu tiên hơn proposal cũ khi viết về hệ thống thực tế.                                                                                                                                         |
| Kiến trúc tổng thể                        | `docs/technical-architecture.md`; `docs/guides/codebase-reading-map.md`; các thư mục trong `apps/`                                                                                                             | Cao                                              | Implementation hiện tại có BFF, Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access, Customer PWA và Management App.                                                                                                                 |
| Business flows                            | `docs/business-logic.md`; phase docs; specs trong `docs/specs/`                                                                                                                                                | Cao                                              | Là nguồn chính cho table/session/order/kitchen/payment state machine.                                                                                                                                                                            |
| Trạng thái triển khai nội bộ              | `docs/implementation_plan.md`; `docs/phases/*.md`                                                                                                                                                              | Cao                                              | Dùng cho AI/dev biết phần nào cần backfill. Không đưa nguyên văn trạng thái “TODO/deferred” vào bản khóa luận gửi thầy.                                                                                                                          |
| Microservice ownership                    | `docs/technical-architecture.md` mục 6; `apps/*/src`; `docs/guides/codebase-reading-map.md`                                                                                                                    | Cao                                              | Dùng cho Chương 4 về kiến trúc/thiết kế và Chương 5 về triển khai.                                                                                                                                                                               |
| Multi-tenancy                             | `docs/technical-architecture.md` mục 5; `docs/business-logic.md`; code SaaS trong `apps/saas`; các tenant-scoped queries trong Catalog/Order/Payment                                                           | Cao                                              | Mô hình hiện tại kết hợp database-per-service với discriminator column `tenant_id`.                                                                                                                                                              |
| Event-driven architecture                 | `docs/technical-architecture.md` mục 7; `docs/implementation_plan.md`; Kafka-related tests                                                                                                                     | Cao                                              | Phải trình bày là selective event-driven architecture, không phải "mọi thứ đều async". Hiện có năm approved Kafka topics.                                                                                                                        |
| Real-time                                 | `docs/technical-architecture.md` mục 9; BFF realtime module; KDS docs/specs                                                                                                                                    | Cao                                              | WebSocket/Socket.IO là lớp realtime hint/push; REST/DB vẫn là nguồn trạng thái chính.                                                                                                                                                            |
| Payment                                   | `docs/phases/phase-3-payment.md`; `docs/phases/phase-4b-saas-onboarding.md`; `docs/guides/sepay-configuration-guide-phase3.md`; `apps/payment`; webhook controllers trong `apps/bff`                           | Cao                                              | Hệ thống hiện tại dùng SePay/VietQR và cash, không dùng Stripe.                                                                                                                                                                                  |
| Dashboard/reporting và plan entitlement   | `docs/phases/phase-4d-dashboard-reporting.md`; `docs/technical-architecture.md`; `docs/business-logic.md`; `docs/architecture/permission-matrix.md`; BFF reporting controllers; management-app reports feature | Cao cho technical docs/code; cần backfill report | Technical docs đã có Owner/Manager dashboard reporting, Super Admin analytics, `PlanFeatureGuard`/`RequiresPlanFeature` và UI feature lock. Thesis report cần bổ sung yêu cầu, kiến trúc, implementation evidence, evaluation và screenshot sau. |
| Auth/RBAC                                 | `docs/architecture/permission-matrix.md`; `docs/references/auth-system-reference.md`; `apps/authorizer`; `apps/user-access`; BFF guards                                                                        | Cao                                              | Staff/admin dùng Keycloak/JWT; customer dùng anonymous QR/session flow.                                                                                                                                                                          |
| Testing/evaluation                        | `docs/testing/phase-5/traceability-matrix.md`; `docs/testing/phase-5/phase-5-handoff.md`; `tests/e2e`; app specs                                                                                               | Trung bình - cao                                 | Có bằng chứng unit/contract khá mạnh, nhưng một số full-stack/browser/live-provider gates vẫn partial/manual.                                                                                                                                    |
| Deployment/observability                  | `docker-compose.provider.yaml`; `docs/phases/phase-6-observability.md`; `docs/phases/phase-7-deployment.md`; package scripts                                                                                   | Có baseline local; public evidence pending       | Có thể claim baseline observability/local packaging đã được verify; trace/dashboard public, deploy public, backup và rollback vẫn cần bằng chứng riêng.                                                                                          |
| Diagram và presentation assets            | `docs/presentations/*`; `docs/architecture/erd.*`; `docs/architecture/erd_explanation.md`                                                                                                                      | Trung bình                                       | Dùng tốt cho diagram báo cáo, nhưng không phải engineering source of truth.                                                                                                                                                                      |

## 5. Snapshot implementation nội bộ

Mục này phục vụ AI/dev, không đưa nguyên văn vào khóa luận. Khi viết bản gửi giảng viên, ưu tiên trình bày cấu trúc hoàn chỉnh của hệ thống. Sau này nếu các phần chưa implement được hoàn thiện, agent tiếp theo cần quay lại cập nhật evidence, test, screenshot và nội dung đánh giá tương ứng.

### Đã có bằng chứng mạnh

- Nx monorepo với nhiều deployable apps và shared libraries.
- Backend edge layer: BFF xử lý HTTP API, guards, TCP clients và WebSocket gateway.
- Backend services: Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access.
- Frontends: Customer PWA và Management App.
- Catalog domain: categories, menu items, areas, tables, QR token, menu cache, Cloudinary upload.
- Order domain: QR session, shared cart, order submit, staff confirmation, bill request, table transfer, safe empty-session release.
- Kitchen domain: Redis-backed KDS queues, station routing, FIFO/priority/SLA behavior, Kafka consumer cho `order.confirmed`.
- Payment domain: cash, VietQR/SePay, webhook settlement, payment outbox, payment history (read-only), payment-to-order finalization.
- SaaS domain: tenant onboarding, subscription/plan, tenant lifecycle, quotas, payment settings, hai loại payment reference `QRTBL` và `QRSUB`.
- Dashboard/reporting domain: Owner/Manager có dashboard reporting theo tenant và plan feature entitlement; Super Admin có platform analytics/drilldown không bị giới hạn bởi plan của tenant được chọn.
- Auth/RBAC: Keycloak/JWT cho staff/admin; session/HMAC token cho customer; permission matrix với 67 permissions.
- Architecture contracts: approved Kafka topic registry và Redis access policy đã có test bảo vệ.

### Đã có nhưng cần viết cẩn trọng

- Testing khá nhiều nhưng chưa thể nói Phase 5 đã đóng hoàn toàn. Traceability matrix hiện có các dòng covered, partial, implementation-gap và deferred.
- Saga đại diện đã có bằng chứng ở hai luồng: Order Confirm Saga trong POS core và SaaS Onboarding Mini-Saga trong platform. Khi viết khóa luận, có thể claim áp dụng Saga ở phạm vi đại diện, không claim full saga hardening vận hành.
- Browser E2E đã có cho một số flow, nhưng vài demo gates vẫn cần full-stack/seed ổn định hơn.
- Live SePay validation không nằm trong automated testing mặc định.
- Phase 5 Testing và Phase 6 Observability đã IMPLEMENTED + VERIFIED cho accepted thesis scope. Phase 7 đã có Docker/Compose/Caddy/package và local-validation artifacts được verify; public deployment, HTTPS/public smoke, backup/rollback và final demo evidence vẫn pending.
- Offline behavior hiện ở mức degraded/reconnect/refetch UI, chưa phải offline action queue đầy đủ.

### Chiến lược chứng minh Saga trong khóa luận

Nguồn kỹ thuật chính: `docs/testing/phase-5/saga-validation-strategy.md`. Khi viết Chương 5 và Chương 6, không chứng minh Saga chỉ bằng việc nói “code có service tên Saga”. Cách chứng minh nên là chuỗi bằng chứng nhiều lớp:

1. Mô tả lý thuyết và lựa chọn phương pháp: QRTable chọn Saga điều phối tập trung cho hai luồng đại diện, không tạo Saga framework tổng quát.
2. Chứng minh implementation: nêu bộ điều phối, participant, điểm commit nghiệp vụ và compensation.
3. Chứng minh bằng test: dẫn unit/contract test cho thứ tự điều phối, replay, lỗi nghiệp vụ và compensation; dẫn integration opt-in cho DB/TCP boundary.
4. Chứng minh bằng artifact demo: ảnh POS confirm/KDS, ảnh Super Admin onboarding/Owner payment settings, output terminal, snapshot DB/outbox/log.
5. Ghi giới hạn: full Saga state bền vững, retry worker, CDC/Debezium, stock ledger và onboarding live đầy đủ qua Keycloak/User-Access là hướng hardening, không phải claim chính.

Ánh xạ cụ thể:

- **Order Confirm Saga:** claim tốt nhất là “đã kiểm chứng tự động ở mức unit/contract cho điều phối, replay, lỗi Catalog, outbox và compensation; có integration opt-in cho ranh giới Order-Catalog stock; còn thiếu live fault-injection harness cho lỗi commit/outbox sau deduct thật”.
- **SaaS Onboarding Mini-Saga:** claim tốt nhất là “đã kiểm chứng DB integration cho success/rollback và live Payment TCP cho payment settings; Authorizer/Keycloak và User-Access vẫn là contract double trong proof tự động hiện tại”.

Câu văn an toàn cho khóa luận:

> Đề tài áp dụng Saga ở hai luồng đại diện: xác nhận đơn hàng và khởi tạo tenant. Cả hai luồng đều dùng điều phối tập trung, có điểm commit nghiệp vụ và có giao dịch bù trừ cho các side effect đã thực hiện. Việc kiểm chứng được thực hiện theo nhiều lớp: test unit/contract cho logic điều phối, integration test cho ranh giới DB/TCP, fault injection ở mức service cho compensation, và artifact demo/log/DB để minh họa flow runtime.

Không nên viết:

- “QRTable đã hoàn thiện Saga ở mức production.”
- “Mọi giao dịch phân tán trong hệ thống đều dùng Saga.”
- “Payment Complete là một Saga đầy đủ.”
- “Onboarding đã được kiểm chứng full end-to-end live qua Keycloak, User-Access, Payment, Kafka và UI.”

### Chưa có bằng chứng implementation đầy đủ, cần backfill sau

- Phase 4A full saga hardening ngoài lát cắt đại diện, CDC/Debezium, deep saga observability.
- Notification/email service, email receipt, welcome/suspend emails, reset-password email nằm ngoài phạm vi triển khai hiện tại; chỉ viết như hướng mở rộng khi cần.
- Full production-like deployment package và Grafana trace demo.
- Nội dung khóa luận Chương 3-6 và screenshot/demo artifacts hiện chưa backfill đầy đủ technical Phase 4D Dashboard & Reporting: cần bổ sung requirement owner reporting/admin analytics, route/guard architecture (`report.read_own`, `report.read_any`, plan feature entitlement), implementation evidence rows, test evidence và UI screenshots cho FREE/BASIC/PREMIUM lock/full states.
- Native mobile apps.
- Advanced inventory/BOM, accounting, tax, HRM, CRM, BI/AI analytics, tích hợp sâu với nền tảng giao đồ ăn bên thứ ba.

## 6. Ghi chú nội bộ về khác biệt giữa các nguồn

Mục này chỉ để AI/dev xử lý nguồn thông tin, không đưa nguyên văn vào khóa luận. Khi viết báo cáo chính thức, không viết theo kiểu “proposal nói A nhưng implementation đổi sang B”. Thay vào đó, dùng thiết kế cuối cùng của QRTable làm nội dung chính.

| Chủ đề                   | Nguồn cũ/proposal có thể gây nhiễu                                                     | Nội dung nên dùng khi viết báo cáo                                                                                                                                                                                    | Ghi chú nội bộ cho agent/dev                                                                                                           |
| ------------------------ | -------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Payment gateway          | Một số phần proposal nói Stripe Checkout/Webhook.                                      | Viết trực tiếp SePay/VietQR + cash như payment design của QRTable.                                                                                                                                                    | Không cần nhắc “đổi từ Stripe sang SePay” trong khóa luận, trừ khi thầy hỏi lịch sử quyết định.                                        |
| Notification Service     | Proposal dự kiến có service độc lập.                                                   | Không đưa vào kiến trúc lõi hoặc implementation evidence của bản khóa luận hiện tại; nếu cần, chỉ viết như hướng mở rộng ngoài phạm vi chính.                                                                         | Hiện `apps/notification` chưa tồn tại; Phase 4C hiện chỉ còn Staff Management. Nếu mở lại scope sau này, cập nhật evidence và diagram. |
| Event strategy           | Proposal có xu hướng mô tả pure Event-Driven Microservices.                            | Viết kiến trúc hiện tại là microservices kết hợp sync/async: TCP/gRPC cho command/query cần phản hồi, Kafka cho domain event bất đồng bộ.                                                                             | Giữ decision framework 4P+2AP để tránh overuse Kafka.                                                                                  |
| Kafka topics             | Proposal nhắc `order.created`, `kitchen.order-ready` và event flow rộng.               | Dùng topic registry hiện tại: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.                                                                                | UI events dùng BFF Direct/Redis hints. Không invent Kafka topics trong báo cáo.                                                        |
| Stock/race condition     | Proposal thiên về Kafka partitioning như cách chính để xử lý race condition.           | Viết stock consistency do Catalog sở hữu, xử lý bằng transactional stock deduction tại thời điểm staff confirm; cart dùng Redis version/idempotency.                                                                  | Kafka decouple KDS/payment side effects, không thay thế transaction boundary của stock.                                                |
| Multi-tenancy model      | Proposal đôi lúc mô tả shared database/shared schema theo nghĩa toàn cục.              | Viết mô hình kết hợp: database-per-service và discriminator column `tenant_id` trong từng service database.                                                                                                           | Nếu sau này schema/db thay đổi, cập nhật mục multi-tenancy và ERD.                                                                     |
| Menu realtime            | Proposal có chỗ nói menu/status cập nhật real-time cho customer UI.                    | Viết cache/query invalidation và refetch; không claim có `menu.updated` WebSocket contract nếu chưa implement.                                                                                                        | Nếu sau này thêm menu realtime, cập nhật Kafka/WebSocket registry.                                                                     |
| Dashboard/reporting      | Các draft khóa luận trước 2026-06-01 chưa có technical Phase 4D Dashboard & Reporting. | Khi backfill, viết dashboard/reporting như feature hiện tại: tenant dashboard bị plan-gated theo feature entitlement; Super Admin analytics dùng permission cross-tenant và không bị plan-gated bởi tenant được chọn. | Cần cập nhật Chương 3-6, Bảng 5.1/Bảng 6.x và screenshot backlog trước khi nộp bản cuối; không dùng placeholder như evidence thật.     |
| Vai trò WebSocket        | Một số mô tả cũ dễ làm người đọc hiểu WebSocket là trạng thái authoritative.           | Viết WebSocket là realtime notification/invalidation hint; REST/DB vẫn là source of truth.                                                                                                                            | Đây là điểm cần giữ nhất quán trong Chương 4, 5, 6.                                                                                    |
| Performance evaluation   | Proposal đặt mục tiêu benchmark throughput/latency và so sánh baseline.                | Chỉ đưa benchmark vào Chương 6 nếu có số liệu thật. Nếu chưa có, đánh giá bằng traceability, functional validation, E2E/demo và phân tích kiến trúc.                                                                  | Không tự tạo số liệu throughput/latency.                                                                                               |
| Deployment/observability | Proposal có kế hoạch Grafana/Loki/Prometheus/Tempo và deployment.                      | Có thể viết như thiết kế quan sát/vận hành đề xuất hoặc demo-limited; không claim production-grade observability nếu chưa có dashboard, trace/log evidence và quy trình deploy ổn định.                               | Phase 6/7 cần backfill artifact sau nếu implement.                                                                                     |
| Tên service              | Proposal dùng Auth Service và Notification Service.                                    | Với auth, viết theo implementation hiện tại: Authorizer + User-Access + Keycloak. Với Notification, chỉ mô tả khi quyết định đưa vào kiến trúc hoàn thiện hoặc future scope.                                          | Dùng service names thống nhất trong diagram, bảng ownership và source code references.                                                 |

## 7. Cấu trúc khóa luận đề xuất

### Chương 1. Mở đầu

Vai trò: Thiết lập bối cảnh, bài toán, động lực nghiên cứu, mục tiêu, phạm vi và đóng góp của đề tài.

Nguồn nên dùng:

- Thesis proposal.
- Research survey notes về F&B Việt Nam, SaaS POS, QR ordering, cashless/VietQR.
- Hạn chế đi sâu implementation; chi tiết hệ thống để ở các chương sau.

Các mục đề xuất:

1. Bối cảnh và động lực thực tiễn.
2. Phát biểu bài toán.
3. Mục tiêu nghiên cứu và mục tiêu xây dựng hệ thống.
4. Phạm vi và giới hạn đề tài.
5. Phương pháp thực hiện.
6. Đóng góp của đề tài.
7. Cấu trúc báo cáo.

### Chương 2. Cơ sở lý thuyết và các công trình liên quan

Vai trò: Cung cấp nền tảng học thuật trước khi trình bày hệ thống QRTable.

Nguồn nên dùng:

- Research survey notes.
- References trong proposal.
- Các quyết định kiến trúc hiện tại chỉ dùng làm ví dụ kết nối, chưa xem là phần chứng minh.

Các mục đề xuất:

1. POS và QR code ordering trong lĩnh vực F&B.
2. SaaS và multi-tenancy.
3. Kiến trúc microservices.
4. Event-driven architecture và Kafka.
5. Data consistency, idempotency và distributed transaction patterns.
6. Real-time communication với WebSocket.
7. Authentication, authorization và tenant isolation.
8. Các hệ thống liên quan và khoảng trống nghiên cứu.

### Chương 3. Phân tích yêu cầu

Vai trò: Kết nối bài toán nghiên cứu với một hệ thống cụ thể cần xây dựng.

Nguồn nên dùng:

- `docs/business-logic.md`.
- `docs/architecture/permission-matrix.md`.
- Phase docs cho accepted business behavior.

Các mục đề xuất:

1. Actors và ngữ cảnh sử dụng.
2. Functional requirements theo domain: onboarding, catalog, QR session, order, kitchen, payment, SaaS management.
3. Non-functional requirements: tenant isolation, realtime, consistency, security, maintainability, testability.
4. Business state machines: table, session/order, bill/payment.
5. Phạm vi loại trừ.

### Chương 4. Thiết kế kiến trúc và quyết định công nghệ cho QRTable

Vai trò: Giải thích vì sao chọn kiến trúc/công nghệ hiện tại, các thành phần phối hợp với nhau như thế nào và những đánh đổi nào cần trình bày thận trọng.

Nguồn nên dùng:

- `docs/technical-architecture.md`.
- `docs/guides/codebase-reading-map.md`.
- `docs/DOC-CODE-ANCHORS.md`.

Các mục đề xuất:

1. Mục tiêu thiết kế và nguyên tắc kiến trúc.
2. Lựa chọn công nghệ và vai trò trong QRTable.
3. Kiến trúc tổng thể và bản đồ tích hợp công nghệ.
4. Tổ chức Nx monorepo và ranh giới module.
5. Service boundaries và data ownership.
6. Chiến lược multi-tenancy.
7. Thiết kế giao tiếp: HTTP, TCP, gRPC, Kafka, WebSocket và webhook.
8. Kafka decision framework và topic registry.
9. Redis/cache/session/KDS ownership.
10. Security/RBAC và QR session.
11. SePay/VietQR payment architecture.
12. Kiến trúc payment với SePay/VietQR.
13. Các trade-off kiến trúc quan trọng.

### Chương 5. Triển khai hệ thống

Vai trò: Chứng minh hệ thống đã được xây dựng, nhưng tránh biến chương này thành walkthrough source code.

Nguồn nên dùng:

- Source code hiện tại.
- Phase records.
- Chỉ trích dẫn code ở các cơ chế implementation quan trọng.

Các mục đề xuất:

1. Tổng quan triển khai backend.
2. Tổng quan triển khai frontend.
3. Triển khai QR session và shared cart.
4. Triển khai order confirmation và stock consistency.
5. Triển khai KDS realtime flow.
6. Triển khai payment settlement flow.
7. Triển khai SaaS onboarding và tenant lifecycle.
8. Shared libraries và contracts.
9. Tổng hợp các cơ chế kỹ thuật nổi bật và bài học triển khai.

### Chương 6. Đánh giá

Vai trò: Đánh giá khách quan dựa trên bằng chứng hiện có.

Nguồn nên dùng:

- `docs/testing/phase-5/traceability-matrix.md`.
- `docs/testing/phase-5/phase-5-handoff.md`.
- Unit/contract/E2E tests và demo scripts.

Các mục đề xuất:

1. Chiến lược đánh giá.
2. Requirement traceability.
3. Functional validation theo core flow.
4. Architecture validation: tenant isolation, Kafka registry, Redis access policy, RBAC.
5. Demo/E2E validation.
6. Giới hạn của quá trình đánh giá.
7. Thảo luận kết quả.

### Chương 7. Kết luận và hướng phát triển

Vai trò: Kết thúc mạch nghiên cứu mà không phóng đại kết quả. Khi viết bản chính thức, nên tách rõ hai tiểu mục “Kết luận” và “Hướng phát triển” để khớp phụ lục hình thức trình bày.

Các mục đề xuất:

1. Tóm tắt kết quả đạt được.
2. Đóng góp kỹ thuật và thực tiễn.
3. Hạn chế.
4. Hướng phát triển: benchmark sâu hơn, offline queue, production security hardening, mở rộng deployment/observability và các tích hợp vận hành nâng cao.

## 8. Diagram, bảng và artifact nên sử dụng

Nên ưu tiên nhiều diagram/bảng hơn thay vì chỉ viết mô tả bằng chữ. Diagram giúp hội đồng nhìn được cấu trúc hệ thống, flow vận hành và ranh giới trách nhiệm giữa các service.

Khi đưa diagram/bảng/screenshot vào bản khóa luận chính thức, mỗi artifact phải có caption, số hiệu theo chương và nguồn. Với artifact tự dựng từ code/docs, ghi nguồn theo hướng “tác giả xây dựng từ source code/tài liệu thiết kế”; với screenshot giao diện, ghi rõ “ảnh chụp màn hình hệ thống QRTable”; với hình hoặc bảng lấy từ tài liệu bên ngoài, phải trích nguồn IEEE tương ứng.

### Phân bổ diagram, bảng và artifact theo chương

Không nên dồn toàn bộ diagram, bảng và screenshot vào một chương. Mỗi loại artifact cần phục vụ một vai trò lập luận khác nhau:

| Chương                          | Nên dùng loại artifact nào                                                                                                                                              | Mục đích trong lập luận                                                                                                      |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| Chương 1. Mở đầu                | Bảng/tóm tắt bối cảnh thị trường; sơ đồ vấn đề thủ công -> QR ordering -> POS/KDS/payment.                                                                              | Làm rõ bài toán đáng nghiên cứu và nhu cầu thực tế. Không đi sâu implementation.                                             |
| Chương 2. Cơ sở lý thuyết       | Bảng định nghĩa/so sánh: SaaS vs on-premise, monolith vs microservices, sync vs async, các mô hình multi-tenancy; sơ đồ khái niệm nếu cần.                              | Giải thích nền tảng học thuật bằng nguồn tham khảo bên ngoài. Không dùng screenshot hệ thống QRTable ở chương này.           |
| Chương 3. Phân tích yêu cầu     | Actor/use-case diagram; bảng functional requirements; bảng non-functional requirements; state machine table/session/order/payment; business flow diagram.               | Chuyển từ bài toán thực tế sang yêu cầu hệ thống cụ thể.                                                                     |
| Chương 4. Thiết kế và kiến trúc | Overall architecture; C4/container diagram; service ownership; data ownership; communication matrix; multi-tenancy isolation; Kafka decision flow; deployment topology. | Chứng minh lựa chọn kiến trúc, ranh giới service và trade-off kỹ thuật.                                                      |
| Chương 5. Triển khai hệ thống   | Sequence diagram cho QR order, order confirmation, KDS, payment settlement, SaaS onboarding; bảng source-code evidence; screenshot đại diện cho các flow chính.         | Chứng minh hệ thống đã được hiện thực hóa, nhưng tránh biến chương này thành gallery giao diện hoặc walkthrough source code. |
| Chương 6. Đánh giá              | Requirement traceability matrix; test result table; architecture validation matrix; performance/NFR result table nếu có đo; screenshot test run/Grafana/demo nếu có.    | Đánh giá khách quan dựa trên bằng chứng. Đây là nơi đặt kết quả kiểm thử, đo đạc và kiểm chứng non-functional requirements.  |
| Chương 7. Kết luận              | Bảng tổng hợp đóng góp, hạn chế và hướng phát triển nếu cần.                                                                                                            | Kết thúc lập luận, không thêm artifact chi tiết trừ khi giúp tổng kết rõ hơn.                                                |
| Phụ lục                         | UI gallery đầy đủ, GitHub/release/commit hash, demo domain, video demo link, seed/demo script, log/test output quan trọng.                                              | Giữ bằng chứng lâu dài mà không làm chương chính bị loãng.                                                                   |

Quy tắc thực tế: Chương 5 chỉ nên chọn screenshot tiêu biểu cho các luồng chính; phụ lục mới là nơi chứa nhiều screenshot đầy đủ. Chương 6 có thể dùng screenshot khi nó là bằng chứng đánh giá, ví dụ kết quả test, trace dashboard, health check hoặc demo checklist.

Danh sách artifact trong outline nên được hiểu là mức tối thiểu và backlog phân tầng, không phải giới hạn tối đa. Với bản khóa luận mục tiêu trên 100 trang, chương chính có thể dùng khoảng 35-50 artifact nếu mỗi artifact phục vụ một claim rõ ràng; phụ lục có thể chứa thêm khoảng 35-70 screenshot/demo artifact theo user journey. Tránh dùng số lượng hình ảnh để kéo dài báo cáo: artifact trong chương chính phải giúp giải thích bài toán, kiến trúc, triển khai hoặc đánh giá; artifact chỉ có vai trò lưu bằng chứng nên đưa xuống phụ lục.

### Diagram kiến trúc

- Overall architecture diagram: Client -> BFF -> services -> infrastructure.
- Service ownership table.
- Communication matrix: HTTP/TCP/gRPC/Kafka/WebSocket/Webhook.
- Kafka topic registry table.
- Deployment topology diagram: domain/public URL -> BFF -> services -> provider stack.
- Observability diagram: services -> logs/metrics/traces -> Grafana/Loki/Prometheus/Tempo.
- Multi-tenancy isolation diagram: tenant -> service DB -> `tenant_id` -> cache/event/file boundary.
- Data ownership matrix: service nào sở hữu database/table/cache/event nào.

### Diagram nghiệp vụ và sequence flow

- Table/session/order/payment state machines.
- QR ordering sequence diagram.
- Order confirm và stock consistency sequence diagram.
- Payment SePay/VietQR sequence diagram.
- Customer session lifecycle diagram.
- Staff POS confirmation flow.
- Kitchen KDS ticket lifecycle diagram.
- Table transfer / safe empty-session release flow.
- SaaS onboarding flow: Super Admin -> SaaS -> Authorizer/User-Access/Payment settings.
- Subscription checkout flow: Owner -> SaaS invoice -> SePay webhook -> subscription activation.
- Tenant suspend/activate behavior flow.

### Bảng tổng hợp

- RBAC actor/permission summary table.
- Requirement traceability table cho chương đánh giá.
- Functional requirements table theo actor.
- Non-functional requirements table theo kiến trúc.
- Technology decision table: technology, vai trò, lý do chọn.
- Implemented evidence table: tính năng, source code/docs/tests/screenshot.
- Evaluation matrix: yêu cầu, phương pháp kiểm chứng, bằng chứng, kết quả.

### Screenshot và artifact giao diện

Không nên chỉ để link domain website. Domain có thể hết hạn hoặc không còn deploy sau khi bảo vệ, làm báo cáo mất bằng chứng trực quan. Nên có ít nhất ba lớp artifact:

1. Link GitHub repository của dự án, tốt nhất kèm commit hash hoặc release/tag dùng cho bản nộp.
2. Link demo domain nếu còn hoạt động, nhưng xem đây là phụ trợ, không phải bằng chứng duy nhất.
3. Screenshot các màn hình chính, lưu trực tiếp trong repo hoặc phụ lục báo cáo để tài liệu vẫn tự chứa được nội dung sau này.

Nên chụp screenshot theo nhóm, không cần nhồi tất cả vào chương chính. Chương chính chỉ cần các màn hình đại diện; phụ lục có thể chứa UI gallery đầy đủ hơn.

Với Phase 5D, workflow dùng chế độ scaffold/manual capture handoff: agent tạo mapping, placeholder trắng và LaTeX refs trước; người viết thay screenshot thật thủ công sau. Placeholder không phải evidence và không được dùng để claim demo đã kiểm chứng.

Vị trí đưa artifact vào báo cáo nên chia theo hai tầng:

- Trong Chương 5: đưa các screenshot đại diện cho những flow chính để chứng minh hệ thống đã có giao diện và luồng vận hành cụ thể, ví dụ customer ordering, staff POS, KDS, payment và owner/admin management.
- Trong Chương 6 hoặc phụ lục: đưa bảng demo evidence gồm GitHub link, commit/release, demo domain nếu còn hoạt động, danh sách screenshot, video demo nếu có, và kết quả kiểm thử liên quan.
- Trong phụ lục: đặt UI gallery đầy đủ hơn để tránh làm chương chính bị loãng bởi quá nhiều hình ảnh.

Nhóm screenshot nên có:

- Landing/public overview nếu có dùng để giới thiệu nền tảng.
- Customer PWA: scan/join session, menu, cart, order tracking, request payment/VietQR.
- Staff POS: live orders, order detail, confirm/cancel, table map, bill settlement.
- KDS: kitchen queue, bar queue, ticket status, SLA/priority nếu có.
- Owner dashboard: menu management, table/QR management, subscription, payment settings.
- Super Admin: tenant onboarding, tenant lifecycle, pricing plans, billing/subscription invoices.
- Auth/Keycloak login hoặc role-based routing nếu cần minh họa security flow.
- Observability/deployment screens nếu Phase 6/7 được triển khai: Grafana dashboard, logs/traces, health checks.

Nên lưu artifact theo hướng ổn định trong LaTeX project, ví dụ:

- `docs/graduation-thesis-resources/thesis-report/assets/figures/`
- `docs/graduation-thesis-resources/thesis-report/assets/screenshots/`
- `docs/graduation-thesis-resources/thesis-report/assets/diagrams/`
- `docs/graduation-thesis-resources/thesis-report/appendices/`

Nên tái sử dụng tài nguyên hiện có khi phù hợp:

- `docs/architecture/erd.png`
- `docs/architecture/erd.mmd`
- `docs/presentations/qrtable-thesis-slide-brief.md`
- `docs/presentations/qrtable-architecture-presentation-script.md`

## 9. Chiến lược nguồn tham khảo và trích dẫn

Chương 2 và các đoạn định nghĩa/cơ sở lý thuyết không nên dựa chủ yếu vào blog phổ thông hoặc tài liệu nội bộ của QRTable. Tài liệu nội bộ dùng để chứng minh “hệ thống đã thiết kế/triển khai như thế nào”, còn nguồn bên ngoài dùng để chứng minh “khái niệm này được hiểu trong ngành như thế nào”.

### Phân tầng nguồn nên dùng

| Loại nội dung                           | Nguồn ưu tiên                                                                                                                                                                        | Cách dùng trong khóa luận                                                                                                            |
| --------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------ |
| Định nghĩa cloud/SaaS                   | NIST SP 800-145: The NIST Definition of Cloud Computing.                                                                                                                             | Dùng làm nguồn chuẩn cho SaaS, on-demand self-service, resource pooling, rapid elasticity, measured service.                         |
| Chất lượng phần mềm/NFR                 | ISO/IEC 25010: Systems and software Quality Requirements and Evaluation.                                                                                                             | Dùng để phân loại performance efficiency, reliability, security, maintainability, usability, portability.                            |
| Đánh giá kiến trúc                      | SEI/CMU ATAM; sách Software Architecture in Practice nếu có thể trích từ thư viện/Google Books.                                                                                      | Dùng để giải thích vì sao đánh giá kiến trúc phải dựa trên quality attributes và trade-off, không chỉ dựa trên test pass/fail.       |
| Microservices                           | Martin Fowler & James Lewis; Microsoft Azure Architecture Center; sách Building Microservices hoặc Microservices Patterns nếu có.                                                    | Dùng cho khái niệm service nhỏ, độc lập triển khai, bounded context, database ownership và trade-off về complexity.                  |
| SaaS multi-tenancy                      | AWS Well-Architected SaaS Lens; Microsoft/Azure SaaS architecture guidance; tài liệu cloud architecture uy tín.                                                                      | Dùng cho tenant, tenant isolation, pooled/silo/bridge model, noisy neighbor, tenant-aware operations.                                |
| Event-driven/Kafka                      | Apache Kafka official documentation; sách Designing Event-Driven Systems hoặc Enterprise Integration Patterns nếu có.                                                                | Dùng cho topic, partition, consumer group, ordering, async decoupling, event streaming.                                              |
| WebSocket/real-time                     | RFC 6455 WebSocket Protocol; Socket.IO docs chỉ dùng khi nói implementation cụ thể.                                                                                                  | Dùng để giải thích realtime bidirectional communication; tránh claim WebSocket là source of truth.                                   |
| Security/Auth                           | OWASP ASVS; OAuth 2.0/OIDC specs hoặc Keycloak docs khi nói implementation; Nghị định 13/2023/NĐ-CP nếu nói dữ liệu cá nhân tại Việt Nam.                                            | Dùng cho tenant isolation, authentication, authorization, webhook verification và security checklist.                                |
| Observability/SRE                       | Google SRE Book về SLI/SLO; OpenTelemetry docs; Prometheus/Grafana docs khi nói implementation.                                                                                      | Dùng cho latency, availability, error rate, traces/logs/metrics.                                                                     |
| Bối cảnh thị trường F&B/POS/QR ordering | Báo cáo iPOS.vn/Nestlé Professional, báo cáo ngành, tài liệu sản phẩm chính thức của iPOS/KiotViet/Sapo, bài báo học thuật về digital menu/QR ordering nếu có.                       | Dùng cho Chương 1 và phần công trình/hệ thống liên quan, không dùng làm nguồn định nghĩa kiến trúc phần mềm nếu có nguồn chuẩn hơn.  |
| Công trình liên quan                    | Google Scholar, IEEE Xplore, ACM Digital Library, SpringerLink, ScienceDirect; ưu tiên paper/review/conference/journal, sau đó thesis/dissertation, cuối cùng mới tới blog kỹ thuật. | Dùng để so sánh cách các nghiên cứu/hệ thống khác xử lý POS, QR ordering, self-service restaurant, SaaS/multi-tenancy/microservices. |
| Hiện trạng QRTable                      | Source code, tests, `docs/technical-architecture.md`, `docs/business-logic.md`, phase records, traceability matrix.                                                                  | Dùng cho Chương 3, 4, 5, 6. Không dùng để định nghĩa khái niệm phổ quát.                                                             |

Các research survey hiện có trong repo nên được xem là bản nháp tổng hợp. Khi viết Chương 2, cần quay lại nguồn gốc trong danh mục tài liệu tham khảo của survey, loại bỏ nguồn yếu, và thay bằng nguồn chuẩn nếu có. Blog kỹ thuật có thể dùng để minh họa thực tiễn, nhưng không nên là nguồn chính cho định nghĩa học thuật.

Nguồn tham khảo nền tảng nên kiểm tra khi viết:

- [NIST SP 800-145: The NIST Definition of Cloud Computing](https://csrc.nist.gov/pubs/sp/800/145/final)
- [ISO/IEC 25010:2023 product quality model](https://www.iso.org/standard/78176.html)
- [CMU/SEI Architecture Tradeoff Analysis Method](https://www.sei.cmu.edu/library/the-architecture-tradeoff-analysis-method/)
- [Martin Fowler: Microservices Guide](https://www.martinfowler.com/microservices/)
- [Microsoft Azure Architecture Center: Microservices architecture style](https://learn.microsoft.com/azure/architecture/microservices/)
- [AWS Well-Architected SaaS Lens](https://docs.aws.amazon.com/wellarchitected/latest/saas-lens/saas-lens.html)
- [OWASP Application Security Verification Standard](https://owasp.org/www-project-application-security-verification-standard/)
- [Google SRE Book: Service Level Objectives](https://sre.google/sre-book/service-level-objectives/)

## 10. Cách đánh giá kiến trúc và yêu cầu phi chức năng

Không nên xem toàn bộ Chương 6 là “testing” theo nghĩa hẹp. Testing chủ yếu trả lời câu hỏi “hệ thống có đúng yêu cầu chức năng và contract không?”. Trong khi đó, đánh giá kiến trúc và non-functional requirements cần thêm các bằng chứng khác.

### Evaluation Claim Policy

Khi viết Chương 6, cần phân biệt ba mức claim:

| Mức claim                          | Được phép viết khi nào?                                                                                                                    | Cách diễn đạt an toàn                                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Đã kiểm chứng bằng test/demo       | Có test result, traceability matrix, screenshot, command output hoặc demo artifact cụ thể.                                                 | “Kết quả kiểm thử cho thấy flow X hoạt động đúng trong môi trường demo/kiểm thử đã chuẩn bị.”                                              |
| Được hỗ trợ bởi thiết kế/kiến trúc | Có service boundary, source-code evidence, dependency graph, communication matrix hoặc scenario analysis, nhưng chưa có benchmark tải lớn. | “Thiết kế hiện tại hỗ trợ khả năng mở rộng/bảo trì ở mức kiến trúc thông qua việc tách service, sở hữu dữ liệu riêng và contract rõ ràng.” |
| Định hướng/hạn chế cần phát triển  | Chưa có implementation hoặc chưa có bằng chứng chạy thực tế.                                                                               | “Đây là hướng hoàn thiện tiếp theo; báo cáo không xem đây là kết quả đã kiểm chứng.”                                                       |

Không dùng các cụm như “đáp ứng tải lớn”, “sẵn sàng production”, “tự động mở rộng đã được chứng minh”, “observability đầy đủ” hoặc “high availability” nếu chỉ có server nhỏ, demo thủ công, unit/contract tests và phân tích kiến trúc.

### Evidence Status by Evaluation Area

| Nhóm đánh giá                 | Trạng thái bằng chứng hiện tại                                                                                                               | Cách viết trong khóa luận                                                                               |
| ----------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Functional correctness        | Mạnh hơn: có unit/contract/integration/E2E cho nhiều flow trọng yếu.                                                                         | Có thể trình bày là đã kiểm chứng theo traceability và demo scenario.                                   |
| Architecture correctness      | Mạnh hơn: có docs, source code, static architecture tests, topic/Redis policy evidence.                                                      | Có thể trình bày là kiến trúc được kiểm chứng bằng code evidence và contract tests.                     |
| Performance efficiency        | Hạn chế: chưa có benchmark tải lớn; server demo nhỏ không đại diện production.                                                               | Chỉ mô tả phương pháp/metric đề xuất hoặc kết quả đo nhỏ nếu sau này có chạy smoke benchmark.           |
| Scalability                   | Hạn chế về thực nghiệm; có thể chứng minh bằng kiến trúc tách service, stateless edge, Kafka/Redis/PostgreSQL boundary và deployment design. | Viết là “hỗ trợ khả năng mở rộng về mặt thiết kế”, không viết “đã chứng minh scale dưới tải lớn”.       |
| Maintainability/modifiability | Có thể đánh giá bằng service ownership, Nx monorepo, shared contracts, bounded contexts và change scenarios.                                 | Viết theo scenario analysis, ví dụ thêm payment method hoặc thêm consumer Kafka mới.                    |
| Observability/deployment      | Hiện là thiết kế/demo-limited nếu chưa có dashboard/trace/log artifact đầy đủ.                                                               | Viết như phương án hỗ trợ vận hành và hướng hoàn thiện; chỉ claim đã demo nếu có screenshot/log cụ thể. |

Nên chia Chương 6 thành các nhóm đánh giá:

| Nhóm đánh giá                 | Câu hỏi chính                                                                                           | Bằng chứng có thể dùng                                                                                                                                |
| ----------------------------- | ------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Functional validation         | Các flow nghiệp vụ chính có chạy đúng không?                                                            | Unit/contract/integration/E2E tests, requirement traceability matrix, demo checklist.                                                                 |
| Architecture validation       | Service boundary, data ownership, tenant isolation, Kafka/Redis/WebSocket usage có đúng thiết kế không? | Static architecture tests, communication matrix, source-code evidence, topic registry tests, Redis access policy tests.                               |
| Performance efficiency        | Các flow quan trọng phản hồi trong bao lâu trong môi trường demo hoặc benchmark giới hạn?               | Nếu có điều kiện: đo nhỏ bằng k6/JMeter/Artillery; p50/p95/p99 latency; throughput; error rate; resource usage. Nếu không, chỉ nêu phương pháp đo.    |
| Scalability                   | Thiết kế hiện tại hỗ trợ scale theo chiều ngang/chiều dọc ở những điểm nào, và chưa chứng minh được gì? | Service boundary, stateless BFF/service candidates, Kafka consumer group, Redis/PostgreSQL bottleneck notes; không claim scale thực nghiệm tải lớn.   |
| Reliability/resilience        | Hệ thống xử lý duplicate request, retry, webhook lặp, reconnect hoặc lỗi tạm thời thế nào?              | Idempotency tests, duplicate webhook tests, reconnect/refetch E2E, outbox/idempotent replay evidence.                                                 |
| Security/tenant isolation     | Người dùng/tenant có bị truy cập sai dữ liệu hoặc quyền không?                                          | Permission matrix, tenant A/B tests, guard tests, ASVS-inspired checklist, webhook HMAC/secret verification evidence nếu có.                          |
| Maintainability/modifiability | Kiến trúc có giúp thay đổi theo domain mà không ảnh hưởng lan rộng không?                               | Service ownership table, Nx dependency graph, shared library contracts, test coverage/traceability, scenario analysis như “thêm payment method mới”.  |
| Observability/deployment      | Hệ thống có phương án quan sát/tái lập demo ở mức nào?                                                  | Docker compose, health checks, logs/metrics/traces/Grafana screenshots nếu có, demo script, seed data; phân biệt rõ demo-limited và production-grade. |

Với đề tài này, phần response time/scalability nên được đặt trong Chương 6, mục “Đánh giá yêu cầu phi chức năng” hoặc “Đánh giá hiệu năng và khả năng mở rộng”. Nếu chưa có số liệu thật, không tự tạo số liệu. Có thể viết phương pháp đánh giá, giới hạn môi trường demo và nêu rằng bản hiện tại đánh giá scalability chủ yếu bằng architecture/code evidence, không phải stress test hay benchmark tải lớn.

Các metric nên đo nếu sau này có thời gian và hạ tầng benchmark:

- QR menu load: p50/p95/p99 response time, cache hit/miss nếu đo được.
- Cart mutation/order submit: latency, conflict rate khi có concurrent mutation, error rate.
- Staff confirm + stock deduction: latency, tỷ lệ xử lý thành công khi nhiều order tranh stock.
- KDS propagation: thời gian từ `order.confirmed` đến ticket xuất hiện ở KDS, Kafka consumer lag nếu có.
- Payment finalization: thời gian từ webhook/mock settlement đến bill/order/session/table state được cập nhật.
- WebSocket push: thời gian từ event server-side đến client nhận hint và refetch snapshot.
- Resource usage: CPU, memory, PostgreSQL/Redis/Kafka load trong thời gian test.

Maintainability không đo bằng tốc độ phản hồi. Nên đánh giá bằng scenario và bằng chứng kiến trúc, ví dụ: “thêm một phương thức thanh toán mới” chủ yếu ảnh hưởng Payment Service, BFF route/DTO và UI payment settings; không làm Catalog/Kitchen phải đổi database. Cách đánh giá này hợp với ATAM/quality-attribute scenario hơn là load testing.

## 11. Checkpoint trước khi viết từng chương

Trước khi draft một chương, kiểm tra nhanh:

1. Chương này dựa trên nguồn nào: proposal, docs, code, tests hay research notes?
2. Chương này đang nói về định hướng ban đầu, implementation hiện tại hay future work?
3. Có ghi chú nội bộ nào trong mục 6 ảnh hưởng đến chương này không?
4. Câu chữ có đang overclaim production readiness, performance hoặc completeness không?
5. Mỗi claim kỹ thuật quan trọng có được chống lưng bằng file path hoặc accepted documentation không?
6. Nếu chương có nhắc phần chưa backfill implementation, cần ghi chú nội bộ để agent sau cập nhật bằng chứng khi phần đó hoàn tất.

Workflow tiếp theo nên làm:

1. Chốt mục lục khóa luận chính thức theo hướng bản báo cáo hoàn chỉnh.
2. Tạo danh sách diagram cần vẽ/chụp cho từng chương.
3. Quyết định Chương 6 có benchmark data hay chỉ dùng traceability/demo evaluation.
4. Draft Chương 1 và Chương 3 trước vì hai chương này cố định phạm vi.
5. Draft Chương 4 từ canonical architecture docs.
6. Draft Chương 5 từ phase records và source code được chọn lọc.
7. Chuẩn bị screenshot/UI appendix và GitHub/demo artifact.
8. Draft Chương 6 sau khi chốt bằng chứng đánh giá cuối cùng.
