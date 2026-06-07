# Phase 7 — Kế hoạch triển khai Docker trên DigitalOcean

> **Bản tiếng Việt** — đã đồng bộ với revision human-operator runbook (2026-06-07); bản tiếng Anh canonical: [2026-06-06-phase-7-docker-digitalocean-deployment.md](2026-06-06-phase-7-docker-digitalocean-deployment.md)

> **Revision 2026-06-07:** Đã xác minh lại với codebase hiện tại và tài liệu provider sau implement database-per-service. Revision này sửa tên env database production, Compose interpolation, binding host TCP/gRPC, Docker networks, quy ước image/tag, đóng gói/bootstrap Keycloak, đường dẫn monitoring, biến E2E, nhất quán backup, gate CI/CD, runbook human-operator đầy đủ cho các nền tảng bên ngoài, và nhãn quyền sở hữu/handoff theo thứ tự thời gian cho mọi task implement.

> **Dành cho agent / dev thực thi:** BẮT BUỘC dùng superpowers:subagent-driven-development hoặc superpowers:executing-plans để implement plan theo từng task. Các bước dùng checkbox (`- [ ]`) để theo dõi tiến độ.

**Mục tiêu:** Đóng gói QRTable thành Docker image tái lập được và triển khai baseline pilot/production Phase 7 lên DigitalOcean dưới domain `vodinhquan.dev`.

**Kiến trúc:** Dùng một DigitalOcean Droplet làm baseline production Phase 7, Docker Compose tách thành các lớp proxy, app, infra và monitoring cộng migration job one-shot và identity bootstrap job. Traffic công khai terminate tại reverse proxy; PostgreSQL, MongoDB, Redis, Kafka, Loki, Prometheus, Tempo và mọi cổng TCP/gRPC NestJS nằm trên mạng Docker nội bộ. Keycloak và Grafana tham gia cả mạng riêng lẫn mạng edge dùng chung để Caddy reach được chúng mà không publish cổng container. Managed database DigitalOcean là tùy chọn hardening sau, không phải phụ thuộc đầu tiên cho luận văn/pilot.

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
- `docs/guides/cloudinary-setup-and-usage-guide.md`
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
- DigitalOcean Container Registry Starter cho phép một repository và 500 MiB. QRTable vì vậy dùng một repository với tag immutable có prefix service; tier Basic là baseline pilot thực tế nếu mười hai image release vượt dung lượng Starter.
- Docker trên Ubuntu nên cài từ repository chính thức của Docker; bản hiện đại gồm `docker compose` dạng plugin.
- Docker Compose interpolation không đọc `env_file` cấp service. Mọi lệnh Compose production phải truyền `--env-file /opt/qrtable/.env.production`. Preflight phải inspect `docker compose config --environment` qua file tạm được bảo vệ vì output đó có thể chứa secret.
- Tag `bitnami/kafka:3.9.0` đề xuất ban đầu không còn khả dụng. Dùng image JVM được hỗ trợ đã xác minh `apache/kafka:4.3.0` với mapping biến môi trường theo tài liệu Apache Kafka, rồi chạy smoke tương thích KafkaJS trước production.
- Bản patch Keycloak và Caddy hiện tại phải pin theo digest khi implement. Baseline lập kế hoạch đã xác minh là Keycloak `26.6.2` và Caddy `2.11.3`.
- Manifest image đã xác minh cho plan gồm Node `22.22.3`, PostgreSQL `16.13`, MongoDB `7.0.31`, Redis `7.4.9`, Nginx `1.30.1`, Kafka `4.3.0`, Keycloak `26.6.2` và Caddy `2.11.3`. CI vẫn phải scan và ghi digest chính xác khi publish hoặc deploy.

Tài liệu tham chiếu chính dùng cho lần xác minh này:

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
- BFF HTTP và Socket.IO hiện bật CORS `origin: '*'`; production công khai bị chặn cho đến khi cả hai dùng cùng allowlist production đã validate.
- `dist/` còn artifact build cũ `product` và `invoice` dù `apps/` không còn các project đó. Build production phải clean và build lại từ source.
- `tools/keycloak-bootstrap.sh` hiện tại luôn đọc user demo deterministic, reset mật khẩu đã biết và chỉ áp redirect client localhost lần tạo đầu. Không được chạy nguyên trạng lên production.
- Bản nháp app compose hiện tại không set biến host listener dùng bởi `TcpConfiguration`/`GrpcConfiguration`; process service sẽ bind `localhost` bên trong container.
- Caddy không reach Keycloak hoặc Grafana trừ khi các service đó join `qrtable-edge`; Prometheus và Tempo tương tự cần mạng dùng chung rõ ràng với app container.

Debt flags:

- Một số doc vẫn ghi Phase 6/7 là TODO dù code observability và monitoring compose đã có.
- `technical-architecture.md` mô tả file compose mục tiêu (`docker-compose.infra.yaml`, `docker-compose.app.yaml`) chưa được implement.
- Global prefix service không thống nhất: một số dùng `api/v1`, `authorizer`, `saas`, `user-access` dùng `api`. Prometheus và rule proxy phải tính đến điều này cho đến khi thống nhất.
- `TcpConfiguration` dùng legacy `<SERVICE>_SERVICE_HOST` của từng service cho listener, trong khi client `TcpProvider` ưu tiên `TCP_<SERVICE>_SERVICE_HOST`. Compose production phải set listener host thành `0.0.0.0` và client host thành tên service Docker.

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

## 4. Human Operator Runbook (Runbook vận hành thủ công)

Phần này là bắt buộc. Các task yêu cầu quyền sở hữu tài khoản, chấp nhận thanh toán, xác minh danh tính, kiểm soát DNS, ủy quyền ngân hàng, xem secret, hoặc di chuyển tiền thật không thể hoàn thành tự động bởi AI agent.

### 4.1 Nhãn trách nhiệm và hợp đồng xử lý secret

Dùng các nhãn sau trong suốt quá trình thực thi:

| Label        | Meaning                                                                                     |
| ------------ | ------------------------------------------------------------------------------------------- |
| `[AGENT]`    | Có thể implement và verify trong repository hoặc trên máy đã được ủy quyền                  |
| `[HUMAN]`    | Yêu cầu chủ tài khoản dùng web console, chấp nhận điều khoản, nhập secret, hoặc chuyển tiền |
| `[SHARED]`   | Agent chuẩn bị lệnh/kiểm tra; human phê duyệt hành động hoặc nhập giá trị được bảo vệ       |
| `HUMAN-GATE` | Deploy phải dừng cho đến khi bằng chứng human được đặt tên được xác nhận                    |

Quy tắc secret:

- Agent không bao giờ yêu cầu người dùng dán API token, mật khẩu, private key, credential ngân hàng, OAuth client secret, hoặc recovery code vào chat.
- Human nhập secret trực tiếp vào GitHub Environments/Actions, console DigitalOcean, SePay, Cloudinary, hoặc `/opt/qrtable/.env.production` qua shell đã xác thực.
- Người dùng chỉ trả lời bằng xác nhận không chứa secret, ví dụ `HUMAN-GATE-03 complete`.
- Bằng chứng ghi tên tài nguyên, ID, URL, fingerprint key, ngày tạo, và bốn ký tự cuối khi hữu ích — không bao giờ ghi toàn bộ giá trị secret.
- Bước CLI có thể ủy quyền cho agent chỉ sau khi người dùng đã xác thực CLI đó và cho phép hành động rõ ràng.

### 4.2 Ma trận trách nhiệm

| Work item                                    | Owner      | Notes                                                                          |
| -------------------------------------------- | ---------- | ------------------------------------------------------------------------------ |
| Dockerfiles, Compose, scripts, tests, docs   | `[AGENT]`  | Công việc trong repository                                                     |
| Account registration, billing, terms, KYC    | `[HUMAN]`  | GitHub, DigitalOcean, SePay, bank, domain registrar, Cloudinary                |
| 2FA/passkeys and recovery codes              | `[HUMAN]`  | Lưu tài liệu recovery trong password manager                                   |
| API/OAuth secret creation and rotation       | `[HUMAN]`  | Agent có thể cung cấp tên field và lệnh validate                               |
| Droplet/registry/firewall creation           | `[SHARED]` | Human phê duyệt chi phí và quyền sở hữu; agent có thể dùng `doctl` đã xác thực |
| DNS changes                                  | `[HUMAN]`  | Yêu cầu kiểm soát DNS zone `vodinhquan.dev`                                    |
| Production env generation                    | `[SHARED]` | Agent sinh lệnh; human nhập secret bên ngoài trực tiếp trên server             |
| Keycloak realm/client automation             | `[AGENT]`  | Human tạo administrator vĩnh viễn và validate đăng nhập trình duyệt            |
| SePay OAuth, bank linking, webhook dashboard | `[HUMAN]`  | Ủy quyền ngân hàng và truy cập provider production không thể tự động hóa       |
| Real payment verification                    | `[HUMAN]`  | Chỉ chuyển khoản giá trị thấp, với phê duyệt rõ ràng                           |
| Release image build                          | `[AGENT]`  | GitHub Actions sau khi human cấu hình repository secrets                       |
| First production deploy                      | `[SHARED]` | Human chọn cửa sổ/tag; agent/script thực thi và verify                         |
| Backup restore rehearsal                     | `[SHARED]` | Human phê duyệt target cô lập và retention; agent chạy kiểm tra                |

### 4.3 Danh mục điều kiện tiên quyết thủ công

Trước khi implement chạm hạ tầng bên ngoài, human phải có:

- [ ] Mục password manager cho QRTable production với owner email, URL tài khoản, resource ID, fingerprint key, và hướng dẫn recovery.
- [ ] 2FA/passkeys bật trên GitHub, DigitalOcean, domain registrar/DNS provider, SePay, Cloudinary, và tài khoản email owner production.
- [ ] Quyền administrator repository GitHub.
- [ ] Team/tài khoản DigitalOcean có phương thức thanh toán hợp lệ và quyền tạo Projects, Droplets, Firewalls, Container Registry, backups, và Spaces.
- [ ] Quyền quản trị DNS zone `vodinhquan.dev`.
- [ ] Tài khoản SePay có khả năng production và tài khoản ngân hàng nhận chuyển khoản `QRTBL`/`QRSUB`.
- [ ] Tài khoản/môi trường sản phẩm Cloudinary nếu upload production QRTable dùng Cloudinary.
- [ ] Workstation operator có `git`, `ssh`, `docker`, `doctl`, `openssl`, và `dig`.
- [ ] Key Ed25519 riêng cho mỗi vai trò bắt buộc: workstation human tới Droplet, checkout read-only Droplet-to-GitHub tùy chọn, và kênh deploy CI-to-Droplet tương lai. Không tái sử dụng key ký/xác thực GitHub cá nhân.

### 4.4 Human gate theo thứ tự

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

Deploy guide do Task 13 tạo phải cung cấp checklist có ngày cho các gate này. Không task nào được im lặng giả định tài khoản hoặc credential bên ngoài đã tồn tại.

### 4.5 Thiết lập web console GitHub

`[HUMAN]` Mở repository trên GitHub:

1. Trong **Settings > Actions > General**, dùng quyền workflow tối thiểu cần thiết. Mặc định read-only repository contents.
2. Trong **Settings > Rules > Rulesets**, bảo vệ `main`:
   - require pull requests;
   - require the CI status checks used by `.github/workflows/ci.yml`;
   - block force pushes and branch deletion;
   - restrict bypass permission to the owner/emergency maintainer.
3. Trong **Settings > Environments**, tạo `production` và hạn chế deployment branches/tags theo chính sách release.
4. Thêm required reviewers khi gói GitHub hỗ trợ.
5. Nếu gói GitHub của repository private không hỗ trợ required reviewers, không giả vờ có approval gate. Giữ deploy production do operator điều khiển, ghi người phê duyệt vào deployment log, và nâng cấp gói GitHub trước khi bật deploy production không giám sát.
6. Trong **production > Environment secrets** hoặc **Settings > Secrets and variables > Actions**, chỉ tạo:
   - `DIGITALOCEAN_ACCESS_TOKEN` để publish release image, scope hẹp nhất DigitalOcean cho phép;
   - SSH deploy secrets chỉ sau khi kênh deploy bảo mật ở mục 4.7 được chọn.
7. Nếu Task 14 clone repository private trên Droplet, thêm deploy key read-only riêng dưới **Settings > Deploy keys**. Không cho phép write access. Ưu tiên release bundle chỉ image sau để host production không cần truy cập repository.
8. Pin third-party GitHub Actions tới full commit SHA, giữ workflow permissions rõ ràng, và review cập nhật Dependabot trước khi đổi SHA đó.

Không lưu application runtime secrets, database passwords, Keycloak admin passwords, SePay credentials, Cloudinary secrets, hoặc master production env trong GitHub.

Bằng chứng `HUMAN-GATE-02`:

- ruleset name and active state;
- production environment name and branch policy;
- whether required reviewers are genuinely enforced by the current GitHub plan;
- configured secret names only;
- screenshot or settings URL with all secret values hidden.

### 4.6 Thiết lập web console DigitalOcean

`[HUMAN]` Hoàn thành các bước sau trong control panel DigitalOcean:

1. Tạo/chọn Project tên `qrtable-production`.
2. Tạo một Container Registry. Tên registry là globally unique và không thể đổi, nên xác nhận tên cuối trước khi tạo. Dùng region gần Droplet nhất và chọn tier trả phí nếu mười hai release image vượt giới hạn Starter.
3. Tạo DigitalOcean API token riêng dưới **API > Applications & API**. Copy một lần vào password manager và GitHub release secret; không commit.
4. Thêm public SSH key của operator dưới **Settings > Security > SSH keys**. Chỉ upload file `.pub`.
5. Reserve địa chỉ IPv4 công khai cho QRTable, rồi gắn vào Droplet production. DNS phải trỏ tới Reserved IP này, không phải địa chỉ Droplet tạm thời.
6. Tạo Droplet:
   - Ubuntu 24.04 LTS hoặc Ubuntu LTS được hỗ trợ hiện tại;
   - `sgp1` khi có sẵn;
   - 4 vCPU / 8 GiB kích thước pilot khuyến nghị;
   - VPC cùng region;
   - chỉ xác thực SSH-key;
   - enhanced monitoring bật;
   - backups bật trước live traffic;
   - tags như `qrtable`, `production`, và `phase7`.
7. Tạo và gắn Cloud Firewall:
   - inbound `22/tcp` chỉ từ public IP/CIDR hiện tại của operator;
   - inbound `80/tcp` và `443/tcp` từ mọi client IPv4/IPv6;
   - không có rule công khai cho cổng container application, datastore, Kafka, Keycloak, hoặc monitoring;
   - outbound bình thường cho package download, registry pull, OAuth, webhook, và telemetry.
8. Thêm block volume chỉ khi yêu cầu disk/retention đo được biện minh. Ghi mount và chính sách backup riêng.

Bằng chứng `HUMAN-GATE-03`/`04`:

- DigitalOcean Project name/ID;
- registry hostname and tier;
- API token creation date, scope, and last four characters only;
- Droplet ID, region, size, image, tags, and Reserved IP;
- Cloud Firewall ID and rule summary;
- backup and monitoring enabled state;
- successful SSH key fingerprint match and `ssh` login.

### 4.7 Kênh điều khiển SSH production và GitHub Actions

Pilot Phase 7 đầu tiên dùng baseline sau:

- GitHub Actions build, scan, và publish immutable release images.
- Operator production deploy từ trusted workstation qua SSH.
- Port 22 vẫn hạn chế tới IP đã biết của operator.
- Operator chạy remote deployment script đã audit với immutable image tag đã chọn.

Lệnh operator ví dụ:

```bash
ssh -o IdentitiesOnly=yes qrtable-deploy@<reserved-ip> \
  "cd /opt/qrtable && IMAGE_TAG='<git-sha>' ./tools/deploy/phase7-remote-deploy.sh"
```

Không mở SSH tới `0.0.0.0/0` chỉ để GitHub-hosted runner kết nối. Địa chỉ egress của GitHub-hosted runner không phải single source IP ổn định phù hợp cho firewall rule này.

Trước khi bật `deploy-production.yml` tùy chọn, `[HUMAN]` phải chọn và ghi tài liệu một kênh bảo mật:

| Option                                       | Phase 7 decision | Notes                                                                       |
| -------------------------------------------- | ---------------- | --------------------------------------------------------------------------- |
| Operator workstation deploy                  | Baseline         | Đơn giản nhất; giữ SSH hạn chế; approval rõ ràng                            |
| Private overlay/VPN such as Tailscale        | Recommended next | Truy cập GitHub runner vẫn cần thiết kế xác thực có chủ đích                |
| Temporary runner-IP firewall rule via DO API | Conditional      | Workflow phải thêm đúng `/32`, deploy, và luôn gỡ; token cần firewall scope |
| Isolated self-hosted deployment runner       | Later            | Phải harden, patch, monitor, và không chạy code pull-request không tin cậy  |

`HUMAN-GATE-10` phải ghi kênh đã chọn. Cho đến khi kênh không-baseline được test, `deploy-production.yml` vẫn disabled hoặc chỉ in lệnh operator thay vì khởi tạo SSH.

### 4.8 Quy trình domain, DNS, và TLS

`[HUMAN]` Tại DNS provider có thẩm quyền cho `vodinhquan.dev`, tạo:

| Type | Name              | Value                    | Initial TTL |
| ---- | ----------------- | ------------------------ | ----------- |
| A    | `api.qrtable`     | DigitalOcean Reserved IP | 300         |
| A    | `app.qrtable`     | DigitalOcean Reserved IP | 300         |
| A    | `qr.qrtable`      | DigitalOcean Reserved IP | 300         |
| A    | `auth.qrtable`    | DigitalOcean Reserved IP | 300         |
| A    | `grafana.qrtable` | DigitalOcean Reserved IP | 300         |

Nếu DNS provider có chế độ HTTP proxy/CDN, giữ các bản ghi DNS-only cho đến khi Caddy cấp certificate thành công. Review bản ghi CAA hiện có: phải cho phép Let's Encrypt hoặc gỡ/cập nhật trước khi cấp.

Xác nhận domain không sắp hết hạn, chi tiết auto-renew/thanh toán registrar hợp lệ, và nameserver có thẩm quyền là nơi đang chỉnh sửa.

Verify từ bên ngoài Droplet:

```bash
for host in api app qr auth grafana; do
  dig +short "${host}.qrtable.vodinhquan.dev" @1.1.1.1
  dig +short "${host}.qrtable.vodinhquan.dev" @8.8.8.8
done
dig CAA qrtable.vodinhquan.dev +short
```

Sau khi Caddy start, verify hostname certificate, issuer, expiry, redirect behavior, và log automatic-renewal. DNS propagation đơn thuần không phải `HUMAN-GATE-05`; TLS công khai thành công cũng bắt buộc.

### 4.9 Quy trình credential bên ngoài và production env

`[SHARED]` Sinh secret thuộc QRTable locally hoặc trực tiếp trên server:

```bash
openssl rand -base64 48
openssl rand -hex 32
```

Human nhập secret thuộc provider trực tiếp. Danh mục tối thiểu:

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

Kiểm tra repository hiện tại tìm thấy credential development đã điền trong `.env` local bị git-ignore, và Keycloak client secret deterministic vẫn còn trong development tooling. Vì vậy:

- không bao giờ copy `.env` local hiện tại sang production;
- sinh credential production-only mới cho mọi nhóm secret;
- rotate credential development/provider đã từng commit, chia sẻ, screenshot, log, hoặc tái sử dụng ngoài trusted workstation hiện tại;
- chạy secret-history scan trước release đầu và chỉ ghi số lượng phát hiện/remediation, không ghi giá trị secret;
- đảm bảo script bootstrap/deploy production không fallback về default development deterministic.

`[HUMAN]` Với Cloudinary:

1. Tạo/chọn môi trường sản phẩm production.
2. Lấy cloud name, API key, và API secret từ trang API Keys của Cloudinary.
3. Chỉ lưu API secret trong password manager và production server env.
4. Chạy một smoke upload/read/delete bằng ảnh test không nhạy cảm.
5. Xác nhận frontend bundle và log không chứa API secret.

Trên server:

```bash
sudo install -d -m 0750 -o qrtable-deploy -g qrtable-deploy /opt/qrtable
sudo install -m 0600 -o qrtable-deploy -g qrtable-deploy \
  docker/env/.env.production.example /opt/qrtable/.env.production
sudoedit /opt/qrtable/.env.production
stat -c '%a %U %G %n' /opt/qrtable/.env.production
```

Mode kỳ vọng là `600`. Chạy preflight redacted và scoped-env renderer; không chạy `cat`, `env`, `docker compose config`, hoặc `config --environment` trực tiếp vào log dùng chung.

### 4.10 Quy trình Keycloak cho human

`[AGENT]` Production bootstrap job tạo/cập nhật realm, roles, protocol mappers, clients, redirect URIs, web origins, và service-account permissions.

`[HUMAN]` Sau bootstrap:

1. Đăng nhập Keycloak Admin Console qua `https://auth.qrtable.vodinhquan.dev`.
2. Tạo administrator vĩnh viễn có tên cho owner/maintainer.
3. Bật xác thực mạnh theo chính sách Keycloak đã chọn.
4. Đăng xuất và đăng nhập lại bằng administrator vĩnh viễn.
5. Vô hiệu hóa/xóa temporary bootstrap administrator và gỡ giá trị bootstrap tạm khỏi runtime injection bình thường.
6. Test đăng nhập Management App, logout, token issuer, tenant/role claims, và từ chối role không được phép trong phiên trình duyệt riêng.

Credential bootstrap tạm là tài liệu recovery/bootstrap, không phải danh tính administrator dài hạn.

### 4.11 Quy trình tài khoản SePay, OAuth, webhook, và live test

Hướng dẫn cấp protocol canonical vẫn là `docs/guides/sepay-configuration-guide-phase3.md`; plan này định nghĩa các operator gate bắt buộc.

`[HUMAN]` phải:

1. Đăng ký/đăng nhập SePay, hoàn thành xác minh danh tính/doanh nghiệp nếu yêu cầu, chấp nhận điều khoản provider, và kết nối tài khoản ngân hàng nhận dự định.
2. Xác nhận tài khoản dùng Bank Hub `/v1/webhook` với `SECRET_KEY` hay bề mặt `/api/v1/webhooks`/`Api_Key` đang được code.
3. Tạo OAuth application với callback production chính xác:

   ```text
   https://app.qrtable.vodinhquan.dev/dashboard/payment-settings/sepay-callback
   ```

4. Nhập OAuth client ID/secret trực tiếp vào `/opt/qrtable/.env.production`.
5. Cấu hình webhook platform `QRSUB`:

   ```text
   https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
   ```

6. Hoàn thành tenant OAuth Connect từ Management App và verify webhook tenant `QRTBL` sinh ra có tenant slug.
7. Verify secret sai/thiếu bị từ chối và provider call hợp lệ được audit idempotent.
8. Chỉ sau phê duyệt rõ ràng, thực hiện một chuyển khoản thật giá trị thấp và quan sát BFF, Payment/SaaS, database audit, và bằng chứng Grafana.

AI không thể chấp nhận điều khoản SePay, hoàn thành KYC, ủy quyền tài khoản ngân hàng, phê duyệt OAuth consent với tư cách owner, hoặc khởi tạo chuyển khoản ngân hàng thật.

Bằng chứng `HUMAN-GATE-09`:

- SePay account/product name and verified API surface;
- OAuth application name and callback URL;
- connected bank identifier with account number redacted;
- platform and tenant webhook IDs/URLs with secrets hidden;
- provider delivery result and QRTable transaction/audit ID;
- amount/time/result of any approved low-value test.

### 4.12 Thiết lập backup off-Droplet

`[HUMAN]` Tạo DigitalOcean Space riêng hoặc object-storage target độc lập khác:

1. Chọn region gần Droplet.
2. Giữ bucket private.
3. Tạo access key riêng hạn chế bucket backup và thao tác bắt buộc khi provider hỗ trợ.
4. Nhập key/secret trực tiếp vào backup env trên server, không vào GitHub hay chat.
5. Định nghĩa retention và quyền xóa.

`[AGENT]` upload backup đã mã hóa, download tới target restore cô lập, verify checksum, restore PostgreSQL và MongoDB, và ghi duration/result. Archive hoặc snapshot cùng Droplet đơn thuần không thỏa `HUMAN-GATE-11`.

### 4.13 Cửa sổ deploy production đầu tiên

`[SHARED]` Trước deploy công khai đầu tiên:

- [ ] Human chọn immutable image tag và cửa sổ bảo trì/demo.
- [ ] Human xác nhận backup và rollback tag hiện tại.
- [ ] Agent chạy preflight, migrations, ownership verification, deploy, và smoke checks.
- [ ] Human validate login, luồng QR, POS/KDS, upload Cloudinary, và luồng SePay phía owner.
- [ ] Agent và human quan sát health, log, metrics, trace, disk, memory, và lỗi webhook ở 5, 15, và 60 phút.
- [ ] Human ghi `accept`, `rollback app`, hoặc `restore data` như các quyết định riêng.

### 4.14 Bản ghi bằng chứng operator

Implementation guide phải chứa deployment record đã redact với:

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

Không screenshot, log, hoặc file bằng chứng nào được chứa full token, password, private key, OAuth secret, webhook secret, bank credential, hoặc dữ liệu khách hàng chưa redact.

## 5. Cấu trúc file mục tiêu

Tạo mới:

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
- `apps/bff/src/app/modules/realtime/gateways/order-events.gateway.ts`
- `apps/bff/src/configuration/index.ts`
- `docker-compose.monitoring.yaml` hoặc chỉ tạo production override
- `docker/monitoring/prometheus/prometheus.yml` hoặc config Prometheus riêng production
- `docs/technical-architecture.md` mục 14
- `docs/phases/phase-5-7-finalization.md`
- `docs/phases/phase-5-7-finalization.vi.md`
- `docs/DOC-CODE-ANCHORS.md`

File riêng chỉ tạo trên server:

- `/opt/qrtable/.env.production`
- `/opt/qrtable/env/*.env`
- `/opt/qrtable/secrets/*`
- `/opt/qrtable/backups/*`

Không commit các file riêng đó.

## 6. Tasks (Các task)

### 6.1 Bản đồ quyền sở hữu thực thi

Đọc bản đồ này trước khi bắt đầu bất kỳ task nào. Quyền sở hữu theo thứ tự thời gian: mỗi hàng xác định ai tham gia khi thực thi đến task đó, và phần thân task xác định bước handoff chính xác.

| Task                               | Primary ownership | Human participation / stop condition                                                               |
| ---------------------------------- | ----------------- | -------------------------------------------------------------------------------------------------- |
| 1. Kiểm soát build context         | `[AGENT]`         | Không                                                                                              |
| 2. Image backend                   | `[AGENT]`         | Không, trừ khi truy cập Docker Desktop/daemon yêu cầu user khởi động hoặc ủy quyền                 |
| 3. Image Management App            | `[AGENT]`         | Không                                                                                              |
| 4. Image Customer PWA              | `[AGENT]`         | Không                                                                                              |
| 5. Compose infra production        | `[AGENT]`         | Không; hạ tầng bên ngoài chưa được cấp phát                                                        |
| 6. Lớp App Compose                 | `[AGENT]`         | Không                                                                                              |
| 7. Reverse proxy và cấu hình HTTPS | `[AGENT]`         | Không; quyền sở hữu DNS và cấp certificate live diễn ra ở Task 13                                  |
| 8. Env và secret production        | `[SHARED]`        | Human nhập secret do provider cấp; dừng tại `HUMAN-GATE-06` và `HUMAN-GATE-07` trước deploy live   |
| 9. Migration                       | `[AGENT]`         | Không cho implement; thực thi production diễn ra dưới phê duyệt Task 14                            |
| 10. Bootstrap Keycloak             | `[SHARED]`        | Agent tự động hóa bootstrap realm/client; human tạo/verify admin vĩnh viễn tại `HUMAN-GATE-08`     |
| 11. Tích hợp SePay production      | `[SHARED]`        | Human sở hữu tài khoản/KYC/ngân hàng/OAuth consent/chuyển khoản thật; dừng tại `HUMAN-GATE-09`     |
| 12. Monitoring                     | `[AGENT]`         | Không                                                                                              |
| 13. Cấp phát DigitalOcean          | `[SHARED]`        | Human sở hữu tài khoản, billing, console, DNS và phê duyệt chi phí; gate `01`, `03`, `04`, và `05` |
| 14. Deploy stack                   | `[SHARED]`        | Agent chạy deploy; human cung cấp giá trị được bảo vệ và validate identity; gate `06` đến `08`     |
| 15. Smoke/demo verification        | `[AGENT]`         | Verify tự động và trình duyệt; không chuyển khoản thật                                             |
| 16. Backup/rollback/vận hành       | `[SHARED]`        | Human bật backup/storage trả phí và phê duyệt retention/restore target; dừng tại `HUMAN-GATE-11`   |
| 17. CI/CD và release               | `[SHARED]`        | Human cấu hình kiểm soát GitHub và phê duyệt deploy production; `HUMAN-GATE-02` và `HUMAN-GATE-10` |
| 18. Tài liệu canonical             | `[AGENT]`         | Human review tùy chọn; không có execution gate                                                     |

Quy tắc thực thi:

1. Task `[AGENT]`: agent implement và verify toàn bộ task mà không yêu cầu xác nhận thường lệ.
2. Task `[SHARED]`: agent hoàn thành mọi chuẩn bị thuộc agent trước, rồi chỉ dừng tại bước human hoặc `HUMAN-GATE` được đặt tên rõ ràng.
3. Bước `[HUMAN]`: agent cung cấp hướng dẫn chính xác và bằng chứng redact kỳ vọng; human thực hiện thao tác tài khoản/console/secret/thanh toán.
4. Human gate chỉ hoàn tất khi bằng chứng được ghi lại. Tạo code phụ thuộc tài nguyên bên ngoài không hoàn tất gate.
5. Không thực hiện thao tác production sau bằng cách giả định human gate đã bỏ qua là đã hoàn tất.
6. Gate ID là tham chiếu chéo ổn định tới Mục 4. Vị trí task/bước, không phải gate ID số, quyết định thời điểm handoff khi thực thi plan.

### Task 1: Thêm kiểm soát build context

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `.dockerignore`

- [ ] Bước 1: Tạo `.dockerignore` ở root

Dùng nội dung sau:

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

- [ ] Bước 2: Verify build context nhỏ gọn

Chạy build BuildKit thật và inspect dòng `load build context`:

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

Kỳ vọng: context transfer có giới hạn và không chứa `node_modules`, `docker/docker_data`, `.codegraph`, test report hay `.env` riêng. Không dùng `docker buildx du` cho kiểm tra này; lệnh đó báo dung lượng disk builder, không phải kích thước build context.

### Task 2: Build image backend

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `docker/backend.Dockerfile`
- Tạo: `tools/deploy/phase7-build-images.sh`
- Tạo: `tools/deploy/phase7-render-service-envs.sh`

- [ ] Bước 1: Tạo Dockerfile backend tham số hóa

Dùng một Dockerfile với `APP_NAME` để cả tám NestJS service dùng chung pattern build:

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

- [ ] Bước 2: Tạo script build image

Dùng nội dung sau:

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

Implementation có thể diễn đạt chọn output khác, nhưng phải chọn đúng một trong `--load` cho verify local hoặc `--push` cho CI. Cả mười hai artifact release dùng chung một repository DOCR và tag có prefix service.

Task 3, 4, 5 và 9 phải append build Management App, Customer PWA, Keycloak và migration vào script này. Script phải fail trừ khi cả mười hai tag kỳ vọng được build hoặc push.

- [ ] Bước 3: Verify một image backend trước khi build hết

Chạy:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:phase7-smoke .
docker run --rm qrtable-bff:phase7-smoke node --version
```

Kỳ vọng: build exit 0 và Node in ra version.

### Task 3: Build image Management App

**Ownership:** `[AGENT]`

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

- [ ] Bước 3: Verify image

Chạy:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/management-app.Dockerfile \
  --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
  -t qrtable-management-app:phase7-smoke .
```

Kỳ vọng: build exit 0.

### Task 4: Build image Customer PWA

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `docker/customer-pwa.Dockerfile`

- [ ] Bước 1: Tạo image PWA tĩnh

Dùng nội dung sau:

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
docker buildx build --platform linux/amd64 --load \
  -f docker/customer-pwa.Dockerfile \
  --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
  --build-arg VITE_TENANT_ID=seed-tenant-fallback \
  -t qrtable-customer-pwa:phase7-smoke .
```

Kỳ vọng: build exit 0.

### Task 5: Thay compose provider dev bằng compose infra production

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `docker-compose.infra.yaml`
- Tạo: `docker/keycloak.Dockerfile`
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

File init entrypoint PostgreSQL chỉ chạy khi `postgres_data` rỗng. Preflight phải verify cả năm database tồn tại. Khi áp dụng plan trên volume đã có, thực thi SQL init idempotent qua `psql` một cách rõ ràng; không giả định thêm file dưới `docker-entrypoint-initdb.d` sẽ mutate cluster đã khởi tạo.

- [ ] Bước 3: Build an optimized Keycloak image with the QRTable theme

Không build theme trên Droplet. Server được cấp phát cố ý có Docker nhưng không yêu cầu Node.js hay pnpm. Đóng gói provider jar vào image Keycloak immutable trong CI:

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

Khi implement, pin base image theo digest sau kiểm tra tương thích và lỗ hổng. Build và publish dưới dạng `${IMAGE_REPOSITORY}:keycloak-${IMAGE_TAG}`.

- [ ] Bước 4: Tạo compose infra production

Yêu cầu chính:

- Pin bản patch được hỗ trợ theo digest.
- Không publish port công khai cho database, Redis, Kafka hay cổng nội bộ Keycloak.
- Dùng named volume, không bind-mount `docker/docker_data`.
- Dùng health check container cho PostgreSQL, MongoDB, Redis và Kafka; poll readiness Keycloak từ tooling image vì image Keycloak chính thức không có `curl`.
- Set Kafka advertised listener thành `kafka:9092` cho app container.
- Chạy image Keycloak optimized tùy chỉnh với `start --optimized` production, không `start-dev`.
- Cho Keycloak join cả `qrtable-infra` và `qrtable-edge` để reach PostgreSQL và Caddy reach Keycloak.

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

- [ ] Bước 5: Verify interpolation, compose syntax, networks, and readiness

Chạy:

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.infra.yaml
```

Kỳ vọng:

- Compose render không lỗi cú pháp hay giá trị `${...}` chưa resolve.
- `keycloak` join `qrtable-edge` và `qrtable-infra`.
- Không container infra nào publish host port.
- `phase7-preflight.sh --wait-infra` chờ datastore healthy và poll `http://keycloak:9000/health/ready` từ container migration/tooling trên `qrtable-infra`.
- Smoke KafkaJS dùng client đã cài trong repo tạo/dùng test topic, produce một event và consume thành công với Kafka `4.3.0`.

### Task 6: Tạo lớp App Compose

**Ownership:** `[AGENT]`

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

- [ ] Bước 2: Thêm app health check như phần của compose production

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
- Order/Catalog/Kitchen/Payment/SaaS: `/api/v1/health/live`
- Authorizer/User-Access: `/api/health/live`

- [ ] Bước 3: Verify ma trận listener/client host

Môi trường compose phải thỏa contract code hiện tại:

| Container   | Biến listener set `0.0.0.0`                      | Client host TCP/gRPC set tên service                                        |
| ----------- | ------------------------------------------------ | --------------------------------------------------------------------------- |
| BFF         | none                                             | all seven `TCP_*`; `AUTHORIZER_SERVICE_HOST`; `USER_ACCESS_SERVICE_HOST`    |
| Order       | `ORDER_SERVICE_HOST`                             | Catalog, SaaS                                                               |
| Catalog     | `CATALOG_SERVICE_HOST`                           | SaaS                                                                        |
| Kitchen     | `KITCHEN_SERVICE_HOST`                           | Order                                                                       |
| Payment     | `PAYMENT_SERVICE_HOST`                           | Order, SaaS                                                                 |
| SaaS        | `SAAS_SERVICE_HOST`                              | Authorizer, User-Access, Catalog, Order, Payment                            |
| Authorizer  | `AUTHORIZER_SERVICE_HOST` for both TCP and gRPC  | User-Access through TCP and `USER_ACCESS_SERVICE_HOST` through gRPC         |
| User-Access | `USER_ACCESS_SERVICE_HOST` for both TCP and gRPC | Authorizer through TCP and `AUTHORIZER_SERVICE_HOST` through gRPC; SaaS TCP |

Chạy smoke kết nối TCP/gRPC cấp container trước nghiệm thu công khai. Process listen trên `127.0.0.1` bên trong container riêng là lỗi deploy dù HTTP health endpoint vẫn pass.

- [ ] Bước 4: Verify interpolation app compose và network membership

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.app.yaml
```

Kỳ vọng: mọi image resolve thành `${IMAGE_REPOSITORY}:<service>-${IMAGE_TAG}`, không còn placeholder `${...}`, chỉ BFF/Management App/Customer PWA join `qrtable-edge`, và không app service nào publish host port.

### Task 7: Thêm reverse proxy và HTTPS

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `docker/proxy/Caddyfile`
- Tạo: `docker-compose.proxy.yaml`

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
  basic_auth {
    {$GRAFANA_BASIC_AUTH_USER} {$GRAFANA_BASIC_AUTH_HASH}
  }
  reverse_proxy grafana:3000
}
```

Sinh hash basic-auth Caddy trên server:

```bash
docker run --rm caddy:2.11.3 caddy hash-password --plaintext "$GRAFANA_BASIC_AUTH_PASSWORD"
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

- [ ] Bước 3: Verify Caddy config

Chạy:

```bash
./tools/deploy/phase7-compose-validate.sh -f docker-compose.proxy.yaml
```

Kỳ vọng: compose render không lỗi cú pháp, `basic_auth` được chấp nhận bởi bản Caddy đã pin, và Caddy resolve được `bff`, `management-app`, `customer-pwa`, `keycloak`, `grafana` trên `qrtable-edge`. Caddy tự xử lý WebSocket upgrade cho reverse proxy BFF.

### Task 8: Chuẩn bị env và secret production

**Ownership:** `[SHARED]`

**Handoff:** Agent tạo template, generator, validator, scoped env renderer và triển khai CORS. Human nhập giá trị production do bên ngoài cấp trực tiếp vào secret store đã phê duyệt. Không chặn implement vì thiếu các giá trị đó; chặn deploy live đầu tiên tại `HUMAN-GATE-06` và `HUMAN-GATE-07`.

**Files:**

- Tạo: `docker/env/.env.production.example`
- Tạo: `tools/deploy/phase7-compose-validate.sh`
- Tạo: `tools/deploy/phase7-render-service-envs.sh`

- [ ] Bước 1: Tạo file mẫu chỉ có key và giá trị mẫu an toàn `[AGENT]`

Gồm mọi key bắt buộc, không gồm secret thật:

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

- [ ] Bước 2: Generate server secrets `[SHARED]`

Chạy trên server:

```bash
openssl rand -hex 32
openssl rand -base64 32
```

`[AGENT]` cung cấp quy trình sinh/validate. `[HUMAN]` nhập Cloudinary, SePay, ngân hàng và giá trị provider khác do bên ngoài cấp trực tiếp vào env production được bảo vệ mà không expose trong chat, terminal history hay log dùng chung.

Kỳ vọng:

- `CATALOG_TYPEORM_DATABASE`, `ORDER_TYPEORM_DATABASE`, `PAYMENT_TYPEORM_DATABASE`, `SAAS_TYPEORM_DATABASE` và `USER_ACCESS_MONGO_DB_NAME` đều có mặt.
- `DATABASE_SHARED_FALLBACK_ENABLED=false`.
- Không service nào phụ thuộc `TYPEORM_DATABASE` hoặc `MONGO_DB_NAME` ở production.
- `PAYMENT_SECRETS_ENCRYPTION_KEY` đúng 64 ký tự hex.
- `AUTH_SECRET`, mật khẩu DB, secret Keycloak và mật khẩu Grafana là giá trị ngẫu nhiên mạnh.
- MongoDB credentials interpolated into `MONGODB_URI` are URL-safe hex or correctly percent-encoded.
- The real Caddy bcrypt value is single-quoted in `.env.production` so `$` characters remain literal, for example `GRAFANA_BASIC_AUTH_HASH='$2a$...'`.
- `IMAGE_REPOSITORY` trỏ tới repository DOCR duy nhất và `IMAGE_TAG` immutable cho mỗi release.
- `KAFKA_CLUSTER_ID` sinh một lần, lưu trong env production, và tái sử dụng trong vòng đời volume dữ liệu Kafka.
- `CORS_ORIGINS` chỉ chứa đúng origin Management App và Customer PWA.
- `AUTH_AUTO_PROVISION_ON_FIRST_LOGIN=false` unless a separately reviewed production onboarding policy intentionally enables it.
- File `/opt/qrtable/.env.production` thật không bao giờ được commit.

- [ ] Bước 3: Validate Compose không rò giá trị interpolation `[AGENT]`

Tạo `phase7-compose-validate.sh`:

- Set `umask 077`.
- Capture cả `docker compose --env-file /opt/qrtable/.env.production ... config` và `config --environment` vào file tạm.
- Từ chối placeholder `${...}` chưa resolve, biến release bắt buộc rỗng, host port công khai không mong đợi, và tham chiếu trực tiếp master env làm `env_file` cấp service.
- Không stream file đã capture ra stdout/stderr hay upload làm CI artifact.
- Xóa chúng qua `trap` khi success, failure hoặc interruption.
- Chỉ in tóm tắt pass/fail đã redact với tên file compose và tên key fail, không bao giờ in giá trị.

- [ ] Bước 4: Render file env runtime least-privilege `[AGENT]`

Dùng `/opt/qrtable/.env.production` chỉ làm nguồn master riêng cho Compose interpolation và deployment tooling. Không inject nguyên file đó vào application container.

Tạo `phase7-render-service-envs.sh` với allowlist rõ ràng cho:

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

Yêu cầu:

- Create `/opt/qrtable/env` with mode `0700` and each file atomically with mode `0600`.
- Duy trì allowlist biến trong source control, nhưng không bao giờ ghi giá trị secret ra log.
- Fail if a required variable is missing or if an unknown variable is requested by a service mapping.
- Chỉ derive `MONGODB_URI` bên trong renderer từ credential URL-safe và gồm `authSource=admin`; không duplicate URI đầy đủ trong master env.
- Copy safe common runtime values such as `NODE_ENV=production`, `GLOBAL_PREFIX`, OTEL endpoint, and log level only to services that consume them.
- Keep DB credentials out of BFF/frontends, SePay credentials out of unrelated services, Keycloak admin credentials out of app containers, and Grafana basic-auth material only in `proxy.env`.
- `migrations.env` receives only database/migration variables. `identity-bootstrap.env` separately owns Keycloak admin/client and optional Mongo identity-sync values.
- Preflight từ chối mọi service có `env_file` trỏ trực tiếp tới master `.env.production`.

Mapping ownership tối thiểu:

| File env                 | Nhóm cấu hình sở hữu                                                                      |
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

- [ ] Bước 5: Implement và test allowlist CORS production `[AGENT]`

Trước deploy công khai:

- Parse `CORS_ORIGINS` once in BFF configuration and reject wildcard `*` when `NODE_ENV=production`.
- Tái sử dụng cùng allowlist trong `app.enableCors(...)` và `@WebSocketGateway(...)`.
- Add tests for allowed Management/PWA origins, a rejected unlisted origin, and production startup failure for an empty or wildcard allowlist.
- Add external preflight checks for both HTTP and Socket.IO handshake origins.

Đây là blocker production, không phải cải tiến theo dõi.

### Task 9: Đóng gói và chạy migration per-service hiện có

**Ownership:** `[AGENT]`

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

Build và push với cùng immutable tag như image app:

```bash
docker buildx build --platform linux/amd64 --load \
  -f docker/migrations.Dockerfile \
  -t "${IMAGE_REPOSITORY}:migrations-${IMAGE_TAG}" \
  .
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

Không service one-shot nào expose port, tự restart, hay chạy liên tục sau khi lệnh thoát. Migration database chỉ chạy qua `migrations`; bootstrap Keycloak chỉ qua `identity-bootstrap`.

- [ ] Bước 4: Chạy migration trước app container

`tools/deploy/phase7-migrate.sh` phải chạy:

```bash
COMPOSE_ENV=(--env-file /opt/qrtable/.env.production)
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:migrate
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:migration:show
docker compose "${COMPOSE_ENV[@]}" -f docker-compose.migrations.yaml run --rm migrations pnpm db:verify:ownership
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

**Ownership:** `[SHARED]`

**Handoff:** Agent đóng gói theme và tự động hóa bootstrap realm/client. Sau khi dịch vụ identity công khai chạy, human tạo và verify administrator vĩnh viễn, hoàn thành `HUMAN-GATE-08`.

**Files:**

- Tạo: `docker/keycloak.Dockerfile`
- Sửa hoặc bọc: `tools/keycloak-bootstrap.sh`
- Tạo: `tools/deploy/phase7-keycloak-bootstrap.sh`

- [ ] Bước 1: Package the Keycloak theme in the immutable image `[AGENT]`

Build image Keycloak optimized tùy chỉnh trong Task 5 và publish cùng release. Droplet không được chạy `pnpm theme:build` và không bind-mount thư mục theme mutable trên host.

- [ ] Bước 2: Split infrastructure bootstrap from demo-user bootstrap `[AGENT]`

`tools/keycloak-bootstrap.sh` hiện tại không an toàn cho production vì yêu cầu `tools/auth-bootstrap-users.json`, reset mọi mật khẩu được liệt kê mỗi lần chạy, và file đã commit chứa mật khẩu demo deterministic.

Refactor or wrap it so:

- Realm, roles, protocol mappers, service account permissions, clients, client secrets, redirect URIs, and web origins are idempotently created **and updated** on every run.
- `qrtable-bff` vẫn là confidential machine/direct-grant client theo hành vi source hiện tại: bật service account và direct grant, tắt browser standard flow, và không có redirect URI/web origin trình duyệt.
- `management-app` remains a confidential browser client: standard flow enabled, direct grants/service accounts disabled unless source evidence requires them, exact Auth.js callback URI, and exact app web origin.
- `AUTH_BOOTSTRAP_USERS_ENABLED=false` là hành vi production mặc định.
- Demo users are only created or updated when `DEPLOYMENT_PROFILE=demo`, `AUTH_BOOTSTRAP_USERS_ENABLED=true`, and an explicit `--yes` flag are all present.
- Bootstrap production không bao giờ đọc `tools/auth-bootstrap-users.json` và không reset mật khẩu người dùng thật.
- `KEYCLOAK_CLEAN_REALM=true` remains restricted to local hosts and is never used by Phase 7 deployment.
- Đồng bộ user MongoDB chỉ chạy cho đường bootstrap user được bật rõ ràng.

- [ ] Bước 3: Bootstrap realm and clients from the infra network `[AGENT]`

Chạy bootstrap qua image migration/tooling để `keycloak` và `mongodb` resolve trên mạng Docker nội bộ. Redirect URI công khai vẫn dùng domain production:

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

- [ ] Bước 4: Verify redirect URIs, web origins, and public issuer `[SHARED]`

Ensure Keycloak clients include:

```text
management-app redirect:
https://app.qrtable.vodinhquan.dev/api/auth/callback/keycloak

management-app web origin:
https://app.qrtable.vodinhquan.dev

qrtable-bff redirect/origin:
none for the current service-account/direct-grant flow
```

Kỳ vọng:

- Đăng nhập Management App redirect qua `auth.qrtable.vodinhquan.dev`.
- Token expose public issuer `https://auth.qrtable.vodinhquan.dev/realms/qrtable`.
- Authorizer reaches Keycloak internally at `http://keycloak:8080` for token/JWKS/admin calls without exposing Keycloak's container port.
- BFF Authorizer có thể đổi client token với Keycloak.
- Default production bootstrap creates no deterministic demo users and resets no user passwords.
- User chỉ demo, khi được bật rõ ràng, được đồng bộ vào MongoDB `qrtable_auth`, không phải database legacy `qrtable`.

Ở phần production live của bước này, `[HUMAN]` tạo và verify administrator có tên vĩnh viễn, gỡ administrator bootstrap tạm, và ghi `HUMAN-GATE-08`. Agent thực hiện mọi kiểm tra issuer, client, role và login-flow có thể verify bằng máy.

### Task 11: Cấu hình tích hợp SePay production

**Ownership:** `[SHARED]`

SePay là phụ thuộc production, không chỉ chi tiết biến env. Deploy chưa sẵn sàng cho đến khi cấu hình dashboard/API SePay khớp route công khai của QRTable và code path đang dùng.

Trách nhiệm human:

- `[HUMAN]` Đăng ký tài khoản, verification/KYC, điều khoản, liên kết ngân hàng, phê duyệt OAuth application, cấu hình webhook dashboard, và mọi chuyển khoản thật.
- `[AGENT]` Verify source, implement route, preflight, negative test, kiểm tra idempotency/audit, và bằng chứng redact.
- Hoàn thành `HUMAN-GATE-09` ở mục 4.11 trước khi đánh dấu task này production-ready.

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

- [ ] Bước 1: Chọn bộ route SePay live `[SHARED]`

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

- [ ] Bước 2: Cấu hình webhook subscription platform `[HUMAN]`

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

- [ ] Bước 3: Cấu hình tenant OAuth Connect `[SHARED]`

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

- [ ] Bước 4: Verify bề mặt API webhook SePay với tài khoản thật `[SHARED]`

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

- [ ] Bước 5: Định nghĩa verify live an toàn `[SHARED]`

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

**Ownership:** `[AGENT]`

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

- [ ] Bước 2: Define the production network contract

`docker-compose.monitoring.prod.yaml` phải attach:

| Service    | Mạng                                         | Lý do                                        |
| ---------- | -------------------------------------------- | -------------------------------------------- |
| Grafana    | monitoring network + `qrtable-edge`          | private data sources plus Caddy reachability |
| Prometheus | monitoring network + `qrtable-app`           | scrape backend service names                 |
| Tempo      | monitoring network + `qrtable-app`           | receive OTLP from app containers             |
| Loki       | monitoring network                           | internal log store                           |
| Promtail   | monitoring network plus Docker socket access | ship labeled container logs                  |

Production override phải thay giả định local `qrtable-nw`/`host.docker.internal` bằng external network rõ ràng. Verify bằng `docker network inspect qrtable-edge qrtable-app`.

- [ ] Bước 3: Keep monitoring stores private

Quy tắc production:

- Không publish cổng Loki, Prometheus hoặc Tempo.
- Chỉ publish Grafana qua reverse proxy với HTTPS và basic auth.
- Dùng Docker label Promtail từ app container: `app=bff`, `app=order`, v.v.

- [ ] Bước 4: Verify Grafana

Chạy:

```bash
./tools/deploy/phase7-compose-validate.sh \
  -f docker-compose.monitoring.yaml \
  -f docker-compose.monitoring.prod.yaml
```

Kỳ vọng: compose production không có port công khai `3001`, `3100`, `9090`, `3200` hay `4318`; Grafana chỉ reachable qua Caddy; Prometheus resolve được backend service; app container resolve được `tempo`.

### Task 13: Cấp phát DigitalOcean

**Ownership:** `[SHARED]`

**Files:**

- Tạo: `docs/guides/phase-7-digitalocean-deployment.md`

Task này vận hành hóa `HUMAN-GATE-01`, `HUMAN-GATE-03`, `HUMAN-GATE-04`, và `HUMAN-GATE-05`. `HUMAN-GATE-02` thuộc cấu hình GitHub trong Task 17. Implementation guide phải gồm hướng dẫn web-console, trường bằng chứng, và quy tắc xử lý secret từ mục 4 — không chỉ lệnh shell.

- [ ] Bước 1: Tạo bảo mật tài khoản, Project, và registry `[HUMAN]`

Trong control panel DigitalOcean:

- Xác nhận owner email, 2FA/passkey, tài liệu recovery, team, và billing.
- Tạo/chọn Project `qrtable-production`.
- Tạo Container Registry cuối cùng ở region đã chọn và ghi tên/tier immutable.
- Tạo API token scope hẹp dùng cho image-release workflow.
- Hoàn thành `HUMAN-GATE-01` và `HUMAN-GATE-03`.

- [ ] Bước 2: Tạo SSH key, Reserved IP, Droplet, và firewall `[HUMAN]`

Dùng:

- Public key Ed25519 admin và deploy tương lai riêng; không đăng nhập bằng mật khẩu.
- Ubuntu 24.04 LTS hoặc Ubuntu LTS được DO hỗ trợ hiện tại.
- Region `sgp1` nếu có.
- Kích thước pilot khuyến nghị 4 vCPU / 8 GiB.
- DigitalOcean Reserved IP làm DNS target ổn định.
- Cloud Firewall đã gắn.
- Enhanced monitoring và backups bật trước demo công khai đầu tiên.
- Resource tags `qrtable`, `production`, và `phase7`.

Cho phép:

```text
22/tcp from your current IP only
80/tcp from 0.0.0.0/0 and ::/0
443/tcp from 0.0.0.0/0 and ::/0
```

Từ chối truy cập công khai tới:

```text
3000, 3001, 3300-3308, 3201-3208, 5432, 6379, 27017, 9092, 9090, 3100, 3200, 4318
```

Không mở rộng SSH cho mọi nguồn vì GitHub-hosted runner. Dùng baseline deploy do operator điều khiển từ mục 4.7 cho đến khi kênh điều khiển tự động bảo mật được chọn.

Hoàn thành `HUMAN-GATE-04` sau khi verify đăng nhập SSH, gắn Reserved IP, firewall rules, backups, và monitoring.

- [ ] Bước 3: Harden host và cài Docker Engine `[SHARED]`

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

Ngoài ra:

- tạo operator `qrtable-deploy` non-root;
- giữ SSH root trực tiếp disabled;
- bật unattended security updates;
- cấu hình đồng bộ thời gian;
- ghi baseline disk/memory;
- verify không có port không mong muốn đang listen công khai.

- [ ] Bước 4: Xác thực Droplet cho pull DOCR read-only `[SHARED]`

Cài `doctl` hiện tại, rồi tạo Docker credential mà không ghi DigitalOcean API token nguồn vào repository hay log deploy:

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

Registry credential sinh ra là read-only. Ghi tài liệu revoke/rotate, bảo vệ Docker config, và ưu tiên credential hạn hữu hạn với gia hạn tự động khi quy trình deploy trưởng thành.

- [ ] Bước 5: Cấu hình DNS và điều kiện TLS công khai `[HUMAN]`

Tạo bản ghi A trỏ tới Reserved IP:

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

Mỗi lệnh trả về Reserved IP từ ít nhất hai public resolver. Review bản ghi CAA và giữ HTTP proxy của DNS provider tắt cho đến khi Caddy cấp mọi certificate. Chỉ hoàn thành `HUMAN-GATE-05` sau verify TLS công khai — không chỉ DNS propagation.

### Task 14: Deploy stack

**Ownership:** `[SHARED]`

**Handoff:** Agent chuẩn bị và chạy quy trình deploy. Human cung cấp giá trị bên ngoài được bảo vệ, phê duyệt target/cửa sổ, và thực hiện kiểm tra permanent-admin/trình duyệt tại các gate đã đặt tên.

**Files:**

- Tạo: `tools/deploy/phase7-preflight.sh`
- Tạo: `tools/deploy/phase7-migrate.sh`
- Tạo: `tools/deploy/phase7-seed-demo.sh`
- Tạo: `tools/deploy/phase7-smoke.sh`

- [ ] Bước 1: Copy repository hoặc release bundle vào `/opt/qrtable` `[AGENT]`

Pilot đầu tiên khuyến nghị:

```bash
: "${QRTABLE_REPOSITORY_URL:?Set this to the private QRTable git URL before cloning}"
sudo mkdir -p /opt/qrtable
sudo chown "$USER:$USER" /opt/qrtable
git clone "$QRTABLE_REPOSITORY_URL" /opt/qrtable
```

Nếu sau này dùng deploy chỉ image, thay bằng release bundle chứa file compose/proxy/monitoring/deploy-script. Giữ `/opt/qrtable/.env.production` thuộc server và nằm ngoài release bundle.

- [ ] Bước 2: Đặt env riêng trên server `[SHARED]`

```bash
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production
```

Sau đó sửa `/opt/qrtable/.env.production` trên server và thay giá trị đã sinh bằng `openssl rand`.

Human nhập secret Cloudinary, SePay, ngân hàng/provider, và secret bên ngoài khác trực tiếp trên server. Agent chỉ verify presence, format, permissions, và fingerprint redact. Hoàn thành `HUMAN-GATE-06` và `HUMAN-GATE-07`.

Render và kiểm tra quyền file runtime có phạm vi:

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

- [ ] Bước 3: Start infra và chờ datastore healthy `[AGENT]`

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

- [ ] Bước 4: Chạy migration gate và ownership gate `[AGENT]`

```bash
docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.migrations.yaml \
  pull
./tools/deploy/phase7-migrate.sh
```

Kỳ vọng: mọi migration service đã apply và database ownership verification pass trước khi thay app container.

- [ ] Bước 5: Bootstrap identity và dữ liệu demo tùy chọn `[SHARED]`

```bash
./tools/deploy/phase7-keycloak-bootstrap.sh
```

Chỉ với deploy demo luận văn:

```bash
DEPLOYMENT_PROFILE=demo ./tools/deploy/phase7-seed-demo.sh --yes
```

Sau bootstrap, human phải tạo và verify administrator Keycloak vĩnh viễn có tên, gỡ temporary bootstrap administrator, và hoàn thành kiểm tra login/role trong `HUMAN-GATE-08`.

- [ ] Bước 6: Start lớp monitoring, app và proxy `[AGENT]`

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml up -d
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml up -d
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml up -d
```

- [ ] Bước 7: Verify service đang chạy `[AGENT]`

```bash
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.infra.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.app.yaml ps
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.proxy.yaml ps
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml ps
```

Kỳ vọng:

- Service infra healthy hoặc đang chạy.
- Exit status script migration và bản ghi lịch sử deploy cho thấy cả ba lệnh migration/ownership thành công. Container cố ý bị xóa bởi `run --rm`, nên không dùng `docker compose ps -a` làm bằng chứng.
- App container đang chạy.
- Caddy đã lấy certificate và phục vụ HTTPS.
- `docker network inspect` xác nhận Caddy chia sẻ `qrtable-edge` với mọi target reverse proxy và contract mạng monitoring/app khớp Task 12.

### Task 15: Chạy smoke test và verify demo

**Ownership:** `[AGENT]`

**Files:**

- Tạo: `tools/deploy/phase7-smoke.sh`
- Tạo: `tools/deploy/phase7-e2e.sh`
- Cập nhật: `docs/guides/phase-7-digitalocean-deployment.md`

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
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml \
  exec prometheus wget -qO- http://bff:3300/api/v1/metrics
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml \
  exec prometheus wget -qO- http://order:3301/api/v1/metrics
```

Kỳ vọng: Prometheus text exposition contains `qrtable_http_requests_total`.

- [ ] Bước 3: Smoke E2E trình duyệt

Chỉ dùng bộ E2E hiện có cho deploy demo đã seed rõ ràng. Test không đọc `BASE_URL`, `CUSTOMER_PWA_URL` hay `BFF_URL` generic; tạo `tools/deploy/phase7-e2e.sh` validate `DEPLOYMENT_PROFILE=demo` và map đúng biến mà spec hiện tại tiêu thụ:

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

Wrapper phải yêu cầu credential demo qua biến môi trường thay vì im lặng dựa vào mật khẩu deterministic đã commit. Sau đó chạy `pnpm e2e:demo`. Kỳ vọng: test demo được chọn pass, không fallback localhost và không in credential production ra log.

- [ ] Bước 4: Smoke route SePay

Verify route công khai đã đăng ký:

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

Kỳ vọng: BFF trả lỗi xác thực, chứng minh route công khai reachable mà không chấp nhận payload không ký.

### Task 16: Backup, rollback và vận hành

**Ownership:** `[SHARED]`

**Handoff:** Agent implement tự động hóa backup, checksum, restore và rollback. Human bật tính năng provider trả phí, tạo storage target độc lập, phê duyệt quyền retention/xóa, và hoàn thành `HUMAN-GATE-11`.

**Files:**

- Tạo: `docs/guides/phase-7-digitalocean-deployment.md`
- Tạo: `tools/deploy/phase7-backup.sh`

- [ ] Bước 1: Bật backup/snapshot DigitalOcean `[HUMAN]`

Dùng Droplet backup cho phục hồi cấp host.

- [ ] Bước 2: Thêm script backup logic `[AGENT]`

Backup release là điểm phục hồi cross-service. Đưa deploy vào cửa sổ bảo trì ngắn hoặc quiesce write traffic trước backup; nếu không, database PostgreSQL và archive MongoDB hợp lệ riêng lẻ nhưng không phải snapshot phân tán atomic.

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

- [ ] Bước 3: Định nghĩa retention và phục hồi off-Droplet `[SHARED]`

- Human tạo Space riêng hoặc object-storage target độc lập và access key hạn chế riêng theo mục 4.12.
- Mã hóa và copy mỗi backup hoàn tất sang DigitalOcean Space riêng hoặc target off-Droplet khác.
- Định nghĩa retention, ví dụ daily 7, weekly 4, monthly 3.
- Verify `SHA256SUMS` sau upload.
- Thực hiện ít nhất một diễn tập restore vào database cô lập và ghi thời lượng/bằng chứng.
- Không coi backup chỉ lưu trên cùng Droplet là bản recovery duy nhất.
- Chỉ hoàn thành `HUMAN-GATE-11` sau khi upload mã hóa, download, checksum, và restore PostgreSQL/MongoDB cô lập đều thành công.

- [ ] Bước 4: Define rollback `[AGENT]`

Rollback image tag:

```bash
IMAGE_TAG=previous-good docker compose \
  --env-file /opt/qrtable/.env.production \
  -f docker-compose.app.yaml \
  up -d
```

Rollback dữ liệu infra:

- Dừng lớp app trước.
- Khôi phục Postgres/Mongo từ backup logic hoặc snapshot Droplet.
- Không chạy `migration:revert` tự động. Revert migration phải được review rõ với image đích và timestamp backup.
- Ưu tiên migration expand/contract tương thích ngược để image app trước vẫn chạy được trong cửa sổ rollback.
- Start lại lớp app.
- Chạy lại smoke check.

### Task 17: Thêm pipeline CI/CD và quy trình release

**Ownership:** `[SHARED]`

**Handoff:** Agent implement workflow và script. Human cấu hình bảo vệ/secret trên web console GitHub và phê duyệt deploy production đầu tiên qua `HUMAN-GATE-02` và `HUMAN-GATE-10`.

CI/CD là phần của Phase 7, nhưng phải coi là mặt phẳng điều khiển deploy riêng, không giấu trong lệnh server thủ công.

**Trạng thái repo hiện tại:**

- Đã có: `.github/workflows/ci.yml`
- Trigger CI: `push` lên `main` và `pull_request`
- Lệnh CI: `pnpm exec nx run-many -t lint test build`
- Đã có: TypeORM DataSource per-service, migration ban đầu, lệnh migration và database ownership verification.
- Thiếu: workflow build Docker image
- Thiếu: workflow push registry
- Thiếu: entrypoint deploy production do operator điều khiển và workflow deploy production tùy chọn
- Thiếu: workflow rollback theo tag
- Thiếu: image/job migration production và deploy gate

**Files:**

- Sửa: `.github/workflows/ci.yml`
- Tạo: `.github/workflows/release-images.yml`
- Tạo sau khi phê duyệt secure-channel: `.github/workflows/deploy-production.yml`
- Tạo sau khi phê duyệt secure-channel: `.github/workflows/rollback-production.yml`
- Tạo: `tools/deploy/phase7-build-images.sh`
- Tạo: `tools/deploy/phase7-migrate.sh`
- Tạo: `tools/deploy/phase7-remote-deploy.sh`
- Tạo: `tools/deploy/phase7-remote-rollback.sh`
- Tạo: `tools/deploy/phase7-preflight.sh`
- Tạo: `tools/deploy/phase7-compose-validate.sh`
- Tạo: `tools/deploy/phase7-smoke.sh`
- Sửa: `docs/guides/phase-7-digitalocean-deployment.md`

- [ ] Bước 1: Giữ CI làm quality gate PR `[AGENT]`

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

- [ ] Bước 2: Thêm workflow release-images `[SHARED]`

Trigger:

- `workflow_dispatch`
- `workflow_run` cho CI workflow hiện có, giới hạn run thành công trên `main`

Quyền:

- `contents: read`
- không có quyền ghi repository

Input:

- `image_tag` tùy chọn; tính `IMAGE_TAG="${{ inputs.image_tag || github.event.workflow_run.head_sha || github.sha }}"`
- `push_latest` mặc định `false`

Secret:

- `DIGITALOCEAN_ACCESS_TOKEN`

`[AGENT]` implement và verify tĩnh workflow. `[HUMAN]` tạo token có phạm vi hẹp và nhập vào GitHub mà không tiết lộ giá trị. Lần push registry live đầu tiên của workflow chờ handoff đó.

Trách nhiệm workflow:

1. Checkout repository (clone repo).
2. Cài Node.js 22.22.3 và pnpm 9.8.0, khớp toolchain build Docker.
3. Cài dependency với frozen lockfile.
4. Chạy kiểm tra build CI.
5. Đăng nhập DigitalOcean Container Registry.
6. Build mọi image Phase 7 cho `linux/amd64` với Buildx và push tag immutable.
7. Sinh SBOM và fail theo ngưỡng lỗ hổng critical đã thống nhất.
8. Emit và giữ tóm tắt image digest.

Tên image kỳ vọng:

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

Một repository là chủ đích: DOCR Starter hỗ trợ một repository, trong khi repository riêng per-service cần tier cao hơn trước khi xét dung lượng.

Quy tắc build quan trọng:

- Giá trị frontend công khai có thể là build arg: `NEXT_PUBLIC_*`, `VITE_*`.
- Secret riêng không bao giờ là Docker build arg.
- Secret production nằm trong `/opt/qrtable/.env.production` hoặc secret manager sau này.
- Release chưa hoàn tất trừ khi cả mười hai tag và digest có mặt.
- Workflow phải từ chối ghi đè tag release immutable hiện có; `latest` tùy chọn và không bao giờ dùng bởi compose production.

- [ ] Bước 3: Thêm bảo vệ deployment environment `[HUMAN]`

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

`[HUMAN]` Cấu hình phần này trong web console GitHub theo mục 4.5. Required reviewers là kiểm soát cứng chỉ khi visibility repository và gói GitHub thực sự hỗ trợ. Khi không có, giữ gate deploy do operator điều khiển và ghi người phê duyệt vào `/opt/qrtable/releases/history.log`.

- [ ] Bước 4: Thêm entrypoint deploy production do operator điều khiển `[SHARED]`

Pilot Phase 7 đầu tiên không được SSH từ GitHub-hosted runner khi Cloud Firewall chỉ cho phép SSH từ IP operator.

Luồng baseline:

```text
CI green
  -> release-images pushes immutable image tag
  -> human chọn tag/cửa sổ và xác nhận backup/rollback
  -> operator kết nối từ trusted workstation
  -> preflight remote
  -> pull immutable migration và app images
  -> backup
  -> chạy migration per-service
  -> verify migration state và database ownership
  -> docker compose up -d lớp app
  -> smoke test
  -> ghi tag đã deploy
```

Dạng lệnh operator:

```bash
ssh -o IdentitiesOnly=yes "$PRODUCTION_SSH_USER@$PRODUCTION_SSH_HOST" \
  "cd /opt/qrtable && IMAGE_TAG='${IMAGE_TAG}' ./tools/deploy/phase7-remote-deploy.sh"
```

GitHub có thể cung cấp job release/audit `workflow_dispatch` validate tag và in lệnh operator redact chính xác, nhưng không được khởi tạo SSH production cho đến khi kênh điều khiển bảo mật ở mục 4.7 được chọn và test.

Script deploy remote phải:

- Từ chối chạy nếu thiếu `/opt/qrtable/.env.production` hoặc world-readable.
- Từ chối deploy nếu `IMAGE_TAG` rỗng.
- Verify Docker có thể xác thực và pull từ repository DOCR riêng.
- Render file env runtime có phạm vi và từ chối container cấu hình master `.env.production` làm `env_file` cấp service.
- Chạy `phase7-compose-validate.sh` cho lớp infra, migrations, monitoring, app và proxy.
- Truyền `--env-file /opt/qrtable/.env.production` cho mọi lệnh Compose bên dưới và fail nếu `config --environment` capture an toàn cho thấy biến release chưa resolve hoặc rỗng.
- Pull image theo tag immutable yêu cầu.
- Chạy `tools/deploy/phase7-migrate.sh` và dừng ngay khi migration hoặc ownership fail.
- Start app container không rebuild trên server.
- Chạy health check sau khi thay container.
- Ghi tag thành công vào `/opt/qrtable/releases/current`.

`[AGENT]` chuẩn bị/chạy lệnh và kiểm tra đã audit. `[HUMAN]` chọn tag/cửa sổ immutable, xác nhận backup/rollback sẵn sàng, phê duyệt deploy, và hoàn thành `HUMAN-GATE-10`.

- [ ] Bước 4A: Tùy chọn bật `deploy-production.yml` sau phê duyệt secure-channel `[SHARED]`

Chỉ sau khi human ghi một trong các kênh điều khiển không-baseline ở mục 4.7, workflow mới nhận:

- `PRODUCTION_SSH_HOST`
- `PRODUCTION_SSH_USER`
- `PRODUCTION_SSH_KEY`
- `PRODUCTION_SSH_PORT`
- `PRODUCTION_SSH_KNOWN_HOSTS`

Workflow phải:

- dùng environment `production` được bảo vệ;
- verify server host key với `PRODUCTION_SSH_KNOWN_HOSTS`;
- không bao giờ tắt strict host-key checking;
- dùng deploy key non-root riêng;
- hạn chế key/tài khoản server chỉ cho thao tác deploy;
- tránh chạy trên code pull-request;
- gỡ mọi firewall rule tạm trong bước cleanup vô điều kiện;
- giữ artifact audit redact.

- [ ] Bước 5: Thêm gate schema/migration `[AGENT]`

Trước deploy production, quy trình deploy phải:

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

- [ ] Bước 6: Thêm smoke test vào quy trình deploy `[AGENT]`

Smoke test phải chạy từ máy ngoài Droplet sau deploy vì DNS công khai, TLS, reverse proxy và CORS phải verify bên ngoài. Với baseline, chạy từ trusted operator workstation. Sau khi bật workflow SSH bảo mật, kiểm tra công khai cũng có thể chạy từ GitHub Actions.

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

Kiểm tra CORS phải gửi origin được phép và origin bị từ chối tới BFF, và verify handshake Socket.IO theo cùng allowlist.

- [ ] Bước 7: Thêm rollback do operator và workflow rollback tùy chọn `[SHARED]`

Input baseline:

- `rollback_tag` bắt buộc;
- `restore_data=false` trừ khi human phê duyệt rõ timestamp backup chính xác và tác động tương thích.

Luồng rollback:

```text
human rollback approval
  -> preflight remote
  -> backup tùy chọn
  -> set IMAGE_TAG to rollback_tag
  -> docker compose pull
  -> docker compose up -d lớp app
  -> smoke test
  -> ghi sự kiện rollback
```

Rollback không được tự khôi phục database hoặc chạy `migration:revert` trừ khi `restore_data=true` và operator xác nhận timestamp backup chính xác cùng tác động tương thích. Rollback app và rollback dữ liệu là thao tác riêng.

`[AGENT]` implement và thực thi tự động hóa rollback app. `[HUMAN]` phê duyệt tag rollback và phê duyệt riêng mọi restore dữ liệu với timestamp backup chính xác.

Workflow rollback GitHub tùy chọn tuân cùng yêu cầu secure-channel như `deploy-production.yml`.

- [ ] Bước 8: Thêm audit trail deploy `[AGENT]`

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

- [ ] Bước 9: Quyết định khi nào tự động deploy khi merge `[HUMAN]`

Chính sách Phase 7 khuyến nghị:

| Giai đoạn         | Release image            | Deploy production                 |
| ----------------- | ------------------------ | --------------------------------- |
| Pilot đầu         | Manual workflow dispatch | Operator workstation có phê duyệt |
| Demo luận văn ổn  | Push main build image    | Operator workstation có phê duyệt |
| Production trưởng | Push main build image    | Tùy chọn auto-deploy staging      |

Không auto-deploy production mỗi lần merge cho đến khi migration, backup, rollback và smoke test đã được chứng minh.

### Task 18: Cập nhật tài liệu canonical sau implement

**Ownership:** `[AGENT]`

**Files:**

- Sửa: `docs/phases/phase-5-7-finalization.md`
- Sửa: `docs/phases/phase-5-7-finalization.vi.md`
- Sửa: `docs/technical-architecture.md`
- Sửa: `docs/DOC-CODE-ANCHORS.md`
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
- Hoàn thành human-gate và bằng chứng tài nguyên nền tảng bên ngoài đã redact.
- Kênh điều khiển SSH/deploy production đã chọn.
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

## 7. Tiêu chí nghiệm thu production

Phase 7 chỉ được chấp nhận khi mọi mục dưới đây đúng:

- [ ] `HUMAN-GATE-01` đến `HUMAN-GATE-11` hoàn thành với bằng chứng có ngày, đã redact; không giả định tài khoản, billing, DNS, secret, ngân hàng, hoặc phụ thuộc backup bên ngoài.
- [ ] GitHub ruleset `main` và production environment đã cấu hình; bản ghi nêu trung thực required reviewers có được enforce bởi gói repository hiện tại hay không.
- [ ] DigitalOcean Project, registry, Reserved IP, Droplet, Cloud Firewall, backups, và monitoring đã cấu hình và liên kết đúng tài nguyên production.
- [ ] SSH vẫn hạn chế theo kênh điều khiển đã phê duyệt; không mở globally cho GitHub-hosted runner.
- [ ] Mọi checkout repository Droplet-to-GitHub dùng deploy key read-only riêng; production không tái sử dụng key GitHub cá nhân.
- [ ] Production dùng credential sinh mới, không phải giá trị `.env` local đã điền hoặc default development deterministic; phát hiện secret-history scan đã remediation.
- [ ] Credential Cloudinary production cấu hình ngoài git và smoke upload/read/delete pass mà không expose API secret.
- [ ] Mọi lệnh Compose production dùng `--env-file /opt/qrtable/.env.production`; helper validate được bảo vệ không tìm thấy biến release chưa resolve và không emit giá trị secret.
- [ ] Master env production không inject nguyên khối vào container; file env per-service được allowlist, mode `0600`, và chỉ chứa giá trị bắt buộc.
- [ ] `docker compose` có thể start infra, chạy migration, và start monitoring, app, proxy từ checkout server sạch.
- [ ] Tám backend container bind listener TCP/gRPC tới `0.0.0.0` khi áp dụng, và mọi kết nối TCP/gRPC inter-service bắt buộc thành công theo tên service Docker.
- [ ] Caddy chia sẻ `qrtable-edge` với BFF, Management App, Customer PWA, Keycloak và Grafana; Prometheus/Tempo chia sẻ mạng app bắt buộc.
- [ ] Gate readiness PostgreSQL, MongoDB, Redis, Kafka và Keycloak pass trước migration/identity bootstrap/thay app.
- [ ] Smoke producer/consumer KafkaJS pass với image Kafka `4.3.0` đã pin.
- [ ] Env production định nghĩa bốn tên database PostgreSQL riêng và MongoDB `qrtable_auth`, với shared fallback tắt.
- [ ] Image migration one-shot apply mọi migration service trước boot app.
- [ ] `pnpm db:migration:show` báo mọi migration kỳ vọng đã apply.
- [ ] `pnpm db:verify:ownership` pass trên cả bốn database PostgreSQL service.
- [ ] User-Access kết nối MongoDB `qrtable_auth`; bootstrap Keycloak production bình thường không tạo user demo và không reset mật khẩu người dùng.
- [ ] Client Keycloak được cập nhật idempotent với redirect URI, web origin, secret và public issuer production chính xác.
- [ ] HTTPS công khai hoạt động cho subdomain `api`, `app`, `qr`, `auth` và `grafana` được bảo vệ.
- [ ] Chỉ 80/443 và SSH hạn chế là công khai.
- [ ] CORS BFF HTTP và Socket.IO chỉ cho phép origin production Management App và Customer PWA.
- [ ] BFF `/api/v1/health/live` và `/api/v1/health/ready` pass.
- [ ] Đăng nhập Management App hoạt động với Keycloak qua `auth.qrtable.vodinhquan.dev`.
- [ ] Luồng QR khách hoạt động qua `qr.qrtable.vodinhquan.dev`.
- [ ] Luồng POS/KDS hoạt động qua `app.qrtable.vodinhquan.dev`.
- [ ] Route webhook payment reachable công khai qua HTTPS và từ chối auth không hợp lệ.
- [ ] Route webhook platform SePay `QRSUB` đăng ký đúng URL công khai và chế độ auth secret-key.
- [ ] Luồng OAuth Connect tenant SePay `QRTBL` có thể tạo hoặc verify URL webhook tenant có slug.
- [ ] Mismatch bề mặt API SePay (`/api/v1/webhooks` vs `/v1/webhook`, `Api_Key` vs `SECRET_KEY`) được giải quyết có bằng chứng từ tài khoản SePay thật trước khi dùng live.
- [ ] Grafana hiển thị log, metrics và trace từ app container thật.
- [ ] Seed demo tùy chọn non-destructive, profile-gated, và khôi phục dataset demo luận văn mà không gọi `dev:reseed`.
- [ ] E2E production dùng đúng biến `STEPP27_*`, `PHASE3_*` và `PHASE5_*`, không fallback localhost hay mật khẩu demo đã commit.
- [ ] Quy trình backup và rollback được ghi tài liệu và test ít nhất một lần, gồm verify checksum và diễn tập restore off-Droplet.
- [ ] CI vẫn xanh cho `lint`, `test` và `build`.
- [ ] Workflow release build cả mười hai artifact `linux/amd64` vào một repository DOCR, ghi digest/SBOM và pass gate lỗ hổng.
- [ ] Deploy production do operator điều khiển có thể deploy tag image immutable đã chọn với phê duyệt rõ ràng.
- [ ] Nếu workflow deploy/rollback production GitHub được bật, secure control channel, host-key verification, firewall behavior, key riêng, và environment approval được ghi tài liệu và test.
- [ ] Rollback do operator có thể redeploy tag image thành công trước đó mà không tự revert/restore dữ liệu.
- [ ] Tài liệu canonical được cập nhật sau implement.

## 8. Ghi chú chi phí và mở rộng

Dùng deploy nhỏ nhất phù hợp sản phẩm hiện tại:

- Pilot: một Droplet 4 vCPU / 8 GiB RAM, self-host infra, bật backup.
- Smoke ngân sách thấp: một Droplet 2 vCPU / 4 GiB RAM, giảm hoặc tắt monitoring ngoài cửa sổ demo.
- Hardening: managed PostgreSQL và Valkey khi an toàn dữ liệu và vận hành quan trọng hơn chi phí tháng.
- Tránh managed Kafka cho luận văn/pilot trừ khi chủ đích phân bổ ngân sách; managed Kafka DigitalOcean là cluster managed đa node.

Sự kiện sản phẩm DigitalOcean đã verify lại ngày 2026-06-07:

- Droplet từ USD 4/tháng.
- Managed database từ USD 15/tháng.
- Managed PostgreSQL 1 GiB khoảng USD 15,15/tháng.
- Managed Valkey 1 GiB khoảng USD 15/tháng.
- Load Balancer từ USD 12/tháng.
- Droplet backup tính theo phần trăm chi phí Droplet.

## 9. Rủi ro và biện pháp giảm thiểu

| Rủi ro                                        | Tác động                                                            | Biện pháp giảm thiểu                                                                         |
| --------------------------------------------- | ------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| Bỏ qua migration job hoặc chạy sau app        | Image mới boot với schema không tương thích hoặc thiếu              | Chạy image migration immutable và ownership gate trước khi thay app container                |
| Bật shared database fallback                  | Service có thể reconnect database legacy hỗn hợp                    | Yêu cầu tên env riêng và `DATABASE_SHARED_FALLBACK_ENABLED=false` trong preflight production |
| `dev:reseed` run on production                | Destructive data loss and identity/cache reset                      | Exclude it from deploy scripts; use a non-destructive, profile-gated demo seed               |
| Nhầm `env_file` Compose với interpolation     | Image/credential render rỗng hoặc default cũ                        | Truyền `--env-file` mọi nơi và inspect qua helper validate được bảo vệ                       |
| Validate Compose in ra log CI                 | Secret đã interpolate rò vào bản ghi build/deploy                   | Capture `config`/`config --environment` trong file tạm 0600 và chỉ emit kết quả redact       |
| Listener TCP/gRPC vẫn trên localhost          | HTTP health pass trong khi inter-service call fail                  | Set listener host thành `0.0.0.0`; test toàn bộ ma trận host                                 |
| Lệch mạng reverse-proxy/monitoring            | Caddy không resolve Keycloak/Grafana hoặc app không reach Tempo     | Enforce và inspect contract mạng dùng chung                                                  |
| Kafka `localhost` advertised listener         | App containers cannot connect                                       | Use `PLAINTEXT://kafka:9092` in production compose                                           |
| Tag image Kafka không khả dụng                | Deploy infra không pull hoặc start Kafka                            | Pin image JVM Apache Kafka chính thức đã xác minh và test health command                     |
| Env công khai Vite là build-time              | Customer PWA trỏ sai API sau khi tái dùng image                     | Build image với `VITE_BFF_URL` production, hoặc runtime config sau                           |
| Next public env is partly build-time          | Management App client bundle points to wrong API                    | Build with production `NEXT_PUBLIC_*` and also provide runtime env                           |
| Keycloak `start-dev` hoặc mount theme mutable | IAM production không an toàn/không tái lập                          | Dùng image tùy chỉnh optimized, hostname ngoài và Keycloak backed DB                         |
| Bootstrap production reset mật khẩu demo      | Credential đã biết thành hợp lệ trên deploy công khai               | Tách bootstrap realm/client khỏi bootstrap user demo được gate rõ ràng                       |
| Public Grafana                                | Observability leaks tenant or system data                           | Put behind HTTPS, basic auth, firewall/IP restriction                                        |
| CORS `*`                                      | Client trình duyệt từ origin không mong muốn gọi BFF                | Enforce một allowlist production cho HTTP và Socket.IO trước production công khai            |
| Secrets in compose                            | Credential leak                                                     | Keep values out of YAML; protect master/scoped env files with 0600 permissions               |
| Master env inject vào mọi service             | Một container bị xâm phạm lộ credential không liên quan             | Render file env per-service allowlist và từ chối inject master-env trực tiếp                 |
| External account/manual gate assumed complete | Deploy bị kẹt hoặc dùng sai tài khoản/tài nguyên                    | Dùng `HUMAN-GATE-01` đến `11` với resource ID và bằng chứng redact                           |
| GitHub runner cannot pass restricted SSH rule | Deploy tự động fail hoặc operator mở SSH globally                   | Giữ deploy đầu do operator; phê duyệt secure control channel trước workflow SSH              |
| GitHub plan lacks reviewer protection         | UI gợi ý approval nhưng không enforce                               | Ghi khả năng gói và giữ phê duyệt operator cho đến khi có bảo vệ hỗ trợ                      |
| DNS/CDN/CAA misconfiguration                  | Caddy không thể cấp hoặc gia hạn certificate                        | Dùng Reserved IP, DNS-only khi cấp, kiểm tra public resolver, và review CAA                  |
| External secret pasted into chat/log          | Tích hợp provider hoặc ngân hàng dài hạn bị xâm phạm                | Human nhập secret trực tiếp; bằng chứng chỉ gồm name/fingerprint/bốn ký tự cuối              |
| Development credential reused in production   | Giá trị đã biết hoặc từng lộ kiểm soát production                   | Sinh credential production mới, scan history, rotate phát hiện, từ chối default dev          |
| Private repository checkout uses personal key | Xâm phạm tài khoản cá nhân hoặc truy cập production không kiểm soát | Dùng deploy key read-only riêng hoặc chuyển sang release bundle chỉ image                    |
| Cloudinary credentials missing or exposed     | Upload production fail hoặc tài khoản media bị xâm phạm             | Cấu hình môi trường sản phẩm thủ công và chạy smoke upload/read/delete không log secret      |
| Single Droplet failure                        | Full outage                                                         | Enable backups/snapshots; later move DB to managed service                                   |
| Backup chỉ tồn tại trên Droplet               | Mất host cũng phá hủy dữ liệu phục hồi                              | Mã hóa/copy off-Droplet, checksum, retention và diễn tập restore                             |
| SePay API surface mismatch                    | OAuth webhook registration fails after deploy                       | Verify current SePay account API shape before live production                                |
| Wrong SePay webhook route                     | Tenant bill or subscription invoice never settles                   | Register `QRTBL` tenant route and `QRSUB` platform route separately                          |
| Live payment test mutates external state      | Real money movement or incorrect subscription activation            | Keep CI negative-only; perform low-value manual live verification with audit logs            |
| Backup exists but restore was never rehearsed | Recovery fail trong sự cố thực tế                                   | Hoàn thành download offsite mã hóa, checksum, và restore cô lập trước nghiệm thu             |

## 10. Cải tiến theo dõi hữu ích

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
- Đồng bộ bản tiếng Việt với revision human-operator runbook EN canonical trong cùng task.
- Giữ service boundary và ownership deploy QRTable trong plan.
- Đối chiếu Phase 7 với cấu hình database-per-service, migration và ownership verification đã implement.
- Sửa Compose interpolation, đặt tên image/tag, listener/client host service và Docker network cross-layer.
- Thêm validate Compose an toàn secret, không stream môi trường đã resolve ra log.
- Thay tag Kafka không khả dụng và luồng theme Keycloak mutable bằng kế hoạch image tái lập.
- Chuyển CORS, identity bootstrap, biến E2E chính xác và restore off-Droplet thành gate production.
- Coi secret là giá trị runtime-only và tránh commit credential thật.
- Giới hạn phân phối secret runtime qua allowlist env per-service được sinh.
- Đánh dấu blocker production thay vì che sau bước deploy lạc quan.
- Đưa CI/CD vào task Phase 7 hạng nhất với gate release, deploy, rollback, phê duyệt và smoke test.
- Thêm verify tài liệu provider SePay và đặt thiết lập webhook/OAuth live làm gate deploy production.
- Thêm ma trận trách nhiệm đầy đủ, mười một human gate, quy trình web-console, hợp đồng bằng chứng redact, và checklist quan sát deploy đầu tiên.
- Giải quyết xung đột SSH hạn chế versus GitHub-hosted runner bằng cách đặt deploy trusted-workstation làm baseline Phase 7.
- Thêm bản đồ quyền sở hữu thực thi cho Task 1–18, đánh dấu mọi task là `[AGENT]` hoặc `[SHARED]`, và gán nhãn từng bước mixed-ownership tại điểm handoff thực tế.

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
- BLOCK005 [PATTERN] CORS BFF HTTP và Socket.IO phải ngừng dùng wildcard origin trước deploy công khai.
- BLOCK006 [ENV_LEAK] Bootstrap Keycloak production không được tạo/reset user demo deterministic.
- BLOCK007 [STRUCT] Contract host/network/interpolation Compose phải implement chính xác, nếu không container HTTP healthy vẫn fail traffic inter-service.
- BLOCK008 [ENV_LEAK] Master env production không được truyền nguyên khối cho mọi container.
- BLOCK009 [PATTERN] Tài khoản bên ngoài, DNS, provider secret, ủy quyền ngân hàng, và backup storage yêu cầu hoàn thành human gate đã ghi tài liệu.
- BLOCK010 [PATTERN] SSH GitHub-hosted runner phải vẫn disabled cho đến khi secure deployment control channel được chọn và test rõ ràng.
- BLOCK011 [ENV_LEAK] Credential development local đã điền và default development deterministic không được tái sử dụng trong production; credential bị ảnh hưởng cần audit và rotate.

### 💡 Đề xuất

- Bắt đầu Phase 7 với Dockerfile cộng image/job migration trước khi đụng DigitalOcean.
- Dùng subdomain cố định trước, chỉ thêm wildcard tenant routing khi source code cần.
- Coi managed PostgreSQL/Valkey là nâng cấp hardening đầu tiên sau pilot một Droplet.
