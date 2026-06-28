# k6 Summary

> Generated from `01-read-baseline-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field | Value |
| --- | --- |
| Generated at | 2026-06-26T19:41:38.665Z |
| Source JSON | `01-read-baseline-summary.json` |
| BASE_URL | `not recorded by summarizer` |
| TENANT_ID | `not recorded by summarizer` |

## Headline Metrics

| Metric | Value |
| --- | --- |
| HTTP requests | 4336 |
| HTTP request rate | 26.14 req/s |
| HTTP failed rate | 0.00% |
| Check pass rate | 100.00% |
| Checks passed | 7588 |
| Checks failed | 0 |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 11.81 | 10.41 | 24.10 | N/A | 2.45 | 66.78 |
| Iteration duration (ms) | 1949.76 | 1949.72 | 1968.65 | N/A | 1921.40 | 2008.81 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
