# Hướng dẫn human capture k6/observability evidence

> AI agent không tự chụp screenshot, không tự chọn ảnh và không tự dán ảnh vào LaTeX. Human user thực hiện các bước capture dưới đây.

## 1. Chuẩn bị môi trường

```bash
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

pnpm dev:reseed -- --yes
docker compose -f docker-compose.infra.yaml up -d
docker compose -f docker-compose.monitoring.yaml up -d
pnpm dev:bff-order
```

Nếu cần pulse Confirm/KDS đầy đủ, chạy stack có Kitchen/Authorizer/User-Access:

```bash
pnpm dev --projects=bff,order,catalog,kitchen,saas,authorizer,user-access
```

Verify trước khi chạy:

```bash
curl -fsS http://localhost:3300/api/v1/health/ready
curl -fsS http://localhost:3300/api/v1/metrics | head
curl -fsS http://localhost:3001/api/health
```

## 2. Chạy k6 và sinh summary Markdown

Các script mutation mặc định dùng bàn `A02` vì seed dashboard đang để `A01` ở trạng thái `occupied` với bill `PENDING_PAYMENT`.
Nếu chạy trong Codex mà `pnpm dev:reseed` báo `ERR_PNPM_ABORTED_REMOVE_MODULES_DIR_NO_TTY`, dùng pnpm từ Node/NVM:

```bash
/Users/vodinhquan/.nvm/versions/node/v24.14.0/bin/pnpm dev:reseed -- --yes
```

Read baseline:

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

k6 run --summary-export "$RESULT_DIR/01-read-baseline-summary.json" tests/benchmark/01-read-baseline.js
node tests/benchmark/k6-summary-to-md.js "$RESULT_DIR/01-read-baseline-summary.json" "$RESULT_DIR/01-read-baseline-summary.md"
```

Customer ordering:

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

pnpm dev:reseed -- --yes
k6 run --summary-export "$RESULT_DIR/02-customer-ordering-summary.json" tests/benchmark/02-customer-ordering.js
node tests/benchmark/k6-summary-to-md.js "$RESULT_DIR/02-customer-ordering-summary.json" "$RESULT_DIR/02-customer-ordering-summary.md"
```

Confirm/KDS pulse:

```bash
set -euo pipefail
export RESULT_DIR="${RESULT_DIR:-docs/graduation-thesis-resources/benchmark-results/$(date +%F)-local-k6}"
mkdir -p "$RESULT_DIR/screenshots"

get_demo_token() {
  local username="$1"
  local password="$2"

  curl -sS -X POST 'http://localhost:8180/realms/qrtable/protocol/openid-connect/token' \
    -H 'Content-Type: application/x-www-form-urlencoded' \
    --data-urlencode 'grant_type=password' \
    --data-urlencode 'client_id=qrtable-bff' \
    --data-urlencode 'client_secret=9UikCZhjajo9syeVe9yvjLjY7l52tWFh' \
    --data-urlencode "username=${username}" \
    --data-urlencode "password=${password}" \
    | node -e 'let s="";process.stdin.on("data",d=>s+=d);process.stdin.on("end",()=>{const j=JSON.parse(s); if(!j.access_token){ console.error(JSON.stringify(j)); process.exit(1); } process.stdout.write(j.access_token);})'
}

export STAFF_TOKEN="$(get_demo_token 'waiter.1700000004@gmail.com' 'waiter123')"
export KDS_TOKEN="$(get_demo_token 'chef.1700000005@gmail.com' 'chef123')"

k6 run --summary-export "$RESULT_DIR/03-confirm-kds-pulse-summary.json" tests/benchmark/03-confirm-kds-pulse.js
node tests/benchmark/k6-summary-to-md.js "$RESULT_DIR/03-confirm-kds-pulse-summary.json" "$RESULT_DIR/03-confirm-kds-pulse-summary.md"
```

Trong seed local, `STAFF_TOKEN` dùng user `WAITER` để confirm order; `KDS_TOKEN` dùng user `CHEF` để đọc KDS queue `KITCHEN`. Không paste nguyên chuỗi `paste-redacted-token-here`; đó chỉ là placeholder.

## 3. Mở công cụ observability

| Tool          | URL                                                   |
| ------------- | ----------------------------------------------------- |
| Grafana       | `http://localhost:3001`                               |
| Prometheus    | `http://localhost:9090`                               |
| Loki Explore  | `http://localhost:3001/explore` chọn datasource Loki  |
| Tempo Explore | `http://localhost:3001/explore` chọn datasource Tempo |

Grafana local mặc định:

```text
username: admin
password: admin
```

## 4. Chụp dashboard Grafana trực quan trước

Ưu tiên chụp **Grafana Dashboards**, không chụp Prometheus Explore dạng bảng nếu mục tiêu là hình minh họa sinh động cho khóa luận.

Vào Grafana `http://localhost:3001` -> **Dashboards** và mở các dashboard đã provision sẵn:

| Dashboard                   | Panel nên chụp                                                                                                                           | Ý nghĩa trong Chương 6                                                        |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `QRTable System Overview`   | `HTTP Request Rate (RED — Rate)`, `HTTP Error Ratio (RED — Errors)`, `HTTP Latency P95 (RED — Duration)`, `Business Throughput`          | Toàn cảnh hệ thống trong lúc chạy k6: request tăng, lỗi thấp, latency được đo |
| `QRTable Service Drilldown` | `HTTP rate by method / route / status`, `TCP rate by pattern`, `HTTP latency P95`, `TCP latency P95 by pattern`, `Recent traces (Tempo)` | Chứng minh request đi qua BFF và TCP patterns của các service phía sau        |
| `QRTable Business Metrics`  | `Orders submitted / s`, `Orders confirmed / s`, `Order throughput (1m rate)`, `KDS tickets created / s by station`                       | Chứng minh luồng nghiệp vụ order/confirm/KDS tạo metric riêng                 |

Cách chụp đẹp hơn:

1. Set time range ở góc phải Grafana: `Last 15 minutes` hoặc custom đúng khoảng vừa chạy k6.
2. Bấm refresh ngay sau khi chạy xong `02` và `03`, tốt nhất trong vòng 1-5 phút.
3. Chụp cả cụm panel, không chỉ một số đơn lẻ, để hình có ngữ cảnh.
4. Nếu panel phẳng hoặc trống, chạy lại k6 rồi refresh dashboard ngay.

Ảnh visual chính nên có:

| Screenshot                                          | Nên lấy từ dashboard/panel                                                                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `chapter6-k6-grafana-system-overview-after-fix.png` | `QRTable System Overview`, chụp RED panels + business throughput sau khi đã restart BFF và không còn `validate-qr 500`                                       |
| `chapter6-k6-grafana-bff-drilldown-after-fix.png`   | `QRTable Service Drilldown`, service `bff`, chụp HTTP route/status + latency panels sau khi metric invalid QR là `403`                                       |
| `chapter6-k6-grafana-business-metrics.png`          | `QRTable Business Metrics`, chụp order submitted/confirmed + KDS tickets                                                                                     |
| `chapter6-k6-prometheus-http-route-status.png`      | Prometheus table `sum(rate(qrtable_http_requests_total[5m])) by (service, route, status)` nếu dashboard chưa đủ rõ status                                    |
| `chapter6-k6-prometheus-business-counters.png`      | Prometheus `increase(qrtable_orders_submitted_total[5m])`, `increase(qrtable_orders_confirmed_total[5m])`, `increase(qrtable_kds_tickets_created_total[5m])` |

## 5. Prometheus/Grafana queries để kiểm tra số liệu

Chọn time range đúng lúc benchmark chạy, ví dụ Last 15 minutes, refresh trước khi chụp.

```promql
sum(rate(qrtable_http_requests_total[5m])) by (service, route, status)
histogram_quantile(0.95, sum(rate(qrtable_http_request_duration_seconds_bucket[5m])) by (le, service, route))
sum(rate(qrtable_tcp_requests_total[5m])) by (service, pattern, status)
histogram_quantile(0.95, sum(rate(qrtable_tcp_request_duration_seconds_bucket[5m])) by (le, service, pattern))
increase(qrtable_orders_submitted_total[10m])
increase(qrtable_orders_confirmed_total[10m])
increase(qrtable_kds_tickets_created_total[10m])
```

Nếu chạy query sau benchmark quá lâu, `rate(...[5m])` có thể về `0` và histogram có thể ra `NaN`. Khi đó dùng `increase(...[30m])` để kiểm tra lại số liệu trong cả run window:

```promql
sum(increase(qrtable_http_requests_total[30m])) by (service, route, status)
sum(increase(qrtable_tcp_requests_total[30m])) by (service, pattern, status)
increase(qrtable_orders_submitted_total[30m])
increase(qrtable_orders_confirmed_total[30m])
increase(qrtable_kds_tickets_created_total[30m])
```

Prometheus Explore dùng để **đối chiếu số**, còn ảnh chính nên lấy từ Grafana dashboard ở mục 4.

## 6. Loki queries cần chụp

```logql
{compose_project=~"qrtable.*"} |= "\"service\":\"bff\""
{compose_project=~"qrtable.*"} |= "traceId"
{compose_project=~"qrtable.*"} |= "order.confirmed"
```

Lưu ý: nếu NestJS apps chạy bằng `pnpm dev` trên host, Promtail Docker có thể chỉ thu log monitoring containers, không thu stdout app local. Khi đó Loki chỉ chứng minh monitoring stack hoạt động, chưa đủ làm evidence app log. Ưu tiên dùng Tempo representative trace nếu Loki chưa có app log.

Ảnh cần chứng minh:

- log có `service`, `processId` hoặc `traceId`;
- một request từ k6 có thể nối qua BFF và service phía sau;
- invalid QR path được xử lý như lỗi nghiệp vụ, không làm crash hệ thống.

Tên file:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/chapter6-k6-loki-traceid-log.png
```

## 7. Tempo trace cần chụp

Trong Grafana Explore, chọn Tempo và tìm một trace quanh thời điểm benchmark. Ưu tiên trace qua:

- BFF -> Order -> Catalog cho customer ordering;
- BFF -> Order -> Catalog/Kafka/Kitchen nếu confirm/KDS pulse có trace rõ.

Tên file:

```text
docs/graduation-thesis-resources/thesis-report/assets/screenshots/chapter6-k6-tempo-invalid-qr-trace.png
```

Không cần chứng minh mọi request đều có trace. Chỉ cần một trace representative rõ và giải thích được.

## 8. Mapping screenshot -> writing plan

| Screenshot file                                                                             | Placeholder trong writing plan |
| ------------------------------------------------------------------------------------------- | ------------------------------ |
| `chapter6-k6-grafana-system-overview-after-fix.png`                                         | C6-K6-01                       |
| `chapter6-k6-grafana-bff-drilldown-after-fix.png`                                           | C6-K6-02                       |
| `chapter6-k6-prometheus-http-route-status.png`                                              | C6-K6-03                       |
| `chapter6-k6-grafana-business-metrics.png`                                                  | C6-K6-04                       |
| `chapter6-k6-prometheus-business-counters.png`                                              | C6-K6-05                       |
| `chapter6-k6-tempo-invalid-qr-trace.png`                                                    | C6-K6-06                       |
| `chapter6-k6-tempo-order-submit-trace.png` hoặc `chapter6-k6-tempo-order-confirm-trace.png` | C6-K6-07 optional              |
| `chapter6-k6-loki-traceid-log.png`                                                          | C6-K6-08 optional              |
| `chapter6-k6-terminal-summary.png`                                                          | C6-K6-09 optional              |

## 9. Tự thay ảnh vào LaTeX sau khi đã capture

Chỉ làm bước này trong một session riêng khi đã có evidence thật:

1. Copy ảnh thật vào `docs/graduation-thesis-resources/thesis-report/assets/screenshots/`.
2. Mở `docs/graduation-thesis-resources/k6-observability-report-writing-plan.md`.
3. Dùng mapping trong writing plan để cập nhật `06-danh-gia.tex`.
4. Render PDF.
5. Kiểm tra ảnh rõ, caption đúng nguồn, không lộ secret, và số liệu trong bảng khớp summary thật.

## 10. Lưu ý bảo mật và chất lượng ảnh

- Redact token, JWT, webhook secret, password hoặc URL chứa credential.
- Không chụp ảnh placeholder hoặc dashboard ngoài run window.
- Không dùng screenshot cũ nếu time range không khớp benchmark.
- Ghi lại exact command, VU/duration/iteration settings, seed command và machine notes trong evidence pack README.
