# Plan B - Refactor Chương 6-7 QRTable

> Ngày tách plan: 2026-06-04.
> Phạm vi độc lập: refactor Chương 6 về kiểm chứng/đánh giá và viết Chương 7 kết luận/hướng phát triển.
> Dùng plan này khi làm Chương 6-7 sau Plan A. Trước khi sửa Chương 6-7, bắt buộc đọc lại output Plan A đã triển khai và audit mọi phần Chương 6-7 đang dang dở trong worktree.
> Trạng thái sync 2026-06-04: Plan A đã hoàn tất trước và là nguồn tin cậy nhất cho Chương 4-5. Plan B có thể đã bị khởi động trong một session song song rồi dừng; vì vậy khi chạy plan này phải audit diff hiện có của Chương 6-7 trước, giữ phần đúng có bằng chứng và không đánh dấu hoàn tất nếu chưa build/verify.
> Trạng thái thực thi 2026-06-04: đã audit partial work của Chương 6-7 trên nền output Plan A, bổ sung tham chiếu trực tiếp tới Bảng 4.3/4.4/4.5, Hình 5.1-5.5 và Bảng 5.1, cập nhật Chương 7 thành nội dung thật, build XeLaTeX/TeX Live pass và log không còn undefined reference/citation hoặc overfull/underfull.

## 0. Protocol bắt buộc khi thực thi plan

Lưu ý chung:

- Viết tài liệu bằng tiếng Việt. Chỉ giữ tiếng Anh khi là tên công nghệ, tên thành phần, vai trò mã nguồn hoặc thuật ngữ chuyên ngành khó dịch chính xác.
- Có thể dùng web/browser để kiểm chứng nguồn học thuật, nguồn chính thức, DOI/link và metadata khi có phát sinh citation hoặc thông tin có khả năng thay đổi.
- Dùng Context7/`ctx7` khi cần tra tài liệu hiện tại của library, framework, SDK, API, CLI tool hoặc cloud service theo `AGENTS.md`.
- Không invent citation, không thêm nguồn giả vào `references.bib`.
- Chỉ thêm nguồn thật, đủ chắc và có khả năng dùng thật trong nội dung khóa luận.
- Cuối session phải build LaTeX và cập nhật `docs/graduation-thesis-resources/thesis-workflow-plan.md`.

Use relevant installed skills khi cần:

- `Zoom Out`: ưu tiên dùng khi cần nhìn hệ thống ở mức actor/domain/use case, đặc biệt trước khi đánh giá luận điểm microservices.
- `Grill with Docs`: ưu tiên dùng để audit assumption, contradiction, thuật ngữ, reviewer-style questions và đối chiếu với docs/code hiện có.
- `Writing Plans`: dùng khi cần cấu trúc hóa checkpoint, tách task nhỏ hoặc tiếp tục chia plan để tránh tràn ngữ cảnh.
- `Doc Coauthoring`: chỉ dùng khi cần refine cấu trúc tài liệu/audit hoặc reader testing; không dùng để draft chương dài một mạch.
- Có thể dùng thêm skill khác nếu phù hợp với phần việc, nhưng không biến việc dùng skill thành lý do mở rộng scope.

## 1. Bối cảnh tối thiểu

Mục tiêu của Plan B là làm cho Chương 6-7 trả lời rõ câu hỏi cốt lõi của đề tài:

- Kiến trúc microservices của QRTable có hợp lý với bài toán SaaS POS F&B không?
- Ranh giới service và quyền sở hữu dữ liệu có được thể hiện/kiểm chứng không?
- Các luồng nghiệp vụ xuyên service có được triển khai và kiểm chứng không?
- Saga, idempotency, consistency, tenant isolation, RBAC và entitlement có bằng chứng đến mức nào?
- Phase 7 production/pilot, nếu có artifact thật, giúp chứng minh khả năng đóng gói và vận hành kiến trúc ở mức nào?

Technical Phase 6 Observability không phải trụ cột đánh giá chính. Nếu nhắc đến, chỉ nhắc ngắn như nền hỗ trợ vận hành hoặc hướng hardening.

Technical Phase 7 Production Deployment chắc chắn sẽ triển khai trong vài ngày tới, nhưng Chương 6-7 chỉ được claim theo artifact thật. Trước khi có artifact, dùng ngôn ngữ "khung kiểm chứng", "sẽ bổ sung minh chứng", "chờ production/pilot evidence".

### 1.1. Output Plan A phải đọc lại trước khi triển khai Plan B

Plan B kế thừa kết quả đã verify của Plan A, không được suy luận từ bản nháp cũ hoặc từ partial work chưa audit. Trước khi sửa Chương 6-7, đọc lại:

- `docs/graduation-thesis-resources/chapter-04-05-content-refactor-plan.md`, đặc biệt dòng trạng thái sync Plan A.
- `docs/graduation-thesis-resources/thesis-report/chapters/04-thiet-ke-va-kien-truc-he-thong.tex`.
- `docs/graduation-thesis-resources/thesis-report/chapters/05-trien-khai-he-thong.tex`.
- `docs/graduation-thesis-resources/thesis-report/undergraduate-theses-report.lot` và `.lof` nếu cần xác nhận số bảng/hình sau build.

Output Plan A đã chốt để Plan B dùng làm input:

- Chương 4 đã đổi hướng thành `Thiết kế kiến trúc và quyết định công nghệ cho QRTable`.
- Bảng 4.1: quyết định công nghệ chính.
- Bảng 4.2: trách nhiệm dịch vụ và trách nhiệm dữ liệu chính.
- Bảng 4.3: thiết kế dữ liệu theo ranh giới dịch vụ.
- Bảng 4.4: ma trận giao tiếp.
- Bảng 4.5: sổ đăng ký topic Kafka.
- Chương 5 đã đổi hướng thành `Hiện thực các luồng vận hành cốt lõi của QRTable`.
- Hình 5.1-5.5 lần lượt cover QR/session/cart, order confirm/stock, KDS, payment settlement và SaaS onboarding.
- Bảng 5.1 là bảng tổng hợp minh chứng triển khai các luồng cốt lõi; không còn bảng shared libraries độc lập trong Chương 5.

Khi viết Chương 6-7:

- Dùng Bảng 4.3 như nguồn tham chiếu cho data ownership, không lặp lại toàn bộ schema.
- Dùng Bảng 4.4 và Bảng 4.5 để đánh giá giao tiếp TCP/gRPC, Kafka và event boundary.
- Dùng Hình 5.1-5.5 và Bảng 5.1 để kết luận về các flow đã hiện thực, thay vì viết claim mới không có trong Chương 5.
- Không dùng numbering cũ của Bảng 4.3/4.4 hoặc giả định cũ rằng Chương 5 còn bảng shared libraries.

### 1.2. Audit partial work trước khi giữ lại

Do Plan B từng bị khởi động trong một session song song rồi dừng, mọi thay đổi hiện có ở `06-danh-gia.tex` và `07-ket-luan-va-huong-phat-trien.tex` phải được đọc như bản nháp cần audit. Không được coi chúng là completed state chỉ vì file đã có nội dung.

Trước khi tiếp tục, bắt buộc:

- Đọc nội dung hiện tại của `06-danh-gia.tex` và `07-ket-luan-va-huong-phat-trien.tex`.
- Xem `git diff --` cho hai file này để biết phần nào là partial work so với baseline.
- Đối chiếu từng phần với mục 3, mục 4 và checkpoints của plan này.
- Giữ lại đoạn đã khớp Plan A/Plan B và có evidence rõ.
- Sửa hoặc loại bỏ đoạn overclaim, dùng thuật ngữ cũ, sai numbering, mở claim mới ở Chương 7 hoặc coi production/pilot là đã xong khi chưa có artifact thật.
- Sau audit, mới được đánh dấu Checkpoint D/F là đã thực hiện.

## 2. Nguyên tắc kiểm chứng luận điểm microservices

Không dùng benchmark so sánh microservices với monolith làm bằng chứng chính nếu không có baseline monolith tương đương về:

- business rule,
- database,
- caching,
- auth,
- payment,
- KDS,
- deployment resource,
- dữ liệu và điều kiện đo.

Nếu không có baseline công bằng, so sánh latency/throughput với monolith sẽ dễ bị phản biện.

Luận điểm chính nên được chứng minh bằng:

- **Service boundary và data ownership:** service nào sở hữu dữ liệu nào; không cross-service database access.
- **Flow xuyên dịch vụ:** QR/session/cart/order, staff confirm/stock deduction, KDS, payment, SaaS onboarding, reporting entitlement.
- **Giao tiếp đúng vai trò:** TCP/gRPC cho request cần phản hồi tức thời, Kafka cho domain event bất đồng bộ, WebSocket là hint/refetch.
- **Consistency, idempotency và Saga:** cart version, submit idempotency, stock compensation, duplicate/underpaid webhook, Order Confirm Saga, SaaS Onboarding Mini-Saga.
- **Tenant/RBAC/entitlement:** tenant isolation, guard/permission, reporting theo gói dịch vụ, phân biệt Owner/Manager với Super Admin.
- **Production/pilot evidence:** domain/HTTPS, service health, smoke test, public webhook callback, log tối thiểu, trạng thái dữ liệu sau một flow demo.

Nếu có số đo runtime, chỉ dùng như số đo vận hành thử nghiệm/pilot evidence:

- thời gian staff confirm -> KDS nhận ticket,
- thời gian webhook -> bill paid,
- p95/p99 một số API chính,
- tỉ lệ smoke test pass,
- trạng thái health check,
- số service/container chạy được.

Không dùng số đo này để claim microservices nhanh hơn monolith.

## 3. Quyết định nội dung Chương 6

Tên đề xuất ưu tiên:

- `Kiểm chứng và đánh giá hệ thống QRTable`

### 3.1. Cấu trúc đề xuất

1. `6.1. Phương pháp đánh giá và mức bằng chứng`

- Đổi `Evaluation claim policy` thành `Chính sách diễn đạt kết luận`.
- Giữ bảng claim policy nhưng Việt hóa heading/caption.
- Phân loại rõ: đã kiểm chứng, kiểm chứng một phần, giới hạn/hướng phát triển.

2. `6.2. Truy vết yêu cầu và kết quả kiểm thử`

- Việt hóa `Requirement traceability`.
- Cập nhật Dashboard/Reporting.
- Thêm Production/Pilot ở mức "khung chờ evidence" trước; sau deploy thì cập nhật bằng artifact thật.

3. `6.3. Kiểm chứng các luồng nghiệp vụ cốt lõi`

- Gom QR/session/cart/order/KDS/payment/SaaS/reporting.
- Bảng functional validation cần có Dashboard/Reporting.

4. `6.4. Kiểm chứng Saga, idempotency và tính nhất quán`

- Nâng Saga thành mục rõ hơn.
- Chỉ claim hai Saga đại diện: Order Confirm Saga và SaaS Onboarding Mini-Saga.
- Không claim full Saga hardening, exactly-once, CDC/Debezium, durable saga state.

5. `6.5. Kiểm chứng phân quyền, cô lập tenant và entitlement theo gói`

- RBAC, tenant isolation, reporting entitlement.
- Phân biệt Owner/Manager tenant view và Super Admin platform view.

6. `6.6. Đánh giá kiến trúc và khả năng bảo trì`

- Service boundary, data ownership, shared contract, Kafka topic registry, Redis ownership, WebSocket hint/refetch.
- Giữ scenario analysis thay vì số liệu năng suất.

7. `6.7. Đánh giá hiệu năng và khả năng mở rộng ở mức thiết kế`

- Không benchmark với monolith nếu không có baseline tương đương.
- Nếu có số đo pilot, ghi như evidence có giới hạn.
- Đề xuất metric và load-test plan như hướng phát triển.

8. `6.8. Kiểm chứng triển khai production/pilot`

- Viết khung ngắn để chuẩn bị Phase 7.
- Trước khi deploy xong, chỉ ghi phương pháp và artifact sẽ thu thập.
- Sau deploy, cập nhật URL/domain, HTTPS, service health, smoke test, public SePay webhook callback, log tối thiểu, trạng thái dữ liệu.
- Claim an toàn: "đã triển khai/pilot để kiểm chứng khả năng đóng gói và vận hành các dịch vụ chính".
- Không viết "sẵn sàng production" nếu chưa đủ bằng chứng.

9. `6.9. Giới hạn của quá trình đánh giá`

- Nếu Phase 7 chưa có artifact, ghi rõ đang chờ bổ sung minh chứng.
- Sau Phase 7 vẫn ghi giới hạn nếu chưa có stress test, high availability, backup/restore, alert/runbook production-grade.
- Phase 6 Observability chỉ nhắc như nền hỗ trợ hoặc hướng hoàn thiện vận hành.

10. `6.10. Thảo luận kết quả`

- Kết luận QRTable có evidence đáng kể cho core flow.
- Nêu rõ giới hạn về load test, live provider, full-stack tenant gates, production hardening.

### 3.2. Nội dung cần backfill vào Chương 6

Dashboard/Reporting:

- Thêm vào bảng truy vết yêu cầu.
- Thêm vào kiểm chứng chức năng.
- Thêm vào RBAC/tenant/entitlement.
- Phân biệt tenant-level reporting và Super Admin platform analytics.

Database/data ownership:

- Nhắc như bằng chứng kiến trúc trong mục service boundary.
- Không lặp lại toàn bộ schema của Chương 4.
- Dùng các cụm như "quyền sở hữu dữ liệu", "database boundary", "durable state", "runtime projection" khi cần.

Production/Pilot:

- Thêm row chờ artifact trước khi deploy.
- Sau deploy, đổi thành claim đã kiểm chứng chỉ khi có artifact thật.
- Không dùng screenshot local/dev làm production evidence.

Saga/Consistency:

- Order Confirm Saga: staff confirm, stock deduction, compensation, order state.
- SaaS Onboarding Mini-Saga: tenant/subscription/payment settings/user linkage và bù trừ khi lỗi.
- Payment webhook: duplicate/underpaid/idempotency có thể là evidence consistency, nhưng không claim là full Payment Complete Saga nếu chưa có.

## 4. Quyết định nội dung Chương 7

Tên chương có thể giữ:

- `Kết luận và hướng phát triển`

### 4.1. Cấu trúc đề xuất

1. `7.1. Tóm tắt bài toán và hướng tiếp cận`

- Nhắc lại F&B/POS/QR/SaaS/microservices.
- Không mở thêm lý thuyết mới.

2. `7.2. Kết quả đạt được theo mục tiêu đề tài`

- Gắn với mục tiêu Chương 1.
- Gồm QR ordering, POS/KDS/payment, SaaS lifecycle, reporting.
- Viết câu khung cho Phase 7, nhưng chỉ chuyển thành kết quả đã đạt sau khi có production/pilot artifact.

3. `7.3. Đóng góp của đề tài`

- Mô hình nghiệp vụ QRTable.
- Kiến trúc microservices có service boundary.
- Saga đại diện.
- Tenant/RBAC/entitlement.
- Bộ evidence/diagram cho các luồng lõi.

4. `7.4. Hạn chế còn lại`

- Benchmark.
- Live SePay provider automation.
- Full-stack tenant isolation gate.
- High availability.
- Backup/restore.
- Alert/runbook.
- Offline action queue.
- Notification/email.
- Nếu Phase 7 chưa có artifact, production deployment cũng nằm trong hạn chế/hướng phát triển.

5. `7.5. Hướng phát triển`

- Nếu Phase 7 chưa xong: deployment/pilot là hướng hoàn thiện vận hành.
- Nếu Phase 7 đã có pilot: hướng phát triển là hardening production, monitoring runtime proof, alert/runbook, backup/restore, load test, rollback, hardening Saga, notification, offline queue, analytics nâng cao.

### 4.2. Nguyên tắc viết Chương 7

- Không mở ra claim kỹ thuật mới chưa xuất hiện ở Chương 5-6.
- Không biến Chương 7 thành bản tóm tắt mã nguồn.
- Kết luận phải phản ánh đúng mức evidence của Chương 6.
- Nếu chưa có production/pilot artifact, không viết như đã deploy xong.
- Nếu đã có production/pilot artifact, vẫn không claim production-ready nếu thiếu HA/backup/alert/load/runbook.

## 5. Ngôn ngữ Chương 6-7

Ưu tiên tiếng Việt học thuật, giảm tiếng Anh không cần thiết.

Gợi ý thay thế:

| Đang dùng                 | Hướng viết lại                             |
| ------------------------- | ------------------------------------------ |
| evaluation claim policy   | chính sách diễn đạt kết luận               |
| requirement traceability  | truy vết yêu cầu                           |
| functional validation     | kiểm chứng chức năng                       |
| architecture validation   | kiểm chứng kiến trúc                       |
| non-functional evaluation | đánh giá yêu cầu phi chức năng             |
| evidence                  | bằng chứng / minh chứng                    |
| artifact                  | minh chứng / hiện vật kỹ thuật             |
| runtime                   | khi vận hành / thời gian chạy              |
| deployment                | đóng gói triển khai (deployment)           |
| observability             | khả năng quan sát hệ thống (observability) |

Vẫn giữ: `SaaS`, `POS`, `QR`, `microservices`, `BFF`, `Kafka`, `Redis`, `WebSocket`, `OpenTelemetry`, `Prometheus`, `Loki`, `Tempo`, `Grafana`, `Keycloak`, `JWT`, `OIDC`, `RBAC`, `Saga`, `idempotency`, `tenant isolation`, `service boundary`, `contract`, `outbox`, `webhook`, `VietQR`, `SePay`.

## 6. Production/Pilot evidence policy

Trước khi deploy production/pilot xong:

- Dùng ngôn ngữ "sẽ triển khai", "mục tiêu kiểm chứng", "artifact sẽ bổ sung".
- Không claim hệ thống đã vận hành production.
- Không dùng local dev screenshot làm production evidence.

Sau khi deploy production/pilot thật:

- Cập nhật Chương 6 bằng artifact thật.
- Cập nhật Chương 7 bằng claim an toàn.
- Đặt artifact chi tiết ở phụ lục nếu cần.

Evidence tối thiểu nên có:

- BFF, Customer PWA và Management App truy cập được qua domain thật và HTTPS.
- Các service chính chạy được ngoài local dev.
- PostgreSQL, Redis, Kafka và Keycloak được cấu hình cho môi trường deploy.
- SePay webhook có public callback nếu payment live được demo.
- Health check/smoke test pass.
- Một luồng lõi chạy được: `QR -> session/cart -> submit order -> staff confirm -> KDS -> payment`.
- Log tối thiểu để đối chiếu khi demo gặp lỗi.

Ngôn ngữ claim an toàn:

> Hệ thống đã được triển khai trên môi trường production/pilot để kiểm chứng khả năng đóng gói, cấu hình và vận hành các dịch vụ chính.

Không nên viết:

- "Hệ thống đã production-ready."
- "Hệ thống đã chứng minh high availability."
- "Hệ thống đã chịu tải lớn."
- "Observability production-grade đã hoàn chỉnh."

## 7. Checkpoints thực thi

### Checkpoint C - Preflight audit sau Plan A

Việc cần làm:

- Đọc lại output Plan A theo mục 1.1.
- Đọc lại partial work hiện có ở Chương 6-7 theo mục 1.2.
- Ghi nhận rõ phần nào của Chương 6-7 đã khớp plan và phần nào cần sửa tiếp.
- Xác nhận Chương 6-7 đang dùng đúng Bảng 4.3/4.4/4.5, Hình 5.1-5.5 và Bảng 5.1 sau Plan A.

Verification:

- Không còn nhầm Bảng 4.3 là communication matrix hoặc Bảng 4.4 là Kafka registry.
- Không còn nhắc Chương 5 có bảng shared libraries độc lập.
- Không có claim Plan B hoàn tất nếu chưa chạy Checkpoint G.

### Checkpoint D - Refactor Chương 6

Việc cần làm:

- Đổi tên chương.
- Việt hóa tiêu đề/caption của claim policy, traceability, validation.
- Cập nhật functional/NFR/limitation tables cho Dashboard/Reporting.
- Thêm Production/Pilot vào bảng đánh giá ở mức khung chờ evidence.
- Nâng Saga/idempotency/consistency thành mục riêng nếu cần.
- Với Phase 6, chỉ nhắc nhẹ trong giới hạn/hướng phát triển.
- Giữ policy không benchmark nếu chưa đo.

Verification:

- Không có claim production-grade/high availability/stress test.
- Không có benchmark monolith giả.
- Phase 7 chỉ claim sau khi có artifact thật.
- Bảng/chapter build pass, không có citation/reference lỗi.

### Checkpoint E - Thu thập evidence Phase 7

Việc cần làm:

- Lưu URL/domain.
- Lưu ảnh truy cập HTTPS nếu cần.
- Lưu output health check.
- Lưu log rút gọn.
- Lưu kết quả smoke test.
- Chứng minh ít nhất một luồng lõi chạy trên môi trường deploy.
- Ghi rõ những gì chưa có: high availability, backup/restore, load test, alert/runbook, rollback automation.

Verification:

- Có artifact thật trước khi đổi câu chữ sang "đã triển khai/đã kiểm chứng".
- Không dùng screenshot local/dev như production evidence.

### Checkpoint F - Viết Chương 7

Việc cần làm:

- Viết nội dung cho 5 mục của Chương 7.
- Gắn kết quả với mục tiêu đề tài và Chương 6.
- Đưa Phase 7 deployment vào kết quả đạt được chỉ sau khi có production/pilot evidence.
- Không thêm claim mới chưa có trong Chương 5-6.

Verification:

- Chương 7 không mở nội dung kỹ thuật mới.
- Hạn chế và hướng phát triển khớp Chương 6.
- Nếu Phase 7 chưa có artifact thật, vẫn ghi như hướng phát triển/chờ minh chứng.

### Checkpoint G - Citation, build và reader audit

Việc cần làm:

- Kiểm tra citation mới nếu có; không thêm nguồn giả.
- Build LaTeX bằng XeLaTeX/TeX Live hoặc wrapper hiện tại.
- Kiểm tra mục lục, danh mục hình, danh mục bảng, undefined reference/citation.
- Đọc lại PDF quanh Chương 6-7.
- Cập nhật `thesis-workflow-plan.md`.

Verification:

- LaTeX build pass.
- Không có `Undefined citation`, `Reference undefined`, `Overfull` nghiêm trọng do thay đổi mới.

## 8. Câu hỏi phản biện cần tự trả lời

1. Có cần benchmark microservices với monolith để chứng minh kiến trúc đúng không?

- Không nên, trừ khi có baseline monolith tương đương và cùng điều kiện đo.

2. Nếu có số đo hiệu năng thì đưa vào đâu?

- Đưa vào Chương 6 như số đo vận hành thử nghiệm/pilot evidence, không dùng để claim microservices nhanh hơn monolith.

3. Phase 6 Observability có nên đưa vào trọng tâm không?

- Không. Chỉ nhắc như nền hỗ trợ vận hành hoặc hướng hardening.

4. Phase 7 nên nằm ở đâu?

- Chương 6 có mục kiểm chứng production/pilot; Chương 7 nhắc kết quả/hạn chế/hướng phát triển tùy artifact thật.

5. Nếu production/pilot deploy thành công, có được claim production-ready không?

- Không mặc định. Deployment/pilot chỉ chứng minh khả năng đóng gói, cấu hình và vận hành các dịch vụ chính.

6. Chương 7 có được thêm ý mới không?

- Không. Chương 7 kết luận từ Chương 5-6, không mở thêm claim kỹ thuật mới.

## 9. Done criteria

Plan B hoàn tất khi:

- Chương 6 có tên chương/tiêu đề mục tiếng Việt hơn.
- Dashboard/Reporting đã được phản ánh ở Chương 6.
- Chương 6 không yêu cầu benchmark monolith giả.
- Số đo runtime nếu có chỉ được dùng như pilot evidence có giới hạn.
- Phase 6 Observability không lấn vào trọng tâm.
- Phase 7 Production/Pilot có khung ngắn và chỉ claim khi có artifact thật.
- Chương 7 có nội dung thật, khớp với Chương 5-6.
- Không có citation giả.
- LaTeX build pass và `thesis-workflow-plan.md` được cập nhật.
