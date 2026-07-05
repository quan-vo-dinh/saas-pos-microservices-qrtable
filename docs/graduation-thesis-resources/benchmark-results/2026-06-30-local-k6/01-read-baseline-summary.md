# k6 Summary

> Generated from `01-read-baseline-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field        | Value                           |
| ------------ | ------------------------------- |
| Generated at | 2026-06-30T09:03:10.579Z        |
| Source JSON  | `01-read-baseline-summary.json` |
| BASE_URL     | `not recorded by summarizer`    |
| TENANT_ID    | `not recorded by summarizer`    |

## Headline Metrics

| Metric            | Value       |
| ----------------- | ----------- |
| HTTP requests     | 4320        |
| HTTP request rate | 25.93 req/s |
| HTTP failed rate  | 0.00%       |
| Check pass rate   | 100.00%     |
| Checks passed     | 7560        |
| Checks failed     | 0           |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 14.60 | 9.41 | 27.03 | N/A | 2.74 | 639.12 |
| Iteration duration (ms) | 1961.39 | 1946.16 | 2017.51 | N/A | 1918.61 | 2583.01 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
