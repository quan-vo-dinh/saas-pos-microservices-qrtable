# Kế hoạch tăng cường minh chứng trực quan cho Chương 6

> Ngày lập: 2026-06-23.  
> Bản cập nhật: sau phản hồi quyết định của tác giả về Allure, Playwright E2E, RBAC, Nx monorepo và giới hạn deployment.  
> Phạm vi: kế hoạch tư vấn và chốt chiến lược cho Chương 6, chưa sửa file LaTeX chính.  
> Mục tiêu: biến Chương 6 thành một chuỗi lập luận có bằng chứng trực quan, không chỉ là chương tự đánh giá bằng text.

## 0. Ý định chiến lược gốc của tài liệu này

Tài liệu này không chỉ là danh sách ảnh cần chụp. Nó là bản đóng gói lại ý định chiến lược của prompt gốc để AI đọc vào là hiểu ngay:

- Chương 6 đang yếu vì quá nhiều prose và quá ít minh chứng trực quan, nên cần chuyển từ "mô tả bằng chữ" sang "luận điểm có bằng chứng".
- Mục tiêu cuối cùng không phải làm report thành gallery công cụ, mà là làm cho hội đồng thấy QRTable là một hệ thống SaaS POS đa tenant dựa trên microservices, có kiểm chứng qua test, runtime state, access control và giới hạn triển khai.
- Mỗi hình, bảng, log, report hay screenshot chỉ được giữ nếu nó hỗ trợ một luận điểm rõ ràng: traceability, test automation, E2E golden flow, Saga/idempotency, tenant isolation/RBAC, runtime state, maintainability của Nx, hoặc partial deployment.
- Các ảnh quản trị công nghệ không cần chụp đầy đủ một cách máy móc. Chỉ chụp khi màn hình đó chứng minh một claim mà text khó chứng minh hơn, ví dụ: Allure cho test quality, Keycloak cho role mapping, Redis Insight cho projection state, Kafkio cho event visibility, pgAdmin/PostgreSQL cho service-owned state, Nx graph cho boundary/maintainability.
- Nếu một màn hình chỉ "cho đẹp" nhưng không đổi được sức nặng của lập luận, thì không đưa vào chương chính.
- Appendix D cũ không còn nên đứng riêng như một phụ lục độc lập; phần Saga quan trọng phải được kéo vào Chương 6 để luận điểm nằm ngay trong dòng lập luận chính.
- Slide 24-34 của `thesis-defense-slide-builder-script.md` là nguồn cảm hứng về mạch trình bày và loại minh chứng, nhưng Chương 6 của khóa luận phải viết theo giọng học thuật, không sao chép logic slide.

### Nguyên tắc làm chương nổi bật hơn

Chương 6 cần tạo cảm giác hệ thống thật sự nhiều lớp và có chiều sâu, nhưng không được “làm màu” bằng số lượng ảnh. Cách làm nổi bật nên là:

- **Hero evidence trước, ảnh phụ sau**: ưu tiên mỗi luận điểm một hiện vật mạnh nhất thay vì nhiều ảnh na ná nhau.
- **Trình bày theo trục thay đổi trạng thái**: pending -> processing -> served, retry -> replayed, blocked -> full access, local commit -> outbox/event, snapshot cũ -> snapshot mới.
- **Chồng nhiều lớp bằng chứng**: một luận điểm nên có ít nhất hai lớp đối chiếu, ví dụ diagram + test report, hoặc test report + runtime state, hoặc screenshot + terminal output.
- **Ưu tiên artefact có tính biểu diễn hệ thống**: những màn hình cho thấy service boundary, event propagation, projection, compensation, RBAC hoặc maintainability của Nx sẽ đáng giá hơn ảnh giao diện rời rạc.
- **Ảnh phải có vai trò trong lập luận**: caption phải nói rõ ảnh đang chứng minh invariant nào, ranh giới nào, hay cơ chế nào.
- **Phức tạp hóa có kiểm soát**: làm chương nhìn phức tạp hơn bằng cách cho thấy quan hệ giữa nhiều service, nhiều state và nhiều lớp kiểm chứng, không phải bằng cách nhồi thêm ảnh.

Nói ngắn gọn: file này là "prompt chiến lược" cho AI, giúp AI hiểu đích cuối cùng của Chương 6 là chứng minh bằng hiện vật và artifact rằng QRTable không chỉ là POS SaaS bình thường, mà là một hệ thống microservices có ranh giới, có trạng thái vận hành, có kiểm thử, có kiểm chứng và có giới hạn được thừa nhận rõ ràng.

## 1. Hướng chốt sau phản hồi

Hướng mới của Chương 6 là:

1. Đánh giá hệ thống bằng nhiều lớp minh chứng: traceability, automated test, E2E flow, Saga, runtime state và giới hạn triển khai.
2. Không biến Chương 6 thành gallery công cụ, nhưng chấp nhận đưa nhiều ảnh hơn nếu mỗi ảnh gắn với một luận điểm rõ.
3. Lấy **Playwright E2E golden flow** làm bằng chứng trực quan cho luồng QR ordering/POS/KDS realtime.
4. Lấy **Saga + idempotency + runtime state** làm bằng chứng kỹ thuật trọng tâm để chứng minh Microservices.
5. Tạm lược bỏ mục riêng **tenant isolation, RBAC và entitlement** theo phản hồi ngày 2026-06-24; các ảnh tương ứng chỉ giữ như scaffold dự phòng.
6. Dùng **Nx monorepo** như một điểm bám hợp lý cho maintainability, service ownership và project boundary, nhưng không dùng Nx như bằng chứng duy nhất.
7. Không claim production deploy/full observability. Chương 6 chỉ nói về đóng gói, frontend deploy một phần nếu có artifact thật, và giới hạn chưa triển khai full microservice stack vì tài nguyên/chi phí/thời gian.
8. Xóa Phụ lục D như một appendix riêng. Nếu bằng chứng Saga của Phụ lục D vẫn có giá trị, đưa trực tiếp vào mục 6.4; không giữ một phụ lục D riêng trong báo cáo.

Thông điệp cần đặt tới:

> QRTable không chỉ là một ứng dụng POS có giao diện. Hệ thống được kiểm chứng qua luồng E2E, test tự động, Saga, runtime event/projection và phân tích giới hạn triển khai, từ đó chứng minh đúng hướng SaaS POS + QR ordering + Microservices trong phạm vi minh chứng hiện tại.

## 2. Nguồn và cơ sở đã đối chiếu

Đã dùng CodeGraph trước khi audit:

- `codegraph status .`: index up-to-date, 1,229 files, 15,810 nodes, 31,496 edges.
- `codegraph context "Audit QRTable thesis chapter 6..."`: CodeGraph có ích cho entry point/tooling, nhưng Markdown/LaTeX phải đọc trực tiếp bằng filesystem.

Nguồn tài liệu đã đối chiếu:

- `AGENTS.md`
- `docs/graduation-thesis-resources/thesis-workflow-plan.md`
- `docs/graduation-thesis-resources/thesis-evidence-map.md`
- `docs/graduation-thesis-resources/thesis-language-style-audit-report.md`
- `docs/graduation-thesis-resources/chapter-06-evaluation-evidence.md`
- `docs/graduation-thesis-resources/chapter-06-07-evaluation-conclusion-refactor-plan.md`
- `docs/graduation-thesis-resources/thesis-defense-slide-builder-script.md`, đặc biệt slide 24-34
- `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`
- `docs/graduation-thesis-resources/thesis-report/appendices/d-test-evidence.tex`
- `docs/testing/phase-5/traceability-matrix.md`
- `docs/testing/phase-5/phase-5-handoff.md`
- `docs/testing/phase-5/saga-validation-strategy.md`
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-6-observability-plan.md`
- `docs/superpowers/plans/2026-06-06-phase-7-docker-digitalocean-deployment.md`
- `docs/guides/production-deployment-runbook.md`
- `docs/DOC-CODE-ANCHORS.md`

## 3. Quyết định đã chốt

| Câu hỏi                      | Quyết định                                             | Hệ quả với plan                                                                                                                                    |
| ---------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1. Mục tái cấu trúc Chương 6 | A - giữ khung lớn, sắp lại mạch lập luận               | Không viết lại từ đầu, nhưng đổi trọng tâm từng mục.                                                                                               |
| 2. Phụ lục D                 | Bỏ Phụ lục D riêng                                     | Đưa bằng chứng Saga cần thiết vào 6.4, xóa appendix input.                                                                                         |
| 3. Số lượng ảnh              | Theo khuyến nghị có điều chỉnh                         | Chấp nhận nhiều ảnh hơn ở 6.2, 6.3, Saga và runtime state nếu mỗi ảnh gắn với luận điểm rõ.                                                        |
| 4. Ảnh công cụ quản trị      | B có giới hạn, không Grafana                           | Có Keycloak/Kafka/Redis/PostgreSQL/terminal/Allure; không đưa Grafana nếu chưa có artifact thật.                                                   |
| 5. Trọng tâm kỹ thuật        | Saga/idempotency/consistency, nhưng phải phong phú hơn | 6.4 phải có test, runtime state, DB/outbox và câu chuyện consistency.                                                                              |
| 6. Observability/performance | C - không viết như một mục bằng chứng riêng            | Observability/performance chỉ nằm ở giới hạn và hướng phát triển, trừ khi có artifact thật.                                                        |
| 7. Keycloak/RBAC/entitlement | Lược bỏ mục riêng khỏi Chương 6 hiện tại               | Không tính C6-EV-13--C6-EV-16 vào ảnh cần chụp; chỉ mở lại nếu người viết yêu cầu đưa mục này trở lại.                                             |
| 8. UI/luồng sản phẩm         | Dùng Playwright E2E golden flow                        | 6.3 dùng các lát chụp của cùng một Allure detail page cho luồng E2E; ảnh UI nằm trong attachment của log kiểm thử, không phải bộ ảnh demo rời rạc. |
| 9. Traceability snapshot     | A - chốt một số liệu duy nhất                          | Đối chiếu về snapshot canonical, khả năng là 52 / 38 / 9 / 1 / 4 nếu khớp tài liệu mới nhất.                                                       |
| 10. Deployment               | Không deploy full stack                                | 6.8 đổi thành giới hạn triển khai/kiểm chứng cục bộ-public demo hạn chế.                                                                           |

## 4. Mạch Chương 6 đề xuất sau khi chốt

### 6.1. Phương pháp đánh giá và bản đồ minh chứng

Vai trò:

- Đặt khung đánh giá: không chỉ nhìn UI mà nhìn từ requirement, automated test, E2E, runtime state, RBAC/tenant và deployment limitation.
- Giải thích mỗi bằng chứng sẽ chỉ được dùng trong phạm vi kết luận tương ứng.

Nội dung cần có:

- Bảng phân loại bằng chứng: automated test, E2E visual evidence, runtime state, access-control evidence, deployment/package evidence.
- Một đoạn chuyển mạch: Chương 6 không đánh giá QRTable như một app POS đơn lẻ, mà đánh giá theo đúng trục SaaS POS + QR ordering + Microservices.

Ảnh đề xuất:

- Không bắt buộc.
- Nếu muốn có hình, tạo `chapter6-00-evidence-layers.png`: sơ đồ 5 lớp minh chứng, không phải screenshot công cụ.

### 6.2. Truy vết yêu cầu và kết quả kiểm thử

Vai trò:

- Chứng minh việc đánh giá có traceability và automated test, không chỉ là mô tả chủ quan.
- Thêm 2-3 ảnh đại diện cho những nhóm test quan trọng, thay vì chỉ một ảnh summary.

Nội dung cần có:

- Traceability snapshot: tổng số row, covered, partial, implementation gap, deferred.
- Giải thích ngắn các nhóm test quan trọng:
  - Order/Catalog consistency.
  - SaaS onboarding và entitlement.
  - Permission/RBAC matrix.
  - E2E realtime QR -> POS -> KDS -> customer served.
- Nếu số liệu Allure và traceability khác nhau, giải thích chung là hai lớp bằng chứng khác nhau: traceability theo yêu cầu, Allure theo test execution artifact.

Ảnh bắt buộc/nên có:

| ID       | File placeholder                         | Nội dung                                                 | Mục đích                                      |
| -------- | ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------- |
| C6-EV-01 | `chapter6-01-allure-overview.png`        | Allure overview/test summary                             | Cho thấy có report test tổng quan.            |
| C6-EV-02 | `chapter6-02-allure-critical-suites.png` | Allure suites/categories cho các service/flow quan trọng | Cho thấy test không chỉ là smoke test.        |
| C6-EV-03 | `chapter6-03-terminal-test-summary.png`  | Terminal summary của lệnh test đại diện                  | Tạo cảm giác reproducible, có command/output. |

Ghi chú:

- Nếu chỉ được chọn 2 ảnh, ưu tiên Allure overview và Allure/terminal detail cho suite quan trọng.
- Caption cần nói rõ môi trường chạy test và timestamp/artifact date nếu có.

### 6.3. Kiểm chứng luồng QR ordering/POS/KDS bằng Playwright E2E

Đây là thay đổi quan trọng so với bản đề xuất ban đầu. Phương án Playwright E2E tốt hơn contact sheet UI thủ công vì nó chứng minh:

- Luồng chạy qua nhiều frontend: Customer PWA, Management/POS, KDS.
- Có realtime update và reconnect/reload.
- Có kết quả test tự động, duration và step log.
- Ảnh minh họa trong Chương 6 nên là các lát chụp của cùng một Allure detail page; các ảnh UI là attachment sinh ra trong chính test, không phải screenshot demo rời rạc.

Test đại diện:

```text
step-2.7-realtime.spec.ts:31:7
Passed
PWA -> POS -> KDS -> POS serve -> customer SERVED after reconnect + reload keeps snapshot
Duration: 18s 591ms
Project: chromium
```

Mạch nội dung:

1. Customer mở QR landing page với tenant/table/token.
2. Customer vào menu, thêm món, mở cart và đặt món.
3. POS của waiter nhận order từ live orders.
4. KDS xử lý ticket.
5. POS serve và customer reload/reconnect vẫn thấy snapshot `SERVED`.

Ảnh đề xuất cho cùng một luồng:

Lưu ý: C6-EV-04 đến C6-EV-08 là các lát chụp của cùng một trang Allure detail. Không chụp bốn màn hình UI rời rạc rồi đặt cạnh nhau như gallery.

| ID       | File placeholder                                   | Nội dung                                                           | Vị trí trong luồng                                      |
| -------- | -------------------------------------------------- | ------------------------------------------------------------------ | ------------------------------------------------------- |
| C6-EV-04 | `chapter6-04-e2e-playwright-overview.png`          | Lát tổng quan Allure detail của luồng E2E                          | Mở đầu 6.3, chứng minh test passed.                     |
| C6-EV-05 | `chapter6-05-e2e-customer-tracking.png`            | Lát Allure cho chặng khách đặt món và attachment customer tracking | QR ordering evidence trong cùng một Allure log.         |
| C6-EV-06 | `chapter6-06-e2e-pos-live-order-accepted.png`      | Lát Allure cho chặng POS nhận đơn và attachment POS live orders    | POS staff evidence trong cùng một Allure log.           |
| C6-EV-07 | `chapter6-07-e2e-kds-ticket-finished.png`          | Lát Allure cho chặng KDS/POS phục vụ và attachment liên quan       | Kitchen/POS serving evidence trong cùng một Allure log. |
| C6-EV-08 | `chapter6-08-e2e-customer-served-after-reload.png` | Lát Allure cho chặng khách thấy `SERVED` sau reconnect/reload      | Reconnect/reload evidence trong cùng một Allure log.    |

Nhận định về phương án này:

- Nên chọn. Đây là phương án kỹ thuật cao hơn ảnh UI thủ công.
- Cần tránh viết quá đà rằng test này bao phủ toàn bộ hệ thống. Nó là **representative E2E flow**, không phải full acceptance coverage.
- Cần nói rõ nó chạy trong môi trường kiểm chứng/local demo nếu không phải public deployment.
- Nên ghép với 6.6 Kafka/Redis/PostgreSQL để chứng minh microservice runtime, vì E2E frontend một mình chưa chứng minh event boundary.

### 6.4. Kiểm chứng Saga, idempotency và distributed consistency

Đây là mục trọng tâm nhất của Chương 6 về Microservices.

Vai trò:

- Giải thích tại sao Microservices làm phát sinh bài toán consistency: Order không sở hữu stock, Catalog mới là service ghi stock, Payment sở hữu thanh toán, Kitchen là Redis projection.
- Chứng minh hệ thống không chỉ có UI chạy được, mà có cơ chế bảo vệ invariant khi service phối hợp.

Cấu trúc nội dung nên viết:

1. **Vấn đề cần kiểm chứng**  
   Order, Catalog, Kitchen, Payment và SaaS không dùng chung database. Vì vậy, transaction cục bộ không đủ để đảm bảo consistency liên dịch vụ.

2. **Hai Saga đại diện**  
   Order Confirm Saga: bảo vệ stock/order invariant tại mốc xác nhận đơn.  
   SaaS Onboarding Mini-Saga: tạo tenant/subscription/payment setting và xử lý compensation khi lỗi.

3. **Các invariant cần giữ**  
   Stock không bị trừ lặp khi retry.  
   Order state không vượt state machine.  
   Outbox/event chỉ phát sau khi local state hợp lệ.  
   Compensation không làm hư dữ liệu tenant hợp lệ.

4. **Bằng chứng test và runtime**  
   Kết hợp terminal/Allure, DB/outbox, Kafka event và nếu có Redis projection.

5. **Phạm vi kết luận**  
   Đây là evidence cho consistency ở các luồng đại diện, không phải bằng chứng formal verification hay chaos test.

Ảnh đề xuất:

| ID       | File placeholder                              | Nội dung                                                    | Claim                                                        |
| -------- | --------------------------------------------- | ----------------------------------------------------------- | ------------------------------------------------------------ |
| C6-EV-09 | `chapter6-09-order-saga-tests.png`            | Terminal/Allure detail cho Order Confirm Saga               | Order-stock consistency có automated evidence.               |
| C6-EV-10 | `chapter6-10-saas-onboarding-saga-tests.png`  | Terminal/Allure detail cho SaaS Onboarding Mini-Saga        | SaaS lifecycle có compensation/idempotency evidence.         |
| C6-EV-11 | `chapter6-11-postgres-order-outbox-state.png` | PostgreSQL order/outbox/stock state sau luồng confirm       | State được commit local trước khi event/runtime side effect. |
| C6-EV-12 | `chapter6-12-kafka-order-confirmed-event.png` | Kafka/Kafkio message `order.confirmed` hoặc event liên quan | Event boundary được quan sát khi runtime.                    |

Bảng nên có:

| Luồng           | Ranh giới service                          | Rủi ro                                      | Cơ chế                    | Bằng chứng        |
| --------------- | ------------------------------------------ | ------------------------------------------- | ------------------------- | ----------------- |
| Order Confirm   | Order -> Catalog -> Kitchen                | Trừ stock lặp, lost response, stale release | Saga, idempotency, outbox | Test + DB + Kafka |
| SaaS Onboarding | SaaS -> Payment setting/User access nếu có | Tạo tenant dở dang, retry trùng             | Mini-Saga, compensation   | Test + DB         |

### Mục đã lược bỏ: tenant isolation, RBAC và entitlement

Cập nhật 2026-06-24: theo phản hồi của người viết, mục riêng “Cô lập đơn vị thuê bao, RBAC và quyền theo gói” đã được lược bỏ khỏi Chương 6. Vì vậy, các ảnh C6-EV-13--C6-EV-16 không còn là ảnh bắt buộc trong báo cáo chính. Các placeholder có thể giữ lại như scaffold dự phòng, nhưng không cần chụp thủ công và không được tính vào số ảnh đang được LaTeX tham chiếu.

### 6.6. Đối chiếu runtime state của kiến trúc Microservices

Đã duyệt mục này. Mục này nên là phần tạo cảm giác "hệ thống phân tán có thật".

Vai trò:

- Cho hội đồng thấy Kafka/Redis/PostgreSQL không chỉ được liệt kê trong kiến trúc.
- Chứng minh khi luồng E2E/Saga chạy, có event, projection và state thay đổi tại đúng boundary.

Nội dung cần có:

- Kafka: event boundary giữa service.
- Redis: session/cart/KDS projection, không phải database nghiệp vụ chung.
- PostgreSQL: mỗi service sở hữu state riêng/outbox riêng.

Ảnh đề xuất:

| ID       | File placeholder                               | Nội dung                                                                          |
| -------- | ---------------------------------------------- | --------------------------------------------------------------------------------- |
| C6-EV-17 | `chapter6-17-kafkio-topic-event.png`           | Topic/event đại diện: `order.confirmed`, `payment.completed` hoặc event gần flow. |
| C6-EV-18 | `chapter6-18-redisinsight-kds-projection.png`  | Redis Insight hiển thị KDS queue/session/cart key.                                |
| C6-EV-19 | `chapter6-19-postgres-service-owned-state.png` | PostgreSQL/pgAdmin state ở DB/service owner tương ứng.                            |

Cần tránh:

- Chụp list topic/key/table quá nhiều mà không liên quan flow.
- Nói Redis/Kafka là "monitoring" nếu chỉ đang xem runtime state.
- Để lộ session token, QR token, payment secret.

### 6.7. Đánh giá kiến trúc, service ownership và maintainability với Nx monorepo

Phần này có thể là text là chính, nhưng không được viết như tự đánh giá chủ quan. Nên biến nó thành một **criteria-based architecture evaluation**.

Quan điểm:

- Dùng Nx monorepo làm điểm bám là hợp lý, vì QRTable là Nx Monorepo có nhiều apps/libs, phù hợp để nói về maintainability, project boundary, shared libs và affected tasks.
- Tuy nhiên, Nx không tự nó chứng minh Microservices tốt. Nx chỉ chứng minh cách quản lý codebase; service ownership và data ownership phải được chứng minh bằng boundary/service table và quy tắc không cross-database.

Cấu trúc nội dung nên viết:

1. **Tiêu chí đánh giá**  
   Service ownership, data ownership, dependency control, shared library reuse, khả năng build/test theo project.

2. **Bảng đối chiếu QRTable**  
   BFF, Authorizer, Catalog, Order, Kitchen, Payment, SaaS, User-Access; mỗi service sở hữu domain nào, state nào, giao tiếp qua gì.

3. **Vai trò của Nx monorepo**  
   Quản lý nhiều app/service trong một repo.  
   Chia shared libs: dtos, constants, providers, queue, guards, schemas.  
   Hỗ trợ project graph/affected task để tăng maintainability trong môi trường nhiều service.

4. **Giới hạn**  
   Monorepo không thay thế runtime isolation.  
   Cần thêm enforcement/lint rule/CI boundary để mạnh hơn.  
   Nếu chưa có automated boundary check đầy đủ, chỉ claim là có organization foundation.

Ảnh nên có:

| ID       | File placeholder                          | Nội dung                                               | Claim                                              |
| -------- | ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------- |
| C6-EV-20 | `chapter6-20-nx-project-graph.png`        | Nx project graph hoặc sơ đồ apps/libs                  | Monorepo structure giúp quản lý nhiều service/app. |
| C6-EV-21 | `chapter6-21-service-ownership-table.png` | Bảng service/data ownership nếu muốn render thành hình | Service boundary được đánh giá theo tiêu chí rõ.   |

Nếu chỉ chọn một ảnh, chọn Nx project graph. Bảng ownership có thể để dạng LaTeX table.

### 6.8. Giới hạn triển khai và kiểm chứng cục bộ/public demo hạn chế

Mục này cần đổi hướng rõ. Không viết như "production deploy + observability đầy đủ".

Tên mục gợi ý:

- `Giới hạn triển khai và kiểm chứng vận hành`
- Hoặc `Giới hạn triển khai full-stack và bằng chứng đóng gói một phần`

Nội dung nên nói:

- QRTable đã có nền tảng đóng gói/Compose/image và có tài liệu Phase 7/runbook cho triển khai DigitalOcean.
- Nếu có artifact thật, frontend có thể đã deploy trên Vercel và Docker image/build pipeline có thể dùng làm bằng chứng đóng gói.
- Tuy nhiên, full microservice stack gồm PostgreSQL, MongoDB, Redis, Kafka, Keycloak và monitoring chưa được triển khai công khai hoàn chỉnh trong phạm vi khóa luận.
- Lý do: giới hạn tài nguyên thuê máy, chi phí, thời gian khóa luận và độ nặng của stack.
- Vì vậy, deployment full-stack, monitoring/observability và public production smoke được đặt thành hướng phát triển tiếp theo, không phải kết quả đã claim trong Chương 6.

Ảnh có thể đưa nếu có artifact thật:

| ID       | File placeholder                                | Nên đưa?  | Nội dung                                                            |
| -------- | ----------------------------------------------- | --------- | ------------------------------------------------------------------- |
| C6-EV-22 | `chapter6-22-docker-image-or-compose-build.png` | Có nếu có | Docker image/build/compose evidence, chỉ gọi là packaging baseline. |
| C6-EV-23 | `chapter6-23-vercel-frontend-deployment.png`    | Có nếu có | Frontend deploy trên Vercel, chỉ là partial deployment.             |

Không đưa làm bắt buộc:

- Grafana dashboard.
- Public HTTPS smoke.
- Production health của full stack.
- DigitalOcean deployment screenshot.

Nếu không có artifact Docker/Vercel thật, mục 6.8 nên là text + bảng giới hạn, không chèn ảnh giả.

### 6.9. Giới hạn của quá trình đánh giá

Vai trò:

- Gom những thứ không claim: load benchmark, HA, production deployment, full observability, live SePay automation, security audit đầy đủ.
- Không viết như "xin lỗi" mà viết như phạm vi nghiên cứu.

Bảng nên có:

| Giới hạn                    | Tác động                            | Cách giảm rủi ro trong khóa luận                            | Hướng tiếp theo                   |
| --------------------------- | ----------------------------------- | ----------------------------------------------------------- | --------------------------------- |
| Chưa load test              | Chưa kết luận throughput/latency    | Đánh giá scalability theo kiến trúc, không đưa số hiệu năng | Thêm k6/JMeter benchmark          |
| Chưa full production deploy | Chưa chứng minh operability dài hạn | Docker/partial deploy/runbook                               | Hoàn thiện Phase 7                |
| Chưa full observability     | Chưa có SLO/trace/log coverage      | Runtime state và test evidence                              | Grafana/Loki/Tempo dashboard      |
| Live SePay hạn chế          | Chưa claim production payment       | Cash/demo/manual evidence nếu có                            | Human-approved low-value transfer |

### 6.10. Thảo luận kết quả

Cần kết lại bằng ba luận điểm:

1. Về mặt sản phẩm, QRTable chạy được luồng QR ordering/POS/KDS qua Playwright E2E đại diện.
2. Về mặt Microservices, hệ thống có bằng chứng Saga, idempotency, event/projection và service-owned state.
3. Về mặt SaaS, hệ thống có bằng chứng tenant/RBAC/entitlement, nhưng production deployment và observability đầy đủ là phần cần phát triển tiếp.

Không kết luận quá mức:

- Không nói "sẵn sàng production".
- Không nói "đã tối ưu hiệu năng".
- Không nói "observability hoàn chỉnh".
- Không nói "bảo mật đầy đủ" chỉ vì có Keycloak/RBAC.

## 5. Danh sách ảnh tổng hợp theo ưu tiên

### P0 - Nên có

| ID       | Section | File placeholder                                   | Mô tả                                                     |
| -------- | ------- | -------------------------------------------------- | --------------------------------------------------------- |
| C6-EV-01 | 6.2     | `chapter6-01-allure-overview.png`                  | Allure overview.                                          |
| C6-EV-02 | 6.2     | `chapter6-02-allure-critical-suites.png`           | Suite/detail các nhóm test quan trọng.                    |
| C6-EV-04 | 6.3     | `chapter6-04-e2e-playwright-overview.png`          | Allure detail của Playwright E2E golden flow.             |
| C6-EV-05 | 6.3     | `chapter6-05-e2e-customer-tracking.png`            | Lát Allure cho chặng khách đặt món.                       |
| C6-EV-06 | 6.3     | `chapter6-06-e2e-pos-live-order-accepted.png`      | Lát Allure cho chặng POS nhận đơn.                        |
| C6-EV-07 | 6.3     | `chapter6-07-e2e-kds-ticket-finished.png`          | Lát Allure cho chặng KDS/POS phục vụ.                     |
| C6-EV-08 | 6.3     | `chapter6-08-e2e-customer-served-after-reload.png` | Lát Allure cho chặng khách `SERVED` sau reconnect/reload. |
| C6-EV-09 | 6.4     | `chapter6-09-order-saga-tests.png`                 | Order Confirm Saga tests.                                 |
| C6-EV-10 | 6.4     | `chapter6-10-saas-onboarding-saga-tests.png`       | SaaS Onboarding Mini-Saga tests.                          |
| C6-EV-17 | 6.6     | `chapter6-17-kafkio-topic-event.png`               | Kafka event runtime.                                      |
| C6-EV-18 | 6.6     | `chapter6-18-redisinsight-kds-projection.png`      | Redis KDS/session projection.                             |

### P1 - Nên có nếu chụp được sạch

| ID       | Section | File placeholder                                | Mô tả                                       |
| -------- | ------- | ----------------------------------------------- | ------------------------------------------- |
| C6-EV-03 | 6.2     | `chapter6-03-terminal-test-summary.png`         | Terminal summary để tăng tính reproducible. |
| C6-EV-11 | 6.4/6.6 | `chapter6-11-postgres-order-outbox-state.png`   | DB/outbox state.                            |
| C6-EV-12 | 6.4/6.6 | `chapter6-12-kafka-order-confirmed-event.png`   | Kafka event gần với Saga.                   |
| C6-EV-19 | 6.6     | `chapter6-19-postgres-service-owned-state.png`  | State theo service owner.                   |
| C6-EV-20 | 6.7     | `chapter6-20-nx-project-graph.png`              | Nx project graph.                           |
| C6-EV-22 | 6.8     | `chapter6-22-docker-image-or-compose-build.png` | Docker packaging baseline.                  |
| C6-EV-23 | 6.8     | `chapter6-23-vercel-frontend-deployment.png`    | Frontend partial deployment.                |

### P2 - Không đưa vào chương chính nếu không cần

- Grafana, Loki, Tempo dashboard nếu chưa có data/trace thật.
- DigitalOcean/public HTTPS nếu không deploy.
- Prometheus target raw.
- Keycloak secret/client credentials.
- Redis/Kafka list toàn bộ không gắn với flow.
- Screenshot quá nhiều UI lặp lại từ Chương 5.

## 6. Caption template

Dùng caption theo mẫu để tránh overclaim:

```latex
\caption[Tên ngắn trong danh mục hình]{Ảnh chụp ... trong môi trường kiểm chứng QRTable. Minh chứng này được dùng để đối chiếu ...; không thay thế cho ...}
```

Ví dụ:

```latex
\caption[Kết quả Playwright E2E luồng QR--POS--KDS]{Kết quả Playwright E2E cho luồng PWA -> POS -> KDS -> POS serve -> customer SERVED sau reconnect/reload. Minh chứng này cho thấy luồng realtime đại diện được kiểm chứng tự động trong môi trường demo; nó không thay thế cho load test hoặc production smoke test.}
```

## 7. Cách xử lý Phụ lục D

Quyết định: bỏ Phụ lục D riêng.

Mapping:

| Nội dung cũ                                          | Xử lý mới                                                                                |
| ---------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `\chapter{Minh chứng kiểm thử và khả năng tái hiện}` | Không giữ chapter appendix.                                                              |
| `appendix-d-01-order-saga-tests.png`                 | Đổi/đưa vào 6.4 thành `chapter6-09-order-saga-tests.png` nếu vẫn dùng ảnh này.           |
| `appendix-d-02-saas-onboarding-tests.png`            | Đổi/đưa vào 6.4 thành `chapter6-10-saas-onboarding-saga-tests.png` nếu vẫn dùng ảnh này. |
| `tab:appendix-d-saga-artifact-scope`                 | Rút gọn thành bảng trong 6.4 hoặc bỏ nếu 6.4 đã có bảng mới tốt hơn.                     |
| Ref tới `Phụ lục~\ref{app:test-evidence}`            | Đổi thành ref đến hình/bảng trong 6.4.                                                   |

Thay đổi LaTeX ở phiên sau:

1. Thêm subsection trong `06-danh-gia.tex` ở 6.4.
2. Chuyển nội dung Saga cần thiết từ `appendices/d-test-evidence.tex` vào 6.4.
3. Xóa block appendix trong `undergraduate-theses-report.tex` nếu không còn phụ lục nào:
   - `\appendix`
   - `\renewcommand{\chaptername}{Phụ lục}`
   - `\setcounter{chapter}{3}`
   - `\input{appendices/d-test-evidence}`
4. Build LaTeX và kiểm tra không còn ref/label lỗi.

## 8. Kịch bản thực thi để sửa LaTeX sau khi chụp ảnh

### Checkpoint 0 - Chốt artifact thật

- Tạo/copy ảnh vào đúng thư mục figure của thesis.
- Đổi filename theo danh sách P0/P1.
- Che secret/token/email nếu cần.
- Ghi lại test command/date nếu report cần timestamp.

### Checkpoint 1 - Resync số liệu traceability

- Đối chiếu `docs/phases/phase-5-7-finalization.md`, `docs/testing/phase-5/traceability-matrix.md`, `docs/testing/phase-5/phase-5-handoff.md`.
- Chốt một snapshot duy nhất. Khả năng cao: `52 total / 38 covered / 9 partial / 1 implementation gap / 4 deferred`.
- Không đưa số permission/role nếu chưa chốt theo current code/artifact.

### Checkpoint 2 - Sửa 6.2 và 6.3

- 6.2: thêm Allure overview, critical suites, terminal summary nếu có.
- 6.3: thay contact sheet UI bằng Playwright E2E golden flow.
- Viết caption rõ: representative E2E, không claim full coverage.

### Checkpoint 3 - Sửa 6.4

- Đưa Saga evidence từ Phụ lục D vào 6.4.
- Thêm bảng invariant/risk/mechanism/evidence.
- Thêm DB/outbox/Kafka nếu có ảnh thật.

### Checkpoint 4 - Sửa runtime state sau khi lược bỏ mục riêng RBAC

- Không chèn Keycloak role mapping, permission smoke, UI blocked hoặc UI full access như một mục evidence riêng trong Chương 6 hiện tại.
- Chèn Kafka, Redis và các runtime state còn được dùng trong mạch microservices.
- Mỗi ảnh phải gắn với service boundary, Saga hoặc trạng thái vận hành cụ thể.

### Checkpoint 5 - Sửa 6.7 và 6.8

- 6.7: viết theo criteria-based evaluation, đưa Nx project graph nếu có.
- 6.8: đổi thành giới hạn triển khai/partial deployment; không đưa Grafana/public production nếu không deploy.
- Đưa Docker/Vercel chỉ khi có artifact thật.

### Checkpoint 6 - QA ngôn ngữ và overclaim

- Không viết "production-ready".
- Không viết "observability đầy đủ".
- Không viết "đã tối ưu hiệu năng".
- Không viết "bảo mật đầy đủ" chỉ vì có RBAC/Keycloak.
- Thay "artifact/claim" bằng "minh chứng/luận điểm" trong prose báo cáo nếu cần.

### Checkpoint 7 - Build và verify

- Build LaTeX bằng XeLaTeX/TeX Live.
- Kiểm tra `.toc`, `.lof`, `.lot`.
- Kiểm tra không còn "Phụ lục D".
- Kiểm tra không undefined reference/citation.
- Nếu có thay đổi doc anchor, chạy `pnpm verify:doc-anchors`.
- Cập nhật `thesis-workflow-plan.md` sau khi hoàn tất.

## 9. Acceptance criteria cho plan mới

Chương 6 được xem là đạt khi:

- 6.2 có ít nhất 2 ảnh test/report đại diện, tốt nhất là Allure overview và critical suite/detail.
- 6.3 có Playwright E2E golden flow dưới dạng các lát chụp của cùng một Allure detail page; ảnh UI nằm trong attachment của log kiểm thử, không phải bộ ảnh demo rời rạc.
- 6.4 có Saga evidence trực quan, bảng invariant/risk/mechanism/evidence và không còn Phụ lục D riêng.
- Mục tenant isolation/RBAC/entitlement cũ đã được lược bỏ; C6-EV-13--C6-EV-16 không còn là ảnh bắt buộc.
- Mục runtime state có ít nhất Kafka và Redis runtime evidence; PostgreSQL/outbox chỉ đưa nếu chụp được sạch và còn được LaTeX tham chiếu.
- 6.7 không tự kết luận chủ quan, mà đánh giá theo tiêu chí service ownership/data ownership/project boundary/maintainability; Nx chỉ là một phần của lập luận.
- 6.8 không claim deploy production/full observability; nếu không deploy thì trình bày như giới hạn và hướng phát triển.
- Traceability number khớp snapshot canonical.
- Không có secret/token/email nhạy cảm trong ảnh.

## 10. Câu hỏi phản biện cần chuẩn bị

| Câu hỏi                                                    | Câu trả lời nên hướng tới                                                                                                                                         |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Playwright E2E có chứng minh microservices không?          | Một mình E2E chỉ chứng minh luồng người dùng và realtime representative; microservices được đối chiếu thêm bằng Saga, Kafka, Redis và DB/outbox ở 6.4-6.6.        |
| Tại sao đưa nhiều ảnh công cụ mà không thành gallery?      | Vì mỗi ảnh gắn với một luận điểm: test, Saga, RBAC, event boundary, Redis projection hoặc partial deployment. Ảnh không có claim rõ sẽ không đưa.                 |
| Vì sao bỏ Phụ lục D?                                       | Vì bằng chứng quan trọng cần nằm trong Chương 6 để hội đồng thấy ngay; phụ lục riêng làm giảm sức nặng của phần đánh giá.                                         |
| Nx monorepo có phải bằng chứng microservices không?        | Không. Nx là bằng chứng về cách quản lý codebase và maintainability; microservices boundary phải chứng minh bằng service/data ownership và runtime communication. |
| Không deploy thì đánh giá hạ tầng thế nào?                 | Báo cáo chỉ claim packaging/partial deployment nếu có artifact, còn full-stack public deployment và observability là giới hạn/hướng phát triển tiếp theo.         |
| Không có load test thì có đánh giá scalability được không? | Chỉ đánh giá trên cơ sở kiến trúc và giới hạn kết luận; throughput/latency cần benchmark riêng trong hướng phát triển.                                            |
