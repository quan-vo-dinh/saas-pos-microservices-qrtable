# Kế hoạch viết Chương 6 từ k6/observability evidence

> Scope: chỉ dùng sau khi evidence pack thật đã có raw k6 summary, generated Markdown summary và screenshot/log/trace do human user tự chụp. Không dùng file này để tự tạo số liệu hoặc tự chèn ảnh.

## 1. Mục tiêu chỉnh sửa báo cáo

Mục tiêu là củng cố Chương 6 bằng một lát cắt đánh giá định lượng có kiểm soát:

- latency, throughput, failed rate và check pass rate từ k6;
- metric HTTP/TCP và business metric từ Prometheus/Grafana;
- log correlation từ Loki;
- representative trace từ Tempo;
- giới hạn kết luận theo môi trường local/Phase 6.

Target LaTeX chính:

```text
docs/graduation-thesis-resources/thesis-report/chapters/06-danh-gia.tex
```

Chỉ cân nhắc cập nhật thêm backlog/workflow nếu cần ghi trạng thái evidence nội bộ. Không sửa chương khác nếu không có lý do rõ.

## 2. Evidence mapping

| Evidence artifact thật | Target section | Claim được hỗ trợ | Placeholder/table | Caption/source note |
| --- | --- | --- | --- | --- |
| `benchmark-results/2026-06-26-local-k6/01-read-baseline-summary.md` | Mục đánh giá hiệu năng/vận hành trong Chương 6 | API đọc công khai và readiness được đo bằng tải đại diện local | Bảng k6 read baseline | Nguồn: tác giả chạy k6 trên môi trường local QRTable |
| `02-customer-ordering-summary.md` | Mục đánh giá luồng đặt món QR | Luồng customer QR ordering có số đo latency/error/checks ở tải thấp có kiểm soát | Bảng k6 customer ordering | Nêu rõ đã reseed trước khi chạy |
| `03-confirm-kds-pulse-summary.md` | Mục observability/KDS pulse | Luồng confirm order tạo tín hiệu quan sát cho Order/Catalog/Kitchen/KDS | Bảng hoặc đoạn ngắn | Nêu rõ yêu cầu staff JWT và chỉ là pulse 1 VU |
| `screenshots/chapter6-k6-grafana-system-overview-after-fix.png` | Mục observability metrics | Dashboard tổng quan ghi nhận request rate, 5xx error ratio thấp/không có dữ liệu lỗi, latency p95 và business throughput sau khi fix status invalid QR | Hình C6-K6-01 | Nguồn: Grafana System Overview, cùng run window |
| `screenshots/chapter6-k6-grafana-bff-drilldown-after-fix.png` | Mục observability metrics | BFF drilldown ghi nhận route/status/latency; invalid QR được ghi là `403`, không phải `500` | Hình C6-K6-02 | Nguồn: Grafana Service Drilldown service `bff` |
| `screenshots/chapter6-k6-prometheus-http-route-status.png` | Mục observability metrics | Prometheus ghi nhận HTTP request rate theo route/status; invalid QR được ghi là `403`, không phải `500` | Hình C6-K6-03 | Nguồn: Prometheus query sau khi sửa HTTP metrics interceptor |
| `screenshots/chapter6-k6-grafana-business-metrics.png` | Mục business metrics | Dashboard thể hiện order submitted/confirmed và KDS ticket tăng trong run window | Hình C6-K6-04 | Nguồn: Grafana Business Metrics, cùng time range benchmark |
| `screenshots/chapter6-k6-prometheus-business-counters.png` | Mục business metrics | Counter `orders_submitted`, `orders_confirmed`, `kds_tickets_created` tăng theo số lượng đo được | Hình C6-K6-05 | Nguồn: Prometheus `increase(...[5m])`, dùng như bằng chứng định lượng bổ sung |
| `screenshots/chapter6-k6-tempo-invalid-qr-trace.png` | Mục distributed tracing | Một trace đại diện cho đường đi BFF -> SaaS/Catalog và error path invalid QR | Hình C6-K6-06 | Không claim tất cả request đều có trace; giải thích đây là business error path |
| `screenshots/chapter6-k6-loki-traceid-log.png` | Mục log correlation optional | Log có service/processId/traceId đủ để truy vết request nếu Promtail thu được app logs | Hình optional | Chỉ dùng nếu có log app thật; không dùng Loki monitoring/internal logs làm bằng chứng app |

## 3. Nội dung dự kiến thêm vào Chương 6

### Bảng benchmark

Tạo một bảng ngắn gồm:

| Scenario | Load config | Requests | RPS | p95 | p99 | Failed rate | Checks |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Read baseline | lấy từ run thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật |
| Customer ordering | lấy từ run thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật |
| Confirm/KDS pulse | lấy từ run thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật | lấy từ summary thật |

Không tự điền số liệu nếu summary chưa tồn tại.

### Đoạn diễn giải an toàn

Viết theo hướng:

- "Đề tài thực hiện một phiên đo tải đại diện trên môi trường local/Phase 6."
- "Mục tiêu là quan sát latency, failed rate và tín hiệu vận hành, không phải stress test quy mô lớn."
- "Kết quả phụ thuộc cấu hình máy, Docker runtime, seed dữ liệu và cấu hình VU/duration."
- "Các hình Grafana/Loki/Tempo minh họa khả năng quan sát và truy vết khi hệ thống có tải."

Tránh viết:

- "QRTable chịu tải lớn."
- "Hệ thống production-ready."
- "Observability đạt chuẩn production."
- "Microservices nhanh hơn monolith."
- "Benchmark bao phủ toàn bộ API surface."

## 4. Placeholder screenshot đề xuất và triage ảnh hiện có

Lưu ảnh thật vào:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
```

### Bộ ảnh nên dùng trong báo cáo chính

Các ảnh nguồn hiện đã được gom trong evidence pack:

```text
docs/graduation-thesis-resources/benchmark-results/2026-06-26-local-k6/screenshots/
```

AI thực thi plan chỉ copy/rename các ảnh có quyết định **Giữ** sang:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/
```

| Placeholder | File ảnh trong report | Ảnh nguồn trong evidence pack | Quyết định | Lý do chọn | Ghi chú caption |
| --- | --- | --- | --- | --- | --- |
| C6-K6-01 | `chapter6-k6-grafana-system-overview-after-fix.png` | `screenshots/Screenshot 2026-06-27 at 03.18.12.png` | Giữ | Dashboard tổng quan tốt nhất sau khi fix: HTTP rate rõ, HTTP error ratio không còn spike 5xx, p95 thấp, service scrape `UP` | Dùng làm hình mở đầu phần observability benchmark |
| C6-K6-02 | `chapter6-k6-grafana-bff-drilldown-after-fix.png` | `screenshots/Screenshot 2026-06-27 at 03.19.13.png` | Giữ | BFF drilldown sau fix, legend có `POST /api/v1/menu/validate-qr 403` và không còn `500`; latency p95 rõ | Caption chỉ nói về HTTP route/status và HTTP latency của BFF; không dùng panel TCP `No data` để kết luận |
| C6-K6-03 | `chapter6-k6-prometheus-http-route-status.png` | `screenshots/Screenshot 2026-06-27 at 03.01.59.png` | Giữ | Prometheus table rõ nhất cho HTTP rate theo route/status sau khi fix: `/api/v1/menu/validate-qr` là `403`, các luồng chính là `200/201` | Dùng để đối chiếu số; không gọi `403` là lỗi hệ thống |
| C6-K6-04 | `chapter6-k6-grafana-business-metrics.png` | `screenshots/Screenshot 2026-06-26 at 23.17.37.png` | Giữ | Dashboard trực quan nhất: submitted, confirmed, throughput và KDS tickets đều có tín hiệu | Dùng làm hình business metrics chính |
| C6-K6-05 | `chapter6-k6-prometheus-business-counters.png` | `screenshots/Screenshot 2026-06-27 at 03.02.58.png` | Giữ | Có số định lượng rõ: submitted khoảng 6, confirmed khoảng 1, KDS ticket khoảng 1 trong cửa sổ 5 phút | Dùng bổ sung cho C6-K6-04 nếu cần số cụ thể trong hình |
| C6-K6-06 | `chapter6-k6-tempo-invalid-qr-trace.png` | `screenshots/Screenshot 2026-06-26 at 23.04.28.png` | Giữ, nhưng caption cẩn thận | Trace rõ BFF -> SaaS/Catalog cho `POST /api/v1/menu/validate-qr`, có span đỏ thể hiện business error path | Caption phải ghi rõ đây là invalid QR path, không phải lỗi crash |

### Ảnh chỉ dùng làm phụ lục hoặc không dùng

| Ảnh | Quyết định | Lý do |
| --- | --- | --- |
| `screenshots/Screenshot 2026-06-27 at 03.01.40.png` | Backup | Cùng nội dung với `03.01.59`; chỉ dùng nếu ảnh `03.01.59` bị mờ/crop xấu |
| `screenshots/Screenshot 2026-06-27 at 03.02.11.png` | Backup | HTTP p95 table có số latency rõ, nhưng kém trực quan hơn dashboard; dùng nếu muốn thêm bảng latency Prometheus |
| `screenshots/Screenshot 2026-06-27 at 03.02.30.png` | Backup/cẩn thận | TCP rate table có `table.validate_qr_token` status `error`; đúng ở tầng TCP business error nhưng dễ làm hội đồng hiểu nhầm nếu không giải thích |
| `screenshots/Screenshot 2026-06-27 at 03.02.47.png` | Backup | TCP p95 table có số latency theo pattern, nhưng quá chi tiết cho báo cáo chính |
| `screenshots/Screenshot 2026-06-26 at 23.00.07.png` | Backup | Service drilldown Catalog tốt về TCP pattern, nhưng là ảnh cũ trước khi fix HTTP status |
| `screenshots/Screenshot 2026-06-26 at 23.00.36.png` | Không ưu tiên | Kitchen chỉ có một spike nhỏ, ít giá trị nếu đã dùng Business Metrics |
| `screenshots/Screenshot 2026-06-26 at 23.00.53.png` | Backup | Order service drilldown có TCP latency, nhưng quá granular và có panel HTTP `No data` |
| `screenshots/Screenshot 2026-06-26 at 23.01.05.png` | Không ưu tiên | SaaS drilldown không trực tiếp hỗ trợ luận điểm k6 chính |
| `screenshots/Screenshot 2026-06-26 at 23.08.17.png` | Không dùng | Business metrics lúc này `confirmed` và KDS ticket chưa có tín hiệu rõ |
| `screenshots/Screenshot 2026-06-26 at 22.53.15.png` | Không dùng | Có `HTTP Error Ratio` khoảng 25% do lỗi metric 500 cũ và có dependency `payment DOWN`, dễ gây hiểu nhầm |
| `screenshots/Screenshot 2026-06-26 at 22.54.15.png` | Không dùng | Cùng vấn đề 5xx ratio cũ; không còn đại diện cho trạng thái sau khi sửa instrumentation |
| `screenshots/Screenshot 2026-06-26 at 22.57.21.png` | Không dùng | Service drilldown cũ còn legend `POST /api/v1/menu/validate-qr 500`; không dùng sau khi đã fix |

### Ảnh còn thiếu hoặc nên chụp lại

| Mức độ | Ảnh cần chụp | Lý do | Tên file đề xuất |
| --- | --- | --- | --- |
| Đã có | Grafana `QRTable System Overview` sau khi restart BFF và chạy lại benchmark | Đã có `screenshots/Screenshot 2026-06-27 at 03.18.12.png`; dùng cho `chapter6-k6-grafana-system-overview-after-fix.png` | Không cần chụp lại |
| Đã có | Grafana `QRTable Service Drilldown` service `bff` sau khi fix | Đã có `screenshots/Screenshot 2026-06-27 at 03.19.13.png`; dùng cho `chapter6-k6-grafana-bff-drilldown-after-fix.png` | Không cần chụp lại |
| Optional | Tempo trace cho `POST /api/v1/customer/orders` hoặc `POST /api/v1/admin/orders/:id/confirm` | Trace hiện có là invalid QR path; nếu có thêm golden-path trace thì phần tracing cân bằng hơn | `chapter6-k6-tempo-order-submit-trace.png` hoặc `chapter6-k6-tempo-order-confirm-trace.png` |
| Optional | Loki app log có `traceId`/`processID` từ BFF hoặc service domain | Chỉ cần nếu Promtail thu được app logs; nếu Loki chỉ có monitoring/internal logs thì bỏ khỏi báo cáo chính | `chapter6-k6-loki-traceid-log.png` |

Tên file placeholder sau triage:

| Placeholder | File ảnh human user tự chụp |
| --- | --- |
| C6-K6-01 | `chapter6-k6-grafana-system-overview-after-fix.png` |
| C6-K6-02 | `chapter6-k6-grafana-bff-drilldown-after-fix.png` |
| C6-K6-03 | `chapter6-k6-prometheus-http-route-status.png` |
| C6-K6-04 | `chapter6-k6-grafana-business-metrics.png` |
| C6-K6-05 | `chapter6-k6-prometheus-business-counters.png` |
| C6-K6-06 | `chapter6-k6-tempo-invalid-qr-trace.png` |
| C6-K6-07 optional | `chapter6-k6-tempo-order-submit-trace.png` hoặc `chapter6-k6-tempo-order-confirm-trace.png` |
| C6-K6-08 optional | `chapter6-k6-loki-traceid-log.png` |
| C6-K6-09 optional | `chapter6-k6-terminal-summary.png` |

## 5. Checklist trước khi sửa LaTeX

- Evidence pack có đủ raw `summary.json` và generated `summary.md`.
- `summary.md` khớp với terminal output hoặc raw JSON.
- Screenshot là ảnh thật từ cùng run window, không phải placeholder/cũ.
- Screenshot không lộ `Authorization`, token, webhook secret, password hoặc thông tin nhạy cảm.
- Caption ghi rõ nguồn, môi trường local và thời điểm chạy.
- Claim không vượt phạm vi local benchmark.
- Sau khi sửa LaTeX, render PDF và kiểm tra figure/table numbering.
