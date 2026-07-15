# Khung mục lục chính thức cho khóa luận QRTable

> Tài liệu làm việc phục vụ viết bản khóa luận tiếng Việt.
> Ngày lập: 2026-05-28.
> Nguồn nền: `thesis-evidence-map.md`, `presentation-format-graduation-thesis.md`, `docs/README.md`, `docs/technical-architecture.md`, `docs/business-logic.md`, `docs/testing/traceability-matrix.md`.
> Nếu tiếp tục công việc sau khi mất/compact context, đọc `thesis-workflow-plan.md` trước.

## 1. Mục đích tài liệu

Tài liệu này là bản khung chính thức để chuyển từ bản đồ bằng chứng sang quá trình viết khóa luận. Vai trò của tài liệu là chốt cấu trúc chương, phạm vi nội dung, page budget, artifact cần chuẩn bị, nguồn tham khảo chính và các checkpoint trước khi viết từng chương.

Tài liệu này không phải bản khóa luận hoàn chỉnh. Khi bắt đầu viết từng chương, cần quay lại `thesis-evidence-map.md` để kiểm tra nguồn bằng chứng, trạng thái implementation nội bộ và chính sách tránh overclaim.

Ghi chú cập nhật 2026-06-01: technical docs đã bổ sung Phase 4D kỹ thuật về Dashboard & Reporting và Phase 4D.1 về dashboard entitlement/UI polish. Outline này giữ vai trò chỉ dẫn report; sau Plan A và Plan B ngày 2026-06-04, phần còn lại trước bản nộp cuối tập trung vào Chương 1, Abstract/phụ lục, screenshot/demo thật và artifact production/pilot nếu có.

Ghi chú sync 2026-06-04: Chương 3 đã backfill yêu cầu Dashboard/Reporting và staff management, đổi tên thành `Từ vận hành F&B đến yêu cầu hệ thống QRTable`, cập nhật Hình 3.1 và build LaTeX pass. Chương 4 đã được polish theo hướng `Thiết kế kiến trúc và quyết định công nghệ cho QRTable`, bổ sung bảng quyết định công nghệ, bảng thiết kế dữ liệu theo ranh giới dịch vụ và Hình 4.1-4.10. Chương 5 đã đổi hướng thành `Hiện thực các luồng vận hành cốt lõi của QRTable`, gộp evidence theo luồng ở Bảng 5.1 và bỏ bảng shared libraries độc lập. Plan B/Chương 6-7 đã được audit/rerun sau Plan A: Chương 6 đổi thành `Kiểm chứng và đánh giá hệ thống QRTable`, phản ánh Dashboard/Reporting, entitlement, production/pilot claim policy và tham chiếu trực tiếp tới Bảng 4.3/4.4/4.5, Hình 5.1-Hình 5.5, Bảng 5.1; Chương 7 đã có nội dung kết luận/hướng phát triển thật. Phần còn lại trước bản nộp cuối là Chương 1, Abstract/phụ lục, screenshot/demo thật và artifact production/pilot nếu có.

## 2. Nguyên tắc viết khóa luận

1. Viết bằng tiếng Việt học thuật, rõ ràng và mạch lạc; giữ các thuật ngữ kỹ thuật tiếng Anh khi thuật ngữ đó là chuẩn ngành hoặc giúp diễn đạt chính xác hơn, ví dụ `SaaS`, `POS`, `microservices`, `service boundary`, `Kafka`, `WebSocket`, `tenant isolation`, `idempotency`.
2. Trình bày QRTable như một hệ thống được nghiên cứu, thiết kế và xây dựng hoàn chỉnh theo mục tiêu đề tài; không viết theo kiểu nhật ký “proposal nói A, implementation đổi sang B”.
3. Thesis proposal chỉ dùng cho tên đề tài, động lực ban đầu, phạm vi nghiên cứu và bối cảnh; source code, tests và canonical docs là nguồn chính khi viết về hệ thống thực tế.
4. Không đưa nguyên văn các ghi chú nội bộ như `TODO`, `deferred`, `implementation-gap`, `Phase X chưa làm` vào bản gửi giảng viên, trừ khi trình bày trong mục hạn chế/hướng phát triển với ngôn ngữ học thuật.
5. Chương đánh giá phải phân biệt rõ ba mức claim: đã kiểm chứng bằng test/demo, được hỗ trợ bởi thiết kế/kiến trúc, và định hướng cần phát triển tiếp.
6. Không tự tạo số liệu benchmark, throughput, latency, khả năng chịu tải, production readiness hoặc observability nếu chưa có bằng chứng thật.
7. Mỗi hình, bảng, sơ đồ và screenshot trong bản chính thức phải có số hiệu theo chương, caption và nguồn.

## 3. Ràng buộc hình thức cần tuân thủ

Nguồn hình thức: `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md`.

### 3.1 Thành phần trước nội dung chính

- Bìa chính khóa luận.
- Bìa phụ khóa luận.
- Thông tin hội đồng chấm khóa luận tốt nghiệp.
- Lời cảm ơn.
- Mục lục.
- Danh mục hình.
- Danh mục bảng.
- Danh mục từ viết tắt.
- Tóm tắt khóa luận/Abstract dài khoảng 1-2 trang.

Danh mục từ viết tắt chỉ nên đưa các thuật ngữ xuất hiện nhiều trong khóa luận. Không đưa các cụm dài hoặc thuật ngữ chỉ xuất hiện một vài lần.

### 3.2 Độ dài dự kiến

Nội dung chính nên có tối thiểu khoảng 50 trang A4. Quy định hình thức khuyến nghị không vượt quá 100 trang, nhưng theo định hướng từ giảng viên hướng dẫn và tham khảo nhiều báo cáo khóa luận tốt nghiệp trước đây, bản khóa luận có thể và nên vượt 100 trang nếu nội dung cần đủ chiều sâu học thuật, thiết kế, triển khai và đánh giá.

Mục tiêu thực tế cho bản nháp đầu: khoảng 105-130 trang nội dung chính. Độ dài này giúp có đủ không gian cho cơ sở lý thuyết, related work, phân tích yêu cầu, kiến trúc, triển khai, diagram, bảng đánh giá và bàn luận kết quả. Tuy nhiên, phần vượt 100 trang cần đến từ nội dung có giá trị, không phải do lặp ý, nhồi screenshot hoặc đưa quá nhiều chi tiết code-level vào chương chính.

### 3.3 Tài liệu tham khảo

- Dùng chuẩn IEEE.
- Danh mục tài liệu tham khảo chỉ bao gồm tài liệu thật sự được trích dẫn, sử dụng hoặc bàn luận trong khóa luận.
- Theo yêu cầu hình thức hiện có, cần tách riêng tài liệu tiếng Việt và tiếng Anh, đồng thời sắp xếp theo thứ tự alphabet tên tác giả/tài liệu.
- Không dùng blog phổ thông làm nguồn chính cho định nghĩa học thuật nếu có chuẩn, sách, paper hoặc tài liệu chính thống tốt hơn.

## 4. Mapping với khung bắt buộc của khóa luận

| Khung bắt buộc trong phụ lục hình thức                             | Chương/Phần trong outline này | Ghi chú triển khai                                                                            |
| ------------------------------------------------------------------ | ----------------------------- | --------------------------------------------------------------------------------------------- |
| Tóm tắt khóa luận / Abstract                                       | Phần trước Chương 1           | Viết sau cùng, khi Chương 1-7 đã ổn định.                                                     |
| Mở đầu / Problem Statement                                         | Chương 1                      | Nêu lý do chọn đề tài, mục tiêu, đối tượng, phạm vi, phương pháp và đóng góp.                 |
| Tổng quan / Literature review / Related work / Background          | Chương 2                      | Gồm cơ sở lý thuyết, công trình liên quan và khoảng trống đề tài.                             |
| Nghiên cứu thực nghiệm hoặc lý thuyết / Model / Method / Solutions | Chương 3 và Chương 4          | Chương 3 phân tích yêu cầu; Chương 4 trình bày thiết kế, kiến trúc và phương pháp giải quyết. |
| Trình bày, đánh giá bàn luận về kết quả / Evaluation / Validation  | Chương 5 và Chương 6          | Chương 5 trình bày triển khai; Chương 6 đánh giá kết quả, validation, demo và giới hạn.       |
| Kết luận / Summary / Conclusion                                    | Chương 7, mục 7.1-7.3         | Cần ngắn gọn, không thêm bàn luận lan man.                                                    |
| Hướng phát triển / Future work                                     | Chương 7, mục 7.4             | Tách rõ khỏi kết luận để khớp yêu cầu hình thức.                                              |
| Tài liệu tham khảo / References                                    | Sau Chương 7                  | Chuẩn IEEE; tách nguồn tiếng Việt và tiếng Anh nếu template yêu cầu.                          |
| Phụ lục / Appendices                                               | Sau References                | UI gallery, demo evidence, setup guide, source/release, test output, diagram mở rộng.         |

## 5. Page budget dự kiến

| Phần                                                                     | Số trang gợi ý | Vai trò                                                                             |
| ------------------------------------------------------------------------ | -------------- | ----------------------------------------------------------------------------------- |
| Tóm tắt khóa luận / Abstract                                             | 1-2            | Tóm tắt vấn đề, hướng tiếp cận, giải pháp và kết quả.                               |
| Chương 1. Giới thiệu                                                     | 8-10           | Đặt vấn đề, mục tiêu, phạm vi và đóng góp.                                          |
| Chương 2. Cơ sở lý thuyết và công trình liên quan                        | 18-24          | Tạo nền tảng học thuật và khoảng trống nghiên cứu.                                  |
| Chương 3. Phân tích yêu cầu hệ thống QRTable trong bối cảnh vận hành F&B | 12-16          | Chuyển bài toán thành yêu cầu hệ thống và ràng buộc chất lượng.                     |
| Chương 4. Thiết kế kiến trúc và lựa chọn công nghệ cho QRTable           | 20-26          | Giải thích kiến trúc, lựa chọn công nghệ, ranh giới dịch vụ, giao tiếp và đánh đổi. |
| Chương 5. Các luồng vận hành chính của QRTable                           | 24-32          | Trình bày kết quả triển khai qua các luồng vận hành đại diện.                       |
| Chương 6. Kiểm chứng và đánh giá hệ thống QRTable                        | 14-20          | Đánh giá chức năng, kiến trúc và yêu cầu phi chức năng theo phạm vi bằng chứng.     |
| Chương 7. Kết luận và hướng phát triển                                   | 5-7            | Tổng kết đóng góp, hạn chế và hướng phát triển.                                     |

Tổng mục tiêu cho nội dung chính: khoảng 102-137 trang tùy mức chi tiết. Bản nháp nên hướng tới 105-130 trang để có dáng của một báo cáo khóa luận đầy đủ; các phần mở rộng nên tập trung vào Chương 2, Chương 4, Chương 5 và Chương 6 thay vì kéo dài phần mở đầu hoặc kết luận.

## 6. Mục lục chi tiết đề xuất

### Chương 1. Mở đầu

Vai trò: Thiết lập bối cảnh, bài toán, mục tiêu và phạm vi của đề tài.

#### 1.1. Bối cảnh chuyển đổi số trong lĩnh vực F&B

- Nhu cầu tối ưu vận hành nhà hàng/quán ăn.
- Vai trò của POS, QR ordering và thanh toán điện tử trong trải nghiệm vận hành.
- Bối cảnh Việt Nam: thị trường F&B, nhu cầu giải pháp SaaS, thanh toán VietQR/SePay.

#### 1.2. Lý do chọn đề tài

- POS truyền thống và quy trình gọi món thủ công còn nhiều điểm nghẽn.
- QR ordering giúp giảm tải cho nhân viên nhưng đòi hỏi đồng bộ với POS, bếp và thanh toán.
- SaaS giúp triển khai cho nhiều nhà hàng với chi phí phù hợp, nhưng yêu cầu tenant isolation và quản lý lifecycle.
- Microservices phù hợp với bài toán có nhiều bounded contexts như catalog, order, kitchen, payment, SaaS và user access.

#### 1.3. Phát biểu bài toán

- Xây dựng nền tảng POS theo mô hình SaaS cho F&B.
- Tích hợp đặt món qua mã QR tại bàn.
- Điều phối order, bếp, thanh toán, dashboard/reporting và quản trị tenant theo kiến trúc microservices.

#### 1.4. Mục tiêu nghiên cứu và mục tiêu xây dựng hệ thống

- Mục tiêu nghiên cứu: phân tích cơ sở lý thuyết và quyết định kiến trúc cho SaaS POS microservices.
- Mục tiêu xây dựng: hiện thực các flow chính của QRTable, gồm onboarding, catalog/table/QR, session/cart/order, KDS, payment và management/admin.
- Mục tiêu đánh giá: kiểm chứng flow nghiệp vụ, service boundaries, tenant isolation, idempotency và khả năng bảo trì/mở rộng ở mức kiến trúc.

#### 1.5. Đối tượng và phạm vi nghiên cứu

- Đối tượng: nền tảng SaaS POS cho nhà hàng/quán F&B có QR ordering.
- Phạm vi nghiệp vụ chính: quản lý tenant, menu, bàn/QR, session/cart/order, KDS, payment, phân quyền.
- Phạm vi kỹ thuật: microservices, event-driven có chọn lọc, Redis/Kafka/WebSocket, Keycloak/JWT, SePay/VietQR.
- Giới hạn: không claim production-ready, stress test tải lớn, native mobile app, BI/AI analytics hoặc observability production-grade nếu chưa có bằng chứng.

#### 1.6. Phương pháp thực hiện

- Khảo sát bối cảnh và nguồn học thuật/chính thống.
- Phân tích yêu cầu nghiệp vụ và yêu cầu phi chức năng.
- Thiết kế kiến trúc theo service boundary và data ownership.
- Triển khai hệ thống trong Nx monorepo.
- Đánh giá bằng traceability, tests, demo evidence và architecture/code evidence.

#### 1.7. Đóng góp của đề tài

- Mô hình thiết kế SaaS POS tích hợp QR ordering cho F&B.
- Thiết kế microservices với ranh giới nghiệp vụ rõ ràng.
- Flow đặt món QR liên kết POS, KDS và payment.
- Chính sách tenant isolation, RBAC và idempotency trong bối cảnh hệ thống phân tán.
- Bộ tài liệu/diagram/evidence hỗ trợ đánh giá hệ thống.

#### 1.8. Cấu trúc khóa luận

- Tóm tắt vai trò Chương 2-7.

Nguồn chính: thesis proposal, research survey, báo cáo thị trường F&B, `thesis-evidence-map.md`.

Artifact nên có:

- Bảng 1.1. Tóm tắt vấn đề và hướng giải quyết của QRTable.
- Hình 1.1. Luồng vận hành tổng quát từ khách quét QR đến POS/KDS/payment.

### Chương 2. Cơ sở lý thuyết và các công trình liên quan

Vai trò: Tạo nền tảng học thuật và thực tiễn trước khi đi vào QRTable.

#### 2.1. Tổng quan về POS trong lĩnh vực F&B

- Khái niệm POS và vai trò trong quy trình bán hàng, phục vụ, thanh toán.
- Đặc thù F&B: bàn, ca phục vụ, bếp/bar, order nhiều lần, thanh toán cuối phiên.

#### 2.2. QR code ordering

- Khái niệm đặt món qua QR.
- Lợi ích: giảm thao tác của nhân viên, tăng tốc truy cập menu, hỗ trợ gọi thêm món, minh bạch trạng thái order.
- Thách thức: xác thực bàn/session, chống QR giả, đồng bộ POS/KDS, xử lý order trùng, trải nghiệm realtime.

#### 2.3. SaaS và multi-tenancy

- Định nghĩa SaaS theo NIST/cloud computing.
- Khái niệm tenant, tenant isolation, resource sharing.
- Các mô hình multi-tenancy: shared database/shared schema, schema-per-tenant, database-per-tenant, hybrid.
- Noisy neighbor, cost-per-tenant, tenant lifecycle.

#### 2.4. Kiến trúc microservices

- Khái niệm microservices, service boundary, bounded context, database-per-service.
- Lợi ích: độc lập triển khai, độc lập scale, giảm coupling theo domain.
- Trade-off: distributed complexity, observability, consistency, network failure.

#### 2.5. Event-driven architecture và Kafka

- Event, topic, partition, producer, consumer, consumer group.
- Async decoupling và temporal decoupling.
- Khi nào nên dùng event; khi nào sync RPC phù hợp hơn.
- Liên hệ với QRTable: Kafka dùng cho domain event có side effect bất đồng bộ, không thay thế mọi TCP/gRPC call.

#### 2.6. Data consistency, idempotency và distributed transaction patterns

- Tính nhất quán trong microservices.
- Idempotency key và xử lý duplicate request/webhook.
- Outbox, saga, compensation ở mức khái niệm; chỉ claim implementation khi có bằng chứng.

#### 2.7. Real-time communication

- WebSocket và realtime notification.
- Phân biệt realtime hint/push với source of truth.
- Liên hệ QRTable: WebSocket hỗ trợ cập nhật UI, REST/DB/service state vẫn là nguồn chính.

#### 2.8. Authentication, authorization và security trong SaaS POS

- Authentication, authorization, RBAC.
- JWT/OIDC/Keycloak ở mức hệ thống đã triển khai.
- Tenant isolation, webhook verification, dữ liệu cá nhân và bối cảnh Việt Nam.

#### 2.9. Các hệ thống/công trình liên quan

- Hệ thống POS/QR ordering thực tế như iPOS, KiotViet, Sapo nếu có nguồn chính thức.
- Paper hoặc nghiên cứu liên quan đến self-service ordering, QR menu, POS, SaaS/multi-tenancy, microservices.
- Khoảng trống: ít tài liệu trình bày trọn vẹn một nền tảng SaaS POS + QR ordering + microservices + payment nội địa trong bối cảnh khóa luận phần mềm.

Nguồn chính: NIST SP 800-145, ISO/IEC 25010, Martin Fowler/James Lewis, Microsoft Azure Architecture Center, AWS SaaS Lens, Apache Kafka docs, RFC 6455, OWASP ASVS, Google SRE Book, research survey và nguồn thị trường F&B.

Artifact nên có:

- Bảng 2.1. So sánh POS truyền thống và SaaS POS tích hợp QR ordering.
- Bảng 2.2. So sánh các mô hình multi-tenancy.
- Bảng 2.3. So sánh giao tiếp đồng bộ và bất đồng bộ trong microservices.
- Hình 2.1. Mô hình khái niệm SaaS multi-tenancy.

### Chương 3. Phân tích yêu cầu hệ thống QRTable trong bối cảnh vận hành F&B

Vai trò: Chuyển bối cảnh và lý thuyết thành yêu cầu cụ thể cho hệ thống QRTable.

#### 3.1. Bối cảnh vận hành F&B

- Các nhóm người dùng: Super Admin, Restaurant Owner, Manager/Staff, Chef/Barista, Customer.
- Ngữ cảnh vận hành: tenant onboarding, quản lý menu/bàn/staff, quét QR, gọi món, bếp xử lý, thanh toán, dashboard/reporting tenant và quản trị gói dịch vụ.

#### 3.2. Tác nhân và phạm vi truy cập

- Super Admin: tenant onboarding, lifecycle, plan/subscription, platform analytics và tenant drilldown qua `report.read_any`.
- Owner/Manager: menu, table/QR, staff, payment settings, subscription, dashboard/reporting tenant qua `report.read_own` và plan feature entitlement.
- Staff/POS: xem order, xác nhận order, xử lý bill/payment, quản lý bàn.
- Kitchen/Bar: xem queue, cập nhật trạng thái món.
- Customer: quét QR, xem menu, đặt món, theo dõi trạng thái, yêu cầu thanh toán.

#### 3.3. Năng lực hệ thống theo các miền vận hành

- SaaS management.
- Staff management tenant ở mức Owner/Manager, không mở rộng thành HRM/payroll/shift scheduling.
- Catalog/menu/table/QR.
- Customer session/shared cart/order.
- Staff POS và KDS.
- Payment settlement.
- Dashboard/reporting cho Owner/Manager và platform analytics cho Super Admin, có plan feature entitlement theo gói.
- Auth/RBAC và tenant isolation.

#### 3.4. Ràng buộc chất lượng và tiêu chí kiểm chứng

- Tenant isolation.
- Security và authorization.
- Realtime feedback.
- Consistency và idempotency.
- Maintainability/modifiability.
- Scalability ở mức thiết kế.
- Testability và reproducible demo.

#### 3.5. Các vòng đời trạng thái chi phối nghiệp vụ

- Table/session lifecycle.
- Cart/order lifecycle.
- Kitchen ticket lifecycle.
- Bill/payment lifecycle.
- Tenant/subscription lifecycle.

#### 3.6. Phạm vi yêu cầu

- Không claim benchmark tải lớn nếu chưa đo.
- Không claim production-grade observability/deployment nếu chỉ có thiết kế hoặc demo giới hạn.
- Không đưa các module mở rộng như HRM/payroll/shift scheduling, CRM, BI/AI nâng cao, warehouse/OLAP, scheduled export, staff performance analytics, forecasting/anomaly, native mobile hoặc advanced inventory/BOM vào phạm vi kết quả chính nếu chưa có evidence.

Nguồn chính: `docs/business-logic.md`, `docs/technical-architecture.md`, `docs/architecture/permission-matrix.md`, và phase records.

Artifact nên có:

- Hình 3.1. Actor/use-case overview.
- Bảng 3.1. Functional requirements theo actor/domain.
- Bảng 3.2. Non-functional requirements và tiêu chí đánh giá.
- Hình 3.2. State machine của table/session/order/payment.

### Chương 4. Thiết kế kiến trúc và quyết định công nghệ cho QRTable

Vai trò: Giải thích QRTable được thiết kế như thế nào, vì sao chọn các công nghệ chính và các quyết định đó tạo ra đánh đổi gì trong phạm vi khóa luận.

#### 4.1. Mục tiêu thiết kế và nguyên tắc kiến trúc

- Tách trách nhiệm theo miền nghiệp vụ và cơ sở dữ liệu riêng theo dịch vụ.
- Cô lập tenant theo mặc định bằng ngữ cảnh `tenant_id`.
- BFF là điểm vào duy nhất của ứng dụng người dùng.
- Giao tiếp hướng sự kiện có chọn lọc, không dùng Kafka cho mọi thứ.
- Redis là bộ nhớ đệm/trạng thái chạy có chủ sở hữu, không là nguồn sự thật chung.
- Idempotency, bù trừ có kiểm soát và dấu thời gian phía máy chủ.

#### 4.2. Lựa chọn công nghệ và vai trò trong QRTable

- Nx monorepo cho quản lý `apps/`, `libs/`, hợp đồng dùng chung và đồ thị phụ thuộc.
- NestJS/TypeScript cho BFF và các dịch vụ phía máy chủ.
- Next.js/React và React/Vite PWA cho hai ứng dụng người dùng.
- PostgreSQL, MongoDB, Redis, Kafka, Keycloak, Socket.IO/WebSocket, SePay/VietQR, Cloudinary và Docker/Docker Compose.
- Luôn nêu lý do chọn và giới hạn claim, không viết như danh sách công nghệ.

#### 4.3. Kiến trúc tổng thể của hệ thống

- Hình 4.1 trình bày các thành phần và công nghệ theo từng lớp: ứng dụng người dùng -> BFF -> dịch vụ miền nghiệp vụ -> dữ liệu/sự kiện -> nhà cung cấp ngoài.
- Hình kiến trúc tổng thể và C4/container để giữ góc nhìn hệ thống.
- Hình 4.1 không phải logo gallery; mỗi công nghệ phải gắn với lớp kiến trúc hoặc luồng sử dụng cụ thể.

#### 4.4. Tổ chức Nx monorepo và ranh giới module

- `apps/` cho các ứng dụng/dịch vụ triển khai được.
- `libs/` cho DTO, constants, schemas, providers, guards, queue, UI/hook/utility dùng chung.
- Monorepo giúp giữ hợp đồng dùng chung nhưng không cho phép import repository/entity của dịch vụ khác.

#### 4.5. Ranh giới dịch vụ và trách nhiệm dữ liệu

- BFF không chứa nghiệp vụ lõi và không có CSDL nghiệp vụ riêng.
- Catalog sở hữu thực đơn, danh mục, khu vực, bàn, token QR và tồn kho.
- Order sở hữu phiên, giỏ, vòng đời đơn, yêu cầu hóa đơn và hóa đơn.
- Kitchen sở hữu hàng đợi KDS ở trạng thái chạy bằng Redis.
- Payment sở hữu thanh toán, cấu hình thanh toán và quyết toán webhook.
- SaaS sở hữu tenant, gói giá, gói thuê bao, hóa đơn gói và quyền gói.
- Reporting/dashboard là mô hình đọc tổng hợp qua BFF và service owners hiện có; không tạo Analytics Service nếu source không có.
- User-Access và Authorizer xử lý hồ sơ ứng dụng, vai trò, JWT/OIDC và Keycloak.

#### 4.6. Chiến lược đa tenant

- Cơ sở dữ liệu riêng theo dịch vụ kết hợp cột `tenant_id`.
- Ngữ cảnh tenant đi qua guard/middleware, truy vấn CSDL, Redis key, Kafka payload và WebSocket room.
- Viết như thiết kế hiện tại, không nói đây là mô hình duy nhất hoặc tối ưu cho mọi quy mô.

#### 4.7. Kiến trúc giao tiếp giữa các dịch vụ

- HTTP/WebSocket từ ứng dụng người dùng đến BFF.
- TCP từ BFF đến dịch vụ nghiệp vụ.
- gRPC đến Authorizer.
- Kafka cho sự kiện miền đã được chấp nhận.
- Webhook cho SePay/VietQR.
- BFF Direct cho tác dụng phụ giao diện khi không cần Kafka.

#### 4.8. Thiết kế hướng sự kiện và sổ đăng ký Kafka topic

- Giải thích kiến trúc hướng sự kiện có chọn lọc.
- Topic được chấp nhận: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.
- Không thêm topic như `menu.updated`, `cart.updated` hoặc `tenant.suspended` nếu chưa có hợp đồng.

#### 4.9. Redis cho bộ nhớ đệm, phiên, giỏ và KDS

- Bộ nhớ đệm thực đơn.
- Phiên và giỏ theo tenant/session.
- Hàng đợi KDS bằng Redis Sorted Set/hash.
- Cờ tenant, cache gói thuê bao và trạng thái OAuth khi có evidence.

#### 4.10. Kiến trúc bảo mật, xác thực và phân quyền

- Keycloak/JWT/OIDC cho nhân viên, chủ quán và quản trị.
- Khách dùng QR/session ẩn danh, không dùng Keycloak.
- Chuỗi guard, tenant guard, permission matrix.
- Báo cáo cần phân biệt `report.read_own`, `report.read_any` và quyền tính năng theo gói; Super Admin analytics không bị giới hạn bởi gói của tenant đang xem.
- Webhook verification và security gaps cần viết theo evidence.

#### 4.11. Thiết kế tích hợp thanh toán SePay/VietQR

- Phân biệt thanh toán hóa đơn nhà hàng `QRTBL` và hóa đơn gói nền tảng `QRSUB`.
- Payment sở hữu thanh toán; Order sở hữu hóa đơn/phiên; SaaS sở hữu hóa đơn gói.
- Webhook settlement và idempotency.

#### 4.12. Thiết kế triển khai, quan sát và giới hạn khẳng định

- Docker/Docker Compose và stack phụ thuộc nếu có bằng chứng.
- Quan sát hệ thống chỉ viết như thiết kế hoặc demo-limited nếu chưa có dashboard/trace/log evidence đầy đủ.

#### 4.13. Tổng hợp đánh đổi kiến trúc

- Vi dịch vụ so với kiến trúc nguyên khối.
- RPC đồng bộ so với Kafka.
- Redis cache/trạng thái chạy so với nguồn sự thật bền vững.
- Mô hình `tenant_id` chia sẻ theo dịch vụ so với CSDL riêng cho từng tenant.
- WebSocket gợi ý/làm mới so với trạng thái có thẩm quyền.

Nguồn chính: `docs/technical-architecture.md`, `docs/guides/codebase-reading-map.md`, `docs/DOC-CODE-ANCHORS.md`, source code paths trong `apps/` và `libs/`.

Artifact nên có:

- Hình 4.1. Các thành phần và công nghệ trong kiến trúc QRTable.
- Hình 4.2. Kiến trúc tổng thể QRTable.
- Hình 4.3. C4/container diagram.
- Hình 4.4. Ranh giới module trong Nx monorepo.
- Bảng 4.1. Quyết định công nghệ và vai trò trong QRTable.
- Bảng 4.2. Service ownership và data ownership.
- Bảng 4.3. Database/schema ownership theo service.
- Bảng 4.4. Communication matrix.
- Bảng 4.5. Kafka topic registry.
- Hình 4.5. Multi-tenancy isolation diagram.
- Hình 4.6. Communication topology.
- Hình 4.7. Kafka decision flow.
- Hình 4.8. Redis ownership/keyspace.
- Hình 4.9. Security/auth architecture.
- Hình 4.10. SePay/VietQR payment architecture.

### Chương 5. Hiện thực các luồng vận hành cốt lõi của QRTable

Vai trò: Chứng minh hệ thống đã được hiện thực hóa, nhưng không biến chương này thành walkthrough source code.

#### 5.1. Mục tiêu triển khai và phạm vi minh chứng

- Nối Chương 4 với hệ thống đã xây dựng.
- Chỉ đưa chi tiết nội bộ khi phục vụ bất biến, service boundary hoặc bằng chứng.
- Phân biệt code/test/diagram với live provider, pilot deployment và screenshot minh họa.

#### 5.2. Nền tảng triển khai và ranh giới trách nhiệm

- Nx monorepo, Customer PWA, Management App, BFF và các dịch vụ nghiệp vụ.
- Nhắc lại data ownership từ Chương 4 khi cần giải thích luồng.
- Các thư viện dùng chung là lớp hợp đồng, không phải đường tắt để truy cập database chéo service.

#### 5.3. Khách quét QR, tạo phiên và giỏ món dùng chung

- QR/session theo tenant/table/session.
- Order sở hữu session/cart/order; Catalog sở hữu bàn/menu/QR token.
- Redis hỗ trợ hot path; durable state vẫn ở Order DB.
- Cart version/idempotency/concurrent mutation handling.

#### 5.4. Xác nhận đơn hàng và bảo toàn tồn kho

- Staff confirmation là điểm commit nghiệp vụ của stock.
- Catalog-owned stock deduction; Order-owned order lifecycle.
- Saga/compensation ở mức đại diện, không claim full hardening.

#### 5.5. Điều phối bếp/KDS và cập nhật thời gian thực

- `order.confirmed` -> Kitchen consumer -> Redis KDS projection -> BFF/WebSocket hint -> KDS UI refetch.
- Kitchen sở hữu KDS projection khi vận hành; Order vẫn sở hữu order/item lifecycle.
- WebSocket là hint/refetch, không phải source of truth.

#### 5.6. Ghi nhận thanh toán tiền mặt, VietQR và SePay

- Cash và SePay/VietQR.
- Payment owns payment record; Order owns bill/session finalization.
- Webhook settlement, duplicate/underpaid và idempotent replay nếu có evidence.
- Không claim live-provider validation nếu chưa có artifact provider thật.

#### 5.7. Khởi tạo đơn vị thuê bao và vòng đời gói dịch vụ

- Super Admin onboarding.
- Tenant/subscription/plan/payment settings.
- SaaS Onboarding Mini-Saga và compensation.
- Tenant status: active/suspended/closed theo evidence.

#### 5.8. Bảng điều khiển và báo cáo theo gói dịch vụ

- Owner/Manager dashboard theo `report.read_own`, subscription active và `analytics_basic`.
- Super Admin analytics theo `report.read_any`, không bị khóa bởi plan của tenant đang xem.
- Payment/Order/Catalog/SaaS giữ read model của dữ liệu mình sở hữu.
- Không tạo standalone Analytics Service, data warehouse hoặc realtime dashboard socket nếu source không có.

#### 5.9. Đóng gói triển khai và khung minh chứng pilot

- Docker/Docker Compose và dependencies.
- Khung kiểm chứng URL/domain, HTTPS/TLS, health check, smoke test, webhook callback.
- Không claim production-ready, high availability hoặc stress test nếu chưa có artifact.

#### 5.10. Tổng hợp minh chứng triển khai

- Bảng evidence ngắn theo luồng: mục tiêu, bất biến/ranh giới, bằng chứng và giới hạn.
- Chỉ đưa screenshot đại diện cho luồng chính; gallery đầy đủ để phụ lục.

Nguồn chính: source code trong `apps/`, `libs/`, phase records, `docs/guides/*`, và `docs/testing/*`.

Artifact nên có:

- Hình 5.1. Sequence QR ordering.
- Hình 5.2. Sequence order confirmation và stock deduction.
- Hình 5.3. Sequence KDS ticket lifecycle.
- Hình 5.4. Sequence SePay/VietQR settlement.
- Hình 5.5. Sequence SaaS onboarding.
- Bảng 5.1. Tổng hợp minh chứng triển khai các luồng cốt lõi.
- Bảng 5.x. Dashboard/reporting implementation addendum nếu backfill technical Phase 4D vào report.
- Screenshot 5.x. Customer PWA, Staff POS, KDS, Owner dashboard, Super Admin.

### Chương 6. Kiểm chứng và đánh giá hệ thống QRTable

Vai trò: Đánh giá kết quả dựa trên yêu cầu, kiểm thử, trạng thái quan sát được và giới hạn của bằng chứng.

#### 6.1. Phương pháp đánh giá

- Phân loại cơ sở đánh giá thành kiểm thử tự động, quan sát bằng công cụ, phân tích kiến trúc và giới hạn kết luận.
- Giới thiệu k6 và vai trò của công cụ này trong phần đo tải đại diện.

#### 6.2. Đối chiếu yêu cầu và kết quả kiểm thử

- Tổng hợp trạng thái kiểm chứng của các yêu cầu ưu tiên cao.
- Liên kết yêu cầu với kết quả kiểm thử hoặc trạng thái quan sát được.

#### 6.3. Kiểm chứng các luồng nghiệp vụ chính

- Tổng hợp kết quả theo trường hợp sử dụng thay vì theo từng dịch vụ riêng lẻ.
- Giữ trọng tâm ở tính đúng đắn của trạng thái nghiệp vụ qua nhiều thành phần.

#### 6.4. Luồng đặt món qua mã QR, POS và KDS

- Kiểm chứng toàn luồng từ khách đặt món đến POS, KDS và trạng thái phục vụ.
- Dùng Playwright và Allure cho kịch bản hộp đen đại diện.

#### 6.5. Saga, xử lý yêu cầu lặp và tính nhất quán liên dịch vụ

- Đánh giá Order Confirm Saga và SaaS Onboarding Mini-Saga.
- Đối chiếu bù trừ, tranh chấp tồn kho, phản hồi bị mất và thông điệp lỗi thời.

#### 6.6. Trạng thái khi vận hành của kiến trúc microservices

- Đối chiếu sự kiện Kafka và bản chiếu KDS trong Redis trong một lần chạy cụ thể.
- Phân biệt trạng thái nghiệp vụ với tín hiệu thời gian thực.

#### 6.7. Đánh giá định lượng bằng k6 và khả năng quan sát

- Tổng hợp độ trễ, thông lượng, tỷ lệ lỗi và điều kiện đạt của ba kịch bản đại diện.
- Đối chiếu số liệu k6 với Prometheus, Grafana và Tempo.

#### 6.8. Đánh giá kiến trúc và vận hành thử nghiệm

- Xem xét ranh giới dịch vụ, quyền sở hữu dữ liệu và khả năng bảo trì.
- Diễn giải kết quả đo tải, kiểm thử đa thực thể, đóng gói và triển khai một phần.

#### 6.9. Giới hạn của quá trình đánh giá

- Xác định phạm vi suy luận của benchmark cục bộ, kiểm thử Saga, phân quyền, triển khai và khả năng quan sát.
- Chuyển các phần chưa đủ bằng chứng thành hướng kiểm chứng tiếp theo.

#### 6.10. Thảo luận kết quả

- Tổng hợp mức độ đáp ứng mục tiêu đề tài ở lớp sản phẩm, nghiệp vụ và kiến trúc.
- Nêu rõ điều có thể kết luận và điều chưa thể suy rộng từ bằng chứng hiện có.

Nguồn chính: `docs/testing/README.md`, `docs/testing/traceability-matrix.md`, tests trong `apps/**`, `libs/**`, `tests/e2e`, demo artifacts.

Artifact nên có:

- Bảng 6.1. Nguyên tắc phân loại kết luận theo cơ sở đánh giá.
- Bảng 6.2. Đối chiếu yêu cầu và kết quả kiểm thử.
- Bảng 6.3. Ma trận kiểm chứng chức năng.
- Bảng 6.4. Kết quả đo tải k6 trên môi trường cục bộ.
- Hình 6.1. Kết quả kiểm thử hoặc trạng thái quan sát đại diện.

### Chương 7. Kết luận và hướng phát triển

Vai trò: Kết thúc mạch lập luận, tóm tắt kết quả và nêu hướng phát triển. Cần tách rõ kết luận và hướng phát triển để khớp yêu cầu hình thức.

#### 7.1. Tóm tắt vấn đề và hướng tiếp cận

- Nhắc lại bài toán SaaS POS tích hợp QR ordering trong F&B.
- Tóm tắt hướng tiếp cận microservices và selective event-driven architecture.

#### 7.2. Kết quả đạt được

- Các domain/flow chính đã được thiết kế và triển khai.
- Các cơ chế kỹ thuật nổi bật: tenant isolation, service boundary, idempotency, WebSocket hint/refetch, Kafka topic registry, Redis-backed session/KDS, SePay/VietQR integration.

#### 7.3. Đóng góp của đề tài

- Đóng góp nghiên cứu/thiết kế.
- Đóng góp triển khai hệ thống.
- Đóng góp tài liệu/evidence/diagram phục vụ đánh giá phần mềm.

#### 7.4. Hạn chế

- Chưa benchmark tải lớn.
- Môi trường demo nhỏ.
- Observability/deployment production-grade cần hoàn thiện thêm.
- Một số module mở rộng không nằm trong phạm vi kết quả chính.

#### 7.5. Hướng phát triển

- Benchmark sâu hơn và load test có kiểm soát.
- Production security hardening.
- Observability dashboard và distributed tracing đầy đủ hơn.
- Offline queue/sync conflict resolution.
- Notification/email service.
- Deployment package và demo reproducibility tốt hơn.
- Tích hợp nâng cao: inventory/BOM, reporting/analytics, giao đồ ăn bên thứ ba nếu phù hợp.

Artifact nên có:

- Bảng 7.1. Tổng hợp đóng góp, hạn chế và hướng phát triển.

## 7. Danh sách artifact cần chuẩn bị theo tầng

Danh sách dưới đây không nên được hiểu là toàn bộ artifact cuối cùng của khóa luận. Đây là backlog theo tầng: nhóm tối thiểu cần có trong chương chính, nhóm mở rộng nên cân nhắc khi viết sâu hơn, và nhóm screenshot/UI gallery nên đưa vào phụ lục. Với mục tiêu bản nháp khoảng 105-130 trang nội dung chính, số lượng hợp lý có thể nằm trong khoảng 35-50 artifact ở chương chính, gồm diagram, bảng và một số screenshot đại diện. Phụ lục có thể chứa thêm khoảng 35-70 screenshot hoặc demo artifact nếu được tổ chức theo user journey rõ ràng.

Nguyên tắc chọn artifact cho chương chính: mỗi hình, bảng hoặc screenshot phải phục vụ một claim hoặc một bước lập luận cụ thể. Nếu artifact chỉ có vai trò lưu bằng chứng đầy đủ, ghi nhận màn hình, hoặc hỗ trợ demo, nên đưa vào phụ lục thay vì nhồi vào thân bài.

### 7.1 Artifact tối thiểu trong chương chính

| Mã gợi ý  | Artifact                                            | Chương | Nguồn/caption gợi ý                                                      |
| --------- | --------------------------------------------------- | ------ | ------------------------------------------------------------------------ |
| Hình 1.1  | Luồng tổng quát từ QR ordering đến POS/KDS/payment  | 1      | Tác giả xây dựng từ phân tích nghiệp vụ QRTable.                         |
| Bảng 1.1  | Vấn đề, nguyên nhân và hướng giải quyết             | 1      | Tác giả tổng hợp từ bối cảnh đề tài và research survey.                  |
| Bảng 2.1  | So sánh SaaS POS và POS truyền thống                | 2      | Tác giả tổng hợp từ nguồn học thuật/thị trường được trích dẫn.           |
| Bảng 2.2  | So sánh multi-tenancy models                        | 2      | Tác giả tổng hợp từ NIST/AWS/Microsoft và tài liệu liên quan.            |
| Bảng 2.3  | So sánh monolith, modular monolith và microservices | 2      | Tác giả tổng hợp từ nguồn kiến trúc phần mềm được trích dẫn.             |
| Bảng 2.4  | So sánh giao tiếp đồng bộ và bất đồng bộ            | 2      | Tác giả tổng hợp từ tài liệu microservices/event-driven.                 |
| Hình 2.1  | Mô hình khái niệm SaaS multi-tenancy                | 2      | Tác giả xây dựng từ cơ sở lý thuyết multi-tenancy.                       |
| Hình 3.1  | Actor/use-case overview                             | 3      | Tác giả xây dựng từ `docs/business-logic.md`.                            |
| Bảng 3.1  | Functional requirements theo domain                 | 3      | Tác giả xây dựng từ business logic và phase records.                     |
| Bảng 3.2  | Non-functional requirements và tiêu chí đánh giá    | 3      | Tác giả xây dựng từ ISO/IEC 25010 và yêu cầu QRTable.                    |
| Hình 3.2  | Business flow từ khách hàng đến bếp và thanh toán   | 3      | Tác giả xây dựng từ phân tích nghiệp vụ QRTable.                         |
| Bảng 3.3  | Actor, vai trò và quyền truy cập chính              | 3      | Tác giả xây dựng từ permission matrix và yêu cầu RBAC.                   |
| Hình 4.1  | Các thành phần và công nghệ trong kiến trúc QRTable | 4      | Tác giả xây dựng từ Ch4 evidence, source tree và tài liệu Nx chính thức. |
| Hình 4.2  | Overall architecture                                | 4      | Tác giả xây dựng từ `docs/technical-architecture.md` và source code.     |
| Hình 4.3  | C4/container diagram                                | 4      | Tác giả xây dựng từ cấu trúc `apps/`, `libs/` và tài liệu kiến trúc.     |
| Hình 4.4  | Nx monorepo/module boundary                         | 4      | Tác giả xây dựng từ source tree, Nx workspace và rule service boundary.  |
| Bảng 4.1  | Technology decision matrix                          | 4      | Tác giả xây dựng từ Chương 4, source tree và tài liệu Nx chính thức.     |
| Bảng 4.2  | Service ownership/data ownership                    | 4      | Tác giả xây dựng từ canonical docs và `apps/*`.                          |
| Bảng 4.3  | Database/schema ownership theo service              | 4      | Tác giả xây dựng từ TypeORM/Mongoose registration và entity/schema code. |
| Bảng 4.4  | Communication matrix                                | 4      | Tác giả xây dựng từ `technical-architecture.md`.                         |
| Bảng 4.5  | Kafka topic registry                                | 4      | Tác giả xây dựng từ constants, queue docs và source code.                |
| Hình 4.5  | Multi-tenancy isolation diagram                     | 4      | Tác giả xây dựng từ thiết kế tenant isolation QRTable.                   |
| Hình 4.6  | Communication topology                              | 4      | Tác giả xây dựng từ Ch4 evidence và communication matrix.                |
| Hình 4.7  | Kafka decision flow                                 | 4      | Tác giả xây dựng từ quyết định sync/async communication.                 |
| Hình 4.8  | Redis key/domain ownership                          | 4      | Tác giả xây dựng từ Redis ownership evidence và source code.             |
| Hình 4.9  | Security/auth architecture                          | 4      | Tác giả xây dựng từ permission matrix, guard và auth evidence.           |
| Hình 4.10 | SePay/VietQR payment architecture                   | 4      | Tác giả xây dựng từ SePay guide, Payment/SaaS/Order evidence.            |
| Hình 5.1  | QR ordering sequence                                | 5      | Tác giả xây dựng từ implementation flow.                                 |
| Hình 5.2  | Order confirm và stock consistency sequence         | 5      | Tác giả xây dựng từ Order/Catalog evidence.                              |
| Hình 5.3  | KDS ticket lifecycle                                | 5      | Tác giả xây dựng từ Kitchen/KDS evidence.                                |
| Hình 5.4  | Payment settlement sequence                         | 5      | Tác giả xây dựng từ Payment/BFF/Order evidence.                          |
| Hình 5.5  | SaaS onboarding sequence                            | 5      | Tác giả xây dựng từ SaaS/User-Access/Authorizer evidence.                |
| Bảng 5.1  | Tổng hợp minh chứng triển khai các luồng cốt lõi    | 5      | Tác giả tổng hợp từ source code, docs, tests và diagram.                 |
| Bảng 6.1  | Evaluation claim policy                             | 6      | Tác giả xây dựng từ evidence map.                                        |
| Bảng 6.2  | Requirement traceability summary                    | 6      | Tác giả tổng hợp từ traceability matrix.                                 |
| Bảng 6.3  | Architecture/NFR evidence status                    | 6      | Tác giả tổng hợp từ code/docs/tests.                                     |
| Bảng 6.4  | Demo evidence checklist                             | 6      | Tác giả tổng hợp từ screenshot, test output và demo artifact.            |
| Bảng 7.1  | Đóng góp, hạn chế và hướng phát triển               | 7      | Tác giả tổng hợp từ kết quả khóa luận.                                   |

### 7.2 Artifact mở rộng nên cân nhắc

Nhóm này không bắt buộc đưa hết vào bản đầu, nhưng nên dùng khi chương cần thêm chiều sâu hoặc khi một claim kiến trúc cần minh họa rõ hơn. Nếu số lượng artifact làm chương chính quá dài, chuyển artifact chi tiết xuống phụ lục và chỉ giữ hình tổng hợp trong thân bài.

| Chương | Artifact mở rộng nên cân nhắc                                                                                                                                         | Khi nào nên đưa vào chương chính                                                                |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| 1      | Sơ đồ pain point của quy trình phục vụ thủ công; bảng mapping pain point -> yêu cầu hệ thống.                                                                         | Khi cần làm rõ vì sao QR ordering phải tích hợp với POS/KDS/payment thay vì chỉ là menu online. |
| 2      | Bảng SaaS vs on-premise; bảng database-per-service; sơ đồ event-driven architecture khái niệm; bảng quality attributes theo ISO/IEC 25010.                            | Khi Chương 2 cần nền tảng lý thuyết mạnh hơn và có nguồn trích dẫn tốt.                         |
| 3      | Use-case chi tiết theo actor; state machine của session/order/payment/table; bảng P0/P1/P2 requirement; bảng threat/abuse case ở mức yêu cầu.                         | Khi cần chứng minh phân tích yêu cầu không chỉ là danh sách tính năng.                          |
| 4      | ERD rút gọn theo service; dependency graph Nx; Redis key/domain ownership; WebSocket room model; deployment topology; observability design.                           | Khi cần giải thích service boundary, data ownership, realtime và vận hành ở mức kiến trúc.      |
| 5      | Sequence cho shared cart, table transfer, safe empty-session release, subscription checkout, tenant suspend/activate; bảng API/route nhóm theo domain nếu cần.        | Khi flow đó là phần trọng tâm của hệ thống hoặc dễ bị hội đồng hỏi.                             |
| 6      | Bảng test coverage theo requirement; bảng scenario analysis cho scalability/maintainability; bảng limitation vs future work; screenshot test run/health check nếu có. | Khi đánh giá NFR bằng architecture/code evidence thay vì benchmark tải lớn.                     |
| 7      | Ma trận đóng góp học thuật/kỹ thuật/thực tiễn; bảng roadmap hướng phát triển.                                                                                         | Khi cần tổng kết rõ đóng góp mà không kéo dài văn bản kết luận.                                 |

### 7.3 Screenshot/UI artifact

Chương 5 chỉ nên dùng screenshot đại diện. Phụ lục chứa gallery đầy đủ hơn. Cách chia hợp lý là: trong thân bài chọn khoảng 8-12 screenshot thật sự đại diện cho các journey chính; trong phụ lục lưu bộ ảnh đầy đủ hơn theo từng vai trò để bản khóa luận không phụ thuộc vào demo domain còn sống hay không.

Phase 5D có thể dựng trước scaffold screenshot bằng placeholder trắng, filename ổn định, caption và LaTeX label để người viết thay ảnh thật thủ công. Placeholder không được tính là screenshot thật hoặc demo evidence trong bản nộp.

| Nhóm màn hình   | Screenshot đại diện trong Chương 5                                                                   | UI gallery/phụ lục nên có                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Customer PWA    | QR join/session, menu, cart, order tracking, request payment/VietQR.                                 | Toàn bộ journey: vào bàn, xem menu, lọc/chọn món, chi tiết món, giỏ hàng, gửi order, theo dõi trạng thái, thanh toán.                   |
| Staff POS       | Table map/live orders, order detail, confirm/cancel, bill settlement.                                | Table/session lifecycle, order queue, xử lý gọi thêm món, cập nhật bàn, thu ngân, trạng thái thanh toán.                                |
| KDS             | Kitchen/bar queue, ticket detail, status update.                                                     | Ticket mới, đang xử lý, hoàn tất, priority/SLA nếu có, empty state và realtime refresh.                                                 |
| Owner dashboard | Menu/category management, table/QR management, payment settings, subscription, dashboard reporting.  | CRUD menu/table/area/QR, cấu hình thanh toán, nhân viên/quyền, thông tin tenant, subscription/billing, reporting theo plan entitlement. |
| Super Admin     | Tenant onboarding, tenant lifecycle, pricing plan, subscription invoice, platform analytics.         | Tạo tenant, gán owner, kích hoạt/tạm ngưng tenant, quản lý gói, invoice/subscription, trạng thái thanh toán, analytics cross-tenant.    |
| Auth/security   | Keycloak login hoặc role-based routing nếu cần minh họa security flow.                               | Login/logout, route bị chặn theo role, tenant suspended warning nếu có, màn hình lỗi quyền truy cập.                                    |
| Evaluation/demo | Test run summary, traceability summary, health check hoặc observability screen nếu có artifact thật. | Command output, demo checklist, release/tag/commit hash, video demo link, log/metric/trace screenshot nếu có thật.                      |

Lưu ý: screenshot observability/deployment chỉ đưa khi có artifact thật. Nếu chưa có dashboard/log/trace được triển khai và chụp lại, phần này chỉ nên xuất hiện trong thiết kế hoặc hướng phát triển, không dùng screenshot minh họa giả.

### 7.4 Phụ lục nên chuẩn bị

- Phụ lục A: UI gallery.
- Phụ lục B: Hướng dẫn setup/demo.
- Phụ lục C: GitHub repository, release/tag/commit hash và cấu trúc source.
- Phụ lục D: Test command output, traceability summary hoặc demo checklist.
- Phụ lục E: ERD, permission matrix hoặc diagram mở rộng nếu chương chính quá dài.

## 8. Source plan theo chương

| Chương   | Nguồn ngoài                                                                                                                  | Nguồn nội bộ                                                                          |
| -------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------- |
| Chương 1 | Báo cáo F&B, nguồn thị trường, proposal                                                                                      | `research-survey/*`, thesis proposal, evidence map                                    |
| Chương 2 | NIST, ISO/IEC 25010, SEI/ATAM, Fowler/Lewis, Microsoft/AWS docs, Kafka docs, RFC 6455, OWASP, Google SRE, paper related work | research survey notes, proposal references                                            |
| Chương 3 | ISO/IEC 25010 cho NFR nếu cần                                                                                                | `docs/business-logic.md`, `docs/architecture/permission-matrix.md`, phase docs, specs |
| Chương 4 | Fowler/Lewis, Microsoft/AWS, Kafka docs nếu cần giải thích quyết định                                                        | `docs/technical-architecture.md`, `docs/DOC-CODE-ANCHORS.md`, `apps/*`, `libs/*`      |
| Chương 5 | Tài liệu framework chỉ khi cần giải thích implementation pattern                                                             | Source code, phase records, guides, tests, screenshots                                |
| Chương 6 | ISO/IEC 25010, SEI/ATAM, Google SRE nếu nói NFR/evaluation method                                                            | Traceability matrix, tests, handoff notes, demo artifacts                             |
| Chương 7 | Không cần nhiều nguồn mới                                                                                                    | Tổng hợp từ Chương 1-6                                                                |

## 9. Claim policy cho bản viết chính thức

| Chủ đề          | Cách viết an toàn                                                                                                                           | Tránh viết                                                    |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Performance     | “Đề tài nêu phương pháp/metric đánh giá; kết quả định lượng chỉ trình bày nếu có benchmark hoặc smoke measurement cụ thể.”                  | “Hệ thống đáp ứng tải lớn” khi chưa đo.                       |
| Scalability     | “Kiến trúc hỗ trợ khả năng mở rộng ở mức thiết kế nhờ service boundary, stateless edge candidates, Kafka consumer group và data ownership.” | “Đã chứng minh scale tốt dưới tải lớn.”                       |
| Maintainability | “Được đánh giá bằng service ownership, shared contracts, Nx monorepo và change scenario.”                                                   | “Dễ bảo trì” mà không có bằng chứng/scenario.                 |
| Observability   | “Có thiết kế hoặc demo-limited observability nếu có log/health/screenshot.”                                                                 | “Production-grade observability” khi chưa có artifact đầy đủ. |
| Security        | “Đã kiểm chứng một số cơ chế bằng guard tests, tenant isolation evidence và permission matrix.”                                             | “Bảo mật toàn diện” hoặc “an toàn tuyệt đối.”                 |
| Deployment      | “Có hướng đóng gói/demo và Docker-based setup nếu có artifact.”                                                                             | “Production-ready deployment.”                                |

## 10. Danh mục từ viết tắt dự kiến

Chỉ đưa vào bản chính thức những từ xuất hiện nhiều. Danh sách dự kiến:

| Từ viết tắt | Diễn giải                         |
| ----------- | --------------------------------- |
| API         | Application Programming Interface |
| BFF         | Backend for Frontend              |
| EDA         | Event-Driven Architecture         |
| F&B         | Food and Beverage                 |
| IAM         | Identity and Access Management    |
| JWT         | JSON Web Token                    |
| KDS         | Kitchen Display System            |
| NFR         | Non-Functional Requirement        |
| OIDC        | OpenID Connect                    |
| POS         | Point of Sale                     |
| PWA         | Progressive Web App               |
| QR          | Quick Response                    |
| RBAC        | Role-Based Access Control         |
| SaaS        | Software as a Service             |
| SLA         | Service Level Agreement           |
| SLO         | Service Level Objective           |
| UI          | User Interface                    |
| VND         | Vietnamese Dong                   |

## 11. Workflow viết đề xuất

1. Chốt outline này với giảng viên hoặc dùng làm bản nền trước khi viết chương dài.
2. Tạo citation/source table cho Chương 1 và Chương 2, ưu tiên nguồn chuẩn và paper.
3. Vẽ trước các diagram Chương 3 và Chương 4 để cố định mạch kiến trúc.
4. Draft Chương 1 và Chương 3 trước để khóa phạm vi và yêu cầu.
5. Draft Chương 4 từ `technical-architecture.md`, nhưng viết lại theo văn phong khóa luận, không copy tài liệu kỹ thuật.
6. Draft Chương 5 từ source code/phase records, chỉ chọn implementation details có giá trị chứng minh.
7. Chuẩn bị screenshot/UI gallery và demo evidence song song với Chương 5.
8. Chương 6-7 đã audit/rerun theo Plan B sau Plan A; chỉ cập nhật thêm nếu có artifact production/pilot thật.
9. Draft Chương 1, Abstract và phụ lục còn lại sau cùng.
10. Rà soát hình thức: đánh số chương/mục, hình/bảng, caption, nguồn, danh mục từ viết tắt, References IEEE và phụ lục.

## 12. Checkpoint trước khi viết từng chương

Trước mỗi chương, cần trả lời nhanh:

1. Chương này thuộc phần nào trong khung bắt buộc của phụ lục hình thức?
2. Chương này cần nguồn ngoài, nguồn nội bộ hay cả hai?
3. Có claim kỹ thuật nào cần evidence cụ thể không?
4. Có nội dung nào chỉ là thiết kế/định hướng nhưng dễ bị viết như đã kiểm chứng không?
5. Có diagram/bảng/screenshot nào cần chuẩn bị trước khi viết không?
6. Các hình/bảng trong chương đã có caption, số hiệu và nguồn chưa?
7. Nội dung có đang quá code-level hoặc quá giống README kỹ thuật không?
8. Chương có đóng góp rõ vào mạch “vấn đề -> lý thuyết -> yêu cầu -> thiết kế -> triển khai -> đánh giá -> kết luận” không?
