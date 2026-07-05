# k6 Summary

> Generated from `01-read-baseline-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field        | Value                           |
| ------------ | ------------------------------- |
| Generated at | 2026-06-30T23:44:30.193Z        |
| Source JSON  | `01-read-baseline-summary.json` |
| BASE_URL     | `not recorded by summarizer`    |
| TENANT_ID    | `not recorded by summarizer`    |

## Headline Metrics

| Metric            | Value       |
| ----------------- | ----------- |
| HTTP requests     | 4324        |
| HTTP request rate | 26.03 req/s |
| HTTP failed rate  | 0.00%       |
| Check pass rate   | 100.00%     |
| Checks passed     | 7567        |
| Checks failed     | 0           |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 13.08 | 11.39 | 27.27 | N/A | 2.44 | 53.58 |
| Iteration duration (ms) | 1954.93 | 1954.48 | 1977.80 | N/A | 1920.18 | 2022.16 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
