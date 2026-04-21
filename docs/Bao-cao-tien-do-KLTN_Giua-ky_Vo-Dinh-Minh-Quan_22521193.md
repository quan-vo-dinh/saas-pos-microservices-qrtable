###### **TRƯỜNG ĐẠI HỌC CÔNG NGHỆ THÔNG TIN — ĐHQG-HCM**

**KHOA HỆ THỐNG THÔNG TIN**

## **PHIẾU BÁO CÁO TIẾN ĐỘ GIỮA KỲ**

## **KHÓA LUẬN TỐT NGHIỆP**

**Tên đề tài (Tiếng Việt):** NGHIÊN CỨU VÀ XÂY DỰNG NỀN TẢNG POS THEO MÔ HÌNH SAAS TÍCH HỢP ĐẶT MÓN QUA MÃ QR DỰA TRÊN KIẾN TRÚC VI DỊCH VỤ.

**Tên đề tài (Tiếng Anh):** RESEARCH ON THE DEVELOPMENT OF A SAAS-BASED POS PLATFORM INTEGRATING QR CODE ORDERING UNDER A MICROSERVICES ARCHITECTURE.

**Giảng viên hướng dẫn:** ………………………………………………………………

**Sinh viên thực hiện đề tài** (sĩ số trong nhóm: 01)**:**

1. SV1: **Võ Đình Minh Quân** — MSSV: **22521193**

Khóa: …………………………… Lớp: ……………………………

| Kiểm tra ngày: ……/……/20……             | Đánh giá công việc hoàn thành: **~ 45 %** <br/> Được tiếp tục: …… &nbsp;&nbsp;&nbsp;&nbsp; Không tiếp tục: …… |
| :------------------------------------ | :------------------------------------------------------------------------------------------------------------ |
| **Nhận xét của Giảng viên hướng dẫn** |                                                                                                               |

`	`Ngày …… tháng …… năm 20……

`	`**Giảng viên hướng dẫn**

`	   `_(ký và ghi rõ họ tên)_

---

## I. TÓM TẮT NỘI DUNG ĐỀ TÀI

Em xin báo cáo tiến độ thực hiện khóa luận với đề tài "**Nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS tích hợp đặt món qua mã QR dựa trên kiến trúc vi dịch vụ**". Hệ thống hướng tới giải quyết bài toán số hóa quy trình vận hành cho ngành dịch vụ ẩm thực — đồ uống (F&B) tại Việt Nam, với ba khối nghiệp vụ trọng tâm: (i) đặt món tại bàn qua mã QR cho khách hàng (Customer PWA, không cần cài đặt ứng dụng); (ii) Point-of-Sale cho nhân viên và quản lý — tiếp nhận đơn realtime, quản lý sơ đồ bàn, đối soát thanh toán; (iii) Kitchen Display System — hàng đợi bếp/bar tách biệt, có batching và cảnh báo SLA, đồng bộ thời gian thực với nhân viên và khách.

Toàn bộ hệ thống được em triển khai theo **kiến trúc microservices đa tenant** trên Nx monorepo, với NestJS cho tầng backend và React/Next.js cho tầng frontend; sử dụng BFF (Backend-For-Frontend) làm biên HTTP/WebSocket, Keycloak làm Identity Provider, kết hợp PostgreSQL — MongoDB — Redis cho các tầng persistence khác nhau, và **Apache Kafka** đóng vai trò event backbone cho các phản ứng nghiệp vụ xuyên bounded context.

## II. MỤC TIÊU & PHẠM VI ĐỀ TÀI

**Mục tiêu nghiên cứu** gồm ba ý chính: (1) xây dựng kiến trúc tham chiếu cho một nền tảng SaaS POS đa tenant theo microservices, có khả năng giải quyết các bài toán _structural coupling_, _temporal coupling_ và _fan-out_ thường gặp ở các hệ POS truyền thống; (2) đề xuất khung quyết định lựa chọn kênh giao tiếp giữa các microservice — em ký hiệu là **4P + 2AP** — để chọn đúng giữa đồng bộ TCP, đẩy thời gian thực qua WebSocket Gateway, hay bất đồng bộ qua Kafka topic; (3) triển khai và đánh giá mô hình quản lý phiên/giỏ hàng trên Redis với _optimistic locking_, kết hợp **state machine vòng đời đơn hàng** có khóa tồn kho bi quan trên PostgreSQL để bảo đảm tính nhất quán dữ liệu trong điều kiện đa người dùng đồng thời.

**Phạm vi sản phẩm minh chứng** gồm: (i) tầng backend microservices (NestJS) — BFF, Authorizer (Keycloak adapter), User-Access, Catalog, SaaS Management, Order, Kitchen, Payment, Notification — trong đó ba dịch vụ kế thừa từ codebase khóa học được em giữ nguyên làm "living templates"; (ii) hai ứng dụng frontend — Customer PWA mobile-first (React + Vite + Tailwind + shadcn/ui + TanStack Query) và Management App (Next.js App Router + shadcn/ui + Zustand) gồm ba module Dashboard, POS, KDS; (iii) hạ tầng phát triển trên Docker Compose gồm PostgreSQL, MongoDB, Redis, Keycloak, Apache Kafka và Zookeeper.

## III. LỘ TRÌNH THEO PHASE

Em chia toàn bộ khối lượng công việc thành **chín phase** triển khai tuần tự (theo critical path) hoặc song song (parallel track), mỗi phase đi kèm tiêu chí nghiệm thu và sản phẩm đầu ra cho phase kế tiếp. Trọng số phần trăm dưới đây được em ước lượng theo phạm vi nghiệp vụ, số tầng hệ thống chạm tới và mức rủi ro kỹ thuật của từng phase — không chia đều theo số tuần thực hiện.

| Phase | Tên                                  |  Trọng số | Trạng thái           |
| ----- | ------------------------------------ | --------: | -------------------- |
| 0     | Nền tảng & Kiến trúc                 |       7 % | Hoàn thành           |
| 1     | Catalog + Menu + Table               |      20 % | Hoàn thành           |
| 2A    | Mở rộng RBAC + Order Service + Kafka |      18 % | Đang triển khai      |
| 2B    | Kitchen Service + WebSocket          |      10 % | Theo critical path   |
| 3     | Thanh toán                           |      10 % | Theo critical path   |
| 4A    | Saga + Hardening                     |       8 % | Parallel track       |
| 4B    | SaaS + Onboarding                    |       7 % | Parallel track       |
| 4C    | Notification + Staff Management      |       6 % | Parallel track       |
| 5–7   | Testing + Observability + Deploy     |      14 % | Triển khai song song |
|       | **Tổng**                             | **100 %** |                      |

## IV. TIẾN ĐỘ THỰC HIỆN

### 4.1 Phase 0 — Nền tảng & Kiến trúc (đã hoàn thành)

Em đã hoàn tất việc tổ chức codebase, đánh dấu các dịch vụ kế thừa từ khóa học làm "living templates"; áp dụng Pragmatic Layered Architecture (Controller → Service → Repository) cho các dịch vụ mới; phác thảo ERD tổng thể của hệ thống; khởi tạo hai frontend app (Customer PWA và Management App); tổ chức shared libraries theo Nx Grouping; thiết lập hạ tầng xác thực gồm Keycloak realm, chuỗi guard `UserGuard → TenantGuard → PermissionGuard` và middleware giải quyết tenant; cuối cùng là xây dựng khung layout cho hai frontend app với cơ chế chuyển hướng theo vai trò sau khi đăng nhập. Sản phẩm bàn giao: monorepo khởi tạo thành công, các dịch vụ và ứng dụng frontend đều khởi động được, luồng đăng nhập qua Keycloak chuyển hướng đúng theo role.

### 4.2 Phase 1 — Catalog + Menu + Table (đã hoàn thành)

Em đã xây dựng xong: mock UI Dashboard quản lý thực đơn và bàn; tầng xác thực phía frontend (NextAuth + Keycloak provider) với giao diện đăng nhập tuỳ biến qua Keycloakify; mock UI Customer PWA gồm trang QR landing và giao diện thực đơn mobile-first; shared types cho domain catalog; module Cloudinary dùng chung với tổ chức folder cô lập theo tenant; backend Catalog Service hoàn chỉnh với CRUD đầy đủ, đa tenant, tích hợp Cloudinary và cache Redis; cuối cùng là tích hợp frontend ↔ backend với hooks React Query, optimistic update và upload ảnh.

Một số kết quả nghiệm thu nổi bật: (i) khách quét QR → BFF kiểm tra HMAC token → trả về dữ liệu thực đơn qua cache Redis với độ trễ dưới 100 ms; (ii) chủ quán upload ảnh món → ảnh hiển thị đồng bộ trên Dashboard và Customer PWA; (iii) cô lập đa tenant đã được kiểm thử chéo, dữ liệu của tenant A không xuất hiện ở phạm vi tenant B; (iv) state machine bàn `Available → Occupied → Billing → Cleaning → Available` vận hành đúng đặc tả nghiệp vụ.

### 4.3 Phase 2A — Mở rộng RBAC + Order Service + Kafka (đang triển khai)

Phase 2A là phase **trọng tâm về kiến trúc** trong nửa đầu dự án: lần đầu em đưa Apache Kafka vào hệ thống và triển khai đầy đủ vòng đời đơn hàng đa tenant. Tóm lược tiến độ:

| Bước | Nội dung công việc                                                                                         | Trạng thái                |
| ---- | ---------------------------------------------------------------------------------------------------------- | ------------------------- |
| 2.0  | Mở rộng tập permission cho luồng order/kitchen/payment/table và mapping tới các role; re-seed dữ liệu role | Đã hoàn thành             |
| 2.1  | Nghiên cứu nền tảng Apache Kafka (xem phần V)                                                              | Đã hoàn thành             |
| 2.2  | Mock UI: giỏ hàng và theo dõi đơn (PWA), live orders + sơ đồ bàn (POS), Kanban KDS                         | Đã hoàn thành             |
| 2.3  | Shared types domain order/bill/session và hợp đồng sự kiện realtime                                        | Đã hoàn thành             |
| 2.4  | **Backend Order Service trên PostgreSQL + session/cart Redis + Kafka producer + BFF Direct**               | Đang thực hiện            |
| 2.5  | Tích hợp frontend ↔ backend cho luồng đơn hàng và service request                                         | Sẽ thực hiện ngay sau 2.4 |

**Chi tiết Bước 2.4 (đang thực hiện):**

_Phần đã hoàn tất:_ (a) tầng persistence trên PostgreSQL với các entity `orders`, `order_items`, `bills`, mọi truy vấn đều lọc bắt buộc theo `tenant_id`; (b) quản lý phiên/giỏ hàng trên Redis — phiên có TTL 2 giờ và idle 30 phút với cơ chế tự động đóng, giỏ hàng dùng cấu trúc Hash kèm trường `version` để hiện thực optimistic locking, xung đột phiên bản được trả về 409 kèm dữ liệu mới nhất cho client retry; (c) state machine đơn hàng `DRAFT → PENDING → PROCESSING → READY → SERVED → COMPLETED` cùng nhánh `CANCELED`, mỗi chuyển trạng thái có guard nghiệp vụ về vai trò người thực hiện; (d) khoá tồn kho bi quan bằng `SELECT … FOR UPDATE` trong cùng giao dịch xác nhận đơn, đã kiểm thử concurrency cục bộ với hai luồng cùng đặt món cuối — kết quả như kỳ vọng; (e) tổng hợp hoá đơn theo phiên và thao tác chuyển bàn được thực hiện atomic; (f) phân quyền tầng API qua chuỗi guard chuẩn cho nhân viên và `SessionGuard` cho khách.

_Phần đang thực hiện:_ (i) producer Kafka cho topic `order.confirmed` — em đã đưa Kafka và Zookeeper vào hạ tầng container của môi trường dev, đang xây dựng module producer dùng chung với cấu hình `acks=all`, `enable.idempotence=true`, partition key chọn `tenantId` để bảo đảm _ordering per tenant_ (lý do thiết kế ở §V), kèm phần kiểm thử tích hợp xác minh message thực sự xuất hiện trên topic sau khi giao dịch commit; (ii) BFF Direct cho `order.created` và `service.requested` — phần emit qua WebSocket Gateway thuộc Phase 2B nên hiện tạm dùng polling phía frontend; (iii) chuẩn hoá header `x-idempotency-key` ở BFF cho thao tác submit đơn nhằm chống double-submit từ Customer PWA.

### 4.4 Tổng hợp tiến độ tại mốc giữa kỳ

Em ước lượng khối lượng công việc đã hoàn thành đạt **khoảng 45 %** so với tổng phạm vi đề tài. Phần đóng góp chính tới từ hai phase nền tảng (Phase 0 và Phase 1) đã đóng đầy đủ tiêu chí nghiệm thu, phần lớn Phase 2A đã hoàn tất (chỉ còn lại phần tích hợp Kafka producer ở Bước 2.4 và phần tích hợp frontend ở Bước 2.5), cùng với khối lượng tài liệu nghiên cứu và kiến trúc đã được em chuẩn bị song song để phục vụ chương lý thuyết trong báo cáo cuối kỳ.

Em xin được thẳng thắn báo cáo rằng Phase 2A — phase phức tạp nhất về mặt kiến trúc trong toàn bộ dự án — **có chậm nhẹ so với kế hoạch ban đầu**. Nguyên nhân chủ yếu là phần thời gian em dành cho nghiên cứu nền tảng Apache Kafka và xác lập khung quyết định 4P + 2AP (chi tiết ở §5.4). Phần đầu tư này cũng đồng thời được tận dụng làm nền cho Phase 2B, Phase 3 và Phase 4A, do đó em kỳ vọng độ trễ này sẽ được bù lại ở các phase kế tiếp.

## V. KHÓ KHĂN & GIẢI PHÁP

### 5.1 Đường cong học tập của Apache Kafka trong ngữ cảnh hệ SaaS đa tenant

Trở ngại lớn nhất của em trong giai đoạn này là Kafka không thể được áp dụng "máy móc" theo phong cách RPC đồng bộ. Để tránh các anti-pattern phổ biến — _Kafka-as-UI-Proxy_, _dual-write inconsistency_, _hot partition_, _lost message do auto-commit_ — em phải xác lập các tầng quyết định kiến trúc trước khi viết code, gồm: (i) phân biệt rõ _distributed append-only log_ của Kafka với _message queue_ truyền thống để quyết định cách dùng offset, retention và replay; (ii) chiến lược partitioning cho hệ multi-tenant — chọn `tenantId` làm partition key để có _ordering per tenant_, chấp nhận trade-off hotspot khi xuất hiện tenant lưu lượng lớn; (iii) chọn mô hình _at-least-once_ kết hợp idempotent consumer (dùng dedup key trên Redis) thay vì _exactly-once_ — vốn kéo theo Kafka Transactions với chi phí vận hành cao và không bao phủ được consumer còn ghi ra PostgreSQL/Redis; (iv) cấu hình producer `acks=all` kết hợp `enable.idempotence=true` cho mọi business event; (v) bài toán _dual-write_ — em chọn lộ trình hai bước: ở Phase 2A publish trực tiếp sau commit để giữ độ phức tạp tối thiểu, sau đó harden lên **Transactional Outbox Pattern** ở Phase 4A.

Toàn bộ các quyết định trên được em tổng hợp thành tài liệu lý thuyết Kafka chuyên sâu nội bộ của đề tài (gồm 13 chương và hơn 30 sơ đồ minh hoạ), vừa phục vụ triển khai vừa được dùng làm chương lý thuyết trong báo cáo cuối kỳ.

### 5.2 Khung quyết định "Kafka vs BFF Direct" (4P + 2AP)

Một câu hỏi xuyên suốt khi em thiết kế hệ thống là: _sự kiện nào nên đi qua Kafka, sự kiện nào nên đi qua BFF Direct push xuống WebSocket, và sự kiện nào vẫn nên gọi đồng bộ TCP?_ Để có cơ sở quyết định nhất quán, em đề xuất khung **4P + 2AP** với bốn nguyên tắc nên dùng Kafka — (P1) cross-context business reaction, (P2) temporal decoupling, (P3) fan-out nhiều consumer, (P4) atomicity safeguard kết hợp Outbox — và hai anti-pattern cần tránh: (AP1) Kafka làm UI proxy khi BFF đã có đủ thông tin sau response TCP, (AP2) TCP đồng bộ cho tác vụ fire-and-forget.

Áp dụng khung này cho QRTable, em rút gọn thành **năm Kafka topic** thật sự cần thiết (xoay quanh order — payment — kitchen SLA — tenant lifecycle) và **sáu sự kiện UI** đẩy thẳng qua BFF Direct (xoay quanh đơn vừa tạo, thực đơn vừa cập nhật, trạng thái bàn, món vừa xong, yêu cầu phục vụ, tenant vừa bị tạm khoá). Kết quả này giúp em tránh lỗi _over-engineering_ thường gặp ở các nhóm chưa quen Kafka — xu hướng đẩy hết mọi event qua broker, kể cả những event vốn không cần độ bền của log.

### 5.3 Khó khăn về vận hành hạ tầng

Việc bổ sung Kafka và Zookeeper vào hạ tầng container hiện có (PostgreSQL, MongoDB, Redis, Keycloak) phát sinh xung đột về tên container và port — em đã giải quyết bằng cách tách phần Kafka thành tệp Docker Compose riêng và dùng external network để chia sẻ với phần hạ tầng chính. Đồng bộ dữ liệu permission trên Authorizer (MongoDB) sau khi mở rộng tập quyền: em phải re-seed dữ liệu role mapping để JWT/permission check khớp đúng thực tế, và việc seed này được em chuẩn hoá theo hướng _idempotent_ để giảm rủi ro phải reset cơ sở dữ liệu mỗi khi thay đổi mapping role trong giai đoạn dev.

### 5.4 Đánh giá nỗ lực và độ trễ tiến độ

Em xin được thẳng thắn báo cáo rằng tiến độ thực tế của Phase 2A **có chậm nhẹ so với kế hoạch ban đầu** (phase này được em ước lượng ban đầu khoảng 2 — 2,5 tuần). Em xác định nguyên nhân chính tới từ ba yếu tố: (a) _đường cong học tập của Kafka_ — đây là lần đầu em làm việc với một hệ event-driven thực sự ở quy mô microservice, do đó em phải nghiên cứu đủ sâu trước khi đặt bút thiết kế chi tiết; (b) _các quyết định kiến trúc cho hệ multi-tenant_ (lựa chọn `tenantId` làm partition key, mô hình at-least-once + idempotent consumer, lộ trình hai bước cho dual-write) cần thời gian phân tích trade-off cẩn thận, vì sai lầm ở giai đoạn này sẽ lan ra toàn bộ các phase sau; (c) Phase 2A có _độ phức tạp kiến trúc cao nhất trong nửa đầu dự án_ — vừa mở rộng phân quyền cho toàn luồng order/kitchen/payment, vừa lần đầu đưa Kafka vào hệ multi-tenant, vừa duy trì trải nghiệm thời gian thực qua BFF Direct.

Tuy nhiên, em đánh giá phần thời gian đầu tư cho hai hoạt động (a) nghiên cứu Kafka chuyên sâu và (b) xác lập khung quyết định 4P + 2AP là **khoản đầu tư cần thiết**, có thể được tận dụng làm nền chung cho ba phase tiếp theo: Phase 2B (cầu nối Kafka → WebSocket), Phase 3 (Kafka `payment.completed` fan-out cho ba consumer), và Phase 4A (Outbox Pattern). Do đó độ trễ ở Phase 2A được kỳ vọng sẽ được bù lại ở các phase sau nhờ giảm thời gian thiết kế và rủi ro tích hợp. Để bảo đảm tiến độ tổng thể đến cuối kỳ, em đã chuẩn bị phương án **giảm scope có kiểm soát** cho các phase parallel track — chi tiết ở phần VII.

## VI. KẾT QUẢ ĐẠT ĐƯỢC

### 6.1 Sản phẩm phần mềm

Đến mốc kiểm tra giữa kỳ, em đã có một Nx monorepo vận hành ổn định, gồm: ba dịch vụ template kế thừa từ codebase khóa học (được đánh dấu rõ để tham chiếu pattern); hai dịch vụ hạ tầng đã sẵn sàng phục vụ QRTable là BFF (API Gateway + WebSocket) và Authorizer (Keycloak adapter); hai dịch vụ QRTable đã hoàn thành — Catalog Service và SaaS Management Service ở mức nền tảng Phase 0; một dịch vụ QRTable đang triển khai là Order Service (Phase 2A); và hai ứng dụng frontend chạy đồng thời là Customer PWA và Management App.

Hệ thống xác thực — phân quyền đã hoàn chỉnh với Keycloak realm gồm sáu vai trò (SUPER_ADMIN, OWNER, MANAGER, WAITER, CHEF, BARISTA), chuỗi guard nhiều lớp, `SessionGuard` riêng cho luồng khách quét QR, và giao diện đăng nhập tuỳ biến qua Keycloakify. Catalog Service cung cấp đầy đủ CRUD cho thực đơn và sơ đồ bàn, upload ảnh qua Cloudinary với folder cô lập theo tenant, kèm cache Redis cho thực đơn (TTL 10 phút, invalidate khi có thay đổi). Order Service đang ở giai đoạn hoàn thiện với các entity `orders`/`order_items`/`bills` trên PostgreSQL, state machine bảy trạng thái cộng nhánh `CANCELED`, quản lý phiên/giỏ hàng trên Redis với optimistic locking, khoá tồn kho bi quan, và producer Kafka `order.confirmed` đang ở giai đoạn kiểm thử tích hợp.

### 6.2 Tài liệu nghiên cứu & thiết kế

Song song với phần triển khai, em đã hoàn chỉnh hệ thống tài liệu nội bộ phục vụ trực tiếp cho chương lý thuyết và chương kiến trúc trong báo cáo cuối kỳ, gồm: (i) tài liệu kế hoạch triển khai tổng thể (lộ trình 9 phase, đồ thị phụ thuộc, trọng số ước lượng); (ii) tài liệu kiến trúc kỹ thuật toàn hệ thống khoảng 13 chương — bao trùm kiến trúc tổng thể, chiến lược multi-tenancy, phân rã microservices, registry các Kafka topic, mô hình BFF Direct, khung 4P + 2AP, xác thực — phân quyền, WebSocket Gateway, tích hợp thanh toán, caching, giao dịch phân tán và observability; (iii) tài liệu mô tả nghiệp vụ và state machine; (iv) ma trận phân quyền chi tiết sáu vai trò × khoảng 21 quyền; (v) ERD tổng thể; (vi) tài liệu lý thuyết Apache Kafka chuyên sâu áp dụng cho đề tài (khoảng 13 chương, hơn 30 sơ đồ); (vii) các tài liệu hướng dẫn tích hợp Cloudinary và bootstrap Keycloak; (viii) chín tài liệu chi tiết kế hoạch cho từng phase.

### 6.3 Đóng góp về mặt nghiên cứu

Bên cạnh sản phẩm phần mềm, em xác định bốn đóng góp về mặt nghiên cứu: (1) **khung quyết định 4P + 2AP** để lựa chọn kênh giao tiếp phù hợp giữa Kafka, BFF Direct và TCP đồng bộ trong một hệ SaaS POS đa tenant — có thể tổng quát hoá cho các hệ microservice tương tự; (2) **phân tích so sánh trade-off** giữa hai mô hình delivery semantics — _exactly-once_ qua Kafka Transactions và _at-least-once kết hợp idempotent consumer_ — trong ngữ cảnh consumer còn ghi dữ liệu ra PostgreSQL và Redis; (3) **chiến lược partition key bằng `tenantId`** kèm ba nguyên tắc enforce tenant isolation ở tầng ứng dụng, với phân tích vấn đề hotspot và phương án giảm nhẹ bằng compound key cho môi trường production thực; (4) **lộ trình hai bước cho bài toán dual-write** — publish trực tiếp sau commit ở Phase 2A để giữ độ phức tạp tối thiểu, sau đó migrate lên Transactional Outbox Pattern ở Phase 4A — minh hoạ cách quản lý độ phức tạp tăng dần (incremental complexity) trong một dự án hạn chế thời gian.

## VII. KẾ HOẠCH TRIỂN KHAI 5 TUẦN CUỐI KỲ

Với ngân sách thời gian khoảng năm tuần kể từ mốc kiểm tra giữa kỳ tới hạn nộp báo cáo và demo cuối kỳ, em ưu tiên giữ critical path Phase 2A → 2B → 3 cho luồng demo chính, đồng thời giảm scope phù hợp ở các phase parallel track (4A, 4B, 4C) để bảo đảm kịp tiến độ:

| Tuần | Mốc công việc dự kiến                                                                                                                                                                                                                                 |
| ---- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Đóng Phase 2A: hoàn tất Bước 2.4 (kiểm thử tích hợp producer Kafka, hardening các giao dịch xác nhận đơn và chuyển bàn) và Bước 2.5 (tích hợp frontend ↔ backend cho luồng order và service request); pass toàn bộ tiêu chí nghiệm thu của Phase 2A. |
| 2    | Phase 2B: Kitchen Service (Redis-only) với hàng đợi FIFO, batching và SLA timer; WebSocket Gateway (Socket.io + Redis Adapter) với phân room theo vai trò; cầu nối Kafka → WebSocket; tích hợp KDS và POS với realtime.                               |
| 3    | Phase 3: Payment Service trên PostgreSQL; Stripe Checkout với mệnh giá VND; làm tròn theo đồng nội tệ; webhook xác thực chữ ký; flow refund; phát Kafka `payment.completed` và `payment.refunded`.                                                    |
| 4    | Phase 4A (Transactional Outbox Pattern, idempotency hardening, bù trừ saga) và phần trọng yếu của Phase 4B + 4C ở mức MVP (luồng onboarding tenant, cấu hình notification cho chủ quán và nhân viên).                                                 |
| 5    | Phase 5–7: hoàn thiện bộ test ở mức nghiệm thu critical path, thiết lập observability tối thiểu, đóng gói Docker, viết phần báo cáo cuối kỳ và chuẩn bị kịch bản demo.                                                                                |

Trong tình huống thời gian bị bóp hẹp ở các tuần cuối, em đã chuẩn bị phương án **giảm scope có kiểm soát**: ưu tiên hoàn thiện luồng critical path cho demo (Phase 0 → 1 → 2A → 2B → 3 → 5–7) ở mức nghiệm thu đầy đủ, các phần parallel track (4A, 4B, 4C) sẽ được triển khai ở mức MVP đủ chứng minh khả thi kiến trúc, và các nội dung mở rộng được liệt kê ở phần _future work_ của báo cáo cuối kỳ.

## VIII. ĐÁNH GIÁ TỔNG THỂ

Em xin tóm lược đánh giá tổng thể tại mốc kiểm tra giữa kỳ: (1) khối lượng công việc đã hoàn thành ước lượng đạt **khoảng 45 %** so với tổng phạm vi đề tài; (2) hai phase nền tảng (Phase 0 và Phase 1) đã hoàn thành đầy đủ và pass toàn bộ tiêu chí nghiệm thu; (3) Phase 2A — phase trọng tâm về kiến trúc — đã hoàn tất phần thiết kế, tầng persistence, quản lý phiên/giỏ hàng, state machine, khoá tồn kho và mở rộng RBAC, phần tích hợp Kafka producer đang ở giai đoạn kiểm thử tích hợp; (4) phần Phase 5–7 chưa khởi động phần kỹ thuật, nhưng các deliverables tài liệu kiến trúc, nghiệp vụ và lý thuyết đã được em chuẩn bị song song và sẵn sàng dùng cho báo cáo cuối kỳ.

Em xin thẳng thắn báo cáo rằng tiến độ thực tế của Phase 2A **có chậm nhẹ so với kế hoạch ban đầu**, nguyên nhân chính tới từ thời gian em đầu tư cho nghiên cứu Apache Kafka và xác lập khung quyết định 4P + 2AP — vốn là phần kiến thức và kiến trúc nền tảng cần được làm cẩn thận để không phát sinh rủi ro lan toả ở các phase sau (chi tiết ở §5.4). Phần đầu tư này được em xem như khoản đầu tư có giá trị "đòn bẩy" cho ba phase phía sau, do đó độ trễ này được kỳ vọng sẽ được bù lại nhờ giảm thời gian thiết kế và rủi ro tích hợp ở các phase kế tiếp. Khả năng hoàn thành đề tài đúng hạn cuối kỳ được em đánh giá là **khả thi**, với điều kiện giữ đúng nhịp triển khai theo bảng kế hoạch ở phần VII và áp dụng phương án giảm scope có kiểm soát ở các phase parallel track khi cần thiết.

Em xin chân thành cảm ơn Thầy/Cô đã dành thời gian đánh giá phiếu báo cáo này. Em rất mong nhận được nhận xét và góp ý của Thầy/Cô để có thể hoàn thiện đề tài tốt hơn trong giai đoạn còn lại.

---

**Sinh viên thực hiện**

Võ Đình Minh Quân — MSSV 22521193
