# Phase 7 Docker DigitalOcean Deployment Implementation Plan

> **Vietnamese translation:** [2026-06-06-phase-7-docker-digitalocean-deployment.vi.md](2026-06-06-phase-7-docker-digitalocean-deployment.vi.md)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Package QRTable into reproducible Docker images and deploy the Phase 7 pilot/production baseline to DigitalOcean under `vodinhquan.dev`.

**Architecture:** Use a single DigitalOcean Droplet as the Phase 7 production baseline, with Docker Compose split into proxy, app, infra, and monitoring layers. Public traffic terminates at a reverse proxy, while PostgreSQL, MongoDB, Redis, Kafka, Keycloak, Loki, Prometheus, Tempo, and all NestJS TCP ports stay on internal Docker networks. Keep managed DigitalOcean databases as a later hardening option, not the first thesis/pilot dependency.

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
- Indexed scope: 1,182 files, 15,444 nodes, 29,942 edges.
- CodeGraph query did not surface application Dockerfiles or app compose files, which matches direct filesystem inspection.

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
- DigitalOcean Container Registry has a free entry tier, but image storage must be checked before relying on it for 10 QRTable images.
- Docker on Ubuntu should be installed from Docker's official repository; modern installs include `docker compose` as a plugin.

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
- Payment requires `PAYMENT_TYPEORM_DATABASE` in staging/production.
- Payment requires SePay OAuth values, public API base URL, and `PAYMENT_SECRETS_ENCRYPTION_KEY` in staging/production.
- Management App needs `AUTH_SECRET`, `AUTH_KEYCLOAK_*`, `MANAGEMENT_BFF_BASE_URL`, `NEXT_PUBLIC_BFF_*`, and `NEXT_PUBLIC_CUSTOMER_PWA_URL`.
- Customer PWA needs build-time `VITE_BFF_URL`; `VITE_TENANT_ID` is only a fallback because QR flow supports `tenant=<slug>`.

### 2.2 Quick quality scan

Blockers to resolve before public production:

- No application Dockerfiles or app compose layer exist.
- No `.dockerignore`, so build context would include `node_modules`, `dist`, local env files, and generated data unless fixed.
- No durable TypeORM migration system is present; staging/production disables `synchronize`, so fresh production databases will not get tables automatically.
- `docker-compose.provider.yaml` uses dev-friendly defaults: unpinned `mongo`, `postgres`, `redis`, `redisinsight:latest`, `bitnamilegacy/kafka`, dev credentials, and Keycloak `start-dev`.
- Kafka advertises `localhost`, which works for local host-run apps but not for app containers.
- Monitoring compose exposes Grafana publicly on `3001` and scrapes host-run apps; production must put Grafana behind HTTPS/access control and scrape internal service names.
- BFF currently enables CORS `origin: '*'`; production should restrict it to the management and customer origins.
- `dist/` contains stale `product` and `invoice` build artifacts even though current `apps/` no longer contains those projects. Production builds must clean and rebuild from source.

Debt flags:

- Some docs still state Phase 6/7 are TODO even though observability code and monitoring compose exist.
- `technical-architecture.md` describes target compose files (`docker-compose.infra.yaml`, `docker-compose.app.yaml`) that are not yet implemented.
- Service global prefixes are not uniform: some services use `api/v1`, while `authorizer`, `saas`, and `user-access` use `api`. Prometheus and proxy rules must account for this until unified.
- `TcpConfiguration` host env behavior is easy to misconfigure; production compose should set both legacy host keys and TCP-specific host keys where needed.

Solid foundations:

- Nx project metadata is clear for all current apps.
- Backend webpack builds already generate `dist/apps/<service>/package.json` and lockfile artifacts.
- Observability baseline is implemented enough to preserve in Phase 7.
- `tools/keycloak-bootstrap.sh` can provision realm, clients, roles, and users if adapted for production hostnames.
- `tools/dev-reseed.sh` and `tools/dev-seed/*` provide seed/reset foundations for demo data.

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

## 4. Target File Structure

Create:

- `.dockerignore`
- `docker/backend.Dockerfile`
- `docker/management-app.Dockerfile`
- `docker/customer-pwa.Dockerfile`
- `docker/proxy/Caddyfile`
- `docker/postgres/init/001-create-databases.sql`
- `docker/env/.env.production.example`
- `docker-compose.infra.yaml`
- `docker-compose.app.yaml`
- `docker-compose.proxy.yaml`
- `docker-compose.monitoring.prod.yaml`
- `tools/deploy/phase7-preflight.sh`
- `tools/deploy/phase7-build-images.sh`
- `tools/deploy/phase7-smoke.sh`
- `docs/guides/phase-7-digitalocean-deployment.md`

Modify after implementation:

- `apps/management-app/next.config.ts`
- `apps/bff/src/bootstrap.ts`
- `docker-compose.monitoring.yaml` or create a production override only
- `docker/monitoring/prometheus/prometheus.yml` or production-specific Prometheus config
- `docs/technical-architecture.md` section 14
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-5-7-finalization.vi.md`
- `docs/DOC-CODE-ANCHORS.md`

Private files to create on the server only:

- `/opt/qrtable/.env.production`
- `/opt/qrtable/secrets/*`
- `/opt/qrtable/backups/*`

Never commit those private files.

## 5. Tasks

### Task 1: Add Build Context Controls

**Files:**

- Create: `.dockerignore`

- [ ] Step 1: Create root `.dockerignore`

Use this content:

```dockerignore
.git
.github
.vscode
.env
.env.*
!*.env.example
node_modules
**/node_modules
dist
coverage
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

Run:

```bash
docker buildx du --verbose .
```

Expected: no `node_modules`, no `docker/docker_data`, no private `.env`.

### Task 2: Build Backend Images

**Files:**

- Create: `docker/backend.Dockerfile`
- Create: `tools/deploy/phase7-build-images.sh`

- [ ] Step 1: Create a parametric backend Dockerfile

Use a single Dockerfile with `APP_NAME` so all eight NestJS services share the same build pattern:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.12-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

FROM deps AS build
ARG APP_NAME
RUN test -n "$APP_NAME"
RUN pnpm nx build "$APP_NAME" --configuration=production
RUN pnpm --dir "dist/apps/$APP_NAME" install --prod --frozen-lockfile

FROM node:22.12-alpine3.20 AS runtime
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

REGISTRY="${REGISTRY:-registry.digitalocean.com/qrtable}"
TAG="${TAG:-phase7}"
BACKEND_APPS=(bff authorizer catalog order kitchen payment saas user-access)

for app in "${BACKEND_APPS[@]}"; do
  docker build \
    -f docker/backend.Dockerfile \
    --build-arg APP_NAME="${app}" \
    -t "${REGISTRY}/qrtable-${app}:${TAG}" \
    .
done
```

- [ ] Step 3: Verify one backend image before building all

Run:

```bash
docker build -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:phase7-smoke .
docker run --rm qrtable-bff:phase7-smoke node --version
```

Expected: build exits 0 and Node prints a version.

### Task 3: Build Management App Image

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

FROM node:22.12-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace

FROM base AS deps
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
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

FROM node:22.12-alpine3.20 AS runtime
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
docker build \
  -f docker/management-app.Dockerfile \
  --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
  -t qrtable-management-app:phase7-smoke .
```

Expected: build exits 0.

### Task 4: Build Customer PWA Image

**Files:**

- Create: `docker/customer-pwa.Dockerfile`

- [ ] Step 1: Create static PWA image

Use this content:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.12-alpine3.20 AS build
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
ARG VITE_BFF_URL
ARG VITE_TENANT_ID
ENV VITE_BFF_URL=$VITE_BFF_URL
ENV VITE_TENANT_ID=$VITE_TENANT_ID
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm nx build customer-pwa

FROM nginx:1.27-alpine AS runtime
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
docker build \
  -f docker/customer-pwa.Dockerfile \
  --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg VITE_TENANT_ID=seed-tenant-fallback \
  -t qrtable-customer-pwa:phase7-smoke .
```

Expected: build exits 0.

### Task 5: Replace Dev Provider Compose With Production Infra Compose

**Files:**

- Create: `docker-compose.infra.yaml`
- Create: `docker/postgres/init/001-create-databases.sql`

- [ ] Step 1: Create database init SQL

Use separate databases on one Postgres instance for the baseline:

```sql
CREATE DATABASE qrtable_catalog;
CREATE DATABASE qrtable_order;
CREATE DATABASE qrtable_saas;
CREATE DATABASE qrtable_payment;
CREATE DATABASE qrtable_keycloak;
```

Add additional users later only if the team wants per-service DB credentials in the same release. For the first Phase 7 pilot, one strong Postgres app user is acceptable if network access is internal and credentials are private.

- [ ] Step 2: Create production infra compose

Key requirements:

- Pin image versions.
- No public ports for databases, Redis, Kafka, or Keycloak internal port.
- Use named volumes, not bind-mounted `docker/docker_data`.
- Use health checks.
- Set Kafka advertised listener to `kafka:9092` for app containers.
- Run Keycloak with production `start`, not `start-dev`.

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
  keycloak_data:

services:
  postgres:
    image: postgres:16.6-alpine
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
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
    image: mongo:7.0.16
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
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
    image: redis:7.4.1-alpine
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
    image: bitnami/kafka:3.9.0
    restart: unless-stopped
    environment:
      KAFKA_CFG_NODE_ID: 0
      KAFKA_CFG_PROCESS_ROLES: controller,broker
      KAFKA_CFG_LISTENERS: PLAINTEXT://:9092,CONTROLLER://:9093
      KAFKA_CFG_ADVERTISED_LISTENERS: PLAINTEXT://kafka:9092
      KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP: CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      KAFKA_CFG_CONTROLLER_QUORUM_VOTERS: 0@kafka:9093
      KAFKA_CFG_CONTROLLER_LISTENER_NAMES: CONTROLLER
      KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE: 'true'
    volumes:
      - kafka_data:/bitnami/kafka
    networks:
      - qrtable-infra

  keycloak:
    image: quay.io/keycloak/keycloak:25.0.0
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      KC_DB: postgres
      KC_DB_URL: jdbc:postgresql://postgres:5432/qrtable_keycloak
      KC_DB_USERNAME: ${POSTGRES_USER}
      KC_DB_PASSWORD: ${POSTGRES_PASSWORD}
      KC_HOSTNAME: auth.qrtable.vodinhquan.dev
      KC_HOSTNAME_STRICT: 'true'
      KC_HTTP_ENABLED: 'true'
      KC_PROXY_HEADERS: xforwarded
      KC_HEALTH_ENABLED: 'true'
      KEYCLOAK_ADMIN: ${KEYCLOAK_ADMIN_USER}
      KEYCLOAK_ADMIN_PASSWORD: ${KEYCLOAK_ADMIN_PASSWORD}
    command: ['start']
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - keycloak_data:/opt/keycloak/data
      - ./apps/keycloak-theme/dist_keycloak:/opt/keycloak/providers:ro
    networks:
      - qrtable-infra
      - qrtable-app
```

- [ ] Step 3: Verify compose syntax

Run:

```bash
docker compose -f docker-compose.infra.yaml config
```

Expected: compose renders with no syntax error.

### Task 6: Create App Compose Layer

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
    image: ${REGISTRY}/qrtable-bff:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      PORT: 3300
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      KEYCLOAK_HOST: https://auth.qrtable.vodinhquan.dev
      PUBLIC_API_BASE_URL: https://api.qrtable.vodinhquan.dev
      ORDER_SERVICE_HOST: order
      CATALOG_SERVICE_HOST: catalog
      KITCHEN_SERVICE_HOST: kitchen
      PAYMENT_SERVICE_HOST: payment
      SAAS_SERVICE_HOST: saas
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
    image: ${REGISTRY}/qrtable-order:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      ORDER_PORT: 3301
      TYPEORM_HOST: postgres
      TYPEORM_DATABASE: qrtable_order
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      TCP_ORDER_SERVICE_HOST: order
      TCP_CATALOG_SERVICE_HOST: catalog
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: order
    networks:
      - qrtable-app
      - qrtable-infra

  catalog:
    image: ${REGISTRY}/qrtable-catalog:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      CATALOG_PORT: 3305
      TYPEORM_HOST: postgres
      TYPEORM_DATABASE: qrtable_catalog
      KAFKA_BROKERS: kafka:9092
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: catalog
    networks:
      - qrtable-app
      - qrtable-infra

  kitchen:
    image: ${REGISTRY}/qrtable-kitchen:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      KITCHEN_PORT: 3307
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: kitchen
    networks:
      - qrtable-app
      - qrtable-infra

  payment:
    image: ${REGISTRY}/qrtable-payment:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      PAYMENT_PORT: 3308
      TYPEORM_HOST: postgres
      PAYMENT_TYPEORM_DATABASE: qrtable_payment
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      PUBLIC_API_BASE_URL: https://api.qrtable.vodinhquan.dev
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: payment
    networks:
      - qrtable-app
      - qrtable-infra

  saas:
    image: ${REGISTRY}/qrtable-saas:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      SAAS_PORT: 3306
      TYPEORM_HOST: postgres
      TYPEORM_DATABASE: qrtable_saas
      REDIS_HOST: redis
      KAFKA_BROKERS: kafka:9092
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: saas
    networks:
      - qrtable-app
      - qrtable-infra

  authorizer:
    image: ${REGISTRY}/qrtable-authorizer:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      AUTHORIZER_PORT: 3304
      KEYCLOAK_HOST: https://auth.qrtable.vodinhquan.dev
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: authorizer
    networks:
      - qrtable-app
      - qrtable-infra

  user-access:
    image: ${REGISTRY}/qrtable-user-access:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
    environment:
      USER_ACCESS_PORT: 3303
      MONGODB_URI: mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017
      MONGO_DB_NAME: qrtable
      OTEL_EXPORTER_OTLP_ENDPOINT: http://tempo:4318
    labels:
      app: user-access
    networks:
      - qrtable-app
      - qrtable-infra

  management-app:
    image: ${REGISTRY}/qrtable-management-app:${TAG}
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
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
    image: ${REGISTRY}/qrtable-customer-pwa:${TAG}
    restart: unless-stopped
    labels:
      app: customer-pwa
    networks:
      - qrtable-edge
```

- [ ] Step 2: Add missing app health checks after first successful boot

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
- Order/Catalog/Kitchen/Payment: `/api/v1/health/live`
- Authorizer/SaaS/User-Access: `/api/health/live`

### Task 7: Add Reverse Proxy And HTTPS

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
  basicauth {
    {$GRAFANA_BASIC_AUTH_USER} {$GRAFANA_BASIC_AUTH_HASH}
  }
  reverse_proxy grafana:3000
}
```

Generate the Caddy basic-auth hash on the server:

```bash
docker run --rm caddy:2.8.4 caddy hash-password --plaintext "$GRAFANA_BASIC_AUTH_PASSWORD"
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
    image: caddy:2.8.4
    restart: unless-stopped
    env_file: /opt/qrtable/.env.production
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
docker compose -f docker-compose.proxy.yaml config
```

Expected: compose renders with no syntax error.

### Task 8: Prepare Production Env And Secrets

**Files:**

- Create: `docker/env/.env.production.example`

- [ ] Step 1: Create example with keys only and safe sample values

Include every required key, but do not include real secrets:

```dotenv
REGISTRY=registry.digitalocean.com/qrtable
TAG=phase7

NODE_ENV=production
GLOBAL_PREFIX=api/v1

POSTGRES_USER=qrtable_app
POSTGRES_PASSWORD=generate_on_server
MONGO_ROOT_USERNAME=qrtable_mongo
MONGO_ROOT_PASSWORD=generate_on_server

TYPEORM_HOST=postgres
TYPEORM_PORT=5432
TYPEORM_USERNAME=qrtable_app
TYPEORM_PASSWORD=generate_on_server
TYPEORM_TYPE=postgres
TYPEORM_SYNCHRONIZE=false

REDIS_HOST=redis
REDIS_PORT=6379
REDIS_TTL=1800000

KAFKA_BROKERS=kafka:9092
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

AUTH_SECRET=generate_on_server
AUTH_KEYCLOAK_ID=management-app
AUTH_KEYCLOAK_SECRET=generate_on_server
AUTH_KEYCLOAK_ISSUER=https://auth.qrtable.vodinhquan.dev/realms/qrtable

PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev
MANAGEMENT_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev
VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
VITE_TENANT_ID=seed-tenant-fallback

PAYMENT_TYPEORM_DATABASE=qrtable_payment
SEPAY_WEBHOOK_SECRET=generate_on_server_or_provider_value
SEPAY_PLATFORM_WEBHOOK_SECRET=generate_on_server_or_provider_value
BFF_PAYMENT_TCP_TIMEOUT_MS=5000
PAYMENT_SEPAY_QR_ACCOUNT=provider_value
PAYMENT_SEPAY_QR_BANK=provider_value
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

- [ ] Step 2: Generate server secrets

Run on the server:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Expected:

- `PAYMENT_SECRETS_ENCRYPTION_KEY` is exactly 64 hex characters.
- `AUTH_SECRET`, DB passwords, Keycloak secrets, and Grafana passwords are strong random values.
- The actual `/opt/qrtable/.env.production` is never committed.

### Task 9: Resolve The Schema And Migration Blocker

**Files:**

- Create one of these, depending on final choice:
  - `tools/db/phase7-schema.sql`
  - or TypeORM migration files under a project-owned migration folder

- [ ] Step 1: Choose the schema strategy before public production

Accepted strategies:

1. Generate and version SQL schema for the current implemented entities.
2. Add TypeORM migration generation and run migrations per service DB.

Rejected strategies:

- Running the Droplet with `NODE_ENV=development`.
- Depending on `TYPEORM_SYNCHRONIZE=true` in production. The current code prevents synchronize outside development/test.

- [ ] Step 2: Create schemas/databases before app boot

For SQL strategy:

```bash
psql "$POSTGRES_URL" -f tools/db/phase7-schema.sql
```

For migration strategy:

```bash
pnpm nx run catalog:migration:run
pnpm nx run order:migration:run
pnpm nx run saas:migration:run
pnpm nx run payment:migration:run
```

Expected:

- `qrtable_catalog` has Catalog tables.
- `qrtable_order` has Order tables and outbox.
- `qrtable_saas` has tenant/subscription tables and outbox.
- `qrtable_payment` has payment, audit, outbox, and tenant payment settings tables.

- [ ] Step 3: Seed data after schema is verified

Adapt existing tools:

```bash
pnpm dev:reseed -- --yes
pnpm dev:verify-seed
```

Expected:

- One tenant exists with stable slug.
- At least 5 categories, 20 items, and 8 tables exist.
- Seeded Keycloak users can log in.
- Seed IDs used by E2E are written to a non-secret deployment notes file.

### Task 10: Bootstrap Keycloak For Public Domains

**Files:**

- Modify or wrap: `tools/keycloak-bootstrap.sh`
- Create: `tools/deploy/phase7-keycloak-bootstrap.sh`

- [ ] Step 1: Build or mount the Keycloak theme

Run before starting Keycloak:

```bash
pnpm theme:build
```

Expected: `apps/keycloak-theme/dist_keycloak` exists and contains the theme provider jar/assets expected by Keycloak.

- [ ] Step 2: Bootstrap realm and clients with production URLs

Run against the public Keycloak URL after Caddy is live:

```bash
KEYCLOAK_HOST=https://auth.qrtable.vodinhquan.dev \
KEYCLOAK_ADMIN_USER="$KEYCLOAK_ADMIN_USER" \
KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
KEYCLOAK_REALM=qrtable \
KEYCLOAK_CLIENT_ID=qrtable-bff \
KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET" \
MANAGEMENT_APP_CLIENT_ID=management-app \
MANAGEMENT_APP_CLIENT_SECRET="$MANAGEMENT_APP_CLIENT_SECRET" \
KEYCLOAK_MASTER_SSL_REQUIRED=external \
KEYCLOAK_REALM_SSL_REQUIRED=external \
bash tools/keycloak-bootstrap.sh
```

- [ ] Step 3: Update redirect URIs and web origins

Ensure Keycloak clients include:

```text
https://app.qrtable.vodinhquan.dev/*
https://api.qrtable.vodinhquan.dev/*
```

Expected:

- Management App login redirects through `auth.qrtable.vodinhquan.dev`.
- BFF Authorizer can exchange client tokens with Keycloak.

### Task 11: Configure SePay Production Integration

SePay is a production dependency, not only an env-var detail. The deployment is not ready until the SePay dashboard/API configuration matches QRTable's public routes and the code path being used.

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

- [ ] Step 1: Choose the live SePay route set

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

- [ ] Step 2: Configure platform subscription webhook

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

- [ ] Step 3: Configure tenant OAuth Connect

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

- [ ] Step 4: Verify SePay webhook API surface against the real account

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

- [ ] Step 5: Define safe live verification

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
- Confirm webhook request appears in BFF logs.
- Confirm the provider transaction id is stored/audited for idempotency.
- Confirm underpaid and duplicate events do not incorrectly mark payment complete.
- Confirm Grafana shows the webhook request, payment audit, and any provider API errors without leaking tokens/secrets.

### Task 12: Rewire Monitoring For App Containers

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
          - kitchen:3307
          - payment:3308

  - job_name: qrtable-backend-api-prefix
    metrics_path: /api/metrics
    static_configs:
      - targets:
          - authorizer:3304
          - user-access:3303
          - saas:3306
```

- [ ] Step 2: Keep monitoring stores private

Production rules:

- Do not publish Loki, Prometheus, or Tempo ports.
- Publish Grafana only through the reverse proxy with HTTPS and basic auth.
- Use Promtail Docker labels from app containers: `app=bff`, `app=order`, and so on.

- [ ] Step 3: Verify Grafana

Run:

```bash
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml config
```

Expected: production compose has no public `3100`, `9090`, `3200`, or `4318` ports.

### Task 13: Provision DigitalOcean

**Files:**

- Create: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Step 1: Create Droplet

Use:

- Ubuntu 24.04 LTS or current DO-supported Ubuntu LTS.
- Region `sgp1` if available.
- SSH key auth.
- No password login.
- Cloud Firewall attached.
- Backups enabled before first public demo.

- [ ] Step 2: Configure firewall

Allow:

```text
22/tcp from your current IP only
80/tcp from 0.0.0.0/0
443/tcp from 0.0.0.0/0
```

Deny public access to:

```text
3000, 3001, 3300-3308, 3201-3208, 5432, 6379, 27017, 9092, 9090, 3100, 3200, 4318
```

- [ ] Step 3: Install Docker Engine

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

- [ ] Step 4: Configure DNS

Create A records pointing to the Droplet IPv4:

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

Each command returns the Droplet IP.

### Task 14: Deploy The Stack

**Files:**

- Create: `tools/deploy/phase7-preflight.sh`
- Create: `tools/deploy/phase7-smoke.sh`

- [ ] Step 1: Copy repository or release bundle to `/opt/qrtable`

Recommended first pilot:

```bash
: "${QRTABLE_REPOSITORY_URL:?Set this to the private QRTable git URL before cloning}"
sudo mkdir -p /opt/qrtable
sudo chown "$USER:$USER" /opt/qrtable
git clone "$QRTABLE_REPOSITORY_URL" /opt/qrtable
```

If using image-only deploy later, replace this with a release bundle containing compose files and `.env.production`.

- [ ] Step 2: Put private env on server

```bash
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Then edit `/opt/qrtable/.env.production` on the server and replace generated values using `openssl rand`.

- [ ] Step 3: Start layers in order

```bash
docker compose -f docker-compose.infra.yaml up -d
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml up -d
docker compose -f docker-compose.app.yaml up -d
docker compose -f docker-compose.proxy.yaml up -d
```

- [ ] Step 4: Verify running services

```bash
docker compose -f docker-compose.infra.yaml ps
docker compose -f docker-compose.app.yaml ps
docker compose -f docker-compose.proxy.yaml ps
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml ps
```

Expected:

- Infra services are healthy or running.
- App containers are running.
- Caddy has obtained certificates and serves HTTPS.

### Task 15: Run Smoke And Demo Verification

**Files:**

- Create: `tools/deploy/phase7-smoke.sh`
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
docker compose -f docker-compose.monitoring.yaml exec prometheus wget -qO- http://bff:3300/api/v1/metrics
docker compose -f docker-compose.monitoring.yaml exec prometheus wget -qO- http://order:3301/api/v1/metrics
```

Expected: Prometheus text exposition contains `qrtable_http_requests_total`.

- [ ] Step 3: Browser E2E smoke

Use the existing e2e suite only after seed and Keycloak bootstrap are stable:

```bash
BASE_URL=https://app.qrtable.vodinhquan.dev \
CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
pnpm e2e:demo
```

Expected: selected demo tests pass. If the suite still assumes localhost, record the required Playwright config changes as a separate implementation task before calling Phase 7 green.

- [ ] Step 4: SePay route smoke

Verify registered public routes:

```bash
curl -i https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
curl -i https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/demo-tenant
```

Expected: method/auth errors are returned by BFF, proving the public route is reachable without accepting unauthenticated payloads.

### Task 16: Backup, Rollback, And Operations

**Files:**

- Create: `docs/guides/phase-7-digitalocean-deployment.md`
- Create: `tools/deploy/phase7-backup.sh`

- [ ] Step 1: Enable DigitalOcean backup/snapshot

Use Droplet backups for host-level recovery.

- [ ] Step 2: Add logical backup script

```bash
#!/usr/bin/env bash
set -euo pipefail

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "/opt/qrtable/backups/${stamp}"

docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_catalog > "/opt/qrtable/backups/${stamp}/qrtable_catalog.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_order > "/opt/qrtable/backups/${stamp}/qrtable_order.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_saas > "/opt/qrtable/backups/${stamp}/qrtable_saas.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_payment > "/opt/qrtable/backups/${stamp}/qrtable_payment.sql"
docker compose -f docker-compose.infra.yaml exec -T mongodb mongodump --archive > "/opt/qrtable/backups/${stamp}/mongodb.archive"
```

- [ ] Step 3: Define rollback

Rollback image tag:

```bash
TAG=previous-good docker compose -f docker-compose.app.yaml up -d
```

Rollback infra data:

- Stop app layer first.
- Restore Postgres/Mongo from logical backup or Droplet snapshot.
- Start app layer.
- Re-run smoke checks.

### Task 17: Add CI/CD Pipeline And Release Process

CI/CD is part of Phase 7, but it must be treated as a separate deployment control plane rather than hidden inside manual server commands.

**Current repo state:**

- Existing: `.github/workflows/ci.yml`
- Existing CI trigger: `push` to `main` and `pull_request`
- Existing CI command: `pnpm exec nx run-many -t lint test build`
- Missing: Docker image build workflow
- Missing: registry push workflow
- Missing: production deploy workflow
- Missing: rollback-by-tag workflow
- Missing: migration/schema gate

**Files:**

- Modify: `.github/workflows/ci.yml`
- Create: `.github/workflows/release-images.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `.github/workflows/rollback-production.yml`
- Create: `tools/deploy/phase7-build-images.sh`
- Create: `tools/deploy/phase7-remote-deploy.sh`
- Create: `tools/deploy/phase7-remote-rollback.sh`
- Create: `tools/deploy/phase7-preflight.sh`
- Create: `tools/deploy/phase7-smoke.sh`
- Modify: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Step 1: Keep CI as the PR quality gate

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

- [ ] Step 2: Add a release-images workflow

Trigger:

- `workflow_dispatch`
- `push` to `main` after CI is green

Permissions:

- `contents: read`
- no repository write permission

Inputs:

- `image_tag` defaulting to `${{ github.sha }}`
- `push_latest` defaulting to `false`

Secrets:

- `DIGITALOCEAN_ACCESS_TOKEN`

Workflow responsibilities:

1. Checkout repository.
2. Install Node.js 20 and pnpm 9.8.0.
3. Install dependencies with frozen lockfile.
4. Run CI build checks.
5. Login to DigitalOcean Container Registry.
6. Build and push all Phase 7 images.
7. Emit image digest summary.

Expected image names:

```text
registry.digitalocean.com/qrtable/bff:${GITHUB_SHA}
registry.digitalocean.com/qrtable/authorizer:${GITHUB_SHA}
registry.digitalocean.com/qrtable/catalog:${GITHUB_SHA}
registry.digitalocean.com/qrtable/order:${GITHUB_SHA}
registry.digitalocean.com/qrtable/kitchen:${GITHUB_SHA}
registry.digitalocean.com/qrtable/payment:${GITHUB_SHA}
registry.digitalocean.com/qrtable/saas:${GITHUB_SHA}
registry.digitalocean.com/qrtable/user-access:${GITHUB_SHA}
registry.digitalocean.com/qrtable/management-app:${GITHUB_SHA}
registry.digitalocean.com/qrtable/customer-pwa:${GITHUB_SHA}
```

Important build rule:

- Public frontend values may be build args: `NEXT_PUBLIC_*`, `VITE_*`.
- Private secrets must never be Docker build args.
- Production secrets stay in `/opt/qrtable/.env.production` or a future secret manager.

- [ ] Step 3: Add deployment environment protection

Use GitHub Environments:

```text
Environment: production
Required reviewers: owner/deployment maintainer
Deployment branch: main only
```

Why:

- SePay live webhooks can affect external payment state.
- Keycloak production clients must not be changed accidentally.
- DB schema state must be checked before replacing app containers.

- [ ] Step 4: Add deploy-production workflow

Trigger:

- `workflow_dispatch` only for the first production phase.

Inputs:

- `image_tag` required
- `run_smoke` default `true`
- `run_backup_before_deploy` default `true`

Secrets:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_SSH_PORT`

Deployment flow:

```text
CI green
  -> release-images pushes immutable image tag
  -> deploy-production waits for production approval
  -> remote preflight
  -> optional backup
  -> docker compose pull
  -> docker compose up -d app layer
  -> smoke tests
  -> record deployed tag
```

Remote command shape:

```bash
ssh "$PRODUCTION_SSH_USER@$PRODUCTION_SSH_HOST" \
  "cd /opt/qrtable && IMAGE_TAG='${IMAGE_TAG}' ./tools/deploy/phase7-remote-deploy.sh"
```

The remote deploy script must:

- Refuse to run if `/opt/qrtable/.env.production` is missing or world-readable.
- Refuse to deploy if `IMAGE_TAG` is empty.
- Run `docker compose config` for infra, monitoring, app, and proxy layers.
- Pull images for the requested immutable tag.
- Start app containers without rebuilding on the server.
- Run health checks after container replacement.
- Write the successful tag to `/opt/qrtable/releases/current`.

- [ ] Step 5: Add schema/migration gate

Before production deployment, the workflow must verify one of these is true:

1. TypeORM migrations exist and have been applied successfully.
2. A reviewed production schema SQL bootstrap has already been applied.
3. The deployment is explicitly marked as demo-only and uses a disposable database.

This is a hard gate because current production config disables TypeORM synchronize.

Recommended gate script:

```bash
./tools/deploy/phase7-preflight.sh --require-schema-ready
```

- [ ] Step 6: Add smoke tests to CI/CD

Smoke tests should run from the GitHub runner after deployment because public DNS, TLS, reverse proxy, and CORS must be verified externally.

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

- [ ] Step 7: Add rollback-production workflow

Trigger:

- `workflow_dispatch`

Inputs:

- `rollback_tag` required
- `restore_data` default `false`

Rollback flow:

```text
production approval
  -> remote preflight
  -> optional backup
  -> set IMAGE_TAG to rollback_tag
  -> docker compose pull
  -> docker compose up -d app layer
  -> smoke tests
  -> record rollback event
```

Rollback must not restore database automatically unless `restore_data=true` and the operator confirms the exact backup timestamp. App rollback and data rollback are separate operations.

- [ ] Step 8: Add deployment audit trail

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

- [ ] Step 9: Decide when to automate deploy on merge

Recommended Phase 7 policy:

| Stage              | Release images             | Deploy production                    |
| ------------------ | -------------------------- | ------------------------------------ |
| First pilot        | Manual                     | Manual with approval                 |
| Stable thesis demo | Push to main builds images | Manual with approval                 |
| Mature production  | Push to main builds images | Optional auto-deploy to staging only |

Do not auto-deploy production on every merge until migrations, backups, rollback, and smoke tests are proven.

### Task 18: Update Canonical Docs After Implementation

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
- Acceptance evidence.

- [ ] Step 2: Update technical architecture section 14

Make the section match real files:

- `docker-compose.infra.yaml`
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

## 6. Production Acceptance Criteria

Phase 7 is accepted only when all items below are true:

- [ ] `docker compose` can start infra, monitoring, app, and proxy layers from a clean server checkout.
- [ ] Public HTTPS works for `api`, `app`, `qr`, `auth`, and protected `grafana` subdomains.
- [ ] Only 80/443 and restricted SSH are public.
- [ ] BFF `/api/v1/health/live` and `/api/v1/health/ready` pass.
- [ ] Management App login works with Keycloak through `auth.qrtable.vodinhquan.dev`.
- [ ] Customer QR flow works through `qr.qrtable.vodinhquan.dev`.
- [ ] POS/KDS flow works through `app.qrtable.vodinhquan.dev`.
- [ ] Payment webhook routes are publicly reachable over HTTPS and reject invalid auth.
- [ ] SePay platform `QRSUB` webhook route is registered against the correct public URL and secret-key auth mode.
- [ ] SePay tenant `QRTBL` OAuth Connect flow can create or verify a tenant webhook URL with tenant slug.
- [ ] SePay API surface mismatch (`/api/v1/webhooks` vs `/v1/webhook`, `Api_Key` vs `SECRET_KEY`) is resolved with evidence from the actual SePay account before live use.
- [ ] Grafana shows logs, metrics, and traces from real app containers.
- [ ] Seed/reset strategy can restore the demo dataset.
- [ ] Backup and rollback procedure is documented and tested at least once.
- [ ] CI remains green for `lint`, `test`, and `build`.
- [ ] Release workflow can build and push immutable Docker image tags.
- [ ] Production deploy workflow can deploy a selected immutable image tag with approval.
- [ ] Rollback workflow can redeploy the previous successful image tag.
- [ ] Canonical docs are updated after implementation.

## 7. Cost And Scaling Notes

Use the smallest deployment that is honest for the current product:

- Pilot: one 4 vCPU / 8 GiB Droplet, self-host infra, backups enabled.
- Budget smoke: one 2 vCPU / 4 GiB Droplet, monitoring reduced or stopped outside demo windows.
- Hardening: managed PostgreSQL and Valkey when data safety and operations matter more than monthly cost.
- Avoid managed Kafka for thesis/pilot unless budget is intentionally allocated; DigitalOcean managed Kafka is designed as a multi-node managed cluster.

DigitalOcean product facts verified on 2026-06-06:

- Droplets start at USD 4/month.
- Managed databases start at USD 15/month.
- Managed PostgreSQL 1 GiB starts around USD 15.15/month.
- Managed Valkey 1 GiB starts around USD 15/month.
- Load Balancers start at USD 12/month.
- Droplet backups are percentage-based relative to Droplet cost.

## 8. Risks And Mitigations

| Risk                                     | Impact                                                   | Mitigation                                                                        |
| ---------------------------------------- | -------------------------------------------------------- | --------------------------------------------------------------------------------- |
| No TypeORM migrations                    | Fresh production DB has no tables                        | Implement schema SQL or TypeORM migrations before go-live                         |
| Kafka `localhost` advertised listener    | App containers cannot connect                            | Use `PLAINTEXT://kafka:9092` in production compose                                |
| Vite public env is build-time            | Customer PWA points to wrong API after image reuse       | Build image with production `VITE_BFF_URL`, or implement runtime config later     |
| Next public env is partly build-time     | Management App client bundle points to wrong API         | Build with production `NEXT_PUBLIC_*` and also provide runtime env                |
| Keycloak `start-dev`                     | Insecure production IAM                                  | Use `start`, external hostname, DB-backed Keycloak                                |
| Public Grafana                           | Observability leaks tenant or system data                | Put behind HTTPS, basic auth, firewall/IP restriction                             |
| CORS `*`                                 | Browser clients from unwanted origins can call BFF       | Add `CORS_ORIGINS` config before public production                                |
| Secrets in compose                       | Credential leak                                          | Use `/opt/qrtable/.env.production` with 0600 permissions                          |
| Single Droplet failure                   | Full outage                                              | Enable backups/snapshots; later move DB to managed service                        |
| SePay API surface mismatch               | OAuth webhook registration fails after deploy            | Verify current SePay account API shape before live production                     |
| Wrong SePay webhook route                | Tenant bill or subscription invoice never settles        | Register `QRTBL` tenant route and `QRSUB` platform route separately               |
| Live payment test mutates external state | Real money movement or incorrect subscription activation | Keep CI negative-only; perform low-value manual live verification with audit logs |

## 9. Useful Follow-Up Enhancements

- Add `CORS_ORIGINS` to BFF config and restrict to `app.qrtable.vodinhquan.dev` and `qr.qrtable.vodinhquan.dev`.
- Add TypeORM migrations per service and CI migration smoke.
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
- Kept the output as a new plan artifact instead of rewriting canonical docs prematurely.
- Preserved QRTable service boundaries and deployment ownership in the plan.
- Treated secrets as runtime-only values and avoided committing real credentials.
- Flagged production blockers instead of hiding them behind optimistic deployment steps.
- Included CI/CD as a first-class Phase 7 task with release, deploy, rollback, approval, and smoke-test gates.
- Added SePay provider-doc verification and made live webhook/OAuth setup a production deployment gate.

### ⚠️ Debt Flags (non-blocking — improve when touched again)

- FLAG001 [STRUCT] Phase 7 target compose files are documented but not implemented yet.
- FLAG002 [PATTERN] Monitoring compose is currently local-host oriented and needs a production override.
- FLAG003 [PATTERN] SePay webhook upsert API shape in code must be verified against the exact live SePay product/account before production.
- FLAG003 [ENV_LEAK] Existing provider compose has dev credentials and dev exposure patterns.
- FLAG004 [STRUCT] `dist/` contains stale app artifacts and should not be trusted for deployment.

### 🔴 Blockers (fixed in output or MUST fix before merge)

- BLOCK001 [STRUCT] Application Dockerfiles and production app compose do not exist yet.
- BLOCK002 [STRUCT] Production schema/migration strategy is missing while TypeORM synchronize is disabled outside development/test.
- BLOCK003 [ENV_LEAK] Production secrets must be generated and stored outside git.
- BLOCK004 [PATTERN] Keycloak production must not use `start-dev`.

### 💡 Suggestions

- Start Phase 7 with the schema/migration gate and Dockerfiles before touching DigitalOcean.
- Use fixed subdomains first, then add wildcard tenant routing only when source code needs it.
- Treat managed PostgreSQL/Valkey as the first hardening upgrade after the single-Droplet pilot.
