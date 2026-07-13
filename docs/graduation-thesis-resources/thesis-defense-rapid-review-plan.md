# QRTable Defense Rapid Review Plan

> Mục tiêu: ôn phản biện gấp cho buổi bảo vệ 10:00 ngày 25/06/2026.  
> Thời điểm lập kế hoạch: khoảng 13:00 ngày 24/06/2026.  
> Phạm vi: hỗ trợ học nhanh, trả lời phản biện và demo; không sửa nội dung LaTeX chính, không thêm citation, không thay `references.bib`.

## 1. Cách dùng bộ tài liệu này

Đọc theo thứ tự:

1. `thesis-defense-rapid-review-plan.md` - chia thời gian từ chiều nay đến sáng mai.
2. `thesis-defense-core-mechanisms-cheatsheet.md` - học các cơ chế phải nắm.
3. `thesis-defense-reviewer-question-bank.md` - luyện trả lời câu hỏi phản biện.
4. `thesis-defense-live-demo-script.md` - luyện demo theo đúng thứ tự tab.
5. `thesis-defense-slide-internal-notes-and-qa.md` - chỉ mở khi cần đào sâu từng slide.

Không cố học thuộc từng file code. Mục tiêu là nói được theo công thức:

```text
Bài toán nghiệp vụ -> bất biến cần bảo vệ -> lựa chọn kiến trúc -> cơ chế triển khai -> bằng chứng -> giới hạn.
```

Ví dụ:

```text
Bài toán: nhân viên xác nhận đơn nhưng tồn kho có thể bị trừ lặp.
Bất biến: đơn không vào bếp nếu Catalog chưa xử lý tồn kho; retry không được trừ hai lần.
Cơ chế: Order Confirm Saga, idempotency key, versioned stock reservation, outbox order.confirmed.
Bằng chứng: unit/contract tests, opt-in integration tests, DB/outbox/Kafka evidence nếu có ảnh thật.
Giới hạn: không claim exactly-once hoặc production-grade Saga recovery.
```

Khi nói miệng, ưu tiên tiếng Việt trước, English trong ngoặc:

| Nói trước với thầy                   | Thuật ngữ English nếu cần |
| ------------------------------------ | ------------------------- |
| kiến trúc vi dịch vụ                 | microservices             |
| ranh giới dịch vụ                    | service boundary          |
| sở hữu dữ liệu                       | data ownership            |
| cô lập dữ liệu theo đơn vị thuê bao  | tenant isolation          |
| tính lũy đẳng                        | idempotency               |
| bảng sự kiện chờ phát                | transactional outbox      |
| nhất quán cuối cùng                  | eventual consistency      |
| hành động bù trừ                     | compensation              |
| nguồn trạng thái chính               | source of truth           |
| bản sao trạng thái vận hành          | runtime projection        |
| tín hiệu cập nhật gần thời gian thực | realtime hint             |
| nhóm tiêu thụ Kafka                  | consumer group            |

## 2. Snapshot từ CodeGraph và tài liệu đã đọc

CodeGraph preflight đã chạy trước khi lập tài liệu:

- `codegraph sync .`: đồng bộ 2 file thay đổi trong index.
- `codegraph status .`: 1.231 files, 15.831 nodes, 32.777 edges.
- CodeGraph phủ tốt TypeScript/TSX/JS/Python/YAML/XML; Markdown/LaTeX phải đọc trực tiếp bằng `rg`/`sed`.
- Query trọng tâm đã định vị `OrderConfirmSagaService`, `OutboxPublisherService`, `OutboxEvent`, `KafkaTopic`, `KdsRedisRepository`, `RedisKey`, `WsRoom`, `UserGuard`, `TenantGuard`, `PermissionGuard`, `PlanFeatureGuard`, `PaymentSettlementService`.

Tài liệu nền đã đối chiếu:

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-defense-deck-methodology-plan.md`
- `docs/graduation-thesis-resources/thesis-defense-live-demo-script.md`
- `docs/graduation-thesis-resources/thesis-defense-slide-internal-notes-and-qa.md`
- `docs/graduation-thesis-resources/thesis-defense-slide-content-guide.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/README.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/technical-architecture.md`
- `docs/business-logic.md`
- `docs/testing/traceability-matrix.md`
- `docs/testing/saga-validation-strategy.md`
- `docs/guides/sepay-configuration-guide-phase3.md`

Context7/ctx7 đã dùng cho Apache Kafka (`/apache/kafka`) để kiểm tra vocabulary hiện hành quanh topic, partition, producer/consumer, consumer group, at-least-once, idempotent producer và transaction semantics. Không thêm nguồn mới vào bibliography.

## 3. Luận đề trung tâm cần nhớ

Nếu thầy hỏi rộng, quay lại một câu:

> QRTable không chỉ là một ứng dụng POS có giao diện đặt món. Đề tài dùng bài toán SaaS POS tích hợp đặt món qua mã QR trong F&B làm tình huống nghiên cứu kỹ thuật để thiết kế và kiểm chứng một hệ thống vi dịch vụ (microservices) có ranh giới dịch vụ, sở hữu dữ liệu, cô lập dữ liệu theo đơn vị thuê bao, cập nhật gần thời gian thực, thanh toán, tính lũy đẳng, outbox và Saga ở các luồng đại diện.

Cách nói business-first:

> Về nghiệp vụ, hệ thống giải quyết luồng từ khách quét QR, gọi món, nhân viên xác nhận, bếp xử lý đến thanh toán. Về kiến trúc, khó khăn nằm ở việc nhiều tác nhân và nhiều service cùng tham gia nhưng không được làm sai tenant, sai tồn kho, sai hóa đơn hoặc gửi lặp sự kiện. QRTable giải quyết bằng ranh giới dịch vụ rõ, giao tiếp đồng bộ/bất đồng bộ có chọn lọc, tính lũy đẳng, outbox và Saga.

## 4. Thứ tự ưu tiên học

### P0 - Bắt buộc nói trôi chảy

1. Vì sao chọn vi dịch vụ (microservices) thay vì monolith.
2. Ranh giới dịch vụ (service boundary) và sở hữu dữ liệu (data ownership).
   2a. Lý do lựa chọn cơ sở dữ liệu (PostgreSQL, MongoDB, Redis) cho từng service.
3. HTTP/TCP/gRPC/Kafka/WebSocket dùng khi nào.
4. Tính lũy đẳng (idempotency) là gì và QRTable dùng ở đâu.
5. Bảng sự kiện chờ phát (transactional outbox) giải quyết vấn đề gì.
6. Saga là gì; vì sao Order Confirm Saga là case study chính.
7. KDS dùng Redis làm bản sao trạng thái vận hành và WebSocket làm tín hiệu cập nhật ra sao.
8. Staff/admin dùng Keycloak; customer dùng QR/session.
9. Cô lập tenant khác phân quyền vai trò (RBAC) và quyền theo gói dịch vụ (entitlement) thế nào.
10. Demo golden flow: QR -> Cart -> Order -> KDS -> Payment.

### P1 - Nên nắm để trả lời sâu

1. SePay/VietQR có hai dòng tiền `QRTBL` và `QRSUB`.
2. Vì sao Kafka không thay thế mọi RPC.
3. Vì sao WebSocket không phải nguồn trạng thái chính.
4. Vì sao Redis không phải nguồn sự thật chung.
5. Vì sao không claim exactly-once.
6. Bằng chứng hiện tại chứng minh được gì và chưa chứng minh được gì.
7. Dashboard/reporting/entitlement đã có nhưng không phải demo trọng tâm.
8. WebSocket scale nhiều BFF instance nhờ Socket.io Redis adapter ra sao.
9. Redis Pub/Sub khác Kafka thế nào; vì sao `kds.queue_changed` chỉ là tín hiệu realtime nội bộ.
10. Khi tenant/tải tăng, bottleneck có thể nằm ở Order/Catalog, Redis KDS, WebSocket connection hoặc database per-service.

### P2 - Chỉ mở khi bị hỏi

1. Chi tiết route SePay webhook.
2. Chi tiết KDS Redis key.
3. Chi tiết test command.
4. Chi tiết Phase 7/deployment foundation.
5. Chi tiết SaaS Onboarding Mini-Saga.

## 5. Lịch ôn từ 13:00 đến lúc bảo vệ

### 13:00-13:30 - Reset chiến lược

- Đọc mục 3 và 4 của file này.
- Viết ra giấy 1 câu định vị đề tài, 1 câu đóng góp, 1 câu giới hạn.
- Mục tiêu: không bị cuốn vào code-level quá sớm.

Checklist nói được:

- QRTable là case study kỹ thuật, không phải nghiên cứu mô hình kinh doanh.
- Business flow là QR -> Order -> KDS -> Payment.
- Microservices là lựa chọn có đánh đổi, không phải khẩu hiệu.

### 13:30-15:00 - Học câu chuyện 8 phút đầu

Tập nói không nhìn file:

1. Bối cảnh F&B.
2. Vấn đề POS/QR ordering khi có nhiều actor.
3. Vì sao SaaS cần tenant isolation.
4. Vì sao microservices phù hợp với nhiều bounded contexts.
5. Những thách thức microservices tạo ra.

Output cần đạt:

- Nói được 8 phút đầu slide bằng lời tự nhiên.
- Không dùng các câu yếu như "em dùng microservices vì hiện đại".

### 15:00-16:30 - Học cụm kiến trúc

Đọc `thesis-defense-core-mechanisms-cheatsheet.md` các mục:

- Microservices vs monolith.
- Service boundary.
- Communication model.
- Kafka/outbox.
- Auth/tenant/RBAC.

Luyện trả lời 5 câu:

- Tại sao không modular monolith?
- Kafka dùng ở đâu?
- Vì sao không Kafka everything?
- Tenant isolation chứng minh thế nào?
- WebSocket có phải source of truth không?

### 16:30-18:00 - Đào sâu Order Confirm Saga

Đọc cheat sheet mục Saga và Order Confirm Saga. Sau đó mở thêm:

- `docs/testing/saga-validation-strategy.md`
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex` mục Order Confirm Saga nếu cần.

Nói lại theo 6 bước:

1. Staff confirm là business commit point.
2. Order lock/validate order và bill.
3. Catalog deduct stock bằng idempotency key.
4. Order commit trạng thái `PROCESSING` và outbox `order.confirmed`.
5. Nếu Order commit/outbox fail sau deduct, Order release stock theo reservation version.
6. Kitchen nhận event sau commit để dựng KDS projection.

Không được nói:

- "Có transaction ACID chung giữa Order và Catalog."
- "Kafka bảo đảm exactly-once cho toàn bộ luồng."
- "Saga đã production-grade."

### 18:00-19:00 - Nghỉ và ăn

Không đọc thêm code. Não cần có thời gian gom ý.

### 19:00-20:30 - Luyện phản biện business-first

Đọc `thesis-defense-reviewer-question-bank.md` phần business/architecture.

Cách luyện:

- Mỗi câu trả lời tối đa 60-90 giây.
- Mở đầu bằng nghiệp vụ.
- Chỉ sau đó mới nói kỹ thuật.
- Kết thúc bằng evidence hoặc giới hạn.

Ví dụ format:

```text
Về nghiệp vụ...
Về kiến trúc...
Trong QRTable...
Bằng chứng hiện tại...
Giới hạn là...
```

### 20:30-21:30 - Luyện demo

Đọc `thesis-defense-live-demo-script.md`.

Phải chuẩn bị:

- Tenant demo.
- Bàn demo.
- Món demo thuộc Kitchen.
- Staff account.
- Kafkio topic `order.confirmed`.
- RedisInsight query KDS.
- Payment flow hoặc fallback screenshot/video nếu live payment không ổn.

Câu chuyển tab cần thuộc:

> "Giao diện cho thấy hành vi người dùng. Em chuyển sang backend checkpoint để chỉ ra state/event tương ứng."

### 21:30-22:30 - Luyện câu hỏi khó

Ưu tiên câu hỏi:

- Nếu Catalog trừ kho rồi Order fail thì sao?
- Tại sao không dùng distributed transaction/two-phase commit?
- Nếu Kafka gửi duplicate thì sao?
- Nếu WebSocket mất kết nối thì sao?
- Nếu payment webhook gửi lặp/thiếu tiền thì sao?
- Nếu tenant A cố truy cập tenant B thì sao?

Nguyên tắc: không trả lời quá tự tin ở điểm chưa có evidence.

### 22:30-23:15 - Chạy một lượt slide + demo bằng miệng

- Không dừng sửa slide.
- Nếu vấp ở câu nào, ghi vào giấy và chỉ sửa cách nói.
- Không mở thêm tài liệu mới trừ câu vấp thuộc P0.

### 23:15-23:45 - Chốt cheat sheet giấy

Viết ra 1 trang:

- 5 keyword: boundary, tenant, idempotency, outbox, Saga.
- 5 câu tránh overclaim.
- 5 câu chuyển khi demo.

Sau 23:45 nên ngủ. Đọc thêm sau thời điểm này dễ rối.

### 07:00-08:00 ngày 25/06 - Warm-up

- Nói lại luận đề trung tâm 3 lần.
- Nói lại Order Confirm Saga 3 lần.
- Nói lại 5 câu hỏi khó nhất.

Không đọc toàn bộ tài liệu.

### 08:00-09:00 - Preflight demo

- Mở đúng tab theo demo script.
- Kiểm tra tài khoản, dữ liệu, bàn, order cũ, Kafkio, RedisInsight.
- Chuẩn bị fallback screenshot/video.

### 09:00-09:30 - Chốt tâm thế

Nếu thầy thiên business:

- Dẫn từ quy trình nhà hàng, trải nghiệm khách, vận hành bếp, thanh toán và quản lý tenant.
- Sau đó mới nói kiến trúc.

Nếu thầy đào kỹ thuật:

- Dẫn bằng bất biến cần bảo vệ, cơ chế triển khai và bằng chứng.
- Không đọc code.

## 6. Một trang nói miệng mẫu

### Mở đầu

> Đề tài của em nghiên cứu và xây dựng QRTable, một nền tảng POS theo mô hình SaaS cho F&B có tích hợp đặt món qua mã QR. Điểm trọng tâm không chỉ là xây giao diện gọi món, mà là tổ chức một hệ thống có nhiều tác nhân và nhiều service sao cho đúng nhà hàng/tenant, đúng trạng thái đơn hàng, đúng tồn kho, đúng thanh toán và vẫn cập nhật gần thời gian thực cho POS/KDS.

### Vì sao chọn vi dịch vụ

> Em chọn kiến trúc vi dịch vụ (microservices) vì bài toán có các miền khá rõ: Catalog sở hữu menu, bàn và tồn kho; Order sở hữu phiên, giỏ món, đơn và hóa đơn; Kitchen sở hữu trạng thái KDS; Payment sở hữu giao dịch và cấu hình thanh toán; SaaS sở hữu tenant và gói dịch vụ. Nếu gom hết vào một khối thì làm nhanh hơn, nhưng khó trình bày và kiểm chứng ranh giới sở hữu dữ liệu mà đề tài muốn nghiên cứu. Đổi lại, em phải xử lý chi phí phân tán như giao tiếp liên dịch vụ, nhất quán dữ liệu, tính lũy đẳng, outbox và Saga.

### Vì sao Order Confirm Saga quan trọng

> Luồng xác nhận đơn là mốc nghiệp vụ quan trọng nhất. Khách gửi đơn chỉ tạo đơn chờ xác nhận. Khi nhân viên xác nhận, Order phải phối hợp với Catalog để xử lý tồn kho, rồi mới lưu trạng thái đơn và phát `order.confirmed` cho Kitchen. Vì Order và Catalog không dùng chung một database transaction, QRTable dùng Saga điều phối: Catalog trừ tồn kho có khóa lũy đẳng và phiên bản giữ chỗ; nếu Order lưu trạng thái hoặc outbox thất bại sau khi Catalog đã trừ tồn kho, Order gọi hành động bù trừ để nhả tồn kho. Đây là ví dụ chính để giải thích nhất quán dữ liệu phân tán trong đề tài.

### Kết luận

> Kết quả của đề tài là một hệ thống đủ để minh họa và kiểm chứng các luồng chính của SaaS POS đặt món bằng QR theo kiến trúc vi dịch vụ. Các kết luận mạnh như sẵn sàng production toàn diện, xử lý đúng một lần tuyệt đối, benchmark tải đầy đủ hoặc Saga hoàn thiện ở mức vận hành thật không nằm trong phạm vi hiện tại. Phần đánh giá trình bày rõ mức bằng chứng và giới hạn này.

## 7. Stop Rules

Dừng đọc thêm nếu đã trả lời được các câu sau trong dưới 90 giây:

- QRTable khác gì một app menu QR thông thường?
- Vì sao chọn microservices?
- Vì sao không Kafka everything?
- Outbox để làm gì?
- Idempotency khác retry ở điểm nào?
- Order Confirm Saga chạy ra sao?
- KDS dùng Redis và WebSocket ra sao?
- Redis Pub/Sub khác Kafka ở đâu?
- WebSocket scale nhiều instance như thế nào?
- Nếu tenant tăng, QRTable scale theo những điểm nào?
- Tenant isolation khác RBAC ra sao?
- Payment `QRTBL` và subscription `QRSUB` khác nhau ở đâu?
- Hệ thống chưa claim được gì?
