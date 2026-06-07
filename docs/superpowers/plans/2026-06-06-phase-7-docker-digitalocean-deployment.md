# Phase 7 Docker DigitalOcean Deployment Implementation Plan

> **Vietnamese translation:** [2026-06-06-phase-7-docker-digitalocean-deployment.vi.md](2026-06-06-phase-7-docker-digitalocean-deployment.vi.md) — synchronized with the 2026-06-07 human-operator runbook revision.

> **Revision 2026-06-07:** Re-verified against the current codebase and current provider documentation after the database-per-service implementation. This revision fixes production database env names, Compose interpolation, TCP/gRPC host binding, Docker networks, image/tag conventions, Keycloak packaging/bootstrap, monitoring paths, E2E variables, backup consistency, CI/CD gates, the complete human-operator runbook for external platforms, and chronological ownership/handoff labels for every implementation task.

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package QRTable into reproducible Docker images and deploy the Phase 7 pilot/production baseline to DigitalOcean under `vodinhquan.dev`.

**Architecture:** Use a single DigitalOcean Droplet as the Phase 7 production baseline, with Docker Compose split into proxy, app, infra, and monitoring layers plus one-shot migration and identity bootstrap jobs. Public traffic terminates at a reverse proxy, while PostgreSQL, MongoDB, Redis, Kafka, Loki, Prometheus, Tempo, and all NestJS TCP/gRPC ports stay on internal Docker networks. Keycloak and Grafana join both their private network and the shared edge network so Caddy can reach them without publishing their container ports. Keep managed DigitalOcean databases as a later hardening option, not the first thesis/pilot dependency.

**Tech Stack:** DigitalOcean Droplet, Ubuntu, Docker Engine, Docker Compose plugin, Nx, pnpm, NestJS, Next.js, Vite, PostgreSQL, MongoDB, Redis, Kafka KRaft, Keycloak, Caddy or Nginx reverse proxy, Grafana, Loki, Promtail, Prometheus, Tempo, OpenTelemetry.

---

## 1. Evidence Snapshot

### 1.1 CodeGraph first

Command run before direct file inspection:

```bash
codegraph status .
codegraph query "Dockerfile docker compose docker-compose production deploy deployment DigitalOcean nginx reverse proxy ssl postgres redis kafka keycloak nx build"
codegraph context "Understand QRTable current deployment and packaging state for Phase 7 Docker production deploy on DigitalOcean. Focus on apps, services, Nx targets, Dockerfiles, compose files, env/config, observability, gateways, frontend apps, docs anchors."
```

Fresh result:

- CodeGraph index is up to date.
- Indexed scope: 1,182 files, 15,444 nodes, 29,940 edges.
- CodeGraph query did not surface application Dockerfiles or app compose files, which matches direct filesystem inspection.

Database-per-service implementation delta verified on 2026-06-07:

- Catalog, Order, Payment, and SaaS now have project-owned TypeORM DataSources and initial migrations.
- User-Access resolves MongoDB through `USER_ACCESS_MONGO_DB_NAME=qrtable_auth`.
- Dedicated PostgreSQL database names are the default; the legacy shared fallback requires the explicit `DATABASE_SHARED_FALLBACK_ENABLED=true` flag.
- `TYPEORM_SYNCHRONIZE=false` is the supported schema lifecycle baseline.
- Local provisioning, migration, ownership verification, split seed, and reseed workflows have passed against the dedicated databases.

### 1.2 Canonical docs read

Read and reconciled:

- `docs/README.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/implementation_plan.md`
- `docs/DOC-CODE-ANCHORS.md`
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-6-observability-plan.md`
- `docs/phases/phase-6-observability-plan.vi.md`
- `docs/guides/sepay-configuration-guide-phase3.md`
- `docs/guides/cloudinary-setup-and-usage-guide.md`
- `docs/guides/monitoring-observability-qrtable.md`
- `docs/guides/observability-qrtable.md`
- `tools/ngrok/README.md`

Current source-of-truth order from `docs/README.md` remains:

1. Current code and tests.
2. Accepted latest specs.
3. Final phase records.
4. Older supporting docs after verification.

### 1.3 External docs checked

Context7 CLI:

```bash
npx ctx7@latest library "DigitalOcean" "QRTable Phase 7 Docker production deployment plan on DigitalOcean with Docker Compose, domains/subdomains, SSL, reverse proxy, PostgreSQL, Redis, Kafka, Keycloak, monitoring, and production configuration"
npx ctx7@latest docs /websites/digitalocean "Docker Compose production deployment on DigitalOcean Droplet with Ubuntu, firewall, domains/subdomains DNS A records, Nginx reverse proxy, Let's Encrypt SSL certificates, managed PostgreSQL, Redis, container registry, backups, monitoring, and deployment checklist"
npx ctx7@latest library "SePay" "SePay VietQR OAuth webhook API documentation for deployment checklist webhook URL x-secret-key API key OAuth redirect and production configuration"
npx ctx7@latest docs /websites/developer_sepay_vn "SePay OAuth2 authentication webhook setup API key x-secret-key webhook URL request content type VietQR QR URL bank account production deployment checklist"
```

Also checked official DigitalOcean pages for Droplet pricing, managed database pricing, Kafka pricing, and Docker on Ubuntu. Key current facts:

- Droplets start at USD 4/month; managed databases start at USD 15/month.
- Managed PostgreSQL 1 GiB starts around USD 15.15/month; managed Redis-compatible Valkey 1 GiB starts around USD 15/month.
- DigitalOcean managed Kafka is a 3-node managed database product and starts much higher than the thesis/pilot target.
- DigitalOcean Container Registry Starter allows one repository and 500 MiB. QRTable therefore uses one repository with service-prefixed immutable tags; the Basic tier is the practical pilot baseline if the twelve release images exceed Starter storage.
- Docker on Ubuntu should be installed from Docker's official repository; modern installs include `docker compose` as a plugin.
- Docker Compose interpolation does not read service-level `env_file`. Every production Compose command must pass `--env-file /opt/qrtable/.env.production`. Preflight must inspect `docker compose config --environment` through a protected temporary file because that output can contain secrets.
- The originally proposed `bitnami/kafka:3.9.0` tag is unavailable. Use the verified current supported JVM image `apache/kafka:4.3.0` with Apache Kafka's documented environment-variable mapping, then run a KafkaJS compatibility smoke before production.
- Current Keycloak and Caddy patch releases must be pinned by digest during implementation. The verified planning baseline is Keycloak `26.6.2` and Caddy `2.11.3`.
- Current image manifests verified for the plan include Node `22.22.3`, PostgreSQL `16.13`, MongoDB `7.0.31`, Redis `7.4.9`, Nginx `1.30.1`, Kafka `4.3.0`, Keycloak `26.6.2`, and Caddy `2.11.3`. CI must still scan and record the exact digests it publishes or deploys.

Primary references used for this verification:

- [Docker Compose variable interpolation](https://docs.docker.com/compose/how-tos/environment-variables/variable-interpolation/)
- [Node.js 22.22.3 LTS release](https://nodejs.org/en/blog/release/v22.22.3)
- [Apache Kafka supported releases](https://kafka.apache.org/community/downloads/)
- [Apache Kafka official Docker image](https://kafka.apache.org/43/getting-started/docker/)
- [Keycloak container and optimized image guidance](https://www.keycloak.org/server/containers)
- [Keycloak reverse proxy guidance](https://www.keycloak.org/server/reverseproxy)
- [Keycloak releases](https://github.com/keycloak/keycloak/releases)
- [Caddy `basic_auth`](https://caddyserver.com/docs/caddyfile/directives/basic_auth)
- [Caddy releases](https://github.com/caddyserver/caddy/releases)
- [DigitalOcean Container Registry pricing](https://docs.digitalocean.com/products/container-registry/details/pricing/)
- [DigitalOcean read-only registry login](https://docs.digitalocean.com/reference/doctl/reference/registry/login)
- [PostgreSQL 16.13 release notes](https://www.postgresql.org/docs/release/16.13/)
- [MongoDB 7.0 patch release notes](https://www.mongodb.com/docs/current/release-notes/7.0/)
- [Redis releases](https://github.com/redis/redis/releases)
- [Nginx official image tags](https://hub.docker.com/_/nginx/tags)
- [GitHub deployment environments](https://docs.github.com/en/actions/how-tos/deploy/configure-and-manage-deployments/manage-environments)
- [GitHub Actions secrets](https://docs.github.com/actions/security-guides/using-secrets-in-github-actions)
- [GitHub repository rulesets](https://docs.github.com/en/repositories/configuring-branches-and-merges-in-your-repository/managing-rulesets/creating-rulesets-for-a-repository)
- [GitHub Actions security hardening](https://docs.github.com/actions/security-for-github-actions/security-guides/security-hardening-for-github-actions)
- [DigitalOcean Droplet creation](https://docs.digitalocean.com/products/droplets/how-to/create/)
- [DigitalOcean Cloud Firewalls](https://docs.digitalocean.com/products/networking/firewalls/how-to/create/)
- [DigitalOcean Container Registry creation](https://docs.digitalocean.com/products/container-registry/how-to/create-registry/)
- [DigitalOcean Spaces access management](https://docs.digitalocean.com/products/spaces/how-to/manage-access/)
- [Keycloak bootstrap admin recovery](https://www.keycloak.org/server/bootstrap-admin-recovery)
- [Cloudinary credential management](https://cloudinary.com/documentation/developer_onboarding_faq_find_credentials)
- [SePay webhook integration](https://developer.sepay.vn/vi/sepay-webhooks/tich-hop-webhook)
- [SePay OAuth2 configuration](https://developer.sepay.vn/vi/cong-thanh-toan/tich-hop-oauth2/cau-hinh)

SePay provider docs checked through Context7 on 2026-06-06. Key deploy facts:

- Production webhook URLs must be HTTPS.
- Bank Hub webhook upsert supports an active webhook URL, auth type, secret, and allowed events.
- SePay webhook/IPN requests can authenticate with `X-Secret-Key` when secret-key auth is configured.
- Webhook payloads include provider transaction id, bank gateway, account number, transaction content/code, transfer direction, amount, balance, reference code, and description.
- Successful webhook responses should be simple JSON success responses, not QRTable's internal API response wrapper.
- Current QRTable code supports tenant/platform secret-key webhook routes and a legacy Phase 3 HMAC route; the live SePay product/account must be checked before registering any route.

## 2. Read The Room

### 2.1 Observed repository state

Current deployable apps from `pnpm nx show projects` and `apps/*/project.json`:

| Layer    | Project          | Build target        | Runtime note                                         |
| -------- | ---------------- | ------------------- | ---------------------------------------------------- |
| Backend  | `bff`            | webpack CLI         | HTTP/WebSocket gateway, public API, Swagger, metrics |
| Backend  | `authorizer`     | webpack CLI         | HTTP + TCP + gRPC, Keycloak admin integration        |
| Backend  | `catalog`        | webpack CLI         | HTTP + TCP, PostgreSQL                               |
| Backend  | `order`          | webpack CLI         | HTTP + TCP, PostgreSQL, Redis, Kafka                 |
| Backend  | `kitchen`        | webpack CLI         | HTTP + TCP, Redis, Kafka                             |
| Backend  | `payment`        | webpack CLI         | HTTP + TCP, PostgreSQL, Redis OAuth cache, SePay     |
| Backend  | `saas`           | webpack CLI         | HTTP + TCP, PostgreSQL, Redis, Kafka                 |
| Backend  | `user-access`    | webpack CLI         | HTTP + TCP + gRPC, MongoDB                           |
| Frontend | `management-app` | Next.js build/start | Auth.js/Keycloak, internal staff/owner/admin UI      |
| Frontend | `customer-pwa`   | Vite build          | Static PWA, QR/session/customer flow                 |
| Theme    | `keycloak-theme` | package script      | Custom Keycloak theme assets                         |

Current Docker files:

- Existing: `docker-compose.provider.yaml`
- Existing: `docker-compose.monitoring.yaml`
- Missing: root `.dockerignore`
- Missing: app Dockerfiles
- Missing: `docker-compose.app.yaml`
- Missing: production reverse proxy compose
- Missing: production env example for all app services

Current monitoring implementation:

- `libs/observability` exists and exports health, logging, metrics, OTel, trace context, and outbox trace helpers.
- All backend `main.ts` files register OpenTelemetry with stable names such as `qrtable-bff`, `qrtable-order`, and `qrtable-payment`.
- Backends register `QrtableLoggingModule` and `QrtableMetricsModule`.
- `docker-compose.monitoring.yaml` includes Grafana, Loki, Promtail, Prometheus, and Tempo.
- Current Prometheus config scrapes host-run apps via `host.docker.internal`; Phase 7 app containers need service-name scrape targets.

Current env/config facts:

- BFF public API uses `PORT=3300` and `GLOBAL_PREFIX=api/v1`.
- Service HTTP ports are 3301, 3303, 3304, 3305, 3306, 3307, 3308.
- TCP ports are 3201, 3203, 3204, 3205, 3206, 3207, 3208.
- Catalog, Order, Payment, and SaaS require `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE`, and `SAAS_TYPEORM_DATABASE` in staging/production.
- User-Access requires `USER_ACCESS_MONGO_DB_NAME` in staging/production.
- Production must keep `DATABASE_SHARED_FALLBACK_ENABLED=false`; `TYPEORM_DATABASE` and `MONGO_DB_NAME` are legacy transition fallbacks only.
- Payment requires SePay OAuth values, public API base URL, and `PAYMENT_SECRETS_ENCRYPTION_KEY` in staging/production.
- Management App needs `AUTH_SECRET`, `AUTH_KEYCLOAK_*`, `MANAGEMENT_BFF_BASE_URL`, `NEXT_PUBLIC_BFF_*`, and `NEXT_PUBLIC_CUSTOMER_PWA_URL`.
- Customer PWA needs build-time `VITE_BFF_URL`; `VITE_TENANT_ID` is only a fallback because QR flow supports `tenant=<slug>`.

Current database lifecycle facts:

- Existing service database bootstrap: `docker/postgres/init/001-create-service-databases.sql`.
- Existing migration entrypoints: `pnpm db:migrate` and `pnpm db:migration:show`.
- Existing ownership gate: `pnpm db:verify:ownership`.
- Existing database tooling tests: `pnpm db:test`.
- `pnpm dev:reseed -- --yes` is destructive, development-only tooling and must not be used on production data.

### 2.2 Quick quality scan

Blockers to resolve before public production:

- No application Dockerfiles or app compose layer exist.
- No `.dockerignore`, so build context would include `node_modules`, `dist`, local env files, and generated data unless fixed.
- Per-service TypeORM migrations exist, but Phase 7 does not yet package and run them as a one-shot production migration job before app boot.
- `docker-compose.provider.yaml` uses dev-friendly defaults: unpinned `mongo`, `postgres`, `redis`, `redisinsight:latest`, `bitnamilegacy/kafka`, dev credentials, and Keycloak `start-dev`.
- Kafka advertises `localhost`, which works for local host-run apps but not for app containers.
- Monitoring compose exposes Grafana publicly on `3001` and scrapes host-run apps; production must put Grafana behind HTTPS/access control and scrape internal service names.
- BFF HTTP and Socket.IO currently enable CORS `origin: '*'`; public production is blocked until both use the same validated production allowlist.
- `dist/` contains stale `product` and `invoice` build artifacts even though current `apps/` no longer contains those projects. Production builds must clean and rebuild from source.
- Current `tools/keycloak-bootstrap.sh` always reads deterministic demo users, resets known passwords, and only applies localhost client redirects on first creation. It must not be run unchanged against production.
- The current app compose draft does not set the listener host variables used by `TcpConfiguration`/`GrpcConfiguration`; service processes would bind to `localhost` inside their containers.
- Caddy cannot reach Keycloak or Grafana unless those services join `qrtable-edge`; Prometheus and Tempo similarly need explicit shared networks with app containers.

Debt flags:

- Some docs still state Phase 6/7 are TODO even though observability code and monitoring compose exist.
- `technical-architecture.md` describes target compose files (`docker-compose.infra.yaml`, `docker-compose.app.yaml`) that are not yet implemented.
- Service global prefixes are not uniform: some services use `api/v1`, while `authorizer`, `saas`, and `user-access` use `api`. Prometheus and proxy rules must account for this until unified.
- `TcpConfiguration` uses each service's legacy `<SERVICE>_SERVICE_HOST` for its listener, while `TcpProvider` clients prefer `TCP_<SERVICE>_SERVICE_HOST`. Production compose must set listener hosts to `0.0.0.0` and client hosts to Docker service names.

Solid foundations:

- Nx project metadata is clear for all current apps.
- Backend webpack builds already generate `dist/apps/<service>/package.json` and lockfile artifacts.
- Observability baseline is implemented enough to preserve in Phase 7.
- `tools/keycloak-bootstrap.sh` can provision realm, clients, roles, and users if adapted for production hostnames.
- Per-service DataSources and initial migrations exist for Catalog, Order, Payment, and SaaS.
- `tools/database/verify-service-database-ownership.js` rejects missing or foreign service tables.
- `tools/dev-seed/*` now separates PostgreSQL ownership by service and uses MongoDB `qrtable_auth`.
- `tools/dev-reseed.sh` remains useful for disposable local/demo environments, but its destructive reset path is intentionally not production-safe.

## 3. Deployment Decisions

### 3.1 Chosen platform

Use DigitalOcean Droplet for Phase 7.

Reason:

- The current architecture explicitly targets Docker + Docker Compose on a self-hosted VPS/cloud VM.
- App Platform is easier operationally but less aligned with the current multi-service TCP/gRPC/Kafka Compose topology.
- Kubernetes/DOKS is unnecessary for the thesis/pilot and would add cluster, ingress, scheduling, and secret-management scope that Phase 7 does not need.
- Managed Kafka is too expensive for a thesis/pilot baseline compared with self-hosted Kafka inside Compose.

Initial region:

- Prefer `sgp1` for Vietnam latency if all required products are available.
- If a product is unavailable in `sgp1`, use the closest available region and keep all resources in one region.

Initial size:

- Recommended pilot Droplet: 4 vCPU / 8 GiB RAM class.
- Minimum smoke/demo Droplet: 2 vCPU / 4 GiB RAM only if monitoring is reduced and Kafka/Keycloak memory settings are capped.
- Add a block volume if local database and observability retention need more than the Droplet disk.

### 3.2 Production baseline versus hardening path

Baseline for Phase 7:

- Single Droplet.
- Docker Compose.
- Self-host PostgreSQL, MongoDB, Redis, Kafka, Keycloak, monitoring.
- Caddy reverse proxy with HTTPS.
- DigitalOcean Cloud Firewall and Droplet backups enabled.
- Public only: 80, 443, and restricted SSH.

Hardening after thesis/pilot:

- Move PostgreSQL to DigitalOcean Managed PostgreSQL.
- Move Redis to DigitalOcean Managed Caching for Valkey.
- Keep Kafka self-hosted until traffic or reliability needs justify managed Kafka.
- Add a load balancer only when multiple Droplets are used.
- Move to DOKS/Kubernetes only when horizontal scaling, rolling deploys, or multi-node scheduling becomes a real requirement.

### 3.3 Domain model for `vodinhquan.dev`

Use fixed subdomains first:

| Host                             | Target                                          |
| -------------------------------- | ----------------------------------------------- |
| `api.qrtable.vodinhquan.dev`     | BFF HTTP + WebSocket                            |
| `app.qrtable.vodinhquan.dev`     | Management App                                  |
| `qr.qrtable.vodinhquan.dev`      | Customer PWA                                    |
| `auth.qrtable.vodinhquan.dev`    | Keycloak                                        |
| `grafana.qrtable.vodinhquan.dev` | Grafana, protected and optionally IP-restricted |

Do not require wildcard tenant subdomains for the first Phase 7 deploy. Current QR links can use:

```text
https://qr.qrtable.vodinhquan.dev/?tenant=<tenant-slug>&table=<table-id>&token=<qr-token>
```

Wildcard subdomains such as `*.qrtable.vodinhquan.dev` can be added later only after the frontend/router uses host-based tenant resolution and DNS challenge automation is decided.

### 3.4 Reverse proxy choice

Use Caddy for the first Droplet deployment.

Reason:

- Automatic Let's Encrypt certificates with less ceremony than Nginx + Certbot.
- Simple Docker Compose integration.
- Good fit for a single-host pilot.

Nginx is acceptable if the team wants a more familiar reverse proxy, but then the plan must add Certbot renewal, mounted certificate storage, and explicit renewal verification.

## 4. Human Operator Runbook

This section is mandatory. Tasks that require account ownership, billing acceptance, identity verification, DNS control, bank authorization, secret viewing, or real-money movement cannot be completed autonomously by an AI agent.

### 4.1 Responsibility labels and secret-handling contract

Use these labels throughout execution:

| Label        | Meaning                                                                                       |
| ------------ | --------------------------------------------------------------------------------------------- |
| `[AGENT]`    | Can be implemented and verified in the repository or on an already-authorized machine         |
| `[HUMAN]`    | Requires the account owner to use a web console, approve terms, enter a secret, or move money |
| `[SHARED]`   | Agent prepares commands/checks; human approves the action or enters protected values          |
| `HUMAN-GATE` | Deployment must stop until the named human evidence is confirmed                              |

Secret rules:

- The agent must never ask the user to paste API tokens, passwords, private keys, bank credentials, OAuth client secrets, or recovery codes into chat.
- The human enters secrets directly into GitHub Environments/Actions, the DigitalOcean console, SePay, Cloudinary, or `/opt/qrtable/.env.production` over an authenticated shell.
- The user replies only with a non-secret confirmation such as `HUMAN-GATE-03 complete`.
- Evidence records resource names, IDs, URLs, key fingerprints, creation dates, and last four characters where useful, never full secret values.
- A CLI step may be delegated to the agent only after the user has already authenticated that CLI and explicitly permits the action.

### 4.2 Responsibility matrix

| Work item                                    | Owner      | Notes                                                                          |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Dockerfiles, Compose, scripts, tests, docs   | `[AGENT]`  | Repository work                                                                |
| Account registration, billing, terms, KYC    | `[HUMAN]`  | GitHub, DigitalOcean, SePay, bank, domain registrar, Cloudinary                |
| 2FA/passkeys and recovery codes              | `[HUMAN]`  | Store recovery material in a password manager                                  |
| API/OAuth secret creation and rotation       | `[HUMAN]`  | Agent can provide field names and validation commands                          |
| Droplet/registry/firewall creation           | `[SHARED]` | Human approves cost and ownership; agent may use an authenticated `doctl`      |
| DNS changes                                  | `[HUMAN]`  | Requires control of the `vodinhquan.dev` DNS zone                              |
| Production env generation                    | `[SHARED]` | Agent generates commands; human enters external secrets directly on the server |
| Keycloak realm/client automation             | `[AGENT]`  | Human creates the permanent administrator and validates browser login          |
| SePay OAuth, bank linking, webhook dashboard | `[HUMAN]`  | Bank authorization and production provider access cannot be automated          |
| Real payment verification                    | `[HUMAN]`  | Low-value transfer only, with explicit approval                                |
| Release image build                          | `[AGENT]`  | GitHub Actions after the human configures repository secrets                   |
| First production deploy                      | `[SHARED]` | Human selects window/tag; agent/script executes and verifies                   |
| Backup restore rehearsal                     | `[SHARED]` | Human approves isolated target and retention; agent runs checks                |

### 4.3 Manual prerequisites inventory

Before implementation reaches external infrastructure, the human must have:

- [ ] A password manager entry for QRTable production with owner email, account URLs, resource IDs, key fingerprints, and recovery instructions.
- [ ] 2FA/passkeys enabled on GitHub, DigitalOcean, domain registrar/DNS provider, SePay, Cloudinary, and the production owner email account.
- [ ] GitHub repository administrator access.
- [ ] A DigitalOcean team/account with a valid payment method and permission to create Projects, Droplets, Firewalls, Container Registry, backups, and Spaces.
- [ ] Administrative control of the `vodinhquan.dev` DNS zone.
- [ ] A SePay production-capable account and the bank account that will receive `QRTBL`/`QRSUB` transfers.
- [ ] A Cloudinary account/product environment if QRTable production uploads use Cloudinary.
- [ ] An operator workstation with `git`, `ssh`, `docker`, `doctl`, `openssl`, and `dig`.
- [ ] Separate Ed25519 keys for each required role: human workstation to Droplet, optional Droplet-to-GitHub read-only checkout, and any future CI-to-Droplet deploy channel. Never reuse a personal GitHub signing/authentication key.

### 4.4 Ordered human gates

| Gate            | Required completion evidence, without secrets                                                          |
| --------------- | ------------------------------------------------------------------------------------------------------ |
| `HUMAN-GATE-01` | Accounts, billing, owner email, 2FA/passkeys, and recovery storage confirmed                           |
| `HUMAN-GATE-02` | GitHub ruleset, Actions permissions, production environment, and release secret names confirmed        |
| `HUMAN-GATE-03` | DigitalOcean Project, Container Registry, API token, region, and resource naming confirmed             |
| `HUMAN-GATE-04` | Reserved IP, Droplet, admin SSH, backups, monitoring, tags, and Cloud Firewall confirmed               |
| `HUMAN-GATE-05` | Five DNS records resolve publicly and CAA/Cloudflare-style proxy settings permit certificate issuance  |
| `HUMAN-GATE-06` | Cloudinary, SePay, Keycloak client, Grafana, and generated secret inventory entered in approved stores |
| `HUMAN-GATE-07` | `/opt/qrtable/.env.production` completed with mode `0600`; no values pasted into chat or git           |
| `HUMAN-GATE-08` | Permanent Keycloak admin and real Management App login verified; temporary bootstrap admin removed     |
| `HUMAN-GATE-09` | SePay product/API shape, OAuth app, bank link, and platform/tenant webhook configuration proven        |
| `HUMAN-GATE-10` | First deploy window, immutable image tag, backup, smoke result, and observation window accepted        |
| `HUMAN-GATE-11` | Encrypted off-Droplet backup and isolated restore rehearsal completed                                  |

The deploy guide created by Task 13 must provide a dated checklist for these gates. No task may silently assume an external account or credential already exists.

### 4.5 GitHub web-console setup

`[HUMAN]` Open the repository on GitHub:

1. In **Settings > Actions > General**, use the minimum workflow permissions required. Default to read-only repository contents.
2. In **Settings > Rules > Rulesets**, protect `main`:
   - require pull requests;
   - require the CI status checks used by `.github/workflows/ci.yml`;
   - block force pushes and branch deletion;
   - restrict bypass permission to the owner/emergency maintainer.
3. In **Settings > Environments**, create `production` and restrict deployment branches/tags to the release policy.
4. Add required reviewers when the GitHub plan supports them.
5. If the private repository's GitHub plan does not support required reviewers, do not pretend an approval gate exists. Keep production deployment operator-driven, record the approver in the deployment log, and upgrade the GitHub plan before enabling unattended production deploys.
6. In **production > Environment secrets** or **Settings > Secrets and variables > Actions**, create only:
   - `DIGITALOCEAN_ACCESS_TOKEN` for publishing release images, scoped as narrowly as DigitalOcean permits;
   - SSH deploy secrets only after the secure deploy channel in section 4.7 has been selected.
7. If Task 14 clones the private repository on the Droplet, add a dedicated read-only repository deploy key under **Settings > Deploy keys**. Do not allow write access. Prefer an image-only release bundle later so the production host no longer needs repository access.
8. Pin third-party GitHub Actions to full commit SHAs, keep workflow permissions explicit, and review Dependabot updates before changing those SHAs.

Do not store application runtime secrets, database passwords, Keycloak admin passwords, SePay credentials, Cloudinary secrets, or the master production env in GitHub.

`HUMAN-GATE-02` evidence:

- ruleset name and active state;
- production environment name and branch policy;
- whether required reviewers are genuinely enforced by the current GitHub plan;
- configured secret names only;
- screenshot or settings URL with all secret values hidden.

### 4.6 DigitalOcean web-console setup

`[HUMAN]` Complete these steps in the DigitalOcean control panel:

1. Create/select a Project named `qrtable-production`.
2. Create one Container Registry. The registry name is globally unique and cannot be changed, so confirm the final name before creation. Use the region closest to the Droplet and select a paid tier if twelve release images exceed Starter limits.
3. Create a dedicated DigitalOcean API token under **API > Applications & API**. Copy it once into the password manager and GitHub release secret; never commit it.
4. Add the operator's public SSH key under **Settings > Security > SSH keys**. Upload only the `.pub` file.
5. Reserve a public IPv4 address for QRTable, then attach it to the production Droplet. DNS must target this Reserved IP, not an ephemeral Droplet address.
6. Create the Droplet:
   - Ubuntu 24.04 LTS or the current supported Ubuntu LTS;
   - `sgp1` when available;
   - 4 vCPU / 8 GiB recommended pilot size;
   - VPC in the same region;
   - SSH-key authentication only;
   - enhanced monitoring enabled;
   - backups enabled before live traffic;
   - tags such as `qrtable`, `production`, and `phase7`.
7. Create and attach a Cloud Firewall:
   - inbound `22/tcp` from the operator's current public IP/CIDR only;
   - inbound `80/tcp` and `443/tcp` from all IPv4/IPv6 clients;
   - no public rules for application, datastore, Kafka, Keycloak, or monitoring container ports;
   - normal outbound traffic allowed for package downloads, registry pulls, OAuth, webhooks, and telemetry.
8. Add a block volume only when measured disk/retention requirements justify it. Record its mount and backup policy separately.

`HUMAN-GATE-03`/`04` evidence:

- DigitalOcean Project name/ID;
- registry hostname and tier;
- API token creation date, scope, and last four characters only;
- Droplet ID, region, size, image, tags, and Reserved IP;
- Cloud Firewall ID and rule summary;
- backup and monitoring enabled state;
- successful SSH key fingerprint match and `ssh` login.

### 4.7 Production SSH and GitHub Actions control channel

The first Phase 7 pilot uses this baseline:

- GitHub Actions builds, scans, and publishes immutable release images.
- The production operator deploys from the trusted workstation over SSH.
- Port 22 remains restricted to the operator's known IP.
- The operator runs the audited remote deployment script with a selected immutable image tag.

Example operator command:

```bash
ssh -o IdentitiesOnly=yes qrtable-deploy@<reserved-ip> \
  "cd /opt/qrtable && IMAGE_TAG='<git-sha>' ./tools/deploy/phase7-remote-deploy.sh"
```

Do not open SSH to `0.0.0.0/0` merely so a GitHub-hosted runner can connect. GitHub-hosted runner egress addresses are not a stable single source IP suitable for this firewall rule.

Before enabling the optional `deploy-production.yml`, `[HUMAN]` must choose and document one secure channel:

| Option                                       | Phase 7 decision | Notes                                                                                       |
| -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------- |
| Operator workstation deploy                  | Baseline         | Simplest; preserves restricted SSH; approval is explicit                                    |
| Private overlay/VPN such as Tailscale        | Recommended next | GitHub runner access still needs a deliberate authenticated design                          |
| Temporary runner-IP firewall rule via DO API | Conditional      | Workflow must add the exact `/32`, deploy, and always remove it; token needs firewall scope |
| Isolated self-hosted deployment runner       | Later            | Must be hardened, patched, monitored, and must not run untrusted pull-request code          |

`HUMAN-GATE-10` must record the selected channel. Until a non-baseline channel is tested, `deploy-production.yml` remains disabled or produces an operator command instead of initiating SSH.

### 4.8 Domain, DNS, and TLS procedure

`[HUMAN]` At the authoritative DNS provider for `vodinhquan.dev`, create:

| Type | Name              | Value                    | Initial TTL |
| ---- | ----------------- | ------------------------ | ----------- |
| A    | `api.qrtable`     | DigitalOcean Reserved IP | 300         |
| A    | `app.qrtable`     | DigitalOcean Reserved IP | 300         |
| A    | `qr.qrtable`      | DigitalOcean Reserved IP | 300         |
| A    | `auth.qrtable`    | DigitalOcean Reserved IP | 300         |
| A    | `grafana.qrtable` | DigitalOcean Reserved IP | 300         |

If the DNS provider has an HTTP proxy/CDN mode, keep these records DNS-only until Caddy has successfully issued certificates. Review existing CAA records: they must permit Let's Encrypt or be removed/updated before issuance.

Confirm the domain is not close to expiry, registrar auto-renew/payment details are valid, and the authoritative nameservers are the ones being edited.

Verify from outside the Droplet:

```bash
for host in api app qr auth grafana; do
  dig +short "${host}.qrtable.vodinhquan.dev" @1.1.1.1
  dig +short "${host}.qrtable.vodinhquan.dev" @8.8.8.8
done
dig CAA qrtable.vodinhquan.dev +short
```

After Caddy starts, verify each certificate hostname, issuer, expiry, redirect behavior, and automatic-renewal logs. DNS propagation alone is not `HUMAN-GATE-05`; successful public TLS is also required.

### 4.9 External credential and production-env procedure

`[SHARED]` Generate QRTable-owned secrets locally or directly on the server:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

The human enters provider-owned secrets directly. Inventory at minimum:

| Secret group           | Required values                                                                                |
| ---------------------- | ---------------------------------------------------------------------------------------------- |
| PostgreSQL/Mongo/Redis | strong root/service passwords and connection values                                            |
| Keycloak               | temporary bootstrap admin, permanent admin, DB password, BFF and Management App client secrets |
| Auth.js                | `AUTH_SECRET` and production Keycloak client values                                            |
| SePay                  | OAuth client ID/secret, platform webhook secret, selected live API/base URLs                   |
| Payment                | `PAYMENT_SECRETS_ENCRYPTION_KEY`                                                               |
| Cloudinary             | cloud name, API key, API secret, and any upload preset required by current source              |
| Grafana/proxy          | Grafana admin password and Caddy-compatible basic-auth hash                                    |
| Offsite backup         | restricted Spaces access key/secret and bucket/endpoint values                                 |

Current repository inspection found populated development credentials in the git-ignored local `.env`, and a deterministic development Keycloak client secret remains in development tooling. Therefore:

- never copy the current local `.env` to production;
- generate fresh production-only credentials for every secret group;
- rotate any development/provider credential that has ever been committed, shared, screenshotted, logged, or reused outside the current trusted workstation;
- run a secret-history scan before the first release and document only the finding count/remediation, never the secret value;
- ensure production bootstrap/deploy scripts do not fall back to deterministic development defaults.

`[HUMAN]` For Cloudinary:

1. Create/select the production product environment.
2. Obtain the cloud name, API key, and API secret from Cloudinary's API Keys page.
3. Store the API secret only in the password manager and production server env.
4. Run one upload/read/delete smoke using a non-sensitive test image.
5. Confirm frontend bundles and logs never contain the API secret.

On the server:

```bash
sudo install -d -m 0750 -o qrtable-deploy -g qrtable-deploy /opt/qrtable
sudo install -m 0600 -o qrtable-deploy -g qrtable-deploy \
  docker/env/.env.production.example /opt/qrtable/.env.production
sudoedit /opt/qrtable/.env.production
stat -c '%a %U %G %n' /opt/qrtable/.env.production
```

Expected mode is `600`. Run the redacted preflight and scoped-env renderer; never run `cat`, `env`, `docker compose config`, or `config --environment` directly into shared logs.

### 4.10 Keycloak human procedure

`[AGENT]` The production bootstrap job creates/updates the realm, roles, protocol mappers, clients, redirect URIs, web origins, and service-account permissions.

`[HUMAN]` After bootstrap:

1. Sign in to the Keycloak Admin Console over `https://auth.qrtable.vodinhquan.dev`.
2. Create a named permanent administrator for the owner/maintainer.
3. Enable strong authentication required by the selected Keycloak policy.
4. Sign out and sign back in with the permanent administrator.
5. Disable/delete the temporary bootstrap administrator and remove temporary bootstrap values from normal runtime injection.
6. Test Management App login, logout, token issuer, tenant/role claims, and unauthorized-role rejection in a private browser session.

Temporary bootstrap credentials are recovery/bootstrap material, not the long-lived administrator identity.

### 4.11 SePay account, OAuth, webhook, and live-test procedure

The canonical protocol-level guide remains `docs/guides/sepay-configuration-guide-phase3.md`; this plan defines the required operator gates.

`[HUMAN]` must:

1. Register/sign in to SePay, complete any required identity/business verification, accept provider terms, and connect the intended receiving bank account.
2. Confirm whether the account uses Bank Hub `/v1/webhook` with `SECRET_KEY` or the currently coded `/api/v1/webhooks`/`Api_Key` surface.
3. Create the OAuth application with the exact production callback:

   ```text
   https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
   ```

4. Enter the OAuth client ID/secret directly into `/opt/qrtable/.env.production`.
5. Configure the platform `QRSUB` webhook:

   ```text
   https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
   ```

6. Complete tenant OAuth Connect from Management App and verify the generated `QRTBL` tenant webhook includes the tenant slug.
7. Verify wrong/missing secrets are rejected and valid provider calls are idempotently audited.
8. Only after explicit approval, perform one low-value real transfer and observe BFF, Payment/SaaS, database audit, and Grafana evidence.

The AI cannot accept SePay terms, complete KYC, authorize a bank account, approve OAuth consent as the owner, or initiate a real bank transfer.

`HUMAN-GATE-09` evidence:

- SePay account/product name and verified API surface;
- OAuth application name and callback URL;
- connected bank identifier with account number redacted;
- platform and tenant webhook IDs/URLs with secrets hidden;
- provider delivery result and QRTable transaction/audit ID;
- amount/time/result of any approved low-value test.

### 4.12 Off-Droplet backup setup

`[HUMAN]` Create a private DigitalOcean Space or another independent object-storage target:

1. Choose a region near the Droplet.
2. Keep the bucket private.
3. Create a dedicated access key restricted to the backup bucket and required operations where the provider supports it.
4. Enter the key/secret directly into the server's backup env, not GitHub or chat.
5. Define retention and deletion authority.

`[AGENT]` uploads an encrypted backup, downloads it to an isolated restore target, verifies checksums, restores PostgreSQL and MongoDB, and records duration/result. A same-Droplet archive or snapshot alone does not satisfy `HUMAN-GATE-11`.

### 4.13 First production deployment window

`[SHARED]` Before the first public deployment:

- [ ] Human selects the immutable image tag and maintenance/demo window.
- [ ] Human confirms current backup and rollback tag.
- [ ] Agent runs preflight, migrations, ownership verification, deploy, and smoke checks.
- [ ] Human validates login, QR flow, POS/KDS, Cloudinary upload, and SePay owner-facing flows.
- [ ] Agent and human observe health, logs, metrics, traces, disk, memory, and webhook errors at 5, 15, and 60 minutes.
- [ ] Human records `accept`, `rollback app`, or `restore data` as separate decisions.

### 4.14 Operator evidence record

The implementation guide must contain a redacted deployment record with:

```text
deployment_date
operator
approver
git_sha
image_tag_and_digests
github_actions_run_url
digitalocean_project_registry_droplet_firewall_ids
reserved_ip
dns_and_tls_verification
keycloak_admin_and_login_verification
sepay_api_surface_oauth_webhook_delivery_ids
cloudinary_smoke_result
backup_object_checksum
restore_rehearsal_result
smoke_e2e_observation_results
rollback_tag
```

No screenshot, log, or evidence file may contain a full token, password, private key, OAuth secret, webhook secret, bank credential, or unredacted customer data.

## 5. Target File Structure

Create:

- `.dockerignore`
- `docker/backend.Dockerfile`
- `docker/migrations.Dockerfile`
- `docker/keycloak.Dockerfile`
- `docker/management-app.Dockerfile`
- `docker/customer-pwa.Dockerfile`
- `docker/proxy/Caddyfile`
- `docker/postgres/init/002-create-keycloak-database.sql`
- `docker/env/.env.production.example`
- `docker-compose.infra.yaml`
- `docker-compose.migrations.yaml`
- `docker-compose.app.yaml`
- `docker-compose.proxy.yaml`
- `docker-compose.monitoring.prod.yaml`
- `tools/deploy/phase7-preflight.sh`
- `tools/deploy/phase7-compose-validate.sh`
- `tools/deploy/phase7-render-service-envs.sh`
- `tools/deploy/phase7-build-images.sh`
- `tools/deploy/phase7-migrate.sh`
- `tools/deploy/phase7-seed-demo.sh`
- `tools/deploy/phase7-smoke.sh`
- `tools/deploy/phase7-e2e.sh`
- `tools/deploy/phase7-keycloak-bootstrap.sh`
- `docs/guides/phase-7-digitalocean-deployment.md`

Reuse as implemented:

- `docker/postgres/init/001-create-service-databases.sql`
- `apps/catalog/src/database/`
- `apps/order/src/database/`
- `apps/payment/src/database/`
- `apps/saas/src/database/`
- `tools/database/verify-service-database-ownership.js`

Modify after implementation:

- `apps/management-app/next.config.ts`
- `apps/bff/src/bootstrap.ts`
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/configuration/index.ts`
- `docker-compose.monitoring.yaml` or create a production override only
- `docker/monitoring/prometheus/prometheus.yml` or production-specific Prometheus config
- `docs/technical-architecture.md` section 14
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-5-7-finalization.vi.md`
- `docs/DOC-CODE-ANCHORS.md`

Private files to create on the server only:

- `/opt/qrtable/.env.production`
- `/opt/qrtable/env/*.env`
- `/opt/qrtable/secrets/*`
- `/opt/qrtable/backups/*`

Never commit those private files.

## 6. Tasks

### 6.1 Execution Ownership Map

Read this map before starting any task. Ownership is chronological: the row identifies who participates when execution reaches that task, and the task body identifies the exact handoff step.

| Task                              | Primary ownership | Human participation / stop condition                                                                   |
| --------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------ |
| 1. Build context controls         | `[AGENT]`         | None                                                                                                   |
| 2. Backend images                 | `[AGENT]`         | None, unless Docker Desktop/daemon access requires the user to start or authorize it                   |
| 3. Management App image           | `[AGENT]`         | None                                                                                                   |
| 4. Customer PWA image             | `[AGENT]`         | None                                                                                                   |
| 5. Production infra Compose       | `[AGENT]`         | None; external infrastructure is not provisioned yet                                                   |
| 6. App Compose layer              | `[AGENT]`         | None                                                                                                   |
| 7. Reverse proxy and HTTPS config | `[AGENT]`         | None; DNS ownership and live certificate issuance occur at Task 13                                     |
| 8. Production env and secrets     | `[SHARED]`        | Human enters provider-issued secrets; stop at `HUMAN-GATE-06` and `HUMAN-GATE-07` before live deploy   |
| 9. Migrations                     | `[AGENT]`         | None for implementation; production execution occurs under Task 14 approval                            |
| 10. Keycloak bootstrap            | `[SHARED]`        | Agent automates realm/client bootstrap; human creates/verifies permanent admin at `HUMAN-GATE-08`      |
| 11. SePay production integration  | `[SHARED]`        | Human owns account/KYC/bank/OAuth consent/real transfer; stop at `HUMAN-GATE-09`                       |
| 12. Monitoring                    | `[AGENT]`         | None                                                                                                   |
| 13. DigitalOcean provisioning     | `[SHARED]`        | Human owns account, billing, console, DNS, and cost approval; gates `01`, `03`, `04`, and `05`         |
| 14. Deploy stack                  | `[SHARED]`        | Agent runs deployment; human supplies protected values and validates identity; gates `06` through `08` |
| 15. Smoke/demo verification       | `[AGENT]`         | Automated and browser verification; no real-money transfer                                             |
| 16. Backup/rollback/operations    | `[SHARED]`        | Human enables paid backup/storage and approves retention/restore target; stop at `HUMAN-GATE-11`       |
| 17. CI/CD and release             | `[SHARED]`        | Human configures GitHub controls and approves production deploy; `HUMAN-GATE-02` and `HUMAN-GATE-10`   |
| 18. Canonical docs                | `[AGENT]`         | Human review is optional; no execution gate                                                            |

Execution rules:

1. `[AGENT]` task: the agent implements and verifies the complete task without requesting routine confirmation.
2. `[SHARED]` task: the agent completes all agent-owned preparation first, then stops only at the explicitly named human step or `HUMAN-GATE`.
3. `[HUMAN]` step: the agent provides exact instructions and expected redacted evidence; the human performs the account/console/secret/payment action.
4. A human gate is complete only when its evidence is recorded. Creating code that depends on the external resource does not complete the gate.
5. Never perform later production actions by assuming a skipped human gate is complete.
6. Gate IDs are stable cross-references to Section 4. The task/step location, not the numeric gate ID, determines when the handoff occurs during plan execution.

### Task 1: Add Build Context Controls

**Ownership:** `[AGENT]`

**Files:**

- Create: `.dockerignore`

- [ ] Step 1: Create root `.dockerignore`

Use this content:

```dockerignore
.git
.github
.vscode
.codegraph
.env
.env.*
!*.env.example
node_modules
**/node_modules
dist
coverage
playwright-report
test-results
.nx/cache
.next
apps/management-app/.next
apps/customer-pwa/dist
docker/docker_data
*.log
tmp
docs/graduation-thesis-resources/thesis-report/build
```

- [ ] Step 2: Verify build context stays small

Run a real BuildKit build and inspect the `load build context` line:

```bash
docker buildx build \
  --platform linux/amd64 \
  --progress=plain \
  --no-cache \
  -f docker/backend.Dockerfile \
  --build-arg APP_NAME=bff \
  --load \
  -t qrtable-bff:context-smoke \
  .
```

Expected: transferred context stays bounded and contains no `node_modules`, `docker/docker_data`, `.codegraph`, test reports, or private `.env`. Do not use `docker buildx du` for this check; that command reports builder disk usage, not build-context size.

### Task 2: Build Backend Images

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker/backend.Dockerfile`
- Create: `tools/deploy/phase7-build-images.sh`
- Create: `tools/deploy/phase7-render-service-envs.sh`

- [ ] Step 1: Create a parametric backend Dockerfile

Use a single Dockerfile with `APP_NAME` so all eight NestJS services share the same build pattern:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
ARG APP_NAME
RUN test -n "$APP_NAME"
RUN pnpm nx build "$APP_NAME" --configuration=production
RUN pnpm --dir "dist/apps/$APP_NAME" install --prod --frozen-lockfile

FROM node:22.22.3-alpine3.23 AS runtime
ARG APP_NAME
ENV NODE_ENV=production
ENV APP_NAME=$APP_NAME
WORKDIR /app
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/${APP_NAME} ./
USER qrtable
EXPOSE 3300 3301 3303 3304 3305 3306 3307 3308 3201 3203 3204 3205 3206 3207 3208
CMD ["node", "main.js"]
```

- [ ] Step 2: Create image build script

Use this content:

```bash
#!/usr/bin/env bash
set -euo pipefail

IMAGE_REPOSITORY="${IMAGE_REPOSITORY:-registry.digitalocean.com/qrtable/qrtable}"
IMAGE_TAG="${IMAGE_TAG:-phase7}"
PLATFORM="${PLATFORM:-linux/amd64}"
BACKEND_APPS=(bff authorizer catalog order kitchen payment saas user-access)

if [[ "${PUSH_IMAGES:-false}" == "true" ]]; then
  OUTPUT_ARGS=(--push)
else
  OUTPUT_ARGS=(--load)
fi

for app in "${BACKEND_APPS[@]}"; do
  docker buildx build \
    --platform "${PLATFORM}" \
    -f docker/backend.Dockerfile \
    --build-arg APP_NAME="${app}" \
    -t "${IMAGE_REPOSITORY}:${app}-${IMAGE_TAG}" \
    "${OUTPUT_ARGS[@]}" \
    .
done
```

The implementation may express the output selection differently, but it must select exactly one of `--load` for local verification or `--push` for CI. All twelve release artifacts share one DOCR repository and use service-prefixed tags.

Tasks 3, 4, 5, and 9 must append the Management App, Customer PWA, Keycloak, and migration builds to this script. The script must fail unless all twelve expected tags are built or pushed.

- [ ] Step 3: Verify one backend image before building all

Run:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:phase7-smoke .
docker run --rm qrtable-bff:phase7-smoke node --version
```

Expected: build exits 0 and Node prints a version.

### Task 3: Build Management App Image

**Ownership:** `[AGENT]`

**Files:**

- Modify: `apps/management-app/next.config.ts`
- Create: `docker/management-app.Dockerfile`

- [ ] Step 1: Enable Next.js standalone output

Change `next.config.ts` to include:

```typescript
const nextConfig: NextConfig = {
  output: 'standalone',
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        pathname: '/**',
      },
    ],
  },
  turbopack: {
    root: workspaceRoot,
  },
  transpilePackages: [
    '@einvoice/types',
    '@einvoice/shared-constants',
    '@einvoice/frontend-ui',
    '@einvoice/frontend-hooks',
    '@einvoice/frontend-utils',
  ],
};
```

- [ ] Step 2: Create Dockerfile

Use this content:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps/management-app/package.json apps/management-app/pnpm-lock.yaml ./apps/management-app/
COPY apps ./apps
COPY libs ./libs
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
ARG NEXT_PUBLIC_BFF_URL
ARG NEXT_PUBLIC_BFF_BASE_URL
ARG NEXT_PUBLIC_CUSTOMER_PWA_URL
ENV NEXT_PUBLIC_BFF_URL=$NEXT_PUBLIC_BFF_URL
ENV NEXT_PUBLIC_BFF_BASE_URL=$NEXT_PUBLIC_BFF_BASE_URL
ENV NEXT_PUBLIC_CUSTOMER_PWA_URL=$NEXT_PUBLIC_CUSTOMER_PWA_URL
RUN pnpm nx build management-app

FROM node:22.22.3-alpine3.23 AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/standalone ./
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/static ./apps/management-app/.next/static
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/public ./apps/management-app/public
USER qrtable
EXPOSE 3000
CMD ["node", "apps/management-app/server.js"]
```

- [ ] Step 3: Verify image

Run:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/management-app.Dockerfile \
  --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
  -t qrtable-management-app:phase7-smoke .
```

Expected: build exits 0.

### Task 4: Build Customer PWA Image

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker/customer-pwa.Dockerfile`

- [ ] Step 1: Create static PWA image

Use this content:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
ARG VITE_BFF_URL
ARG VITE_TENANT_ID
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm nx build customer-pwa

FROM nginx:1.30.1-alpine3.23 AS runtime
COPY --from=build /workspace/apps/customer-pwa/dist /usr/share/nginx/html
COPY docker/nginx/customer-pwa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

- [ ] Step 2: Add SPA fallback config

Create `docker/nginx/customer-pwa.conf`:

```nginx
server {
  listen 80;
  server_name _;
  root /usr/share/nginx/html;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

- [ ] Step 3: Verify image

Run:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/customer-pwa.Dockerfile \
  --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg VITE_TENANT_ID=seed-tenant-fallback \
  -t qrtable-customer-pwa:phase7-smoke .
```

Expected: build exits 0.

### Task 5: Replace Dev Provider Compose With Production Infra Compose

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker-compose.infra.yaml`
- Create: `docker/keycloak.Dockerfile`
- Reuse: `docker/postgres/init/001-create-service-databases.sql`
- Create: `docker/postgres/init/002-create-keycloak-database.sql`

- [x] Step 1: Reuse the implemented service database init SQL

The existing idempotent PostgreSQL init script already creates the four application databases on one PostgreSQL instance:

```sql
SELECT 'CREATE DATABASE qrtable_catalog'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_catalog')\gexec

SELECT 'CREATE DATABASE qrtable_order'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_order')\gexec

SELECT 'CREATE DATABASE qrtable_payment'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_payment')\gexec

SELECT 'CREATE DATABASE qrtable_saas'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_saas')\gexec
```

Do not use `pnpm db:provision` on the Droplet. That command intentionally refuses non-local PostgreSQL hosts and exists for local development.

- [ ] Step 2: Create the Keycloak database init SQL

Use a separate idempotent init file:

```sql
SELECT 'CREATE DATABASE qrtable_keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_keycloak')\gexec
```

Per-service PostgreSQL users remain a follow-up hardening task. For the first Phase 7 pilot, one strong PostgreSQL app user is acceptable when the database network is internal and credentials remain private.

PostgreSQL entrypoint init files run only when `postgres_data` is empty. Preflight must verify all five databases exist. When adopting this plan on an existing volume, explicitly execute the idempotent init SQL through `psql`; do not assume adding a file under `docker-entrypoint-initdb.d` will mutate an initialized cluster.

- [ ] Step 3: Build an optimized Keycloak image with the QRTable theme

Do not build the theme on the Droplet. The provisioned server intentionally has Docker but does not require Node.js or pnpm. Package the provider jar into an immutable Keycloak image during CI:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23 AS theme
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/keycloak-theme ./apps/keycloak-theme
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm theme:build

FROM quay.io/keycloak/keycloak:26.6.2 AS builder
COPY --from=theme /workspace/apps/keycloak-theme/dist_keycloak/keycloak-theme-for-kc-all-other-versions.jar /opt/keycloak/providers/qrtable-theme.jar
RUN touch -m --date=@1743465600 /opt/keycloak/providers/qrtable-theme.jar
RUN /opt/keycloak/bin/kc.sh build --db=postgres --health-enabled=true

FROM quay.io/keycloak/keycloak:26.6.2
COPY --from=builder /opt/keycloak/ /opt/keycloak/
ENTRYPOINT ["/opt/keycloak/bin/kc.sh"]
CMD ["start", "--optimized"]
```

At implementation time, pin the base image by digest after compatibility and vulnerability checks. Build and publish it as `${IMAGE_REPOSITORY}:keycloak-${IMAGE_TAG}`.

- [ ] Step 4: Create production infra compose

Key requirements:

- Pin supported patch versions by digest.
- No public ports for databases, Redis, Kafka, or Keycloak internal port.
- Use named volumes, not bind-mounted `docker/docker_data`.
- Use container health checks for PostgreSQL, MongoDB, Redis, and Kafka; poll Keycloak readiness from the tooling image because the official Keycloak image does not include `curl`.
- Set Kafka advertised listener to `kafka:9092` for app containers.
- Run the custom optimized Keycloak image with production `start --optimized`, not `start-dev`.
- Join Keycloak to both `qrtable-infra` and `qrtable-edge` so it can reach PostgreSQL and Caddy can reach Keycloak.

Skeleton:

```yaml
name: qrtable-infra

networks:
  qrtable-edge:
    name: qrtable-edge
  qrtable-app:
    name: qrtable-app
    internal: true
  qrtable-infra:
    name: qrtable-infra
    internal: true

volumes:
  postgres_data:
  mongodb_data:
  redis_data:
  kafka_data:

services:
  postgres:
    image: postgres:16.13-alpine
    restart: unless-stopped
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: qrtable_bootstrap
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
    networks:
      - qrtable-infra
    healthcheck:
      test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d qrtable_bootstrap']
      interval: 10s
      timeout: 5s
      retries: 10

  mongodb:
    image: mongo:7.0.31
    restart: unless-stopped
    environment:
      MONGO_INITDB_ROOT_USERNAME: ${MONGO_ROOT_USERNAME}
      MONGO_INITDB_ROOT_PASSWORD: ${MONGO_ROOT_PASSWORD}
    volumes:
      - mongodb_data:/data/db
    networks:
      - qrtable-infra
    healthcheck:
      test: ['CMD', 'mongosh', '--quiet', '--eval', 'db.adminCommand({ ping: 1 })']
      interval: 10s
      timeout: 5s
      retries: 10

  redis:
    image: redis:7.4.9-alpine
    restart: unless-stopped
    command: ['redis-server', '--appendonly', 'yes']
    volumes:
      - redis_data:/data
    networks:
      - qrtable-infra
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
      interval: 10s
      timeout: 5s
      retries: 10

  kafka:
    image: apache/kafka:4.3.0
    hostname: kafka
    restart: unless-stopped
    environment:
      KAFKA_NODE_ID: 1
      KAFKA_PROCESS_ROLES: broker,controller
      KAFKA_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_LISTENERS: CONTROLLER://:9093,PLAINTEXT://:9092
      KAFKA_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CONTROLLER_QUORUM_VOTERS: 1@kafka:9093
      KAFKA_INTER_BROKER_LISTENER_NAME: PLAINTEXT
      KAFKA_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_OFFSETS_TOPIC_REPLICATION_FACTOR: 1
      KAFKA_TRANSACTION_STATE_LOG_MIN_ISR: 1
      KAFKA_TRANSACTION_STATE_LOG_REPLICATION_FACTOR: 1
      KAFKA_GROUP_INITIAL_REBALANCE_DELAY_MS: 0
      KAFKA_AUTO_CREATE_TOPICS_ENABLE: 'true'
      KAFKA_LOG_DIRS: /var/lib/kafka/data
      CLUSTER_ID: ${KAFKA_CLUSTER_ID}
    volumes:
      - kafka_data:/var/lib/kafka/data
    networks:
      - qrtable-infra
    healthcheck:
      test: ['CMD-SHELL', '/opt/kafka/bin/kafka-topics.sh --bootstrap-server 127.0.0.1:9092 --list >/dev/null 2>&1']
      interval: 15s
      timeout: 10s
      retries: 12
      start_period: 30s

  keycloak:
    image: ${IMAGE_REPOSITORY}:keycloak-${IMAGE_TAG}
    restart: unless-stopped
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/qrtable_keycloak
      KC_DB_USERNAME: ${POSTGRES_USER}
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_HOSTNAME: https://auth.qrtable.vodinhquan.dev
      KC_HOSTNAME_STRICT: 'true'
      KC_HOSTNAME_BACKCHANNEL_DYNAMIC: 'true'
      KC_HTTP_ENABLED: 'true'
      KC_PROXY_HEADERS: xforwarded
      KC_HEALTH_ENABLED: 'true'
      KC_BOOTSTRAP_ADMIN_USERNAME: ${KEYCLOAK_ADMIN_USER}
      KC_BOOTSTRAP_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: ['start', '--optimized']
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - qrtable-infra
      - qrtable-edge
```

- [ ] Step 5: Verify interpolation, compose syntax, networks, and readiness

Run:

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.infra.yaml
```

Expected:

- Compose renders with no syntax error or unresolved `${...}` values.
- `keycloak` joins `qrtable-edge` and `qrtable-infra`.
- No infra container publishes a host port.
- `phase7-preflight.sh --wait-infra` waits for datastore health and polls `http://keycloak:9000/health/ready` from the migration/tooling container on `qrtable-infra`.
- A KafkaJS smoke using the repository's installed client creates/uses a test topic, produces one event, and consumes it successfully against Kafka `4.3.0`.

### Task 6: Create App Compose Layer

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker-compose.app.yaml`

- [ ] Step 1: Create app compose

Set service hosts to Docker Compose service names:

```yaml
name: qrtable-app

networks:
  qrtable-app:
    external: true
    name: qrtable-app
  qrtable-infra:
    external: true
    name: qrtable-infra
  qrtable-edge:
    external: true
    name: qrtable-edge

services:
  bff:
    image: ${IMAGE_REPOSITORY}:bff-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/bff.env
    environment:
      PORT: 3300
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      KEYCLOAK_HOST: https://auth.qrtable.vodinhquan.dev
      PUBLIC_API_BASE_URL: https://api.qrtable.vodinhquan.dev
      AUTHORIZER_SERVICE_HOST: authorizer
      USER_ACCESS_SERVICE_HOST: user-access
      TCP_ORDER_SERVICE_HOST: order
      TCP_CATALOG_SERVICE_HOST: catalog
      TCP_KITCHEN_SERVICE_HOST: kitchen
      TCP_PAYMENT_SERVICE_HOST: payment
      TCP_SAAS_SERVICE_HOST: saas
      TCP_AUTHORIZER_SERVICE_HOST: authorizer
      TCP_USER_ACCESS_SERVICE_HOST: user-access
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: bff
    networks:
      - qrtable-edge
      - qrtable-app
      - qrtable-infra

  order:
    image: ${IMAGE_REPOSITORY}:order-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/order.env
    environment:
      ORDER_PORT: 3301
      TYPEORM_HOST: postgres
      ORDER_TYPEORM_DATABASE: qrtable_order
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      ORDER_SERVICE_HOST: 0.0.0.0
      TCP_CATALOG_SERVICE_HOST: catalog
      TCP_SAAS_SERVICE_HOST: saas
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: order
    networks:
      - qrtable-app
      - qrtable-infra

  catalog:
    image: ${IMAGE_REPOSITORY}:catalog-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/catalog.env
    environment:
      CATALOG_PORT: 3305
      TYPEORM_HOST: postgres
      CATALOG_TYPEORM_DATABASE: qrtable_catalog
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
      KAFKA_BROKERS: kafka:9092
      CATALOG_SERVICE_HOST: 0.0.0.0
      TCP_SAAS_SERVICE_HOST: saas
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: catalog
    networks:
      - qrtable-app
      - qrtable-infra

  kitchen:
    image: ${IMAGE_REPOSITORY}:kitchen-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/kitchen.env
    environment:
      KITCHEN_PORT: 3307
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      KITCHEN_SERVICE_HOST: 0.0.0.0
      TCP_ORDER_SERVICE_HOST: order
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: kitchen
    networks:
      - qrtable-app
      - qrtable-infra

  payment:
    image: ${IMAGE_REPOSITORY}:payment-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/payment.env
    environment:
      PAYMENT_PORT: 3308
      TYPEORM_HOST: postgres
      PAYMENT_TYPEORM_DATABASE: qrtable_payment
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      PUBLIC_API_BASE_URL: https://api.qrtable.vodinhquan.dev
      PAYMENT_SERVICE_HOST: 0.0.0.0
      TCP_ORDER_SERVICE_HOST: order
      TCP_SAAS_SERVICE_HOST: saas
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: payment
    networks:
      - qrtable-app
      - qrtable-infra

  saas:
    image: ${IMAGE_REPOSITORY}:saas-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/saas.env
    environment:
      SAAS_PORT: 3306
      TYPEORM_HOST: postgres
      SAAS_TYPEORM_DATABASE: qrtable_saas
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      SAAS_SERVICE_HOST: 0.0.0.0
      TCP_AUTHORIZER_SERVICE_HOST: authorizer
      TCP_USER_ACCESS_SERVICE_HOST: user-access
      TCP_CATALOG_SERVICE_HOST: catalog
      TCP_ORDER_SERVICE_HOST: order
      TCP_PAYMENT_SERVICE_HOST: payment
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: saas
    networks:
      - qrtable-app
      - qrtable-infra

  authorizer:
    image: ${IMAGE_REPOSITORY}:authorizer-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/authorizer.env
    environment:
      AUTHORIZER_PORT: 3304
      KEYCLOAK_HOST: http://keycloak:8080
      AUTHORIZER_SERVICE_HOST: 0.0.0.0
      USER_ACCESS_SERVICE_HOST: user-access
      TCP_USER_ACCESS_SERVICE_HOST: user-access
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: authorizer
    networks:
      - qrtable-app
      - qrtable-infra

  user-access:
    image: ${IMAGE_REPOSITORY}:user-access-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/user-access.env
    environment:
      USER_ACCESS_PORT: 3303
      USER_ACCESS_MONGO_DB_NAME: qrtable_auth
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
      USER_ACCESS_SERVICE_HOST: 0.0.0.0
      AUTHORIZER_SERVICE_HOST: authorizer
      TCP_AUTHORIZER_SERVICE_HOST: authorizer
      TCP_SAAS_SERVICE_HOST: saas
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: user-access
    networks:
      - qrtable-app
      - qrtable-infra

  management-app:
    image: ${IMAGE_REPOSITORY}:management-app-${IMAGE_TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/env/management-app.env
    environment:
      AUTH_URL: https://app.qrtable.vodinhquan.dev
      AUTH_TRUST_HOST: 'true'
      AUTH_KEYCLOAK_ISSUER: https://auth.qrtable.vodinhquan.dev/realms/qrtable
      MANAGEMENT_BFF_BASE_URL: https://api.qrtable.vodinhquan.dev/api/v1
      NEXT_PUBLIC_BFF_BASE_URL: https://api.qrtable.vodinhquan.dev/api/v1
      NEXT_PUBLIC_BFF_URL: https://api.qrtable.vodinhquan.dev/api/v1
      NEXT_PUBLIC_CUSTOMER_PWA_URL: https://qr.qrtable.vodinhquan.dev
    labels:
      app: management-app
    networks:
      - qrtable-edge
      - qrtable-app

  customer-pwa:
    image: ${IMAGE_REPOSITORY}:customer-pwa-${IMAGE_TAG}
    restart: unless-stopped
    labels:
      app: customer-pwa
    networks:
      - qrtable-edge
```

- [ ] Step 2: Add app health checks as part of the production compose

Use HTTP checks:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:3300/api/v1/health/live || exit 1']
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Adjust paths per service prefix:

- BFF: `/api/v1/health/live`
- Order/Catalog/Kitchen/Payment/SaaS: `/api/v1/health/live`
- Authorizer/User-Access: `/api/health/live`

- [ ] Step 3: Verify the listener/client host matrix

The compose environment must satisfy the current code contract:

| Container   | Listener variables set to `0.0.0.0`              | TCP/gRPC client hosts set to service names                                  |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| BFF         | none                                             | all seven `TCP_*`; `AUTHORIZER_SERVICE_HOST`; `USER_ACCESS_SERVICE_HOST`    |
| Order       | `ORDER_SERVICE_HOST`                             | Catalog, SaaS                                                               |
| Catalog     | `CATALOG_SERVICE_HOST`                           | SaaS                                                                        |
| Kitchen     | `KITCHEN_SERVICE_HOST`                           | Order                                                                       |
| Payment     | `PAYMENT_SERVICE_HOST`                           | Order, SaaS                                                                 |
| SaaS        | `SAAS_SERVICE_HOST`                              | Authorizer, User-Access, Catalog, Order, Payment                            |
| Authorizer  | `AUTHORIZER_SERVICE_HOST` for both TCP and gRPC  | User-Access through TCP and `USER_ACCESS_SERVICE_HOST` through gRPC         |
| User-Access | `USER_ACCESS_SERVICE_HOST` for both TCP and gRPC | Authorizer through TCP and `AUTHORIZER_SERVICE_HOST` through gRPC; SaaS TCP |

Run a container-level TCP/gRPC connectivity smoke before public acceptance. A process listening on `127.0.0.1` inside its own container is a deployment failure even if its HTTP health endpoint passes.

- [ ] Step 4: Verify app compose interpolation and network membership

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.app.yaml
```

Expected: every image resolves to `${IMAGE_REPOSITORY}:<service>-${IMAGE_TAG}`, no `${...}` placeholder remains, only BFF/Management App/Customer PWA join `qrtable-edge`, and no app service publishes a host port.

### Task 7: Add Reverse Proxy And HTTPS

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker/proxy/Caddyfile`
- Create: `docker-compose.proxy.yaml`

- [ ] Step 1: Create Caddyfile

```caddyfile
api.qrtable.vodinhquan.dev {
  reverse_proxy bff:3300
}

app.qrtable.vodinhquan.dev {
  reverse_proxy management-app:3000
}

qr.qrtable.vodinhquan.dev {
  reverse_proxy customer-pwa:80
}

auth.qrtable.vodinhquan.dev {
  reverse_proxy keycloak:8080
}

grafana.qrtable.vodinhquan.dev {
  basic_auth {
    {$GRAFANA_BASIC_AUTH_USER} {$GRAFANA_BASIC_AUTH_HASH}
  }
  reverse_proxy grafana:3000
}
```

Generate the Caddy basic-auth hash on the server:

```bash
docker run --rm caddy:2.11.3 caddy hash-password --plaintext "$GRAFANA_BASIC_AUTH_PASSWORD"
```

- [ ] Step 2: Create proxy compose

```yaml
name: qrtable-proxy

networks:
  qrtable-edge:
    external: true
    name: qrtable-edge

volumes:
  caddy_data:
  caddy_config:

services:
  caddy:
    image: caddy:2.11.3
    restart: unless-stopped
    env_file: /opt/qrtable/env/proxy.env
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./docker/proxy/Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    networks:
      - qrtable-edge
```

- [ ] Step 3: Verify Caddy config

Run:

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.proxy.yaml
```

Expected: compose renders with no syntax error, `basic_auth` is accepted by the pinned Caddy release, and Caddy can resolve `bff`, `management-app`, `customer-pwa`, `keycloak`, and `grafana` on `qrtable-edge`. Caddy handles WebSocket upgrades for the BFF reverse proxy automatically.

### Task 8: Prepare Production Env And Secrets

**Ownership:** `[SHARED]`

**Handoff:** The agent creates the template, generators, validators, scoped env renderer, and CORS implementation. The human enters externally issued production values directly into approved secret stores. Do not block implementation on those values; block the first live deployment at `HUMAN-GATE-06` and `HUMAN-GATE-07`.

**Files:**

- Create: `docker/env/.env.production.example`
- Create: `tools/deploy/phase7-compose-validate.sh`
- Create: `tools/deploy/phase7-render-service-envs.sh`

- [ ] Step 1: Create example with keys only and safe sample values `[AGENT]`

Include every required key, but do not include real secrets:

```dotenv
IMAGE_REPOSITORY=registry.digitalocean.com/qrtable/qrtable
IMAGE_TAG=phase7
DEPLOYMENT_PROFILE=production

NODE_ENV=production
GLOBAL_PREFIX=api/v1

POSTGRES_USER=qrtable_app
POSTGRES_PASSWORD=generate_on_server
MONGO_ROOT_USERNAME=qrtable_mongo
MONGO_ROOT_PASSWORD=generate_url_safe_hex_on_server

TYPEORM_HOST=postgres
TYPEORM_PORT=5432
TYPEORM_USERNAME=qrtable_app
TYPEORM_PASSWORD=generate_on_server
TYPEORM_TYPE=postgres
TYPEORM_SYNCHRONIZE=false
DATABASE_SHARED_FALLBACK_ENABLED=false
CATALOG_TYPEORM_DATABASE=qrtable_catalog
ORDER_TYPEORM_DATABASE=qrtable_order
PAYMENT_TYPEORM_DATABASE=qrtable_payment
SAAS_TYPEORM_DATABASE=qrtable_saas
USER_ACCESS_MONGO_DB_NAME=qrtable_auth

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TTL=1800000

KAFKA_BROKERS=kafka:9092
KAFKA_CLUSTER_ID=replace_with_one_stable_kraft_cluster_id
KAFKA_CLIENT_ID=qrtable-order-service
KAFKA_ORDER_CONFIRMED_TOPIC=order.confirmed
KAFKA_ORDER_STATUS_CHANGED_TOPIC=order.status_changed
KAFKA_KITCHEN_SLA_WARNING_TOPIC=kitchen.sla_warning
KAFKA_PAYMENT_COMPLETED_TOPIC=payment.completed
KAFKA_TENANT_CREATED_TOPIC=tenant.created
KAFKA_KITCHEN_CLIENT_ID=qrtable-kitchen-service
KAFKA_KITCHEN_CONSUMER_GROUP=kitchen-service-group
KAFKA_BFF_CLIENT_ID=qrtable-bff-bridge
KAFKA_BFF_CONSUMER_GROUP=bff-kafka-bridge
KAFKA_PAYMENT_CLIENT_ID=qrtable-payment-service
KAFKA_SAAS_CLIENT_ID=qrtable-saas-service

KEYCLOAK_ADMIN_USER=admin
KEYCLOAK_ADMIN_PASSWORD=generate_on_server
KEYCLOAK_HOST=https://auth.qrtable.vodinhquan.dev
KEYCLOAK_REALM=qrtable
KEYCLOAK_CLIENT_ID=qrtable-bff
KEYCLOAK_CLIENT_SECRET=generate_on_server
MANAGEMENT_APP_CLIENT_ID=management-app
MANAGEMENT_APP_CLIENT_SECRET=generate_on_server
AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=false

AUTH_SECRET=generate_on_server
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=generate_on_server
AUTH_KEYCLOAK_ISSUER=https://auth.qrtable.vodinhquan.dev/realms/qrtable

PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev
MANAGEMENT_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev
PLATFORM_CONTACT_EMAIL=support@your-domain.example
NEXT_PUBLIC_PLATFORM_CONTACT_EMAIL=support@your-domain.example
VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
VITE_TENANT_ID=seed-tenant-fallback
CORS_ORIGINS=https://app.qrtable.vodinhquan.dev,https://qr.qrtable.vodinhquan.dev

SEPAY_WEBHOOK_SECRET=generate_on_server_or_provider_value
SEPAY_PLATFORM_WEBHOOK_SECRET=generate_on_server_or_provider_value
BFF_PAYMENT_TCP_TIMEOUT_MS=5000
PAYMENT_SEPAY_QR_ACCOUNT=provider_value
PAYMENT_SEPAY_QR_BANK=provider_value
SEPAY_PLATFORM_QR_ACCOUNT=provider_value
SEPAY_PLATFORM_QR_BANK=provider_value
PAYMENT_ORDER_TCP_TIMEOUT_MS=5000
PAYMENT_SECRETS_ENCRYPTION_KEY=64_hex_chars
SEPAY_OAUTH_BASE_URL=https://my.sepay.vn
SEPAY_OAUTH_CLIENT_ID=provider_value
SEPAY_OAUTH_CLIENT_SECRET=provider_value
SEPAY_OAUTH_REDIRECT_URI=https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback

CLOUDINARY_CLOUD_NAME=provider_value
CLOUDINARY_API_KEY=provider_value
CLOUDINARY_API_SECRET=provider_value

OTEL_EXPORTER_OTLP_ENDPOINT=http://tempo:4318
LOG_LEVEL=info

GRAFANA_ADMIN_USER=admin
GRAFANA_ADMIN_PASSWORD=generate_on_server
GRAFANA_BASIC_AUTH_USER=admin
GRAFANA_BASIC_AUTH_HASH=generate_with_caddy
GRAFANA_BASIC_AUTH_PASSWORD=not_for_caddyfile
```

- [ ] Step 2: Generate server secrets `[SHARED]`

Run on the server:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

`[AGENT]` supplies the generation/validation procedure. `[HUMAN]` enters externally issued Cloudinary, SePay, bank, and other provider values directly into the protected production env without exposing them in chat, terminal history, or shared logs.

Expected:

- `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE`, `SAAS_TYPEORM_DATABASE`, and `USER_ACCESS_MONGO_DB_NAME` are all present.
- `DATABASE_SHARED_FALLBACK_ENABLED=false`.
- No service depends on `TYPEORM_DATABASE` or `MONGO_DB_NAME` in production.
- `PAYMENT_SECRETS_ENCRYPTION_KEY` is exactly 64 hex characters.
- `AUTH_SECRET`, DB passwords, Keycloak secrets, and Grafana passwords are strong random values.
- MongoDB credentials interpolated into `MONGODB_URI` are URL-safe hex or correctly percent-encoded.
- The real Caddy bcrypt value is single-quoted in `.env.production` so `$` characters remain literal, for example `GRAFANA_BASIC_AUTH_HASH='$2a$...'`.
- `IMAGE_REPOSITORY` points to the single DOCR repository and `IMAGE_TAG` is immutable for each release.
- `KAFKA_CLUSTER_ID` is generated once, stored in the production env, and reused for the lifetime of the Kafka data volume.
- `CORS_ORIGINS` contains only the exact Management App and Customer PWA origins.
- `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=false` unless a separately reviewed production onboarding policy intentionally enables it.
- The actual `/opt/qrtable/.env.production` is never committed.

- [ ] Step 3: Validate Compose without leaking interpolation values `[AGENT]`

Create `phase7-compose-validate.sh`:

- Set `umask 077`.
- Capture both `docker compose --env-file /opt/qrtable/.env.production ... config` and `config --environment` into temporary files.
- Reject unresolved `${...}` placeholders, empty required release variables, unexpected public ports, and direct references to the master env as a service-level `env_file`.
- Never stream the captured files to stdout/stderr or upload them as CI artifacts.
- Remove them through a `trap` on success, failure, or interruption.
- Print only a redacted pass/fail summary with compose filenames and failed key names, never values.

- [ ] Step 4: Render least-privilege runtime env files `[AGENT]`

Use `/opt/qrtable/.env.production` as the private master source for Compose interpolation and deployment tooling only. Do not inject that file wholesale into application containers.

Create `phase7-render-service-envs.sh` with explicit allowlists for:

```text
/opt/qrtable/env/bff.env
/opt/qrtable/env/order.env
/opt/qrtable/env/catalog.env
/opt/qrtable/env/kitchen.env
/opt/qrtable/env/payment.env
/opt/qrtable/env/saas.env
/opt/qrtable/env/authorizer.env
/opt/qrtable/env/user-access.env
/opt/qrtable/env/management-app.env
/opt/qrtable/env/migrations.env
/opt/qrtable/env/identity-bootstrap.env
/opt/qrtable/env/proxy.env
```

Requirements:

- Create `/opt/qrtable/env` with mode `0700` and each file atomically with mode `0600`.
- Maintain the variable allowlist in source control, but never write secret values to logs.
- Fail if a required variable is missing or if an unknown variable is requested by a service mapping.
- Derive `MONGODB_URI` only inside the renderer from URL-safe credentials and include `authSource=admin`; do not duplicate the full URI in the master env.
- Copy safe common runtime values such as `NODE_ENV=production`, `GLOBAL_PREFIX`, OTEL endpoint, and log level only to services that consume them.
- Keep DB credentials out of BFF/frontends, SePay credentials out of unrelated services, Keycloak admin credentials out of app containers, and Grafana basic-auth material only in `proxy.env`.
- `migrations.env` receives only database/migration variables. `identity-bootstrap.env` separately owns Keycloak admin/client and optional Mongo identity-sync values.
- Preflight rejects any service whose `env_file` points directly to the master `.env.production`.

Minimum ownership mapping:

| Env file                 | Owned configuration groups                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------- |
| `bff.env`                | BFF runtime, Redis, BFF Kafka, webhook forwarding secret, Cloudinary, public URLs/contact |
| `order.env`              | Order PostgreSQL, Redis, Order Kafka                                                      |
| `catalog.env`            | Catalog PostgreSQL                                                                        |
| `kitchen.env`            | Redis, Kitchen Kafka                                                                      |
| `payment.env`            | Payment PostgreSQL, Redis, Payment Kafka, SePay tenant OAuth/webhook encryption           |
| `saas.env`               | SaaS PostgreSQL, Redis, SaaS Kafka, SePay platform payment configuration                  |
| `authorizer.env`         | Keycloak realm/client credentials and auth provisioning policy                            |
| `user-access.env`        | MongoDB/User-Access configuration                                                         |
| `management-app.env`     | Auth.js secret, Keycloak browser client, public/server BFF and PWA URLs                   |
| `migrations.env`         | Four PostgreSQL database contracts and ownership-verification values                      |
| `identity-bootstrap.env` | Keycloak admin/client values; Mongo sync values only for explicitly enabled demo users    |
| `proxy.env`              | Caddy/Grafana basic-auth values only                                                      |

- [ ] Step 5: Implement and test the production CORS allowlist `[AGENT]`

Before public deployment:

- Parse `CORS_ORIGINS` once in BFF configuration and reject wildcard `*` when `NODE_ENV=production`.
- Reuse the same allowlist in `app.enableCors(...)` and `@WebSocketGateway(...)`.
- Add tests for allowed Management/PWA origins, a rejected unlisted origin, and production startup failure for an empty or wildcard allowlist.
- Add external preflight checks for both HTTP and Socket.IO handshake origins.

This is a production blocker, not a follow-up enhancement.

### Task 9: Package And Run Existing Per-Service Migrations

**Ownership:** `[AGENT]`

**Files:**

- Reuse: `apps/catalog/src/database/`
- Reuse: `apps/order/src/database/`
- Reuse: `apps/payment/src/database/`
- Reuse: `apps/saas/src/database/`
- Create: `docker/migrations.Dockerfile`
- Create: `docker-compose.migrations.yaml`
- Modify: `tools/deploy/phase7-build-images.sh`
- Create: `tools/deploy/phase7-migrate.sh`
- Create: `tools/deploy/phase7-seed-demo.sh`

- [x] Step 1: Use the implemented migration strategy

The schema strategy is no longer an open decision. QRTable uses service-owned TypeORM migrations:

```text
Catalog -> apps/catalog/src/database/migrations
Order   -> apps/order/src/database/migrations
Payment -> apps/payment/src/database/migrations
SaaS    -> apps/saas/src/database/migrations
```

The root commands are:

```bash
pnpm db:migrate
pnpm db:migration:show
pnpm db:verify:ownership
```

Rejected production strategies:

- Running the Droplet with `NODE_ENV=development`.
- Depending on `TYPEORM_SYNCHRONIZE=true`.
- Maintaining a second hand-written schema SQL that can drift from the project-owned migrations.

- [ ] Step 2: Build a dedicated migration image

The backend runtime images contain compiled app bundles and should remain small. Create a one-shot migration image that includes the TypeScript migration sources, Nx, `ts-node`, `tsconfig-paths`, database verification tools, and production environment contract:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.22.3-alpine3.23
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable && corepack prepare pnpm@9.8.0 --activate
RUN apk add --no-cache bash curl jq
WORKDIR /workspace

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
COPY tools ./tools

RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile --prod=false

ENV NODE_ENV=production
CMD ["pnpm", "db:migrate"]
```

Build and push it with the same immutable tag as the app images:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/migrations.Dockerfile \
  -t "${IMAGE_REPOSITORY}:migrations-${IMAGE_TAG}" \
  .
```

Append the migration image build to `tools/deploy/phase7-build-images.sh` so a release cannot publish app images without the matching migration artifact.

- [ ] Step 3: Create the one-shot migration compose

```yaml
name: qrtable-migrations

networks:
  qrtable-infra:
    external: true
    name: qrtable-infra

services:
  migrations:
    image: ${IMAGE_REPOSITORY}:migrations-${IMAGE_TAG}
    env_file: /opt/qrtable/env/migrations.env
    networks:
      - qrtable-infra

  identity-bootstrap:
    image: ${IMAGE_REPOSITORY}:migrations-${IMAGE_TAG}
    env_file: /opt/qrtable/env/identity-bootstrap.env
    networks:
      - qrtable-infra
```

Neither one-shot service exposes ports, restarts automatically, or stays running after its command exits. Database migrations run only through `migrations`; Keycloak bootstrap runs only through `identity-bootstrap`.

- [ ] Step 4: Run migrations before app containers

`tools/deploy/phase7-migrate.sh` must run:

```bash
COMPOSE_ENV=(--env-file /opt/qrtable/.env.production)
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:migrate
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:migration:show
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:verify:ownership
```

Expected:

- Catalog, Order, Payment, and SaaS report all expected migrations as applied.
- `qrtable_catalog` contains only Catalog-owned tables plus `typeorm_migrations`.
- `qrtable_order` contains only Order-owned tables and its outbox plus `typeorm_migrations`.
- `qrtable_payment` contains only Payment-owned tables and its outbox plus `typeorm_migrations`.
- `qrtable_saas` contains only SaaS-owned tables and its outbox plus `typeorm_migrations`.
- Any migration or ownership failure stops deployment before app replacement.

- [ ] Step 5: Separate production bootstrap from destructive development reseed

Do not run this command on the Droplet:

```bash
pnpm dev:reseed -- --yes
```

It intentionally drops/recreates local service databases, resets deterministic development fixtures, rebuilds the Keycloak realm, and flushes Redis.

Production behavior:

- Default production deploy: run migrations and Keycloak bootstrap only; do not seed business demo data.
- Thesis demo profile: run `tools/deploy/phase7-seed-demo.sh --yes` only when `DEPLOYMENT_PROFILE=demo`.
- The demo seed script must insert or upsert deterministic demo records without dropping databases, deleting unrelated tenants, rebuilding Keycloak, or flushing shared state.
- The script must refuse to run when `NODE_ENV` is not `production`, `DEPLOYMENT_PROFILE` is not `demo`, or `--yes` is missing.

After an optional demo seed, run read-only verification:

```bash
pnpm db:verify:ownership
./tools/deploy/phase7-smoke.sh --demo-data
```

Seed IDs used by E2E must be written to a non-secret deployment notes file.

### Task 10: Bootstrap Keycloak For Public Domains

**Ownership:** `[SHARED]`

**Handoff:** The agent packages the theme and automates realm/client bootstrap. After the public identity service is running, the human creates and verifies the permanent administrator and completes `HUMAN-GATE-08`.

**Files:**

- Create: `docker/keycloak.Dockerfile`
- Modify or wrap: `tools/keycloak-bootstrap.sh`
- Create: `tools/deploy/phase7-keycloak-bootstrap.sh`

- [ ] Step 1: Package the Keycloak theme in the immutable image `[AGENT]`

Build the custom optimized Keycloak image in Task 5 and publish it with the release. The Droplet must not run `pnpm theme:build` and must not bind-mount a mutable host theme directory.

- [ ] Step 2: Split infrastructure bootstrap from demo-user bootstrap `[AGENT]`

The current `tools/keycloak-bootstrap.sh` is unsafe for production because it requires `tools/auth-bootstrap-users.json`, resets every listed password on each run, and the committed file contains deterministic demo passwords.

Refactor or wrap it so:

- Realm, roles, protocol mappers, service account permissions, clients, client secrets, redirect URIs, and web origins are idempotently created **and updated** on every run.
- `qrtable-bff` remains a confidential machine/direct-grant client for the current source behavior: service accounts and direct grants enabled, browser standard flow disabled, and no browser redirect URI/web origin.
- `management-app` remains a confidential browser client: standard flow enabled, direct grants/service accounts disabled unless source evidence requires them, exact Auth.js callback URI, and exact app web origin.
- `AUTH_BOOTSTRAP_USERS_ENABLED=false` is the default production behavior.
- Demo users are only created or updated when `DEPLOYMENT_PROFILE=demo`, `AUTH_BOOTSTRAP_USERS_ENABLED=true`, and an explicit `--yes` flag are all present.
- Production bootstrap never reads `tools/auth-bootstrap-users.json` and never resets a human user's password.
- `KEYCLOAK_CLEAN_REALM=true` remains restricted to local hosts and is never used by Phase 7 deployment.
- MongoDB user synchronization runs only for the explicitly enabled user-bootstrap path.

- [ ] Step 3: Bootstrap realm and clients from the infra network `[AGENT]`

Run the bootstrap through the migration/tooling image so `keycloak` and `mongodb` resolve on the internal Docker network. Public redirect URIs still use the production domains:

```bash
docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.migrations.yaml \
  run --rm \
  -e KEYCLOAK_HOST=http://keycloak:8080 \
  -e KEYCLOAK_MASTER_SSL_REQUIRED=external \
  -e KEYCLOAK_REALM_SSL_REQUIRED=external \
  -e KEYCLOAK_MANAGEMENT_REDIRECT_URIS=https://app.qrtable.vodinhquan.dev/api/auth/callback/keycloak \
  -e KEYCLOAK_MANAGEMENT_WEB_ORIGINS=https://app.qrtable.vodinhquan.dev \
  -e AUTH_BOOTSTRAP_USERS_ENABLED=false \
  identity-bootstrap bash tools/deploy/phase7-keycloak-bootstrap.sh
```

- [ ] Step 4: Verify redirect URIs, web origins, and public issuer `[SHARED]`

Ensure Keycloak clients include:

```text
management-app redirect:
https://app.qrtable.vodinhquan.dev/api/auth/callback/keycloak

management-app web origin:
https://app.qrtable.vodinhquan.dev

qrtable-bff redirect/origin:
none for the current service-account/direct-grant flow
```

Expected:

- Management App login redirects through `auth.qrtable.vodinhquan.dev`.
- Tokens expose the public issuer `https://auth.qrtable.vodinhquan.dev/realms/qrtable`.
- Authorizer reaches Keycloak internally at `http://keycloak:8080` for token/JWKS/admin calls without exposing Keycloak's container port.
- BFF Authorizer can exchange client tokens with Keycloak.
- Default production bootstrap creates no deterministic demo users and resets no user passwords.
- Demo-only users, when explicitly enabled, are synchronized into MongoDB `qrtable_auth`, not the legacy `qrtable` database.

At the live-production portion of this step, `[HUMAN]` creates and verifies the permanent named administrator, removes the temporary bootstrap administrator, and records `HUMAN-GATE-08`. The agent performs all machine-verifiable issuer, client, role, and login-flow checks.

### Task 11: Configure SePay Production Integration

**Ownership:** `[SHARED]`

SePay is a production dependency, not only an env-var detail. The deployment is not ready until the SePay dashboard/API configuration matches QRTable's public routes and the code path being used.

Human ownership:

- `[HUMAN]` Account registration, verification/KYC, terms, bank linking, OAuth application approval, dashboard webhook configuration, and any real transfer.
- `[AGENT]` Source verification, route implementation, preflight, negative tests, idempotency/audit checks, and redacted evidence.
- Complete `HUMAN-GATE-09` in section 4.11 before marking this task production-ready.

**Provider docs verified:**

- SePay Bank Hub webhook setup can upsert an HTTPS webhook URL.
- Secret-key webhook auth sends a secret in `X-Secret-Key`.
- Webhook/IPN payloads include `id`, `gateway`, `transactionDate`, `accountNumber`, `code`, `content`, `transferType`, `transferAmount`, `accumulated`, `referenceCode`, and `description`.
- Successful webhook handling should return a simple JSON success result.

**Current QRTable source behavior:**

- BFF public origin must be `PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev`.
- Tenant bill payments use `QRTBL`.
- Platform subscription invoices use `QRSUB`.
- Tenant route: `POST /api/v1/payment/sepay/webhook/:tenantSlug`.
- Platform route: `POST /api/v1/payment/sepay/webhook/platform`.
- Legacy lab route: `POST /api/v1/payment/sepay/webhook`.
- Payment service stores per-tenant webhook secrets in `tenant_payment_settings`.
- SaaS service verifies `SEPAY_PLATFORM_WEBHOOK_SECRET` for platform subscription webhooks.
- Payment OAuth state is stored in Redis as `oauth_state:{state}` with short TTL.

**Files:**

- Update: `docs/guides/phase-7-digitalocean-deployment.md`
- Verify and possibly update: `docs/guides/sepay-configuration-guide-phase3.md`
- Create: `tools/deploy/phase7-sepay-preflight.md` or a script if provider automation is stable

- [ ] Step 1: Choose the live SePay route set `[SHARED]`

For the first production deployment, prefer the provider-verified secret-key routes:

```text
Tenant QRTBL:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/{tenantSlug}

Platform QRSUB:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Use the legacy HMAC route only for lab/dev compatibility unless the actual SePay account/product confirms the `X-SePay-Signature` and `X-SePay-Timestamp` flow:

```text
Legacy lab route:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook
```

- [ ] Step 2: Configure platform subscription webhook `[HUMAN]`

In SePay dashboard/API:

```text
webhook_url = https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
auth = secret key
secret = SEPAY_PLATFORM_WEBHOOK_SECRET
active = true
events = incoming transaction events
```

Expected:

- SePay can reach the public HTTPS endpoint.
- Missing or wrong secret returns unauthorized.
- Valid platform secret allows BFF to forward to SaaS.
- SaaS ignores `QRTBL` payloads on platform route and only settles `QRSUB`.

- [ ] Step 3: Configure tenant OAuth Connect `[SHARED]`

In SePay OAuth app:

```text
redirect_uri = https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
```

In QRTable production env:

```text
SEPAY_OAUTH_BASE_URL=https://my.sepay.vn
SEPAY_OAUTH_CLIENT_ID=...
SEPAY_OAUTH_CLIENT_SECRET=...
SEPAY_OAUTH_REDIRECT_URI=https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev
```

Expected:

- Owner can start SePay OAuth Connect from Management App.
- Payment service creates and consumes Redis OAuth state.
- Tenant bank accounts can be listed after callback.
- Selected bank account creates/upserts a tenant webhook URL that includes the tenant slug.
- The per-tenant secret is stored encrypted, never exposed in frontend output.

- [ ] Step 4: Verify SePay webhook API surface against the real account `[SHARED]`

Before live deployment, reconcile this source-code/API mismatch:

| Source                       | Webhook upsert shape observed                                                            |
| ---------------------------- | ---------------------------------------------------------------------------------------- |
| Current QRTable code         | `POST /api/v1/webhooks`, `authen_type: Api_Key`, `api_key`, `request_content_type: Json` |
| Context7 SePay Bank Hub docs | `POST /v1/webhook`, `auth_type: SECRET_KEY`, `secret_key`, HTTPS webhook URL             |

Action:

- Confirm which SePay product/API surface the QRTable account uses.
- If the live API expects the Bank Hub `/v1/webhook` shape, update `SepayOAuthClientService` before production.
- If the live API uses the current `/api/v1/webhooks` shape, document that evidence in `docs/guides/sepay-configuration-guide-phase3.md`.
- Do not call production ready until one of the two paths is proven with the actual SePay account.

- [ ] Step 5: Define safe live verification `[SHARED]`

Do not automate real bank transfers in CI.

Allowed verification:

```bash
curl -i -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform \
  -H "Content-Type: application/json" \
  -d '{"code":"QRSUBTEST","content":"QRSUBTEST","transferType":"in","transferAmount":1000}'
```

Expected: unauthorized because no secret is present.

Manual live verification:

- Use a low-value transfer only after platform/tenant secrets are configured.
- The human account owner must explicitly approve and initiate the transfer; the agent must not initiate or authorize real-money movement.
- Confirm webhook request appears in BFF logs.
- Confirm the provider transaction id is stored/audited for idempotency.
- Confirm underpaid and duplicate events do not incorrectly mark payment complete.
- Confirm Grafana shows the webhook request, payment audit, and any provider API errors without leaking tokens/secrets.

### Task 12: Rewire Monitoring For App Containers

**Ownership:** `[AGENT]`

**Files:**

- Create: `docker-compose.monitoring.prod.yaml`
- Modify or create production copy: `docker/monitoring/prometheus/prometheus.prod.yml`

- [ ] Step 1: Use internal service targets

Production scrape config should use:

```yaml
scrape_configs:
  - job_name: qrtable-backend
    metrics_path: /api/v1/metrics
    static_configs:
      - targets:
          - bff:3300
          - order:3301
          - catalog:3305
          - saas:3306
          - kitchen:3307
          - payment:3308

  - job_name: qrtable-backend-api-prefix
    metrics_path: /api/metrics
    static_configs:
      - targets:
          - authorizer:3304
          - user-access:3303
```

- [ ] Step 2: Define the production network contract

`docker-compose.monitoring.prod.yaml` must attach:

| Service    | Networks                                     | Reason                                       |
| ---------- | -------------------------------------------- | -------------------------------------------- |
| Grafana    | monitoring network + `qrtable-edge`          | private data sources plus Caddy reachability |
| Prometheus | monitoring network + `qrtable-app`           | scrape backend service names                 |
| Tempo      | monitoring network + `qrtable-app`           | receive OTLP from app containers             |
| Loki       | monitoring network                           | internal log store                           |
| Promtail   | monitoring network plus Docker socket access | ship labeled container logs                  |

The production override must replace the local `qrtable-nw`/`host.docker.internal` assumptions with explicit external networks. Verify with `docker network inspect qrtable-edge qrtable-app`.

- [ ] Step 3: Keep monitoring stores private

Production rules:

- Do not publish Loki, Prometheus, or Tempo ports.
- Publish Grafana only through the reverse proxy with HTTPS and basic auth.
- Use Promtail Docker labels from app containers: `app=bff`, `app=order`, and so on.

- [ ] Step 4: Verify Grafana

Run:

```bash
./tools/deploy/phase7-compose-validate.sh \
  -f docker-compose.monitoring.yaml \
  -f docker-compose.monitoring.prod.yaml
```

Expected: production compose has no public `3001`, `3100`, `9090`, `3200`, or `4318` ports; Grafana is reachable only through Caddy; Prometheus can resolve backend services; app containers can resolve `tempo`.

### Task 13: Provision DigitalOcean

**Ownership:** `[SHARED]`

**Files:**

- Create: `docs/guides/phase-7-digitalocean-deployment.md`

This task operationalizes `HUMAN-GATE-01`, `HUMAN-GATE-03`, `HUMAN-GATE-04`, and `HUMAN-GATE-05`. `HUMAN-GATE-02` belongs to GitHub configuration in Task 17. The implementation guide must include the web-console instructions, evidence fields, and secret-handling rules from section 4, not only shell commands.

- [ ] Step 1: Create account security, Project, and registry `[HUMAN]`

In the DigitalOcean control panel:

- Confirm owner email, 2FA/passkey, recovery material, team, and billing.
- Create/select Project `qrtable-production`.
- Create the final Container Registry in the chosen region and record its immutable name/tier.
- Create the narrowly scoped API token used by the image-release workflow.
- Complete `HUMAN-GATE-01` and `HUMAN-GATE-03`.

- [ ] Step 2: Create SSH keys, Reserved IP, Droplet, and firewall `[HUMAN]`

Use:

- Separate Ed25519 admin and future deploy public keys; no password login.
- Ubuntu 24.04 LTS or current DO-supported Ubuntu LTS.
- Region `sgp1` if available.
- Recommended 4 vCPU / 8 GiB pilot size.
- DigitalOcean Reserved IP as the stable DNS target.
- Cloud Firewall attached.
- Enhanced monitoring and backups enabled before first public demo.
- Resource tags `qrtable`, `production`, and `phase7`.

Allow:

```text
22/tcp from your current IP only
80/tcp from 0.0.0.0/0 and ::/0
443/tcp from 0.0.0.0/0 and ::/0
```

Deny public access to:

```text
3000, 3001, 3300-3308, 3201-3208, 5432, 6379, 27017, 9092, 9090, 3100, 3200, 4318
```

Do not broaden SSH to all sources for GitHub-hosted runners. Use the operator-driven deploy baseline from section 4.7 until a secure automated control channel is selected.

Complete `HUMAN-GATE-04` after verifying SSH login, Reserved IP attachment, firewall rules, backups, and monitoring.

- [ ] Step 3: Harden the host and install Docker Engine `[SHARED]`

Use Docker's official Ubuntu repository, not Ubuntu's older package:

```bash
sudo apt update
sudo apt install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
docker --version
docker compose version
```

Expected: Docker Engine and Docker Compose plugin print versions.

Also:

- create the non-root `qrtable-deploy` operator;
- keep direct root SSH disabled;
- enable unattended security updates;
- configure time synchronization;
- record disk/memory baseline;
- verify no unintended port is listening publicly.

- [ ] Step 4: Authenticate the Droplet for read-only DOCR pulls `[SHARED]`

Install current `doctl`, then create Docker credentials without writing the source DigitalOcean API token into the repository or deployment logs:

```bash
read -rsp "DigitalOcean API token: " DIGITALOCEAN_ACCESS_TOKEN
echo
doctl registry login \
  --access-token "$DIGITALOCEAN_ACCESS_TOKEN" \
  --read-only=true \
  --never-expire
unset DIGITALOCEAN_ACCESS_TOKEN
chmod 600 "$HOME/.docker/config.json"
docker pull registry.digitalocean.com/qrtable/qrtable:bff-<known-release-tag>
```

The generated registry credential is read-only. Document revocation/rotation, protect the Docker config, and prefer finite-lived credentials with automated renewal when the deployment process matures.

- [ ] Step 5: Configure DNS and public TLS prerequisites `[HUMAN]`

Create A records pointing to the Reserved IP:

```text
api.qrtable.vodinhquan.dev
app.qrtable.vodinhquan.dev
qr.qrtable.vodinhquan.dev
auth.qrtable.vodinhquan.dev
grafana.qrtable.vodinhquan.dev
```

Expected:

```bash
dig +short api.qrtable.vodinhquan.dev
dig +short app.qrtable.vodinhquan.dev
dig +short qr.qrtable.vodinhquan.dev
dig +short auth.qrtable.vodinhquan.dev
dig +short grafana.qrtable.vodinhquan.dev
```

Each command returns the Reserved IP from at least two public resolvers. Review CAA records and keep any DNS-provider HTTP proxy disabled until Caddy issues all certificates. Complete `HUMAN-GATE-05` only after public TLS verification, not merely DNS propagation.

### Task 14: Deploy The Stack

**Ownership:** `[SHARED]`

**Handoff:** The agent prepares and runs the deployment procedure. The human supplies protected external values, approves the target/window, and performs the permanent-admin/browser checks at the named gates.

**Files:**

- Create: `tools/deploy/phase7-preflight.sh`
- Create: `tools/deploy/phase7-migrate.sh`
- Create: `tools/deploy/phase7-seed-demo.sh`
- Create: `tools/deploy/phase7-smoke.sh`

- [ ] Step 1: Copy repository or release bundle to `/opt/qrtable` `[AGENT]`

Recommended first pilot:

```bash
: "${QRTABLE_REPOSITORY_URL:?Set this to the private QRTable git URL before cloning}"
sudo mkdir -p /opt/qrtable
sudo chown "$USER:$USER" /opt/qrtable
git clone "$QRTABLE_REPOSITORY_URL" /opt/qrtable
```

If using image-only deploy later, replace this with a release bundle containing compose/proxy/monitoring/deploy-script files. Keep `/opt/qrtable/.env.production` server-owned and outside the release bundle.

- [ ] Step 2: Put private env on server `[SHARED]`

```bash
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Then edit `/opt/qrtable/.env.production` on the server and replace generated values using `openssl rand`.

The human enters Cloudinary, SePay, bank/provider, and other externally issued secrets directly on the server. The agent verifies only presence, format, permissions, and redacted fingerprints. Complete `HUMAN-GATE-06` and `HUMAN-GATE-07`.

Render and permission-check the scoped runtime files:

```bash
./tools/deploy/phase7-render-service-envs.sh
find /opt/qrtable/env -type f ! -perm 0600 -print -quit | grep -q . && exit 1 || true
./tools/deploy/phase7-compose-validate.sh -f docker-compose.infra.yaml
./tools/deploy/phase7-compose-validate.sh -f docker-compose.migrations.yaml
./tools/deploy/phase7-compose-validate.sh \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml
./tools/deploy/phase7-compose-validate.sh -f docker-compose.app.yaml
./tools/deploy/phase7-compose-validate.sh -f docker-compose.proxy.yaml
```

- [ ] Step 3: Start infra and wait for datastore health `[AGENT]`

```bash
docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml \
  pull
docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml \
  up -d
./tools/deploy/phase7-preflight.sh --wait-infra
```

- [ ] Step 4: Run the migration and ownership gate `[AGENT]`

```bash
docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.migrations.yaml \
  pull
./tools/deploy/phase7-migrate.sh
```

Expected: all service migrations are applied and database ownership verification passes before any app container is replaced.

- [ ] Step 5: Bootstrap identity and optional demo data `[SHARED]`

```bash
./tools/deploy/phase7-keycloak-bootstrap.sh
```

For a thesis demo deployment only:

```bash
DEPLOYMENT_PROFILE=demo ./tools/deploy/phase7-seed-demo.sh --yes
```

After bootstrap, the human must create and verify a permanent named Keycloak administrator, remove the temporary bootstrap administrator, and complete the login/role checks in `HUMAN-GATE-08`.

- [ ] Step 6: Start monitoring, app, and proxy layers `[AGENT]`

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml up -d
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml up -d
```

- [ ] Step 7: Verify running services `[AGENT]`

```bash
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.infra.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.app.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.proxy.yaml ps
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml ps
```

Expected:

- Infra services are healthy or running.
- The migration script exit status and deployment history record show all three migration/ownership commands succeeded. The container is intentionally removed by `run --rm`, so `docker compose ps -a` is not used as evidence.
- App containers are running.
- Caddy has obtained certificates and serves HTTPS.
- `docker network inspect` confirms Caddy shares `qrtable-edge` with every reverse-proxy target and monitoring/app network contracts match Task 12.

### Task 15: Run Smoke And Demo Verification

**Ownership:** `[AGENT]`

**Files:**

- Create: `tools/deploy/phase7-smoke.sh`
- Create: `tools/deploy/phase7-e2e.sh`
- Update: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Step 1: HTTP smoke

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev/realms/qrtable
```

Expected:

- BFF health returns UP.
- App and PWA return HTML.
- Keycloak realm endpoint returns JSON metadata.

- [ ] Step 2: Internal metrics smoke

Run from inside Prometheus container or app network:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml \
  exec prometheus wget -qO- http://bff:3300/api/v1/metrics
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml \
  exec prometheus wget -qO- http://order:3301/api/v1/metrics
```

Expected: Prometheus text exposition contains `qrtable_http_requests_total`.

- [ ] Step 3: Browser E2E smoke

Use the existing E2E suite only for an explicitly seeded demo deployment. The tests do not read generic `BASE_URL`, `CUSTOMER_PWA_URL`, or `BFF_URL`; create `tools/deploy/phase7-e2e.sh` that validates `DEPLOYMENT_PROFILE=demo` and maps the exact variables consumed by the current specs:

```bash
export STEPP27_PWA_BASE_URL=https://qr.qrtable.vodinhquan.dev
export STEPP27_MANAGEMENT_BASE_URL=https://app.qrtable.vodinhquan.dev
export STEPP27_BFF_HEALTH_URL=https://api.qrtable.vodinhquan.dev/api/v1/health

export PHASE3_PWA_BASE_URL=https://qr.qrtable.vodinhquan.dev
export PHASE3_MANAGEMENT_BASE_URL=https://app.qrtable.vodinhquan.dev

export PHASE5_SUSPENDED_PWA_BASE_URL=https://qr.qrtable.vodinhquan.dev
export PHASE5_SUSPENDED_BFF_HEALTH_URL=https://api.qrtable.vodinhquan.dev/api/v1/health

export PHASE5_ADMIN_MANAGEMENT_BASE_URL=https://app.qrtable.vodinhquan.dev
export PHASE5_ADMIN_BFF_HEALTH_URL=https://api.qrtable.vodinhquan.dev/api/v1/health
export PHASE5_ADMIN_KEYCLOAK_REALM_URL=https://auth.qrtable.vodinhquan.dev/realms/qrtable

./tools/deploy/phase7-e2e.sh
```

The wrapper must require demo credentials through environment variables rather than silently relying on committed deterministic passwords. It then runs `pnpm e2e:demo`. Expected: selected demo tests pass with no localhost fallback and no production credential printed to logs.

- [ ] Step 4: SePay route smoke

Verify registered public routes:

```bash
curl -i -X POST \
  -H 'Content-Type: application/json' \
  -d '{"code":"QRSUBTEST","content":"QRSUBTEST","transferType":"in","transferAmount":1000}' \
  https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
curl -i -X POST \
  -H 'Content-Type: application/json' \
  -d '{"code":"QRTBLTEST","content":"QRTBLTEST","transferType":"in","transferAmount":1000}' \
  https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/demo-tenant
```

Expected: authentication errors are returned by BFF, proving the public routes are reachable without accepting unsigned payloads.

### Task 16: Backup, Rollback, And Operations

**Ownership:** `[SHARED]`

**Handoff:** The agent implements backup, checksum, restore, and rollback automation. The human enables paid provider features, creates the independent storage target, approves retention/deletion authority, and completes `HUMAN-GATE-11`.

**Files:**

- Create: `docs/guides/phase-7-digitalocean-deployment.md`
- Create: `tools/deploy/phase7-backup.sh`

- [ ] Step 1: Enable DigitalOcean backup/snapshot `[HUMAN]`

Use Droplet backups for host-level recovery.

- [ ] Step 2: Add logical backup script `[AGENT]`

The release backup is a cross-service recovery point. Put the deployment into a short maintenance window or quiesce write traffic before backup; otherwise the PostgreSQL databases and MongoDB archive are individually valid but not an atomic distributed snapshot.

```bash
#!/usr/bin/env bash
set -euo pipefail

set -a
source /opt/qrtable/.env.production
set +a

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "/opt/qrtable/backups/${stamp}"
COMPOSE_ENV=(--env-file /opt/qrtable/.env.production)

docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_catalog > "/opt/qrtable/backups/${stamp}/qrtable_catalog.sql"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_order > "/opt/qrtable/backups/${stamp}/qrtable_order.sql"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_saas > "/opt/qrtable/backups/${stamp}/qrtable_saas.sql"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_payment > "/opt/qrtable/backups/${stamp}/qrtable_payment.sql"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_keycloak > "/opt/qrtable/backups/${stamp}/qrtable_keycloak.sql"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.infra.yaml exec -T mongodb \
  mongodump \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db qrtable_auth \
  --archive > "/opt/qrtable/backups/${stamp}/qrtable_auth.archive"
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:migration:show \
  > "/opt/qrtable/backups/${stamp}/migration-state.txt"
sha256sum "/opt/qrtable/backups/${stamp}/"* > "/opt/qrtable/backups/${stamp}/SHA256SUMS"
```

- [ ] Step 3: Define retention and off-Droplet recovery `[SHARED]`

- The human creates a private Space or independent object-storage target and a dedicated restricted access key according to section 4.12.
- Encrypt and copy each completed backup to a separate DigitalOcean Space or another off-Droplet target.
- Define retention, for example daily 7, weekly 4, monthly 3.
- Verify `SHA256SUMS` after upload.
- Perform at least one restore rehearsal into isolated databases and record duration/evidence.
- Never count a backup stored only on the same Droplet as the sole recovery copy.
- Complete `HUMAN-GATE-11` only after the encrypted upload, download, checksum, and isolated PostgreSQL/MongoDB restore all succeed.

- [ ] Step 4: Define rollback `[AGENT]`

Rollback image tag:

```bash
IMAGE_TAG=previous-good docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml \
  up -d
```

Rollback infra data:

- Stop app layer first.
- Restore Postgres/Mongo from logical backup or Droplet snapshot.
- Do not run `migration:revert` automatically. A migration revert must be explicitly reviewed against the target image and backup timestamp.
- Prefer backward-compatible expand/contract migrations so the previous app image can run during the rollback window.
- Start app layer.
- Re-run smoke checks.

### Task 17: Add CI/CD Pipeline And Release Process

**Ownership:** `[SHARED]`

**Handoff:** The agent implements workflows and scripts. The human configures GitHub web-console protections/secrets and approves the first production deployment through `HUMAN-GATE-02` and `HUMAN-GATE-10`.

CI/CD is part of Phase 7, but it must be treated as a separate deployment control plane rather than hidden inside manual server commands.

**Current repo state:**

- Existing: `.github/workflows/ci.yml`
- Existing CI trigger: `push` to `main` and `pull_request`
- Existing CI command: `pnpm exec nx run-many -t lint test build`
- Existing: per-service TypeORM DataSources, initial migrations, migration commands, and database ownership verification.
- Missing: Docker image build workflow
- Missing: registry push workflow
- Missing: operator-driven production deploy entrypoint and optional production deploy workflow
- Missing: rollback-by-tag workflow
- Missing: production migration image/job and deploy gate

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release-images.yml`
- Create after secure-channel approval: `.github/workflows/deploy-production.yml`
- Create after secure-channel approval: `.github/workflows/rollback-production.yml`
- Create: `tools/deploy/phase7-build-images.sh`
- Create: `tools/deploy/phase7-migrate.sh`
- Create: `tools/deploy/phase7-remote-deploy.sh`
- Create: `tools/deploy/phase7-remote-rollback.sh`
- Create: `tools/deploy/phase7-preflight.sh`
- Create: `tools/deploy/phase7-compose-validate.sh`
- Create: `tools/deploy/phase7-smoke.sh`
- Modify: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Step 1: Keep CI as the PR quality gate `[AGENT]`

CI must validate source quality before any release workflow can run.

Recommended checks:

```bash
pnpm install --frozen-lockfile
pnpm exec nx run-many -t lint test build
pnpm verify:doc-anchors
```

Optional after the first stable production deploy:

```bash
pnpm exec nx affected -t lint test build --base=origin/main~1 --head=HEAD
```

Use affected commands only after the pipeline is stable. For the first Phase 7 deploy, `run-many` is safer because stale project boundaries or target omissions are easier to catch.

- [ ] Step 2: Add a release-images workflow `[SHARED]`

Trigger:

- `workflow_dispatch`
- `workflow_run` for the existing CI workflow, limited to successful runs on `main`

Permissions:

- `contents: read`
- no repository write permission

Inputs:

- optional `image_tag`; compute `IMAGE_TAG="${{ inputs.image_tag || github.event.workflow_run.head_sha || github.sha }}"`
- `push_latest` defaulting to `false`

Secrets:

- `DIGITALOCEAN_ACCESS_TOKEN`

`[AGENT]` implements and statically verifies the workflow. `[HUMAN]` creates the scoped token and enters it into GitHub without disclosing the value. The workflow's first live registry push waits for that handoff.

Workflow responsibilities:

1. Checkout repository.
2. Install Node.js 22.22.3 and pnpm 9.8.0, matching the Docker build toolchain.
3. Install dependencies with frozen lockfile.
4. Run CI build checks.
5. Login to DigitalOcean Container Registry.
6. Build all Phase 7 images for `linux/amd64` with Buildx and push immutable tags.
7. Generate SBOMs and fail on the agreed critical vulnerability threshold.
8. Emit and retain the image digest summary.

Expected image names:

```text
registry.digitalocean.com/qrtable/qrtable:bff-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:authorizer-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:catalog-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:order-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:kitchen-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:payment-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:saas-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:user-access-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:migrations-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:management-app-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:customer-pwa-${IMAGE_TAG}
registry.digitalocean.com/qrtable/qrtable:keycloak-${IMAGE_TAG}
```

One repository is deliberate: DOCR Starter supports one repository, while separate service repositories would require a higher tier before storage is considered.

Important build rule:

- Public frontend values may be build args: `NEXT_PUBLIC_*`, `VITE_*`.
- Private secrets must never be Docker build args.
- Production secrets stay in `/opt/qrtable/.env.production` or a future secret manager.
- The release is incomplete unless all twelve tags and their digests are present.
- The workflow must refuse to overwrite an existing immutable release tag; `latest` remains optional and is never used by production compose.

- [ ] Step 3: Add deployment environment protection `[HUMAN]`

Use GitHub Environments:

```text
Environment: production
Required reviewers: owner/deployment maintainer
Deployment branch: main only
```

`[HUMAN]` Configure this in the GitHub web console according to section 4.5. Required reviewers are a hard control only when the repository visibility and GitHub plan actually support them. When they are unavailable, keep the operator-driven deployment gate and record the approver in `/opt/qrtable/releases/history.log`.

Why:

- SePay live webhooks can affect external payment state.
- Keycloak production clients must not be changed accidentally.
- DB schema state must be checked before replacing app containers.

- [ ] Step 4: Add the operator-driven production deployment entrypoint `[SHARED]`

The first Phase 7 pilot must not SSH from a GitHub-hosted runner while the Cloud Firewall allows SSH only from the operator's IP.

Baseline flow:

Deployment flow:

```text
CI green
  -> release-images pushes immutable image tag
  -> human selects tag/window and confirms backup/rollback
  -> operator connects from the trusted workstation
  -> remote preflight
  -> pull immutable migration and app images
  -> backup
  -> run per-service migrations
  -> verify migration state and database ownership
  -> docker compose up -d app layer
  -> smoke tests
  -> record deployed tag
```

Operator command shape:

```bash
ssh -o IdentitiesOnly=yes "$PRODUCTION_SSH_USER@$PRODUCTION_SSH_HOST" \
  "cd /opt/qrtable && IMAGE_TAG='${IMAGE_TAG}' ./tools/deploy/phase7-remote-deploy.sh"
```

GitHub may provide a `workflow_dispatch` release/audit job that validates the tag and prints the exact redacted operator command, but it must not initiate production SSH until section 4.7's secure control channel is selected and tested.

The remote deploy script must:

- Refuse to run if `/opt/qrtable/.env.production` is missing or world-readable.
- Refuse to deploy if `IMAGE_TAG` is empty.
- Verify Docker can authenticate to and pull from the private DOCR repository.
- Render scoped runtime env files and reject any container configured with the master `.env.production` as its service-level `env_file`.
- Run `phase7-compose-validate.sh` for infra, migrations, monitoring, app, and proxy layers.
- Pass `--env-file /opt/qrtable/.env.production` to every underlying Compose invocation and fail if the securely captured `config --environment` shows unresolved or empty release variables.
- Pull images for the requested immutable tag.
- Run `tools/deploy/phase7-migrate.sh` and stop immediately on migration or ownership failure.
- Start app containers without rebuilding on the server.
- Run health checks after container replacement.
- Write the successful tag to `/opt/qrtable/releases/current`.

`[AGENT]` prepares/runs the audited command and checks. `[HUMAN]` selects the immutable tag/window, confirms backup/rollback readiness, approves the deployment, and completes `HUMAN-GATE-10`.

- [ ] Step 4A: Optionally enable `deploy-production.yml` after secure-channel approval `[SHARED]`

Only after the human records one of section 4.7's non-baseline control channels may the workflow receive:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_SSH_PORT`
- `PRODUCTION_SSH_KNOWN_HOSTS`

The workflow must:

- use the protected `production` environment;
- verify the server host key against `PRODUCTION_SSH_KNOWN_HOSTS`;
- never disable strict host-key checking;
- use a dedicated non-root deploy key;
- restrict the key/server account to deployment operations;
- avoid running on pull-request code;
- remove any temporary firewall rule in an unconditional cleanup step;
- retain a redacted audit artifact.

- [ ] Step 5: Add schema/migration gate `[AGENT]`

Before production deployment, the deployment procedure must:

1. Verify all five dedicated datastore env names are present and `DATABASE_SHARED_FALLBACK_ENABLED=false`.
2. Pull the migration image with the same immutable tag as the app images.
3. Run `pnpm db:migrate`.
4. Run `pnpm db:migration:show`.
5. Run `pnpm db:verify:ownership`.
6. Refuse to replace app containers when any command fails.

This is a hard gate because production uses service-owned migrations with `TYPEORM_SYNCHRONIZE=false`.

Recommended gate script:

```bash
./tools/deploy/phase7-preflight.sh --require-dedicated-databases
./tools/deploy/phase7-migrate.sh
```

- [ ] Step 6: Add smoke tests to the deployment procedure `[AGENT]`

Smoke tests must run from a machine outside the Droplet after deployment because public DNS, TLS, reverse proxy, and CORS must be verified externally. For the baseline, run them from the trusted operator workstation. After secure workflow SSH is enabled, the public checks may also run from GitHub Actions.

Required endpoints:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev
```

Webhook negative checks:

```bash
curl -fsS -o /dev/null -w "%{http_code}" \
  -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Expected: invalid or unsigned webhook requests are rejected, not accepted.

CORS checks must send an allowed origin and a disallowed origin to the BFF, and must verify the Socket.IO handshake follows the same allowlist.

- [ ] Step 7: Add operator rollback and optional rollback workflow `[SHARED]`

Baseline inputs:

- `rollback_tag` required;
- `restore_data=false` unless the human explicitly approves an exact backup timestamp and compatibility impact.

Rollback flow:

```text
human rollback approval
  -> remote preflight
  -> optional backup
  -> set IMAGE_TAG to rollback_tag
  -> docker compose pull
  -> docker compose up -d app layer
  -> smoke tests
  -> record rollback event
```

Rollback must not restore a database or run `migration:revert` automatically unless `restore_data=true` and the operator confirms the exact backup timestamp and compatibility impact. App rollback and data rollback are separate operations.

`[AGENT]` implements and executes app rollback automation. `[HUMAN]` approves the rollback tag and separately approves any data restore with an exact backup timestamp.

The optional GitHub rollback workflow follows the same secure-channel requirement as `deploy-production.yml`.

- [ ] Step 8: Add deployment audit trail `[AGENT]`

Each successful deploy should record:

```text
deployed_at
deployed_by
git_sha
image_tag
compose_files
smoke_result
previous_tag
```

Store locally:

```text
/opt/qrtable/releases/current
/opt/qrtable/releases/history.log
```

Also keep the GitHub Actions run URL as the external audit record.

- [ ] Step 9: Decide when to automate deploy on merge `[HUMAN]`

Recommended Phase 7 policy:

| Stage              | Release images             | Deploy production                    |
| ------------------ | -------------------------- | ------------------------------------ |
| First pilot        | Manual workflow dispatch   | Operator workstation with approval   |
| Stable thesis demo | Push to main builds images | Operator workstation with approval   |
| Mature production  | Push to main builds images | Optional auto-deploy to staging only |

Do not auto-deploy production on every merge until migrations, backups, rollback, and smoke tests are proven.

### Task 18: Update Canonical Docs After Implementation

**Ownership:** `[AGENT]`

**Files:**

- Modify: `docs/phases/phase-5-7-finalization.md`
- Modify: `docs/phases/phase-5-7-finalization.vi.md`
- Modify: `docs/technical-architecture.md`
- Modify: `docs/DOC-CODE-ANCHORS.md`
- Create or modify: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Step 1: Update phase record

Record:

- Final deployed hosts.
- Compose files created.
- Image build strategy.
- CI/CD workflow strategy.
- Schema/migration strategy.
- SePay public URL configuration.
- SePay provider API surface confirmed for the actual production account.
- Monitoring exposure policy.
- Human-gate completion and redacted external-platform resource evidence.
- Selected production SSH/deployment control channel.
- Acceptance evidence.

- [ ] Step 2: Update technical architecture section 14

Make the section match real files:

- `docker-compose.infra.yaml`
- `docker-compose.migrations.yaml`
- `docker-compose.app.yaml`
- `docker-compose.proxy.yaml`
- `docker-compose.monitoring.yaml`
- `docker-compose.monitoring.prod.yaml`

- [ ] Step 3: Update doc-code anchors

Add new long-lived paths and run:

```bash
pnpm verify:doc-anchors
```

Expected: anchor verifier exits 0.

## 7. Production Acceptance Criteria

Phase 7 is accepted only when all items below are true:

- [ ] `HUMAN-GATE-01` through `HUMAN-GATE-11` are completed with dated, redacted evidence; no external account, billing, DNS, secret, bank, or backup dependency is assumed.
- [ ] GitHub `main` ruleset and production environment are configured; the record truthfully states whether required reviewers are enforced by the current repository plan.
- [ ] DigitalOcean Project, registry, Reserved IP, Droplet, Cloud Firewall, backups, and monitoring are configured and linked to the correct production resources.
- [ ] SSH remains restricted to an approved control channel; it is not opened globally for GitHub-hosted runners.
- [ ] Any Droplet-to-GitHub repository checkout uses a dedicated read-only deploy key; production does not reuse a personal GitHub key.
- [ ] Production uses newly generated credentials, not populated local `.env` values or deterministic development defaults; secret-history scan findings are remediated.
- [ ] Cloudinary production credentials are configured outside git and upload/read/delete smoke passes without exposing the API secret.
- [ ] Every production Compose command uses `--env-file /opt/qrtable/.env.production`; the protected validation helper finds no unresolved release variables and emits no secret values.
- [ ] The master production env is not injected wholesale into containers; per-service env files are allowlisted, mode `0600`, and contain only required values.
- [ ] `docker compose` can start infra, run migrations, and start monitoring, app, and proxy layers from a clean server checkout.
- [ ] The eight backend containers bind TCP/gRPC listeners to `0.0.0.0` where applicable, and every required inter-service TCP/gRPC connection succeeds by Docker service name.
- [ ] Caddy shares `qrtable-edge` with BFF, Management App, Customer PWA, Keycloak, and Grafana; Prometheus/Tempo share the required app networks.
- [ ] PostgreSQL, MongoDB, Redis, Kafka, and Keycloak readiness gates pass before migrations/identity bootstrap/app replacement.
- [ ] KafkaJS producer/consumer smoke passes against the pinned Kafka `4.3.0` image.
- [ ] Production env defines the four dedicated PostgreSQL database names and MongoDB `qrtable_auth`, with shared fallback disabled.
- [ ] The one-shot migration image applies all service migrations before app boot.
- [ ] `pnpm db:migration:show` reports every expected migration as applied.
- [ ] `pnpm db:verify:ownership` passes against all four PostgreSQL service databases.
- [ ] User-Access connects to MongoDB `qrtable_auth`; normal production Keycloak bootstrap creates no demo users and resets no human password.
- [ ] Keycloak clients are idempotently updated with exact production redirect URIs, web origins, secrets, and the public issuer.
- [ ] Public HTTPS works for `api`, `app`, `qr`, `auth`, and protected `grafana` subdomains.
- [ ] Only 80/443 and restricted SSH are public.
- [ ] BFF HTTP and Socket.IO CORS allow only the Management App and Customer PWA production origins.
- [ ] BFF `/api/v1/health/live` and `/api/v1/health/ready` pass.
- [ ] Management App login works with Keycloak through `auth.qrtable.vodinhquan.dev`.
- [ ] Customer QR flow works through `qr.qrtable.vodinhquan.dev`.
- [ ] POS/KDS flow works through `app.qrtable.vodinhquan.dev`.
- [ ] Payment webhook routes are publicly reachable over HTTPS and reject invalid auth.
- [ ] SePay platform `QRSUB` webhook route is registered against the correct public URL and secret-key auth mode.
- [ ] SePay tenant `QRTBL` OAuth Connect flow can create or verify a tenant webhook URL with tenant slug.
- [ ] SePay API surface mismatch (`/api/v1/webhooks` vs `/v1/webhook`, `Api_Key` vs `SECRET_KEY`) is resolved with evidence from the actual SePay account before live use.
- [ ] Grafana shows logs, metrics, and traces from real app containers.
- [ ] Optional demo seed is non-destructive, profile-gated, and can restore the thesis demo dataset without calling `dev:reseed`.
- [ ] Production E2E uses the exact `STEPP27_*`, `PHASE3_*`, and `PHASE5_*` variables and never falls back to localhost or committed demo passwords.
- [ ] Backup and rollback procedure is documented and tested at least once, including checksum verification and an off-Droplet restore rehearsal.
- [ ] CI remains green for `lint`, `test`, and `build`.
- [ ] Release workflow builds all twelve `linux/amd64` artifacts into one DOCR repository, records digests/SBOMs, and passes the vulnerability gate.
- [ ] The operator-driven production deployment can deploy a selected immutable image tag with explicit approval.
- [ ] If GitHub production deploy/rollback workflows are enabled, their secure control channel, host-key verification, firewall behavior, dedicated key, and environment approval are documented and tested.
- [ ] Operator rollback can redeploy the previous successful image tag without automatically reverting/restoring data.
- [ ] Canonical docs are updated after implementation.

## 8. Cost And Scaling Notes

Use the smallest deployment that is honest for the current product:

- Pilot: one 4 vCPU / 8 GiB Droplet, self-host infra, backups enabled.
- Budget smoke: one 2 vCPU / 4 GiB Droplet, monitoring reduced or stopped outside demo windows.
- Hardening: managed PostgreSQL and Valkey when data safety and operations matter more than monthly cost.
- Avoid managed Kafka for thesis/pilot unless budget is intentionally allocated; DigitalOcean managed Kafka is designed as a multi-node managed cluster.

DigitalOcean product facts re-verified on 2026-06-07:

- Droplets start at USD 4/month.
- Managed databases start at USD 15/month.
- Managed PostgreSQL 1 GiB starts around USD 15.15/month.
- Managed Valkey 1 GiB starts around USD 15/month.
- Load Balancers start at USD 12/month.
- Droplet backups are percentage-based relative to Droplet cost.

## 9. Risks And Mitigations

| Risk                                          | Impact                                                           | Mitigation                                                                                       |
| --------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| Migration job omitted or run after apps       | New image boots against an incompatible or incomplete schema     | Run the immutable migration image and ownership gate before replacing app containers             |
| Shared database fallback enabled              | Services can reconnect to a mixed legacy database                | Require dedicated env names and `DATABASE_SHARED_FALLBACK_ENABLED=false` in production preflight |
| `dev:reseed` run on production                | Destructive data loss and identity/cache reset                   | Exclude it from deploy scripts; use a non-destructive, profile-gated demo seed                   |
| Compose `env_file` mistaken for interpolation | Images/credentials render empty or with stale defaults           | Pass `--env-file` everywhere and inspect through the protected validation helper                 |
| Compose validation printed to CI logs         | Interpolated secrets leak into build/deploy records              | Capture `config`/`config --environment` in 0600 temp files and emit only redacted results        |
| TCP/gRPC listener remains on localhost        | HTTP health passes while inter-service calls fail                | Set own listener host to `0.0.0.0`; test the full host matrix                                    |
| Reverse-proxy/monitoring network mismatch     | Caddy cannot resolve Keycloak/Grafana or apps cannot reach Tempo | Enforce and inspect the shared network contract                                                  |
| Kafka `localhost` advertised listener         | App containers cannot connect                                    | Use `PLAINTEXT://kafka:9092` in production compose                                               |
| Unavailable Kafka image tag                   | Infra deployment cannot pull or start Kafka                      | Pin the verified official Apache Kafka JVM image and test its health command                     |
| Vite public env is build-time                 | Customer PWA points to wrong API after image reuse               | Build image with production `VITE_BFF_URL`, or implement runtime config later                    |
| Next public env is partly build-time          | Management App client bundle points to wrong API                 | Build with production `NEXT_PUBLIC_*` and also provide runtime env                               |
| Keycloak `start-dev` or mutable theme mount   | Insecure/non-reproducible production IAM                         | Use the optimized custom image, external hostname, and DB-backed Keycloak                        |
| Production bootstrap resets demo passwords    | Known credentials become valid on the public deployment          | Split realm/client bootstrap from explicitly gated demo-user bootstrap                           |
| Public Grafana                                | Observability leaks tenant or system data                        | Put behind HTTPS, basic auth, firewall/IP restriction                                            |
| CORS `*`                                      | Browser clients from unwanted origins can call BFF               | Enforce one production allowlist for HTTP and Socket.IO before public production                 |
| Secrets in compose                            | Credential leak                                                  | Keep values out of YAML; protect master/scoped env files with 0600 permissions                   |
| Master env injected into every service        | One compromised container exposes unrelated credentials          | Render allowlisted per-service env files and reject direct master-env injection                  |
| External account/manual gate assumed complete | Deployment stalls or uses wrong account/resource                 | Use `HUMAN-GATE-01` through `11` with resource IDs and redacted evidence                         |
| GitHub runner cannot pass restricted SSH rule | Automated deploy fails or operator opens SSH globally            | Keep first deploy operator-driven; approve a secure control channel before workflow SSH          |
| GitHub plan lacks reviewer protection         | UI suggests approval but does not enforce it                     | Record plan capability and retain operator approval until supported protection is available      |
| DNS/CDN/CAA misconfiguration                  | Caddy cannot obtain or renew certificates                        | Use Reserved IP, DNS-only during issuance, public resolver checks, and CAA review                |
| External secret pasted into chat/log          | Long-lived provider or bank integration compromise               | Human enters secrets directly; evidence includes only name/fingerprint/last four                 |
| Development credential reused in production   | Known or previously exposed value controls production            | Generate fresh production credentials, scan history, rotate findings, reject dev defaults        |
| Private repository checkout uses personal key | Personal account compromise or uncontrolled production access    | Use a dedicated read-only deploy key or move to an image-only release bundle                     |
| Cloudinary credentials missing or exposed     | Production uploads fail or media account is compromised          | Configure product environment manually and run upload/read/delete smoke without logging secret   |
| Single Droplet failure                        | Full outage                                                      | Enable backups/snapshots; later move DB to managed service                                       |
| Backups exist only on the Droplet             | Host loss also destroys recovery data                            | Encrypt/copy off-Droplet, checksum, retain, and rehearse restore                                 |
| SePay API surface mismatch                    | OAuth webhook registration fails after deploy                    | Verify current SePay account API shape before live production                                    |
| Wrong SePay webhook route                     | Tenant bill or subscription invoice never settles                | Register `QRTBL` tenant route and `QRSUB` platform route separately                              |
| Live payment test mutates external state      | Real money movement or incorrect subscription activation         | Keep CI negative-only; perform low-value manual live verification with audit logs                |
| Backup exists but restore was never rehearsed | Recovery fails during an actual incident                         | Complete encrypted offsite download, checksum, and isolated restore before acceptance            |

## 10. Useful Follow-Up Enhancements

- Add per-service PostgreSQL users after the single-user pilot is stable.
- Add migration compatibility tests for backward-compatible expand/contract releases.
- Add a dedicated SePay provider-contract test with mocked provider responses for the selected live API surface.
- Add `docker compose --profile demo` and `--profile prod` if the team wants one compose entrypoint.
- Add a server-side runtime config endpoint for Customer PWA to avoid rebuilding static image for API URL changes.
- Add wildcard tenant subdomain only after host-based tenant resolver is implemented.
- Add external object storage for Loki/Tempo only after retention requirements become real.

---

## 🔍 Code Quality Report

### ✅ Applied

- Used CodeGraph first before editing.
- Reconciled current code with canonical docs before writing deployment plan.
- Added this human-operator revision to the English canonical plan and synchronized the Vietnamese translation in the same revision.
- Preserved QRTable service boundaries and deployment ownership in the plan.
- Reconciled Phase 7 with the implemented database-per-service configuration, migrations, and ownership verification.
- Corrected Compose interpolation, image/tag naming, service listener/client hosts, and cross-layer Docker networks.
- Added secret-safe Compose validation that never streams resolved environments to logs.
- Replaced the unavailable Kafka tag and mutable Keycloak theme flow with reproducible image plans.
- Converted CORS, identity bootstrap, exact E2E variables, and off-Droplet restore into production gates.
- Treated secrets as runtime-only values and avoided committing real credentials.
- Restricted runtime secret distribution through generated per-service env allowlists.
- Flagged production blockers instead of hiding them behind optimistic deployment steps.
- Included CI/CD as a first-class Phase 7 task with release, deploy, rollback, approval, and smoke-test gates.
- Added SePay provider-doc verification and made live webhook/OAuth setup a production deployment gate.
- Added a complete responsibility matrix, eleven human gates, web-console procedures, redacted evidence contract, and first-deploy observation checklist.
- Resolved the restricted-SSH versus GitHub-hosted-runner conflict by making trusted-workstation deployment the Phase 7 baseline.
- Added an execution ownership map for Tasks 1-18, marked every task as `[AGENT]` or `[SHARED]`, and labeled each mixed-ownership step at its actual handoff point.

### ⚠️ Debt Flags (non-blocking — improve when touched again)

- FLAG001 [STRUCT] Phase 7 target compose files are documented but not implemented yet.
- FLAG002 [PATTERN] Monitoring compose is currently local-host oriented and needs a production override.
- FLAG003 [PATTERN] SePay webhook upsert API shape in code must be verified against the exact live SePay product/account before production.
- FLAG004 [ENV_LEAK] Existing provider compose has dev credentials and dev exposure patterns.
- FLAG005 [STRUCT] `dist/` contains stale app artifacts and should not be trusted for deployment.
- FLAG006 [PATTERN] Per-service PostgreSQL credentials are deferred until after the single-user pilot.

### 🔴 Blockers (fixed in output or MUST fix before merge)

- BLOCK001 [STRUCT] Application Dockerfiles and production app compose do not exist yet.
- BLOCK002 [STRUCT] Existing per-service migrations are not yet packaged and integrated as a production one-shot deployment gate.
- BLOCK003 [ENV_LEAK] Production secrets must be generated and stored outside git.
- BLOCK004 [PATTERN] Keycloak production must not use `start-dev`.
- BLOCK005 [PATTERN] BFF HTTP and Socket.IO CORS must stop using wildcard origins before public deployment.
- BLOCK006 [ENV_LEAK] Production Keycloak bootstrap must not create/reset deterministic demo users.
- BLOCK007 [STRUCT] Compose host/network/interpolation contracts must be implemented exactly or healthy HTTP containers will still fail inter-service traffic.
- BLOCK008 [ENV_LEAK] The master production env must not be passed wholesale to every container.
- BLOCK009 [PATTERN] External accounts, DNS, provider secrets, bank authorization, and backup storage require completion of the documented human gates.
- BLOCK010 [PATTERN] GitHub-hosted runner SSH must remain disabled until a secure deployment control channel is explicitly selected and tested.
- BLOCK011 [ENV_LEAK] Populated local development credentials and deterministic development defaults must not be reused in production; affected credentials require audit and rotation.

### 💡 Suggestions

- Start Phase 7 with Dockerfiles plus the migration image/job before touching DigitalOcean.
- Use fixed subdomains first, then add wildcard tenant routing only when source code needs it.
- Treat managed PostgreSQL/Valkey as the first hardening upgrade after the single-Droplet pilot.
