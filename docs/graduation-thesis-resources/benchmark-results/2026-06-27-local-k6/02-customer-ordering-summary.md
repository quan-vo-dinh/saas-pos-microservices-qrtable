# k6 Summary

> Generated from `02-customer-ordering-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field | Value |
| --- | --- |
| Generated at | 2026-06-26T20:17:26.566Z |
| Source JSON | `02-customer-ordering-summary.json` |
| BASE_URL | `not recorded by summarizer` |
| TENANT_ID | `not recorded by summarizer` |

## Headline Metrics

| Metric | Value |
| --- | --- |
| HTTP requests | 30 |
| HTTP request rate | 3.42 req/s |
| HTTP failed rate | 0.00% |
| Check pass rate | 100.00% |
| Checks passed | 60 |
| Checks failed | 0 |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 24.95 | 21.30 | 51.33 | N/A | 8.03 | 65.13 |
| Iteration duration (ms) | 1756.30 | 1767.30 | 1776.67 | N/A | 1711.70 | 1777.94 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
