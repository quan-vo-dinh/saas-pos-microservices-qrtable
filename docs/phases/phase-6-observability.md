# Phase 6 — Observability

## Status

IMPLEMENTED + VERIFIED for the accepted thesis scope.

## Final Scope

- Local, production-aware observability baseline: service health, structured/redacted logs, Prometheus metrics, Grafana Loki/Tempo/Prometheus integration, trace propagation, dashboards, and alerts.
- The BFF → Order → Catalog → Kitchen golden-path observability story and Phase 7 packaging boundary.

## Accepted Decisions

- The target is a local thesis/demo stack that is production-aware, not enterprise HA monitoring.
- Shared observability behavior belongs in `libs/observability`; service boundaries and tenant isolation remain unchanged.
- `processId` remains compatible with existing correlation; structured logs may include `traceId` when OpenTelemetry context exists.
- Metrics avoid secrets and high-cardinality identity labels; Grafana and telemetry backends are not public application endpoints.

## Final Business Behavior

- Operators can determine service health, inspect correlated logs, view request/business signals, follow representative distributed work, and observe defined alert conditions.
- The accepted scope supports debugging and thesis demonstration without claiming production SRE/on-call maturity.

## Final Technical Behavior

- Health/readiness endpoints, structured logging/redaction, `/metrics`, OpenTelemetry bootstrap/propagation, and monitoring Compose/provisioning are implemented across the relevant services.
- Grafana provides system overview, business metrics, and service-drilldown dashboards with Loki, Prometheus, and Tempo data sources; alert rules include the accepted service/error/KDS signals.
- TCP/Kafka trace-context helpers preserve the golden-path correlation across service boundaries where instrumentation is available.

## Acceptance Evidence

- `libs/observability`, monitoring Compose/configuration, Grafana provisioning/dashboard assets, application integrations, and focused tests are present.
- The accepted local evidence covers health, log/metric/trace configuration, dashboard/alert assets, and the documented golden-path/query workflow.
- Security rules retain secret redaction, internal telemetry exposure, and low-cardinality metric constraints.

## Deferred Work

- HA/cluster topology, long retention/object storage, Kubernetes/service mesh, OTel Collector pipelines, tail sampling, external on-call integrations, and broad infrastructure exporters are deferred.
