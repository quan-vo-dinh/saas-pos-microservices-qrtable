# Phase 7 — Deployment

## Status

Docker/Compose/Caddy/package/local validation artifacts are IMPLEMENTED + VERIFIED. Public deployment, HTTPS/public smoke, backup/rollback evidence, and final demo evidence remain PENDING.

## Final Scope

- Reproducible application images, layered Compose topology, Caddy reverse proxy, production environment/package artifacts, local validation, and deployment documentation.
- The production runbook and human checklist contain the operator procedure; this record states final behavior and evidence.

## Accepted Decisions

- BFF is the public API/WebSocket edge; Caddy is the public reverse-proxy boundary for web applications and approved public routes.
- Internal databases, Redis, Kafka, and services use private network boundaries and are not public ports.
- Production configuration uses explicit service environment mappings, migrations, health checks, named volumes, and production-safe Keycloak/CORS constraints.
- A public deployment is not claimed complete until its manual infrastructure, certificate, smoke, backup, and rollback evidence exists.

## Final Business Behavior

- A developer can reproduce the accepted local package/topology for QRTable and prepare the thesis demo environment from documented artifacts.
- Public customer/staff operation and live-provider claims remain unavailable as acceptance evidence until the pending public gates are executed.

## Final Technical Behavior

- Backend and frontend Dockerfiles, application/infrastructure/proxy Compose assets, Caddy routing, package scripts, environment templates, seed/reset and preflight/runbook artifacts are implemented.
- Local Compose/configuration validation demonstrates the packaged boundary; production deployment requires the documented operator procedure and real server evidence.

## Acceptance Evidence

- Docker, Compose, Caddy, package, validation, production-runbook, checklist, and preflight artifacts are present and locally verified.
- The repository retains the runbook and checklist for the human deployment procedure and public-evidence collection.

## Deferred Work

- DigitalOcean/public-server execution, DNS and HTTPS issuance, public smoke, real backup checksum/restore evidence, rollback drill, live SePay validation, and final timed demo evidence are PENDING.
