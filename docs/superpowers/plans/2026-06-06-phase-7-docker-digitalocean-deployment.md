# Phase 7 Docker and DigitalOcean Deployment Plan

> **Vietnamese translation:** [2026-06-06-phase-7-docker-digitalocean-deployment.vi.md](2026-06-06-phase-7-docker-digitalocean-deployment.vi.md)
>
> **Refactored:** 2026-06-07
>
> This is an execution plan, not a canonical product specification. Final implemented behavior must
> be absorbed into `docs/phases/phase-5-7-finalization.md`, `docs/technical-architecture.md`, and the
> deployment guide.

## 1. Goal and Operating Context

Deploy QRTable publicly on one DigitalOcean Droplet for thesis demonstration and limited real use.
The deployment must be understandable and operable by one developer.

The target is not an enterprise platform. It still requires the controls whose absence would create
material risk:

- reproducible Docker images and Compose topology;
- HTTPS and a host firewall;
- no public database, Redis, Kafka, internal service, or observability ports;
- production-only secrets outside git;
- explicit service environment mapping;
- migrations before application startup;
- production-safe Keycloak bootstrap;
- restricted BFF HTTP and Socket.IO CORS;
- health checks and useful logs/metrics;
- a tested public smoke path;
- basic backup and image rollback.

Complexity is accepted only when it reduces a current risk or creates useful thesis evidence.

## 2. Evidence and Current State

### 2.1 CodeGraph

CodeGraph was run before direct file inspection.

- Index status: up to date.
- Indexed scope: 1,211 files, 15,593 nodes, 29,853 edges.
- The current Task 8 CORS work is on the real BFF runtime path.
- `createCorsOriginValidator` is shared by HTTP CORS and the Redis-backed Socket.IO adapter.

### 2.2 Git

Local `main` is ahead of `origin/main` by two commits. Preserve these implemented changes:

| Work                                                             | Commit    | Decision |
| ---------------------------------------------------------------- | --------- | -------- |
| Database-per-service prerequisite, migrations, ownership tooling | `45a4480` | Keep     |
| Task 1 build-context controls and Task 2 backend image           | `a6ce5b6` | Keep     |
| Task 3 Management App image and Task 4 Customer PWA image        | `2678f58` | Keep     |
| Task 8 production env and BFF CORS                               | `88122dd` | Keep     |
| Task 5 production infrastructure Compose                         | `cf6cf7d` | Keep     |

Do not reimplement, revert, or rewrite Tasks 1-4 without a concrete defect.

Task 8 is complete. The retained part is the BFF CORS implementation/tests and the production env
template. The scoped-env renderer, large Compose validator, shell test suites, CORS fake-transport
harness, and separate acceptance matrix were removed because they duplicated policy before the
production Compose files existed.

### 2.3 Documents reviewed

- `AGENTS.md`
- `docs/README.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/phases/phase-5-7-finalization.md`
- this plan and its Vietnamese translation

Relevant architecture facts:

- one PostgreSQL instance hosts service-owned databases;
- User-Access owns MongoDB `qrtable_auth`;
- Kitchen remains Redis-only;
- BFF is the only public API/WebSocket entry point;
- production uses TypeORM migrations with `TYPEORM_SYNCHRONIZE=false`;
- real SePay behavior depends on the actual provider account and API surface.

## 3. Scope Classification

### 3.1 Core deployment requirements

These are blockers for public deployment:

1. Tasks 1-4 remain buildable.
2. Production Compose uses private networks, named volumes, health checks, and no public internal
   ports.
3. Each service receives only its required variables through explicit Compose `environment:`
   entries. The master env file is used for interpolation, not injected wholesale with `env_file`.
4. Secrets are generated for production, stored outside git, and the server env file is mode `0600`.
5. BFF rejects wildcard/empty production CORS and applies the same allowlist to HTTP and Socket.IO.
6. Migrations and database ownership checks run before app containers.
7. Keycloak uses production mode and does not create/reset deterministic demo users by default.
8. Caddy provides HTTPS for public hosts.
9. DigitalOcean Firewall exposes only 80/443 and restricted SSH.
10. Health checks and critical public smoke checks pass.
11. A logical backup exists with checksum, and the previous image tag can be redeployed.

### 3.2 Useful for operations and thesis evidence

These add real value but should remain small:

- Grafana access behind HTTPS/authentication;
- centralized container logs;
- Prometheus service health/request metrics;
- one representative Tempo trace for the thesis demonstration;
- one service-down alert demonstration;
- a non-destructive demo seed and a 15-20 minute demo script;
- a short deployment record containing date, git SHA, image tag, migration result, smoke result,
  backup checksum, and rollback tag.

Missing one of these may reduce report quality, but it does not automatically make the public
deployment unsafe if health, logs, backup, and smoke checks still exist.

### 3.3 Conditional integrations

#### SePay live

Real SePay is required only when QRTable claims that live VietQR/OAuth/webhook payment is production
ready.

Two acceptable paths:

- **Live SePay path:** configure the actual account, OAuth callback, tenant/platform webhook routes,
  secret verification, and one human-approved low-value transfer.
- **Cash/demo path:** deploy without claiming live SePay support. Before this path can be used, relax
  the current Payment production startup contract behind an explicit feature flag and disable/hide
  live SePay actions. Do not use fake production credentials.

The provider account, KYC, bank authorization, OAuth consent, and real transfer are human actions.
They are not blockers for the cash/demo deployment path.

#### Cloudinary

Cloudinary is required only when the public demo includes menu image upload. Existing images and the
main ordering flow can be verified separately. If enabled, run one upload/read/delete smoke without
logging the API secret.

### 3.4 Deferred hardening

These are not Phase 7 blockers:

- Kubernetes, multiple Droplets, load balancers, blue/green or canary deployment;
- managed PostgreSQL/Valkey/Kafka;
- per-service database users;
- a 12-file scoped env renderer;
- a production CI/CD control plane that SSHes from GitHub Actions;
- automatic production deploy on merge;
- mandatory SBOM generation and vulnerability enforcement gates;
- a formal audit/evidence framework with many human gate IDs;
- full production Playwright coverage of every business flow;
- encrypted off-site restore rehearsal on every release;
- long-term Loki/Tempo object storage and enterprise retention.

Optional image scanning, off-site backup copies, and GitHub image publishing are good follow-up work
after the first stable public deployment.

## 4. Deployment Decisions

### 4.1 Platform

- One DigitalOcean Droplet.
- Ubuntu LTS.
- Docker Engine and Docker Compose plugin.
- Recommended size: 4 vCPU / 8 GiB RAM.
- Self-host PostgreSQL, MongoDB, Redis, Kafka, Keycloak, and monitoring.
- Enable DigitalOcean backups.
- Use a Reserved IP when available.

This matches the project topology and budget better than Kubernetes or managed Kafka.

### 4.2 Public hosts

| Host                             | Target                        |
| -------------------------------- | ----------------------------- |
| `api.qrtable.vodinhquan.dev`     | BFF HTTP and Socket.IO        |
| `app.qrtable.vodinhquan.dev`     | Management App                |
| `qr.qrtable.vodinhquan.dev`      | Customer PWA                  |
| `auth.qrtable.vodinhquan.dev`    | Keycloak                      |
| `grafana.qrtable.vodinhquan.dev` | Grafana behind authentication |

Only Caddy publishes host ports 80 and 443. SSH is restricted to the operator IP or another approved
control channel.

### 4.3 Environment distribution

Use one protected `/opt/qrtable/.env.production` for operator-managed values and Compose
interpolation.

Compose must explicitly map variables per service:

```yaml
services:
  payment:
    environment:
      NODE_ENV: production
      TYPEORM_HOST: postgres
      TYPEORM_PASSWORD: ${TYPEORM_PASSWORD:?required}
      PAYMENT_TYPEORM_DATABASE: ${PAYMENT_TYPEORM_DATABASE:?required}
      PAYMENT_SECRETS_ENCRYPTION_KEY: ${PAYMENT_SECRETS_ENCRYPTION_KEY:?required}
```

Rules:

- never use `env_file: /opt/qrtable/.env.production` on a service;
- never print resolved `docker compose config` output to shared logs;
- prefer `${VAR:?required}` for required interpolation;
- generate URL-safe MongoDB credentials when constructing `MONGODB_URI` in Compose;
- keep Keycloak bootstrap credentials out of normal app containers;
- keep SePay and Cloudinary credentials out of unrelated services.

This provides useful least privilege without maintaining generated env files.

### 4.4 Release and rollback

The first deployment is operator-driven:

1. run existing CI checks;
2. build and optionally push images with `tools/deploy/phase7-build-images.sh`;
3. select an immutable git-SHA image tag;
4. deploy from a trusted workstation over restricted SSH;
5. run migrations, start containers, and run smoke checks;
6. record the successful tag;
7. rollback by redeploying the previous tag.

GitHub Actions image publishing is optional. GitHub Actions production SSH deployment is deferred.

## 5. Compact Roadmap

### Dependency order

```text
Tasks 1-4 (done)
  -> Task 5 infra Compose
  -> Task 6 app Compose and explicit env mapping
  -> Task 7 proxy configuration

Task 8 env/CORS can finish in parallel with Tasks 5-7

Tasks 5, 6, 8
  -> Task 9 migrations and Keycloak bootstrap

Tasks 5, 6
  -> Task 10 monitoring

Tasks 5-10
  -> Task 11 DigitalOcean provisioning and deployment
  -> Task 12 smoke, backup, rollback, demo, and canonical docs

Conditional SePay live verification starts only after public HTTPS exists.
```

### Task 1: Build context controls

**Status:** Completed in `a6ce5b6`.

Keep `.dockerignore`. Reverify only if new generated/private directories are added.

### Task 2: Backend image

**Status:** Completed in `a6ce5b6`.

Keep the parametric backend Dockerfile and image build script. Verify one representative backend
image before a full release build.

### Task 3: Management App image

**Status:** Completed in `2678f58`.

Keep Next.js standalone output and the multi-stage Dockerfile. Public `NEXT_PUBLIC_*` values remain
build-time configuration; private secrets remain runtime-only.

### Task 4: Customer PWA image

**Status:** Completed in `2678f58`.

Keep the static Nginx image and SPA fallback. `VITE_BFF_URL` is build-time configuration.

### Task 5: Production infrastructure Compose

**Status:** Implemented in `cf6cf7d`. Runtime health was verified successfully with
`docker compose ... up -d --wait --wait-timeout 300`.

**Outcome:** PostgreSQL, MongoDB, Redis, Kafka, and Keycloak run on private networks with named
volumes and health checks.

Scope:

- create `docker-compose.infra.yaml`;
- pin supported image versions, preferably digests after testing;
- reuse the existing service database init SQL and add Keycloak database creation;
- advertise Kafka as `kafka:9092`;
- run Keycloak in production mode, not `start-dev`;
- publish no datastore or Keycloak container ports;
- use Compose health checks and bounded memory settings appropriate to the Droplet.

Verified syntax target:

```bash
docker compose --env-file docker/env/.env.production.example \
  -f docker-compose.infra.yaml config -q
```

When Docker is available locally, start the layer with non-secret local test values and verify each
health state.

### Task 6: Application Compose and explicit env mapping

**Outcome:** Eight backend services and two frontends communicate by Docker service name.

Scope:

- create `docker-compose.app.yaml`;
- map only required variables under each service's `environment:`;
- set TCP/gRPC listeners to `0.0.0.0`;
- set TCP/gRPC clients to Docker service names;
- attach only BFF and frontends to the edge network;
- publish no application ports;
- add app health checks using the correct route prefix.

Validation belongs here because the real Compose structure now exists. Keep validation concise:

- `docker compose ... config -q`;
- fail on unresolved required interpolation using `${VAR:?required}`;
- inspect the rendered service/network/port model locally without uploading it;
- verify no service uses the master env as `env_file`.

Do not reintroduce a general-purpose dotenv parser or generated per-service env files.

### Task 7: Reverse proxy and HTTPS configuration

**Outcome:** Caddy routes the five public hosts and is the only public container.

Scope:

- create the Caddyfile and proxy Compose file;
- proxy API/WebSocket, Management App, PWA, Keycloak, and Grafana;
- protect Grafana;
- persist Caddy certificate data;
- validate configuration before DigitalOcean provisioning.

Live certificate issuance remains part of Task 11 because it depends on DNS.

### Task 8: Production env and BFF CORS

**Status:** Completed in `88122dd`.

Keep:

- `docker/env/.env.production.example`;
- `apps/bff/src/configuration/cors-origins.ts`;
- `apps/bff/src/configuration/cors-origins.spec.ts`;
- `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.spec.ts`;
- BFF configuration/bootstrap/adapter/gateway changes that reuse one allowlist.

Do not keep:

- the 12-file scoped env renderer;
- the 400-line Compose validator and shell test suite;
- the fake-transport CORS shell test suite;
- a separate Task 8 acceptance matrix.

Acceptance:

- the template contains keys/placeholders only and no real secret;
- `/opt/qrtable/.env.production` is created manually with mode `0600`;
- production BFF startup rejects missing or wildcard CORS;
- development may retain wildcard fallback;
- HTTP and Socket.IO use the same origin validator;
- BFF unit tests, lint, and build pass.

Public allowed/disallowed-origin checks move to Task 12 smoke after DNS and HTTPS exist.

### Task 9: Migrations and production-safe Keycloak bootstrap

**Outcome:** Schema and identity configuration are applied before app startup without destructive
development behavior.

Scope:

- package a one-shot migration/tooling image or use an equally reproducible one-shot job;
- run `pnpm db:migrate`, `pnpm db:migration:show`, and `pnpm db:verify:ownership`;
- stop deployment on any failure;
- split realm/client/role bootstrap from demo-user creation;
- update production redirect URIs and web origins idempotently;
- never run `pnpm dev:reseed -- --yes` in production;
- make demo data opt-in, non-destructive, and idempotent.

### Task 10: Production monitoring baseline

**Outcome:** The operator can answer whether services are alive and where a failing request went.

Core:

- Prometheus scrapes app container names;
- Promtail collects labeled container logs;
- Loki, Prometheus, and Tempo remain private;
- Grafana is reachable only through Caddy;
- disk retention is bounded.

Useful thesis evidence:

- one dashboard for health, request rate, error rate, and latency;
- one representative BFF to Order/Kitchen trace;
- one demonstrated service-down alert.

Do not add long-term object storage or enterprise retention in Phase 7.

### Task 11: Provision DigitalOcean and deploy

**Outcome:** A public HTTPS deployment runs from an immutable image tag.

Human actions:

- approve account, cost, Droplet size, Reserved IP, DNS, and external provider credentials;
- configure the Firewall and DNS;
- enter secrets directly on the server;
- approve the deployment window and selected tag.

Agent/script actions:

- install Docker from the official repository;
- create a non-root deploy user;
- keep root/password SSH disabled;
- validate env permissions and Compose syntax;
- start infra and wait for health;
- run Task 9 migrations/bootstrap;
- start monitoring, app, and proxy layers;
- verify public TLS and container/network state.

The first release can use manual image push/pull or a server build. It does not require a production
CI/CD platform.

### Task 12: Smoke, backup, rollback, demo, and documentation

**Outcome:** The deployment can be demonstrated, observed, and recovered by one developer.

Required smoke:

- BFF live/ready health;
- Management App, Customer PWA, and Keycloak public responses;
- allowed and disallowed HTTP CORS origins;
- allowed and disallowed Socket.IO origins;
- login;
- QR menu/session;
- order submit and staff confirm;
- KDS update;
- cash payment and table lifecycle;
- Grafana receives current logs/metrics.

Full production Playwright is not required. Run the stable demo subset and keep deeper E2E on the
standardized local/test stack.

Backup and rollback:

- enable DigitalOcean Droplet backups;
- create logical PostgreSQL and MongoDB dumps with checksums;
- schedule a simple daily backup with bounded retention;
- test one representative restore into disposable containers before the thesis defense;
- record the previous good image tag;
- rollback the application by redeploying that tag;
- treat data restore as a separate, explicit operation.

Documentation:

- create/update the concise operator runbook;
- record the final Compose files, hosts, migration sequence, backup path, and rollback command;
- update canonical Phase 7/architecture docs only after implementation;
- run `pnpm verify:doc-anchors`.

## 6. Human Checkpoints

Use four understandable checkpoints instead of eleven formal gates:

| Checkpoint         | Human decision                                                           |
| ------------------ | ------------------------------------------------------------------------ |
| External resources | Approve DigitalOcean cost/resources, domain/DNS, and account ownership   |
| Secrets            | Enter production/provider values directly into protected stores          |
| Deployment         | Approve immutable tag, backup state, rollback tag, and deployment window |
| Real payment       | Approve SePay live enablement and any low-value transfer                 |

Record only redacted identifiers and results. Never record full credentials, private keys, OAuth
secrets, webhook secrets, or bank data.

## 7. Production Acceptance

Phase 7 baseline is accepted when:

- [ ] Tasks 1-4 remain reproducibly buildable.
- [ ] Infra and app Compose start from a clean server checkout.
- [ ] Internal ports are not public.
- [ ] Production secrets are outside git and server env permissions are restricted.
- [ ] Compose explicitly maps service variables and does not inject the master env wholesale.
- [ ] Dedicated database names are active and shared fallback is disabled.
- [ ] Migrations and database ownership checks pass before app startup.
- [ ] Production Keycloak bootstrap creates no deterministic demo users.
- [ ] HTTPS works for API, app, PWA, auth, and protected Grafana hosts.
- [ ] BFF HTTP and Socket.IO reject unlisted production origins.
- [ ] Login, QR ordering, POS confirmation, KDS, and cash payment smoke pass.
- [ ] Health, centralized logs, and service metrics are available.
- [ ] A logical backup with checksum exists and one representative restore has been tested.
- [ ] The previous application image tag can be redeployed.
- [ ] The operator runbook and canonical docs match the implemented files.

SePay live acceptance is separate:

- [ ] The actual provider API surface is confirmed.
- [ ] OAuth callback and tenant/platform webhook routes are configured.
- [ ] Invalid secrets are rejected.
- [ ] One human-approved low-value transfer is idempotently recorded.

If these SePay items are not complete, the deployment may still pass the Phase 7 cash/demo baseline,
but documentation and UI must not claim live SePay readiness.

## 8. Immediate Next Order

1. Implement Task 6 app Compose with explicit environment mapping.
2. Implement Task 9 migrations and production-safe Keycloak bootstrap.
3. Implement Task 10 monitoring adaptation.
4. Implement Task 7 proxy configuration.
5. Provision and deploy through Task 11.
6. Complete Task 12 smoke, recovery, demo, and canonical documentation.

Tasks 6-12 remain after the completed Task 5 and Task 8 work.
