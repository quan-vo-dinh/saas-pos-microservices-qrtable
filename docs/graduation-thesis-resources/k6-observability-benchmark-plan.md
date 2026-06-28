# Kế hoạch đo benchmark k6 và bằng chứng observability cho QRTable

> Mục tiêu của tài liệu này là tạo một plan thực thi ngắn gọn để bổ sung số liệu định lượng và bằng chứng vận hành cho Chương 6 của khóa luận QRTable. Đây là tài liệu nội bộ phục vụ triển khai và thu thập evidence; không chép nguyên văn vào báo cáo chính thức.
>
> **Ranh giới quan trọng:** plan này chỉ điều phối việc chuẩn bị, chạy benchmark, thu thập evidence và tạo handoff sau benchmark. Plan này **không** trực tiếp viết lại, chỉnh sửa hoặc chèn hình vào các file LaTeX của báo cáo khóa luận. Phần viết/chỉnh sửa báo cáo phải được tách thành plan riêng sau khi evidence pack thật đã tồn tại.
>
> **Ranh giới screenshot quan trọng:** AI agent không tự chụp màn hình, không tự chọn screenshot thay user, không tự dùng ảnh và không tự dán ảnh vào LaTeX. Agent chỉ được chuẩn bị placeholder, mapping, tên file đề xuất và hướng dẫn thao tác. Human user là người tự mở dashboard/log/trace, tự chụp screenshot, tự đặt file đúng tên và tự thay ảnh vào các placeholder đã được gán sẵn trong LaTeX để render PDF.

## Mục đích cốt lõi cuối cùng của user

Người viết đang xây dựng các tài nguyên, tài liệu và hiện vật cần thiết cho khóa luận tốt nghiệp QRTable trong repo hiện tại. Repo có hai nhóm tài liệu riêng: tài liệu kỹ thuật nội bộ mô tả kiến trúc, phase triển khai, service boundaries, API, database, observability, deployment; và tài liệu phục vụ báo cáo tốt nghiệp, gồm các file LaTeX render ra PDF chính thức. Kế hoạch này thuộc nhóm thứ hai nhưng phải bám chặt vào nhóm thứ nhất, vì nội dung báo cáo chỉ thuyết phục khi được chống lưng bằng source code, phase docs, metric, log, trace, dashboard và kết quả chạy thật.

Đích cuối cùng không phải chỉ là tạo thêm một file k6 hoặc thêm vài ảnh Grafana. Mục tiêu cốt lõi là củng cố đề tài khóa luận nói chung và đặc biệt là Chương 6/báo cáo khóa luận nói riêng bằng bằng chứng thực nghiệm có số liệu. Người viết không muốn phần đánh giá hệ thống chỉ dừng ở kiểm thử chức năng hoặc kết quả pass/fail thông thường. Phần đánh giá cần có một lớp định lượng: thời gian phản hồi, throughput, error rate, độ ổn định khi có tải đại diện, trace giữa các service, log theo request/session/order, metric theo service hoặc theo luồng nghiệp vụ, cùng dashboard và biểu đồ đủ rõ để hội đồng thấy hệ thống đã được kiểm chứng dưới góc nhìn vận hành thực tế hơn.

Ý nghĩa học thuật và trình bày của phần này là làm cho khóa luận minh bạch hơn, mạnh hơn và thuyết phục hơn bằng dữ liệu thực nghiệm. Khi hội đồng đọc báo cáo hoặc xem phần trình bày, họ nên nhìn thấy bằng chứng trực quan về cách QRTable phản hồi khi có tải, service nào xử lý mất nhiều thời gian, request đi qua những thành phần nào, lỗi có thể được truy vết ra sao và trạng thái hệ thống được giám sát như thế nào. Điều này giúp chứng minh QRTable không chỉ chạy đúng nghiệp vụ, mà còn có khả năng đo lường, giám sát và truy vết trong bối cảnh kiến trúc microservices.

Phạm vi phải thực tế vì thời gian còn hạn chế. Không cần benchmark quá nhiều luồng, không cần tạo cảm giác phức tạp hình thức, và không cần bao phủ toàn bộ API surface. Agent thực thi nên chọn các luồng cốt lõi hoặc có giá trị chứng minh cao nhất cho khóa luận: public/read baseline, QR/session/menu/cart/order, và một pulse nhỏ cho Order Confirm -> KDS/observability. Ưu tiên ít kịch bản nhưng dữ liệu sạch, dễ giải thích, có dashboard/log/trace đi kèm, hơn là nhiều kịch bản nhưng nhiễu và khó bảo vệ.

Kế hoạch này chọn k6 làm công cụ tạo tải/benchmark và tận dụng observability stack đã xây dựng ở Phase 6: Grafana, Prometheus, Loki, Promtail, Tempo và OpenTelemetry. Kết quả mong muốn là một evidence pack làm input cho plan viết/chỉnh sửa Chương 6 sau khi chạy thật: summary JSON/Markdown từ k6, dashboard metrics, ảnh Grafana, log Loki, trace Tempo và phần diễn giải giới hạn. Không được tự tạo số liệu, không dùng screenshot placeholder, không claim production-ready, high availability, stress test lớn hoặc microservices nhanh hơn monolith. Mọi kết luận phải gắn với môi trường chạy, cấu hình tải, seed dữ liệu và bằng chứng thật đã thu được.

## Rules từ prompt gốc

Agent thực thi plan này phải giữ nguyên các rule dưới đây. Đây là phần truyền lại prompt gốc của người viết để tránh agent sau chỉ nhìn task kỹ thuật mà quên mục tiêu khóa luận.

### Bắt buộc trước khi chỉnh sửa

- Dùng **CodeGraph first** để hiểu trạng thái codebase QRTable hiện tại trước khi chỉnh file, tạo benchmark script hoặc sửa tài liệu.
- Đọc và follow `AGENTS.md` ở root repo.
- Đọc các tài liệu khóa luận/canonical liên quan trước khi thay đổi claim trong báo cáo:
  - `docs/README.md`
  - `docs/DOC-CODE-ANCHORS.md`
  - `docs/phases/`
  - `docs/graduation-thesis-resources/`
  - `docs/graduation-thesis-resources/thesis-workflow-plan.md`
  - `docs/graduation-thesis-resources/thesis-evidence-map.md`
  - các file LaTeX trong `docs/graduation-thesis-resources/thesis-report/`
  - các file Mermaid `.mmd` liên quan nếu thêm/sửa hình
- Nếu hỏi hoặc dùng library/framework/SDK/CLI/cloud service, dùng `ctx7` theo rule trong `AGENTS.md` trước khi trả lời hoặc implement. Với k6/Grafana/OpenTelemetry, ưu tiên docs chính thức qua Context7.

### Phân biệt đúng hai nhóm tài liệu trong repo

- **Tài liệu kỹ thuật nội bộ của dự án:** nằm chủ yếu trong `docs/`, `docs/phases/`, `docs/guides/`, `docs/testing/`, mô tả kiến trúc, phase triển khai, quyết định kỹ thuật, service boundaries, API, database, observability, deployment.
- **Tài liệu phục vụ khóa luận tốt nghiệp:** nằm trong `docs/graduation-thesis-resources/`, gồm workflow, evidence map, artifact backlog, LaTeX report, slide/deck, Mermaid diagram, screenshot/evidence guide.
- Benchmark/evidence phải bám vào tài liệu kỹ thuật nội bộ và source code thật, nhưng output cuối cùng phải phục vụ nhóm tài liệu khóa luận. Không để tài liệu nội bộ kiểu audit/checklist chảy nguyên văn vào báo cáo chính thức.

### Rule về mục tiêu benchmark

- Benchmark không phải mục tiêu tự thân. Benchmark là phương tiện để làm Chương 6 có bằng chứng định lượng, biểu đồ và dấu vết vận hành.
- Chọn các luồng **cốt lõi, quan trọng, dễ giải thích và có ích nhất cho báo cáo**, không cover quá nhiều.
- Ưu tiên các luồng chứng minh được chất QRTable microservices:
  - public/read baseline: health, tenant resolve, public menu, QR invalid path;
  - customer QR ordering: join session, menu, cart, submit order, list orders;
  - observability pulse: Order Confirm -> Catalog/Kafka/Kitchen/KDS nếu auth/token đủ ổn định.
- Không biến plan thành một bộ stress test lớn hoặc performance lab phức tạp. Người viết không còn nhiều thời gian; mục tiêu là đủ mạnh, đủ thuyết phục, có số liệu thật và dễ bảo vệ trước hội đồng.

### Rule về evidence và claim

- Không tự tạo benchmark number, throughput, latency, error rate hoặc dashboard result nếu chưa chạy thật.
- Không dùng screenshot placeholder làm bằng chứng.
- AI agent không tự chụp screenshot và không tự dán screenshot vào LaTeX. Screenshot evidence là trách nhiệm của human user, thực hiện theo file hướng dẫn sau benchmark.
- Không claim hệ thống đã production-ready, high availability, stress test lớn, observability production-grade hoặc microservices nhanh hơn monolith.
- Nếu có số liệu, luôn ghi rõ:
  - môi trường chạy;
  - thời điểm chạy;
  - cấu hình tải/VU/duration;
  - seed/dữ liệu dùng để test;
  - kịch bản đo;
  - giới hạn của kết luận.
- Mỗi hình/dashboard/log/trace đưa vào evidence pack phải gắn với một luận điểm cụ thể trong Chương 6. Không chụp tràn lan UI công cụ chỉ để làm đẹp.
- Nếu ở một lượt làm việc riêng sau này cập nhật `06-danh-gia.tex`, trước đó phải có evidence pack thật gồm ít nhất k6 summary, Prometheus/Grafana metrics, Loki log hoặc Tempo trace đại diện.

### Rule về phạm vi kỹ thuật

- Dùng k6 làm công cụ tạo tải và đo benchmark.
- Dùng observability stack Phase 6 đã có: Grafana, Prometheus, Loki, Promtail, Tempo, OpenTelemetry.
- Không thêm công nghệ mới nếu chỉ để làm biểu diễn.
- Không benchmark live SePay hoặc external provider nếu không có credential, callback public và policy bảo mật rõ ràng.
- Không benchmark full public production nếu người viết chưa chốt deploy full stack.
- Không làm benchmark ghi/mutation nhiều VU trên cùng một bàn/session nếu chưa kiểm soát reseed, idempotency key và dữ liệu fixture.

### Rule về output cuối của plan này

- Output trước mắt là plan và handoff thực thi benchmark, không phải số liệu.
- Phạm vi thực thi của plan này dừng ở benchmark/evidence/handoff. Agent thực thi không được sửa trực tiếp `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex` hoặc các chapter LaTeX khác trong cùng lượt chạy plan này.
- Nếu cần chuẩn bị cho báo cáo, agent chỉ được tạo placeholder/mapping/naming convention trong file writing plan. Việc chụp screenshot thật, lưu ảnh thật, thay ảnh vào placeholder và render PDF cuối là thao tác của human user.
- Output sau khi thực thi benchmark phải là một evidence pack có cấu trúc, ví dụ:
  - `summary.json` từ k6;
  - `summary.md` diễn giải số liệu;
  - screenshot Grafana/Prometheus;
  - screenshot/query Loki;
  - screenshot Tempo trace đại diện;
  - ghi chú môi trường và giới hạn.
- Sau khi evidence pack tồn tại, agent thực thi phải tạo thêm đúng 2 file handoff mới, rồi dừng lại:
  - `docs/graduation-thesis-resources/k6-observability-report-writing-plan.md`: plan riêng cho việc viết/chỉnh sửa nội dung báo cáo LaTeX sau benchmark.
  - `docs/graduation-thesis-resources/k6-observability-human-capture-guide.md`: hướng dẫn thao tác cho human user chạy lệnh, setup màn hình và chụp ảnh evidence để thay vào placeholder mà file writing plan đã định sẵn.
- Hai file handoff trên chỉ là kế hoạch/hướng dẫn cho bước tiếp theo. Không được thực hiện tiếp việc chỉnh `06-danh-gia.tex`, không tự chụp screenshot, không tự dùng ảnh, không chèn screenshot vào LaTeX, không cập nhật slide, và không claim rằng báo cáo đã được cập nhật nếu mới chỉ tạo handoff.
- Chỉ ở một lượt làm việc riêng sau đó, khi người viết yêu cầu rõ ràng, mới dùng file writing plan để cập nhật Chương 6, artifact backlog, workflow hoặc slide.

## 1. Mục tiêu

Tạo một lớp đánh giá định lượng vừa đủ cho QRTable bằng k6 và observability stack đã có trong Phase 6, nhằm trả lời các câu hỏi:

- API chính phản hồi trong khoảng bao lâu ở tải đại diện?
- Throughput và error rate của các luồng đọc/thao tác chính là bao nhiêu?
- Khi có tải, Prometheus/Grafana ghi nhận metric gì theo service/route/TCP pattern?
- Một request/luồng nghiệp vụ có thể được nối qua log và trace như thế nào?
- Các số liệu này đủ mạnh để làm phong phú Chương 6 nhưng không overclaim thành stress test, HA hoặc production-grade benchmark.

## 2. Snapshot trước khi lập plan

### CodeGraph

Đã chạy CodeGraph trước khi đọc sâu tài liệu và source:

```bash
codegraph status .
codegraph context "Plan k6 benchmark and observability evidence for QRTable thesis evaluation using existing Phase 6 logging metrics tracing stack"
codegraph query "observability k6 benchmark metrics tracing logging Grafana Loki Prometheus Tempo OpenTelemetry health metrics dashboard"
```

Kết quả chính:

- Index up to date: 1.232 files, 15.838 nodes, 32.785 edges.
- CodeGraph phủ TypeScript/TSX/JS/Python/YAML/XML; Markdown/LaTeX vẫn phải đọc trực tiếp.
- Entry points liên quan: `libs/observability`, `libs/middlewares/src/lib/logger.middleware.ts`, `/metrics`, trace context helpers.

### Context7

Đã dùng `ctx7` theo `AGENTS.md` cho k6/Grafana:

- Chọn `/grafana/k6-docs` làm nguồn k6 chính.
- Điểm áp dụng: k6 cung cấp `http_req_duration`, `http_reqs`, `http_req_failed`, scenario metrics, `--summary-export`; có thể instrument HTTP bằng W3C trace context và có output OpenTelemetry.
- Với Grafana/observability: dashboard nên gom logs, metrics, traces qua Prometheus, Loki, Tempo, OpenTelemetry; không cần thêm tầng SRE phức tạp.

### Hiện trạng repo

Repo đã có nền tảng tốt:

- `docker-compose.monitoring.yaml` với Grafana, Loki, Promtail, Prometheus, Tempo và service `k6`.
- `docker/monitoring/grafana/dashboards/{system-overview,business-metrics,service-drilldown}.json`.
- Prometheus scrape `/api/v1/metrics` và `/api/metrics`.
- `libs/observability` có logging, health, metrics, trace context, OTel, outbox trace headers.
- Metrics hiện có: `qrtable_http_*`, `qrtable_tcp_*`, `qrtable_orders_submitted_total`, `qrtable_orders_confirmed_total`, `qrtable_kds_tickets_created_total`, `qrtable_kds_sla_warnings_total`.
- `tests/benchmark/load-test.js` đã tồn tại, nhưng hiện chủ yếu là smoke/load nhẹ cho readiness, resolve tenant, QR invalid path và public menu cached.

## 3. Phạm vi được chọn

### P0 - đủ mạnh cho khóa luận

1. **Read-heavy baseline**
   - `GET /api/v1/health/ready`
   - `GET /api/v1/public/tenants/:slug`
   - `GET /api/v1/menu`
   - `POST /api/v1/menu/validate-qr` với invalid token để đo error path an toàn

2. **Customer QR ordering slice**
   - `POST /api/v1/customer/sessions/join`
   - `GET /api/v1/menu`
   - `PATCH /api/v1/customer/cart`
   - `POST /api/v1/customer/orders`
   - `GET /api/v1/customer/orders`

3. **Order Confirm -> KDS observability pulse**
   - Dùng tải rất nhỏ, mục tiêu là trace/log/metric, không phải throughput.
   - Staff token đưa qua env `STAFF_TOKEN` hoặc chuẩn bị bằng helper riêng trước khi chạy.
   - `GET /api/v1/admin/orders?status=PENDING`
   - `POST /api/v1/admin/orders/:id/confirm`
   - `GET /api/v1/admin/kds/queue`

### P1 - chỉ làm nếu còn thời gian

- Management reporting read benchmark với token owner/manager.
- Payment cash/VietQR local mock benchmark.
- k6 trace instrumentation bằng `http-instrumentation-tempo` để trace từ k6 gắn trực tiếp với Tempo.

### Ngoài phạm vi

- Không benchmark live SePay.
- Không benchmark full public production nếu chưa deploy full stack.
- Không so sánh với monolith.
- Không chaos test, HA, autoscaling, Kubernetes, tail sampling hoặc long-term retention.
- Không claim "chịu tải lớn"; chỉ claim "đo tải đại diện trong môi trường local/Phase 6".

## 4. Dữ liệu benchmark

Dùng dev seed cố định để kết quả lặp lại được:

| Trường          | Giá trị                                                 |
| --------------- | ------------------------------------------------------- |
| Tenant slug     | `pho-viet`                                              |
| Tenant ID       | `023772bb-391b-401c-936a-ed7034b69cec`                  |
| Bàn A01         | `11111111-dddd-4111-8111-111111111111`                  |
| Món khả dụng P0 | `11111111-cccc-4111-8111-111111111111`                  |
| QR token        | sinh bằng hash `${tenantId}:${tableKey}:qrtable-dev-qr` |

Trước mỗi benchmark có mutation, chạy reseed:

```bash
pnpm dev:reseed -- --yes
```

Không chạy nhiều VU cùng một bàn nếu script chưa tự cấp session/table riêng, vì sẽ tạo nhiễu trạng thái session/cart.

## 5. Thiết kế kịch bản k6

### Script đề xuất

| File                                      | Mục tiêu                                      | Tải đề xuất                | Output chính                              |
| ----------------------------------------- | --------------------------------------------- | -------------------------- | ----------------------------------------- |
| `tests/benchmark/01-read-baseline.js`     | Readiness + public tenant + menu + invalid QR | 5 -> 15 VU trong 2-3 phút  | p95/p99, error rate, route latency        |
| `tests/benchmark/02-customer-ordering.js` | Join session -> cart -> submit -> list orders | 1 -> 5 VU, chạy sau reseed | latency theo step, order submitted metric |
| `tests/benchmark/03-confirm-kds-pulse.js` | Confirm một số order pending và quan sát KDS  | 1 VU, iteration giới hạn   | order confirmed, KDS ticket, trace/log    |
| `tests/benchmark/README.md`               | Cách chạy, env, cách đọc số liệu              | N/A                        | Handoff cho người viết khóa luận          |

### Threshold gợi ý ban đầu

Các threshold chỉ là guardrail để k6 fail khi môi trường quá bất thường, không phải cam kết SLO:

```js
thresholds: {
  http_req_failed: ['rate<0.05'],
  'http_req_duration{scenario:read_baseline}': ['p(95)<500', 'p(99)<1200'],
  'http_req_duration{scenario:customer_ordering}': ['p(95)<1200', 'p(99)<2500'],
}
```

Với scenario có error path chủ đích, dùng `check()` theo status mong đợi và tag riêng để không làm bẩn error rate của happy path.

## 6. Observability evidence cần thu

### k6 output

- Terminal summary.
- `--summary-export` JSON.
- `summary.md` rút gọn: số request, duration, p50/p95/p99, throughput, error rate, checks pass rate, bối cảnh máy chạy.

Lưu đề xuất:

```text
docs/graduation-thesis-resources/benchmark-results/YYYY-MM-DD-local-k6/
├── README.md
├── 01-read-baseline-summary.json
├── 02-customer-ordering-summary.json
├── 03-confirm-kds-pulse-summary.json
└── screenshots/
```

### Prometheus/Grafana

Panel hoặc query cần chụp:

```promql
sum(rate(qrtable_http_requests_total[5m])) by (service, route, status)
histogram_quantile(0.95, sum(rate(qrtable_http_request_duration_seconds_bucket[5m])) by (le, service, route))
sum(rate(qrtable_tcp_requests_total[5m])) by (service, pattern, status)
histogram_quantile(0.95, sum(rate(qrtable_tcp_request_duration_seconds_bucket[5m])) by (le, service, pattern))
increase(qrtable_orders_submitted_total[10m])
increase(qrtable_orders_confirmed_total[10m])
increase(qrtable_kds_tickets_created_total[10m])
```

Ảnh nên chụp:

- System overview dashboard trong lúc k6 chạy.
- BFF/service drilldown: route latency + status code.
- Business metrics: order submitted/confirmed và KDS ticket count.

### Loki logs

Truy vấn gợi ý:

```logql
{compose_project=~"qrtable.*"} |= "\"service\":\"bff\""
{compose_project=~"qrtable.*"} |= "traceId"
{compose_project=~"qrtable.*"} |= "order.confirmed"
```

Ảnh nên chứng minh:

- Log có `service`, `processId` hoặc `traceId`.
- Một request từ k6 có thể nối qua BFF và service phía sau.
- Error path invalid QR được log nhưng không gây crash.

### Tempo traces

Ảnh nên chứng minh:

- Một trace representative qua BFF -> Order -> Catalog.
- Nếu confirm/KDS chạy được: trace hoặc log tương quan với `order.confirmed` và Kitchen consumer.
- Không cần chứng minh tất cả request đều có trace; chỉ cần một trace rõ, giải thích được.

## 7. Cách chạy dự kiến

### Preflight

```bash
codegraph status .
pnpm dev:reseed -- --yes
docker compose -f docker-compose.infra.yaml up -d
docker compose -f docker-compose.monitoring.yaml up -d
pnpm dev:bff-order
```

Nếu cần full pulse Confirm/KDS:

```bash
pnpm dev --projects=bff,order,catalog,kitchen,saas,authorizer,user-access
```

Verify trước benchmark:

```bash
curl -fsS http://localhost:3300/api/v1/health/ready
curl -fsS http://localhost:3300/api/v1/metrics | head
curl -fsS http://localhost:3001/api/health
```

### Chạy k6 local

```bash
k6 run --summary-export docs/graduation-thesis-resources/benchmark-results/YYYY-MM-DD-local-k6/01-read-baseline-summary.json tests/benchmark/01-read-baseline.js
k6 run --summary-export docs/graduation-thesis-resources/benchmark-results/YYYY-MM-DD-local-k6/02-customer-ordering-summary.json tests/benchmark/02-customer-ordering.js
```

### Chạy k6 qua Docker Compose

```bash
docker compose -f docker-compose.monitoring.yaml --profile benchmark run --rm k6
```

Sau khi tách script, compose nên nhận env `K6_SCRIPT` hoặc đổi command để chọn script cụ thể.

## 8. Task list

- [ ] Task 1: Chuẩn hóa benchmark scaffold.
      Verify: `tests/benchmark/README.md` mô tả env, seed, lệnh chạy và policy không overclaim.
- [ ] Task 2: Tách `load-test.js` thành `01-read-baseline.js`.
      Verify: k6 chạy pass với `BASE_URL=http://localhost:3300`.
- [ ] Task 3: Thêm `02-customer-ordering.js` dùng seed A01 và idempotency key theo iteration.
      Verify: sau reseed, script tạo order, `qrtable_orders_submitted_total` tăng.
- [ ] Task 4: Thêm `03-confirm-kds-pulse.js` hoặc handoff nếu auth token chưa ổn định.
      Verify: `qrtable_orders_confirmed_total` và `qrtable_kds_tickets_created_total` tăng trong Prometheus.
- [ ] Task 5: Cập nhật `docker-compose.monitoring.yaml` để chọn script k6 linh hoạt.
      Verify: `docker compose ... --profile benchmark run --rm k6` chạy được script được chọn.
- [ ] Task 6: Thêm result summarizer nếu cần.
      Verify: sinh `summary.md` từ `summary.json` với p95, p99, RPS, failed rate, checks.
- [ ] Task 7: Chạy một benchmark session thật và lưu artifact vào `benchmark-results/`.
      Verify: có summary JSON/Markdown và danh sách screenshot cần human user chụp; nếu user đã tự cung cấp screenshot thật thì kiểm tra không lộ secret, còn nếu chưa thì không tự chụp thay.
- [ ] Task 8: Tạo hoặc cập nhật evidence index trong folder kết quả benchmark session, không sửa LaTeX report.
      Verify: `docs/graduation-thesis-resources/benchmark-results/YYYY-MM-DD-local-k6/README.md` trỏ đúng tới summary/screenshot/log/trace thật, ghi rõ môi trường chạy và giới hạn claim.
- [ ] Task 9: Tạo `docs/graduation-thesis-resources/k6-observability-report-writing-plan.md`.
      Verify: file này là plan riêng cho bước viết/chỉnh sửa báo cáo, có mapping từ evidence thật sang section/placeholder LaTeX và tên file screenshot đề xuất, nhưng chưa thay đổi `06-danh-gia.tex` và chưa dán ảnh.
- [ ] Task 10: Tạo `docs/graduation-thesis-resources/k6-observability-human-capture-guide.md`.
      Verify: file này hướng dẫn human user setup, chạy lệnh, mở Grafana/Loki/Tempo, chụp đúng ảnh cần thiết, đặt tên file đúng convention, tự thay ảnh vào placeholder đã gán sẵn trong LaTeX và biết ảnh nào thay cho placeholder nào.

## 9. Cách đưa vào khóa luận

Phần này chỉ là input cho file `k6-observability-report-writing-plan.md` sau benchmark, không phải task chỉnh LaTeX trong plan hiện tại.

Nếu benchmark chạy thành công, file writing plan có thể đề xuất nâng mục 6.8 từ "chưa có số liệu định lượng" thành:

- "Đề tài đã thực hiện một phiên đo tải đại diện trên môi trường local/Phase 6".
- Nêu bảng ngắn gồm: scenario, VU/duration, request count, throughput, p95, p99, failed rate.
- Chèn 2-4 hình: k6 summary, Grafana latency/throughput, Loki traceId log, Tempo representative trace.
- Giữ giới hạn: số liệu phụ thuộc môi trường chạy, seed, cấu hình máy và không thay thế kiểm chứng production dài hạn.

Không viết:

- "QRTable chịu tải lớn".
- "Hệ thống production-ready".
- "Microservices nhanh hơn monolith".
- "Observability đạt chuẩn sản xuất".
- "Benchmark chứng minh toàn bộ API surface".

### Yêu cầu cho file writing plan sau benchmark

`docs/graduation-thesis-resources/k6-observability-report-writing-plan.md` phải có tối thiểu:

- Mục tiêu chỉnh sửa báo cáo: Chương nào, section nào, luận điểm nào được củng cố bằng benchmark/evidence.
- Bảng mapping evidence: artifact thật -> target LaTeX section -> claim được hỗ trợ -> placeholder hình/bảng -> caption/source note.
- Danh sách file LaTeX dự kiến sửa, ưu tiên `docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex`; chỉ đưa chapter khác nếu có lý do rõ.
- Dàn ý đoạn văn/bảng/hình cần thêm, với placeholder cho số liệu thật nếu chưa quyết định format cuối cùng. Không được bịa số liệu.
- Danh sách placeholder hình cần chuẩn bị, tên file screenshot đề xuất trong `docs/graduation-thesis-resources/thesis-report/assets/screenshots/`, và mapping placeholder -> ảnh human user sẽ tự chụp/tự thay.
- Checklist kiểm chứng trước khi sửa LaTeX: evidence tồn tại, ảnh không lộ secret, caption ghi đúng môi trường, claim không vượt phạm vi local benchmark.

### Yêu cầu cho file human capture guide sau benchmark

`docs/graduation-thesis-resources/k6-observability-human-capture-guide.md` phải có tối thiểu:

- Lệnh setup/reseed/start infra/start monitoring/start services phù hợp với benchmark session đã chạy.
- Lệnh chạy từng k6 script và nơi lưu `summary.json`/`summary.md`.
- URL hoặc đường dẫn mở Grafana, Prometheus, Loki và Tempo trong môi trường local.
- Query Prometheus/LogQL/Tempo cụ thể cần dùng khi chụp.
- Checklist ảnh cần chụp: k6 summary, Grafana throughput/latency, business metrics, Loki traceId log, Tempo representative trace.
- Quy ước đặt tên file screenshot và thư mục lưu.
- Bảng mapping screenshot -> placeholder trong `k6-observability-report-writing-plan.md`.
- Hướng dẫn cách human user tự thay screenshot vào placeholder đã có trong LaTeX và render PDF để kiểm tra.
- Lưu ý cho human user: chọn time range đúng lúc benchmark chạy, refresh dashboard trước khi chụp, che/redact token hoặc thông tin nhạy cảm nếu có.

## 10. Quick Quality Scan

### Solid

- Phase 6 observability stack đã có code/config thật.
- Metrics hiện có đủ để dựng dashboard luận văn mà không thêm nhiều instrumentation mới.
- Dev seed có tenant/table/menu item ổn định.
- k6 đã được đưa vào `docker-compose.monitoring.yaml`.

### Debt Flags

- `tests/benchmark/load-test.js` đang trộn nhiều mục tiêu trong một file và có threshold error rate bị nới vì chứa error path.
- Chưa có result folder chuẩn, summary Markdown và naming convention cho screenshot benchmark.
- Confirm/KDS benchmark cần auth strategy ổn định để không biến k6 thành test login/UI.

### Blockers

- Không đưa số liệu vào Chương 6 trước khi có benchmark run thật.
- Không dùng Grafana screenshot cũ/placeholder làm evidence cho benchmark.
- Không chạy mutation benchmark nhiều VU nếu chưa reseed và chưa kiểm soát session/table/idempotency.
