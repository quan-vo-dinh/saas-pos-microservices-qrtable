# k6 Summary

> Generated from `01-read-baseline-summary.json`. Keep this file with the raw JSON and do not copy values into the thesis until the run environment is documented.

## Run Context

| Field | Value |
| --- | --- |
| Generated at | 2026-06-26T20:16:54.094Z |
| Source JSON | `01-read-baseline-summary.json` |
| BASE_URL | `not recorded by summarizer` |
| TENANT_ID | `not recorded by summarizer` |

## Headline Metrics

| Metric | Value |
| --- | --- |
| HTTP requests | 4332 |
| HTTP request rate | 26.09 req/s |
| HTTP failed rate | 0.00% |
| Check pass rate | 100.00% |
| Checks passed | 7581 |
| Checks failed | 0 |

## Latency

| Metric | Avg | Median | p95 | p99 | Min | Max |
| HTTP request duration (ms) | 12.38 | 10.64 | 26.02 | N/A | 2.72 | 44.85 |
| Iteration duration (ms) | 1952.19 | 1950.38 | 1976.70 | N/A | 1922.89 | 2001.60 |

## Thesis Claim Boundary

- This file summarizes one local k6 run only.
- Interpret the numbers together with the machine, seed data, VU/duration settings, and service startup mode.
- Do not use this as proof of production readiness, high availability, or large-scale stress capacity.
