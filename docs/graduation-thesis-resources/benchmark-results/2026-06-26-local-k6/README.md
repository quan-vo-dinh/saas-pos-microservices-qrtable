# QRTable k6 Observability Evidence Pack - 2026-06-26 Local

> Status: scaffolded. Fill this pack only with real benchmark outputs and human-captured screenshots from the same run window.

## Run Context

| Field | Value |
| --- | --- |
| Environment | Local QRTable development stack with Phase 6 monitoring |
| Date | 2026-06-26 |
| BFF base URL | `http://localhost:3300` |
| Grafana URL | `http://localhost:3001` |
| Prometheus URL | `http://localhost:9090` |
| Tenant | `pho-viet` / `023772bb-391b-401c-936a-ed7034b69cec` |
| Seed command | `pnpm dev:reseed -- --yes` |
| Service command | Record the exact command used here |
| Machine notes | Record CPU/RAM/Docker Desktop limits here |

## Expected Artifacts

| Artifact | Status | Notes |
| --- | --- | --- |
| `01-read-baseline-summary.json` | pending | Raw k6 `--summary-export` output |
| `01-read-baseline-summary.md` | pending | Generated with `node tests/benchmark/k6-summary-to-md.js` |
| `02-customer-ordering-summary.json` | pending | Run after reseed |
| `02-customer-ordering-summary.md` | pending | Generated from raw JSON |
| `03-confirm-kds-pulse-summary.json` | pending | Requires `STAFF_TOKEN` |
| `03-confirm-kds-pulse-summary.md` | pending | Generated from raw JSON |
| `screenshots/chapter6-k6-terminal-summary.png` | pending | Human-captured terminal or Grafana k6 summary view |
| `screenshots/chapter6-grafana-http-throughput-latency.png` | pending | Human-captured Grafana/Prometheus evidence |
| `screenshots/chapter6-grafana-business-metrics.png` | pending | Human-captured orders/KDS metrics |
| `screenshots/chapter6-loki-traceid-log.png` | pending | Human-captured Loki log evidence |
| `screenshots/chapter6-tempo-representative-trace.png` | pending | Human-captured Tempo trace evidence |

## Prometheus Queries

```promql
sum(rate(qrtable_http_requests_total[5m])) by (service, route, status)
histogram_quantile(0.95, sum(rate(qrtable_http_request_duration_seconds_bucket[5m])) by (le, service, route))
sum(rate(qrtable_tcp_requests_total[5m])) by (service, pattern, status)
histogram_quantile(0.95, sum(rate(qrtable_tcp_request_duration_seconds_bucket[5m])) by (le, service, pattern))
increase(qrtable_orders_submitted_total[10m])
increase(qrtable_orders_confirmed_total[10m])
increase(qrtable_kds_tickets_created_total[10m])
```

## Loki Queries

```logql
{compose_project=~"qrtable.*"} |= "\"service\":\"bff\""
{compose_project=~"qrtable.*"} |= "traceId"
{compose_project=~"qrtable.*"} |= "order.confirmed"
```

## Claim Boundary

- Use this pack only for local representative benchmark evidence.
- Do not claim production readiness, high availability, large-scale stress capacity, or microservices superiority.
- Every screenshot used in the thesis must be captured by the human user from the real run window and checked for secrets.
