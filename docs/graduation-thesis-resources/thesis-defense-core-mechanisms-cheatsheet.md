# QRTable Defense Core Mechanisms Cheatsheet

> Dùng để học nhanh các cơ chế hay bị hỏi trong phản biện.  
> Mỗi mục có: câu 20 giây, câu đào sâu, anchor QRTable, và điều không được nói quá.

## 1. Luận đề chính của đề tài

### Câu 20 giây

QRTable dùng bài toán SaaS POS tích hợp đặt món qua mã QR làm tình huống nghiên cứu để thiết kế hệ thống vi dịch vụ (microservices). Trọng tâm là ranh giới nghiệp vụ rõ, nhiều nhà hàng dùng chung nền tảng nhưng dữ liệu tách biệt, cập nhật gần thời gian thực (realtime), thanh toán, tính lũy đẳng (idempotency), bảng sự kiện chờ phát (outbox) và Saga ở các luồng đại diện.

### Câu đào sâu

Điểm chính của đề tài không phải chứng minh QR menu là mới. Đặt món bằng mã QR và POS đã tồn tại trên thị trường. Khoảng trống của khóa luận là trình bày và xây dựng một hệ thống đầy đủ hơn ở góc kỹ thuật phần mềm: nhiều tác nhân, nhiều service sở hữu dữ liệu khác nhau, nhiều nguồn trạng thái, giao tiếp đồng bộ/bất đồng bộ có chọn lọc, và kiểm chứng các bất biến như đúng tenant, đúng tồn kho, đúng hóa đơn, xử lý gửi lại/gọi lặp.

### Anchor QRTable

- Customer PWA: khách quét QR, xem menu, giỏ món, theo dõi đơn.
- Management App: POS, KDS, dashboard, admin.
- Backend services: BFF, Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access.
- Tài liệu bằng chứng: `thesis-evidence-map.md`, `traceability-matrix.md`, `saga-validation-strategy.md`.

### Không nói

- "QRTable phát minh ra QR ordering."
- "Hệ thống đã production-ready."
- "Microservices luôn tốt hơn monolith."

## 2. Vì sao chọn vi dịch vụ thay vì nguyên khối có chia module

### Câu 20 giây

Vi dịch vụ (microservices) được chọn vì QRTable có nhiều miền nghiệp vụ với chủ sở hữu dữ liệu khác nhau: Catalog quản lý menu/tồn kho, Order quản lý phiên/đơn/hóa đơn, Kitchen quản lý KDS, Payment quản lý thanh toán, SaaS quản lý tenant/gói dịch vụ và User-Access quản lý người dùng. Lựa chọn này giúp tách trách nhiệm rõ hơn, nhưng đổi lại phải xử lý lỗi phân tán, tính lũy đẳng, nhất quán dữ liệu và Saga.

### Câu đào sâu

Nếu chỉ làm sản phẩm nhỏ, nguyên khối có chia module (modular monolith) có thể nhanh và ít rủi ro hơn. Nhưng mục tiêu khóa luận là nghiên cứu thiết kế SaaS POS theo vi dịch vụ, nên giá trị nằm ở cách QRTable phân ranh giới và xử lý chi phí phát sinh. Vì mỗi service sở hữu database hoặc bản sao trạng thái riêng, không có một giao dịch ACID chung cho mọi thao tác. Do đó QRTable phải có quy tắc chọn kênh giao tiếp, bảng outbox, tính lũy đẳng và hành động bù trừ (compensation).

### Anchor QRTable

- Catalog sở hữu menu, table, QR token, stock.
- Order sở hữu session, cart, order, bill.
- Kitchen sở hữu bản sao trạng thái KDS trong Redis.
- Payment sở hữu payment record, audit, tenant payment settings.
- SaaS sở hữu tenant, plan, subscription, subscription invoice.
- User-Access sở hữu profile/role/staff application data.

### Không nói

- "Microservices giúp nhanh hơn" nếu chưa có đo đạc hiệu năng so sánh (benchmark).
- "Monolith không thể làm được."
- "Tách service là đủ để thành microservices." Phải có ownership và contract.

## 3. Ranh giới dịch vụ và sở hữu dữ liệu

### Câu 20 giây

Mỗi service chỉ ghi dữ liệu thuộc miền của mình. Khi cần dữ liệu hoặc hành vi của service khác, QRTable đi qua hợp đồng giao tiếp bằng TCP/gRPC/Kafka, không import repository hoặc truy cập database chéo.

### Câu đào sâu

Ranh giới dịch vụ quan trọng vì nó trả lời ai có quyền quyết định trạng thái. Ví dụ Order không tự giảm tồn kho; Order gọi Catalog vì Catalog là chủ sở hữu stock. Payment không tự đóng phiên bàn; Payment ghi giao dịch rồi phối hợp với Order để Order đánh dấu hóa đơn/phiên. Kitchen không quyết định đơn có hợp lệ hay không; Kitchen dựng trạng thái KDS sau sự kiện `order.confirmed`.

### Anchor QRTable

- `docs/DOC-CODE-ANCHORS.md` map các DataSource theo service.
- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`

### Không nói

- "Service này có thể đọc database service khác cho nhanh."
- "Kitchen sở hữu vòng đời Order."
- "Payment sở hữu Bill." Payment sở hữu payment; Order sở hữu bill/session.

## 3a. Lựa chọn Cơ sở dữ liệu (SQL, NoSQL, Redis)

### Câu 20 giây

QRTable áp dụng mô hình "Mỗi dịch vụ một cơ sở dữ liệu" (Database-per-service), cho phép chọn giải pháp lưu trữ tối ưu nhất cho từng miền (Polyglot Persistence): PostgreSQL (SQL) cho các service cần ACID/tồn kho/giao dịch; MongoDB (NoSQL) cho User-Access cần schema linh hoạt và đọc nhanh; Kitchen dùng Redis (In-memory) làm database chính cho KDS để đạt tốc độ sub-millisecond và quản lý hàng đợi Sorted Set tối ưu.

### Câu đào sâu

Việc phân chia cơ sở dữ liệu dựa trên đặc thù nghiệp vụ và tính chất của dữ liệu:

- **PostgreSQL (SQL)**: Dành cho Catalog, Order, Payment và SaaS. Các miền này quản lý thực đơn, tồn kho, đơn hàng và tiền tệ của nhà hàng – nơi dữ liệu có cấu trúc cao, quan hệ chặt chẽ và yêu cầu giao dịch ACID nghiêm ngặt. Catalog cần cơ chế **khóa bi quan (pessimistic locking)** để tránh bán lặp (overselling) khi trừ kho; Order và Payment cần ghi transaction cục bộ để tránh mất hóa đơn/tiền của khách.
- **MongoDB (NoSQL)**: Dành cho User-Access. Hồ sơ nhân viên, tuỳ chọn cấu hình, và siêu dữ liệu (metadata) của từng nhà hàng (tenant) có cấu trúc phi đồng nhất và dễ thay đổi. MongoDB giúp lưu trữ dạng tài liệu (document) linh hoạt mà không cần migrate schema phức tạp, đồng thời tối ưu hiệu năng đọc cực nhanh cho luồng kiểm tra quyền hạn (RBAC) trên mỗi request.
- **Redis (In-Memory Database)**: Kitchen sử dụng Redis làm **primary data store** cho KDS (màn hình bếp). KDS chỉ quản lý các ticket chế biến live (dữ liệu ngắn hạn) với tần suất cập nhật rất cao, do đó Redis Sorted Set giúp xếp hàng chế biến (FIFO) theo độ ưu tiên cực nhanh ($O(\log N)$). Các service khác dùng Redis làm Cache (Menu, User Session, Rate Limiter) để giảm tải cho database chính.

### Anchor QRTable

- PostgreSQL: `qrtable_catalog`, `qrtable_order`, `qrtable_payment`, `qrtable_saas`.
- MongoDB: `qrtable_auth` (User-Access).
- Redis KDS: [`kds-redis.repository.ts`](../../apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts)
- Redis Cache: [`redis-client.service.ts`](../../libs/providers/redis-client/src/lib/redis-client.service.ts)

### Không nói

- "Redis chỉ dùng làm cache trong QRTable." (Kitchen dùng Redis làm database chính cho live KDS).
- "Dữ liệu người dùng bắt buộc phải dùng SQL mới đảm bảo an toàn."
- "Cơ sở dữ liệu của các service có thể kết nối chéo hoặc thực hiện join SQL với nhau."

## 4. Giao tiếp: HTTP, TCP, gRPC, Kafka, WebSocket

### Câu 20 giây

QRTable không dùng một loại giao tiếp cho mọi việc. HTTP/WebSocket nằm ở lớp client đi qua BFF; TCP dùng cho lệnh/truy vấn nội bộ cần phản hồi ngay; gRPC dùng cho Authorizer; Kafka dùng cho sự kiện nghiệp vụ sau commit và tác dụng phụ bất đồng bộ; WebSocket chỉ là tín hiệu cập nhật gần thời gian thực cho client.

### Câu đào sâu

Tiêu chí là hành động đó có cần kết quả ngay hay không. Nếu cần kết quả ngay để quyết định tiếp, dùng TCP/gRPC. Ví dụ khi nhân viên xác nhận đơn, Order cần biết Catalog có trừ tồn kho được không. Nếu một service đã lưu trạng thái xong và service khác chỉ phản ứng sau đó, dùng Kafka. Ví dụ Kitchen tạo ticket KDS sau `order.confirmed`. Nếu cần cập nhật UI gần thời gian thực, dùng WebSocket, nhưng client vẫn có thể tải lại snapshot từ API.

### Anchor QRTable

- Kafka topics approved: `order.confirmed`, `order.status_changed`, `payment.completed`, `kitchen.sla_warning`, `tenant.created`.
- `libs/constants/src/lib/kafka-topic.constants.ts`
- `libs/constants/src/lib/ws-room.constants.ts`
- `thesis-defense-live-demo-script.md`

### Không nói

- "Tất cả giao tiếp đều qua Kafka."
- "WebSocket là source of truth."
- "`kds.queue_changed` là Kafka topic lõi." Đây là tín hiệu nội bộ qua Redis Pub/Sub/WebSocket, không nằm trong danh sách Kafka topic chính.

## 5. Kafka trong QRTable

### Câu 20 giây

Kafka được dùng cho sự kiện bất đồng bộ sau khi trạng thái nghiệp vụ đã commit, ví dụ `order.confirmed` để Kitchen dựng KDS và `payment.completed` để các service khác phản ứng. QRTable dùng Kafka theo hướng có thể gửi ít nhất một lần (at-least-once), nên bên nhận phải xử lý lặp an toàn bằng tính lũy đẳng/chống lặp; không nói hệ thống đạt đúng một lần tuyệt đối (exactly-once).

### Câu đào sâu

Theo cách nói của Kafka, bên phát (producer) gửi bản ghi sự kiện vào topic; bản ghi được phân phối theo partition và nhóm tiêu thụ (consumer group). Kafka phù hợp khi muốn service phát sự kiện không phải chờ mọi service khác xử lý xong. Nhưng Kafka không tự giải quyết bất biến nghiệp vụ. Trong QRTable, nhất quán tồn kho vẫn do giao dịch của Catalog và Order Confirm Saga xử lý; Kafka chỉ đưa kết quả đã commit sang Kitchen hoặc các tác dụng phụ sau đó.

### Anchor QRTable

- `libs/constants/src/lib/kafka-topic.constants.ts`
- `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`
- `libs/entities/src/lib/outbox-event.entity.ts`
- Context7 checked `/apache/kafka` for Kafka vocabulary and delivery semantics.

### Không nói

- "Kafka bảo đảm exactly-once cho QRTable."
- "Kafka thay distributed transaction."
- "Cứ microservices là phải Kafka mọi request."

## 6. Bảng sự kiện chờ phát

### Câu 20 giây

Bảng sự kiện chờ phát (transactional outbox) giúp ghi sự kiện vào cùng giao dịch cục bộ với trạng thái nghiệp vụ, rồi tiến trình publisher phát sự kiện ra Kafka sau commit. Nhờ vậy tránh tình huống Order đã chuyển `PROCESSING` nhưng quên phát `order.confirmed`, hoặc phát event trước khi trạng thái Order thật sự lưu bền.

### Câu đào sâu

Trong Order Confirm Saga, sau khi Catalog trừ tồn kho thành công, Order cập nhật đơn/món và tạo `OutboxEvent` `order.confirmed` trong giao dịch của Order. `OutboxPublisherService` đọc các dòng `PENDING`, gửi Kafka với key/payload, rồi đánh dấu `PUBLISHED`; nếu lỗi thì tăng số lần thử và lưu lỗi cuối. Outbox không đồng nghĩa xử lý đúng một lần từ đầu đến cuối; nó giảm rủi ro giữa DB commit và phát sự kiện.

### Anchor QRTable

- `libs/entities/src/lib/outbox-event.entity.ts`
- `apps/order/src/app/modules/order/services/outbox-publisher.service.ts`
- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`

### Không nói

- "Outbox bảo đảm consumer xử lý đúng một lần."
- "Outbox thay thế retry/dedup ở consumer."
- "Outbox là message broker." Outbox là bảng trung gian trong database service owner.

## 7. Tính lũy đẳng

### Câu 20 giây

Tính lũy đẳng (idempotency) là khả năng xử lý cùng một thao tác bị gửi lại nhiều lần nhưng không tạo tác dụng phụ lặp. QRTable dùng khóa lũy đẳng (idempotency key) cho gửi đơn, xác nhận/trừ tồn kho, bù trừ, webhook thanh toán và lệnh KDS để chống double-click, retry, timeout hoặc message duplicate.

### Câu đào sâu

Gửi lại (retry) là hành vi của bên gọi; tính lũy đẳng là cách server xử lý an toàn khi request bị gửi lại. Trong Order Confirm Saga, trừ tồn kho dùng key `confirm-order:{orderId}` để Catalog không trừ lại nếu cùng order được xác nhận lặp hoặc response cũ bị mất. Bù trừ (compensation) cũng có key riêng kèm phiên bản giữ chỗ tồn kho. Với KDS, Redis dùng key chống lặp theo sự kiện/request để không tạo ticket hoặc chuyển trạng thái lặp.

### Anchor QRTable

- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `docs/testing/traceability-matrix.md`

### Không nói

- "Có idempotency là không cần transaction."
- "Tính lũy đẳng giải quyết mọi lỗi phân tán."
- "Duplicate không thể xảy ra." Duplicate vẫn có thể xảy ra; hệ thống phải chịu được.

## 8. Mẫu Saga

### Câu 20 giây

Saga là cách điều phối một chuỗi giao dịch cục bộ (local transaction) giữa nhiều service khi không dùng một giao dịch phân tán ACID chung. Mỗi bước commit tại service sở hữu dữ liệu; nếu bước sau thất bại, hệ thống chạy hành động bù trừ (compensation) cho tác dụng phụ đã xảy ra.

### Câu đào sâu

QRTable dùng Saga điều phối tập trung (orchestration Saga) ở hai luồng đại diện: Order Confirm Saga và SaaS Onboarding Mini-Saga. Deck chỉ đào sâu Order Confirm Saga. Orchestration phù hợp vì có một service điều phối rõ: Order điều phối xác nhận đơn; SaaS điều phối onboarding. Kiểu các service tự phản ứng với sự kiện (choreography) có thể giảm coordinator, nhưng khó theo dõi và khó giải thích hơn với luồng có bất biến mạnh như tồn kho/đơn hàng.

### Anchor QRTable

- `docs/testing/saga-validation-strategy.md`
- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/saas/src/services/onboarding-saga.service.ts`

### Không nói

- "Mọi distributed transaction đều là Saga."
- "Saga hiện tại production-grade."
- "Saga bảo đảm rollback giống ACID." Bù trừ là hành động nghiệp vụ, không phải rollback vật lý của transaction đã commit ở service khác.

## 9. Order Confirm Saga

### Câu 20 giây

Order Confirm Saga bảo vệ bất biến nghiệp vụ: chỉ chuyển đơn sang chế biến khi tồn kho được Catalog xử lý thành công, và thao tác gửi lại không được trừ tồn kho hai lần. Order là service điều phối; Catalog sở hữu tồn kho; Order lưu trạng thái và outbox; Kitchen chỉ nhận việc sau `order.confirmed`.

### Câu đào sâu

Luồng thành công:

1. Nhân viên/POS gửi xác nhận qua BFF.
2. BFF kiểm JWT, tenant và quyền.
3. Order khóa và kiểm tra đơn/hóa đơn trong tenant.
4. Order gọi Catalog `deductForOrder` với khóa lũy đẳng.
5. Catalog trả phiên bản giữ chỗ tồn kho.
6. Order chuyển đơn/món sang `PROCESSING`, lưu phiên bản giữ chỗ, tạo outbox `order.confirmed`.
7. Outbox publisher phát Kafka.
8. Kitchen đọc `order.confirmed` và tạo ticket KDS trong Redis.

Nhánh lỗi quan trọng:

- Nếu Catalog báo thiếu tồn kho: Order không chuyển trạng thái, không cần bù trừ vì tồn kho chưa bị trừ.
- Nếu Catalog trừ tồn kho thành công nhưng Order commit/outbox lỗi: Order gọi `releaseForOrder` với phiên bản giữ chỗ để bù trừ.
- Nếu request confirm lặp khi order đã `PROCESSING`: Order trả lại kết quả hiện tại, không trừ tồn kho lại.

### Anchor QRTable

- `apps/order/src/app/modules/order/services/order-confirm-saga.service.ts`
- `apps/order/src/app/modules/order/tests/order-confirm-saga.service.spec.ts`
- `docs/testing/saga-validation-strategy.md`
- Report: Chương 5 mục "Xác nhận đơn hàng và bảo toàn tồn kho theo Order Confirm Saga".

### Không nói

- "Submit order đã trừ stock." Stock xử lý ở staff confirm.
- "Order và Catalog cùng một transaction database."
- "Kitchen phải xử lý xong thì confirm mới thành công."

## 10. KDS, bản sao trạng thái Redis và WebSocket

### Câu 20 giây

KDS là bản sao trạng thái vận hành của Kitchen trong Redis, được dựng từ `order.confirmed`. Redis giúp hàng đợi bếp nhanh theo tenant/station, chống lặp sự kiện/lệnh, còn WebSocket chỉ báo cho client biết có thay đổi để tải lại trạng thái.

### Câu đào sâu

Kitchen đọc `order.confirmed`, phân món theo khu vực chế biến, tạo ticket trong Redis Hash/Set/Sorted Set, tăng phiên bản trạng thái và phát `kds.queue_changed`. BFF gửi WebSocket đến room theo tenant/station. Nếu client mất socket, client có thể tải lại snapshot từ API. Redis trong KDS là trạng thái vận hành; Order vẫn sở hữu vòng đời đơn và món trong đơn.

### Anchor QRTable

- `apps/kitchen/src/app/modules/kitchen/repositories/kds-redis.repository.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`
- `apps/kitchen/src/app/modules/kitchen/utils/kds-keys.ts`
- `libs/constants/src/lib/ws-room.constants.ts`

### Không nói

- "Redis là database chính của hệ thống."
- "WebSocket quyết định trạng thái cuối."
- "KDS thay Order cập nhật toàn bộ vòng đời đơn hàng."

## 11. Mở rộng hệ thống, Redis Pub/Sub và WebSocket fan-out

### Câu 20 giây

QRTable không nói đã có kiểm thử tải lớn. Cách trả lời đúng là hệ thống được thiết kế để có điểm mở rộng rõ: BFF/WebSocket có thể chạy nhiều instance nhờ Socket.io Redis adapter, backend service tách theo ranh giới nghiệp vụ, nhóm tiêu thụ Kafka xử lý tác dụng phụ bất đồng bộ, Redis giữ trạng thái vận hành/realtime và database theo từng service có thể tối ưu theo service owner.

### Câu đào sâu

Mở rộng hệ thống (scaling) trong QRTable phải tách theo loại tải:

- HTTP command/query: tăng instance BFF và service theo chiều ngang, miễn là trạng thái không nằm trong memory cục bộ.
- WebSocket: nhiều BFF instance cần adapter dùng chung để phát tới client dù client đang nối vào instance khác; QRTable dùng Socket.io Redis adapter.
- KDS realtime: Kitchen publish `kds.queue_changed` qua Redis Pub/Sub channel `realtime:kds:*`; BFF subscriber nhận rồi emit WebSocket theo `WsRoom`.
- Sự kiện nghiệp vụ: Kafka dùng cho event bền hơn như `order.confirmed`; consumer group có thể mở rộng consumer, nhưng consumer vẫn phải xử lý lặp an toàn.
- Lớp dữ liệu: bottleneck thường nằm ở transaction Order/Catalog, Redis KDS của tenant/station nóng, số lượng WebSocket connection và query DB per-service.

Redis Pub/Sub khác Kafka: Pub/Sub là tín hiệu ngắn hạn để phát tán realtime, không có phát lại/bền vững như Kafka. Vì vậy `kds.queue_changed` không nằm trong Kafka topic registry; nếu mất tín hiệu, client vẫn có thể tải lại snapshot.

### Anchor QRTable

- `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.ts`
- `apps/bff/src/app/modules/realtime/services/kds-internal-events.subscriber.ts`
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/app/modules/realtime/services/realtime-events.service.ts`
- `libs/constants/src/lib/ws-room.constants.ts`
- `apps/kitchen/src/app/modules/kitchen/repositories/kds-ticket-store.repository.ts`

### Không nói

- "Redis Pub/Sub thay thế Kafka."
- "WebSocket scale tự động chỉ vì dùng Socket.io."
- "Redis Pub/Sub là durable event log."
- "QRTable đã chứng minh scale bằng load test lớn." Nếu chưa có kiểm thử tải thật, nói là thiết kế có đường mở rộng và cần kiểm chứng tiếp.

## 12. Xác thực, phân quyền, cô lập tenant và quyền theo gói

### Câu 20 giây

QRTable tách biệt hai lớp: Định danh (Identity - giao cho Keycloak OIDC) và Hồ sơ nghiệp vụ (Application User Profile - tại User-Access service). Nhân viên/admin đăng nhập qua Keycloak nhận JWT tự chứa thông tin; khách hàng dùng QR session riêng trong Redis để tránh ma sát trải nghiệm; lớp Authorizer nội bộ xác minh chữ ký JWT qua gRPC/JWKS để giữ tốc độ phản hồi tối ưu.

### Câu đào sâu

- **Lý do chọn Keycloak & OIDC**: OpenID Connect (OIDC) xây dựng trên OAuth 2.0 cấp mã thông báo JSON Web Token (JWT) được ký số bảo mật. Keycloak là hệ thống Quản lý định danh Chuẩn doanh nghiệp (Enterprise IAM) giúp giảm rủi ro bảo mật (không tự lưu mật khẩu, tự động quản lý session và thu hồi token).
- **Custom Claims & Cô lập Tenant**: Chúng em cấu hình Keycloak Protocol Mapper để nhúng `tenant_id` của nhân viên trực tiếp vào JWT. Khi request đi qua BFF, `TenantGuard` chỉ cần đọc token để biết nhân viên thuộc nhà hàng nào mà không cần truy vấn chéo database.
- **Authorizer gRPC**: Để tránh việc các domain service gọi HTTP liên tục tới Keycloak gây nghẽn, dịch vụ `Authorizer` (gRPC) xác minh chữ ký token bằng cách tải khóa công khai (JWKS) từ Keycloak và cache kết quả vào Redis (TTL 30 phút). Các service khác chỉ cần gọi gRPC tới Authorizer để verify với tốc độ sub-millisecond.
- **Phân quyền nhiều lớp**: Hệ thống tách biệt: Phân quyền vai trò (RBAC) xác định hành vi được làm; Cô lập tenant xác định dữ liệu của nhà hàng nào; Quyền theo gói (entitlement) xác định tính năng được dùng theo gói subscription đăng ký ở SaaS service.

### Anchor QRTable

- `libs/guards/src/lib/user.guard.ts`
- `libs/guards/src/lib/session.guard.ts`
- `libs/guards/src/lib/tenant.guard.ts`
- `libs/guards/src/lib/permission.guard.ts`
- `libs/guards/src/lib/plan-feature.guard.ts`
- Authorizer: `apps/authorizer/src/app/modules/auth/services/keycloak.service.ts`
- Report Chương 4 mục security/auth/RBAC.

### Không nói

- "RBAC tự giải quyết tenant isolation."
- "Customer dùng Keycloak."
- "Tenant isolation là database riêng cho từng tenant." Thiết kế hiện tại là database theo service + `tenant_id` trong từng service.
- "Chúng em tự lập trình giải pháp OAuth 2.0 / IAM riêng từ đầu" (Sử dụng Keycloak để đảm bảo tính an toàn bảo mật chuẩn doanh nghiệp).

## 13. Payment, VietQR và SePay

### Câu 20 giây

Payment sở hữu bản ghi thanh toán, audit và cấu hình thanh toán của tenant; Order sở hữu hóa đơn/phiên bàn. Với VietQR/SePay, QRTable phân biệt dòng tiền nhà hàng `QRTBL` và dòng tiền subscription nền tảng `QRSUB`; webhook đi qua BFF, được xác thực/định tuyến rồi xử lý lũy đẳng.

### Câu đào sâu

Tiền mặt: Payment lấy snapshot hóa đơn từ Order, tạo/khóa payment, kiểm số tiền, ghi audit/outbox, rồi gọi Order đánh dấu hóa đơn đã trả. VietQR/SePay: Payment tạo mã tham chiếu hóa đơn `QRTBL`, webhook đối chiếu code/content/reference, xử lý gửi lặp hoặc thiếu tiền, rồi mới hoàn tất hóa đơn. Hóa đơn subscription `QRSUB` thuộc SaaS, không trộn với thanh toán hóa đơn nhà hàng.

### Anchor QRTable

- `apps/payment/src/app/modules/payment/services/payment-settlement.service.ts`
- `docs/guides/sepay-configuration-guide-phase3.md`
- `docs/graduation-thesis-resources/thesis-defense-live-demo-script.md`

### Không nói

- "Payment sở hữu Bill."
- "SePay live production đã được kiểm chứng toàn diện" nếu chưa có evidence thật.
- "Webhook không thể gửi lặp." Webhook có thể lặp, nên cần idempotency/audit.

## 14. Bằng chứng và giới hạn

### Câu 20 giây

QRTable chứng minh hệ thống bằng nhiều lớp: demo giao diện, trạng thái DB/Redis/Kafka, kiểm thử tự động, ma trận truy vết và tài liệu kiến trúc. Demo chỉ chứng minh luồng thành công nhìn thấy; các nhánh lỗi như bù trừ Saga phải dựa vào test/log/state evidence.

### Câu đào sâu

Khi thầy hỏi "đã chứng minh chưa", trả lời theo mức bằng chứng:

- Đã kiểm chứng bằng test tự động.
- Đã có kiểm thử tích hợp tùy chọn.
- Có demo/UI cho luồng thành công.
- Có thiết kế/code evidence nhưng chưa có bằng chứng vận hành đầy đủ.
- Là hướng củng cố tiếp, không phải kết luận chính.

### Anchor QRTable

- `docs/testing/traceability-matrix.md`
- `docs/testing/saga-validation-strategy.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`

### Không nói

- "Tất cả P0/P1 đều covered."
- "Một lần demo thành công chứng minh toàn bộ kiến trúc."
- "Có screenshot là đủ chứng minh Saga."
