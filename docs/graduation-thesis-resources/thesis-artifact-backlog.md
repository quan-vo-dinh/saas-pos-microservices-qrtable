# Backlog artifact cho khóa luận QRTable

> Tài liệu sống dùng để quản lý diagram, bảng, screenshot, demo evidence và phụ lục.
> Cập nhật gần nhất: 2026-05-31.

## 1. Mục đích

File này giúp theo dõi artifact cần chuẩn bị cho khóa luận để tránh mất ngữ cảnh giữa các phiên làm việc. Mỗi artifact cần gắn với một claim hoặc một vai trò lập luận cụ thể. Artifact chỉ có vai trò lưu bằng chứng đầy đủ nên đưa vào phụ lục, không nhồi vào chương chính.

Nguồn nền:

- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/presentation-format-graduation-thesis.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/testing/phase-5/saga-validation-strategy.md`
- `docs/architecture/erd.png`
- `docs/architecture/erd.mmd`

## 2. Quy ước trạng thái

| Trạng thái      | Ý nghĩa                                                                  |
| --------------- | ------------------------------------------------------------------------ |
| `planned`       | Đã xác định cần có, chưa tạo nội dung.                                   |
| `source-exists` | Đã có source/asset nền trong repo nhưng chưa biên tập cho khóa luận.     |
| `drafted`       | Đã có bản nháp nội dung/diagram/table.                                   |
| `captured`      | Đã chụp screenshot hoặc lưu demo artifact.                               |
| `placeholder`   | Đã có file ảnh trắng/khung LaTeX đúng tên để thay bằng screenshot thật.  |
| `inserted`      | Đã đưa vào LaTeX/chương/phụ lục.                                         |
| `verified`      | Đã kiểm tra caption, nguồn, số hiệu, render PDF và claim liên quan.      |
| `deferred`      | Tạm hoãn, chỉ dùng nếu chưa có evidence thật hoặc vượt phạm vi bản nháp. |

Mức ưu tiên:

- `P0`: cần có cho bản nháp đầy đủ.
- `P1`: nên có nếu muốn tăng sức thuyết phục.
- `P2`: đưa vào phụ lục hoặc làm sau nếu còn thời gian.

## 2.1. Nguyên tắc đa dạng artifact theo chương

Không chọn diagram chỉ để tạo cảm giác đa dạng. Mỗi artifact phải trả lời một câu hỏi đọc hiểu cụ thể và đúng mức trừu tượng của chương:

- Chương 3 ưu tiên actor/use-case overview, business flow và state/requirement table để làm rõ phạm vi nghiệp vụ trước khi nói đến kiến trúc.
- Chương 4 ưu tiên architecture/C4/container, service ownership, communication matrix, tenant isolation và decision flow để giải thích thiết kế hệ thống.
- Chương 5 ưu tiên sequence/runtime flow, implemented evidence table và screenshot/demo artifact đại diện để chứng minh implementation đã hiện thực các flow chính.
- Chương 6 ưu tiên traceability/evaluation/limitation table; chỉ dùng screenshot test output hoặc health check khi có artifact thật.
- Chương 1-2 có thể dùng conceptual diagram/comparison table nhưng phải bám nguồn học thuật hoặc nguồn chính thức, không bám implementation QRTable để định nghĩa khái niệm phổ quát.

## 3. Artifact tối thiểu trong chương chính

| ID       | Loại     | Vị trí   | Artifact                                            | Claim/vai trò hỗ trợ                                                                                             | Nguồn chính                                         | Trạng thái | Ưu tiên |
| -------- | -------- | -------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- | --------------------------------------------------- | ---------- | ------- |
| Hình 1.1 | Diagram  | Chương 1 | Luồng tổng quát từ QR ordering đến POS/KDS/payment  | Làm rõ bài toán QR ordering cần tích hợp vào vận hành POS, bếp và thanh toán                                     | `docs/business-logic.md`, research survey           | planned    | P0      |
| Bảng 1.1 | Bảng     | Chương 1 | Vấn đề, nguyên nhân và hướng giải quyết             | Kết nối pain point F&B với hướng tiếp cận SaaS POS QRTable                                                       | Proposal, research survey                           | planned    | P0      |
| Bảng 2.1 | Bảng     | Chương 2 | So sánh SaaS POS và POS truyền thống                | Giải thích vì sao mô hình SaaS phù hợp với POS hiện đại                                                          | NIST, nguồn thị trường, related work                | inserted   | P0      |
| Bảng 2.2 | Bảng     | Chương 2 | So sánh multi-tenancy models                        | Làm nền cho quyết định tenant isolation                                                                          | NIST, AWS/Microsoft SaaS guidance                   | inserted   | P0      |
| Bảng 2.3 | Bảng     | Chương 2 | So sánh monolith, modular monolith và microservices | Đặt microservices vào bối cảnh trade-off, không trình bày một chiều                                              | Fowler/Lewis, Azure Architecture Center, sách/paper | inserted   | P0      |
| Bảng 2.4 | Bảng     | Chương 2 | So sánh giao tiếp đồng bộ và bất đồng bộ            | Làm nền cho quyết định TCP/gRPC + Kafka có chọn lọc                                                              | Kafka docs, microservices docs                      | inserted   | P0      |
| Hình 2.1 | Diagram  | Chương 2 | Vòng đời vận hành POS F&B                           | Minh họa bàn → order → bếp → bill → thanh toán; Excalidraw + logo nhúng                                          | `chapter2-fnb-pos-lifecycle.excalidraw`             | verified   | P0      |
| Hình 2.2 | Diagram  | Chương 2 | Luồng QR ordering                                   | Quét QR → session → menu → giỏ → submit; logo QR/Redis                                                           | `chapter2-qr-ordering-flow.excalidraw`              | verified   | P0      |
| Hình 2.3 | Diagram  | Chương 2 | Mô hình SaaS multi-tenancy                          | Tenant trên nền tảng dùng chung; isolation boundary; logo cloud/PostgreSQL/Redis                                 | `chapter2-saas-multitenancy.excalidraw`             | verified   | P0      |
| Hình 2.4 | Diagram  | Chương 2 | Monolith vs microservices                           | Bounded context; logo Docker/PostgreSQL                                                                          | `chapter2-monolith-vs-microservices.excalidraw`     | verified   | P0      |
| Hình 2.5 | Diagram  | Chương 2 | Kafka event flow                                    | Producer/topic/partition/consumer group; logo Apache Kafka                                                       | `chapter2-kafka-event-flow.excalidraw`              | verified   | P0      |
| Hình 2.6 | Diagram  | Chương 2 | Outbox & saga overview                              | Transactional outbox + saga choreography; logo PostgreSQL/Kafka                                                  | `chapter2-outbox-saga-overview.excalidraw`          | verified   | P0      |
| Hình 2.7 | Diagram  | Chương 2 | WebSocket hint/refetch                              | Hint vs REST source of truth; logo WebSocket/Nginx/PostgreSQL                                                    | `chapter2-websocket-hint-refetch.excalidraw`        | verified   | P0      |
| Hình 2.8 | Diagram  | Chương 2 | OIDC/RBAC vs customer session                       | Staff lane vs QR session; logo Keycloak/OpenID/QR                                                                | `chapter2-oidc-rbac-saas-pos.excalidraw`            | verified   | P0      |
| Hình 3.1 | Diagram  | Chương 3 | Actor/use-case overview                             | Chuyển bối cảnh thành actor và use case hệ thống                                                                 | `docs/business-logic.md`, permission matrix         | verified   | P0      |
| Bảng 3.1 | Bảng     | Chương 3 | Actor, phạm vi truy cập và use case chính           | Tóm tắt RBAC/session actor và tenant-aware access ở mức yêu cầu                                                  | `docs/architecture/permission-matrix.md`            | verified   | P0      |
| Bảng 3.2 | Bảng     | Chương 3 | Functional requirements theo domain                 | Chốt phạm vi chức năng theo actor/domain                                                                         | `docs/business-logic.md`, phase docs                | verified   | P0      |
| Bảng 3.3 | Bảng     | Chương 3 | Non-functional requirements và tiêu chí đánh giá    | Làm cầu nối từ ISO/IEC 25010 sang Chương 6                                                                       | ISO/IEC 25010, evidence map                         | verified   | P0      |
| Hình 3.2 | Diagram  | Chương 3 | Business flow từ khách hàng đến bếp và thanh toán   | Trình bày flow nghiệp vụ end-to-end trước khi vào kiến trúc                                                      | `docs/business-logic.md`                            | verified   | P0      |
| Bảng 3.4 | Bảng     | Chương 3 | State machine nghiệp vụ chính                       | Tóm tắt lifecycle table/session/order/payment/KDS để chuẩn bị cho Chương 5-6                                     | `docs/business-logic.md`, traceability matrix       | verified   | P0      |
| Hình 4.1 | Diagram  | Chương 4 | Overall architecture                                | Chứng minh cấu trúc client -> BFF -> services -> infrastructure                                                  | `docs/technical-architecture.md`, `apps/`, `libs/`  | verified   | P0      |
| Hình 4.2 | Diagram  | Chương 4 | C4/container diagram                                | Cho người đọc thấy container chính và boundary giữa frontend/backend/infrastructure                              | `docs/technical-architecture.md`, source tree       | verified   | P0      |
| Bảng 4.1 | Bảng     | Chương 4 | Service ownership/data ownership                    | Chứng minh database-per-service và không cross-service DB ownership                                              | `docs/technical-architecture.md`, `apps/*`          | verified   | P0      |
| Bảng 4.2 | Bảng     | Chương 4 | Communication matrix                                | Giải thích HTTP/TCP/gRPC/Kafka/WebSocket/Webhook dùng ở đâu                                                      | `docs/technical-architecture.md`                    | verified   | P0      |
| Bảng 4.3 | Bảng     | Chương 4 | Kafka topic registry                                | Tránh invent topic; làm rõ event-driven có chọn lọc                                                              | `libs/constants`, queue docs/tests                  | verified   | P0      |
| Hình 4.3 | Diagram  | Chương 4 | Multi-tenancy isolation diagram                     | Minh họa tenant boundary ở DB/cache/event/API                                                                    | `docs/technical-architecture.md`, evidence map      | verified   | P0      |
| Hình 4.4 | Diagram  | Chương 4 | Kafka decision flow                                 | Giải thích khi nào dùng sync call, khi nào dùng event                                                            | `docs/technical-architecture.md`, evidence map      | verified   | P1      |
| Hình 5.1 | Sequence | Chương 5 | QR ordering sequence                                | Chứng minh flow customer QR/session/menu/cart/order đã được thiết kế/triển khai                                  | `docs/business-logic.md`, source code               | verified   | P0      |
| Hình 5.2 | Sequence | Chương 5 | Order confirm và stock consistency sequence         | Minh họa Order Confirm Saga: Order điều phối Catalog deduct/release, commit Order DB và outbox `order.confirmed` | `docs/business-logic.md`, Order/Catalog code        | verified   | P0      |
| Hình 5.3 | Sequence | Chương 5 | KDS ticket lifecycle                                | Chứng minh luồng `order.confirmed` -> Kitchen/KDS/Realtime UI                                                    | Kitchen code, Kafka topic registry                  | verified   | P0      |
| Hình 5.4 | Sequence | Chương 5 | Payment settlement sequence                         | Chứng minh cash/VietQR/SePay settlement và idempotency ở mức evidence                                            | Payment docs/code, SePay guide                      | verified   | P0      |
| Hình 5.5 | Sequence | Chương 5 | SaaS onboarding sequence                            | Minh họa SaaS Onboarding Mini-Saga với provisioning tenant, owner/subscription/payment settings và compensation  | SaaS docs/code, phase 4B docs                       | verified   | P0      |
| Bảng 5.1 | Bảng     | Chương 5 | Implemented evidence table                          | Map feature -> code/docs/tests/screenshot để tránh viết mơ hồ                                                    | Source code, docs, tests                            | verified   | P0      |
| Bảng 5.2 | Bảng     | Chương 5 | Shared libraries và vai trò trong consistency       | Chứng minh maintainability qua DTO/constants/providers/guards/shared types                                       | `libs/`, `docs/DOC-CODE-ANCHORS.md`                 | verified   | P1      |
| Bảng 6.1 | Bảng     | Chương 6 | Evaluation claim policy                             | Chặn overclaim trong performance/scalability/observability                                                       | `thesis-evidence-map.md`                            | verified   | P0      |
| Bảng 6.2 | Bảng     | Chương 6 | Requirement traceability summary                    | Chứng minh yêu cầu được đánh giá bằng test/demo/evidence                                                         | `docs/testing/phase-5/traceability-matrix.md`       | verified   | P0      |
| Bảng 6.3 | Bảng     | Chương 6 | Functional validation result theo cụm use case      | Tóm tắt kết quả kiểm chứng chức năng, gồm Order Confirm Saga và SaaS Onboarding Mini-Saga                        | Traceability matrix, Saga validation strategy       | verified   | P0      |
| Bảng 6.4 | Bảng     | Chương 6 | Architecture/NFR evidence status                    | Đánh giá scalability/maintainability bằng architecture/code evidence                                             | Evidence map, technical docs, tests                 | verified   | P0      |
| Bảng 6.5 | Bảng     | Chương 6 | Giới hạn đánh giá và hướng phát triển               | Ghi rõ giới hạn như full saga hardening, live provider, benchmark và observability                               | Handoff, evidence map, Saga validation strategy     | verified   | P0      |
| Bảng 7.1 | Bảng     | Chương 7 | Đóng góp, hạn chế và hướng phát triển               | Tổng kết kết quả mà không phóng đại                                                                              | Chương 1-6                                          | planned    | P0      |

## 4. Artifact mở rộng nên cân nhắc

| ID        | Loại          | Vị trí             | Artifact                                          | Khi nào nên dùng                                                              | Nguồn chính                          | Trạng thái    | Ưu tiên |
| --------- | ------------- | ------------------ | ------------------------------------------------- | ----------------------------------------------------------------------------- | ------------------------------------ | ------------- | ------- |
| Hình 1.2  | Diagram       | Chương 1           | Pain point của quy trình phục vụ thủ công         | Nếu Chương 1 cần làm rõ vấn đề trước khi giới thiệu QRTable                   | Research survey, proposal            | planned       | P1      |
| Bảng 1.2  | Bảng          | Chương 1           | Mapping pain point -> yêu cầu hệ thống            | Nếu muốn nối Chương 1 sang Chương 3 mượt hơn                                  | Research survey, business logic      | planned       | P1      |
| Bảng 2.5  | Bảng          | Chương 2           | SaaS vs on-premise trong bối cảnh POS             | Nếu phần SaaS cần sâu hơn Bảng 2.1                                            | NIST, SaaS guidance                  | planned       | P1      |
| Hình 2.2  | Diagram       | Chương 2           | Event-driven architecture khái niệm               | Đã cover bởi Hình 2.5 (Kafka) trong bản nháp hiện tại                         | Kafka docs                           | cancelled     | P1      |
| Bảng 2.6  | Bảng          | Chương 2           | Quality attributes theo ISO/IEC 25010             | Nếu Chương 6 cần nền lý thuyết đánh giá NFR rõ hơn                            | ISO/IEC 25010                        | planned       | P1      |
| Hình 3.3  | State machine | Chương 3           | Session state machine                             | Nếu flow QR/session có nhiều trạng thái cần làm rõ                            | `docs/business-logic.md`             | planned       | P1      |
| Hình 3.4  | State machine | Chương 3           | Order/payment state machine                       | Nếu cần chuẩn bị cho Chương 5 và Chương 6                                     | `docs/business-logic.md`             | planned       | P1      |
| Bảng 3.5  | Bảng          | Chương 3           | P0/P1/P2 requirements                             | Nếu cần phân cấp phạm vi chức năng trong bản nháp dài                         | Specs, traceability matrix           | planned       | P1      |
| Bảng 3.6  | Bảng          | Chương 3           | Abuse case/threat ở mức yêu cầu                   | Nếu muốn làm phần security/tenant isolation chặt hơn                          | OWASP, permission matrix             | planned       | P2      |
| Hình 4.5  | Diagram       | Chương 4           | ERD rút gọn theo service                          | Nếu cần minh họa data ownership mà không đưa ERD đầy đủ                       | `docs/architecture/erd.*`            | source-exists | P1      |
| Hình 4.6  | Diagram       | Chương 4           | Nx dependency graph hoặc module boundary          | Nếu cần chứng minh monorepo/shared libs hỗ trợ maintainability                | Nx project graph, source tree        | planned       | P2      |
| Hình 4.7  | Diagram       | Chương 4           | Redis key/domain ownership                        | Nếu cần giải thích cache/session/KDS queue boundary                           | `libs/common`, Redis policy/tests    | planned       | P1      |
| Hình 4.8  | Diagram       | Chương 4           | WebSocket room và hint/refetch model              | Nếu cần tránh hiểu nhầm WebSocket là source of truth                          | BFF realtime code, evidence map      | planned       | P1      |
| Hình 4.9  | Diagram       | Chương 4           | Deployment topology                               | Chỉ đưa vào chương chính nếu có deployment evidence đủ rõ                     | Docker/provider docs                 | planned       | P2      |
| Hình 4.10 | Diagram       | Chương 4           | Observability design                              | Chỉ dùng như thiết kế/hướng vận hành nếu chưa có dashboard thật               | Observability docs/design            | planned       | P2      |
| Hình 5.6  | Sequence      | Chương 5           | Shared cart mutation/version/idempotency          | Nếu cần chứng minh xử lý concurrency ở cart/session                           | Order/session code                   | planned       | P1      |
| Hình 5.7  | Sequence      | Chương 5           | Table transfer/safe empty-session release         | Nếu flow table/session lifecycle là điểm hội đồng dễ hỏi                      | Business logic, Order code           | planned       | P1      |
| Hình 5.8  | Sequence      | Chương 5           | Subscription checkout                             | Nếu SaaS subscription/payment cần minh họa sâu                                | SaaS/Payment docs/code               | planned       | P1      |
| Hình 5.9  | Sequence      | Chương 5           | Tenant suspend/activate behavior                  | Nếu cần làm rõ tenant lifecycle và access restriction                         | SaaS/User-Access/Authorizer docs     | planned       | P1      |
| Bảng 5.3  | Bảng          | Chương 5           | API/route groups theo domain                      | Nếu Chương 5 cần tóm tắt implementation surface mà không liệt kê endpoint dài | BFF controllers, docs anchors        | planned       | P2      |
| Bảng 6.x  | Bảng          | Chương 6/Phụ lục D | Test coverage chi tiết theo requirement           | Nếu cần trình bày traceability chi tiết hơn Bảng 6.2                          | Traceability matrix                  | planned       | P1      |
| Bảng 6.x  | Bảng          | Chương 6           | Scenario analysis cho scalability/maintainability | Nếu đánh giá NFR bằng architecture/code evidence                              | Evidence map, technical architecture | planned       | P1      |
| Bảng 6.x  | Bảng          | Chương 6           | Limitation vs future work mở rộng                 | Nếu cần chuyển từ đánh giá sang kết luận mượt hơn ngoài Bảng 6.5              | Evidence map                         | planned       | P1      |
| Hình 6.1  | Screenshot    | Chương 6           | Test run summary hoặc health check                | Chỉ đưa nếu có artifact thật                                                  | Test output, local/demo environment  | planned       | P1      |

## 5. Screenshot/UI gallery backlog

Chương 5 chỉ nên dùng khoảng 8-12 screenshot đại diện. Phần còn lại đưa vào phụ lục A để báo cáo vẫn tự chứa bằng chứng khi demo domain không còn hoạt động.

Phase 5D dùng chế độ scaffold/manual capture handoff: agent không mở Browser và không chụp UI. Agent chỉ tạo mapping, ref/caption, file placeholder trắng trong `thesis-report/assets/screenshots/` và khung LaTeX để người viết thay bằng screenshot thật sau.

| ID            | Nhóm                     | Vị trí khuyến nghị | Screenshot/artifact                                                         | Vai trò                                                               | Trạng thái | Ưu tiên |
| ------------- | ------------------------ | ------------------ | --------------------------------------------------------------------------- | --------------------------------------------------------------------- | ---------- | ------- |
| Ảnh 5.1       | Customer PWA             | Chương 5           | QR join/session screen                                                      | Minh họa khách vào phiên gọi món từ QR                                | planned    | P0      |
| Ảnh 5.2       | Customer PWA             | Chương 5           | Menu browsing screen                                                        | Minh họa trải nghiệm menu điện tử                                     | planned    | P0      |
| Ảnh 5.3       | Customer PWA             | Chương 5           | Cart/order submit screen                                                    | Minh họa submit order và cart                                         | planned    | P0      |
| Ảnh 5.4       | Customer PWA             | Chương 5           | Order tracking/payment request/VietQR                                       | Minh họa trạng thái order và thanh toán                               | planned    | P0      |
| Ảnh 5.5       | Staff POS                | Chương 5           | Table map hoặc live orders                                                  | Minh họa vận hành POS của nhân viên                                   | planned    | P0      |
| Ảnh 5.6       | Staff POS                | Chương 5           | Order detail confirm/cancel                                                 | Minh họa happy path Order Confirm Saga từ thao tác xác nhận của staff | planned    | P0      |
| Ảnh 5.7       | KDS                      | Chương 5           | Kitchen/bar queue                                                           | Minh họa ticket xuất hiện sau `order.confirmed`                       | planned    | P0      |
| Ảnh 5.8       | KDS                      | Chương 5           | Ticket detail/status update                                                 | Minh họa lifecycle ticket trong KDS                                   | planned    | P0      |
| Ảnh 5.9       | Owner dashboard          | Chương 5           | Menu/category management                                                    | Minh họa quản trị catalog                                             | planned    | P0      |
| Ảnh 5.10      | Owner dashboard          | Chương 5           | Table/QR management                                                         | Minh họa tạo bàn/QR theo tenant                                       | planned    | P0      |
| Ảnh 5.11      | Owner dashboard          | Chương 5           | Payment settings/subscription                                               | Minh họa kết quả SaaS onboarding ở payment settings/subscription      | planned    | P1      |
| Ảnh 5.12      | Super Admin              | Chương 5           | Tenant onboarding/lifecycle                                                 | Minh họa happy path SaaS Onboarding Mini-Saga                         | planned    | P1      |
| Ảnh A.1-A.8   | Customer PWA             | Phụ lục A          | Toàn bộ journey customer                                                    | Lưu bằng chứng UI đầy đủ hơn Chương 5                                 | planned    | P1      |
| Ảnh A.9-A.18  | Staff POS                | Phụ lục A          | Table/session/order/bill lifecycle                                          | Lưu bằng chứng UI staff workflow                                      | planned    | P1      |
| Ảnh A.19-A.26 | KDS                      | Phụ lục A          | Queue, ticket, status, empty state, realtime refresh                        | Lưu bằng chứng UI bếp/bar                                             | planned    | P1      |
| Ảnh A.27-A.38 | Owner dashboard          | Phụ lục A          | Menu, table, QR, payment, staff, subscription                               | Lưu bằng chứng owner workflow                                         | planned    | P1      |
| Ảnh A.39-A.48 | Super Admin              | Phụ lục A          | Tenant, plan, subscription, invoice                                         | Lưu bằng chứng admin/SaaS workflow                                    | planned    | P1      |
| Ảnh A.49-A.54 | Auth/security            | Phụ lục A          | Keycloak login, role-based blocked route, suspended tenant warning nếu có   | Minh họa security/access control, chỉ dùng nếu có evidence thật       | planned    | P2      |
| Ảnh A.55-A.60 | Evaluation/demo          | Phụ lục D          | Test run, traceability summary, Saga evidence, health check, demo checklist | Bằng chứng đánh giá, kiểm chứng Saga và reproducibility               | planned    | P1      |
| Ảnh A.61-A.70 | Observability/deployment | Phụ lục D/E        | Grafana/log/trace/deployment screen                                         | Chỉ dùng nếu Phase 6/7 hoặc dashboard thật được backfill              | deferred   | P2      |

### 5.1. Mapping filename/label Phase 5D

Các filename dưới đây là contract để Phase 5D tạo placeholder trắng và để người viết thay bằng ảnh thật mà không phải sửa LaTeX ref.

| ID       | Filename trong `assets/screenshots/`         | LaTeX label                                       | Vị trí mặc định | Flow liên quan                  |
| -------- | -------------------------------------------- | ------------------------------------------------- | --------------- | ------------------------------- |
| Ảnh 5.1  | `chapter5-01-customer-qr-session.png`        | `fig:chapter5-screenshot-customer-qr-session`     | Chương 5        | Hình 5.1                        |
| Ảnh 5.2  | `chapter5-02-customer-menu-browsing.png`     | `fig:chapter5-screenshot-customer-menu`           | Chương 5        | Hình 5.1                        |
| Ảnh 5.3  | `chapter5-03-customer-cart-submit.png`       | `fig:chapter5-screenshot-customer-cart-submit`    | Chương 5        | Hình 5.1/5.2                    |
| Ảnh 5.4  | `chapter5-04-customer-order-payment.png`     | `fig:chapter5-screenshot-customer-payment`        | Chương 5        | Hình 5.4                        |
| Ảnh 5.5  | `chapter5-05-staff-pos-table-map.png`        | `fig:chapter5-screenshot-staff-table-map`         | Chương 5        | Hình 5.2                        |
| Ảnh 5.6  | `chapter5-06-staff-order-confirm.png`        | `fig:chapter5-screenshot-staff-order-confirm`     | Chương 5        | Hình 5.2; Order Confirm Saga    |
| Ảnh 5.7  | `chapter5-07-kds-queue.png`                  | `fig:chapter5-screenshot-kds-queue`               | Chương 5        | Hình 5.3; `order.confirmed`     |
| Ảnh 5.8  | `chapter5-08-kds-ticket-status.png`          | `fig:chapter5-screenshot-kds-ticket-status`       | Chương 5        | Hình 5.3                        |
| Ảnh 5.9  | `chapter5-09-owner-menu-management.png`      | `fig:chapter5-screenshot-owner-menu-management`   | Chương 5        | Catalog                         |
| Ảnh 5.10 | `chapter5-10-owner-table-qr-management.png`  | `fig:chapter5-screenshot-owner-table-qr`          | Chương 5        | Catalog/QR                      |
| Ảnh 5.11 | `chapter5-11-owner-payment-subscription.png` | `fig:chapter5-screenshot-owner-payment-settings`  | Chương 5        | Hình 5.4/5.5; onboarding result |
| Ảnh 5.12 | `chapter5-12-admin-tenant-onboarding.png`    | `fig:chapter5-screenshot-admin-tenant-onboarding` | Chương 5        | Hình 5.5; SaaS Mini-Saga        |

### 5.2. Artifact kiểm chứng Saga cho Phụ lục D

Các artifact dưới đây bổ sung cho screenshot UI. UI chỉ minh họa happy path; compensation và ranh giới consistency phải được chứng minh bằng test, log hoặc snapshot dữ liệu thật.

| ID       | Artifact cần lưu                                             | Vai trò trong khóa luận                                                                    | Nguồn/command gợi ý                                                                                                                                                               | Trạng thái | Ưu tiên |
| -------- | ------------------------------------------------------------ | ------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------- | ------- |
| D-SAGA-1 | Output test Order Confirm Saga unit/contract                 | Chứng minh orchestration, replay, lỗi Catalog, outbox và compensation ở service layer      | `pnpm nx test order --testPathPatterns=order-confirm-saga.service.spec.ts --runInBand`                                                                                            | planned    | P0      |
| D-SAGA-2 | Output test Catalog stock gateway contract                   | Chứng minh TCP command shape và chuẩn hóa lỗi deduct/release                               | `pnpm nx test order --testPathPatterns=catalog-stock-gateway.service.spec.ts --runInBand`                                                                                         | planned    | P0      |
| D-SAGA-3 | Output opt-in Order/Catalog stock integration                | Chứng minh ranh giới stock live giữa Order và Catalog khi local stack sẵn sàng             | `RUN_PHASE5_STOCK_INTEGRATION=1 pnpm nx test order --testPathPatterns=order-stock-concurrency.integration.spec.ts --runInBand`                                                    | planned    | P1      |
| D-SAGA-4 | Output SaaS onboarding DB integration                        | Chứng minh success path, rollback và `tenant.created` outbox của SaaS Onboarding Mini-Saga | `RUN_PHASE5_SAAS_ONBOARDING_INTEGRATION=1 pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/onboarding-saga-db.integration.spec.ts`            | planned    | P0      |
| D-SAGA-5 | Output SaaS live Payment TCP integration                     | Chứng minh Payment service thật tạo `tenant_payment_settings` trong lát cắt opt-in         | `RUN_PHASE5_SAAS_ONBOARDING_LIVE_PAYMENT=1 pnpm exec jest --config apps/saas/jest.config.cts --runInBand apps/saas/src/services/onboarding-saga-live-payment.integration.spec.ts` | planned    | P0      |
| D-SAGA-6 | Snapshot DB/outbox cho `order.confirmed` và `tenant.created` | Bằng chứng dữ liệu cho điểm commit nghiệp vụ của hai Saga                                  | Query rút gọn từ Order/SaaS DB trong môi trường demo                                                                                                                              | planned    | P1      |

## 6. Phụ lục và artifact nộp kèm

| ID        | Vị trí        | Artifact                                                                 | Mục đích                                                      | Trạng thái | Ưu tiên |
| --------- | ------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------- | ---------- | ------- |
| Phụ lục A | Appendices    | UI gallery đầy đủ                                                        | Lưu screenshot theo user journey                              | planned    | P0      |
| Phụ lục B | Appendices    | Hướng dẫn setup/demo                                                     | Giúp hội đồng hoặc agent sau tái hiện demo                    | planned    | P0      |
| Phụ lục C | Appendices    | GitHub repository, release/tag/commit hash, source structure             | Bảo toàn bằng chứng source code sau khi domain hết hạn        | planned    | P0      |
| Phụ lục D | Appendices    | Test command output, traceability summary, Saga evidence, demo checklist | Hỗ trợ Chương 6, kiểm chứng Saga và khả năng tái hiện kết quả | planned    | P0      |
| Phụ lục E | Appendices    | ERD, permission matrix, diagram mở rộng                                  | Giữ chi tiết kỹ thuật mà không làm chương chính quá dài       | planned    | P1      |
| Demo-1    | Demo evidence | Demo domain nếu còn hoạt động                                            | Phụ trợ cho hội đồng xem trực tiếp                            | planned    | P1      |
| Demo-2    | Demo evidence | Video demo link/file                                                     | Bằng chứng ổn định hơn domain live                            | planned    | P1      |
| Demo-3    | Demo evidence | Seed/demo script hoặc hướng dẫn dữ liệu thử                              | Giúp tái hiện scenario đã báo cáo                             | planned    | P1      |

## 7. Quy tắc cập nhật backlog

1. Khi tạo diagram/table/screenshot, cập nhật trạng thái từ `planned` sang `drafted`, `placeholder`, `captured` hoặc `source-exists`.
2. Khi đưa vào LaTeX, cập nhật sang `inserted` và ghi đúng vị trí chương/phụ lục nếu khác dự kiến.
3. Khi build PDF và kiểm tra caption/số hiệu/nguồn thành công, cập nhật sang `verified`.
4. Không đổi artifact thành `verified` nếu chưa kiểm tra render PDF.
5. Không thêm screenshot observability/deployment nếu chưa có artifact thật.
6. Không dùng screenshot thay thế cho evidence kiến trúc; screenshot chỉ chứng minh UI/demo, không chứng minh scalability hay production readiness.
7. Với Mermaid/PlantUML/draw.io, source text chỉ tương ứng trạng thái `drafted`; chỉ chuyển sang `inserted` khi đã render thành PDF/PNG/SVG phù hợp và chèn vào LaTeX.
8. Không chèn trực tiếp Mermaid code vào `.tex` trừ khi template đã được cấu hình renderer rõ ràng; mặc định LaTeX chỉ chèn file đã render bằng `\includegraphics`.
9. Nếu môi trường không render được diagram, giữ source trong `thesis-report/assets/diagrams/`, ghi command render thủ công và không đánh dấu artifact là `inserted` hoặc `verified`.
10. Với Phase 5D scaffold, file ảnh trắng chỉ được đánh dấu `placeholder`; chỉ chuyển sang `captured` khi người viết thay bằng screenshot thật, và chỉ chuyển sang `verified` sau khi build PDF kiểm tra ảnh/caption/label thành công.

## 8. Bước tiếp theo cho backlog

Phase 4B đã tạo và verify nhóm diagram/table P0 của Chương 4; Phase 4C đã viết bản nháp Chương 4 và giữ nguyên các artifact đó; Phase 4D đã bổ sung và verify nhóm artifact P0 còn thiếu của Chương 3; **Phase 5A đã hoàn tất** audit implementation evidence cho Chương 5:

1. Source Mermaid Chương 4 đã lưu tại `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter4-*.mmd`.
2. PDF render Chương 4 đã lưu tại `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter4-*.pdf`.
3. Hình 4.1-4.4 và Bảng 4.1-4.3 đã được chèn vào `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`.
4. Build LaTeX cuối Phase 4C đã pass; Chương 4 hiện có nội dung prose/trade-off, không chỉ là artifact placeholder.
5. Source Mermaid Chương 3 đã lưu tại `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-actor-use-case-overview.mmd` và `docs/graduation-thesis-resources/thesis-report/assets/diagrams/chapter3-business-flow.mmd`.
6. PDF render Chương 3 đã lưu tại `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter3-actor-use-case-overview.pdf` và `docs/graduation-thesis-resources/thesis-report/assets/figures/chapter3-business-flow.pdf`.
7. Hình 3.1, Hình 3.2 và Bảng 3.1-3.4 đã được build/kiểm tra trong PDF; `.lof`, `.lot`, `pdftotext` và preview PNG xác nhận caption, nguồn, số hiệu và nội dung không bị trắng.
8. `docs/graduation-thesis-resources/thesis-phase5a-evidence-audit.md` đã tạo với: ma trận evidence 6 flow, kế hoạch 5 sequence diagram (Hình 5.1–5.5), Bảng 5.1 implemented evidence (20 dòng), Bảng 5.2 shared libraries, screenshot plan 12 ảnh đại diện P0/P1.

**Phase 5C đã hoàn tất:** Chương 5 đã được viết prose vào `thesis-report/chapters/05-trien-khai-he-thong.tex`, giữ nguyên Hình 5.1-Hình 5.5 đã verify, chèn Bảng 5.1 implemented evidence và Bảng 5.2 shared libraries, sau đó build LaTeX và kiểm tra `.lof`/`.lot`.

**Bước tiếp theo là Phase 5D scaffold/manual capture handoff:** không dùng Browser để chụp UI. Agent cần tạo `thesis-phase5d-screenshot-scaffold.md`, tạo placeholder trắng theo mapping §5.1, chèn khung LaTeX vào Chương 5/Phụ lục A, cập nhật trạng thái screenshot sang `placeholder` và build PDF để kiểm tra ref/caption/path. Với Saga, Phase 5D nên ưu tiên Ảnh 5.6, Ảnh 5.7, Ảnh 5.11 và Ảnh 5.12 cho UI happy path, đồng thời chuẩn bị checklist Phụ lục D cho terminal output và DB/outbox snapshot theo §5.2. Người viết sẽ thay các file placeholder bằng screenshot thật sau.
