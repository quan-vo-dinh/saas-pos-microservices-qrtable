# Docker, Deployment & CI/CD: Lý Thuyết và Triển Khai Thực Chiến — QRTable Phase 7

> **Bản tiếng Việt** — bản tiếng Anh canonical: [docker-deployment-cicd-qrtable.md](docker-deployment-cicd-qrtable.md)
>
> **Triết lý tài liệu:** Hiểu _tại sao_ trước _như thế nào_. Mọi khái niệm được neo vào
> ngữ cảnh cụ thể của QRTable để bạn không học lý thuyết trừu tượng mà học để áp dụng ngay.
>
> **Phạm vi:** Toàn bộ lý thuyết cần thiết để triển khai QRTable lên DigitalOcean —
> từ Docker fundamentals, Dockerfile patterns, Docker Compose layered architecture,
> reverse proxy/HTTPS, secrets management, CI/CD pipeline, đến rollback strategy.
>
> **Mục tiêu:** Sau khi đọc xong, có thể giải thích từng quyết định kiến trúc
> trong Phase 7, debug deployment issues, và mở rộng CI/CD pipeline một cách có chủ ý.

---

## Mục Lục

0. [Nguồn Tài Liệu Và Coverage Map](#nguồn-tài-liệu-và-coverage-map)
1. [Vấn Đề Deployment Giải Quyết](#1-vấn-đề-deployment-giải-quyết)
2. [Container Fundamentals - Docker là Gì và Tại Sao](#2-container-fundamentals--docker-là-gì-và-tại-sao)
3. [Dockerfile - Đóng Gói Ứng Dụng](#3-dockerfile--đóng-gói-ứng-dụng)
4. [Docker Compose - Điều Phối Nhiều Service](#4-docker-compose--điều-phối-nhiều-service)
5. [Kiến Trúc 4 Lớp Của QRTable Production](#5-kiến-trúc-4-lớp-của-qrtable-production)
6. [Reverse Proxy và HTTPS](#6-reverse-proxy-và-https)
7. [Secrets và Environment Management](#7-secrets-và-environment-management)
8. [DigitalOcean Deployment - Hạ Tầng Và Provisioning](#8-digitalocean-deployment--hạ-tầng-và-provisioning)
9. [Database Và Migration Strategy](#9-database-và-migration-strategy)
10. [CI/CD Pipeline - Release, Deploy, Rollback](#10-cicd-pipeline--release-deploy-rollback)
11. [Container Registry và Image Tagging](#11-container-registry-và-image-tagging)
12. [Phase 7 Coverage Checklist](#12-phase-7-coverage-checklist)
13. [Tổng Kết Mental Model](#13-tổng-kết-mental-model)

---

## Nguồn Tài Liệu Và Coverage Map

### Context7 sources used

Tài liệu này được bổ sung dựa trên Context7 lookup ngày 2026-06-06:

| Chủ đề              | Context7 library              | Dùng để củng cố phần nào                                                                                                                   |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker core docs    | `/docker/docs`                | Image/container model, Dockerfile, BuildKit, Buildx, Compose, volumes, health checks, registry, GitHub Actions build-push workflow         |
| GitHub Actions docs | `/websites/github_en_actions` | Workflow jobs, `needs`, `permissions`, `environment: production`, deployment protection rules, required approval, secrets, deployment jobs |

Nguồn chính:

- [Docker documentation](https://docs.docker.com/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker Build with GitHub Actions cache](https://github.com/docker/docs/blob/main/content/manuals/build/ci/github-actions/cache.md)
- [Docker guide: Next.js with GitHub Actions](https://github.com/docker/docs/blob/main/content/guides/nextjs/configure-github-actions.md)
- [GitHub Actions: deploy to an environment](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment)
- [GitHub Actions: deployments and environments](https://docs.github.com/en/actions/deployment/about-deployments/deploying-with-github-actions)

### How this guide covers the Phase 7 plan

`docs/superpowers/plans/2026-06-06-phase-7-docker-digitalocean-deployment.md` là implementation plan. Tài liệu này là foundation guide. Khi plan yêu cầu tạo một file hoặc workflow, guide này giải thích vì sao file đó tồn tại, nó giải quyết rủi ro nào, và cách debug khi deploy fail.

| Phase 7 tasks                                               | Kiến thức nền trong guide này                                                                           |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Task 1: `.dockerignore`                                     | Build context, layer cache, secret leak prevention                                                      |
| Task 2-4: Backend, Management App, Customer PWA Dockerfiles | Multi-stage builds, Nx build artifacts, Next standalone, Vite static runtime, build-time vs runtime env |
| Task 5-6: Infra/app Compose                                 | Compose services, internal networks, service discovery, named volumes, health checks, layered compose   |
| Task 7: Caddy reverse proxy                                 | Reverse proxy role, TLS termination, Let's Encrypt ACME, WebSocket forwarding                           |
| Task 8: Production env and secrets                          | Secret taxonomy, runtime env files, file permissions, no secret build args                              |
| Task 9: Schema/migration lifecycle                          | Per-service migrations với `TYPEORM_SYNCHRONIZE=false`                                                  |
| Task 10: Keycloak public bootstrap                          | Public hostnames, TLS, proxy headers, env separation                                                    |
| Task 11: SePay production integration                       | HTTPS-only webhook requirement, public API base URL, secret-key verification, CI negative checks        |
| Task 12: Monitoring rewiring                                | Internal scrape targets, private observability stores, Grafana behind HTTPS/auth                        |
| Task 13-16: DigitalOcean deploy, smoke, backup, operations  | Droplet sizing, firewall, DNS, Docker Engine install, preflight, smoke tests, backup and rollback model |
| Task 17: CI/CD pipeline                                     | CI quality gate, image release workflow, production deploy approval, rollback workflow, audit trail     |
| Task 18: Canonical docs                                     | Why implementation must update phase docs, architecture docs, and doc-code anchors                      |

---

## 1. Vấn Đề Deployment Giải Quyết

### 1.1 Bài Toán Gốc: "Chạy Được Trên Máy Tôi"

QRTable có 8 NestJS services, 2 frontend apps, PostgreSQL, MongoDB, Redis, Kafka, Keycloak, và toàn bộ observability stack (Prometheus, Loki, Tempo, Grafana). Trên máy dev, tất cả chạy với `docker compose up` và mọi thứ hoạt động.

Nhưng khi cần deploy lên server thật — DigitalOcean Droplet chạy Ubuntu 24.04 — bài toán thay đổi hoàn toàn:

**Bài toán 1 — Reproducibility:** Code chạy được trên macOS Apple Silicon của developer, có nghĩa là chạy được trên Ubuntu x86 của Droplet không? Không nhất thiết. Node.js version khác nhau, native modules compile khác nhau, env vars thiếu.

**Bài toán 2 — "Works on my machine" vs production:** Development dùng `TYPEORM_SYNCHRONIZE=true`, production không thể. Development Kafka advertises `localhost:9092`, container production cần `kafka:9092`. Development không cần HTTPS, production bắt buộc HTTPS cho SePay webhook.

**Bài toán 3 — Consistency across deploys:** Deploy lần thứ nhất thành công. Deploy lần thứ hai sau 3 tháng có thể fail vì `bitnami/kafka:latest` đã thay đổi, `postgres:latest` có breaking changes. "Latest" không là immutable.

**Bài toán 4 — Safe deployment:** Khi có bug, làm sao deploy fix nhanh mà không gây downtime? Làm sao rollback về version trước nếu fix gây ra lỗi mới? Làm sao đảm bảo chỉ có người được phép mới deploy lên production?

Docker + Docker Compose + CI/CD giải quyết tất cả bốn bài toán này theo cách có hệ thống.

### 1.2 Tại Sao QRTable Không Dùng PaaS Đơn Giản Hơn

Nhiều người sẽ hỏi: tại sao không dùng Heroku, Railway, hoặc DigitalOcean App Platform — các PaaS tự động handle container, scaling, SSL, deployment?

**Lý do kỹ thuật:** QRTable dùng NestJS TCP microservices — các service giao tiếp qua raw TCP port (3201, 3203...), không phải HTTP. PaaS thường chỉ expose HTTP/HTTPS ports, không support internal TCP communication pattern này.

**Lý do học thuật:** Với thesis/đồ án, việc tự triển khai trên VPS (Droplet) với Docker Compose chứng minh khả năng vận hành hệ thống thực tế hơn là dùng managed service giấu toàn bộ infrastructure layer.

**Lý do cost:** Một Droplet 4 vCPU / 8 GiB ≈ $48/tháng chứa toàn bộ stack. DigitalOcean App Platform với 10 services đắt hơn nhiều. Managed Kafka trên DigitalOcean là multi-node cluster giá cao không phù hợp thesis/pilot.

---

## 2. Container Fundamentals — Docker là Gì và Tại Sao

### 2.1 VM vs Container — Sự Khác Biệt Nền Tảng

Trước khi có container, deploying thường dùng Virtual Machine (VM) hoặc bare metal. Hiểu sự khác biệt giải thích tại sao Docker phổ biến đến vậy.

**Virtual Machine:** Chạy một operating system hoàn chỉnh (guest OS) trên top của host OS thông qua hypervisor. Mỗi VM có kernel riêng, driver riêng, toàn bộ OS stack riêng.

**Container:** Chia sẻ kernel của host OS, chỉ isolate userspace (process, filesystem, network, user). Container là một _process_ được isolate, không phải OS riêng biệt.

#### Sơ đồ: VM vs Container — Sự Khác Biệt Kiến Trúc

> Container nhẹ hơn VM vì không cần Guest OS riêng. Nhiều containers chia sẻ cùng kernel của host. Điều này giải thích tại sao container khởi động trong milliseconds thay vì seconds như VM.

```mermaid
graph TB
    subgraph "Virtual Machine"
        H1["Host OS (Ubuntu)"]
        HV["Hypervisor (VMware/KVM)"]
        G1["Guest OS (Ubuntu)"]
        G2["Guest OS (CentOS)"]
        A1["App A"]
        A2["App B"]

        H1 --> HV
        HV --> G1 --> A1
        HV --> G2 --> A2
    end

    subgraph "Containers"
        H2["Host OS (Ubuntu)"]
        K["Linux Kernel (shared)"]
        NS1["Container: bff\n(isolated namespace)"]
        NS2["Container: order\n(isolated namespace)"]
        NS3["Container: postgres\n(isolated namespace)"]

        H2 --> K
        K --> NS1
        K --> NS2
        K --> NS3
    end

    style K fill:#339af0,stroke:#333,color:#fff
    style H1 fill:#51cf66,stroke:#333,color:#fff
    style H2 fill:#51cf66,stroke:#333,color:#fff
```

**Hệ quả thực tế cho QRTable:**

- Container `bff` và `order` chạy trên cùng Ubuntu kernel của Droplet
- Không cần OS riêng cho từng service → tiết kiệm RAM đáng kể
- Startup nhanh: từ `docker compose up` đến service ready chỉ vài giây, không phải phút

### 2.2 Docker Client, Docker Daemon, Registry — Ai Làm Gì?

Khi gõ một lệnh Docker, terminal không tự build hoặc chạy container. Docker có ba thành phần chính:

```text
Docker CLI
  docker build / docker pull / docker run
          |
          v
Docker daemon (dockerd)
  build image, create network, mount volume, start container
          |
          v
Container registry
  lưu và phân phối image
```

| Thành phần     | Vai trò                                        | Ví dụ QRTable                           |
| -------------- | ---------------------------------------------- | --------------------------------------- |
| Docker CLI     | Nhận lệnh từ developer hoặc CI                 | `docker compose up -d`                  |
| Docker daemon  | Thực thi build và quản lý container trên host  | Daemon trên DigitalOcean Droplet        |
| Image registry | Lưu image để máy khác có thể pull              | DigitalOcean Container Registry         |
| Docker Compose | Đọc YAML và gọi Docker API cho nhiều container | Khởi động app, infra, proxy, monitoring |

Ví dụ:

```bash
docker pull registry.digitalocean.com/qrtable/bff:abc123
```

1. CLI gửi yêu cầu pull đến daemon.
2. Daemon kiểm tra local image cache.
3. Nếu chưa có, daemon tải các image layers từ registry.
4. Image được lưu local trên Droplet, nhưng container chưa chạy.

```bash
docker run registry.digitalocean.com/qrtable/bff:abc123
```

Lúc này daemon mới tạo container từ image và start process được định nghĩa bởi `ENTRYPOINT`/`CMD`.

### 2.3 Namespaces, Cgroups, Filesystem Layers — Container Được Cô Lập Bằng Gì?

Container isolation không phải phép thuật của Docker. Docker sử dụng primitives của Linux:

| Primitive         | Cô lập/kiểm soát gì    | Ý nghĩa                                                |
| ----------------- | ---------------------- | ------------------------------------------------------ |
| PID namespace     | Process tree           | Container chỉ nhìn thấy process trong namespace của nó |
| Network namespace | Interface, route, port | Mỗi container có network stack riêng                   |
| Mount namespace   | Filesystem mounts      | Container thấy filesystem riêng                        |
| User namespace    | User/group IDs         | Có thể map user container sang host an toàn hơn        |
| Cgroups           | CPU, RAM, I/O          | Giới hạn resource để một service không ăn hết Droplet  |
| Capabilities      | Quyền kernel nhỏ lẻ    | Có thể drop quyền thay vì cho full root privileges     |

Image gồm các read-only layers. Khi container chạy, Docker thêm một **writable container layer** ở trên:

```text
Writable container layer        <- log/file tạm được ghi ở đây
Application artifact layer
Production dependencies layer
Node.js base image layers
```

Khi container bị remove, writable layer mất. Vì vậy database data phải nằm trong named volume, không nằm trong container layer.

### 2.4 Container Lifecycle Và PID 1

Container thường đi qua các trạng thái:

```text
created -> running -> paused/restarting -> exited -> removed
```

Các lệnh tương ứng:

```bash
docker create IMAGE   # tạo container nhưng chưa chạy
docker start NAME     # chạy container đã tạo
docker stop NAME      # gửi SIGTERM, chờ, sau đó SIGKILL nếu cần
docker restart NAME   # stop rồi start lại
docker rm NAME        # xóa container, không xóa image
docker rmi IMAGE      # xóa image nếu không còn container phụ thuộc
```

Process được start bởi `ENTRYPOINT`/`CMD` trở thành **PID 1** trong container. PID 1 phải:

- nhận `SIGTERM` khi deploy hoặc shutdown;
- kết thúc graceful để đóng HTTP server, DB connection, Kafka consumer;
- không spawn child process rồi bỏ mặc signal.

Vì vậy exec form được ưu tiên:

```dockerfile
CMD ["node", "main.js"]
```

Thay vì shell form:

```dockerfile
CMD node main.js
```

Exec form chạy `node` trực tiếp làm PID 1. Shell form thường chạy qua `/bin/sh -c`, khiến signal có thể đến shell thay vì application process.

### 2.5 Image và Container — Phân Biệt Quan Trọng

**Image** là template read-only — bản "thiết kế" của container. Chứa: OS layer, runtime (Node.js), application code, dependencies.

**Container** là running instance của một image — "đối tượng" được tạo từ "lớp". Nhiều container có thể chạy từ cùng một image.

Image reference có dạng:

```text
[registry/][namespace/]repository[:tag][@digest]
```

Ví dụ:

```text
registry.digitalocean.com/qrtable/bff:abc123
registry.digitalocean.com/qrtable/bff@sha256:...
```

- Registry mặc định thường là Docker Hub nếu không ghi.
- Tag là tên mutable trỏ đến image manifest.
- Digest là content-addressed identifier chính xác.
- Một tag có thể trỏ đến multi-platform manifest cho `linux/amd64`, `linux/arm64`, ...

Apple Silicon thường là `arm64`, còn DigitalOcean Droplet phổ biến là `amd64`. Buildx có thể build platform đích:

```bash
docker buildx build --platform linux/amd64 -t qrtable-bff:abc123 .
```

hoặc multi-platform khi registry nhận output:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t registry.digitalocean.com/qrtable/bff:abc123 \
  .
```

```
docker build → Image (bất biến, có thể push lên registry)
docker run   → Container (chạy, có thể stop/start/delete)
```

Trong QRTable:

```
docker build -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:abc123 .
→ Tạo image qrtable-bff:abc123 (bất biến, mang được lên mọi server)

docker compose -f docker-compose.app.yaml up -d
→ Tạo container bff từ image, start process, attach network
```

### 2.6 Layers và Caching — Tại Sao Build Nhanh Lần Sau

Image được xây dựng từ nhiều **layers**. Các instruction thay đổi filesystem như `RUN`, `COPY`, `ADD` tạo filesystem layers; instruction metadata như `ENV`, `CMD`, `EXPOSE` cập nhật image configuration/history. Docker cache dựa trên instruction, parent state và content liên quan:

```
Layer 1: FROM node:22.12-alpine3.20         → cached nếu base image không đổi
Layer 2: RUN corepack enable                → cached nếu instruction không đổi
Layer 3: COPY package.json pnpm-lock.yaml   → cache invalid nếu lockfile đổi
Layer 4: RUN pnpm install                   → chạy lại nếu Layer 3 invalid
Layer 5: COPY apps ./apps                   → cache invalid nếu source code đổi
Layer 6: RUN pnpm nx build bff              → chạy lại nếu Layer 5 invalid
```

**Nguyên tắc quan trọng:** Đặt instructions ít thay đổi lên trên (base image, corepack), instructions hay thay đổi xuống dưới (COPY source code). Ngược lại → cache miss liên tục → build chậm mỗi lần.

### 2.7 BuildKit và Buildx — Docker Build Hiện Đại

**BuildKit** là engine build hiện đại của Docker. Nó giúp build nhanh hơn, hỗ trợ cache mount, secret mount, multi-platform build, và xuất cache cho CI. **Buildx** là CLI frontend thường dùng để gọi BuildKit trong local và GitHub Actions.

Trong Phase 7, BuildKit quan trọng vì QRTable là Nx monorepo lớn. Nếu build mỗi image từ đầu, 8 backend services + 2 frontend apps sẽ rất chậm. BuildKit cho phép cache pnpm store và Docker layers:

```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
```

Phân tích syntax:

| Phần                 | Ý nghĩa                                                |
| -------------------- | ------------------------------------------------------ |
| `RUN --mount=...`    | Tạo mount chỉ tồn tại trong lúc instruction build chạy |
| `type=cache`         | BuildKit quản lý nội dung để tái sử dụng ở build sau   |
| `id=pnpm-store`      | Tên cache ổn định                                      |
| `target=/pnpm/store` | Path cache xuất hiện bên trong build container         |
| `pnpm install ...`   | Command thực sự được chạy                              |

Cache mount không trở thành runtime volume và cache content không được copy nguyên vào final image layer. Nó chỉ tăng tốc build.

Build-time secret nên dùng secret mount thay vì `ARG`:

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
  pnpm install --frozen-lockfile
```

```bash
docker build --secret id=npmrc,src="$HOME/.npmrc" .
```

Secret file chỉ tồn tại trong instruction đó và không nên được commit vào image.

Trong GitHub Actions, Docker docs khuyến nghị pattern `setup-buildx-action` + `build-push-action` + cache:

```yaml
- uses: docker/setup-buildx-action@v4
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: registry.digitalocean.com/qrtable/bff:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Mental model:** Docker layer cache trả lời câu hỏi "instruction này có cần chạy lại không?". BuildKit cache mount trả lời câu hỏi "khi instruction phải chạy lại, có thể tái sử dụng package cache bên trong không?". Cả hai cùng làm CI nhanh hơn.

**Cảnh báo:** Cache giúp nhanh hơn nhưng không được làm build mất tính reproducible. Luôn giữ `pnpm-lock.yaml`, dùng `--frozen-lockfile`, và không phụ thuộc vào package version trôi nổi.

### 2.8 Build Context và .dockerignore

Khi chạy `docker build .`, Docker gửi toàn bộ thư mục `.` (build context) lên Docker daemon trước khi build. Nếu build context lớn → build chậm, image to.

QRTable có `node_modules` hàng trăm MB, `dist` cũ, `.git`, docker data. `.dockerignore` loại trừ chúng:

```dockerignore
.git
.github
node_modules
**/node_modules
dist
.nx/cache
.next
docker/docker_data
*.log
```

Pattern syntax:

| Pattern              | Ý nghĩa                                               |
| -------------------- | ----------------------------------------------------- |
| `node_modules`       | Ignore path có tên `node_modules` theo matching rules |
| `**/node_modules`    | Ignore `node_modules` ở mọi depth                     |
| `*.log`              | Ignore file kết thúc bằng `.log`                      |
| `docker/docker_data` | Ignore path cụ thể                                    |
| `!*.env.example`     | Re-include file đã bị pattern trước ignore            |
| `# comment`          | Comment                                               |

Rules được đánh giá theo thứ tự; match cuối có thể override match trước. Ví dụ:

```dockerignore
.env*
!*.env.example
```

ignore mọi `.env*` nhưng giữ lại template `*.env.example`.

`.dockerignore` không làm image nhỏ sau khi file đã được `COPY`; nó ngăn file được gửi vào build context ngay từ đầu. Đây vừa là optimization vừa là secret-leak control.

**Kiểm tra build context:**

```bash
docker buildx du --verbose .
```

Phải không có `node_modules` hay `docker/docker_data` trong context.

### 2.9 Cú Pháp `docker run` Và Các Lệnh Debug Cơ Bản

Cấu trúc tổng quát:

```text
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

Ví dụ:

```bash
docker run \
  --name qrtable-bff \
  -d \
  --env-file /opt/qrtable/.env.production \
  -e PORT=3300 \
  -p 127.0.0.1:3300:3300 \
  --network qrtable-edge \
  --restart unless-stopped \
  registry.digitalocean.com/qrtable/bff:abc123
```

| Option                    | Ý nghĩa                                                  |
| ------------------------- | -------------------------------------------------------- |
| `--name qrtable-bff`      | Đặt tên container                                        |
| `-d`, `--detach`          | Chạy background và trả terminal lại                      |
| `--rm`                    | Tự remove container khi nó exit; phù hợp one-off command |
| `-it`                     | Interactive terminal; thường dùng debug shell            |
| `-e KEY=value`            | Inject một environment variable                          |
| `--env-file FILE`         | Inject nhiều runtime variables từ file                   |
| `-p HOST:CONTAINER`       | Publish port                                             |
| `-v SOURCE:TARGET[:MODE]` | Mount volume/bind path bằng short syntax                 |
| `--mount ...`             | Mount syntax dài, rõ type/source/target hơn              |
| `--network NAME`          | Attach container vào network                             |
| `--restart POLICY`        | Chọn restart policy                                      |
| `--user UID:GID`          | Override runtime user                                    |
| `--read-only`             | Làm root filesystem read-only                            |
| `--cap-drop ALL`          | Bỏ Linux capabilities để harden                          |

Phần sau `IMAGE` override Dockerfile `CMD`:

```bash
docker run qrtable-bff:abc123 node --version
```

Container này chạy `node --version`, không chạy default `node main.js`.

`docker run` luôn **create container mới rồi start**. `docker start` chỉ start lại container đã có.

Các lệnh quan sát/debug:

```bash
docker ps                         # running containers
docker ps -a                      # cả exited containers
docker logs -f qrtable-bff        # follow stdout/stderr
docker inspect qrtable-bff        # JSON low-level config/state
docker exec -it qrtable-bff sh    # mở shell trong container đang chạy
docker stats                      # CPU/RAM/network I/O realtime
docker image ls                   # local images
docker network inspect qrtable-edge
docker volume inspect postgres_data
```

**Mental model:** `docker run` là imperative command cho một container. Compose là declarative desired state cho nhiều containers.

---

## 3. Dockerfile — Đóng Gói Ứng Dụng

### 3.1 Dockerfile Là Gì Và Docker Đọc Nó Như Thế Nào?

Dockerfile là một file text chứa chuỗi **build instructions**. Docker đọc từ trên xuống. Mỗi instruction nhận kết quả của instruction trước làm input.

Cú pháp build đầy đủ thường gặp:

```bash
docker build \
  -f docker/backend.Dockerfile \
  --build-arg APP_NAME=bff \
  -t registry.digitalocean.com/qrtable/bff:abc123 \
  .
```

| Thành phần                     | Ý nghĩa                                                   |
| ------------------------------ | --------------------------------------------------------- |
| `docker build`                 | Yêu cầu daemon build một image                            |
| `-f docker/backend.Dockerfile` | Chọn Dockerfile, mặc định là `./Dockerfile`               |
| `--build-arg APP_NAME=bff`     | Truyền giá trị cho Dockerfile `ARG APP_NAME`              |
| `-t repository/name:tag`       | Gắn tên và tag cho image                                  |
| `.` cuối lệnh                  | Build context; `COPY` chỉ đọc được file trong context này |

Dòng đầu:

```dockerfile
# syntax=docker/dockerfile:1.7
```

không phải comment bình thường. Đây là **parser directive**, chọn Dockerfile frontend syntax cho BuildKit. Version syntax quyết định các feature như `RUN --mount=type=cache` có được hỗ trợ hay không.

Comment thông thường bắt đầu bằng `#`:

```dockerfile
# Đây chỉ là comment
RUN corepack enable
```

### 3.2 Dockerfile Instruction Reference

| Instruction   | Cú pháp cơ bản                                | Thời điểm                | Ý nghĩa                                                               |
| ------------- | --------------------------------------------- | ------------------------ | --------------------------------------------------------------------- |
| `FROM`        | `FROM image[:tag] AS stage`                   | Build                    | Chọn base image và bắt đầu một build stage mới                        |
| `ARG`         | `ARG NAME=default`                            | Build                    | Khai báo build-time variable                                          |
| `ENV`         | `ENV NAME=value`                              | Build + runtime          | Lưu environment variable vào image/container                          |
| `WORKDIR`     | `WORKDIR /app`                                | Build metadata           | Đặt working directory cho các instruction sau                         |
| `COPY`        | `COPY src dest`                               | Build                    | Copy file từ build context vào image                                  |
| `ADD`         | `ADD src dest`                                | Build                    | Giống `COPY` nhưng có thêm remote URL/tar behavior; thường không cần  |
| `RUN`         | `RUN command`                                 | Build                    | Chạy command lúc build và lưu filesystem result vào image layer       |
| `USER`        | `USER qrtable`                                | Build metadata + runtime | Chọn user cho `RUN` sau đó và process runtime                         |
| `EXPOSE`      | `EXPOSE 3300`                                 | Image metadata           | Mô tả port app lắng nghe; không tự publish ra host                    |
| `VOLUME`      | `VOLUME ["/data"]`                            | Image metadata           | Khai báo mount point; production Compose thường quản lý volume rõ hơn |
| `HEALTHCHECK` | `HEALTHCHECK CMD ...`                         | Runtime metadata         | Chỉ định command kiểm tra container health                            |
| `ENTRYPOINT`  | `ENTRYPOINT ["node"]`                         | Runtime                  | Chọn executable chính, khó bị override hơn                            |
| `CMD`         | `CMD ["node", "main.js"]`                     | Runtime                  | Chọn default command hoặc default arguments                           |
| `LABEL`       | `LABEL org.opencontainers.image.revision=...` | Image metadata           | Thêm metadata phục vụ audit/provenance                                |

#### `FROM` Và `AS`

```dockerfile
FROM node:22.12-alpine3.20 AS build
```

- `node` là image repository.
- `22.12-alpine3.20` là tag.
- `AS build` đặt tên stage để instruction sau có thể tham chiếu.
- Mỗi `FROM` bắt đầu filesystem mới dựa trên image được chọn.

Pin tag cụ thể giúp build ít bị thay đổi bất ngờ. Tag vẫn có thể bị registry ghi đè; production có thể harden thêm bằng digest:

```dockerfile
FROM node:22.12-alpine3.20@sha256:<digest>
```

#### `WORKDIR`

```dockerfile
WORKDIR /workspace
RUN pnpm install
COPY package.json ./
```

Sau `WORKDIR`, relative paths được resolve từ `/workspace`. Nếu directory chưa tồn tại, Docker tạo nó.

Nên dùng `WORKDIR` thay vì:

```dockerfile
RUN cd /workspace && pnpm install
```

vì `cd` chỉ tồn tại trong một `RUN`; shell của instruction kế tiếp là process khác.

#### `COPY`, Build Context, `--from`, `--chown`

```dockerfile
COPY package.json pnpm-lock.yaml ./
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/bff /app
```

- Source của `COPY` thường nằm trong build context.
- Destination nằm trong image filesystem.
- `--from=build` đổi source từ host context sang filesystem của stage `build`.
- `--chown=user:group` đặt owner ngay khi copy, tránh thêm một `RUN chown` layer.
- `.dockerignore` quyết định file nào không được gửi vào build context.

Ưu tiên `COPY` thay vì `ADD`. Chỉ dùng `ADD` khi thật sự cần behavior bổ sung như tự extract local tar archive.

#### `RUN` Và Image Layers

```dockerfile
RUN corepack enable
RUN pnpm install --frozen-lockfile
```

`RUN` thực thi **lúc build**, không chạy mỗi lần container start. Files được tạo hoặc sửa sẽ trở thành một image layer.

Một `RUN` mới không giữ shell state của `RUN` trước:

```dockerfile
# Sai: biến shell export không tồn tại ở RUN sau
RUN export APP_MODE=production
RUN echo "$APP_MODE"
```

Dùng `ENV`, hoặc giữ các command phụ thuộc nhau trong cùng instruction:

```dockerfile
RUN export APP_MODE=production && echo "$APP_MODE"
```

#### `USER`

```dockerfile
RUN addgroup -g 1001 -S qrtable \
  && adduser -S qrtable -u 1001 -G qrtable
USER qrtable
```

`USER` ảnh hưởng đến:

- các `RUN` xuất hiện sau nó;
- runtime `ENTRYPOINT`/`CMD`;
- quyền đọc/ghi file trong container.

Vì package installation và user creation thường cần root, `USER qrtable` được đặt gần cuối runtime stage.

#### `EXPOSE` Không Phải Port Publishing

```dockerfile
EXPOSE 3300
```

`EXPOSE` chỉ là metadata: "application dự kiến listen port 3300". Nó không mở firewall và không map port ra host.

Muốn publish khi dùng `docker run`:

```bash
docker run -p 127.0.0.1:3300:3300 qrtable-bff:abc123
```

Muốn publish trong Compose:

```yaml
ports:
  - '127.0.0.1:3300:3300'
```

QRTable production không publish BFF trực tiếp; Caddy gọi `bff:3300` qua Docker network.

### 3.3 Shell Form, Exec Form, `CMD`, Và `ENTRYPOINT`

Docker hỗ trợ hai dạng command.

**Shell form:**

```dockerfile
RUN pnpm nx build bff
CMD node main.js
```

Docker chạy qua shell mặc định, thường là `/bin/sh -c`. Vì có shell nên dùng được:

- biến `$NAME`;
- pipe `|`;
- redirect `>`;
- `&&`, `||`;
- wildcard expansion.

**Exec form:**

```dockerfile
RUN ["corepack", "enable"]
CMD ["node", "main.js"]
```

Đây là JSON array. Docker gọi executable trực tiếp, không tự mở shell và không tự expand `$VARIABLE`.

| Instruction  | Build hay runtime? | Khuyến nghị                                                                     |
| ------------ | ------------------ | ------------------------------------------------------------------------------- |
| `RUN`        | Build              | Shell form tiện cho install/build command; exec form khi cần signal/argument rõ |
| `CMD`        | Runtime            | Ưu tiên exec form để app nhận signal trực tiếp                                  |
| `ENTRYPOINT` | Runtime            | Ưu tiên exec form                                                               |

`CMD` và `ENTRYPOINT` kết hợp như sau:

```dockerfile
ENTRYPOINT ["node"]
CMD ["main.js"]
```

Container mặc định chạy:

```text
node main.js
```

Khi chạy:

```bash
docker run IMAGE worker.js
```

argument từ CLI thay `CMD`, kết quả là:

```text
node worker.js
```

QRTable không cần entrypoint cố định, nên pattern đơn giản hơn là:

```dockerfile
CMD ["node", "main.js"]
```

Chỉ **`CMD` cuối cùng** trong một Dockerfile có hiệu lực.

### 3.4 `ARG`, `ENV`, Variable Expansion, Và Secret Scope

```dockerfile
ARG APP_NAME
ENV NODE_ENV=production
RUN pnpm nx build "$APP_NAME"
```

| Thuộc tính                 | `ARG`                          | `ENV`                                                               |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Có lúc build               | Có                             | Có                                                                  |
| Tồn tại khi container chạy | Không, trừ khi copy sang `ENV` | Có                                                                  |
| Truyền từ CLI              | `--build-arg`                  | `docker run -e` hoặc Compose `environment`                          |
| Phù hợp cho secret         | Không                          | Runtime secret có thể inject, nhưng không hardcode trong Dockerfile |
| Ví dụ QRTable              | `APP_NAME`, `VITE_BFF_URL`     | `NODE_ENV`, `PORT`                                                  |

`ARG` khai báo trước `FROM` chỉ dùng để parameterize `FROM`. Muốn dùng lại trong stage, cần khai báo lại:

```dockerfile
ARG NODE_VERSION=22.12
FROM node:${NODE_VERSION}-alpine AS build
ARG NODE_VERSION
RUN echo "$NODE_VERSION"
```

Copy build arg sang environment:

```dockerfile
ARG APP_NAME
ENV APP_NAME=$APP_NAME
```

sẽ làm giá trị tồn tại trong image/runtime. Chỉ làm với non-secret values.

Không dùng:

```dockerfile
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=$DATABASE_PASSWORD
```

Build args và image history không phải secret store. Production secrets phải được inject khi container start.

### 3.5 Multi-Stage Build — Pattern Quan Trọng Nhất

Multi-stage build là kỹ thuật dùng nhiều `FROM` trong một Dockerfile. Stage đầu build, stage cuối chỉ copy artifact cần thiết. Kết quả: final image nhỏ, không chứa dev tools.

```
Stage 1: base        → Node.js + pnpm setup
Stage 2: deps        → install toàn bộ dependencies
Stage 3: build       → nx build để tạo dist/
Stage 4: runtime     → Node.js + chỉ copy dist/ (không có source, không có node_modules dev)
```

**Tại sao quan trọng:**

- Image dev build: ~2GB (có source, node_modules, build tools)
- Image production (multi-stage): ~200–400MB (chỉ có dist/ + prod dependencies)
- Smaller image → pull nhanh hơn, attack surface nhỏ hơn

### 3.6 Backend Dockerfile — Pattern QRTable

QRTable dùng một Dockerfile duy nhất cho tất cả 8 NestJS services, parametric bằng `APP_NAME`:

```dockerfile
# syntax=docker/dockerfile:1.7

# Stage 1: Base environment với Node.js và pnpm
FROM node:22.12-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable          # kích hoạt pnpm mà không cần install riêng
WORKDIR /workspace

# Stage 2: Cài dependencies
# COPY package files trước source → cache pnpm install khi source thay đổi
FROM base AS deps
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
# Mount cache pnpm store → không re-download packages qua các builds
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build với Nx
FROM deps AS build
ARG APP_NAME
RUN test -n "$APP_NAME"      # fail sớm nếu APP_NAME rỗng
RUN pnpm nx build "$APP_NAME" --configuration=production
# Chỉ install production dependencies vào dist/
RUN pnpm --dir "dist/apps/$APP_NAME" install --prod --frozen-lockfile

# Stage 4: Runtime image nhỏ gọn
FROM node:22.12-alpine3.20 AS runtime
ARG APP_NAME
ENV NODE_ENV=production
WORKDIR /app
# Non-root user vì security principle of least privilege
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
# Chỉ copy dist/ từ stage build — không có source, không có dev dependencies
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/${APP_NAME} ./
USER qrtable
CMD ["node", "main.js"]
```

**Giải thích các quyết định:**

`node:22.12-alpine3.20` — alpine là minimal Linux distro (~5MB), không phải `node:22-alpine` (unpinned) hay `node:22` (debian, ~900MB).

`--frozen-lockfile` — bắt buộc dùng đúng version trong lockfile, không update silently.

`--mount=type=cache` — BuildKit cache pnpm store, không re-download packages giống nhau qua các builds khác nhau. Chỉ có với BuildKit, không phải legacy docker build.

Non-root user (`qrtable`, uid 1001) — principle of least privilege. Container không nên chạy với root vì nếu có security exploit, attacker có root trong container.

### 3.7 Next.js Standalone Build — Management App

Next.js có output mode `standalone` tạo ra một `server.js` self-contained với tất cả dependencies — không cần toàn bộ `node_modules`:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // ← thêm dòng này
};
```

Sau khi `next build`:

```
.next/standalone/        → server.js + minimal node_modules
.next/static/            → JS/CSS assets
public/                  → static files
```

**Tại sao quan trọng:** Next.js không standalone mode → cần copy toàn bộ `node_modules` (~500MB) vào image. Standalone mode → image runtime chỉ ~150MB.

```dockerfile
# docker/management-app.Dockerfile

FROM node:22.12-alpine3.20 AS deps
# ... (tương tự backend nhưng copy management-app riêng)

FROM deps AS build
# Build-time public vars phải có khi build, không thể inject runtime
ARG NEXT_PUBLIC_BFF_URL
ARG NEXT_PUBLIC_BFF_BASE_URL
ARG NEXT_PUBLIC_CUSTOMER_PWA_URL
ENV NEXT_PUBLIC_BFF_URL=$NEXT_PUBLIC_BFF_URL
ENV NEXT_PUBLIC_BFF_BASE_URL=$NEXT_PUBLIC_BFF_BASE_URL
ENV NEXT_PUBLIC_CUSTOMER_PWA_URL=$NEXT_PUBLIC_CUSTOMER_PWA_URL
RUN pnpm nx build management-app

FROM node:22.12-alpine3.20 AS runtime
WORKDIR /app
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
# Copy TỪNG phần — standalone, static, public
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/standalone ./
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/static ./apps/management-app/.next/static
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/public ./apps/management-app/public
USER qrtable
EXPOSE 3000
CMD ["node", "apps/management-app/server.js"]
```

### 3.8 Vite PWA Build — Customer PWA

Customer PWA là static site (Vite output = HTML + JS + CSS files). Runtime image dùng Nginx để serve static files:

```dockerfile
# docker/customer-pwa.Dockerfile

FROM node:22.12-alpine3.20 AS build
# ... install deps + build
ARG VITE_BFF_URL        # build-time only
ENV VITE_BFF_URL=$VITE_BFF_URL
RUN pnpm nx build customer-pwa
# Kết quả: apps/customer-pwa/dist/

FROM nginx:1.27-alpine AS runtime
COPY --from=build /workspace/apps/customer-pwa/dist /usr/share/nginx/html
COPY docker/nginx/customer-pwa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**SPA fallback configuration (quan trọng):** Vite PWA dùng React Router — khi user navigate trực tiếp đến `/scan?tenant=abc`, Nginx cần phục vụ `index.html` thay vì trả 404:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
}
```

### 3.9 Build-Time vs Runtime Environment — Điểm Quan Trọng Nhất

Đây là điểm gây nhầm lẫn nhất khi làm việc với Docker + frontend apps.

**Build-time variables (baked vào image):**

- `NEXT_PUBLIC_`\* — Next.js embed vào JS bundle khi build
- `VITE_*` — Vite embed vào JS bundle khi build
- Không thể thay đổi sau khi image được build

**Runtime variables (inject khi container start):**

- Backend env vars: `TYPEORM_HOST`, `REDIS_HOST`, `KAFKA_BROKERS`, ...
- Có thể thay đổi qua `docker-compose.app.yaml` `environment:` section

```
# ❌ Anti-pattern: build image với localhost values, dùng cho production
docker build --build-arg VITE_BFF_URL=http://localhost:3300 .
→ Image này sẽ fail ở production vì frontend cố gọi localhost

# ✅ Đúng: build image với production URL
docker build --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 .
→ Image này hoạt động ở production
```

**Hệ quả:** Một image Customer PWA chỉ dùng được với một production URL. Nếu sau này URL thay đổi, phải rebuild image. Đây là trade-off của Vite static build.

---

## 4. Docker Compose — Điều Phối Nhiều Service

### 4.1 YAML Syntax Nền Tảng

Compose file dùng YAML. YAML biểu diễn object bằng indentation, không dùng dấu `{}` như JSON trong hầu hết trường hợp.

```yaml
services: # mapping key
  bff: # nested mapping key
    image: qrtable-bff:v1 # scalar string
    networks: # key có sequence value
      - qrtable-edge # sequence item
      - qrtable-app
```

Các cấu trúc cần nhớ:

| YAML structure | Ví dụ                                  | Tương đương ý tưởng     |
| -------------- | -------------------------------------- | ----------------------- |
| Mapping        | `image: postgres:16`                   | Object key-value        |
| Nested mapping | `healthcheck: { ... }` dạng nhiều dòng | Object bên trong object |
| Sequence       | `- qrtable-app`                        | Array/list              |
| Scalar         | `"3300:3300"`, `true`, `30s`           | Một giá trị             |
| Comment        | `# internal only`                      | Bị parser bỏ qua        |

**Indentation là syntax.** Hai spaces là convention phổ biến. Không dùng tab.

```yaml
# Đúng
services:
  bff:
    image: qrtable-bff:v1

# Sai: image không nằm dưới bff
services:
  bff:
  image: qrtable-bff:v1
```

Quote các giá trị dễ bị YAML hiểu thành type khác:

```yaml
environment:
  KC_HTTP_ENABLED: 'true'
  PORT: '3300'
  PASSWORD_WITH_COLON: 'abc:def'
```

Environment variables trong container cuối cùng là strings. Quote giúp tránh YAML tự parse `true`, `false`, `yes`, số, hoặc ký tự đặc biệt.

### 4.2 Compose Object Model Và Top-Level Keys

Compose file mô tả **desired state**: service nào phải tồn tại, dùng image nào, nối network nào, mount volume nào, và start với config gì.

```yaml
name: qrtable-app

services:
  bff:
    image: ${REGISTRY}/bff:${TAG}

networks:
  qrtable-edge:
    external: true

volumes:
  postgres_data:

secrets:
  database_password:
    file: ./secrets/database_password.txt

configs:
  prometheus_config:
    file: ./docker/monitoring/prometheus.yml
```

| Top-level key | Vai trò                                                             |
| ------------- | ------------------------------------------------------------------- |
| `name`        | Compose project name; dùng để prefix container/network/volume names |
| `services`    | Các container workloads cần chạy                                    |
| `networks`    | Virtual networks cho service communication                          |
| `volumes`     | Persistent data stores do Docker quản lý                            |
| `secrets`     | Secret objects được mount vào container khi platform hỗ trợ         |
| `configs`     | Non-secret configuration files                                      |

Compose **service** là desired configuration, không phải container. Từ một service definition, Compose có thể create/recreate container.

### 4.3 Service Syntax Reference

```yaml
services:
  bff:
    image: ${REGISTRY}/bff:${TAG}
    build:
      context: .
      dockerfile: docker/backend.Dockerfile
      args:
        APP_NAME: bff
      target: runtime
    command: ['node', 'main.js']
    environment:
      NODE_ENV: production
    env_file:
      - /opt/qrtable/.env.production
    ports:
      - '127.0.0.1:3300:3300'
    expose:
      - '3300'
    volumes:
      - ./config:/app/config:ro
    networks:
      - qrtable-edge
      - qrtable-app
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ['CMD', 'wget', '-qO-', 'http://127.0.0.1:3300/api/v1/health/live']
      interval: 30s
      timeout: 5s
      retries: 5
      start_period: 30s
    restart: unless-stopped
    labels:
      app: bff
```

| Service key         | Ý nghĩa                                                                     |
| ------------------- | --------------------------------------------------------------------------- |
| `image`             | Image dùng để create container                                              |
| `build`             | Cách build image từ source; production deployment nên pull image đã release |
| `command`           | Override Dockerfile `CMD`                                                   |
| `entrypoint`        | Override Dockerfile `ENTRYPOINT`                                            |
| `environment`       | Inject/override runtime environment variables                               |
| `env_file`          | Load runtime environment variables từ file                                  |
| `ports`             | Publish container port ra host                                              |
| `expose`            | Document/internal port; không publish ra host                               |
| `volumes`           | Mount named volume hoặc host path                                           |
| `networks`          | Attach service vào Docker networks                                          |
| `depends_on`        | Startup ordering và optional health condition                               |
| `healthcheck`       | Command xác định `healthy`/`unhealthy`                                      |
| `restart`           | Chính sách restart khi process exit hoặc daemon restart                     |
| `labels`            | Metadata cho logging, discovery, operations                                 |
| `profiles`          | Chỉ enable service trong profile được chọn                                  |
| `user`              | Override UID/GID runtime                                                    |
| `read_only`         | Làm root filesystem read-only                                               |
| `tmpfs`             | Cấp writable memory-backed filesystem tạm                                   |
| `cap_drop`          | Bỏ Linux capabilities không cần thiết                                       |
| `security_opt`      | Bật security options như `no-new-privileges`                                |
| `init`              | Chạy init process nhỏ để forward signals/reap child processes               |
| `stop_grace_period` | Thời gian chờ graceful shutdown trước khi kill                              |

#### `image` Và `build`

```yaml
image: registry.digitalocean.com/qrtable/bff:abc123
```

Compose dùng image local nếu có, hoặc pull theo policy/command.

```yaml
build:
  context: .
  dockerfile: docker/backend.Dockerfile
  args:
    APP_NAME: bff
  target: runtime
```

- `context` giống dấu `.` của `docker build`.
- `dockerfile` chọn file.
- `args` map sang Dockerfile `ARG`.
- `target` chọn multi-stage target.

Phase 7 build image trong CI rồi push registry. Droplet dùng `image`, không build source, để deployment reproducible và nhanh hơn.

#### `command` Và `entrypoint`

Dockerfile:

```dockerfile
ENTRYPOINT ["node"]
CMD ["main.js"]
```

Compose:

```yaml
command: ['worker.js']
```

kết quả là `node worker.js`.

```yaml
entrypoint: ['/bin/sh', '-c']
command: ['node main.js && echo done']
```

override cả executable chính. Chỉ dùng khi có lý do rõ ràng, vì override có thể làm mất signal handling hoặc behavior chuẩn của image.

#### `ports` Và `expose`

Short syntax:

```yaml
ports:
  - '127.0.0.1:3300:3300'
```

Đọc từ trái sang phải:

```text
HOST_IP : HOST_PORT : CONTAINER_PORT
127.0.0.1:   3300   :      3300
```

- Bỏ `HOST_IP` thường bind trên mọi interface.
- `"3300:3300"` có thể làm service public nếu firewall cho phép.
- Chỉ `"3300"` để Docker chọn random host port, thường không phù hợp production.

`expose`:

```yaml
expose:
  - '3300'
```

không publish port ra host. Containers cùng network vẫn có thể gọi `bff:3300` dù không có `expose`, nên nó chủ yếu là documentation/metadata.

#### `volumes` Short Syntax

```yaml
volumes:
  - postgres_data:/var/lib/postgresql/data
  - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro
```

Format:

```text
SOURCE : CONTAINER_TARGET : MODE
```

- `postgres_data` là named volume.
- `./docker/postgres/init` là bind mount từ host.
- `:ro` là read-only; mặc định là read-write.

Bind mount che nội dung đã có tại container target. Nếu mount nhầm empty host directory lên `/app`, application files trong image có thể "biến mất" khỏi view của container.

#### `restart` Policies

| Policy           | Behavior                               |
| ---------------- | -------------------------------------- |
| `no`             | Không tự restart                       |
| `always`         | Luôn restart, kể cả sau daemon restart |
| `on-failure`     | Restart khi exit code khác 0           |
| `unless-stopped` | Restart trừ khi operator chủ động stop |

`restart` không sửa dependency failure. Nếu app restart liên tục vì DB schema thiếu, cần sửa root cause thay vì dựa vào restart loop.

#### Runtime Hardening Và Graceful Shutdown

```yaml
services:
  bff:
    user: '1001:1001'
    read_only: true
    tmpfs:
      - /tmp
    cap_drop:
      - ALL
    security_opt:
      - no-new-privileges:true
    init: true
    stop_grace_period: 30s
```

- `read_only: true` ngăn app ghi tùy ý vào image filesystem. Các path cần ghi phải là volume hoặc `tmpfs`.
- `tmpfs` nằm trong RAM và mất khi container stop; phù hợp temporary files, không phù hợp database data.
- `cap_drop: ALL` giảm kernel privileges; thêm lại capability chỉ khi app thật sự cần.
- `no-new-privileges` ngăn process lấy thêm privileges qua setuid/setgid.
- `init: true` giúp forward signals và thu gom zombie child processes.
- `stop_grace_period` cho NestJS thời gian đóng server, consumer và connection trước khi Docker gửi kill signal.

Tránh hardcode:

```yaml
container_name: bff
```

nếu không thật sự cần. Compose tự tạo tên theo project/service, còn service discovery dùng service name `bff`. Fixed `container_name` dễ collision và cản scaling nhiều replicas.

### 4.4 Variable Interpolation, `.env`, `env_file`, Và Precedence

Compose interpolation xảy ra khi YAML được parse:

```yaml
image: ${REGISTRY}/bff:${TAG}
```

Cú pháp thường dùng:

```text
${TAG}              bắt buộc lấy TAG hiện có, rỗng nếu không set
${TAG:-phase7}      dùng phase7 nếu TAG unset hoặc rỗng
${TAG-phase7}       dùng phase7 nếu TAG unset
${TAG:?TAG required} fail parse với message nếu TAG thiếu/rỗng
$$                  escape thành một dấu $ literal
```

Nguồn cho interpolation thường là shell environment, project `.env`, hoặc `docker compose --env-file FILE`.

**Quan trọng:** service `env_file` là chuyện khác:

```yaml
services:
  bff:
    env_file:
      - /opt/qrtable/.env.production
```

File này inject variables **vào container runtime**. Không nên giả định nó luôn cung cấp values để parse `${...}` ở toàn bộ Compose file.

Trong cùng service, `environment` override values từ `env_file`:

```yaml
env_file:
  - /opt/qrtable/.env.production
environment:
  REDIS_HOST: redis
```

Image `ENV` là default thấp hơn; runtime Compose values ghi đè nó.

Kiểm tra kết quả interpolation:

```bash
TAG=abc123 REGISTRY=registry.digitalocean.com/qrtable \
  docker compose -f docker-compose.app.yaml config
```

### 4.5 Compose Command Lifecycle

| Command                               | Làm gì                                         | Không làm gì                        |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------- |
| `docker compose pull`                 | Tải images                                     | Không create/start container        |
| `docker compose build`                | Build images có `build:`                       | Không pull release images thay bạn  |
| `docker compose create`               | Create containers                              | Không start                         |
| `docker compose start`                | Start containers đã tồn tại                    | Không apply thay đổi config mới     |
| `docker compose up -d`                | Reconcile desired state, create/recreate/start | Không đảm bảo app healthy           |
| `docker compose stop`                 | Stop containers                                | Không remove container/network      |
| `docker compose restart`              | Restart container hiện tại                     | Không apply image/config changes    |
| `docker compose down`                 | Stop và remove project containers/networks     | Không xóa named volumes mặc định    |
| `docker compose down -v`              | Down và xóa named volumes                      | Có thể xóa database data            |
| `docker compose ps`                   | Hiển thị state/health                          | Không kiểm tra business flow        |
| `docker compose logs -f SERVICE`      | Stream logs                                    | Không mở shell                      |
| `docker compose exec SERVICE CMD`     | Chạy command trong container đang chạy         | Fail nếu service chưa chạy          |
| `docker compose run --rm SERVICE CMD` | Tạo one-off container                          | Không chạy trong container hiện tại |
| `docker compose config`               | Render config cuối                             | Không start gì                      |

Điểm quan trọng trong deployment:

```bash
TAG=abc123 docker compose -f docker-compose.app.yaml pull
TAG=abc123 docker compose -f docker-compose.app.yaml up -d
```

`pull` tải artifact trước để giảm thời gian replacement. `up -d` thấy image/config thay đổi và recreate containers cần thiết.

Không dùng:

```bash
docker compose restart
```

để apply image tag mới. `restart` chỉ stop/start container hiện tại với config cũ.

### 4.6 Tại Sao Cần Docker Compose

`docker run` chỉ start một container. QRTable có 18+ services cần start theo đúng thứ tự, với đúng network, đúng volumes, đúng env vars. Docker Compose là tool khai báo tất cả điều đó trong YAML.

```yaml
services:
  bff:
    image: qrtable-bff:v1
    environment:
      REDIS_HOST: redis # service name → DNS name trong Docker network
    depends_on:
      redis:
        condition: service_healthy # chờ redis healthy mới start

  redis:
    image: redis:7.4.1-alpine
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
```

Docker Compose cung cấp:

- **Service discovery:** service name tự động là DNS name — `redis:6379` không phải IP.
- **Dependency ordering:** `depends_on` với conditions.
- **Network isolation:** services chỉ thấy nhau qua network được khai báo.
- **Volume management:** persistent storage tách khỏi container lifecycle.
- **Health checks:** container restart policy phụ thuộc vào health status.

### 4.7 Networks — Cô Lập Và Định Tuyến

Docker network trong QRTable Production tách public routing, identity, observability và datastore
traffic:

```yaml
qrtable-edge: # Caddy, BFF, Management App, Customer PWA
qrtable-identity: # Caddy, Keycloak, Authorizer/User-Access khi cần
qrtable-observability: # Caddy và monitoring stack
qrtable-data: # Datastores, internal services, metrics/traces
```

#### Sơ đồ: Network Topology QRTable Production

> Bốn network theo mục đích áp dụng defense in depth. Internet chỉ đến Caddy. Caddy chỉ reach các
> upstream edge, identity và observability đã phê duyệt, còn `qrtable-data` nằm ngoài proxy boundary.

```mermaid
graph LR
    subgraph "Internet"
        USER["👤 User Browser\nSePay Webhook"]
    end

    subgraph "qrtable-edge network"
        CADDY["Caddy Proxy\n:80/:443"]
        BFF["BFF :3300"]
        MGMT["Management App :3000"]
        PWA["Customer PWA :80"]
    end

    subgraph "qrtable-data network (internal)"
        ORDER["Order :3301"]
        CATALOG["Catalog :3305"]
        KITCHEN["Kitchen :3307"]
        PAYMENT["Payment :3308"]
        SAAS["SaaS :3306"]
        AUTH["Authorizer :3304"]
        UA["User-Access :3303"]
    end

    subgraph "qrtable-data / identity networks"
        PG["PostgreSQL :5432"]
        MONGO["MongoDB :27017"]
        REDIS["Redis :6379"]
        KAFKA["Kafka :9092"]
        KC["Keycloak :8080"]
    end

    subgraph "qrtable-observability network (internal)"
        GRAFANA["Grafana :3000"]
    end

    USER -->|"HTTPS 443"| CADDY
    CADDY --> BFF & MGMT & PWA & KC & GRAFANA
    BFF <-->|"TCP"| ORDER & CATALOG & KITCHEN & PAYMENT & SAAS & AUTH & UA
    ORDER & SAAS & PAYMENT & CATALOG --> PG
    UA --> MONGO
    ORDER & BFF & KITCHEN & PAYMENT & SAAS --> REDIS
    ORDER & KITCHEN & SAAS & BFF --> KAFKA
    AUTH & BFF --> KC

    style CADDY fill:#ff6b6b,stroke:#333,color:#fff
    style PG fill:#339af0,stroke:#333,color:#fff
    style REDIS fill:#ff4757,stroke:#333,color:#fff
    style KAFKA fill:#51cf66,stroke:#333,color:#fff
```

**Quy tắc network của QRTable:**

- **Chỉ Caddy** publish host ports 80/443 và UDP 443.
- **Caddy** join `qrtable-edge`, `qrtable-identity`, và `qrtable-observability`, không join
  `qrtable-data`.
- **BFF và frontends** dùng chung `qrtable-edge`; BFF còn join `qrtable-data` cho internal clients.
- **Keycloak** dùng `qrtable-identity` với Caddy và `qrtable-data` với PostgreSQL.
- **Grafana** dùng `qrtable-observability` với Caddy; Prometheus, Loki và Tempo vẫn private.
- **Datastores và internal services** dùng `qrtable-data`; không service nào publish host port.

Mỗi container có loopback riêng. Bên trong BFF container:

```text
localhost:6379
```

có nghĩa là port 6379 của chính BFF container, không phải Redis. Redis phải được gọi bằng DNS service name:

```text
redis:6379
```

Docker embedded DNS chỉ resolve service names khi hai containers chia sẻ ít nhất một network.

`internal: true` cô lập network khỏi external connectivity. Tuy nhiên Caddy cố ý bridge public edge
vào identity và observability network. Vì vậy Caddyfile chỉ được proxy Keycloak HTTP port và Grafana
HTTP port đã phê duyệt, không proxy datastore hoặc management port.

### 4.8 Volumes — Persistent Storage

Container filesystem là ephemeral — khi container bị xóa, data mất. Volumes lưu data ngoài container lifecycle:

```yaml
volumes:
  postgres_data: # PostgreSQL data files
  mongodb_data: # MongoDB data
  redis_data: # Redis AOF/RDB
  kafka_data: # Kafka KRaft data
  keycloak_data: # Keycloak themes và internal config
  caddy_data: # Let's Encrypt certificates (QUAN TRỌNG — mất đi phải request lại)
  caddy_config: # Caddy runtime config

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data # named volume
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro # bind mount (read-only)
```

**Named volume** (`postgres_data:`) — Docker quản lý, persist qua container recreate.
**Bind mount** (`./docker/...:/container/path`) — ánh xạ thư mục host vào container. Dùng cho config files, init scripts.
**tmpfs mount** — data nằm trong RAM, mất khi container stop. Dùng cho temporary files và writable path khi root filesystem read-only.

Container remove không xóa named volume. `docker compose down` cũng giữ named volumes mặc định. Chỉ `docker compose down -v` hoặc `docker volume rm` mới xóa chúng.

Volume ownership vẫn áp dụng Linux permissions. Nếu database image chạy UID khác owner của volume files, container có thể fail với `permission denied`. Không giải quyết bằng `chmod 777`; cần align UID/GID hoặc dùng initialization behavior của official image.

**Lưu ý đặc biệt với `caddy_data`:** Caddy lưu Let's Encrypt certificates ở đây. Nếu volume bị xóa, Caddy phải request cert mới từ Let's Encrypt. Rate limit của Let's Encrypt là 5 cert requests/domain/week — mất volume nhiều lần sẽ bị limit.

### 4.9 Health Checks — Dependency Ordering Đúng Đắn

```yaml
postgres:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d qrtable_bootstrap']
    interval: 10s # check mỗi 10 giây
    timeout: 5s # timeout sau 5 giây
    retries: 10 # fail sau 10 lần fail
    start_period: 30s # grace period khi container mới start

order:
  depends_on:
    postgres:
      condition: service_healthy # chờ postgres healthy
    redis:
      condition: service_healthy
    kafka:
      condition: service_started # kafka không có official health check
```

**Tại sao `service_healthy` quan trọng hơn `service_started`?**
`service_started` chỉ nghĩa là container process đã start. PostgreSQL có thể đang initializing database trong 30 giây sau khi start — nếu Order service connect lúc này sẽ fail. `service_healthy` đảm bảo PostgreSQL đã sẵn sàng nhận connections.

`healthcheck.test` có hai dạng:

```yaml
# Exec form: không có shell expansion
test: ["CMD", "redis-cli", "ping"]

# Shell form: chạy qua /bin/sh -c, dùng được $VAR, &&, pipe
test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} || exit 1"]
```

Trong Compose string, `$$` escape để `$` được truyền vào container thay vì bị Compose interpolate trên host.

Ý nghĩa timing:

| Field          | Ý nghĩa                                                                        |
| -------------- | ------------------------------------------------------------------------------ |
| `interval`     | Khoảng thời gian giữa hai lần check                                            |
| `timeout`      | Một lần check được phép chạy bao lâu                                           |
| `retries`      | Số lần fail liên tiếp trước khi thành `unhealthy`                              |
| `start_period` | Grace period cho app khởi động; failures ban đầu không bị tính như bình thường |

Healthcheck exit code `0` là success. Non-zero là failure.

**Giới hạn quan trọng:** `depends_on: condition: service_healthy` chỉ điều phối startup. Nếu PostgreSQL chết sau khi Order đã start, Compose không tự hiểu business dependency và không tự restart Order theo dependency graph. Application vẫn cần retry/reconnect logic và monitoring.

### 4.10 Layered Compose — Tách Concerns

QRTable dùng 4 compose files riêng biệt, mỗi file có responsibility rõ ràng:

| File                             | Chứa gì                                     | Start bằng cách nào                                      |
| -------------------------------- | ------------------------------------------- | -------------------------------------------------------- |
| `docker-compose.infra.yaml`      | PostgreSQL, MongoDB, Redis, Kafka, Keycloak | `docker compose -f docker-compose.infra.yaml up -d`      |
| `docker-compose.app.yaml`        | 8 NestJS services + 2 frontend apps         | `docker compose -f docker-compose.app.yaml up -d`        |
| `docker-compose.proxy.yaml`      | Caddy reverse proxy                         | `docker compose -f docker-compose.proxy.yaml up -d`      |
| `docker-compose.monitoring.yaml` | Prometheus, Loki, Promtail, Tempo, Grafana  | `docker compose -f docker-compose.monitoring.yaml up -d` |

**Lý do tách:**

- Deploy mới: chỉ cần restart `docker-compose.app.yaml` — infra không cần restart
- Update config proxy: chỉ restart `docker-compose.proxy.yaml` — apps không downtime
- Monitoring optional: có thể tắt monitoring layer khi cần tiết kiệm RAM

**External networks:** Các compose file khác nhau communicate qua shared networks:

```yaml
# docker-compose.proxy.yaml
networks:
  qrtable-edge:
    external: true # created by docker-compose.app.yaml
    name: qrtable-edge
```

### 4.11 Compose Validation — Tại Sao `docker compose config` Là Preflight Bắt Buộc

`docker compose config` đọc compose file, resolve biến môi trường, merge overrides, và in ra cấu hình cuối cùng mà Docker sẽ dùng. Đây là lệnh rẻ nhất để bắt lỗi trước khi thật sự thay container.

Nó bắt được các lỗi như:

- YAML sai indentation hoặc sai type.
- Biến `${TAG}`, `${REGISTRY}`, `${POSTGRES_USER}` chưa được set.
- Network external chưa tồn tại hoặc đặt nhầm tên.
- Service reference sai tên, ví dụ app trỏ `postgresql` nhưng service thật là `postgres`.
- Port hoặc volume mapping bị viết sai cú pháp.

Phase 7 preflight nên render tất cả layer cùng nhau:

```bash
docker compose --env-file docker/env/.env.production \
  -f docker-compose.infra.yaml \
  -f docker-compose.app.yaml \
  -f docker-compose.monitoring.yaml \
  -f docker-compose.proxy.yaml \
  config -q
```

**Mental model:** `docker compose config` không chứng minh service chạy được. Nó chỉ chứng minh deployment declaration có thể render hợp lệ. Sau đó vẫn cần `docker compose ps`, logs, health checks, và smoke tests.

---

## 5. Kiến Trúc 4 Lớp Của QRTable Production

### 5.1 Thứ Tự Start — Không Thể Tùy Tiện

```
1. docker compose -f docker-compose.infra.yaml up -d
   → Postgres healthy → MongoDB healthy → Redis healthy → Kafka started → Keycloak started
   → Keycloak connect Postgres để bootstrap database
   → Cần đợi vài phút cho Keycloak init hoàn tất

2. docker compose -f docker-compose.monitoring.yaml up -d
   → Prometheus, Loki, Promtail, Tempo, Grafana start
   → Promtail bắt đầu collect log từ containers (kể cả infra layer)

3. docker compose -f docker-compose.app.yaml up -d
   → All services start với explicit per-service environment mappings
   → BFF đợi tất cả microservices TCP reachable

4. docker compose -f docker-compose.proxy.yaml up -d
   → Caddy start, request Let's Encrypt certs
   → HTTPS live cho api, app, qr, auth, grafana subdomains
```

**Tại sao monitoring trước app?** Promtail cần nhìn thấy Docker containers khi chúng start để collect log từ đầu. Nếu start monitoring sau app, các log từ lúc start sẽ bị miss.

**Tại sao proxy cuối cùng?** Caddy sẽ request Let's Encrypt certificate khi start — DNS phải đã resolve về Droplet IP. Nếu proxy start trước khi DNS propagate, cert request sẽ fail.

### 5.2 Port Exposure Strategy — Chỉ 80 Và 443 Public

```
Droplet public ports:
  80/tcp  → Caddy (HTTP → HTTPS redirect)
  443/tcp → Caddy (HTTPS termination)
  22/tcp  → SSH (restrict đến your IP only)

Tất cả ports sau KHÔNG được Compose publish:
  3300-3308    NestJS HTTP ports
  3201-3208    NestJS TCP ports
  5432         PostgreSQL
  6379         Redis
  27017        MongoDB
  9092         Kafka
  8080         Keycloak HTTP (đi qua Caddy → auth.domain)
  9000         Keycloak management/health (không đi qua Caddy)
  3000         Grafana (đi qua Caddy → grafana.domain)
  3100, 9090, 3200, 4318  Monitoring (không expose ra ngoài)
```

**Nguyên tắc:** Mọi service đều internal. Chỉ Caddy tiếp xúc với internet. Caddy làm TLS termination và forward về internal service qua Docker network.

### 5.3 Monitoring Layer — Quan Sát Được Nhưng Không Public

Monitoring production có hai mục tiêu tưởng như ngược nhau:

1. Team phải xem được logs, metrics, traces khi hệ thống có lỗi.
2. Người ngoài không được truy cập dữ liệu quan sát, vì logs và traces có thể chứa tenant id, route, error message, provider response, hoặc metadata thanh toán.

Vì vậy Phase 7 dùng policy:

| Component  | Public không?                    | Cách truy cập                              |
| ---------- | -------------------------------- | ------------------------------------------ |
| Grafana    | Có, nhưng qua HTTPS + basic auth | `grafana.qrtable.vodinhquan.dev` qua Caddy |
| Prometheus | Không                            | Internal Docker network only               |
| Loki       | Không                            | Internal Docker network only               |
| Tempo      | Không                            | Internal Docker network only               |
| Promtail   | Không có UI                      | Đọc Docker logs nội bộ                     |

Prometheus production phải scrape bằng service name, không dùng `host.docker.internal`:

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
```

**Mental model:** Grafana là cửa sổ để quan sát. Prometheus/Loki/Tempo là kho dữ liệu nội bộ. Public Grafana đã là một rủi ro, nên phải có HTTPS, auth, strong password, và có thể thêm IP restriction sau thesis.

---

## 6. Reverse Proxy và HTTPS

### 6.1 Tại Sao Cần Reverse Proxy

Không có reverse proxy, muốn serve HTTPS cho 5 subdomains phải:

- Handle TLS certificate cho từng domain trong mỗi app
- Mỗi app tự quản lý cert renewal
- Mỗi app cần expose port riêng ra internet

Với Caddy làm reverse proxy:

- Một điểm TLS termination duy nhất
- Tự động request và renew Let's Encrypt certs
- Tất cả services internal, chỉ Caddy public

### 6.2 Caddy vs Nginx — Tại Sao Chọn Caddy

**Nginx** là reverse proxy phổ biến nhất nhưng có một friction point quan trọng: TLS/Let's Encrypt không tự động. Cần:

1. Install Certbot riêng
2. Config Nginx server block
3. Chạy `certbot --nginx`
4. Setup cron job renewal
5. Kiểm tra renewal log định kỳ

**Caddy** tự động toàn bộ quá trình TLS:

1. Viết Caddyfile — chỉ cần domain name và backend
2. Start Caddy
3. Caddy tự request cert, tự renew

```caddyfile
api.qrtable.vodinhquan.dev {
  @bff path /api/v1 /api/v1/* /socket.io /socket.io/*
  reverse_proxy @bff bff:3300
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
  basic_auth bcrypt {
    {$GRAFANA_BASIC_AUTH_USER} {$GRAFANA_BASIC_AUTH_HASH}
  }
  reverse_proxy grafana:3000 {
    header_up -Authorization
  }
}
```

Caddyfile tracked không chứa password. Sinh bcrypt hash trực tiếp vào protected server environment:

```bash
docker run --rm -it caddy:2.10.2-alpine caddy hash-password
```

Lưu output thành `GRAFANA_BASIC_AUTH_HASH` trong `/opt/qrtable/.env.production` với mode `0600`.
Grafana vẫn yêu cầu login riêng sau outer Caddy basic-auth gate.

Validate production file với hash thật trước DNS cutover:

```bash
docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.infra.yaml \
  -f docker-compose.app.yaml \
  -f docker-compose.monitoring.yaml \
  -f docker-compose.proxy.yaml \
  config -q

docker compose --env-file /opt/qrtable/.env.production \
  -f docker-compose.proxy.yaml \
  run --rm --no-deps caddy \
  caddy validate --config /etc/caddy/Caddyfile --adapter caddyfile
```

Config validation không request certificate. Public certificate issuance chỉ được chứng minh ở Task
11 sau khi năm DNS records trỏ về Droplet, TCP 80/443 và UDP 443 được mở, và Caddy start với
protected production environment.

Đây là equivalent Nginx config với manual TLS:

```nginx
server {
  listen 443 ssl;
  server_name api.qrtable.vodinhquan.dev;
  ssl_certificate /etc/letsencrypt/live/api.qrtable.vodinhquan.dev/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/api.qrtable.vodinhquan.dev/privkey.pem;
  # ... ssl_protocols, ssl_ciphers, HSTS headers...
  location / { proxy_pass http://bff:3300; ... }
}
```

Caddy là lựa chọn đúng cho single-host pilot khi team chưa có Nginx/cert rotation experience.

### 6.3 TLS và Let's Encrypt — Nguyên Lý Hoạt Động

Let's Encrypt là Certificate Authority miễn phí. Caddy dùng **ACME protocol** để tự động verify ownership của domain và nhận certificate:

```
1. Caddy request cert cho api.qrtable.vodinhquan.dev từ Let's Encrypt
2. Let's Encrypt gửi challenge: "Serve file này tại http://domain/.well-known/acme-challenge/token"
3. Caddy tự serve file challenge
4. Let's Encrypt verify → issue certificate (valid 90 ngày)
5. Caddy tự renew 30 ngày trước khi hết hạn
```

**Điều kiện tiên quyết:**

- DNS A record đã trỏ đúng về Droplet IP
- Port 80 và 443 open trên Droplet firewall
- Domain đã propagate (dig thấy đúng IP)

**Rate limit:** Let's Encrypt cho phép tối đa 5 cert requests/domain/week. Nếu test quá nhiều lần trong khi debug, có thể bị rate limit. Dùng staging environment của Let's Encrypt khi test.

### 6.4 WebSocket Proxying — Đặc Thù Của QRTable

BFF dùng Socket.IO tại `/socket.io` với namespace `/orders`. Caddy tự động handle HTTP upgrade và
bidirectional tunnel bằng `reverse_proxy`; không cần tự đặt `Upgrade` hoặc `Connection` header. CORS
vẫn do BFF HTTP/Socket.IO allowlist quản lý.

Nếu dùng Nginx, cần explicit:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## 7. Secrets và Environment Management

### 7.1 Ba Loại Secrets Trong QRTable

Phân loại rõ ràng quyết định secrets được handle như thế nào:

**Loại 1 — Build-time public vars (OK trong image):**

```
NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
```

Được embed vào JS bundle. Bất kỳ ai cũng xem được trong browser DevTools. Không chứa thông tin nhạy cảm.

**Loại 2 — Runtime secrets (inject khi container start, KHÔNG bao giờ commit):**

```
POSTGRES_PASSWORD=...
KEYCLOAK_ADMIN_PASSWORD=...
AUTH_SECRET=...
SEPAY_OAUTH_CLIENT_SECRET=...
PAYMENT_SECRETS_ENCRYPTION_KEY=...
```

Chỉ có trên server, trong `/opt/qrtable/.env.production` với permission 0600.

**Loại 3 — Provider values (từ external services, không generate được):**

```
SEPAY_OAUTH_CLIENT_ID=...
CLOUDINARY_CLOUD_NAME=...
KEYCLOAK_CLIENT_SECRET=...  (sau khi bootstrap Keycloak)
```

### 7.2 `.env` File Syntax

Portable format:

```dotenv
# Comment
NODE_ENV=production
PORT=3300
AUTH_SECRET="value with spaces"
DATABASE_URL='postgresql://user:password@postgres:5432/qrtable'
EMPTY_VALUE=
```

Rules nên dùng:

- Mỗi dòng là `KEY=value`.
- Blank lines và dòng bắt đầu bằng `#` được bỏ qua.
- Quote values có spaces hoặc ký tự dễ gây parse ambiguity.
- Values cuối cùng là strings.
- Không viết command substitution như `PASSWORD=$(openssl rand -hex 32)` và mong Compose chạy nó. Generate trước rồi ghi value.
- Không coi `.env.production` là encrypted; permission `0600` chỉ giới hạn filesystem access.

Password có `$` cần được kiểm tra cẩn thận vì Compose interpolation cũng dùng `$`. Luôn chạy `docker compose config` theo cách không làm lộ secret output vào public CI logs.

### 7.3 Nguyên Tắc Bất Biến: Không Bao Giờ Commit Secrets

```
# ❌ Anti-pattern — commit .env với real secrets
git add .env.production
git commit -m "add production env"
# → Secrets trong git history mãi mãi, dù đã xóa file sau

# ✅ Đúng — commit chỉ .env.example với placeholder values
docker/env/.env.production.example  ← commit cái này (template với keys, không có values)
/opt/qrtable/.env.production        ← chỉ tồn tại trên server, trong .gitignore
```

**Docker ARG vs ENV với secrets:**

```dockerfile
# ❌ Sai — secret trong build arg bị lưu trong image history
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=$DATABASE_PASSWORD

# ✅ Đúng — secret chỉ inject runtime qua env_file
# Không có gì về secret trong Dockerfile
```

### 7.4 Secret Management Thực Tế Cho QRTable

```bash
# Tạo server (một lần duy nhất)
# Copy template
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production

# Generate random secrets
openssl rand -hex 32  # → 64 chars cho PAYMENT_SECRETS_ENCRYPTION_KEY
openssl rand -base64 32  # → 44 chars cho passwords, AUTH_SECRET

# Điền vào /opt/qrtable/.env.production bằng nano/vim
nano /opt/qrtable/.env.production

# Verify permissions
ls -la /opt/qrtable/.env.production
# -rw------- 1 user user ... .env.production (0600)
```

**Trong docker-compose.app.yaml:**

```yaml
services:
  bff:
    env_file: /opt/qrtable/.env.production # load file từ server
    environment: # override cụ thể từng service
      REDIS_HOST: redis
      ORDER_SERVICE_HOST: order
      # ... host/port values per-service, override giá trị trong env_file
```

`env_file` load tất cả vars từ file. `environment` ghi đè. Pattern này cho phép có một env file chung cho toàn bộ stack, nhưng mỗi service override những gì cần thiết (host names, ports).

---

## 8. DigitalOcean Deployment — Hạ Tầng Và Provisioning

### 8.1 Droplet Sizing và Lý Do

| Tier                | Config                        | Use case                                |
| ------------------- | ----------------------------- | --------------------------------------- |
| Budget smoke        | 2 vCPU / 4 GiB                | Demo windows, monitoring tắt            |
| Pilot (recommended) | 4 vCPU / 8 GiB                | Thesis demo, monitoring bật, full stack |
| Hardening           | 4+ vCPU / 8+ GiB + managed DB | Sau thesis khi cần data safety          |

**Tại sao 4 vCPU / 8 GiB cho pilot?** Keycloak ngốn ~512MB RAM riêng, Kafka + ZK ~1GB, PostgreSQL ~256MB, monitoring stack ~1GB, 8 NestJS services ~64–128MB mỗi cái. Tổng: 4–6 GiB. 8 GiB để có headroom.

**Region `sgp1` (Singapore):** Gần nhất với Vietnam → latency thấp nhất. Kiểm tra availability vì không phải mọi DO product đều có ở mọi region.

### 8.2 Cloud Firewall — Defense Layer Đầu Tiên

DigitalOcean Cloud Firewall là network-level firewall, chặn traffic trước khi đến Droplet:

```
Inbound rules:
  TCP 22   → Source: Your IP only (SSH)
  TCP 80   → Source: All IPv4, All IPv6
  TCP 443  → Source: All IPv4, All IPv6

Deny tất cả còn lại:
  TCP 3300-3308  (NestJS HTTP) → DENY
  TCP 3201-3208  (NestJS TCP)  → DENY
  TCP 5432       (PostgreSQL)  → DENY
  TCP 6379       (Redis)       → DENY
  TCP 27017      (MongoDB)     → DENY
  TCP 9092       (Kafka)       → DENY
  TCP 3000-3001  (Grafana)     → DENY
  TCP 9090       (Prometheus)  → DENY
```

**Tại sao Cloud Firewall tốt hơn chỉ dựa vào Docker network?** Defense in depth — hai lớp bảo vệ. Nếu config Docker network sai (ví dụ vô tình expose PostgreSQL port), Cloud Firewall vẫn chặn từ network layer bên ngoài.

### 8.3 Docker Engine Installation — Từ Official Repository

Ubuntu package manager có `docker.io` (version cũ của Ubuntu). Cần cài từ Docker official repo để có phiên bản mới nhất:

```bash
# Thêm Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Thêm Docker repository
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
  | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Install Docker Engine + Compose plugin
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin

# Verify
docker --version           # Docker Engine version
docker compose version     # Docker Compose plugin version
```

`**docker compose` (plugin) vs `docker-compose` (legacy standalone):\*\*
Modern Docker dùng `docker compose` (khoảng cách, không có dấu gạch ngang) — đây là plugin built-in. `docker-compose` là standalone binary cũ hơn. Phase 7 dùng plugin.

### 8.4 DNS Configuration

Trước khi start Caddy, DNS phải resolve đúng:

```bash
# Tạo A records trong DigitalOcean DNS (hoặc domain registrar):
api.qrtable.vodinhquan.dev  → <Droplet IPv4>
app.qrtable.vodinhquan.dev  → <Droplet IPv4>
qr.qrtable.vodinhquan.dev   → <Droplet IPv4>
auth.qrtable.vodinhquan.dev → <Droplet IPv4>
grafana.qrtable.vodinhquan.dev → <Droplet IPv4>

# Verify propagation (có thể mất 5-30 phút)
dig +short api.qrtable.vodinhquan.dev
# Phải trả về Droplet IP
```

**TTL recommendation:** Khi setup lần đầu, set TTL thấp (60–300 giây) để nếu IP sai có thể sửa nhanh. Sau khi stable, set TTL cao hơn (3600 giây).

### 8.5 Server Layout Và Preflight Checks

Production server cần một layout ổn định để deploy script không phụ thuộc vào thư mục tạm của user:

```text
/opt/qrtable/
  docker-compose.infra.yaml
  docker-compose.app.yaml
  docker-compose.proxy.yaml
  docker-compose.monitoring.yaml
  docker/
  tools/deploy/
  releases/
    current
    history.log
  backups/

/opt/qrtable/.env.production     # private, permission 0600
```

Preflight là bước kiểm tra trước khi thay đổi production state. Nó nên fail sớm nếu thiếu điều kiện:

```bash
test -f /opt/qrtable/.env.production
test "$(stat -c %a /opt/qrtable/.env.production)" = "600"
test -n "${IMAGE_TAG:-}"
docker compose -f docker-compose.app.yaml config > /dev/null
docker login registry.digitalocean.com
docker pull "registry.digitalocean.com/qrtable/bff:${IMAGE_TAG}"
```

**Không nhầm preflight với smoke test:**

| Loại check   | Chạy khi nào              | Trả lời câu hỏi                                      |
| ------------ | ------------------------- | ---------------------------------------------------- |
| Preflight    | Trước deploy              | Có đủ điều kiện để deploy an toàn không?             |
| Health check | Trong container lifecycle | Process có đang sẵn sàng phục vụ không?              |
| Smoke test   | Sau deploy, từ bên ngoài  | Người dùng/provider có gọi được hệ thống thật không? |

---

## 9. Database Và Migration Strategy

### 9.1 Đã Giải Quyết — Per-Service TypeORM Migrations

Development, staging và production đều dùng `TYPEORM_SYNCHRONIZE=false`. Catalog, Order, Payment và SaaS có TypeORM DataSource, migration folder và Nx migration targets riêng.

```bash
pnpm db:migrate
pnpm db:migration:show
pnpm nx run order:migration:run
pnpm nx run order:migration:revert
pnpm db:verify:ownership
```

Production deploy phải chạy `pnpm db:migrate` trước khi start app containers. Migration fail thì deployment phải dừng.

Task 9 đóng gói rule này vào one-shot Compose job có thể rerun:

```bash
pnpm deploy:bootstrap:compose
docker compose --env-file /opt/qrtable/.env.production -f docker-compose.app.yaml up -d --wait
```

Service `production-bootstrap` dùng image `tooling-${IMAGE_TAG}` và chạy theo đúng thứ tự:

1. `pnpm db:migrate`
2. `pnpm db:migration:show`
3. `pnpm db:verify:ownership`
4. `pnpm kafka:provision:topics`
5. `pnpm auth:bootstrap:keycloak`

Script dùng `set -euo pipefail`, còn Compose helper dùng `--exit-code-from production-bootstrap`,
nên bất kỳ lỗi migration, ownership, Kafka hoặc Keycloak nào cũng dừng deployment. App containers
trong `docker-compose.app.yaml` cũng phụ thuộc `production-bootstrap` với
`service_completed_successfully`; clean app startup không thể bypass bootstrap gate.

Kafka topic provisioning là idempotent và dùng canonical topic registry trong
`libs/constants/src/lib/kafka-topic.constants.ts`.

Keycloak production bootstrap cũng idempotent. Nó update realm settings, clients, redirect URIs, web
origins, roles, service-account permissions và protocol mappers. Demo-user creation được tách sang
`pnpm auth:bootstrap:demo-users` và bị từ chối khi `NODE_ENV=production`.

### 9.2 Multi-Database Strategy

QRTable dùng một PostgreSQL instance nhưng nhiều databases (không phải schemas):

```sql
-- docker/postgres/init/001-create-service-databases.sql
CREATE DATABASE qrtable_catalog;
CREATE DATABASE qrtable_order;
CREATE DATABASE qrtable_saas;
CREATE DATABASE qrtable_payment;
```

**Tại sao nhiều database thay vì một?** Isolation tốt hơn. Khi hardening sau thesis, dễ move từng service sang managed PostgreSQL riêng nếu cần.

### 9.3 Seed Data Cho Demo

Workflow seed phá hủy chỉ dành cho local development và demo:

```bash
pnpm dev:reseed -- --yes
pnpm dev:verify-seed
```

Nó chỉ reset bốn target service databases và giữ nguyên legacy `qrtable`. Không chạy `db:reset:dev` hoặc `dev:reseed` trên staging/production.

Production demo data phải đi qua path riêng, opt-in, non-destructive và idempotent. Default
production bootstrap không seed demo users và không reset passwords.

### 9.4 Backup Và Data Rollback — Khác Với App Rollback

App rollback và data rollback là hai chuyện khác nhau.

**App rollback** đổi container image đang chạy:

```bash
TAG=previous-good docker compose -f docker-compose.app.yaml up -d
```

Thao tác này nhanh vì nó chỉ thay process/app code. Named volumes của PostgreSQL, MongoDB, Redis, Kafka vẫn giữ nguyên.

**Data rollback** khôi phục database về trạng thái cũ. Đây là thao tác rủi ro hơn vì có thể mất orders, payments, subscriptions, webhook audit, hoặc dữ liệu tenant mới phát sinh sau backup.

Phase 7 cần cả hai lớp backup:

| Backup type                                | Dùng cho                             | Trade-off                                        |
| ------------------------------------------ | ------------------------------------ | ------------------------------------------------ |
| DigitalOcean Droplet backup/snapshot       | Host-level recovery khi Droplet hỏng | Khôi phục nguyên máy, chậm hơn, coarse-grained   |
| Logical DB backup (`pg_dump`, `mongodump`) | Khôi phục từng DB/service            | Dễ kiểm soát hơn, cần script và retention policy |

Data restore chỉ nên chạy khi operator đã xác nhận:

- backup timestamp chính xác;
- app layer đã stop để không ghi thêm data;
- ảnh hưởng đến payment/subscription state được hiểu rõ;
- restore xong sẽ chạy smoke tests và kiểm tra audit logs.

**Rule:** rollback workflow mặc định chỉ rollback app image. Không tự restore database trừ khi có input riêng và confirmation rõ ràng.

---

## 10. CI/CD Pipeline — Release, Deploy, Rollback

### 10.1 Tại Sao CI/CD Là First-Class Citizen

CI/CD không chỉ là automation convenience — nó giải quyết ba vấn đề cốt lõi:

**Safety:** Không ai có thể deploy code chưa pass tests. Không ai có thể deploy code có lint errors. Gate tự động ngăn chặn lỗi dễ tránh.

**Immutability:** Mỗi deploy dùng một image tag cụ thể (git SHA). Biết chính xác code nào đang chạy trên production. Rollback = deploy lại tag cũ.

**Auditability:** Ai deploy, lúc nào, commit nào, smoke test pass không — tất cả trong GitHub Actions history.

**CI** trả lời: code có đủ chất lượng để merge hoặc release không?

**CD** trả lời: artifact đã được kiểm chứng có thể đi đến môi trường nào, bằng quy trình nào, với ai approve?

Trong QRTable, không gộp hai câu hỏi này vào một workflow lớn. CI có thể chạy trên mọi PR. Release image chỉ tạo artifact. Deploy production là action riêng, có approval, backup, preflight, smoke, và audit.

### 10.2 GitHub Actions Building Blocks

| Khái niệm     | Ý nghĩa                               | QRTable dùng như thế nào                                            |
| ------------- | ------------------------------------- | ------------------------------------------------------------------- |
| `on`          | Trigger workflow                      | PR/push cho CI, `workflow_dispatch` cho release/deploy/rollback     |
| `jobs`        | Đơn vị chạy độc lập                   | `quality-gate`, `release`, `deploy`, `rollback`                     |
| `needs`       | Job dependency                        | Deploy chỉ chạy sau build/release khi workflow chung cần dependency |
| `permissions` | Quyền của `GITHUB_TOKEN`              | Release chỉ cần `contents: read`, registry permission/token riêng   |
| `secrets`     | Giá trị nhạy cảm do GitHub lưu        | DO token, SSH key, SSH host/user                                    |
| `environment` | Deployment target có protection rules | `production` cần required reviewers                                 |
| `concurrency` | Chặn nhiều deploy cùng lúc            | Chỉ cho một production deploy/rollback chạy tại một thời điểm       |
| `inputs`      | Tham số manual trigger                | `image_tag`, `run_smoke`, `run_backup`, `rollback_tag`              |

GitHub Actions environments có ý nghĩa đặc biệt: khi job khai báo `environment: production`, job đó chỉ bắt đầu sau khi protection rules pass, và lúc đó environment secrets mới được cấp cho job. Đây là lý do production deploy workflow phải đặt `environment: production`, không chỉ đặt tên job là deploy.

Production workflow nên có concurrency:

```yaml
concurrency:
  group: qrtable-production
  cancel-in-progress: false
```

`cancel-in-progress: false` giúp tránh trường hợp một deploy đang chạy bị deploy sau hủy giữa chừng, làm production ở trạng thái nửa cũ nửa mới.

### 10.3 Pipeline Architecture — Ba Workflow Riêng Biệt

#### Sơ đồ: CI/CD Pipeline QRTable — Ba Workflow

> Ba workflow tách biệt về concern. CI là quality gate cho mọi PR. Release Images build artifact immutable. Deploy Production thực sự deploy với approval gate. Rollback là quy trình riêng, không phải một step trong deploy.

```mermaid
graph TB
    subgraph "Workflow 1: CI (quality gate)"
        PR["Pull Request / Push to main"]
        LINT["nx run-many: lint"]
        TEST["nx run-many: test"]
        BUILD["nx run-many: build"]
        ANCHORS["verify:doc-anchors"]

        PR --> LINT --> TEST --> BUILD --> ANCHORS
        ANCHORS -->|"CI green"| CI_OK["✅ CI Passed"]
    end

    subgraph "Workflow 2: Release Images"
        TRIGGER_R["workflow_dispatch\nor push to main"]
        INPUT_TAG["Input: image_tag\n(default: git SHA)"]
        LOGIN["Login to DO Registry"]
        BUILD_IMG["Build all 10 images\nwith APP_NAME / build args"]
        PUSH["Push to registry\nwith immutable tag"]
        DIGEST["Emit image digest summary"]

        TRIGGER_R --> INPUT_TAG --> LOGIN --> BUILD_IMG --> PUSH --> DIGEST
    end

    subgraph "Workflow 3: Deploy Production"
        TRIGGER_D["workflow_dispatch\n(manual)"]
        APPROVAL["GitHub Environment: production\nRequired reviewer approval"]
        BACKUP["Optional: backup before deploy"]
        PREFLIGHT["phase7-preflight.sh\n(schema ready? env exists?)"]
        SSH_PULL["SSH: docker compose pull TAG"]
        SSH_UP["SSH: docker compose up -d"]
        SMOKE["Smoke tests từ GitHub runner"]
        AUDIT["Record: tag, sha, timestamp\n→ releases/current"]

        TRIGGER_D --> APPROVAL --> BACKUP --> PREFLIGHT --> SSH_PULL --> SSH_UP --> SMOKE --> AUDIT
    end

    CI_OK -.->|"prerequisite"| TRIGGER_R
    DIGEST -.->|"image available"| TRIGGER_D

    style CI_OK fill:#51cf66,stroke:#333,color:#fff
    style APPROVAL fill:#ffd93d,stroke:#333,color:#333
    style SMOKE fill:#339af0,stroke:#333,color:#fff
```

### 10.4 Workflow 1 — CI: Quality Gate

```yaml
# .github/workflows/ci.yml
name: CI
on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  quality-gate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '22'
      - run: corepack enable
      - run: pnpm install --frozen-lockfile
      - run: pnpm exec nx run-many -t lint test build
      - run: pnpm verify:doc-anchors
```

`**run-many` vs `affected`:\*\*

- `run-many`: chạy tất cả, an toàn hơn khi project boundaries chưa ổn định
- `affected`: chỉ chạy projects bị ảnh hưởng bởi thay đổi, nhanh hơn nhưng cần Nx đã config đúng

Phase 7 đầu: dùng `run-many`. Sau khi pipeline stable: chuyển sang `affected`.

### 10.5 Workflow 2 — Release Images: Build Artifact Immutable

```yaml
# .github/workflows/release-images.yml
name: Release Images
on:
  workflow_dispatch:
    inputs:
      image_tag:
        default: ${{ github.sha }}

jobs:
  release:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Install tools
        run: |
          corepack enable
          pnpm install --frozen-lockfile

      - name: Run CI checks before building
        run: pnpm exec nx run-many -t lint test build

      - name: Login to DO Registry
        run: |
          echo "${{ secrets.DIGITALOCEAN_ACCESS_TOKEN }}" | \
          docker login registry.digitalocean.com --username=... --password-stdin

      - name: Build and push backend images
        run: |
          TAG="${{ inputs.image_tag }}"
          REGISTRY="registry.digitalocean.com/qrtable"
          for app in bff authorizer catalog order kitchen payment saas user-access; do
            docker build \
              -f docker/backend.Dockerfile \
              --build-arg APP_NAME="$app" \
              -t "$REGISTRY/qrtable-$app:$TAG" \
              .
            docker push "$REGISTRY/qrtable-$app:$TAG"
          done

      - name: Build and push frontend images
        run: |
          TAG="${{ inputs.image_tag }}"
          REGISTRY="registry.digitalocean.com/qrtable"

          # Management App — bake production URLs vào build
          docker build \
            -f docker/management-app.Dockerfile \
            --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
            --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
            --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
            -t "$REGISTRY/qrtable-management-app:$TAG" .
          docker push "$REGISTRY/qrtable-management-app:$TAG"
```

Docker docs cũng cung cấp pattern GitHub Actions trực tiếp bằng Buildx action. Khi workflow đã ổn định, nên ưu tiên action này vì cache và digest summary rõ hơn shell `docker build` thủ công:

```yaml
- uses: docker/setup-buildx-action@v4

- uses: docker/build-push-action@v6
  with:
    context: .
    file: docker/backend.Dockerfile
    build-args: |
      APP_NAME=bff
    push: true
    tags: registry.digitalocean.com/qrtable/bff:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Shell loop vs `build-push-action`:**

| Option                                   | Ưu điểm                                      | Khi dùng                                           |
| ---------------------------------------- | -------------------------------------------- | -------------------------------------------------- |
| Shell loop `docker build && docker push` | Dễ đọc, dễ debug, giống local command        | First pilot, khi team còn đang ổn định Dockerfiles |
| `docker/build-push-action`               | Cache tốt, metadata/digest tốt, chuẩn CI hơn | Khi workflow đã ổn định và cần build nhanh hơn     |

**Secrets trong GitHub Actions:**

```
Settings → Secrets → Actions secrets:
  DIGITALOCEAN_ACCESS_TOKEN   → API token để login DigitalOcean Registry
  PRODUCTION_SSH_HOST         → Droplet IP
  PRODUCTION_SSH_USER         → ubuntu (hoặc user name)
  PRODUCTION_SSH_KEY          → Private SSH key để connect Droplet
```

### 10.6 Workflow 3 — Deploy Production: Approval Gate và Remote Deploy

```yaml
# .github/workflows/deploy-production.yml
name: Deploy Production
on:
  workflow_dispatch:
    inputs:
      image_tag:
        required: true
        description: 'Immutable image tag to deploy'
      run_backup:
        default: 'true'
      run_smoke:
        default: 'true'

jobs:
  deploy:
    runs-on: ubuntu-latest
    environment: production # ← Required reviewer approval ở đây

    steps:
      - name: Preflight check
        run: |
          ssh -i "${{ secrets.PRODUCTION_SSH_KEY }}" \
            "${{ secrets.PRODUCTION_SSH_USER }}@${{ secrets.PRODUCTION_SSH_HOST }}" \
            "cd /opt/qrtable && ./tools/deploy/phase7-preflight.sh"

      - name: Backup before deploy
        if: inputs.run_backup == 'true'
        run: |
          ssh ... "cd /opt/qrtable && ./tools/deploy/phase7-backup.sh"

      - name: Remote deploy
        run: |
          ssh ... "cd /opt/qrtable && \
            IMAGE_TAG='${{ inputs.image_tag }}' \
            ./tools/deploy/phase7-remote-deploy.sh"

      - name: Smoke tests
        if: inputs.run_smoke == 'true'
        run: |
          curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
          curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
          curl -fsS https://app.qrtable.vodinhquan.dev
          curl -fsS https://qr.qrtable.vodinhquan.dev
```

**Remote deploy script (`phase7-remote-deploy.sh`) phải:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Fail sớm nếu thiếu điều kiện tiên quyết
[[ -z "${IMAGE_TAG:-}" ]] && echo "IMAGE_TAG required" && exit 1
[[ ! -f /opt/qrtable/.env.production ]] && echo ".env.production missing" && exit 1

# Kiểm tra permissions env file (không được world-readable)
perm=$(stat -c %a /opt/qrtable/.env.production)
[[ "$perm" != "600" ]] && echo "SECURITY: .env.production must be 0600" && exit 1

# Validate compose syntax trước
docker compose -f docker-compose.app.yaml config > /dev/null

# Pull images trước để giảm downtime
TAG="${IMAGE_TAG}" docker compose -f docker-compose.app.yaml pull

# Restart app layer
TAG="${IMAGE_TAG}" docker compose -f docker-compose.app.yaml up -d

# Record deployment audit
mkdir -p /opt/qrtable/releases
echo "${IMAGE_TAG}" > /opt/qrtable/releases/current
echo "$(date -u +%Y%m%dT%H%M%SZ) ${IMAGE_TAG} ${GITHUB_ACTOR:-manual}" \
  >> /opt/qrtable/releases/history.log
```

### 10.7 Workflow 4 — Rollback: Tách Khỏi Deploy Workflow

```yaml
# .github/workflows/rollback-production.yml
name: Rollback Production
on:
  workflow_dispatch:
    inputs:
      rollback_tag:
        required: true
        description: 'Image tag to roll back to'

jobs:
  rollback:
    environment: production # vẫn cần approval
    steps:
      # Tương tự deploy nhưng với rollback_tag
      # App rollback và data rollback là TÁCH BIỆT
      # --restore_data=true là quy trình manual riêng
```

**Tại sao rollback tách khỏi deploy?** Rollback là emergency action cần khả năng execute nhanh nhưng vẫn có approval gate. Không nên nhầm với "deploy version cũ" — rollback là intent rõ ràng, có audit riêng.

### 10.8 GitHub Environments — Approval Gate

GitHub Environments cung cấp protection rules cho production deployments:

```
GitHub Repository → Settings → Environments → production

Protection rules:
  ✓ Required reviewers: [owner/maintainer GitHub usernames]
  ✓ Deployment branches: main only
  ✓ Wait timer: 0 minutes (optional delay)
```

Khi workflow đến step `environment: production`, GitHub tự động:

1. Pause workflow
2. Send notification đến required reviewers
3. Reviewer approve/reject trong GitHub UI
4. Workflow tiếp tục (nếu approved) hoặc fail (nếu rejected)

**Tại sao cần approval cho production?** SePay webhooks ảnh hưởng real payment state. Keycloak production clients không được thay đổi ngẫu nhiên. Database schema changes phải được review trước khi deploy.

### 10.9 Deployment Policy Theo Giai Đoạn

| Giai đoạn          | Build images              | Deploy production                                          |
| ------------------ | ------------------------- | ---------------------------------------------------------- |
| First pilot        | Manual trigger            | Manual với approval                                        |
| Stable thesis demo | Push to main → auto build | Manual với approval                                        |
| Mature production  | Push to main → auto build | Auto deploy to staging, manual với approval cho production |

**Không auto-deploy production khi merge** cho đến khi migrations, backups, rollback, smoke tests đều đã proven stable.

### 10.10 Quality Gates, Release Gates, Deploy Gates

Một pipeline tốt không chỉ có "test pass". Nó có nhiều cổng kiểm tra ở đúng thời điểm:

| Gate            | Chạy ở đâu                    | Ví dụ                                                   | Bắt lỗi gì                                             |
| --------------- | ----------------------------- | ------------------------------------------------------- | ------------------------------------------------------ |
| Quality gate    | GitHub runner                 | lint, unit tests, build, doc anchors                    | Code lỗi, type lỗi, docs anchor sai                    |
| Image gate      | GitHub runner + Docker Buildx | build image, run container smoke, push registry         | Dockerfile lỗi, missing build arg, image không start   |
| Preflight gate  | Production server qua SSH     | env exists, permission 0600, compose config, image pull | Server thiếu secret, YAML/env sai, registry auth fail  |
| Migration gate  | Production DB hoặc staging DB | migrations applied, schema ready                        | Fresh DB không có tables                               |
| Deployment gate | GitHub environment            | required reviewer approval                              | Deploy production ngoài ý muốn                         |
| Smoke gate      | Bên ngoài production          | `curl` public HTTPS endpoints                           | DNS, TLS, Caddy, CORS, app boot lỗi                    |
| Rollback gate   | Production server             | previous tag exists, backup state known                 | Rollback về tag không tồn tại hoặc data state không rõ |

Smoke tests phải chạy từ GitHub runner hoặc một máy bên ngoài Droplet, vì mục tiêu là kiểm tra đường đi thật của user/provider:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev/realms/qrtable
```

SePay smoke trong CI/CD chỉ nên là **negative check**:

```bash
curl -fsS -o /dev/null -w "%{http_code}" \
  -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Expected: request thiếu secret bị reject. CI/CD không nên tạo real transfer hoặc mutate external payment state.

---

## 11. Container Registry và Image Tagging

### 11.1 Tại Sao Cần Container Registry

Registry là "kho lưu trữ" Docker images. Khi deploy lên production server, server pull image từ registry thay vì rebuild từ source.

```
Developer machine / CI:
  docker build → image
  docker push → registry.digitalocean.com/qrtable/bff:abc123

Droplet (production server):
  docker pull registry.digitalocean.com/qrtable/bff:abc123
  docker compose up → start container từ pulled image
```

Không có registry, phải copy image bằng `docker save` / `docker load` hoặc rebuild trên server — cả hai đều kém hơn.

### 11.2 Immutable Tags — Không Bao Giờ Dùng `latest` Trong Production

```
❌ Anti-pattern: dùng :latest tag trong production
  docker pull qrtable-bff:latest
  → "latest" là floating tag, có thể point đến image khác qua ngày
  → Không biết chính xác code nào đang chạy
  → Rollback = "deploy latest" = vẫn là code mới

✅ Đúng: immutable tag (git SHA)
  docker pull registry.digitalocean.com/qrtable/bff:a1b2c3d4
  → Biết chính xác commit nào
  → Rollback = deploy tag cũ, e.g. registry.../bff:9x8y7z6w
  → Reproducible, auditable
```

**Git SHA làm image tag** là best practice phổ biến nhất: mỗi commit tạo ra image riêng với tag = git commit SHA (7 hoặc 40 chars). Tag này không bao giờ thay đổi.

### 11.3 DigitalOcean Container Registry

DO Container Registry có free tier nhưng cần kiểm tra storage limit trước khi push 10 images.

```bash
# Login từ GitHub Actions
echo "$DO_ACCESS_TOKEN" | docker login registry.digitalocean.com --username=... --password-stdin

# Push image
docker push registry.digitalocean.com/qrtable/qrtable-bff:${GITHUB_SHA}

# Pull trên server
docker pull registry.digitalocean.com/qrtable/qrtable-bff:${GITHUB_SHA}
```

**Image cleanup:** Registry accumulates images. Setup garbage collection policy để tự động xóa images cũ (ví dụ: giữ 5 tags gần nhất per image).

---

### 11.4 Image Digest, Retention, Và Audit Trail

Tag như `abc123` là tên con người dùng để gọi image. Digest là hash content thật của image:

```text
registry.digitalocean.com/qrtable/bff:abc123
registry.digitalocean.com/qrtable/bff@sha256:...
```

Nếu tag bị push lại nhầm, digest sẽ đổi. Vì vậy release workflow nên lưu cả tag và digest summary:

```text
image=bff
tag=abc123
digest=sha256:...
built_at=2026-06-06T10:15:00Z
git_sha=abc123...
```

Production deploy audit nên ghi:

```text
/opt/qrtable/releases/current
/opt/qrtable/releases/history.log
```

`history.log` tối thiểu nên có: `deployed_at`, `deployed_by`, `image_tag`, `previous_tag`, `compose_files`, `smoke_result`, `github_run_url`.

**Retention rule:** giữ đủ image cũ để rollback. Ví dụ giữ 5-10 successful tags gần nhất cho mỗi service, và không xóa tag đang nằm trong `/opt/qrtable/releases/current`.

---

## 12. Phase 7 Coverage Checklist

Checklist này dùng để tự kiểm tra: nếu đọc guide xong vẫn không giải thích được một dòng trong plan, phần đó cần bổ sung thêm.

### 12.1 Docker Và Build Artifacts

- Có thể giải thích Docker CLI, daemon, registry, image, container, namespace, cgroup, writable layer và PID 1.
- Có thể đọc cú pháp `docker run [OPTIONS] IMAGE [COMMAND] [ARG...]`.
- Có thể giải thích `FROM`, `ARG`, `ENV`, `WORKDIR`, `COPY`, `RUN`, `USER`, `EXPOSE`, `HEALTHCHECK`, `ENTRYPOINT`, `CMD`.
- Phân biệt shell form và exec form; hiểu `CMD`/`ENTRYPOINT` override.
- `.dockerignore` loại trừ `.env`, `node_modules`, `dist`, `.nx/cache`, generated data, và local build output.
- Backend dùng một parametric Dockerfile với `APP_NAME`.
- Management App dùng Next.js standalone output.
- Customer PWA là static build chạy qua Nginx với SPA fallback.
- Public frontend env (`NEXT_PUBLIC_*`, `VITE_*`) là build-time values.
- Runtime secrets không xuất hiện trong Dockerfile, build args, image history, hoặc git.
- Build dùng lockfile frozen để đảm bảo reproducibility.

### 12.2 Compose Và Network

- Có thể đọc YAML mapping, sequence, scalar, indentation và variable interpolation.
- Phân biệt `image`/`build`, `command`/`entrypoint`, `environment`/`env_file`, `ports`/`expose`.
- Hiểu lifecycle của `pull`, `build`, `create`, `start`, `up -d`, `restart`, `down`, `exec`, `run`, `config`.
- Infra, app, proxy, monitoring là các layer độc lập.
- Databases, Redis, Kafka, Prometheus, Loki, Tempo không có public port.
- Caddy là service duy nhất expose `80` và `443`.
- App containers gọi nhau bằng service name (`order`, `catalog`, `postgres`, `redis`, `kafka`), không dùng `localhost`.
- Named volumes giữ database, Kafka, Redis, Keycloak, và Caddy certificate data.
- `docker compose config` pass cho mọi layer trước khi deploy.

### 12.3 Production Readiness

- DigitalOcean Cloud Firewall chỉ mở SSH từ IP tin cậy, `80`, và `443`.
- DNS A records cho `api`, `app`, `qr`, `auth`, `grafana` đã resolve đúng Droplet IP trước khi start Caddy.
- `/opt/qrtable/.env.production` tồn tại trên server, permission `0600`, không commit.
- `TYPEORM_SYNCHRONIZE=false` đi cùng per-service migrations, và deploy chạy migrations trước app startup.
- Keycloak chạy production `start`, không dùng `start-dev`.
- Grafana đi qua HTTPS và auth; observability stores private.

### 12.4 CI/CD Và Operations

- CI chạy lint, tests, build, và `pnpm verify:doc-anchors`.
- Release workflow build/push 10 immutable images với git SHA tag.
- Deploy workflow dùng `workflow_dispatch`, `environment: production`, required approval, preflight, backup option, remote deploy, smoke tests, audit log.
- Rollback workflow tách riêng deploy workflow và rollback bằng previous image tag.
- Data restore không tự động chạy trong app rollback.
- Smoke tests chạy từ bên ngoài Droplet để verify DNS, TLS, proxy, and public routes.
- SePay webhook CI check là negative check, không tạo real payment side effect.

---

## 13. Tổng Kết Mental Model

#### Sơ đồ: Mental Model — Docker, Deployment và CI/CD trong QRTable

```mermaid
mindmap
  root((Docker &\nDeployment\nQRTable))
    Container Fundamentals
      Image = immutable template
      Container = running instance
      Layers + cache = fast rebuild
      Non-root user = security
      .dockerignore = small context
    Dockerfile Patterns
      Multi-stage = small runtime image
      Backend: base→deps→build→runtime
      Next.js: standalone output mode
      Vite: build-time URLs baked in
      Build-arg vs ENV: secrets không bao giờ là build-arg
    Docker Compose
      Services = containers
      Networks = isolation layers
      Volumes = persistent storage
      Health checks = dependency ordering
      Layered compose = separation of concerns
    Kiến Trúc 4 Lớp
      infra: PostgreSQL MongoDB Redis Kafka Keycloak
      app: 8 NestJS + 2 frontend
      proxy: Caddy HTTPS termination
      monitoring: PLG + Prometheus + Tempo
    Network Topology
      qrtable-edge: Caddy, BFF, frontends
      qrtable-identity: Caddy, Keycloak
      qrtable-observability: Caddy, Grafana, monitoring
      qrtable-data: datastores và internal services
      Chỉ Caddy publish 80/tcp, 443/tcp, 443/udp
    Secrets Management
      Build-time public: NEXT_PUBLIC VITE
      Runtime secrets: .env.production 0600
      Không bao giờ commit secrets
      Explicit per-service environment mappings
    CI/CD Pipeline
      CI = quality gate: lint test build
      Release = build immutable images với git SHA tag
      Deploy = approval gate + remote SSH deploy
      Rollback = tách biệt khỏi deploy workflow
      Audit trail = releases/current + history.log
    DigitalOcean
      Droplet: 4 vCPU 8 GiB Ubuntu 24.04
      Cloud Firewall: chỉ 22/80/443 public
      DNS: A records cho 5 subdomains
      Caddy: tự động Let's Encrypt TLS
    Migration Lifecycle
      TYPEORM_SYNCHRONIZE=false ở mọi môi trường
      Per-service TypeORM migrations
      Ownership verification trước app startup
```

Sau khi đọc toàn bộ tài liệu, đây là mental model cần ghi nhớ:

**Về Docker:** Image là template immutable, container là instance đang chạy. Multi-stage build tạo runtime image nhỏ gọn. Layers được cache — instruction ít thay đổi lên trên, hay thay đổi xuống dưới. `NEXT_PUBLIC_`\_ và `VITE\__` là build-time, baked vào JS bundle — không thể thay đổi runtime. Secrets không bao giờ là Docker build arg.

**Về Docker Compose:** Các network edge, identity, observability và data theo mục đích phản ánh
defense in depth. Chỉ Caddy publish internet ports. Health checks là tiên quyết để `depends_on` có ý
nghĩa. Layered compose files tách concerns: infra/app/proxy/monitoring restart độc lập nhau.

**Về deployment flow:** Thứ tự quan trọng: infra healthy → monitoring → app containers → proxy (Caddy cần DNS đã resolve trước khi request cert). Caddy data volume giữ Let's Encrypt cert — không xóa. Secrets trong `/opt/qrtable/.env.production` với permission 0600 — không bao giờ world-readable.

**Về CI/CD:** Ba workflow tách biệt: CI (quality gate), Release (build immutable images), Deploy (approval + remote SSH). Immutable tags với git SHA — không bao giờ dùng `:latest` trong production. Rollback = deploy lại tag cũ của image — không phải "deploy code cũ". Schema migration là hard gate — không thể skip.

**Về migrations:** `TYPEORM_SYNCHRONIZE=false` là mặc định. Chạy versioned migrations cho Catalog, Order, Payment và SaaS trước app startup, sau đó chạy ownership smoke check.

**Về immutability:** Một image với tag `abc123` là immutable — không bao giờ thay đổi. Biết image tag nào đang chạy = biết chính xác code nào. Rollback là operation có thể thực hiện bất kỳ lúc nào miễn là image cũ còn trong registry. Đây là sức mạnh cốt lõi của container-based deployment.
