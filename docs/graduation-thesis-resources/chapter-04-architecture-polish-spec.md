# Đặc tả cập nhật Chương 4 - Thiết kế kiến trúc và quyết định công nghệ

> Tài liệu phục vụ khóa luận, tạo ngày 2026-06-04. Đây không phải spec kỹ thuật trong `docs/superpowers/`; mục tiêu là handoff cho một AI/session khác cập nhật Chương 4 của báo cáo LaTeX.

> Trạng thái 2026-06-04: Spec này đã được triển khai cho Chương 4. Bản LaTeX hiện có Hình 4.1-4.10, Bảng 4.1-4.4 và build pass bằng XeLaTeX/TeX Live. Các diagram con P1 trong §5.2 gồm Nx, communication topology, Redis ownership, security/auth và SePay/VietQR đã được đưa vào chương chính.

## 1. Mục tiêu

Chương 4 hiện đã có bản nháp về kiến trúc QRTable, nhưng cách trình bày còn thiên về chữ và bảng. Lượt cập nhật này cần làm chương rõ hơn ở ba điểm:

1. Tên chương và tên mục phải thể hiện rõ vai trò của Chương 4: chuyển yêu cầu nghiệp vụ thành quyết định kiến trúc và quyết định công nghệ.
2. Phần lựa chọn công nghệ phải được giải thích theo architecture drivers, trade-off và vị trí của từng công nghệ trong QRTable, không chỉ liệt kê stack.
3. Hệ thống hình minh họa cần chuyên nghiệp hơn, có các diagram con đúng mức trừu tượng để người đọc thấy công nghệ đi qua BFF, service boundary, data store, messaging và external provider như thế nào.

Phạm vi chỉ là Chương 4 và các tài liệu khóa luận liên quan. Không sửa Chương 3 trong task này.

## 2. Trạng thái hiện tại cần hiểu trước khi sửa

Agent thực hiện phải bắt đầu bằng CodeGraph để kiểm tra codebase state, sau đó đọc tối thiểu các tài liệu sau:

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
- `docs/graduation-thesis-resources/chapter-04-architecture-evidence.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- `docs/README.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/architecture/permission-matrix.md`
- `docs/phases/phase-4d-dashboard-reporting.md`
- `docs/guides/sepay-configuration-guide-phase3.md`

Nếu viết lại phần liên quan đến library/framework/cloud/API cụ thể, dùng `ctx7` CLI trước khi khẳng định API/khái niệm hiện tại. Ví dụ: Nx project graph/affected/module boundary, Kafka, Redis, Keycloak/OIDC, Socket.IO, NestJS, Next.js. Không thêm citation mới nếu chưa kiểm chứng nguồn thật và metadata đủ chắc.

## 3. Định vị chương sau khi polish

Tên chương khuyến nghị:

```tex
\chapter{Thiết kế kiến trúc và quyết định công nghệ cho QRTable}
```

Nếu muốn giữ tên ngắn hơn, có thể dùng:

```tex
\chapter{Thiết kế kiến trúc hệ thống QRTable}
```

Không nên giữ tên quá phổ thông nếu chương đã bổ sung phần quyết định công nghệ. Tên mục nên chuyển từ mô tả chung sang mô tả theo vai trò lập luận.

## 4. Cấu trúc mục khuyến nghị

Cấu trúc dưới đây là hướng đề xuất. Agent triển khai được phép tinh chỉnh thứ tự nếu giữ được logic từ architecture drivers -> technology choices -> architecture views -> trade-offs.

| Mục  | Tên khuyến nghị                                                  | Vai trò                                                                                                                                     |
| ---- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| 4.1  | Mục tiêu thiết kế và architecture drivers                        | Nêu các driver: multi-tenant SaaS, QR ordering, POS/KDS realtime, payment settlement, maintainability, bounded context.                     |
| 4.2  | Lựa chọn công nghệ và vai trò trong QRTable                      | Giải thích vì sao dùng Nx, NestJS, Next.js/React, PostgreSQL, MongoDB, Redis, Kafka, Keycloak, Socket.IO, SePay/VietQR, Cloudinary, Docker. |
| 4.3  | Kiến trúc tổng thể của hệ thống                                  | Đặt hình các thành phần và công nghệ; sau đó giữ/điều chỉnh Hình overall/C4 hiện có.                                                        |
| 4.4  | Tổ chức Nx monorepo và kiểm soát module boundary                 | Làm rõ `apps/`, `libs/`, shared contracts, affected build/test, không làm mờ service boundary.                                              |
| 4.5  | Service boundary và data ownership                               | Giữ Bảng service ownership, cập nhật thêm reporting Phase 4D nếu viết vào Chương 4.                                                         |
| 4.6  | Multi-tenancy và tenant isolation                                | Giữ hình tenant isolation, nhấn mạnh database-per-service + `tenant_id`, không claim database-per-tenant.                                   |
| 4.7  | Kiến trúc giao tiếp: REST, TCP/gRPC, Kafka, WebSocket và Webhook | Tách rõ channel theo mục đích, có thể thêm communication topology diagram.                                                                  |
| 4.8  | Event-driven design và Kafka topic registry                      | Giữ decision flow/topic registry, chỉ dùng 5 approved topics.                                                                               |
| 4.9  | Redis cho cache, session, cart và KDS runtime                    | Có thể thêm Redis ownership/keyspace diagram.                                                                                               |
| 4.10 | Kiến trúc bảo mật: Keycloak, JWT/OIDC, RBAC và QR session        | Có thể thêm auth/security flow diagram; customer không dùng Keycloak.                                                                       |
| 4.11 | Kiến trúc thanh toán SePay/VietQR                                | Có thể thêm payment integration diagram cho `QRTBL` và `QRSUB`.                                                                             |
| 4.12 | Thiết kế triển khai, observability và giới hạn claim             | Chỉ viết ở mức design/demo-limited nếu chưa có runtime evidence.                                                                            |
| 4.13 | Tổng hợp đánh đổi kiến trúc                                      | Kết chương bằng trade-off, không quảng cáo công nghệ.                                                                                       |

## 5. Artifact bắt buộc hoặc nên có

### 5.1. P0 - Nên có trong lượt polish

| Artifact                                                       | Vai trò                                                                                                     | Ghi chú                                                                       |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| Hình 4.x - Các thành phần và công nghệ trong kiến trúc QRTable | Hình trung tâm mới cho thấy công nghệ nào nằm ở lớp nào và nối vào service nào.                             | Không phải logo gallery. Mỗi nhãn phải gắn với flow hoặc architecture driver. |
| Bảng 4.x - Quyết định công nghệ theo architecture driver       | Tóm tắt technology, QRTable component, lý do chọn, trade-off/giới hạn.                                      | Dùng để trả lời câu hỏi "tại sao chọn công nghệ này".                         |
| Cập nhật overall architecture                                  | Sửa source nếu có thông tin sai, ví dụ `Kafka 6 approved domain topics` phải thành 5 topic nếu còn tồn tại. | Sửa `.mmd`, render PDF, không sửa PDF trực tiếp.                              |
| Cập nhật prose Chương 4                                        | Đổi tên chương/mục, thêm phần lựa chọn công nghệ, giảm cảm giác toàn chữ.                                   | Viết tiếng Việt học thuật, không thành README.                                |

### 5.2. P1 - Nên thêm nếu scope đủ

| Artifact                                    | Vai trò                                                                               | Ghi chú                                                    |
| ------------------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| Hình 4.x - Nx monorepo và module boundary   | Minh họa `apps/`, `libs/`, shared contracts, affected/build/test, boundary rule.      | Có thể dùng Mermaid hoặc SVG/Excalidraw.                   |
| Hình 4.x - Communication topology           | Cho thấy REST/WebSocket qua BFF, TCP/gRPC nội bộ, Kafka domain events, webhook SePay. | Hữu ích hơn nếu Hình tổng thể quá dày.                     |
| Hình 4.x - Security/auth architecture       | Tách staff/owner/admin Keycloak/JWT/OIDC/RBAC với customer QR/session.                | Tránh viết customer dùng Keycloak.                         |
| Hình 4.x - SePay/VietQR payment integration | Tách `QRTBL` bill payment và `QRSUB` subscription invoice.                            | Không claim live provider validation nếu chưa có evidence. |
| Hình 4.x - Redis ownership/keyspace         | Làm rõ Redis là cache/runtime state có owner, không phải source of truth tổng quát.   | Có thể lấy từ `chapter-04-architecture-evidence.md` §8.    |

### 5.3. P2 - Chỉ thêm nếu có evidence đủ

- Deployment topology.
- Observability design.
- ERD rút gọn theo service.
- Screenshot/dashboard runtime evidence.

Các artifact P2 không nên đẩy vào chương chính nếu làm chương quá nặng hoặc chưa có bằng chứng runtime đủ chắc.

## 6. Thiết kế hình "Các thành phần và công nghệ trong kiến trúc QRTable"

Hình này là điểm chốt theo thảo luận với người viết. Nó nên có dạng architecture map, không phải danh sách logo.

Nội dung tối thiểu:

1. Client layer: Customer PWA, Management App/POS/KDS/Admin, Keycloak Theme nếu cần.
2. Edge/BFF layer: BFF/API Gateway, REST, WebSocket/Socket.IO, guard chain, TCP/gRPC clients.
3. Domain service layer: Authorizer, User-Access, SaaS, Catalog, Order, Kitchen, Payment.
4. Data/runtime layer: PostgreSQL, MongoDB, Redis, Kafka.
5. External provider layer: Keycloak, SePay/VietQR, Cloudinary.
6. Dev/deploy/support layer: Nx monorepo, Docker/Docker Compose; observability chỉ nếu ghi rõ design/demo.

Luồng cần thể hiện:

- Client -> BFF qua HTTP REST và WebSocket.
- BFF -> service qua TCP/gRPC.
- Staff/owner/admin auth: BFF -> Authorizer -> Keycloak, User-Access cho profile/RBAC.
- Customer auth: QR token/session qua BFF/Order, không đi Keycloak.
- Order -> Catalog qua TCP khi cần kiểm soát stock.
- Order/Payment/Kitchen/SaaS -> Kafka cho 5 approved domain topics.
- Kitchen dùng Redis KDS runtime và BFF phát WebSocket hint/refetch.
- Payment/SePay webhook: SePay -> BFF -> Payment hoặc SaaS, rồi Payment phối hợp Order khi hóa đơn khách hoàn tất.
- Catalog -> Cloudinary cho ảnh menu nếu có evidence hiện hành.

Quy tắc trình bày:

- Ưu tiên diagram vector có source chỉnh sửa được: `.mmd`, `.excalidraw`, `.svg`, hoặc script render có version control.
- Với hình icon-rich, Excalidraw/SVG/custom vector phù hợp hơn Mermaid nếu cần logo và layout học thuật.
- Dùng icon đã có trong `thesis-report/assets/diagrams/chapter2-icons/` khi phù hợp: Kafka, Keycloak, PostgreSQL, Redis, Docker, WebSocket, OpenID, QR, cloud.
- Logo mới như Nx, NestJS, Next.js, React, MongoDB, Socket.IO, SePay, Cloudinary phải có nguồn/license rõ hoặc thay bằng biểu tượng trung tính + nhãn chữ.
- Không dùng ảnh ngẫu nhiên trên mạng nếu không có license/attribution phù hợp.
- Caption phải nói rõ hình diễn giải QRTable, không mô tả công nghệ phổ quát một cách rời rạc.

## 7. Guardrails bắt buộc

- Không thêm hoặc mô tả Notification Service như core service.
- Không invent Kafka topic. Chỉ dùng: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.
- Không viết WebSocket là source of truth; chỉ là hint/refetch/realtime notification.
- Không viết customer dùng Keycloak/OIDC.
- Không viết Payment sở hữu bill/session; Order sở hữu bill/session lifecycle.
- Không viết Order ghi trực tiếp DB Catalog/stock.
- Không viết Kitchen có PostgreSQL/MongoDB riêng trong kiến trúc hiện tại.
- Không claim full saga hardening, CDC/Debezium, exactly-once delivery hoặc production-grade distributed transaction.
- Không claim deployment/observability production-ready, HA, stress test hoặc benchmark nếu chưa có artifact thật.
- Không thêm citation giả hoặc nguồn không dùng thật vào `references.bib`.
- Không sửa Chương 3 trong task này.

## 8. Tài liệu phải đồng bộ sau khi triển khai

Sau khi thực sự sửa Chương 4, agent phải cập nhật tối thiểu:

- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`
- Source diagram trong `docs/graduation-thesis-resources/thesis-report/assets/diagrams/`
- Rendered figures trong `docs/graduation-thesis-resources/thesis-report/assets/figures/`
- `docs/graduation-thesis-resources/chapter-04-architecture-evidence.md`
- `docs/graduation-thesis-resources/thesis-official-outline.md`
- `docs/graduation-thesis-resources/thesis-artifact-backlog.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-agent-prompt-bank.md` nếu cần thêm prompt handoff

Nếu thêm nguồn học thuật/chính thức mới, cập nhật:

- `docs/graduation-thesis-resources/thesis-report/references.bib`
- Phần citation tương ứng trong `.tex`

## 9. Tiêu chí hoàn tất

Task polish Chương 4 chỉ được xem là hoàn tất khi:

1. Chương 4 có tên chương/tên mục rõ hơn và có phần lựa chọn công nghệ theo lý do/trade-off.
2. Ít nhất một hình thể hiện các thành phần và công nghệ của QRTable được tạo, render và chèn vào LaTeX.
3. Diagram source và rendered PDF khớp nhau; không sửa trực tiếp file PDF.
4. Các bảng/hình mới đã được ghi đúng trạng thái trong artifact backlog.
5. Workflow plan đã cập nhật Current Status, Next Concrete Step, Open Questions và Risks.
6. LaTeX build pass bằng XeLaTeX/TeX Live hoặc tool build đã thống nhất.
7. Không có claim vượt evidence, citation giả hoặc topic/service tự bịa.
