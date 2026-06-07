# Phase 7 — Kế hoạch triển khai Docker trên DigitalOcean

> **Bản tiếng Việt** — đã đồng bộ với revision 2026-06-07 (database-per-service). Bản tiếng Anh canonical: [2026-06-06-phase-7-docker-digitalocean-deployment.md](2026-06-06-phase-7-docker-digitalocean-deployment.md)

> **Revision 2026-06-07:** Cập nhật plan tiếng Anh sau khi implement database-per-service. Revision này sửa tên env database production, tái sử dụng migration và ownership check đã implement, và thêm migration gate one-shot trước khi boot app.

> **Dành cho agent / dev thực thi:** BẮT BUỘC dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để implement plan theo từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Đóng gói QRTable thành Docker image tái lập được và triển khai baseline pilot/production Phase 7 lên DigitalOcean dưới domain `vodinhquan.dev`.

**Kiến trúc:** Dùng một DigitalOcean Droplet làm baseline production Phase 7, Docker Compose tách thành các lớp proxy, app, infra và monitoring cộng migration job one-shot. Traffic công khai terminate tại reverse proxy; PostgreSQL, MongoDB, Redis, Kafka, Keycloak, Loki, Prometheus, Tempo và mọi cổng TCP NestJS nằm trên mạng Docker nội bộ. Managed database của DigitalOcean là tùy chọn hardening sau, không phải phụ thuộc đầu tiên cho luận văn/pilot.

**Tech stack:** DigitalOcean Droplet, Ubuntu, Docker Engine, Docker Compose plugin, Nx, pnpm, NestJS, Next.js, Vite, PostgreSQL, MongoDB, Redis, Kafka KRaft, Keycloak, reverse proxy Caddy hoặc Nginx, Grafana, Loki, Promtail, Prometheus, Tempo, OpenTelemetry.

---

## 1. Evidence Snapshot (Ảnh chụp bằng chứng)

### 1.1 CodeGraph trước

Lệnh chạy trước khi inspect file trực tiếp:

```bash
codegraph status .
codegraph query "Dockerfile docker compose docker-compose production deploy deployment DigitalOcean nginx reverse proxy ssl postgres redis kafka keycloak nx build"
codegraph context "Understand QRTable current deployment and packaging state for Phase 7 Docker production deploy on DigitalOcean. Focus on apps, services, Nx targets, Dockerfiles, compose files, env/config, observability, gateways, frontend apps, docs anchors."
```

Kết quả mới nhất:

- CodeGraph index đã cập nhật.
- Phạm vi index: 1.182 file, 15.444 node, 29.940 edge.
- Truy vấn CodeGraph không tìm thấy Dockerfile ứng dụng hay file app compose — khớp với kiểm tra filesystem trực tiếp.

Delta implement database-per-service đã verify ngày 2026-06-07:

- Catalog, Order, Payment và SaaS hiện có TypeORM DataSource và migration ban đầu thuộc project.
- User-Access resolve MongoDB qua `USER_ACCESS_MONGO_DB_NAME=qrtable_auth`.
- Tên database PostgreSQL riêng là mặc định; shared fallback legacy yêu cầu flag rõ `DATABASE_SHARED_FALLBACK_ENABLED=true`.
- `TYPEORM_SYNCHRONIZE=false` là baseline vòng đời schema được hỗ trợ.
- Luồng provision local, migration, ownership verification, seed tách và reseed đã pass trên các database riêng.

### 1.2 Tài liệu canonical đã đọc

Đã đọc và đối chiếu:

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

Thứ tự source-of-truth từ `docs/README.md` vẫn là:

1. Code và test hiện tại.
2. Spec mới nhất đã chấp nhận.
3. Bản ghi phase cuối.
4. Tài liệu hỗ trợ cũ hơn sau khi verify.

### 1.3 Tài liệu bên ngoài đã kiểm tra

Context7 CLI:

```bash
npx ctx7@latest library "DigitalOcean" "QRTable Phase 7 Docker production deployment plan on DigitalOcean with Docker Compose, domains/subdomains, SSL, reverse proxy, PostgreSQL, Redis, Kafka, Keycloak, monitoring, and production configuration"
npx ctx7@latest docs /websites/digitalocean "Docker Compose production deployment on DigitalOcean Droplet with Ubuntu, firewall, domains/subdomains DNS A records, Nginx reverse proxy, Let's Encrypt SSL certificates, managed PostgreSQL, Redis, container registry, backups, monitoring, and deployment checklist"
npx ctx7@latest library "SePay" "SePay VietQR OAuth webhook API documentation for deployment checklist webhook URL x-secret-key API key OAuth redirect and production configuration"
npx ctx7@latest docs /websites/developer_sepay_vn "SePay OAuth2 authentication webhook setup API key x-secret-key webhook URL request content type VietQR QR URL bank account production deployment checklist"
```

Đã kiểm tra thêm trang chính thức DigitalOcean về giá Droplet, managed database, Kafka và Docker trên Ubuntu. Sự kiện quan trọng:

- Droplet từ USD 4/tháng; managed database từ USD 15/tháng.
- Managed PostgreSQL 1 GiB khoảng USD 15,15/tháng; managed Valkey (Redis-compatible) 1 GiB khoảng USD 15/tháng.
- DigitalOcean managed Kafka là sản phẩm cluster 3 node, giá cao hơn nhiều so với mục tiêu luận văn/pilot.
- DigitalOcean Container Registry có tier miễn phí, nhưng cần kiểm tra dung lượng trước khi dựa vào cho 11 image QRTable, gồm cả image migration one-shot.
- Docker trên Ubuntu nên cài từ repository chính thức của Docker; bản hiện đại gồm `docker compose` dạng plugin.

Tài liệu SePay qua Context7 ngày 2026-06-06. Sự kiện deploy quan trọng:

- URL webhook production phải là HTTPS.
- Bank Hub webhook upsert hỗ trợ URL webhook active, loại auth, secret và danh sách event.
- Request webhook/IPN SePay có thể xác thực bằng `X-Secret-Key` khi cấu hình secret-key auth.
- Payload webhook gồm provider transaction id, bank gateway, số tài khoản, nội dung/mã giao dịch, chiều chuyển khoản, số tiền, số dư, mã tham chiếu và mô tả.
- Response webhook thành công nên là JSON success đơn giản, không phải wrapper API nội bộ của QRTable.
- Code QRTable hiện tại hỗ trợ route webhook secret-key tenant/platform và route HMAC Phase 3 legacy; phải kiểm tra sản phẩm/tài khoản SePay thật trước khi đăng ký route.

## 2. Read The Room (Đọc hiện trạng repo)

### 2.1 Trạng thái repository quan sát được

Ứng dụng có thể deploy từ `pnpm nx show projects` và `apps/*/project.json`:

| Lớp      | Project          | Build target        | Ghi chú runtime                                      |
| -------- | ---------------- | ------------------- | ---------------------------------------------------- |
| Backend  | `bff`            | webpack CLI         | HTTP/WebSocket gateway, public API, Swagger, metrics |
| Backend  | `authorizer`     | webpack CLI         | HTTP + TCP + gRPC, tích hợp Keycloak admin           |
| Backend  | `catalog`        | webpack CLI         | HTTP + TCP, PostgreSQL                               |
| Backend  | `order`          | webpack CLI         | HTTP + TCP, PostgreSQL, Redis, Kafka                 |
| Backend  | `kitchen`        | webpack CLI         | HTTP + TCP, Redis, Kafka                             |
| Backend  | `payment`        | webpack CLI         | HTTP + TCP, PostgreSQL, Redis OAuth cache, SePay     |
| Backend  | `saas`           | webpack CLI         | HTTP + TCP, PostgreSQL, Redis, Kafka                 |
| Backend  | `user-access`    | webpack CLI         | HTTP + TCP + gRPC, MongoDB                           |
| Frontend | `management-app` | Next.js build/start | Auth.js/Keycloak, UI staff/owner/admin nội bộ        |
| Frontend | `customer-pwa`   | Vite build          | PWA tĩnh, luồng QR/session/khách                     |
| Theme    | `keycloak-theme` | package script      | Asset theme Keycloak tùy chỉnh                       |

File Docker hiện có:

- Đã có: `docker-compose.provider.yaml`
- Đã có: `docker-compose.monitoring.yaml`
- Thiếu: `.dockerignore` ở root
- Thiếu: Dockerfile ứng dụng
- Thiếu: `docker-compose.app.yaml`
- Thiếu: compose reverse proxy production
- Thiếu: file env mẫu production cho mọi app service

Triển khai monitoring hiện tại:

- `libs/observability` tồn tại, export health, logging, metrics, OTel, trace context và outbox trace helpers.
- Mọi `main.ts` backend đăng ký OpenTelemetry với tên ổn định như `qrtable-bff`, `qrtable-order`, `qrtable-payment`.
- Backend đăng ký `QrtableLoggingModule` và `QrtableMetricsModule`.
- `docker-compose.monitoring.yaml` gồm Grafana, Loki, Promtail, Prometheus và Tempo.
- Prometheus config hiện scrape app chạy trên host qua `host.docker.internal`; container app Phase 7 cần target scrape theo tên service.

Sự kiện env/config hiện tại:

- API công khai BFF dùng `PORT=3300` và `GLOBAL_PREFIX=api/v1`.
- Cổng HTTP service: 3301, 3303, 3304, 3305, 3306, 3307, 3308.
- Cổng TCP: 3201, 3203, 3204, 3205, 3206, 3207, 3208.
- Catalog, Order, Payment và SaaS yêu cầu `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE` và `SAAS_TYPEORM_DATABASE` ở staging/production.
- User-Access yêu cầu `USER_ACCESS_MONGO_DB_NAME` ở staging/production.
- Production phải giữ `DATABASE_SHARED_FALLBACK_ENABLED=false`; `TYPEORM_DATABASE` và `MONGO_DB_NAME` chỉ là fallback chuyển tiếp legacy.
- Payment yêu cầu giá trị OAuth SePay, public API base URL và `PAYMENT_SECRETS_ENCRYPTION_KEY` ở staging/production.
- Management App cần `AUTH_SECRET`, `AUTH_KEYCLOAK_*`, `MANAGEMENT_BFF_BASE_URL`, `NEXT_PUBLIC_BFF_*` và `NEXT_PUBLIC_CUSTOMER_PWA_URL`.
- Customer PWA cần `VITE_BFF_URL` lúc build; `VITE_TENANT_ID` chỉ là fallback vì luồng QR hỗ trợ `tenant=<slug>`.

Sự kiện vòng đời database hiện tại:

- Bootstrap database service hiện có: `docker/postgres/init/001-create-service-databases.sql`.
- Entrypoint migration hiện có: `pnpm db:migrate` và `pnpm db:migration:show`.
- Ownership gate hiện có: `pnpm db:verify:ownership`.
- Test tooling database hiện có: `pnpm db:test`.
- `pnpm dev:reseed -- --yes` là tooling destructive chỉ dùng development và không được dùng trên dữ liệu production.

### 2.2 Quick quality scan (Quét chất lượng nhanh)

Blocker cần xử lý trước production công khai:

- Chưa có Dockerfile ứng dụng hay lớp app compose.
- Chưa có `.dockerignore` — build context sẽ gồm `node_modules`, `dist`, file env local và dữ liệu sinh ra nếu không sửa.
- Migration TypeORM per-service đã tồn tại, nhưng Phase 7 chưa đóng gói và chạy chúng dưới dạng migration job production one-shot trước khi boot app.
- `docker-compose.provider.yaml` dùng default thân thiện dev: `mongo`, `postgres`, `redis` không pin version, `redisinsight:latest`, `bitnamilegacy/kafka`, credential dev và Keycloak `start-dev`.
- Kafka advertise `localhost` — ổn cho app chạy trên host local, không ổn cho container app.
- Compose monitoring expose Grafana công khai trên `3001` và scrape app chạy host; production phải đặt Grafana sau HTTPS/kiểm soát truy cập và scrape theo tên service nội bộ.
- BFF hiện bật CORS `origin: '*'`; production nên giới hạn origin management và customer.
- `dist/` còn artifact build cũ `product` và `invoice` dù `apps/` không còn các project đó. Build production phải clean và build lại từ source.

Debt flags:

- Một số doc vẫn ghi Phase 6/7 là TODO dù code observability và monitoring compose đã có.
- `technical-architecture.md` mô tả file compose mục tiêu (`docker-compose.infra.yaml`, `docker-compose.app.yaml`) chưa được implement.
- Global prefix service không thống nhất: một số dùng `api/v1`, `authorizer`, `saas`, `user-access` dùng `api`. Prometheus và rule proxy phải tính đến điều này cho đến khi thống nhất.
- Hành vi env host `TcpConfiguration` dễ cấu hình sai; compose production nên set cả legacy host keys và TCP-specific host keys khi cần.

Nền tảng vững:

- Metadata project Nx rõ ràng cho mọi app hiện tại.
- Webpack build backend đã sinh `dist/apps/<service>/package.json` và lockfile.
- Baseline observability đủ để giữ nguyên trong Phase 7.
- `tools/keycloak-bootstrap.sh` có thể provision realm, client, role và user nếu chỉnh cho hostname production.
- DataSource và migration ban đầu per-service đã tồn tại cho Catalog, Order, Payment và SaaS.
- `tools/database/verify-service-database-ownership.js` từ chối bảng service thiếu hoặc thuộc service khác.
- `tools/dev-seed/*` hiện tách ownership PostgreSQL theo service và dùng MongoDB `qrtable_auth`.
- `tools/dev-reseed.sh` vẫn hữu ích cho môi trường local/demo dùng một lần, nhưng đường reset destructive của nó cố ý không an toàn cho production.

## 3. Quyết định triển khai

### 3.1 Nền tảng đã chọn

Dùng DigitalOcean Droplet cho Phase 7.

Lý do:

- Kiến trúc hiện tại nhắm rõ Docker + Docker Compose trên VPS/cloud VM tự host.
- App Platform vận hành dễ hơn nhưng ít khớp topology Compose đa service TCP/gRPC/Kafka hiện tại.
- Kubernetes/DOKS không cần cho luận văn/pilot — thêm phạm vi cluster, ingress, scheduling và secret management mà Phase 7 không cần.
- Managed Kafka đắt hơn nhiều so với baseline luận văn/pilot so với Kafka self-host trong Compose.

Region ban đầu:

- Ưu tiên `sgp1` cho độ trễ Việt Nam nếu đủ sản phẩm.
- Nếu sản phẩm không có ở `sgp1`, dùng region gần nhất và giữ mọi resource cùng một region.

Kích thước ban đầu:

- Droplet pilot khuyến nghị: 4 vCPU / 8 GiB RAM.
- Droplet smoke/demo tối thiểu: 2 vCPU / 4 GiB RAM chỉ khi giảm monitoring và giới hạn memory Kafka/Keycloak.
- Thêm block volume nếu DB local và retention observability cần nhiều disk hơn Droplet.

### 3.2 Baseline production so với lộ trình hardening

Baseline Phase 7:

- Một Droplet.
- Docker Compose.
- Self-host PostgreSQL, MongoDB, Redis, Kafka, Keycloak, monitoring.
- Reverse proxy Caddy với HTTPS.
- Bật DigitalOcean Cloud Firewall và Droplet backups.
- Công khai chỉ: 80, 443 và SSH hạn chế.

Hardening sau luận văn/pilot:

- Chuyển PostgreSQL sang DigitalOcean Managed PostgreSQL.
- Chuyển Redis sang DigitalOcean Managed Caching for Valkey.
- Giữ Kafka self-host cho đến khi traffic hoặc yêu cầu độ tin cậy biện minh managed Kafka.
- Thêm load balancer chỉ khi dùng nhiều Droplet.
- Chuyển DOKS/Kubernetes chỉ khi horizontal scaling, rolling deploy hoặc multi-node scheduling thực sự cần.

### 3.3 Mô hình domain cho `vodinhquan.dev`

Dùng subdomain cố định trước:

| Host                             | Đích                                         |
| -------------------------------- | -------------------------------------------- |
| `api.qrtable.vodinhquan.dev`     | BFF HTTP + WebSocket                         |
| `app.qrtable.vodinhquan.dev`     | Management App                               |
| `qr.qrtable.vodinhquan.dev`      | Customer PWA                                 |
| `auth.qrtable.vodinhquan.dev`    | Keycloak                                     |
| `grafana.qrtable.vodinhquan.dev` | Grafana, được bảo vệ và tùy chọn giới hạn IP |

Không bắt buộc wildcard subdomain tenant cho deploy Phase 7 đầu tiên. Link QR hiện tại có thể dùng:

```text
https://qr.qrtable.vodinhquan.dev/?tenant=<tenant-slug>&table=<table-id>&token=<qr-token>
```

Wildcard subdomain như `*.qrtable.vodinhquan.dev` chỉ thêm sau khi frontend/router dùng phân giải tenant theo host và đã quyết định tự động hóa DNS challenge.

### 3.4 Lựa chọn reverse proxy

Dùng Caddy cho deploy Droplet đầu tiên.

Lý do:

- Chứng chỉ Let's Encrypt tự động, ít thao tác hơn Nginx + Certbot.
- Tích hợp Docker Compose đơn giản.
- Phù hợp pilot single-host.

Nginx chấp nhận được nếu team quen reverse proxy đó, nhưng plan phải thêm gia hạn Certbot, mount lưu certificate và verify renewal rõ ràng.

## 4. Cấu trúc file mục tiêu

Tạo mới:

- `.dockerignore`
- `docker/backend.Dockerfile`
- `docker/migrations.Dockerfile`
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
- `tools/deploy/phase7-build-images.sh`
- `tools/deploy/phase7-migrate.sh`
- `tools/deploy/phase7-seed-demo.sh`
- `tools/deploy/phase7-smoke.sh`
- `docs/guides/phase-7-digitalocean-deployment.md`

Tái sử dụng phần đã implement:

- `docker/postgres/init/001-create-service-databases.sql`
- `apps/catalog/src/database/`
- `apps/order/src/database/`
- `apps/payment/src/database/`
- `apps/saas/src/database/`
- `tools/database/verify-service-database-ownership.js`

Sửa sau khi implement:

- `apps/management-app/next.config.ts`
- `apps/bff/src/bootstrap.ts`
- `docker-compose.monitoring.yaml` hoặc chỉ tạo production override
- `docker/monitoring/prometheus/prometheus.yml` hoặc config Prometheus riêng production
- `docs/technical-architecture.md` mục 14
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-5-7-finalization.vi.md`
- `docs/DOC-CODE-ANCHORS.md`

File riêng chỉ tạo trên server:

- `/opt/qrtable/.env.production`
- `/opt/qrtable/secrets/*`
- `/opt/qrtable/backups/*`

Không commit các file riêng đó.

## 5. Tasks (Các task)

### Task 1: Thêm kiểm soát build context

**Files:**

- Tạo: `.dockerignore`

- [ ] Bước 1: Tạo `.dockerignore` ở root

Dùng nội dung sau:

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

- [ ] Bước 2: Verify build context nhỏ gọn

Chạy:

```bash
docker buildx du --verbose .
```

Kỳ vọng: không có `node_modules`, không có `docker/docker_data`, không có `.env` riêng.

### Task 2: Build image backend

**Files:**

- Tạo: `docker/backend.Dockerfile`
- Tạo: `tools/deploy/phase7-build-images.sh`

- [ ] Bước 1: Tạo Dockerfile backend tham số hóa

Dùng một Dockerfile với `APP_NAME` để cả tám NestJS service dùng chung pattern build:

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

- [ ] Bước 2: Tạo script build image

Dùng nội dung sau:

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

- [ ] Bước 3: Verify một image backend trước khi build hết

Chạy:

```bash
docker build -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:phase7-smoke .
docker run --rm qrtable-bff:phase7-smoke node --version
```

Kỳ vọng: build exit 0 và Node in ra version.

### Task 3: Build image Management App

**Files:**

- Sửa: `apps/management-app/next.config.ts`
- Tạo: `docker/management-app.Dockerfile`

- [ ] Bước 1: Bật Next.js standalone output

Sửa `next.config.ts` để gồm:

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

- [ ] Bước 2: Tạo Dockerfile

Dùng nội dung sau:

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

- [ ] Bước 3: Verify image

Chạy:

```bash
docker build \
  -f docker/management-app.Dockerfile \
  --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
  -t qrtable-management-app:phase7-smoke .
```

Kỳ vọng: build exit 0.

### Task 4: Build image Customer PWA

**Files:**

- Tạo: `docker/customer-pwa.Dockerfile`

- [ ] Bước 1: Tạo image PWA tĩnh

Dùng nội dung sau:

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

- [ ] Bước 2: Thêm cấu hình SPA fallback

Tạo `docker/nginx/customer-pwa.conf`:

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

- [ ] Bước 3: Verify image

Chạy:

```bash
docker build \
  -f docker/customer-pwa.Dockerfile \
  --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg VITE_TENANT_ID=seed-tenant-fallback \
  -t qrtable-customer-pwa:phase7-smoke .
```

Kỳ vọng: build exit 0.

### Task 5: Thay compose provider dev bằng compose infra production

**Files:**

- Tạo: `docker-compose.infra.yaml`
- Tái sử dụng: `docker/postgres/init/001-create-service-databases.sql`
- Tạo: `docker/postgres/init/002-create-keycloak-database.sql`

- [x] Bước 1: Tái sử dụng SQL khởi tạo database service đã implement

Script init PostgreSQL idempotent hiện có đã tạo bốn database ứng dụng trên một instance PostgreSQL:

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

Không dùng `pnpm db:provision` trên Droplet. Lệnh đó cố ý từ chối host PostgreSQL không phải local và chỉ dành cho development local.

- [ ] Bước 2: Tạo SQL khởi tạo database Keycloak

Dùng file init idempotent riêng:

```sql
SELECT 'CREATE DATABASE qrtable_keycloak'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'qrtable_keycloak')\gexec
```

User PostgreSQL per-service vẫn là task hardening theo dõi. Pilot Phase 7 đầu tiên, một PostgreSQL app user mạnh là chấp nhận được khi mạng database nội bộ và credential được giữ riêng tư.

- [ ] Bước 3: Tạo compose infra production

Key requirements:

- Pin version image.
- Không expose cổng công khai cho database, Redis, Kafka hoặc cổng nội bộ Keycloak.
- Dùng named volume, không bind-mount `docker/docker_data`.
- Dùng health check.
- Đặt Kafka advertised listener là `kafka:9092` cho app container.
- Chạy Keycloak với `start` production, không `start-dev`.

Khung skeleton:

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

- [ ] Bước 4: Verify compose syntax

Chạy:

```bash
docker compose -f docker-compose.infra.yaml config
```

Kỳ vọng: compose render không lỗi cú pháp.

### Task 6: Tạo lớp App Compose

**Files:**

- Tạo: `docker-compose.app.yaml`

- [ ] Bước 1: Tạo app compose

Đặt service host theo tên service Docker Compose:

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
      ORDER_TYPEORM_DATABASE: qrtable_order
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
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
      CATALOG_TYPEORM_DATABASE: qrtable_catalog
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
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
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
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
      SAAS_TYPEORM_DATABASE: qrtable_saas
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
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
      USER_ACCESS_MONGO_DB_NAME: qrtable_auth
      DATABASE_SHARED_FALLBACK_ENABLED: 'false'
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

- [ ] Bước 2: Thêm health check app còn thiếu sau lần boot thành công đầu

Dùng HTTP check:

```yaml
healthcheck:
  test: ['CMD-SHELL', 'wget -qO- http://127.0.0.1:3300/api/v1/health/live || exit 1']
  interval: 30s
  timeout: 5s
  retries: 5
  start_period: 30s
```

Điều chỉnh path theo prefix từng service:

- BFF: `/api/v1/health/live`
- Order/Catalog/Kitchen/Payment: `/api/v1/health/live`
- Authorizer/SaaS/User-Access: `/api/health/live`

### Task 7: Thêm reverse proxy và HTTPS

**Files:**

- Tạo: `docker/proxy/Caddyfile`
- Create: `docker-compose.proxy.yaml`

- [ ] Bước 1: Tạo Caddyfile

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

Sinh hash basic-auth Caddy trên server:

```bash
docker run --rm caddy:2.8.4 caddy hash-password --plaintext "$GRAFANA_BASIC_AUTH_PASSWORD"
```

- [ ] Bước 2: Tạo compose proxy

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

- [ ] Bước 3: Verify Caddy config

Chạy:

```bash
docker compose -f docker-compose.proxy.yaml config
```

Kỳ vọng: compose render không lỗi cú pháp.

### Task 8: Chuẩn bị env và secret production

**Files:**

- Tạo: `docker/env/.env.production.example`

- [ ] Bước 1: Tạo file mẫu chỉ có key và giá trị mẫu an toàn

Gồm mọi key bắt buộc, không gồm secret thật:

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

- [ ] Bước 2: Generate server secrets

Chạy trên server:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

Kỳ vọng:

- `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE`, `SAAS_TYPEORM_DATABASE` và `USER_ACCESS_MONGO_DB_NAME` đều có mặt.
- `DATABASE_SHARED_FALLBACK_ENABLED=false`.
- Không service nào phụ thuộc `TYPEORM_DATABASE` hoặc `MONGO_DB_NAME` ở production.
- `PAYMENT_SECRETS_ENCRYPTION_KEY` đúng 64 ký tự hex.
- `AUTH_SECRET`, mật khẩu DB, secret Keycloak và mật khẩu Grafana là giá trị ngẫu nhiên mạnh.
- File `/opt/qrtable/.env.production` thật không bao giờ được commit.

### Task 9: Đóng gói và chạy migration per-service hiện có

**Files:**

- Tái sử dụng: `apps/catalog/src/database/`
- Tái sử dụng: `apps/order/src/database/`
- Tái sử dụng: `apps/payment/src/database/`
- Tái sử dụng: `apps/saas/src/database/`
- Tạo: `docker/migrations.Dockerfile`
- Tạo: `docker-compose.migrations.yaml`
- Sửa: `tools/deploy/phase7-build-images.sh`
- Tạo: `tools/deploy/phase7-migrate.sh`
- Tạo: `tools/deploy/phase7-seed-demo.sh`

- [x] Bước 1: Dùng chiến lược migration đã implement

Chiến lược schema không còn là quyết định mở. QRTable dùng TypeORM migration thuộc service:

```text
Catalog -> apps/catalog/src/database/migrations
Order   -> apps/order/src/database/migrations
Payment -> apps/payment/src/database/migrations
SaaS    -> apps/saas/src/database/migrations
```

Lệnh root là:

```bash
pnpm db:migrate
pnpm db:migration:show
pnpm db:verify:ownership
```

Chiến lược production bị từ chối:

- Chạy Droplet với `NODE_ENV=development`.
- Phụ thuộc `TYPEORM_SYNCHRONIZE=true`.
- Duy trì schema SQL viết tay thứ hai có thể lệch so với migration thuộc project.

- [ ] Bước 2: Build image migration riêng

Image runtime backend chứa bundle app đã compile và nên giữ nhỏ. Tạo image migration one-shot gồm nguồn migration TypeScript, Nx, `ts-node`, `tsconfig-paths`, công cụ verify database và hợp đồng env production:

```dockerfile
# syntax=docker/dockerfile:1.7

FROM node:22.12-alpine3.20
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
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

Build và push với cùng immutable tag như image app:

```bash
docker build -f docker/migrations.Dockerfile -t "${REGISTRY}/qrtable-migrations:${TAG}" .
```

Thêm build image migration vào `tools/deploy/phase7-build-images.sh` để release không thể publish image app mà thiếu artifact migration khớp.

- [ ] Bước 3: Tạo compose migration one-shot

```yaml
name: qrtable-migrations

networks:
  qrtable-infra:
    external: true
    name: qrtable-infra

services:
  migrations:
    image: ${REGISTRY}/qrtable-migrations:${TAG}
    env_file: /opt/qrtable/.env.production
    networks:
      - qrtable-infra
```

Service migration không được expose cổng, tự restart, hoặc tiếp tục chạy sau khi lệnh kết thúc.

- [ ] Bước 4: Chạy migration trước app container

`tools/deploy/phase7-migrate.sh` phải chạy:

```bash
docker compose -f docker-compose.migrations.yaml run --rm migrations pnpm db:migrate
docker compose -f docker-compose.migrations.yaml run --rm migrations pnpm db:migration:show
docker compose -f docker-compose.migrations.yaml run --rm migrations pnpm db:verify:ownership
```

Kỳ vọng:

- Catalog, Order, Payment và SaaS báo mọi migration kỳ vọng đã được apply.
- `qrtable_catalog` chỉ chứa bảng thuộc Catalog cộng `typeorm_migrations`.
- `qrtable_order` chỉ chứa bảng thuộc Order và outbox cộng `typeorm_migrations`.
- `qrtable_payment` chỉ chứa bảng thuộc Payment và outbox cộng `typeorm_migrations`.
- `qrtable_saas` chỉ chứa bảng thuộc SaaS và outbox cộng `typeorm_migrations`.
- Mọi lỗi migration hoặc ownership dừng deploy trước khi thay app.

- [ ] Bước 5: Tách bootstrap production khỏi reseed development destructive

Không chạy lệnh này trên Droplet:

```bash
pnpm dev:reseed -- --yes
```

Lệnh cố ý drop/tạo lại database service local, reset fixture development deterministic, rebuild realm Keycloak và flush Redis.

Hành vi production:

- Deploy production mặc định: chỉ chạy migration và bootstrap Keycloak; không seed dữ liệu demo nghiệp vụ.
- Profile demo luận văn: chỉ chạy `tools/deploy/phase7-seed-demo.sh --yes` khi `DEPLOYMENT_PROFILE=demo`.
- Script seed demo phải insert hoặc upsert bản ghi demo deterministic mà không drop database, xóa tenant không liên quan, rebuild Keycloak hoặc flush shared state.
- Script phải từ chối chạy khi `NODE_ENV` không phải `production`, `DEPLOYMENT_PROFILE` không phải `demo`, hoặc thiếu `--yes`.

Sau seed demo tùy chọn, chạy verify read-only:

```bash
pnpm db:verify:ownership
./tools/deploy/phase7-smoke.sh --demo-data
```

Seed ID dùng cho E2E phải ghi vào file ghi chú deploy không chứa secret.

### Task 10: Bootstrap Keycloak cho domain công khai

**Files:**

- Sửa hoặc bọc: `tools/keycloak-bootstrap.sh`
- Create: `tools/deploy/phase7-keycloak-bootstrap.sh`

- [ ] Bước 1: Build hoặc mount theme Keycloak

Chạy trước khi start Keycloak:

```bash
pnpm theme:build
```

Kỳ vọng: `apps/keycloak-theme/dist_keycloak` tồn tại và chứa jar/asset theme provider mà Keycloak cần.

- [ ] Bước 2: Bootstrap realm, client và đồng bộ User-Access từ mạng infra

Chạy bootstrap qua image migration/tooling để `keycloak` và `mongodb` resolve trên mạng Docker nội bộ. Redirect URI công khai vẫn dùng domain production:

```bash
docker compose -f docker-compose.migrations.yaml run --rm \
  -e KEYCLOAK_HOST=http://keycloak:8080 \
  -e MONGODB_URI="mongodb://${MONGO_ROOT_USERNAME}:${MONGO_ROOT_PASSWORD}@mongodb:27017" \
  -e USER_ACCESS_MONGO_DB_NAME=qrtable_auth \
  -e KEYCLOAK_ADMIN_USER="$KEYCLOAK_ADMIN_USER" \
  -e KEYCLOAK_ADMIN_PASSWORD="$KEYCLOAK_ADMIN_PASSWORD" \
  -e KEYCLOAK_REALM=qrtable \
  -e KEYCLOAK_CLIENT_ID=qrtable-bff \
  -e KEYCLOAK_CLIENT_SECRET="$KEYCLOAK_CLIENT_SECRET" \
  -e MANAGEMENT_APP_CLIENT_ID=management-app \
  -e MANAGEMENT_APP_CLIENT_SECRET="$MANAGEMENT_APP_CLIENT_SECRET" \
  -e KEYCLOAK_MASTER_SSL_REQUIRED=external \
  -e KEYCLOAK_REALM_SSL_REQUIRED=external \
  migrations bash tools/keycloak-bootstrap.sh
```

- [ ] Bước 3: Cập nhật redirect URI và web origin

Ensure Keycloak clients include:

```text
https://app.qrtable.vodinhquan.dev/*
https://api.qrtable.vodinhquan.dev/*
```

Kỳ vọng:

- Đăng nhập Management App redirect qua `auth.qrtable.vodinhquan.dev`.
- BFF Authorizer có thể đổi client token với Keycloak.
- User và role nội bộ được đồng bộ vào MongoDB `qrtable_auth`, không phải database legacy `qrtable`.

### Task 11: Cấu hình tích hợp SePay production

SePay là phụ thuộc production, không chỉ chi tiết biến env. Deploy chưa sẵn sàng cho đến khi cấu hình dashboard/API SePay khớp route công khai của QRTable và code path đang dùng.

**Tài liệu provider đã verify:**

- Thiết lập webhook SePay Bank Hub có thể upsert URL webhook HTTPS.
- Auth webhook secret-key gửi secret trong `X-Secret-Key`.
- Payload webhook/IPN gồm `id`, `gateway`, `transactionDate`, `accountNumber`, `code`, `content`, `transferType`, `transferAmount`, `accumulated`, `referenceCode` và `description`.
- Xử lý webhook thành công nên trả JSON success đơn giản.

**Hành vi source QRTable hiện tại:**

- Origin công khai BFF phải là `PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev`.
- Thanh toán hóa đơn tenant dùng `QRTBL`.
- Hóa đơn subscription platform dùng `QRSUB`.
- Route tenant: `POST /api/v1/payment/sepay/webhook/:tenantSlug`.
- Route platform: `POST /api/v1/payment/sepay/webhook/platform`.
- Route lab legacy: `POST /api/v1/payment/sepay/webhook`.
- Payment service lưu webhook secret per-tenant trong `tenant_payment_settings`.
- SaaS service verify `SEPAY_PLATFORM_WEBHOOK_SECRET` cho webhook subscription platform.
- OAuth state Payment lưu trong Redis dạng `oauth_state:{state}` với TTL ngắn.

**Files:**

- Cập nhật: `docs/guides/phase-7-digitalocean-deployment.md`
- Verify và có thể cập nhật: `docs/guides/sepay-configuration-guide-phase3.md`
- Tạo: `tools/deploy/phase7-sepay-preflight.md` hoặc script nếu tự động hóa provider ổn định

- [ ] Bước 1: Chọn bộ route SePay live

Deploy production đầu tiên ưu tiên route secret-key đã verify với provider:

```text
Tenant QRTBL:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/{tenantSlug}

Platform QRSUB:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Chỉ dùng route HMAC legacy cho tương thích lab/dev trừ khi tài khoản/sản phẩm SePay thật xác nhận luồng `X-SePay-Signature` và `X-SePay-Timestamp`:

```text
Legacy lab route:
https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook
```

- [ ] Bước 2: Cấu hình webhook subscription platform

Trong dashboard/API SePay:

```text
webhook_url = https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
auth = secret key
secret = SEPAY_PLATFORM_WEBHOOK_SECRET
active = true
events = incoming transaction events
```

Kỳ vọng:

- SePay có thể gọi endpoint HTTPS công khai.
- Thiếu hoặc sai secret trả unauthorized.
- Secret platform hợp lệ cho phép BFF forward sang SaaS.
- SaaS bỏ qua payload `QRTBL` trên route platform và chỉ settle `QRSUB`.

- [ ] Bước 3: Cấu hình tenant OAuth Connect

Trong app OAuth SePay:

```text
redirect_uri = https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
```

Trong env production QRTable:

```text
SEPAY_OAUTH_BASE_URL=https://my.sepay.vn
SEPAY_OAUTH_CLIENT_ID=...
SEPAY_OAUTH_CLIENT_SECRET=...
SEPAY_OAUTH_REDIRECT_URI=https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
PUBLIC_API_BASE_URL=https://api.qrtable.vodinhquan.dev
```

Kỳ vọng:

- Owner có thể bắt đầu SePay OAuth Connect từ Management App.
- Payment service tạo và tiêu thụ OAuth state Redis.
- Có thể liệt kê tài khoản ngân hàng tenant sau callback.
- Tài khoản ngân hàng được chọn tạo/upsert URL webhook tenant có slug tenant.
- Secret per-tenant lưu mã hóa, không expose trên frontend.

- [ ] Bước 4: Verify bề mặt API webhook SePay với tài khoản thật

Trước deploy live, đối chiếu mismatch source-code/API:

| Nguồn                       | Hình dạng webhook upsert quan sát được                                                   |
| --------------------------- | ---------------------------------------------------------------------------------------- |
| Code QRTable hiện tại       | `POST /api/v1/webhooks`, `authen_type: Api_Key`, `api_key`, `request_content_type: Json` |
| Doc SePay Bank Hub Context7 | `POST /v1/webhook`, `auth_type: SECRET_KEY`, `secret_key`, URL webhook HTTPS             |

Hành động:

- Xác nhận sản phẩm/bề mặt API SePay mà tài khoản QRTable dùng.
- Nếu API live cần hình dạng Bank Hub `/v1/webhook`, cập nhật `SepayOAuthClientService` trước production.
- Nếu API live dùng hình dạng `/api/v1/webhooks` hiện tại, ghi bằng chứng vào `docs/guides/sepay-configuration-guide-phase3.md`.
- Không gọi production-ready cho đến khi một trong hai path được chứng minh với tài khoản SePay thật.

- [ ] Bước 5: Định nghĩa verify live an toàn

Không tự động hóa chuyển khoản ngân hàng thật trong CI.

Verify được phép:

```bash
curl -i -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform \
  -H "Content-Type: application/json" \
  -d '{"code":"QRSUBTEST","content":"QRSUBTEST","transferType":"in","transferAmount":1000}'
```

Kỳ vọng: unauthorized vì không có secret.

Verify live thủ công:

- Chỉ dùng chuyển khoản giá trị thấp sau khi đã cấu hình secret platform/tenant.
- Xác nhận request webhook xuất hiện trong log BFF.
- Xác nhận provider transaction id được lưu/audit cho idempotency.
- Xác nhận sự kiện underpaid và trùng lặp không đánh dấu thanh toán hoàn tất sai.
- Xác nhận Grafana hiển thị request webhook, payment audit và lỗi API provider mà không lộ token/secret.

### Task 12: Chỉnh monitoring cho app container

**Files:**

- Tạo: `docker-compose.monitoring.prod.yaml`
- Sửa hoặc tạo bản production: `docker/monitoring/prometheus/prometheus.prod.yml`

- [ ] Bước 1: Dùng target service nội bộ

Config scrape production nên dùng:

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

- [ ] Bước 2: Giữ kho monitoring riêng tư

Quy tắc production:

- Không publish cổng Loki, Prometheus hoặc Tempo.
- Chỉ publish Grafana qua reverse proxy với HTTPS và basic auth.
- Dùng Docker label Promtail từ app container: `app=bff`, `app=order`, v.v.

- [ ] Bước 3: Verify Grafana

Chạy:

```bash
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml config
```

Kỳ vọng: compose production không có cổng công khai `3100`, `9090`, `3200` hoặc `4318`.

### Task 13: Provision DigitalOcean

**Files:**

- Tạo: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Bước 1: Tạo Droplet

Dùng:

- Ubuntu 24.04 LTS hoặc Ubuntu LTS được DO hỗ trợ hiện tại.
- Region `sgp1` nếu có.
- Xác thực SSH key.
- Không đăng nhập bằng mật khẩu.
- Gắn Cloud Firewall.
- Bật backup trước demo công khai đầu tiên.

- [ ] Bước 2: Cấu hình firewall

Cho phép:

```text
22/tcp chỉ từ IP hiện tại của bạn
80/tcp từ 0.0.0.0/0
443/tcp từ 0.0.0.0/0
```

Từ chối truy cập công khai tới:

```text
3000, 3001, 3300-3308, 3201-3208, 5432, 6379, 27017, 9092, 9090, 3100, 3200, 4318
```

- [ ] Bước 3: Cài Docker Engine

Dùng repository Ubuntu chính thức của Docker, không dùng gói cũ của Ubuntu:

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

Kỳ vọng: Docker Engine và plugin Docker Compose in ra version.

- [ ] Bước 4: Cấu hình DNS

Tạo bản ghi A trỏ tới IPv4 Droplet:

```text
api.qrtable.vodinhquan.dev
app.qrtable.vodinhquan.dev
qr.qrtable.vodinhquan.dev
auth.qrtable.vodinhquan.dev
grafana.qrtable.vodinhquan.dev
```

Kỳ vọng:

```bash
dig +short api.qrtable.vodinhquan.dev
dig +short app.qrtable.vodinhquan.dev
dig +short qr.qrtable.vodinhquan.dev
dig +short auth.qrtable.vodinhquan.dev
dig +short grafana.qrtable.vodinhquan.dev
```

Mỗi lệnh trả về IP Droplet.

### Task 14: Deploy stack

**Files:**

- Tạo: `tools/deploy/phase7-preflight.sh`
- Tạo: `tools/deploy/phase7-migrate.sh`
- Tạo: `tools/deploy/phase7-seed-demo.sh`
- Tạo: `tools/deploy/phase7-smoke.sh`

- [ ] Bước 1: Copy repository hoặc release bundle vào `/opt/qrtable`

Pilot đầu tiên khuyến nghị:

```bash
: "${QRTABLE_REPOSITORY_URL:?Set this to the private QRTable git URL before cloning}"
sudo mkdir -p /opt/qrtable
sudo chown "$USER:$USER" /opt/qrtable
git clone "$QRTABLE_REPOSITORY_URL" /opt/qrtable
```

Nếu sau này chỉ deploy image, thay bằng release bundle gồm file compose và `.env.production`.

- [ ] Bước 2: Đặt env riêng trên server

```bash
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Sau đó sửa `/opt/qrtable/.env.production` trên server và thay giá trị đã sinh bằng `openssl rand`.

- [ ] Bước 3: Start infra và chờ datastore healthy

```bash
docker compose -f docker-compose.infra.yaml up -d
./tools/deploy/phase7-preflight.sh --wait-infra
```

- [ ] Bước 4: Chạy migration gate và ownership gate

```bash
docker compose -f docker-compose.migrations.yaml pull
./tools/deploy/phase7-migrate.sh
```

Kỳ vọng: mọi migration service đã apply và database ownership verification pass trước khi thay app container.

- [ ] Bước 5: Bootstrap identity và dữ liệu demo tùy chọn

```bash
./tools/deploy/phase7-keycloak-bootstrap.sh
```

Chỉ với deploy demo luận văn:

```bash
DEPLOYMENT_PROFILE=demo ./tools/deploy/phase7-seed-demo.sh --yes
```

- [ ] Bước 6: Start lớp monitoring, app và proxy

```bash
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml up -d
docker compose -f docker-compose.app.yaml up -d
docker compose -f docker-compose.proxy.yaml up -d
```

- [ ] Bước 7: Verify service đang chạy

```bash
docker compose -f docker-compose.infra.yaml ps
docker compose -f docker-compose.migrations.yaml ps -a
docker compose -f docker-compose.app.yaml ps
docker compose -f docker-compose.proxy.yaml ps
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml ps
```

Kỳ vọng:

- Service infra healthy hoặc đang chạy.
- Container migration one-shot đã exit thành công.
- App container đang chạy.
- Caddy đã lấy certificate và phục vụ HTTPS.

### Task 15: Chạy smoke test và verify demo

**Files:**

- Tạo: `tools/deploy/phase7-smoke.sh`
- Update: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Bước 1: HTTP smoke

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev/realms/qrtable
```

Kỳ vọng:

- Health BFF trả UP.
- App và PWA trả HTML.
- Endpoint realm Keycloak trả metadata JSON.

- [ ] Bước 2: Smoke metrics nội bộ

Chạy từ trong container Prometheus hoặc mạng app:

```bash
docker compose -f docker-compose.monitoring.yaml exec prometheus wget -qO- http://bff:3300/api/v1/metrics
docker compose -f docker-compose.monitoring.yaml exec prometheus wget -qO- http://order:3301/api/v1/metrics
```

Kỳ vọng: Prometheus text exposition contains `qrtable_http_requests_total`.

- [ ] Bước 3: Smoke E2E trình duyệt

Chỉ dùng bộ e2e hiện có sau khi bootstrap Keycloak và seed demo non-destructive tùy chọn ổn định:

```bash
BASE_URL=https://app.qrtable.vodinhquan.dev \
CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
pnpm e2e:demo
```

Kỳ vọng: các test demo được chọn pass. Nếu suite vẫn giả định localhost, ghi thay đổi config Playwright cần thiết thành task implement riêng trước khi coi Phase 7 xanh.

- [ ] Bước 4: Smoke route SePay

Verify route công khai đã đăng ký:

```bash
curl -i https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
curl -i https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/demo-tenant
```

Kỳ vọng: BFF trả lỗi method/auth, chứng minh route công khai reachable mà không chấp nhận payload không xác thực.

### Task 16: Backup, rollback và vận hành

**Files:**

- Tạo: `docs/guides/phase-7-digitalocean-deployment.md`
- Create: `tools/deploy/phase7-backup.sh`

- [ ] Bước 1: Bật backup/snapshot DigitalOcean

Dùng Droplet backup cho phục hồi cấp host.

- [ ] Bước 2: Thêm script backup logic

```bash
#!/usr/bin/env bash
set -euo pipefail

set -a
source /opt/qrtable/.env.production
set +a

stamp="$(date -u +%Y%m%dT%H%M%SZ)"
mkdir -p "/opt/qrtable/backups/${stamp}"

docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_catalog > "/opt/qrtable/backups/${stamp}/qrtable_catalog.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_order > "/opt/qrtable/backups/${stamp}/qrtable_order.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_saas > "/opt/qrtable/backups/${stamp}/qrtable_saas.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_payment > "/opt/qrtable/backups/${stamp}/qrtable_payment.sql"
docker compose -f docker-compose.infra.yaml exec -T postgres pg_dump -U "$POSTGRES_USER" qrtable_keycloak > "/opt/qrtable/backups/${stamp}/qrtable_keycloak.sql"
docker compose -f docker-compose.infra.yaml exec -T mongodb \
  mongodump \
  --username "$MONGO_ROOT_USERNAME" \
  --password "$MONGO_ROOT_PASSWORD" \
  --authenticationDatabase admin \
  --db qrtable_auth \
  --archive > "/opt/qrtable/backups/${stamp}/qrtable_auth.archive"
docker compose -f docker-compose.migrations.yaml run --rm migrations pnpm db:migration:show \
  > "/opt/qrtable/backups/${stamp}/migration-state.txt"
```

- [ ] Bước 3: Định nghĩa rollback

Rollback image tag:

```bash
TAG=previous-good docker compose -f docker-compose.app.yaml up -d
```

Rollback dữ liệu infra:

- Dừng lớp app trước.
- Khôi phục Postgres/Mongo từ backup logic hoặc snapshot Droplet.
- Không chạy `migration:revert` tự động. Revert migration phải được review rõ với image đích và timestamp backup.
- Ưu tiên migration expand/contract tương thích ngược để image app trước vẫn chạy được trong cửa sổ rollback.
- Start lại lớp app.
- Chạy lại smoke check.

### Task 17: Thêm pipeline CI/CD và quy trình release

CI/CD là phần của Phase 7, nhưng phải coi là mặt phẳng điều khiển deploy riêng, không giấu trong lệnh server thủ công.

**Trạng thái repo hiện tại:**

- Đã có: `.github/workflows/ci.yml`
- Trigger CI: `push` lên `main` và `pull_request`
- Lệnh CI: `pnpm exec nx run-many -t lint test build`
- Đã có: TypeORM DataSource per-service, migration ban đầu, lệnh migration và database ownership verification.
- Thiếu: workflow build Docker image
- Thiếu: workflow push registry
- Thiếu: workflow deploy production
- Thiếu: workflow rollback theo tag
- Thiếu: image/job migration production và deploy gate

**Files:**

- Sửa: `.github/workflows/ci.yml`
- Create: `.github/workflows/release-images.yml`
- Create: `.github/workflows/deploy-production.yml`
- Create: `.github/workflows/rollback-production.yml`
- Create: `tools/deploy/phase7-build-images.sh`
- Create: `tools/deploy/phase7-migrate.sh`
- Create: `tools/deploy/phase7-remote-deploy.sh`
- Create: `tools/deploy/phase7-remote-rollback.sh`
- Create: `tools/deploy/phase7-preflight.sh`
- Create: `tools/deploy/phase7-smoke.sh`
- Modify: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Bước 1: Giữ CI làm quality gate PR

CI phải validate chất lượng source trước khi workflow release chạy.

Kiểm tra khuyến nghị:

```bash
pnpm install --frozen-lockfile
pnpm exec nx run-many -t lint test build
pnpm verify:doc-anchors
```

Tùy chọn sau deploy production ổn định đầu tiên:

```bash
pnpm exec nx affected -t lint test build --base=origin/main~1 --head=HEAD
```

Chỉ dùng lệnh affected sau khi pipeline ổn định. Deploy Phase 7 đầu tiên, `run-many` an toàn hơn vì dễ bắt project boundary cũ hoặc thiếu target.

- [ ] Bước 2: Thêm workflow release-images

Trigger:

- `workflow_dispatch`
- `push` lên `main` sau khi CI xanh

Quyền:

- `contents: read`
- không có quyền ghi repository

Input:

- `image_tag` mặc định `${{ github.sha }}`
- `push_latest` mặc định `false`

Secret:

- `DIGITALOCEAN_ACCESS_TOKEN`

Trách nhiệm workflow:

1. Checkout repository.
2. Cài Node.js 20 và pnpm 9.8.0.
3. Cài dependency với frozen lockfile.
4. Chạy kiểm tra build CI.
5. Đăng nhập DigitalOcean Container Registry.
6. Build và push mọi image Phase 7.
7. Xuất tóm tắt image digest.

Tên image kỳ vọng:

```text
registry.digitalocean.com/qrtable/qrtable-bff:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-authorizer:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-catalog:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-order:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-kitchen:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-payment:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-saas:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-user-access:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-migrations:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-management-app:${GITHUB_SHA}
registry.digitalocean.com/qrtable/qrtable-customer-pwa:${GITHUB_SHA}
```

Quy tắc build quan trọng:

- Giá trị frontend công khai có thể là build arg: `NEXT_PUBLIC_*`, `VITE_*`.
- Secret riêng không bao giờ là Docker build arg.
- Secret production nằm trong `/opt/qrtable/.env.production` hoặc secret manager sau này.

- [ ] Bước 3: Thêm bảo vệ deployment environment

Dùng GitHub Environments:

```text
Environment: production
Required reviewers: owner/deployment maintainer
Deployment branch: chỉ main
```

Lý do:

- Webhook SePay live có thể ảnh hưởng trạng thái thanh toán bên ngoài.
- Client Keycloak production không được đổi nhầm.
- Trạng thái schema DB phải được kiểm tra trước khi thay app container.

- [ ] Bước 4: Thêm workflow deploy-production

Trigger:

- Chỉ `workflow_dispatch` cho giai đoạn production đầu.

Input:

- `image_tag` bắt buộc
- `run_smoke` mặc định `true`
- `run_backup_before_deploy` mặc định `true`

Secret:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_SSH_PORT`

Luồng deploy:

```text
CI green
  -> release-images pushes immutable image tag
  -> deploy-production chờ phê duyệt production
  -> preflight remote
  -> pull immutable migration và app images
  -> backup
  -> chạy migration per-service
  -> verify migration state và database ownership
  -> docker compose up -d lớp app
  -> smoke test
  -> ghi tag đã deploy
```

Dạng lệnh remote:

```bash
ssh "$PRODUCTION_SSH_USER@$PRODUCTION_SSH_HOST" \
  "cd /opt/qrtable && IMAGE_TAG='${IMAGE_TAG}' ./tools/deploy/phase7-remote-deploy.sh"
```

Script deploy remote phải:

- Từ chối chạy nếu thiếu `/opt/qrtable/.env.production` hoặc world-readable.
- Từ chối deploy nếu `IMAGE_TAG` rỗng.
- Chạy `docker compose config` cho lớp infra, migrations, monitoring, app và proxy.
- Pull image theo tag immutable yêu cầu.
- Chạy `tools/deploy/phase7-migrate.sh` và dừng ngay khi migration hoặc ownership fail.
- Start app container không rebuild trên server.
- Chạy health check sau khi thay container.
- Ghi tag thành công vào `/opt/qrtable/releases/current`.

- [ ] Bước 5: Thêm gate schema/migration

Trước deploy production, workflow phải:

1. Verify cả năm tên env datastore riêng có mặt và `DATABASE_SHARED_FALLBACK_ENABLED=false`.
2. Pull image migration với cùng immutable tag như image app.
3. Chạy `pnpm db:migrate`.
4. Chạy `pnpm db:migration:show`.
5. Chạy `pnpm db:verify:ownership`.
6. Từ chối thay app container khi bất kỳ lệnh nào fail.

Đây là gate cứng vì production dùng migration thuộc service với `TYPEORM_SYNCHRONIZE=false`.

Script gate khuyến nghị:

```bash
./tools/deploy/phase7-preflight.sh --require-dedicated-databases
./tools/deploy/phase7-migrate.sh
```

- [ ] Bước 6: Thêm smoke test vào CI/CD

Smoke test nên chạy từ GitHub runner sau deploy vì DNS công khai, TLS, reverse proxy và CORS phải verify bên ngoài.

Endpoint bắt buộc:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev
```

Kiểm tra webhook âm tính:

```bash
curl -fsS -o /dev/null -w "%{http_code}" \
  -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Kỳ vọng: request webhook không hợp lệ hoặc không ký bị từ chối, không được chấp nhận.

- [ ] Bước 7: Thêm workflow rollback-production

Trigger:

- `workflow_dispatch`

Input:

- `rollback_tag` bắt buộc
- `restore_data` mặc định `false`

Luồng rollback:

```text
production approval
  -> preflight remote
  -> backup tùy chọn
  -> set IMAGE_TAG to rollback_tag
  -> docker compose pull
  -> docker compose up -d lớp app
  -> smoke test
  -> ghi sự kiện rollback
```

Rollback không được tự khôi phục database hoặc chạy `migration:revert` trừ khi `restore_data=true` và operator xác nhận timestamp backup chính xác cùng tác động tương thích. Rollback app và rollback dữ liệu là thao tác riêng.

- [ ] Bước 8: Thêm audit trail deploy

Mỗi deploy thành công nên ghi:

```text
deployed_at
deployed_by
git_sha
image_tag
compose_files
smoke_result
previous_tag
```

Lưu cục bộ:

```text
/opt/qrtable/releases/current
/opt/qrtable/releases/history.log
```

Giữ URL run GitHub Actions làm bản ghi audit bên ngoài.

- [ ] Bước 9: Quyết định khi nào tự động deploy khi merge

Chính sách Phase 7 khuyến nghị:

| Giai đoạn         | Release image         | Deploy production            |
| ----------------- | --------------------- | ---------------------------- |
| Pilot đầu         | Thủ công              | Thủ công có phê duyệt        |
| Demo luận văn ổn  | Push main build image | Thủ công có phê duyệt        |
| Production trưởng | Push main build image | Tùy chọn auto-deploy staging |

Không auto-deploy production mỗi lần merge cho đến khi migration, backup, rollback và smoke test đã được chứng minh.

### Task 18: Cập nhật tài liệu canonical sau implement

**Files:**

- Sửa: `docs/phases/phase-5-7-finalization.md`
- Modify: `docs/phases/phase-5-7-finalization.vi.md`
- Modify: `docs/technical-architecture.md`
- Modify: `docs/DOC-CODE-ANCHORS.md`
- Tạo hoặc sửa: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Bước 1: Cập nhật bản ghi phase

Ghi lại:

- Host deploy cuối cùng.
- File compose đã tạo.
- Chiến lược build image.
- Chiến lược workflow CI/CD.
- Chiến lược schema/migration.
- Cấu hình URL công khai SePay.
- Bề mặt API provider SePay đã xác nhận cho tài khoản production thật.
- Chính sách expose monitoring.
- Bằng chứng nghiệm thu.

- [ ] Bước 2: Cập nhật mục 14 technical architecture

Cho mục khớp file thật:

- `docker-compose.infra.yaml`
- `docker-compose.migrations.yaml`
- `docker-compose.app.yaml`
- `docker-compose.proxy.yaml`
- `docker-compose.monitoring.yaml`
- `docker-compose.monitoring.prod.yaml`

- [ ] Bước 3: Cập nhật doc-code anchors

Thêm path dài hạn mới và chạy:

```bash
pnpm verify:doc-anchors
```

Kỳ vọng: anchor verifier exit 0.

## 6. Tiêu chí nghiệm thu production

Phase 7 chỉ được chấp nhận khi mọi mục dưới đây đúng:

- [ ] `docker compose` có thể start infra, chạy migration, và start monitoring, app và proxy từ checkout server sạch.
- [ ] Env production định nghĩa bốn tên database PostgreSQL riêng và MongoDB `qrtable_auth`, với shared fallback tắt.
- [ ] Image migration one-shot apply mọi migration service trước khi boot app.
- [ ] `pnpm db:migration:show` báo mọi migration kỳ vọng đã được apply.
- [ ] `pnpm db:verify:ownership` pass trên cả bốn database PostgreSQL service.
- [ ] User-Access kết nối MongoDB `qrtable_auth`, và bootstrap Keycloak đồng bộ collection user/role cần thiết tại đó.
- [ ] HTTPS công khai hoạt động cho subdomain `api`, `app`, `qr`, `auth` và `grafana` được bảo vệ.
- [ ] Chỉ 80/443 và SSH hạn chế là công khai.
- [ ] BFF `/api/v1/health/live` và `/api/v1/health/ready` pass.
- [ ] Đăng nhập Management App hoạt động với Keycloak qua `auth.qrtable.vodinhquan.dev`.
- [ ] Luồng QR khách hoạt động qua `qr.qrtable.vodinhquan.dev`.
- [ ] Luồng POS/KDS hoạt động qua `app.qrtable.vodinhquan.dev`.
- [ ] Route webhook payment reachable công khai qua HTTPS và từ chối auth không hợp lệ.
- [ ] Route webhook platform SePay `QRSUB` đăng ký đúng URL công khai và chế độ auth secret-key.
- [ ] Luồng OAuth Connect tenant SePay `QRTBL` có thể tạo hoặc verify URL webhook tenant có slug.
- [ ] Mismatch bề mặt API SePay (`/api/v1/webhooks` vs `/v1/webhook`, `Api_Key` vs `SECRET_KEY`) được giải quyết có bằng chứng từ tài khoản SePay thật trước khi dùng live.
- [ ] Grafana hiển thị log, metrics và trace từ app container thật.
- [ ] Seed demo tùy chọn là non-destructive, profile-gated, và có thể khôi phục dataset demo luận văn mà không gọi `dev:reseed`.
- [ ] Quy trình backup và rollback được ghi tài liệu và test ít nhất một lần.
- [ ] CI vẫn xanh cho `lint`, `test` và `build`.
- [ ] Workflow release có thể build và push tag Docker image immutable.
- [ ] Workflow deploy production có thể deploy tag image immutable đã chọn có phê duyệt.
- [ ] Workflow rollback có thể redeploy tag image thành công trước đó.
- [ ] Tài liệu canonical được cập nhật sau implement.

## 7. Ghi chú chi phí và mở rộng

Dùng deploy nhỏ nhất phù hợp sản phẩm hiện tại:

- Pilot: một Droplet 4 vCPU / 8 GiB RAM, self-host infra, bật backup.
- Smoke ngân sách thấp: một Droplet 2 vCPU / 4 GiB RAM, giảm hoặc tắt monitoring ngoài cửa sổ demo.
- Hardening: managed PostgreSQL và Valkey khi an toàn dữ liệu và vận hành quan trọng hơn chi phí tháng.
- Tránh managed Kafka cho luận văn/pilot trừ khi chủ đích phân bổ ngân sách; managed Kafka DigitalOcean là cluster managed đa node.

Sự kiện sản phẩm DigitalOcean đã verify ngày 2026-06-06:

- Droplet từ USD 4/tháng.
- Managed database từ USD 15/tháng.
- Managed PostgreSQL 1 GiB khoảng USD 15,15/tháng.
- Managed Valkey 1 GiB khoảng USD 15/tháng.
- Load Balancer từ USD 12/tháng.
- Droplet backup tính theo phần trăm chi phí Droplet.

## 8. Rủi ro và biện pháp giảm thiểu

| Rủi ro                                    | Tác động                                               | Biện pháp giảm thiểu                                                                         |
| ----------------------------------------- | ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| Bỏ qua migration job hoặc chạy sau app    | Image mới boot với schema không tương thích hoặc thiếu | Chạy image migration immutable và ownership gate trước khi thay app container                |
| Bật shared database fallback              | Service có thể reconnect database legacy hỗn hợp       | Yêu cầu tên env riêng và `DATABASE_SHARED_FALLBACK_ENABLED=false` trong preflight production |
| Chạy `dev:reseed` trên production         | Mất dữ liệu destructive và reset identity/cache        | Loại khỏi script deploy; dùng demo seed non-destructive, profile-gated                       |
| Kafka advertise listener `localhost`      | App container không kết nối được                       | Dùng `PLAINTEXT://kafka:9092` trong compose production                                       |
| Env công khai Vite là build-time          | Customer PWA trỏ sai API sau khi tái dùng image        | Build image với `VITE_BFF_URL` production, hoặc runtime config sau                           |
| Env công khai Next một phần build-time    | Bundle client Management App trỏ sai API               | Build với `NEXT_PUBLIC_*` production và cung cấp runtime env                                 |
| Keycloak `start-dev`                      | IAM production không an toàn                           | Dùng `start`, hostname ngoài, Keycloak backed DB                                             |
| Grafana công khai                         | Observability lộ dữ liệu tenant hoặc hệ thống          | Đặt sau HTTPS, basic auth, firewall/giới hạn IP                                              |
| CORS `*`                                  | Client trình duyệt từ origin không mong muốn gọi BFF   | Thêm config `CORS_ORIGINS` trước production công khai                                        |
| Secret trong compose                      | Rò credential                                          | Dùng `/opt/qrtable/.env.production` với quyền 0600                                           |
| Lỗi một Droplet                           | Sự cố toàn hệ thống                                    | Bật backup/snapshot; sau chuyển DB sang managed service                                      |
| Mismatch bề mặt API SePay                 | Đăng ký webhook OAuth fail sau deploy                  | Verify hình dạng API tài khoản SePay hiện tại trước production live                          |
| Sai route webhook SePay                   | Hóa đơn tenant hoặc subscription không settle          | Đăng ký riêng route tenant `QRTBL` và route platform `QRSUB`                                 |
| Test thanh toán live đổi trạng thái ngoài | Chuyển tiền thật hoặc kích hoạt subscription sai       | CI chỉ test âm tính; verify live thủ công giá trị thấp có audit log                          |

## 9. Cải tiến theo dõi hữu ích

- Thêm `CORS_ORIGINS` vào config BFF và giới hạn `app.qrtable.vodinhquan.dev` và `qr.qrtable.vodinhquan.dev`.
- Thêm user PostgreSQL per-service sau khi pilot single-user ổn định.
- Thêm test tương thích migration cho release expand/contract tương thích ngược.
- Thêm test provider-contract SePay riêng với response provider mock cho bề mặt API live đã chọn.
- Thêm `docker compose --profile demo` và `--profile prod` nếu team muốn một entrypoint compose.
- Thêm endpoint runtime config phía server cho Customer PWA để tránh rebuild image tĩnh khi đổi URL API.
- Thêm wildcard subdomain tenant chỉ sau khi implement resolver tenant theo host.
- Thêm object storage ngoài cho Loki/Tempo chỉ khi yêu cầu retention trở nên thực tế.

---

## 🔍 Code Quality Report

### ✅ Đã áp dụng

- Dùng CodeGraph trước khi chỉnh sửa.
- Đối chiếu code hiện tại với tài liệu canonical trước khi viết plan deploy.
- Chỉ cập nhật artifact plan tiếng Anh; bản dịch tiếng Việt đã được đồng bộ với revision này.
- Giữ service boundary và ownership deploy QRTable trong plan.
- Đối chiếu Phase 7 với cấu hình database-per-service, migration và ownership verification đã implement.
- Coi secret là giá trị runtime-only và tránh commit credential thật.
- Đánh dấu blocker production thay vì che sau các bước deploy lạc quan.
- Đưa CI/CD vào task Phase 7 hạng nhất với gate release, deploy, rollback, phê duyệt và smoke test.
- Thêm verify tài liệu provider SePay và đặt thiết lập webhook/OAuth live làm gate deploy production.

### ⚠️ Debt flags (không chặn — cải thiện khi chạm lại)

- FLAG001 [STRUCT] File compose mục tiêu Phase 7 đã ghi trong doc nhưng chưa implement.
- FLAG002 [PATTERN] Compose monitoring hiện hướng local-host và cần production override.
- FLAG003 [PATTERN] Hình dạng API upsert webhook SePay trong code phải verify với sản phẩm/tài khoản SePay live trước production.
- FLAG004 [ENV_LEAK] Compose provider hiện có credential dev và pattern expose dev.
- FLAG005 [STRUCT] `dist/` chứa artifact app cũ và không nên tin cho deploy.
- FLAG006 [PATTERN] Credential PostgreSQL per-service được hoãn cho đến sau pilot single-user.

### 🔴 Blocker (đã sửa trong output hoặc PHẢI sửa trước merge)

- BLOCK001 [STRUCT] Dockerfile ứng dụng và app compose production chưa tồn tại.
- BLOCK002 [STRUCT] Migration per-service hiện có chưa được đóng gói và tích hợp thành deployment gate production one-shot.
- BLOCK003 [ENV_LEAK] Secret production phải sinh và lưu ngoài git.
- BLOCK004 [PATTERN] Keycloak production không được dùng `start-dev`.

### 💡 Đề xuất

- Bắt đầu Phase 7 với Dockerfile cộng image/job migration trước khi đụng DigitalOcean.
- Dùng subdomain cố định trước, chỉ thêm wildcard tenant routing khi source code cần.
- Coi managed PostgreSQL/Valkey là nâng cấp hardening đầu tiên sau pilot một Droplet.
