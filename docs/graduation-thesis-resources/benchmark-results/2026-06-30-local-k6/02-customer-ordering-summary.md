# k6 Summary

> Generated from `02-customer-ordering-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field        | Value                               |
| ------------ | ----------------------------------- |
| Generated at | 2026-06-30T09:04:57.804Z            |
| Source JSON  | `02-customer-ordering-summary.json` |
| BASE_URL     | `not recorded by summarizer`        |
| TENANT_ID    | `not recorded by summarizer`        |

## Headline Metrics

| Metric            | Value      |
| ----------------- | ---------- |
| HTTP requests     | 30         |
| HTTP request rate | 3.47 req/s |
| HTTP failed rate  | 0.00%      |
| Check pass rate   | 100.00%    |
| Checks passed     | 60         |
| Checks failed     | 0          |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 20.41 | 17.06 | 42.37 | N/A | 7.82 | 60.82 |
| Iteration duration (ms) | 1727.94 | 1717.40 | 1764.99 | N/A | 1707.54 | 1773.46 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
