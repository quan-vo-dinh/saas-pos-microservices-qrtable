# Phase 7 - Kế hoạch triển khai Docker và DigitalOcean

> **Bản tiếng Việt** của
> [2026-06-06-phase-7-docker-digitalocean-deployment.md](2026-06-06-phase-7-docker-digitalocean-deployment.md)
>
> **Refactor:** 2026-06-07
>
> Đây là execution plan, không phải product specification canonical. Sau khi triển khai, hành vi cuối
> cùng phải được đồng bộ vào `docs/phases/phase-5-7-finalization.md`,
> `docs/technical-architecture.md` và deployment guide.

## 1. Mục tiêu và bối cảnh vận hành

Triển khai QRTable công khai trên một DigitalOcean Droplet để demo khóa luận và phục vụ mục đích sử
dụng giới hạn. Một developer phải có thể hiểu, kiểm soát và tự vận hành hệ thống.

Mục tiêu không phải enterprise platform. Tuy nhiên, các bảo vệ có rủi ro thực tế vẫn bắt buộc:

- Docker image và Compose có thể tái lập;
- HTTPS và host firewall;
- database, Redis, Kafka, internal service và observability port không public;
- production secrets nằm ngoài git;
- explicit environment mapping theo từng service;
- migrations chạy trước application;
- Keycloak bootstrap an toàn cho production;
- CORS BFF HTTP và Socket.IO dùng cùng allowlist;
- health check, logs và metrics có giá trị;
- public smoke path đã kiểm tra;
- backup và image rollback cơ bản.

Chỉ chấp nhận độ phức tạp khi nó giảm rủi ro hiện tại hoặc tạo bằng chứng có giá trị cho khóa luận.

## 2. Bằng chứng và trạng thái hiện tại

### 2.1 CodeGraph

CodeGraph được chạy trước khi đọc file trực tiếp.

- Index đã cập nhật.
- Phạm vi: 1.211 file, 15.593 node, 29.853 edge.
- CORS của Task 8 nằm trên runtime path thật của BFF.
- `createCorsOriginValidator` được dùng chung cho HTTP CORS và Redis-backed Socket.IO adapter.

### 2.2 Git

`main` khớp `origin/main`. Bảo toàn các thay đổi đã triển khai:

| Công việc                                                        | Commit    | Quyết định |
| ---------------------------------------------------------------- | --------- | ---------- |
| Prerequisite database-per-service, migrations, ownership tooling | `45a4480` | Giữ        |
| Task 1 build-context controls và Task 2 backend image            | `a6ce5b6` | Giữ        |
| Task 3 Management App image và Task 4 Customer PWA image         | `2678f58` | Giữ        |

Không triển khai lại, revert hoặc viết lại Tasks 1-4 nếu không có defect cụ thể.

Task 8 đang chưa commit. Phần được giữ là BFF CORS implementation/tests và production env template.
Scoped-env renderer, Compose validator lớn, shell test suites, CORS fake-transport harness và
acceptance matrix riêng đã được loại bỏ vì chúng tạo policy trùng lặp trước khi production Compose
tồn tại.

### 2.3 Tài liệu đã đọc

- `AGENTS.md`
- `docs/README.md`
- `docs/business-logic.md`
- `docs/technical-architecture.md`
- `docs/phases/phase-5-7-finalization.md`
- plan này và bản tiếng Anh

Các sự kiện kiến trúc liên quan:

- một PostgreSQL instance chứa các database do từng service sở hữu;
- User-Access sở hữu MongoDB `qrtable_auth`;
- Kitchen chỉ dùng Redis;
- BFF là API/WebSocket entry point công khai duy nhất;
- production dùng TypeORM migrations với `TYPEORM_SYNCHRONIZE=false`;
- SePay thật phụ thuộc vào tài khoản provider và API surface thực tế.

## 3. Phân loại scope

### 3.1 Core deployment bắt buộc

Đây là blocker cho public deployment:

1. Tasks 1-4 vẫn build được.
2. Production Compose dùng private networks, named volumes, health checks và không public internal
   ports.
3. Mỗi service chỉ nhận biến cần thiết qua explicit Compose `environment:`. Master env chỉ dùng cho
   interpolation, không inject nguyên file bằng `env_file`.
4. Production secrets được sinh mới, lưu ngoài git, server env có mode `0600`.
5. BFF từ chối wildcard/empty production CORS và dùng chung allowlist cho HTTP và Socket.IO.
6. Migrations và database ownership checks chạy trước app containers.
7. Keycloak chạy production mode và mặc định không tạo/reset demo users có mật khẩu deterministic.
8. Caddy cung cấp HTTPS cho public hosts.
9. DigitalOcean Firewall chỉ expose 80/443 và SSH bị giới hạn.
10. Health checks và critical public smoke checks pass.
11. Có logical backup kèm checksum và có thể deploy lại image tag trước đó.

### 3.2 Hữu ích cho vận hành và báo cáo

Những hạng mục này có giá trị nhưng phải giữ nhỏ:

- Grafana sau HTTPS/authentication;
- centralized container logs;
- Prometheus service health/request metrics;
- một Tempo trace đại diện cho demo;
- một lần demo alert khi service down;
- non-destructive demo seed và kịch bản demo 15-20 phút;
- deployment record ngắn gồm ngày, git SHA, image tag, migration result, smoke result, backup
  checksum và rollback tag.

Thiếu một trong các mục này có thể làm giảm chất lượng báo cáo, nhưng không tự động làm deployment
mất an toàn nếu health, logs, backup và smoke checks vẫn tồn tại.

### 3.3 Tích hợp có điều kiện

#### SePay live

SePay thật chỉ bắt buộc khi QRTable tuyên bố VietQR/OAuth/webhook payment đã production-ready.

Hai hướng hợp lệ:

- **Live SePay:** cấu hình tài khoản thật, OAuth callback, tenant/platform webhook routes, secret
  verification và một giao dịch giá trị nhỏ do human phê duyệt.
- **Cash/demo:** deploy mà không tuyên bố hỗ trợ SePay live. Trước khi dùng hướng này, cần relax
  Payment production startup contract sau feature flag rõ ràng và disable/hide thao tác SePay live.
  Không dùng fake production credentials.

Tài khoản provider, KYC, ủy quyền ngân hàng, OAuth consent và giao dịch thật là thao tác của human.
Chúng không chặn cash/demo deployment.

#### Cloudinary

Cloudinary chỉ bắt buộc nếu public demo có menu image upload. Existing images và main ordering flow
có thể kiểm tra riêng. Nếu bật, chạy một upload/read/delete smoke mà không log API secret.

### 3.4 Hardening có thể hoãn

Không phải blocker Phase 7:

- Kubernetes, nhiều Droplet, load balancer, blue/green hoặc canary;
- managed PostgreSQL/Valkey/Kafka;
- per-service database users;
- scoped env renderer sinh 12 file;
- production CI/CD control plane SSH từ GitHub Actions;
- auto-deploy production sau mỗi merge;
- bắt buộc SBOM và vulnerability enforcement gate;
- audit/evidence framework với nhiều human gate ID;
- full production Playwright cho mọi business flow;
- encrypted off-site restore rehearsal mỗi release;
- long-term Loki/Tempo object storage và enterprise retention.

Image scan, off-site backup copy và GitHub image publishing là follow-up tốt sau khi deployment đầu
tiên ổn định.

## 4. Quyết định triển khai

### 4.1 Platform

- Một DigitalOcean Droplet.
- Ubuntu LTS.
- Docker Engine và Docker Compose plugin.
- Khuyến nghị 4 vCPU / 8 GiB RAM.
- Self-host PostgreSQL, MongoDB, Redis, Kafka, Keycloak và monitoring.
- Bật DigitalOcean backups.
- Dùng Reserved IP nếu có.

Lựa chọn này phù hợp topology và ngân sách hơn Kubernetes hoặc managed Kafka.

### 4.2 Public hosts

| Host                             | Target                     |
| -------------------------------- | -------------------------- |
| `api.qrtable.vodinhquan.dev`     | BFF HTTP và Socket.IO      |
| `app.qrtable.vodinhquan.dev`     | Management App             |
| `qr.qrtable.vodinhquan.dev`      | Customer PWA               |
| `auth.qrtable.vodinhquan.dev`    | Keycloak                   |
| `grafana.qrtable.vodinhquan.dev` | Grafana sau authentication |

Chỉ Caddy publish host ports 80 và 443. SSH bị giới hạn theo operator IP hoặc control channel đã phê
duyệt.

### 4.3 Phân phối environment

Dùng một `/opt/qrtable/.env.production` được bảo vệ cho operator-managed values và Compose
interpolation.

Compose map rõ biến theo từng service:

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

Quy tắc:

- không dùng `env_file: /opt/qrtable/.env.production` cho service;
- không in resolved `docker compose config` ra shared logs;
- dùng `${VAR:?required}` cho biến bắt buộc;
- dùng MongoDB credential URL-safe khi tạo `MONGODB_URI` trong Compose;
- không đưa Keycloak bootstrap credential vào app container thường;
- không đưa SePay/Cloudinary credential vào service không liên quan.

Cách này đạt least privilege có giá trị mà không cần generated env files.

### 4.4 Release và rollback

Deployment đầu tiên do operator điều khiển:

1. chạy CI checks hiện có;
2. build và tùy chọn push image bằng `tools/deploy/phase7-build-images.sh`;
3. chọn immutable image tag theo git SHA;
4. deploy từ trusted workstation qua restricted SSH;
5. chạy migrations, start containers và smoke checks;
6. ghi successful tag;
7. rollback bằng cách deploy lại tag trước.

GitHub Actions image publishing là optional. GitHub Actions production SSH deployment được defer.

## 5. Roadmap rút gọn

### Thứ tự dependency

```text
Tasks 1-4 (done)
  -> Task 5 infra Compose
  -> Task 6 app Compose và explicit env mapping
  -> Task 7 proxy configuration

Task 8 env/CORS có thể hoàn thành song song với Tasks 5-7

Tasks 5, 6, 8
  -> Task 9 migrations và Keycloak bootstrap

Tasks 5, 6
  -> Task 10 monitoring

Tasks 5-10
  -> Task 11 DigitalOcean provisioning và deployment
  -> Task 12 smoke, backup, rollback, demo và canonical docs

Conditional SePay live chỉ bắt đầu sau khi public HTTPS tồn tại.
```

### Task 1: Build context controls

**Trạng thái:** Hoàn thành trong `a6ce5b6`.

Giữ `.dockerignore`. Chỉ verify lại khi thêm generated/private directory.

### Task 2: Backend image

**Trạng thái:** Hoàn thành trong `a6ce5b6`.

Giữ parametric backend Dockerfile và image build script. Verify một backend image đại diện trước full
release build.

### Task 3: Management App image

**Trạng thái:** Hoàn thành trong `2678f58`.

Giữ Next.js standalone output và multi-stage Dockerfile. Public `NEXT_PUBLIC_*` là build-time config;
private secrets chỉ ở runtime.

### Task 4: Customer PWA image

**Trạng thái:** Hoàn thành trong `2678f58`.

Giữ static Nginx image và SPA fallback. `VITE_BFF_URL` là build-time config.

### Task 5: Production infrastructure Compose

**Trạng thái:** Đã triển khai trong `docker-compose.infra.yaml`; verify health bằng Docker local còn
phụ thuộc môi trường.

**Kết quả:** PostgreSQL, MongoDB, Redis, Kafka và Keycloak chạy trên private networks với named
volumes và health checks.

Scope:

- tạo `docker-compose.infra.yaml`;
- pin image version được hỗ trợ, ưu tiên digest sau khi test;
- reuse service database init SQL và thêm Keycloak database;
- advertise Kafka là `kafka:9092`;
- chạy Keycloak production mode, không dùng `start-dev`;
- không publish datastore hoặc Keycloak container ports;
- dùng Compose health checks và memory limit phù hợp Droplet.

Đã có target verify syntax:

```bash
docker compose --env-file docker/env/.env.production.example \
  -f docker-compose.infra.yaml config -q
```

Khi Docker local khả dụng, start layer bằng local test values không nhạy cảm và verify từng health
state.

### Task 6: Application Compose và explicit env mapping

**Kết quả:** Tám backend service và hai frontend giao tiếp qua Docker service name.

Scope:

- tạo `docker-compose.app.yaml`;
- chỉ map biến cần thiết trong `environment:` của từng service;
- set TCP/gRPC listener thành `0.0.0.0`;
- set TCP/gRPC client thành Docker service name;
- chỉ BFF và frontend tham gia edge network;
- không publish application ports;
- thêm health checks đúng route prefix.

Validation nằm ở task này vì lúc này Compose thật đã tồn tại:

- `docker compose ... config -q`;
- dùng `${VAR:?required}` để fail khi thiếu biến;
- inspect local service/network/port model mà không upload output;
- verify không service nào dùng master env làm `env_file`.

Không đưa trở lại general-purpose dotenv parser hoặc generated per-service env files.

### Task 7: Reverse proxy và HTTPS configuration

**Kết quả:** Caddy route năm public hosts và là public container duy nhất.

Scope:

- tạo Caddyfile và proxy Compose;
- proxy API/WebSocket, Management App, PWA, Keycloak và Grafana;
- bảo vệ Grafana;
- persist certificate data;
- validate config trước khi provision DigitalOcean.

Live certificate issuance nằm ở Task 11 vì phụ thuộc DNS.

### Task 8: Production env và BFF CORS

**Trạng thái:** Đã triển khai một phần trong worktree hiện tại.

Giữ:

- `docker/env/.env.production.example`;
- `apps/bff/src/configuration/cors-origins.ts`;
- `apps/bff/src/configuration/cors-origins.spec.ts`;
- `apps/bff/src/app/modules/realtime/adapters/redis-io.adapter.spec.ts`;
- thay đổi BFF configuration/bootstrap/adapter/gateway dùng chung một allowlist.

Không giữ:

- scoped env renderer sinh 12 file;
- Compose validator 400 dòng và shell test suite;
- fake-transport CORS shell test suite;
- acceptance matrix riêng cho Task 8.

Acceptance:

- template chỉ có key/placeholder, không có secret thật;
- `/opt/qrtable/.env.production` được tạo thủ công với mode `0600`;
- production BFF startup từ chối missing/wildcard CORS;
- development có thể giữ wildcard fallback;
- HTTP và Socket.IO dùng chung origin validator;
- BFF unit tests, lint và build pass.

Public allowed/disallowed-origin checks chuyển sang Task 12 sau khi DNS và HTTPS tồn tại.

### Task 9: Migrations và production-safe Keycloak bootstrap

**Kết quả:** Schema và identity config được áp dụng trước app startup mà không có development
behavior destructive.

Scope:

- package one-shot migration/tooling image hoặc job có khả năng tái lập tương đương;
- chạy `pnpm db:migrate`, `pnpm db:migration:show`, `pnpm db:verify:ownership`;
- dừng deployment nếu bất kỳ lệnh nào fail;
- tách realm/client/role bootstrap khỏi demo-user creation;
- update production redirect URI và web origin idempotently;
- không chạy `pnpm dev:reseed -- --yes` trong production;
- demo data là opt-in, non-destructive và idempotent.

### Task 10: Production monitoring baseline

**Kết quả:** Operator biết service có sống không và request lỗi đi qua đâu.

Core:

- Prometheus scrape app container names;
- Promtail thu labeled container logs;
- Loki, Prometheus và Tempo private;
- Grafana chỉ truy cập qua Caddy;
- disk retention có giới hạn.

Bằng chứng hữu ích:

- một dashboard health, request rate, error rate và latency;
- một trace BFF đến Order/Kitchen;
- một lần demo service-down alert.

Không thêm long-term object storage hoặc enterprise retention trong Phase 7.

### Task 11: Provision DigitalOcean và deploy

**Kết quả:** Public HTTPS deployment chạy từ immutable image tag.

Human:

- phê duyệt account, chi phí, Droplet size, Reserved IP, DNS và external provider credentials;
- cấu hình Firewall và DNS;
- nhập secrets trực tiếp trên server;
- phê duyệt deployment window và tag.

Agent/script:

- cài Docker từ official repository;
- tạo non-root deploy user;
- disable root/password SSH;
- validate env permission và Compose syntax;
- start infra và đợi health;
- chạy Task 9 migrations/bootstrap;
- start monitoring, app và proxy;
- verify public TLS và container/network state.

Release đầu có thể manual push/pull image hoặc build trên server. Không cần production CI/CD
platform.

### Task 12: Smoke, backup, rollback, demo và documentation

**Kết quả:** Một developer có thể demo, quan sát và phục hồi deployment.

Smoke bắt buộc:

- BFF live/ready health;
- public response của Management App, Customer PWA và Keycloak;
- allowed/disallowed HTTP CORS origins;
- allowed/disallowed Socket.IO origins;
- login;
- QR menu/session;
- order submit và staff confirm;
- KDS update;
- cash payment và table lifecycle;
- Grafana nhận logs/metrics hiện tại.

Full production Playwright không bắt buộc. Chạy demo subset ổn định; deeper E2E nằm trên local/test
stack đã chuẩn hóa.

Backup và rollback:

- bật DigitalOcean Droplet backups;
- tạo logical PostgreSQL/MongoDB dumps kèm checksum;
- schedule daily backup đơn giản với retention có giới hạn;
- test một representative restore vào disposable containers trước bảo vệ;
- ghi previous good image tag;
- rollback app bằng tag đó;
- data restore là thao tác riêng, explicit.

Documentation:

- tạo/cập nhật operator runbook ngắn;
- ghi final Compose files, hosts, migration sequence, backup path và rollback command;
- chỉ update canonical Phase 7/architecture docs sau implementation;
- chạy `pnpm verify:doc-anchors`.

## 6. Human checkpoints

Dùng bốn checkpoint dễ hiểu thay cho mười một formal gates:

| Checkpoint         | Quyết định của human                                                     |
| ------------------ | ------------------------------------------------------------------------ |
| External resources | Phê duyệt DigitalOcean cost/resources, domain/DNS và account ownership   |
| Secrets            | Nhập production/provider values trực tiếp vào protected stores           |
| Deployment         | Phê duyệt immutable tag, backup state, rollback tag và deployment window |
| Real payment       | Phê duyệt SePay live và giao dịch giá trị nhỏ nếu có                     |

Chỉ ghi redacted identifier và result. Không ghi full credential, private key, OAuth secret, webhook
secret hoặc bank data.

## 7. Production acceptance

Phase 7 baseline được chấp nhận khi:

- [ ] Tasks 1-4 vẫn build tái lập được.
- [ ] Infra và app Compose start từ clean server checkout.
- [ ] Internal ports không public.
- [ ] Production secrets ngoài git và server env có permission hạn chế.
- [ ] Compose explicit map service variables, không inject master env nguyên file.
- [ ] Dedicated database names active và shared fallback disabled.
- [ ] Migrations và database ownership checks pass trước app startup.
- [ ] Production Keycloak bootstrap không tạo deterministic demo users.
- [ ] HTTPS hoạt động cho API, app, PWA, auth và protected Grafana.
- [ ] BFF HTTP và Socket.IO từ chối origin không nằm trong allowlist.
- [ ] Login, QR ordering, POS confirm, KDS và cash payment smoke pass.
- [ ] Health, centralized logs và service metrics có sẵn.
- [ ] Có logical backup kèm checksum và một representative restore đã được test.
- [ ] Có thể deploy lại application image tag trước.
- [ ] Operator runbook và canonical docs khớp file đã triển khai.

SePay live acceptance tách riêng:

- [ ] Xác nhận API surface của provider thật.
- [ ] Cấu hình OAuth callback và tenant/platform webhook routes.
- [ ] Invalid secrets bị từ chối.
- [ ] Một giao dịch giá trị nhỏ do human phê duyệt được ghi idempotently.

Nếu chưa hoàn thành các mục SePay, deployment vẫn có thể pass cash/demo baseline, nhưng docs và UI
không được tuyên bố live SePay ready.

## 8. Thứ tự tiếp theo

1. Hoàn thành review và verification phần Task 8 CORS/env được giữ.
2. Triển khai Task 5 infra Compose.
3. Triển khai Task 6 app Compose với explicit environment mapping.
4. Triển khai Task 9 migrations và production-safe Keycloak bootstrap.
5. Triển khai Task 10 monitoring adaptation.
6. Triển khai Task 7 proxy configuration.
7. Provision và deploy theo Task 11.
8. Hoàn thành Task 12 smoke, recovery, demo và canonical documentation.

Tasks 5-12 có chủ ý không được triển khai trong session refactor plan hiện tại.
