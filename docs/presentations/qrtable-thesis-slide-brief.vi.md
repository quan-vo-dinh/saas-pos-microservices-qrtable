# QRTable Thesis Slide Brief

> **Mục đích:** Tài liệu này dùng làm input cho AI tạo slide và làm kịch bản thuyết trình cho báo cáo luận án tốt nghiệp.  
> **Đề tài:** Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices.  
> **Phiên bản brief:** 2026-05-09  
> **Nguồn nội dung chính:** `business-logic.md`, `technical-architecture.md`, `permission-matrix.md`, `implementation_plan.md`, các phase docs và thesis proposal.

---

## 0. Hướng Dẫn Chung Cho AI Tạo Slide

### 0.1. Vai trò của deck

Deck này là **slide báo cáo luận án tốt nghiệp thiên về kiến trúc hệ thống**, không phải landing page, không phải sales deck và không phải demo UI thuần túy.

Thông điệp xuyên suốt:

> QRTable là một Proof of Concept cho nền tảng SaaS POS F&B đa tenant, dùng kiến trúc Microservices và event-driven communication có chọn lọc để giải quyết các bài toán: cô lập dữ liệu tenant, real-time ordering, nhất quán dữ liệu khi đặt món đồng thời, phân quyền vận hành và thanh toán phù hợp thị trường Việt Nam.

### 0.2. Phong cách thiết kế

- Tỉ lệ slide: **16:9**.
- Ngôn ngữ: **Tiếng Việt**, dùng thuật ngữ kỹ thuật tiếng Anh khi cần, ví dụ `BFF`, `Kafka`, `tenant_id`, `WebSocket`.
- Phong cách: **technical thesis deck**, hiện đại, rõ ràng, có tính học thuật.
- Không dùng phong cách marketing quá đà. Không biến deck thành quảng cáo nhà hàng.
- Ưu tiên: sơ đồ kiến trúc, sequence flow, state machine, service ownership map, matrix.
- Mỗi slide chỉ nên có **một claim chính** ở tiêu đề.
- Không nhồi quá nhiều chữ. Nếu nội dung dài, đưa phần giải thích vào **speaker script**, không đưa hết lên slide.

### 0.3. Quy ước visual

AI tạo slide nên chừa vùng visual rõ ràng cho các slide có ghi:

`[VISUAL TẠO RIÊNG]`

Với các slide này, người làm deck có thể tự vẽ sơ đồ bằng Mermaid, Figma, Excalidraw hoặc công cụ khác rồi gắn vào. AI không được tự bịa thêm thành phần kiến trúc ngoài danh sách node/flow đã ghi.

Mã màu khuyến nghị:

- `BFF/API Gateway`: teal.
- `Business Services`: blue.
- `Kafka/Event`: amber hoặc orange.
- `Redis/Runtime state`: red hoặc crimson.
- `Database/Persistence`: slate/gray.
- `Security/Auth`: purple hoặc navy.
- `Payment`: green.
- `Risk/Error/Constraint`: coral/red.

### 0.4. Những điểm không được overclaim

- Không nói hệ thống đã production-ready.
- Không nói mọi giao tiếp đều qua Kafka.
- Không nói Kafka thay thế hoàn toàn TCP/gRPC.
- Không nói Payment Service sở hữu bill. **Bill thuộc Order Service**; Payment chỉ nhận `billId` và ghi nhận thanh toán.
- Không nói khách hàng dùng Keycloak. Customer dùng **anonymous session + QR HMAC token**, còn staff/admin dùng **JWT/Keycloak**.
- Không nói Order Service trực tiếp update stock trong Catalog DB. Stock do **Catalog Service** sở hữu, Order gọi Catalog qua TCP command.
- Không nói WebSocket là source of truth. WebSocket là realtime hint/push; REST/DB vẫn là canonical source.

### 0.5. Kết cấu đề xuất

Deck đề xuất gồm **30 slide**, phù hợp bài thuyết trình khoảng **22-28 phút**. Nếu thời lượng ngắn hơn, có thể gộp các slide 15-18 và 23-27.

---

## Slide 01. Trang Bìa

### Mục tiêu slide

Giới thiệu đề tài như một báo cáo luận án nghiêm túc, đồng thời định vị ngay đây là đề tài về **kiến trúc hệ thống**, không chỉ là app đặt món.

### Nội dung hiển thị trên slide

**Tiêu đề chính:**

Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices

**Phụ đề:**

QRTable - Architecture Proof of Concept for F&B SaaS POS

**Thông tin phụ:**

- Sinh viên: Võ Đình Minh Quân - 22521193
- Cán bộ hướng dẫn: TS. Nguyễn Thanh Bình
- Trường Đại học Công nghệ Thông tin - ĐHQG TP.HCM
- Thời gian thực hiện: 26/01/2026 - 30/05/2026

### Visual / layout

[VISUAL TẠO RIÊNG]

Gợi ý hình nền hoặc visual:

- Một nhà hàng hiện đại, trên bàn có mã QR, điện thoại đang mở menu.
- Overlay nhẹ các nhãn kỹ thuật: `SaaS`, `Microservices`, `QR Order`, `Real-time`, `VietQR`.
- Không dùng ảnh stock quá tối hoặc quá marketing.

### Speaker script

Em xin trình bày đề tài luận án tốt nghiệp: nghiên cứu và xây dựng nền tảng POS theo mô hình SaaS, tích hợp đặt món qua mã QR, dựa trên kiến trúc Microservices.

Điểm trọng tâm của đề tài không chỉ là xây dựng một giao diện gọi món, mà là thiết kế một kiến trúc có khả năng xử lý các vấn đề đặc trưng của hệ thống F&B hiện đại: nhiều nhà hàng cùng dùng một nền tảng, khách đặt món real-time tại bàn, bếp và phục vụ phải đồng bộ tức thời, thanh toán cần phù hợp thị trường Việt Nam, và dữ liệu giữa các tenant phải được cô lập an toàn.

---

## Slide 02. Luận Điểm Trung Tâm

### Mục tiêu slide

Đặt thesis statement cho toàn bộ bài nói. Hội đồng cần hiểu ngay "đề tài này chứng minh điều gì".

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QRTable không chỉ thay menu giấy bằng QR, mà kiểm chứng một kiến trúc SaaS POS phân tán cho ngành F&B

**3 ý chính:**

- Một platform phục vụ nhiều nhà hàng trên cùng hạ tầng: **multi-tenant SaaS**.
- Một luồng vận hành khép kín: **QR scan -> menu -> order -> kitchen -> payment**.
- Một kiến trúc tham chiếu: **BFF + Microservices + Redis + Kafka + WebSocket + Keycloak**.

**Callout ngắn:**

Mục tiêu của PoC là chứng minh kiến trúc, không cạnh tranh tính năng với các POS thương mại.

### Visual / layout

[VISUAL TẠO RIÊNG]

Vẽ một pipeline ngang:

`Customer QR` -> `Order` -> `Staff POS` -> `KDS` -> `Payment` -> `Monitoring`

Dưới pipeline ghi các lớp kiến trúc:

`BFF`, `Services`, `Redis`, `Kafka`, `PostgreSQL`, `Keycloak`.

### Speaker script

Thông điệp chính của bài báo cáo là: QRTable không chỉ là một màn hình menu điện tử. Đây là một Proof of Concept để kiểm chứng cách thiết kế một nền tảng SaaS POS theo kiến trúc Microservices cho ngành F&B.

Luồng nghiệp vụ của ngành nhà hàng có đủ các đặc tính khó của hệ thống phân tán: khách hàng đặt món đồng thời, nhiều vai trò vận hành khác nhau, trạng thái bàn thay đổi liên tục, bếp cần cập nhật real-time và thanh toán phải được ghi nhận chính xác. Vì vậy, đề tài tập trung vào cách chia service, cách giao tiếp giữa service, cách cô lập dữ liệu theo tenant và cách đảm bảo consistency trong các flow lõi.

---

## Slide 03. Bối Cảnh Thị Trường Và Động Lực

### Mục tiêu slide

Cho thấy đề tài có bối cảnh thực tiễn rõ ràng: F&B Việt Nam đang số hóa mạnh, QR order và thanh toán không tiền mặt tạo điều kiện cho mô hình này.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

F&B Việt Nam đã sẵn sàng cho QR ordering, nhưng bài toán kiến trúc phía sau phức tạp hơn giao diện menu

**Nội dung chính:**

- Ngành F&B có quy mô lớn, nhiều mô hình cửa hàng và nhu cầu vận hành khác nhau.
- POS SaaS giúp nhà hàng giảm chi phí triển khai và dùng chung hạ tầng.
- QR Order rút ngắn thao tác gọi món, nhưng kéo theo yêu cầu real-time giữa khách, nhân viên, bếp và thanh toán.
- VietQR và thanh toán chuyển khoản tạo tiền đề cho luồng payment không cần cổng thẻ quốc tế.

**Số liệu có thể đưa lên slide nếu cần:**

- Doanh thu F&B Việt Nam 2024 trong proposal: **688,8 nghìn tỷ đồng**.
- Quy mô cơ sở kinh doanh trong proposal: **323.010 cơ sở**.
- Tỷ lệ người tiêu dùng ưu tiên VietQR trong proposal: **61,4%**.

### Visual / layout

Biểu đồ/infographic 3 cụm:

1. `Market scale`
2. `QR ordering behavior`
3. `Cashless/VietQR readiness`

Nếu không muốn dùng chart, có thể dùng 3 stat cards lớn.

### Speaker script

Đề tài xuất phát từ bối cảnh ngành F&B Việt Nam đang chuyển đổi số mạnh. Các nhà hàng không chỉ cần phần mềm tính tiền, mà cần một hệ thống kết nối được các bước vận hành: menu, bàn, nhân viên, bếp, hóa đơn và thanh toán.

QR Order tạo ra trải nghiệm rất tự nhiên cho khách hàng: quét mã, xem menu và đặt món ngay tại bàn. Nhưng ở phía sau, mỗi thao tác của khách lại cần cập nhật tức thời cho nhân viên và bếp, cần kiểm tra trạng thái món, trạng thái bàn, tồn kho và thanh toán. Vì vậy, giá trị nghiên cứu của đề tài nằm ở kiến trúc xử lý những luồng đó một cách có kiểm soát.

---

## Slide 04. Bốn Thách Thức Kiến Trúc

### Mục tiêu slide

Nêu rõ 4 vấn đề kỹ thuật mà luận án giải quyết. Đây là slide nền để dẫn sang Microservices.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Một nền tảng QR POS cần xử lý đồng thời 4 áp lực kiến trúc

**4 khối nội dung:**

1. **Distributed Monolith**
   - Service tách vật lý nhưng phụ thuộc đồng bộ quá chặt.
   - Một service chậm có thể kéo chậm toàn bộ flow.

2. **Data Consistency**
   - Nhiều khách có thể đặt cùng món cùng lúc.
   - Cần tránh oversell và trạng thái đơn sai.

3. **Real-time Communication**
   - POS, KDS và customer tracking phải cập nhật gần tức thời.
   - Long polling không phù hợp với vận hành giờ cao điểm.

4. **Multi-tenant Isolation**
   - Nhiều nhà hàng dùng chung hạ tầng.
   - Mọi dữ liệu, cache, event và file phải scope theo tenant.

### Visual / layout

4-quadrant risk map. Mỗi quadrant có icon:

- Chain/bottleneck: Distributed Monolith
- Lock/database: Consistency
- Lightning/socket: Real-time
- Building/layers: Multi-tenancy

### Speaker script

Khi nhìn từ bên ngoài, QR Order có vẻ là một tính năng đơn giản. Nhưng khi đặt trong hệ thống POS SaaS, nó kéo theo bốn thách thức kiến trúc.

Thứ nhất là tránh distributed monolith: nếu mọi service đều gọi nhau đồng bộ theo chuỗi dài, microservices chỉ còn là chia nhỏ deployment nhưng vẫn giữ coupling rất cao. Thứ hai là consistency: hai khách có thể đặt món cuối cùng cùng lúc, hoặc nhân viên xác nhận đơn khi tồn kho đã thay đổi. Thứ ba là real-time: đơn mới, món xong, yêu cầu thanh toán phải cập nhật ngay cho đúng vai trò. Thứ tư là multi-tenancy: dữ liệu của nhà hàng này tuyệt đối không được lẫn sang nhà hàng khác.

---

## Slide 05. Mục Tiêu Và Đóng Góp Của Đề Tài

### Mục tiêu slide

Liên kết giữa bài toán nghiên cứu và kết quả mong đợi của luận án.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Đề tài xây dựng PoC để kiểm chứng kiến trúc Microservices cho POS F&B, không chỉ triển khai chức năng

**Mục tiêu nghiên cứu:**

- Thiết kế kiến trúc Microservices cho nền tảng SaaS POS tích hợp QR Order.
- Xây dựng chiến lược multi-tenancy với `tenant_id` và service boundary rõ ràng.
- Áp dụng Redis, Kafka và WebSocket đúng vai trò trong runtime.
- Tích hợp Keycloak/RBAC cho staff và session-based access cho customer.
- Kiểm chứng luồng nghiệp vụ cốt lõi: QR -> Order -> KDS -> Payment.

**Đóng góp mong đợi:**

- Bộ tài liệu kiến trúc tham chiếu cho SaaS POS F&B.
- PoC có thể demo và mở rộng.
- Các quyết định kỹ thuật có rationale rõ: khi dùng TCP, khi dùng Kafka, khi dùng BFF Direct.

### Visual / layout

Vẽ 3 cột:

`Research` | `Architecture` | `Prototype`

Mỗi cột 3 bullet ngắn.

### Speaker script

Mục tiêu của đề tài là thiết kế và triển khai một PoC đủ sâu để kiểm chứng kiến trúc, thay vì xây một sản phẩm thương mại đầy đủ mọi tính năng.

Kết quả mong đợi gồm ba phần. Một là tài liệu kiến trúc tham chiếu, mô tả rõ service boundary, giao tiếp liên dịch vụ và multi-tenancy. Hai là hệ thống demo cho các flow cốt lõi của POS F&B. Ba là các quyết định kỹ thuật có cơ sở, ví dụ sự kiện nào nên đi Kafka, sự kiện nào chỉ nên là WebSocket side-effect ở BFF, và state nào phải thuộc service nào.

---

## Slide 06. Phạm Vi Nghiệp Vụ Của QRTable

### Mục tiêu slide

Cho người nghe hiểu hệ thống bao gồm những domain nào, tránh hiểu nhầm chỉ có Customer PWA.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QRTable bao phủ một vòng vận hành POS tại bàn: từ onboarding nhà hàng đến thanh toán

**Các domain chính:**

- **SaaS Onboarding:** tenant, subscription, trạng thái hoạt động.
- **Catalog:** danh mục, món, ảnh, giá, trạng thái còn/hết, bàn và QR.
- **Ordering:** session, shared cart, order, bill, service request.
- **Kitchen/KDS:** ticket, kitchen/bar queue, SLA, priority, recall.
- **Payment:** cash, SePay/VietQR, webhook, refund, audit.
- **Operation:** RBAC, staff roles, monitoring, deployment.

### Visual / layout

[VISUAL TẠO RIÊNG]

Domain capability map dạng vòng tròn hoặc map theo dòng vận hành:

`Onboarding -> Menu/Table -> QR Session -> Order -> Kitchen -> Payment -> Reconciliation`

### Speaker script

Phạm vi nghiệp vụ của QRTable được chọn theo logic vận hành của một nhà hàng. Đầu tiên là tạo tenant và cấu hình nhà hàng. Sau đó chủ quán quản lý menu, món ăn, ảnh món, khu vực và bàn. Khách hàng quét QR tại bàn để mở session, xem menu và đặt món. Đơn đi qua nhân viên xác nhận rồi vào KDS cho bếp hoặc bar. Cuối cùng là yêu cầu thanh toán, thu tiền mặt hoặc VietQR, ghi nhận payment và đóng bill.

Điểm quan trọng là các domain này không nên bị trộn vào một service lớn. Mỗi domain có dữ liệu và state riêng, nên kiến trúc được chia theo ownership.

---

## Slide 07. Actors Và Ranh Giới Truy Cập

### Mục tiêu slide

Giới thiệu vai trò người dùng và nhấn mạnh hệ thống có nhiều loại auth/access khác nhau.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Mỗi actor có phạm vi dữ liệu và cách xác thực khác nhau

**Bảng tóm tắt:**

| Actor         | Phạm vi              | Xác thực                | Giao diện    |
| ------------- | -------------------- | ----------------------- | ------------ |
| Super Admin   | Cross-tenant         | JWT/Keycloak            | Admin Portal |
| Owner/Manager | Một tenant           | JWT/Keycloak            | Dashboard    |
| Waiter        | Một tenant           | JWT/Keycloak            | POS          |
| Chef/Barista  | Một tenant + station | JWT/Keycloak            | KDS          |
| Customer      | Session/Table        | QR HMAC + Redis session | Customer PWA |

**Callout:**

Customer không có role trong `role.json`; customer được kiểm soát bằng `SessionGuard` và ownership theo session/table.

**Role vs Permission cần thể hiện rõ:**

- **Role** là nhóm người dùng: `OWNER`, `MANAGER`, `WAITER`, `CHEF`, `BARISTA`, `SUPER_ADMIN`.
- **Permission** là quyền thao tác cụ thể: `order.confirm`, `payment.confirm_cash`, `kitchen.update_ticket`.
- UI có thể ẩn/hiện menu theo role, nhưng API phải kiểm tra permission thật ở BFF.

### Visual / layout

Role-access matrix hoặc actor lanes.

Nên dùng icon người dùng cho từng actor, nhưng không quá hoạt hình.

### Speaker script

Hệ thống có hai nhóm actor lớn. Nhóm nội bộ gồm Super Admin, Owner, Manager, Waiter, Chef và Barista. Nhóm này đăng nhập qua Keycloak, nhận JWT và được kiểm tra permission khi gọi API.

Nhóm thứ hai là Customer. Customer không cần đăng nhập để giảm ma sát trải nghiệm. Thay vào đó, khách đi vào hệ thống thông qua QR URL có token HMAC, rồi được gắn với session và table cụ thể. Điều này giúp khách chỉ thao tác được trên session của bàn mình, không cần tài khoản nhưng vẫn có ranh giới truy cập rõ.

Ở đây cần nhấn mạnh là role và permission không giống nhau. Role giúp gom nhóm người dùng, còn permission là quyền cụ thể trên từng API. Ví dụ Waiter có thể `order.confirm` và `payment.confirm_cash`, nhưng không có `catalog.update`. Chef có thể cập nhật ticket KDS, nhưng không được xử lý payment hay sửa menu.

---

## Slide 08. Nguyên Tắc Kiến Trúc

### Mục tiêu slide

Trình bày các nguyên tắc thiết kế để người nghe hiểu vì sao các quyết định sau đó hợp lý.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Kiến trúc QRTable được thiết kế quanh ownership, tenant isolation và realtime correctness

**Các nguyên tắc cần đưa lên slide:**

- **Database per Service:** service sở hữu dữ liệu của mình, service khác không query trực tiếp.
- **Tenant Isolation by Default:** mọi entity tenant-scoped có `tenant_id`.
- **BFF as Single Entry:** client chỉ đi qua BFF, không gọi microservice nội bộ.
- **Event-Driven Decoupling:** Kafka dùng cho domain event bất đồng bộ.
- **Cache/Runtime State with Redis:** Redis dùng cho session, cart, KDS queue, cache và rate-limit.
- **Idempotent & Fail-safe:** idempotency key, outbox và saga cho flow nhiều bước.
- **Observe Everything:** log, metrics, tracing để debug hệ phân tán.

### Visual / layout

7 principle cards, mỗi card 1 icon + 1 dòng giải thích. Không dùng đoạn văn dài.

### Speaker script

Trước khi đi vào từng service, em muốn đặt các nguyên tắc kiến trúc. Thứ nhất là ownership: mỗi service sở hữu dữ liệu của mình. Order không sửa trực tiếp bảng menu item của Catalog, Payment không tự đóng bill thay Order.

Thứ hai là tenant isolation: vì đây là SaaS, mọi dữ liệu vận hành của nhà hàng phải có ranh giới tenant. Thứ ba là BFF là điểm vào duy nhất để kiểm soát auth, tenant context, rate limit và WebSocket. Cuối cùng, hệ thống dùng Redis, Kafka và WebSocket theo vai trò cụ thể, không dùng một công nghệ cho mọi bài toán.

---

## Slide 09. Kiến Trúc Tổng Thể

### Mục tiêu slide

Đây là slide kiến trúc lớn nhất. Người nghe phải thấy đầy đủ client, gateway, service và infrastructure layer.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

BFF là điểm vào duy nhất, phía sau là các bounded-context services và hạ tầng runtime

**Các lớp cần thể hiện:**

1. **Client Layer**
   - Customer PWA
   - Management App: POS, KDS, Dashboard, Admin

2. **BFF Service**
   - REST API
   - WebSocket Gateway
   - Guard chain
   - Rate limiting

3. **Application Services**
   - Auth Service
   - SaaS Management Service
   - Catalog Service
   - Order Service
   - Kitchen Service
   - Payment Service
   - Notification/User-Access Service

4. **Infrastructure**
   - PostgreSQL
   - Redis
   - Kafka
   - Keycloak
   - Cloudinary
   - Grafana/Loki/Prometheus/Tempo

### Visual / layout

[VISUAL TẠO RIÊNG]

Vẽ layered architecture diagram 4 tầng. Connector direction:

- Client -> BFF: HTTP REST / WebSocket.
- BFF -> Auth: gRPC.
- BFF -> Catalog/Order/Payment/SaaS: TCP.
- Services -> Kafka: publish/consume domain events.
- BFF -> Redis: auth cache, menu cache, rate limit.
- Order/Kitchen -> Redis theo policy.

Không để mũi tên chồng chéo quá nhiều. Có thể dùng màu theo layer.

### Speaker script

Kiến trúc tổng thể được chia thành bốn lớp. Ở trên cùng là client: Customer PWA cho khách quét QR và Management App cho staff, bếp, chủ quán và admin.

Tất cả client đều đi qua BFF. BFF vừa là API Gateway, vừa là WebSocket Gateway, vừa là nơi áp dụng guard chain, rate limit và tenant context. Phía sau BFF là các microservice theo bounded context. Auth phục vụ xác thực, Catalog quản lý menu và bàn, Order quản lý session, cart, order và bill, Kitchen quản lý hàng đợi KDS, Payment xử lý tiền mặt và VietQR, SaaS quản lý tenant/subscription.

Tầng hạ tầng gồm PostgreSQL cho dữ liệu nghiệp vụ, Redis cho state runtime và cache, Kafka cho domain event, Keycloak cho IAM, Cloudinary cho file ảnh và stack observability để theo dõi hệ thống.

---

## Slide 10. Frontend Architecture

### Mục tiêu slide

Giải thích vì sao chỉ có 2 frontend app nhưng phục vụ nhiều actor.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Hai ứng dụng frontend tách theo trust boundary: Customer anonymous và Internal authenticated

**Customer PWA:**

- React + Vite, mobile-first.
- Entry qua QR URL: `{slug}.qrtable.io?table_id=...&token=...`.
- Session-based auth, không cần đăng nhập.
- Menu browsing, shared cart, order tracking, payment request.
- Offline-first định hướng: service worker, cache menu, queue action.

**Management App:**

- Next.js App Router.
- Role-based routing: `/pos`, `/kds`, `/dashboard`, `/admin`.
- JWT/Keycloak.
- POS order confirmation, KDS, menu/table management, payment, admin tenant.

### Visual / layout

2 cột lớn:

`Customer PWA` vs `Management App`

Bên dưới mỗi cột có actor, auth model, core screens, realtime mode.

### Speaker script

Frontend không được tách thành quá nhiều app riêng vì scope luận văn cần giữ khả năng triển khai và bảo trì. Thay vào đó, hệ thống chia thành hai app theo ranh giới tin cậy.

Customer PWA dành cho khách hàng anonymous. Khách đi vào từ QR, hệ thống xác thực token và gắn session. Management App dành cho toàn bộ actor đã đăng nhập: phục vụ, bếp, quản lý, chủ quán và super admin. Cùng một app nhưng route và layout thay đổi theo role, còn quyền thật vẫn được enforce ở BFF bằng PermissionGuard.

---

## Slide 11. Service Decomposition & Ownership

### Mục tiêu slide

Giải thích hệ thống được chia service theo ownership dữ liệu, không theo màn hình UI.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Service boundary được chia theo dữ liệu sở hữu và nghiệp vụ, không chia theo màn hình

**Bảng service ownership:**

| Service      | Sở hữu chính                                | Data store                | Giao tiếp           |
| ------------ | ------------------------------------------- | ------------------------- | ------------------- |
| BFF          | API edge, WS, guards                        | Stateless + Redis cache   | HTTP, WS, TCP, gRPC |
| Auth         | Token verify, user info                     | Keycloak/Redis JWKS cache | gRPC                |
| SaaS         | Tenant, subscription, plan                  | PostgreSQL                | TCP, Kafka          |
| Catalog      | Category, menu item, table, QR, stock       | PostgreSQL                | TCP                 |
| Order        | Session, cart, order, bill, service request | PostgreSQL + Redis        | TCP, Kafka          |
| Kitchen      | KDS ticket, queue, SLA                      | Redis-only                | Kafka, TCP          |
| Payment      | Payment, refund, audit                      | PostgreSQL                | TCP, webhook, Kafka |
| Notification | Email/audit async                           | MongoDB                   | Kafka               |

### Visual / layout

Bảng rõ ràng hoặc service cards. Nếu dùng cards, mỗi card có:

- tên service
- owns
- store
- transport

### Speaker script

Service decomposition là phần quan trọng nhất của kiến trúc. QRTable không chia service theo màn hình như "menu page service" hay "payment page service". Hệ thống chia theo miền dữ liệu và trách nhiệm nghiệp vụ.

Ví dụ Catalog là service duy nhất sở hữu menu item, table và stock. Order chỉ quản lý order, bill và session. Khi cần trừ tồn kho, Order phải gọi Catalog qua TCP command, chứ không update trực tiếp Catalog database. Cách chia này giúp mỗi service có ranh giới thay đổi rõ ràng và chuẩn bị cho database-per-service.

---

## Slide 12. Multi-Tenancy Model

### Mục tiêu slide

Giải thích mô hình SaaS multi-tenant và cách `tenant_id` đi xuyên suốt hệ thống.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QRTable dùng Database-per-Service kết hợp `tenant_id` discriminator để cân bằng isolation và chi phí MVP

**Nội dung chính:**

- Mỗi service sở hữu database/schema logic riêng.
- Trong mỗi database, entity thuộc nhà hàng đều có `tenant_id`.
- Unique constraint và index phải bao gồm `tenant_id`.
- Redis key namespace có tenant: `menu:{tenant_id}`, `session:{tenant_id}:{session_id}`.
- Kafka payload luôn chứa `tenantId`.
- WebSocket room luôn scope theo tenant hoặc session.

**Ví dụ ngắn:**

`tenant:t-001` và `tenant:t-002` có thể có category tên "Đồ uống", nhưng không được nhìn thấy dữ liệu của nhau.

### Visual / layout

[VISUAL TẠO RIÊNG]

Diagram:

`Tenant A` và `Tenant B` đi vào chung platform, sau đó dữ liệu trong từng service DB được tách bằng `tenant_id`.

Thể hiện 4 nơi có tenant boundary:

- DB row
- Redis key
- Kafka payload
- WebSocket room

### Speaker script

Vì đây là SaaS, nhiều nhà hàng cùng dùng một hạ tầng. Nếu tách database riêng cho từng tenant ngay từ đầu thì isolation tốt hơn nhưng chi phí vận hành và migration cao hơn. Với phạm vi luận văn và MVP, hệ thống chọn hướng database-per-service kết hợp discriminator column `tenant_id`.

Nghĩa là mỗi service vẫn giữ ownership dữ liệu riêng, nhưng trong database của service đó, các row tenant-scoped đều có `tenant_id`. Ranh giới tenant không chỉ tồn tại ở database, mà còn xuất hiện trong Redis key, Kafka payload, WebSocket room và file storage path.

---

## Slide 13. Tenant Resolution Flow

### Mục tiêu slide

Giải thích tenant được xác định khác nhau giữa staff/admin và customer.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Tenant context được resolve từ JWT với staff và từ QR/session với customer

**Staff/Admin flow:**

1. Client gửi JWT.
2. `UserGuard` kiểm tra Redis token cache; cache miss thì gọi Auth Service qua gRPC.
3. Auth Service verify JWT với Keycloak và lấy user profile/permissions từ user-access.
4. Validate role mapping: role trong JWT phải khớp role/permission đã provision trong hệ thống.
5. `TenantGuard` lấy `tenant_id` từ JWT claim và chặn tenant mismatch.
6. `PermissionGuard` kiểm tra permission theo endpoint.
7. Service query tự động filter theo `tenant_id`.

**Customer flow:**

1. QR URL chứa `slug`, `table_id`, `token`.
2. BFF/Catalog validate HMAC token để chống QR giả.
3. Resolve tenant từ slug/table mapping.
4. Kiểm tra table tồn tại, thuộc tenant đúng và trạng thái bàn cho phép vào session.
5. Tạo hoặc join session trong Order/Redis.
6. Customer chỉ truy cập session/table của mình.
7. Rate limit chống scan/order spam.

### Visual / layout

Hai sequence mini song song:

`Staff JWT path` và `Customer QR path`.

### Speaker script

Tenant context không phải lúc nào cũng lấy từ cùng một nguồn. Với staff hoặc owner, tenant nằm trong JWT custom claim do Keycloak cấp và được kiểm tra bởi guard chain. Với customer, khách không đăng nhập nên tenant được resolve từ QR URL: slug nhà hàng, table id và HMAC token.

Điểm chung là sau khi resolve xong, mọi request nội bộ đều phải có tenant context. Service không được tin filter từ client, mà phải dùng context đã được guard inject.

Flow staff có thêm một điểm quan trọng: token hợp lệ chưa đủ. User còn phải được provision trong user-access và có permission tương ứng. Nếu token đúng nhưng user chưa có profile nội bộ, hệ thống trả `user_not_provisioned`. Nếu có profile nhưng thiếu quyền, hệ thống trả `permission_denied`.

---

## Slide 14. Auth & RBAC

### Mục tiêu slide

Trình bày hệ thống phân quyền đủ sâu nhưng không sa vào toàn bộ 53 permission.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

RBAC được enforce ở API boundary, không chỉ ẩn/hiện menu trên giao diện

**Cấu trúc kiểm soát:**

- **Identity Layer:** Keycloak xác thực credential, cấp JWT, realm roles.
- **Application Profile Layer:** user-access lưu profile, tenant assignment, permissions.
- **Guard Chain:** `UserGuard/SessionGuard -> TenantGuard -> PermissionGuard`.
- **Permission source of truth:** `permission-matrix.md`, `PERMISSION` enum, `role.json` và test matrix phải đồng bộ.
- **Permission format:** `domain.action_snake_case`, ví dụ `order.confirm`, `kitchen.update_ticket`.

**Role chính:**

- Super Admin: cross-tenant.
- Owner: toàn quyền vận hành tenant, gồm HR action.
- Manager: vận hành tenant, không xóa user.
- Waiter: order, table, payment, service request.
- Chef/Barista: KDS theo station.
- Customer: session-scoped, không có role DB.

**Ví dụ validation theo API:**

| Thao tác                  | Actor hợp lệ         | Guard/Permission                                             |
| ------------------------- | -------------------- | ------------------------------------------------------------ |
| Staff xác nhận đơn        | Waiter/Manager/Owner | `UserGuard -> TenantGuard -> PermissionGuard(order.confirm)` |
| Hủy đơn đang Processing   | Manager/Owner        | `order.cancel_processing` + bắt buộc lý do                   |
| Cập nhật ticket KDS       | Chef/Barista         | `kitchen.update_ticket` + station scope                      |
| Set priority KDS          | Owner/Manager        | `kitchen.set_priority`                                       |
| Xác nhận tiền mặt         | Waiter/Manager/Owner | `payment.confirm_cash`                                       |
| Customer đặt món          | Customer session     | `SessionGuard -> TenantGuard`, không dùng role DB            |
| Customer xem order status | Customer session     | session ownership: `order.sessionId === req.sessionId`       |

### Visual / layout

[VISUAL TẠO RIÊNG]

Guard chain diagram:

`Request` -> `Authenticate` -> `Resolve Tenant` -> `Authorize Permission` -> `Controller` -> `Service`.

Thêm mini matrix role x domain ở bên phải:

- Rows: Owner, Manager, Waiter, Chef, Barista, Customer.
- Columns: Catalog, Order, Kitchen, Payment, Table, Service Request.
- Không cần đưa toàn bộ 53 permissions lên slide chính; chỉ cần 5-7 ví dụ tiêu biểu.

### Speaker script

Management App có thể ẩn hoặc hiện route theo role để cải thiện UX, nhưng đó không phải lớp bảo mật chính. Lớp bảo mật thật nằm ở BFF.

Mỗi API nhạy cảm phải đi qua guard chain. UserGuard hoặc SessionGuard xác định "bạn là ai". TenantGuard xác định "bạn thuộc tenant nào". PermissionGuard xác định "bạn có quyền làm thao tác này không". Cách này giúp phân quyền không phụ thuộc vào frontend và tránh trường hợp user gọi API trực tiếp để vượt qua UI.

Cơ chế RBAC của QRTable có hai lớp. Lớp identity nằm ở Keycloak, nơi cấp JWT và role claim. Lớp application profile nằm ở user-access, nơi hệ thống lưu permission thật để PermissionGuard kiểm tra. Vì vậy, một request staff hợp lệ phải thỏa ba điều kiện: token đúng, tenant đúng và permission đúng.

Ví dụ, Waiter được xác nhận đơn và xử lý tiền mặt, nhưng không được sửa menu. Chef được cập nhật ticket KDS, nhưng không xử lý thanh toán. Customer thì không đi qua role database, mà đi qua SessionGuard và kiểm tra ownership của session/table.

---

## Slide 15. Communication Matrix

### Mục tiêu slide

Làm rõ mỗi giao thức dùng cho mục đích gì. Đây là slide rất quan trọng để tránh người nghe nghĩ "microservice là dùng Kafka hết".

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QRTable chọn giao thức theo semantics của luồng, không dùng một kênh cho mọi bài toán

**Bảng giao tiếp:**

| Kênh         | Dùng cho                             | Ví dụ                                  |
| ------------ | ------------------------------------ | -------------------------------------- |
| HTTP REST    | Client -> BFF request/response       | Customer submit order                  |
| WebSocket    | BFF -> Client realtime push          | order status, KDS update               |
| TCP          | BFF/Service -> business service sync | Order gọi Catalog deduct stock         |
| gRPC         | Auth performance-critical RPC        | BFF verify token                       |
| Kafka        | Async domain event                   | `order.confirmed`, `payment.completed` |
| HTTP Webhook | External callback                    | SePay -> BFF webhook                   |
| Redis        | Cache/runtime/pub-sub                | session, cart, KDS queue               |

### Visual / layout

Matrix/table hoặc hub diagram.

Không vẽ mọi mũi tên chi tiết; chỉ vẽ các nhóm kênh.

### Speaker script

Trong hệ thống phân tán, chọn sai kênh giao tiếp có thể làm kiến trúc phức tạp mà không giải quyết đúng vấn đề. QRTable không dùng Kafka cho mọi thứ, cũng không dùng TCP cho mọi thứ.

Các query hoặc command cần phản hồi ngay dùng HTTP/TCP/gRPC. Các phản ứng nghiệp vụ bất đồng bộ, ví dụ order đã confirm cần bếp xử lý, hoặc payment completed cần các service downstream phản ứng, thì dùng Kafka. Còn các side-effect thuần UI như báo cho staff có đơn mới thì BFF có thể emit WebSocket trực tiếp sau khi TCP response thành công.

---

## Slide 16. Kafka Decision Framework

### Mục tiêu slide

Giải thích 4P+2AP: khi nào dùng Kafka và khi nào không dùng.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Kafka chỉ dùng cho domain event cần decoupling, không dùng làm proxy cho UI

**Inclusion principles:**

- **P1 - Cross-context domain reaction:** state change ở context A cần business logic ở context B.
- **P2 - Temporal decoupling:** producer không nên chờ consumer.
- **P3 - Fan-out:** một event có nhiều bounded context phản ứng.
- **P4 - Atomicity safeguard:** event gắn với DB write cần outbox.

**Exclusion anti-patterns:**

- **AP1 - Kafka as UI proxy:** không dùng Kafka chỉ để bắn WebSocket.
- **AP2 - Sync for fire-and-forget:** không dùng TCP/gRPC cho tác vụ producer không cần chờ.

**Topic registry cốt lõi:**

- `order.confirmed`
- `payment.completed`
- `payment.refunded`
- `kitchen.sla_warning`
- `tenant.created`

### Visual / layout

[VISUAL TẠO RIÊNG]

Decision flowchart:

`Event cần xử lý?` -> `Có business logic ở context khác?` -> yes: Kafka; no: BFF Direct nếu chỉ UI.

### Speaker script

Đây là một quyết định kiến trúc quan trọng sau khi phân tích proposal ban đầu. Ban đầu có thể nghĩ event-driven nghĩa là mọi thứ đều đi Kafka. Nhưng khi triển khai thực tế, cách đó dễ làm tăng latency và complexity cho các event chỉ phục vụ UI.

Vì vậy, hệ thống dùng bộ quy tắc 4P+2AP. Nếu event cần bounded context khác xử lý nghiệp vụ, hoặc producer không nên chờ consumer, hoặc cần fan-out, thì Kafka phù hợp. Nhưng nếu BFF vừa nhận response thành công từ service và chỉ cần emit WebSocket hoặc invalidate cache, dùng BFF Direct sẽ đơn giản và đúng hơn.

---

## Slide 17. Redis Usage Strategy

### Mục tiêu slide

Giải thích Redis không chỉ là cache, mà có nhiều vai trò runtime khác nhau nhưng được kiểm soát.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Redis được dùng có kiểm soát cho dữ liệu nóng, runtime state và queue ngắn hạn

**Bảng usage:**

| Use case        | Key pattern                        | Owner            |
| --------------- | ---------------------------------- | ---------------- |
| Token cache     | `user-token:{sha256(jwt)}`         | BFF/Auth         |
| Menu cache      | `menu:{tenant_id}`                 | BFF/Catalog flow |
| Session         | `session:{tenant_id}:{session_id}` | Order            |
| Shared cart     | `cart:{tenant_id}:{session_id}`    | Order            |
| Rate limit      | `rl:{endpoint}:{ip/token}`         | BFF              |
| KDS queue       | `kds:{tenant_id}:{station}`        | Kitchen          |
| Ticket snapshot | `ticket:{ticket_id}`               | Kitchen          |

**Policy callout:**

Không phải service nào cũng được kết nối Redis. Catalog, SaaS, Payment, Auth, Notification, User-Access không dùng Redis trực tiếp nếu không có runtime-state reason.

### Visual / layout

Redis ở giữa, xung quanh là các owner service được phép:

`BFF`, `Order`, `Kitchen`, `WebSocket Gateway`.

Không nối Redis với mọi service.

### Speaker script

Redis trong QRTable có nhiều vai trò. Với BFF, Redis là cache cho token, menu và rate limit. Với Order Service, Redis giữ session active và shared cart, đây là runtime state thuộc domain Order. Với Kitchen Service, Redis là primary store ngắn hạn cho KDS queue bằng Sorted Set.

Điểm quan trọng là Redis không phải nơi mọi service tùy tiện đọc ghi. Hệ thống có policy rõ service nào được dùng Redis và dùng cho mục đích gì, để tránh biến Redis thành database chia sẻ không kiểm soát.

---

## Slide 18. Data Consistency Strategy

### Mục tiêu slide

Giải thích cách hệ thống xử lý race condition và boundary transaction.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Consistency được xử lý tại service sở hữu dữ liệu, không bằng cách bypass database boundary

**Luồng stock/order:**

1. Customer submit order:
   - Chỉ kiểm tra snapshot availability.
   - Persist order ở trạng thái `PENDING`.
   - Chưa trừ stock.

2. Staff confirm:
   - Order khóa order row `PENDING`.
   - Order gọi Catalog TCP command.
   - Catalog dùng transaction/pessimistic lock để deduct stock.
   - Thành công thì Order chuyển `PROCESSING`.
   - Ghi outbox `order.confirmed`.

**Nguyên tắc:**

Catalog owns `menu_items`; Order không update stock trực tiếp.

### Visual / layout

[VISUAL TẠO RIÊNG]

Sequence diagram:

`Customer` -> `BFF` -> `Order`: submit -> `PENDING`

`Waiter` -> `BFF` -> `Order`: confirm

`Order` -> `Catalog`: deduct stock in transaction

`Order` -> `Outbox/Kafka`: `order.confirmed`

### Speaker script

Điểm dễ sai trong QR Order là trừ tồn kho quá sớm hoặc trừ tồn kho sai boundary. QRTable không trừ stock khi khách vừa submit, vì lúc đó đơn vẫn cần nhân viên xác nhận và có thể bị hủy.

Stock chỉ được deduct ở bước staff confirm. Khi đó Order Service gọi Catalog Service, vì Catalog mới là service sở hữu menu item và stock. Catalog thực hiện deduct trong transaction của nó. Nếu đủ tồn, Order chuyển sang Processing và ghi event vào outbox để publish Kafka. Nếu không đủ tồn, Order vẫn không vào bếp và nhân viên nhận lỗi rõ ràng.

---

## Slide 19. QR Session Flow

### Mục tiêu slide

Giải thích cách khách vào hệ thống mà không cần đăng nhập nhưng vẫn an toàn trong phạm vi bàn/session.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QR token biến mỗi bàn thành một entry point có kiểm soát vào tenant và session

**Flow hiển thị:**

1. Customer quét QR.
2. URL chứa `slug`, `table_id`, `token`.
3. BFF/Catalog validate `HMAC_SHA256(table_id + store_id + secret_key)`.
4. Resolve `tenant_id` và `table_id`.
5. Validate table thuộc đúng tenant và QR token chưa bị rotate/invalid.
6. Kiểm tra trạng thái bàn:
   - `Available`: tạo session mới.
   - `Occupied`: join session hiện tại nếu chưa billing.
   - `Billing`: chặn đặt món.
7. Order Service tạo hoặc join session.
8. Redis lưu session/cart runtime.
9. Customer PWA nhận menu và cart snapshot.

**Rules:**

- Session lifetime tối đa: 2 giờ.
- Idle timeout: 30 phút nếu chưa có order.
- Billing state sẽ khóa ordering.
- Rate limit chống scan spam: ví dụ tối đa 10 scans/table/5 phút.
- Customer API luôn kiểm tra session ownership: session phải thuộc đúng `tenant_id` và `table_id`.
- Submit order dùng `idempotencyKey` để tránh double-submit khi khách bấm nhiều lần hoặc mạng retry.

### Visual / layout

[VISUAL TẠO RIÊNG]

Sequence diagram hoặc swimlane:

`Customer Phone`, `BFF`, `Catalog`, `Order`, `Redis`.

### Speaker script

Customer không cần tài khoản. Điểm vào là QR code của bàn. QR URL có table id và token HMAC để hệ thống xác minh đây là QR hợp lệ, không phải URL tự chế.

Sau khi QR hợp lệ, hệ thống resolve tenant và table. Ở đây có nhiều lớp validate: tenant slug có tồn tại không, table có thuộc tenant đó không, token HMAC có đúng không, bàn đang ở trạng thái nào và request có vượt rate limit không.

Nếu bàn còn trống hoặc session cũ đã đóng, Order tạo session mới. Nếu bàn đang occupied và chưa billing, khách join session hiện tại để dùng shared cart. Nếu bàn đang billing, hệ thống khóa đặt món để tránh phát sinh order sau khi đã yêu cầu thanh toán. Sau đó, mọi customer API đều phải kiểm tra session ownership để khách bàn này không xem hoặc sửa dữ liệu của bàn khác.

---

## Slide 20. Catalog, Table Và QR Logic

### Mục tiêu slide

Giải thích Catalog không chỉ là menu, mà còn quản lý bàn, QR và trạng thái bàn.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Catalog Service là source of truth cho menu, bàn, QR token và trạng thái bàn

**Nội dung chính:**

- Category: nhóm món, trạng thái active/inactive, sort order.
- Menu Item: tên, mô tả, ảnh, giá, stock, station, trạng thái available/out-of-stock.
- Area/Table: khu vực, bàn, sức chứa, status, QR token.
- QR token: HMAC, regenerate khi cần.
- Table state: `Available -> Occupied -> Billing -> Cleaning -> Available`.
- Cache: menu hot data qua Redis, invalidate khi menu thay đổi.

### Visual / layout

Entity mini-map:

`Area -> Table -> QR Token`

`Category -> MenuItem -> Station/Stock`

Thêm state machine nhỏ cho Table.

### Speaker script

Catalog Service thường dễ bị hiểu là chỉ quản lý menu, nhưng trong QRTable Catalog còn sở hữu cả table và QR token. Đây là hợp lý vì QR gắn trực tiếp với bàn, còn bàn là entry point của customer session.

Menu item cũng chứa thông tin quan trọng cho downstream như stock và station. Station giúp Kitchen biết món này đi về bếp hay bar. Khi owner thay đổi giá hoặc trạng thái hết hàng, cache menu phải bị invalidate và client nhận realtime hint để refetch.

---

## Slide 21. Shared Cart Và Order Submit

### Mục tiêu slide

Giải thích cart là draft runtime trong Redis, còn order row chỉ sinh khi submit.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Shared cart là draft order trong Redis, còn Order DB chỉ lưu từ trạng thái `PENDING`

**Flow hiển thị:**

1. Customer xem menu theo tenant.
2. Thêm món vào cart.
3. Cart lưu tại `cart:{tenant_id}:{session_id}`.
4. Mỗi thay đổi tăng `cartVersion`.
5. Submit order gửi `expectedCartVersion` và `idempotencyKey`.
6. Order Service validate cart snapshot.
7. Persist order `PENDING` và tạo bill `OPEN` nếu là submit đầu tiên của session.
8. BFF emit WebSocket hint cho staff.

**Key decisions:**

- `DRAFT` không persist thành order row.
- Cart conflict trả `409` + snapshot mới.
- Idempotency tránh double-submit.

### Visual / layout

[VISUAL TẠO RIÊNG]

Flow diagram:

`Menu` -> `Redis Cart` -> `Submit` -> `Order PENDING` -> `Bill OPEN` -> `Staff WS`.

### Speaker script

Trước khi khách bấm đặt món, hệ thống chưa tạo order trong database. Trạng thái draft nằm ở Redis cart. Điều này giúp nhiều thiết bị tại cùng một bàn dùng chung giỏ hàng và cập nhật nhanh.

Mỗi cart có cartVersion do server quản lý. Khi client submit, client gửi expectedCartVersion để đảm bảo không submit trên snapshot cũ. Nếu có conflict, server trả lại snapshot mới để client refetch. Khi submit thành công, Order Service mới persist order ở trạng thái Pending và nếu đây là lần submit đầu tiên của session thì tạo bill mở cho session đó.

---

## Slide 22. Order State Machine

### Mục tiêu slide

Trình bày vòng đời order và lý do phải có state machine rõ ràng.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Order lifecycle được kiểm soát bằng state machine để tránh bước nhảy trạng thái sai

**State chính:**

`Draft -> Pending -> Processing -> Ready -> Served -> Completed`

**Nhánh hủy:**

- `Pending -> Canceled`: customer self-cancel hoặc staff reject.
- `Processing/Ready -> Canceled`: cần Manager/Owner và lý do.

**Rules quan trọng:**

- Draft chỉ là cart/UI, không persist như order record.
- Pending chưa deduct stock.
- Processing nghĩa là đã confirm và đã deduct stock.
- Completed chỉ sau payment/bill close.

### Visual / layout

[VISUAL TẠO RIÊNG]

State machine diagram lớn, ít chữ.

Color:

- Draft/Pending: amber.
- Processing/Ready: blue.
- Served/Completed: green.
- Canceled: red.

### Speaker script

State machine giúp hệ thống không rơi vào các trạng thái mơ hồ. Ví dụ, một order đang Ready không thể quay lại Pending. Một order đã Completed thì không được sửa trực tiếp, nếu cần điều chỉnh phải đi qua refund hoặc audit flow.

Ở QRTable, Pending là trạng thái rất quan trọng. Khách đã gửi đơn nhưng nhân viên chưa xác nhận, nên hệ thống chưa deduct stock. Chỉ khi nhân viên confirm, order mới chuyển sang Processing và bắt đầu đi vào bếp.

---

## Slide 23. Confirm Order + Kafka Outbox

### Mục tiêu slide

Giải thích luồng confirm là nơi giao nhau của RBAC, stock consistency, transaction và event-driven.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Confirm order là điểm commit nghiệp vụ: kiểm quyền, trừ tồn, đổi trạng thái và phát domain event

**Sequence nội dung:**

1. Waiter gọi `confirm order`.
2. BFF kiểm tra JWT, tenant, permission `order.confirm`.
3. Order khóa order `PENDING`.
4. Order gọi Catalog TCP để deduct stock.
5. Catalog transaction thành công.
6. Order đổi status `PROCESSING`.
7. Order ghi outbox row `order.confirmed`.
8. Outbox publisher publish Kafka.
9. Kitchen consumer tạo KDS ticket.

**Failure handling:**

- Không đủ stock: reject confirm, order vẫn không vào bếp.
- Kafka lỗi tạm: outbox giữ event để retry.

### Visual / layout

[VISUAL TẠO RIÊNG]

Sequence diagram có 6 lane:

`Waiter`, `BFF`, `Order`, `Catalog`, `Outbox/Kafka`, `Kitchen`.

### Speaker script

Confirm order là bước nghiệp vụ quan trọng nhất trong flow đặt món. Nó không chỉ là đổi trạng thái trên UI. Trước tiên BFF phải kiểm tra người thao tác có đúng tenant và có quyền confirm order không.

Sau đó Order Service khóa order đang Pending và yêu cầu Catalog Service deduct stock. Nếu Catalog trả thành công, Order mới chuyển sang Processing. Đồng thời Order ghi một outbox event `order.confirmed`. Event này sẽ được publisher đưa lên Kafka để Kitchen Service consume. Nhờ outbox, nếu service crash sau khi DB commit nhưng trước khi publish Kafka, event vẫn không bị mất.

---

## Slide 24. Kitchen/KDS Flow

### Mục tiêu slide

Giải thích KDS hoạt động sau khi order được confirm, vai trò của Kafka và Redis Sorted Set.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Kitchen Service tiêu thụ `order.confirmed` và duy trì KDS queue bằng Redis, không cần database riêng

**Flow hiển thị:**

1. Kitchen consume Kafka `order.confirmed`.
2. Tách ticket theo `MenuItem.station`: `KITCHEN` hoặc `BAR`.
3. Ghi ticket snapshot vào Redis.
4. Đưa ticket vào Sorted Set:
   - `kds:{tenant_id}:kitchen`
   - `kds:{tenant_id}:bar`
5. KDS UI refetch queue khi nhận WebSocket hint.
6. Chef/Barista update ticket: Pending -> Processing -> Ready.
7. SLA worker phát `kitchen.sla_warning` nếu quá ngưỡng.

**Design note:**

Kitchen Service Redis-only vì KDS queue là runtime operational view; source of truth order vẫn thuộc Order Service.

### Visual / layout

[VISUAL TẠO RIÊNG]

Diagram:

`Kafka order.confirmed` -> `Kitchen Consumer` -> `Redis Sorted Sets` -> `BFF WS` -> `KDS Kitchen/Bar`.

Vẽ 2 queue song song: Kitchen và Bar.

### Speaker script

Kitchen Service không sở hữu order. Nó chỉ nhận sự kiện order đã confirm và tạo một operational view cho KDS. Vì KDS cần tốc độ và thứ tự FIFO/priority, Redis Sorted Set phù hợp hơn một database quan hệ cho queue runtime.

Mỗi ticket được route theo station. Món ăn đi vào queue bếp, đồ uống đi vào queue bar. Khi chef hoặc barista cập nhật trạng thái ticket, trạng thái này được broadcast tới staff và customer theo cơ chế WebSocket phù hợp, nhưng dữ liệu canonical của order lifecycle vẫn cần đồng bộ với Order Service.

---

## Slide 25. Realtime WebSocket Rooms

### Mục tiêu slide

Giải thích WebSocket không broadcast bừa bãi mà chia room theo tenant/session/role.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Realtime updates được route theo room để mỗi actor chỉ nhận đúng sự kiện cần thiết

**Room mapping:**

| Actor         | Room                       |
| ------------- | -------------------------- |
| Waiter        | `tenant:{tid}:staff`       |
| Chef          | `tenant:{tid}:kds:kitchen` |
| Barista       | `tenant:{tid}:kds:bar`     |
| Owner/Manager | `tenant:{tid}:management`  |
| Customer      | `session:{sid}:customer`   |

**Event examples:**

- `order.created` -> staff room.
- `kds.queue_changed` -> KDS room.
- `kitchen.item_ready` -> staff + customer session.
- `menu.updated` -> tenant-wide invalidate/refetch.
- `payment.completed` -> customer session or polling baseline.

**Rule:**

WebSocket event là signal để UI refetch hoặc update view, không thay thế source of truth.

### Visual / layout

[VISUAL TẠO RIÊNG]

Hub-and-room diagram:

`BFF WebSocket Gateway` ở giữa, xung quanh là các room. Mỗi event có màu khác nhau.

### Speaker script

Realtime trong hệ thống SaaS không thể chỉ broadcast cho tất cả client. Nếu broadcast sai, bếp có thể nhận event của bàn khác, hoặc tenant này nhìn thấy event tenant khác.

Vì vậy, khi client kết nối WebSocket, BFF assign client vào room dựa trên JWT hoặc session. Waiter nhận room staff của tenant, chef nhận room kds kitchen, barista nhận room kds bar, customer nhận room theo session. Cách này vừa giảm nhiễu thông tin vừa đảm bảo tenant isolation ở realtime layer.

---

## Slide 26. Table State Machine & Transfer

### Mục tiêu slide

Trình bày trạng thái bàn và flow chuyển bàn, vì POS vận hành không chỉ là order.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Trạng thái bàn là state vận hành trung tâm, kết nối session, bill và payment

**Table state machine:**

`Available -> Occupied -> Billing -> Cleaning -> Available`

**Rules:**

- `Available -> Occupied`: khách quét QR lần đầu, tạo session.
- `Occupied -> Billing`: khách yêu cầu thanh toán, khóa ordering.
- `Billing -> Cleaning`: thanh toán hoàn tất, đóng session.
- `Cleaning -> Available`: staff đánh dấu đã dọn xong.

**Transfer table:**

- Staff/Manager chuyển session/order từ bàn cũ sang bàn mới.
- Không dùng transaction ACID xuyên Order DB + Catalog DB + Redis.
- Dùng saga-style flow: transfer lock, update Order, update Catalog, update Redis, compensation nếu lỗi.

### Visual / layout

[VISUAL TẠO RIÊNG]

Một nửa slide: state machine bàn.  
Một nửa slide: mini transfer saga:

`Lock transfer` -> `Update Order/session` -> `Catalog table status` -> `Redis metadata` -> `WS notify`.

### Speaker script

Trong POS nhà hàng, trạng thái bàn là một phần rất quan trọng. Bàn không chỉ là dữ liệu hiển thị. Nó quyết định khách có được đặt món hay không, bill có được yêu cầu hay không và session có cần đóng không.

Khi khách yêu cầu thanh toán, bàn chuyển sang Billing và ordering bị khóa. Sau khi thanh toán thành công, bàn không quay thẳng về Available mà chuyển sang Cleaning. Nhân viên dọn xong mới đánh dấu Available. Điều này phản ánh vận hành thực tế của nhà hàng.

Chuyển bàn cũng là một flow phức tạp vì liên quan Order, Catalog và Redis. Vì không thể có một ACID transaction xuyên mọi store, hệ thống dùng hướng saga-style với lock và compensation.

---

## Slide 27. Payment: Cash Và SePay/VietQR

### Mục tiêu slide

Giải thích payment theo thị trường Việt Nam và boundary giữa Order/Payment.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Payment Service ghi nhận thanh toán, còn bill lifecycle vẫn thuộc Order Service

**Cash flow:**

1. Staff chọn bill `PENDING_PAYMENT`.
2. Nhập số tiền khách đưa.
3. Hệ thống tính tiền thừa.
4. Payment ghi record `PAID`.
5. Emit `payment.completed`.

**VietQR/SePay flow:**

1. Payment tạo QR URL `qr.sepay.vn/img`.
2. QR có amount = `rounded_total`.
3. Nội dung chuyển khoản chứa `QRTBL` + 8 ký tự billId.
4. SePay gửi webhook về BFF.
5. BFF verify `X-Secret-Key`.
6. Payment match bill reference, kiểm tra amount.
7. Đủ/thừa tiền -> `PAID`; thiếu tiền -> giữ `PENDING` + audit.

**VND rounding:**

`rounded_total = Math.ceil(raw_total / 1000) * 1000`

### Visual / layout

[VISUAL TẠO RIÊNG]

Sequence diagram Payment:

`POS` -> `BFF` -> `Payment` -> `SePay QR` -> `Webhook` -> `Payment` -> `Order/Kafka`.

Thêm callout nhỏ: `No redirect, QR inline`.

### Speaker script

Payment được thiết kế phù hợp với bối cảnh Việt Nam. Thay vì dùng Stripe như một số proposal ban đầu, hệ thống chọn SePay + VietQR. Staff hoặc customer thấy QR trực tiếp trên giao diện, khách chuyển khoản qua app ngân hàng, SePay detect giao dịch và gọi webhook về BFF.

Payment Service chịu trách nhiệm ghi nhận thanh toán, kiểm tra webhook, lưu paid amount, refund và audit. Tuy nhiên bill lifecycle vẫn thuộc Order Service. Điều này tránh việc Payment tự ý đóng session hoặc thay đổi trạng thái bàn mà không qua owner nghiệp vụ của bill.

---

## Slide 28. Saga, Idempotency Và Outbox

### Mục tiêu slide

Tóm tắt cơ chế reliability cho các flow nhiều bước.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Saga, idempotency và outbox giúp flow phân tán không để lại trạng thái nửa vời

**Order Confirm Saga:**

- Validate/lock order `PENDING`.
- Catalog deduct stock.
- Order chuyển `PROCESSING`.
- Outbox publish `order.confirmed`.
- Compensation: release stock/revert order nếu bước sau lỗi.

**Payment Complete Saga:**

- Validate bill/order items đủ điều kiện thanh toán.
- Payment `PAID`.
- Order mark bill paid.
- Table `Billing -> Cleaning`.
- Close session.

**Reliability mechanisms:**

- Idempotency key cho submit/payment webhook.
- Outbox row ghi cùng DB transaction.
- Retry background publisher.
- Audit cho cancel/refund/payment.

### Visual / layout

[VISUAL TẠO RIÊNG]

3 lớp ngang:

`Business Flow` -> `Failure Point` -> `Recovery Mechanism`.

Hoặc 2 saga mini diagrams song song.

### Speaker script

Trong hệ thống phân tán, lỗi có thể xảy ra ở giữa flow. Ví dụ Catalog đã trừ stock nhưng Order chưa đổi trạng thái, hoặc Payment đã ghi paid nhưng Order chưa nhận được event. Nếu chỉ viết happy path thì hệ thống rất dễ lệch state.

Vì vậy, QRTable dùng ba cơ chế. Saga mô hình hóa các bước và compensation. Idempotency giúp retry không tạo trùng order hoặc payment. Outbox giúp event không mất khi DB đã commit nhưng Kafka publish bị lỗi tạm thời.

---

## Slide 29. Observability, Testing Và Deployment

### Mục tiêu slide

Cho thấy hệ thống phân tán cần khả năng quan sát và kiểm thử, không chỉ chạy được tính năng.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

Microservices chỉ có ý nghĩa khi hệ thống có thể test, trace và deploy tái lập

**Testing focus:**

- Unit: state machine, VND rounding, HMAC QR, permission logic.
- Integration: BFF -> TCP service, Order -> Catalog deduct stock, Redis cart/session.
- E2E: QR -> order -> staff confirm -> KDS -> payment.
- Concurrency: 2 request cùng món cuối cùng, chỉ 1 confirm thành công.

**Observability stack:**

- Logs: Loki + Promtail.
- Metrics: Prometheus + Grafana.
- Traces: Tempo + OpenTelemetry.
- Business metrics: order/min, KDS wait time, payment status.

**Deployment:**

- Docker Compose infra: PostgreSQL, Redis, Mongo, Keycloak, Kafka.
- Docker Compose app: BFF, Auth, Catalog, Order, Kitchen, Payment, SaaS, Notification.

### Visual / layout

3 cột:

`Testing` | `Observability` | `Deployment`

Có thể thêm mini trace line:

`BFF -> Order -> Catalog -> Kafka -> Kitchen`.

### Speaker script

Khi hệ thống chuyển sang microservices, khó khăn không chỉ là viết service. Khó khăn là làm sao biết lỗi nằm ở đâu khi một request đi qua nhiều hop.

Vì vậy, phần hoàn thiện của đề tài có testing, observability và deployment. Testing tập trung vào các điểm dễ gãy như state machine, tenant isolation, stock concurrency và payment. Observability giúp trace một order từ BFF qua Order, Catalog, Kafka và Kitchen. Deployment bằng Docker Compose giúp demo và đánh giá có thể tái lập trên môi trường khác.

---

## Slide 30. Roadmap, Demo Script Và Kết Luận

### Mục tiêu slide

Kết thúc bài bằng trạng thái thực tế, kịch bản demo và kết luận đóng góp.

### Nội dung hiển thị trên slide

**Tiêu đề claim:**

QRTable chứng minh được hướng kiến trúc lõi và có roadmap rõ để hoàn thiện thành hệ thống vận hành đầy đủ

**Roadmap theo phase:**

- **Phase 0:** Foundation, Nx monorepo, auth, app skeleton.
- **Phase 1:** Catalog + menu + table + QR + Cloudinary.
- **Phase 2A:** Permission + Order + Redis cart/session + Kafka `order.confirmed`.
- **Phase 2B:** Kitchen/KDS + WebSocket realtime.
- **Phase 3:** Payment SePay/VietQR + Cash + refund/audit.
- **Phase 4:** Saga hardening, SaaS onboarding, notification/staff.
- **Phase 5-7:** Testing, observability, Docker deploy, final demo.

**Demo script đề xuất:**

1. Customer quét QR, vào đúng tenant/table.
2. Xem menu, thêm món vào shared cart.
3. Submit order, staff nhận đơn mới.
4. Staff confirm, stock được deduct, Kafka event tạo KDS ticket.
5. Chef/Barista xử lý ticket, customer thấy trạng thái.
6. Customer yêu cầu thanh toán, staff xử lý cash hoặc VietQR.
7. Quan sát trace/log/metric để chứng minh flow phân tán.

**Kết luận:**

QRTable là reference architecture PoC cho SaaS POS F&B, tập trung vào service ownership, tenant isolation, realtime communication và consistency.

### Visual / layout

Timeline roadmap + demo checklist.

Nếu cần đưa tiến độ phần trăm, dùng dữ liệu mới nhất từ `implementation_plan.md` và kiểm tra lại trước khi generate slide cuối.

### Speaker script

Để kết luận, đề tài không chỉ triển khai một flow đặt món qua QR, mà xây dựng một kiến trúc tham chiếu cho nền tảng SaaS POS trong bối cảnh F&B.

Các phase được tổ chức theo lộ trình từ foundation, catalog, order, KDS, payment đến hardening, observability và deploy. Kịch bản demo cuối nên chứng minh kiến trúc, không chỉ bấm qua màn hình: mỗi thao tác UI cần chỉ ra request đi qua BFF, service nào sở hữu dữ liệu, state nào thay đổi, event nào được phát và client nào nhận realtime update.

Đóng góp chính của đề tài là cách kết hợp Microservices, multi-tenancy, Redis runtime state, Kafka domain event, WebSocket realtime và Keycloak/RBAC trong một bài toán F&B cụ thể, có thể kiểm chứng bằng PoC.

---

## 1. Appendix Cho AI Slide: Danh Sách Visual Cần Chuẩn Bị Riêng

Các visual dưới đây nên tự tạo bằng Mermaid/Figma/Excalidraw để đảm bảo chính xác, sau đó gắn vào slide:

1. **Slide 02:** End-to-end QRTable runtime pipeline.
2. **Slide 04:** 4-quadrant architecture challenges.
3. **Slide 06:** Domain capability map.
4. **Slide 09:** Overall layered architecture.
5. **Slide 12:** Multi-tenant isolation diagram.
6. **Slide 13:** Tenant resolution flow.
7. **Slide 14:** Guard chain.
8. **Slide 16:** Kafka decision flowchart.
9. **Slide 18:** Stock consistency sequence.
10. **Slide 19:** QR session sequence.
11. **Slide 21:** Shared cart/order submit flow.
12. **Slide 22:** Order state machine.
13. **Slide 23:** Confirm order + outbox sequence.
14. **Slide 24:** KDS Redis queue flow.
15. **Slide 25:** WebSocket room mapping.
16. **Slide 26:** Table state machine + transfer saga.
17. **Slide 27:** SePay/VietQR payment sequence.
18. **Slide 28:** Saga/idempotency/outbox reliability map.
19. **Slide 29:** Observability trace.
20. **Slide 30:** Roadmap timeline.

---

## 2. Appendix Cho Người Thuyết Trình: Mạch Nói 5 Chương

Nếu cần nói ngắn hơn, gom 30 slide thành 5 chương:

1. **Bối cảnh và mục tiêu:** Slide 01-05.
2. **Phạm vi và actor:** Slide 06-08.
3. **Kiến trúc tổng thể:** Slide 09-18.
4. **Flow lõi:** Slide 19-28.
5. **Hoàn thiện, demo, kết luận:** Slide 29-30.

Mạch nói nên giữ nhịp:

- Không mở đầu bằng công nghệ. Mở đầu bằng bài toán vận hành F&B.
- Khi nói công nghệ, luôn gắn với lý do: Redis cho runtime state, Kafka cho domain event, WebSocket cho realtime push, Keycloak cho IAM.
- Khi nói microservices, luôn gắn với ownership: service nào sở hữu dữ liệu nào.
- Khi nói "đã triển khai", không overclaim production-ready. Nên nói "PoC/phase triển khai để kiểm chứng kiến trúc".

---

## 3. Appendix Cho Người Thuyết Trình: RBAC Và Validation Cheat Sheet

Phần này dùng để trả lời câu hỏi của hội đồng hoặc thêm vào speaker notes nếu slide AI sinh ra còn thiếu chi tiết.

### 3.1. Staff/Admin login validation

Khi user nội bộ đăng nhập:

1. Management App redirect qua Keycloak login.
2. Keycloak xác thực credential và cấp JWT.
3. JWT chứa role claim và `tenant_id`.
4. BFF nhận request, `UserGuard` kiểm tra Redis token cache.
5. Nếu cache miss, BFF gọi Auth Service qua gRPC.
6. Auth Service verify JWT/JWKS với Keycloak.
7. Hệ thống kiểm tra user đã được provision trong user-access chưa.
8. Role trong JWT phải map được với role/permissions trong DB.
9. `TenantGuard` kiểm tra user chỉ thao tác trong tenant của mình, trừ Super Admin.
10. `PermissionGuard` kiểm tra endpoint yêu cầu permission nào.

Các lỗi nên nêu nếu bị hỏi:

- `401 invalid_token`: token sai, hết hạn hoặc verify thất bại.
- `401 user_not_provisioned`: token hợp lệ nhưng user chưa tồn tại trong application profile.
- `403 permission_denied`: user đã xác thực nhưng thiếu permission.
- `403 tenant_mismatch`: user cố truy cập tenant khác.

### 3.2. Customer QR/session validation

Khi khách quét QR:

1. QR URL chứa tenant slug, `table_id` và HMAC token.
2. Hệ thống validate HMAC để chống QR giả hoặc URL tự chế.
3. Resolve slug -> `tenant_id`.
4. Kiểm tra table tồn tại, thuộc đúng tenant và token khớp table/store secret.
5. Kiểm tra table status:
   - `Available`: tạo session mới.
   - `Occupied`: join session hiện tại.
   - `Billing`: chặn đặt thêm món.
   - `Cleaning`: chặn vào session mới cho đến khi staff mark clean.
6. Session được lưu durable ở Order DB và mirror runtime ở Redis.
7. Customer API dùng `SessionGuard -> TenantGuard`, không dùng PermissionGuard theo role DB.
8. Mọi thao tác customer phải kiểm tra session/table ownership.

### 3.3. Permission examples nên nhớ

| Tình huống                     | Quyền hoặc guard chính     | Ý nghĩa                                        |
| ------------------------------ | -------------------------- | ---------------------------------------------- |
| Waiter xác nhận đơn            | `order.confirm`            | Chỉ staff vận hành hợp lệ được đưa đơn vào bếp |
| Waiter hủy đơn pending         | `order.cancel_pending`     | Đơn chưa vào bếp có thể reject/hủy             |
| Manager hủy đơn processing     | `order.cancel_processing`  | Đơn đã vào bếp cần quyền cao hơn và lý do      |
| Chef cập nhật ticket           | `kitchen.update_ticket`    | Chỉ bếp/bar xử lý KDS ticket                   |
| Owner/Manager set priority KDS | `kitchen.set_priority`     | Chef/Barista không tự đổi priority             |
| Waiter xác nhận tiền mặt       | `payment.confirm_cash`     | Staff thu ngân xác nhận đã nhận tiền           |
| Owner/Manager refund           | `payment.refund`           | Hoàn tiền cần quyền quản lý và audit           |
| Customer submit order          | `SessionGuard` + ownership | Customer không có DB role                      |

### 3.4. Câu giải thích ngắn khi bị hỏi "RBAC hoạt động như thế nào?"

> QRTable tách authentication và authorization. Keycloak chịu trách nhiệm xác thực danh tính và cấp JWT. Sau đó BFF không chỉ tin JWT, mà còn kiểm tra application profile và permission trong user-access. Mỗi request đi qua `UserGuard` hoặc `SessionGuard`, rồi `TenantGuard`, rồi `PermissionGuard` nếu là API nội bộ. Customer không cần Keycloak; customer được giới hạn bằng QR HMAC token, session và ownership theo table/session.

---

## 4. Prompt Tổng Cho AI Tạo Deck

```text
Bạn là AI tạo slide báo cáo luận án tốt nghiệp bằng tiếng Việt.

Hãy tạo slide deck 16:9 từ tài liệu brief này. Đây là technical thesis deck về đề tài:
"Nghiên cứu và xây dựng nền tảng SaaS POS tích hợp đặt món qua mã QR dựa trên kiến trúc Microservices".

Yêu cầu:
- Phong cách nghiêm túc, hiện đại, technical platform, không marketing.
- Mỗi slide có một claim chính ở tiêu đề.
- Nội dung trên slide ngắn gọn, dễ nhìn; phần giải thích dài nằm trong speaker notes/script.
- Các slide có [VISUAL TẠO RIÊNG] cần chừa bố cục rõ cho sơ đồ; không tự bịa thêm node hoặc flow ngoài mô tả.
- Giữ chính xác thuật ngữ: BFF, tenant_id, Redis, Kafka, WebSocket, Keycloak, SePay/VietQR, outbox, saga.
- Không nói mọi thứ đều dùng Kafka. Nhấn mạnh Kafka dùng có chọn lọc cho domain events, còn UI side-effects dùng BFF Direct/WebSocket.
- Không nói hệ thống production-ready. Đây là PoC kiến trúc đang triển khai theo phase.
- Không nói Customer dùng Keycloak. Customer dùng QR HMAC token + session.
- Không nói Payment Service sở hữu bill. Bill thuộc Order Service.

Hãy tạo deck theo 30 slide trong brief, gồm:
1. nội dung hiển thị
2. speaker notes riêng cho từng slide
3. ghi chú visual/diagram cần chèn
```
