# Docker, Deployment & CI/CD: Theory and Hands-On Implementation — QRTable Phase 7

> **English canonical** — Vietnamese translation: [docker-deployment-cicd-qrtable.vi.md](docker-deployment-cicd-qrtable.vi.md)
>
> **Document philosophy:** Understand _why_ before _how_. Every concept is anchored to
> the specific context of QRTable so you learn to apply immediately, not abstract theory.
>
> **Scope:** All theory required to deploy QRTable on DigitalOcean —
> from Docker fundamentals, Dockerfile patterns, Docker Compose layered architecture,
> reverse proxy/HTTPS, secrets management, CI/CD pipeline, to rollback strategy.
>
> **Goal:** After reading, you can explain every architectural decision
> in Phase 7, debug deployment issues, and extend the CI/CD pipeline intentionally.

---

## Table of Contents

0. [Documentation Sources and Coverage Map](#documentation-sources-and-coverage-map)
1. [The Deployment Problem This Solves](#1-the-deployment-problem-this-solves)
2. [Container Fundamentals — What Docker Is and Why](#2-container-fundamentals--what-docker-is-and-why)
3. [Dockerfile — Packaging the Application](#3-dockerfile--packaging-the-application)
4. [Docker Compose — Orchestrating Multiple Services](#4-docker-compose--orchestrating-multiple-services)
5. [QRTable Production 4-Layer Architecture](#5-qrtable-production-4-layer-architecture)
6. [Reverse Proxy and HTTPS](#6-reverse-proxy-and-https)
7. [Secrets and Environment Management](#7-secrets-and-environment-management)
8. [DigitalOcean Deployment — Infrastructure and Provisioning](#8-digitalocean-deployment--infrastructure-and-provisioning)
9. [Database and Migration Strategy](#9-database-and-migration-strategy)
10. [CI/CD Pipeline — Release, Deploy, Rollback](#10-cicd-pipeline--release-deploy-rollback)
11. [Container Registry and Image Tagging](#11-container-registry-and-image-tagging)
12. [Phase 7 Coverage Checklist](#12-phase-7-coverage-checklist)
13. [Mental Model Summary](#13-mental-model-summary)

---

## Documentation Sources and Coverage Map

### Context7 sources used

This document was supplemented based on Context7 lookup on 2026-06-06:

| Topic               | Context7 library              | Used to reinforce which sections                                                                                                           |
| ------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| Docker core docs    | `/docker/docs`                | Image/container model, Dockerfile, BuildKit, Buildx, Compose, volumes, health checks, registry, GitHub Actions build-push workflow         |
| GitHub Actions docs | `/websites/github_en_actions` | Workflow jobs, `needs`, `permissions`, `environment: production`, deployment protection rules, required approval, secrets, deployment jobs |

Primary sources:

- [Docker documentation](https://docs.docker.com/)
- [Dockerfile reference](https://docs.docker.com/reference/dockerfile/)
- [Compose file reference](https://docs.docker.com/reference/compose-file/)
- [Docker Build with GitHub Actions cache](https://github.com/docker/docs/blob/main/content/manuals/build/ci/github-actions/cache.md)
- [Docker guide: Next.js with GitHub Actions](https://github.com/docker/docs/blob/main/content/guides/nextjs/configure-github-actions.md)
- [GitHub Actions: deploy to an environment](https://docs.github.com/en/actions/how-tos/write-workflows/choose-what-workflows-do/deploy-to-environment)
- [GitHub Actions: deployments and environments](https://docs.github.com/en/actions/deployment/about-deployments/deploying-with-github-actions)

### How this guide covers the Phase 7 plan

`docs/superpowers/plans/2026-06-06-phase-7-docker-digitalocean-deployment.md` is the implementation plan. This document is the foundation guide. When the plan requires creating a file or workflow, this guide explains why that file exists, which risk it addresses, and how to debug when deploy fails.

| Phase 7 tasks                                               | Foundational knowledge in this guide                                                                    |
| ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Task 1: `.dockerignore`                                     | Build context, layer cache, secret leak prevention                                                      |
| Task 2-4: Backend, Management App, Customer PWA Dockerfiles | Multi-stage builds, Nx build artifacts, Next standalone, Vite static runtime, build-time vs runtime env |
| Task 5-6: Infra/app Compose                                 | Compose services, internal networks, service discovery, named volumes, health checks, layered compose   |
| Task 7: Caddy reverse proxy                                 | Reverse proxy role, TLS termination, Let's Encrypt ACME, WebSocket forwarding                           |
| Task 8: Production env and secrets                          | Secret taxonomy, runtime env files, file permissions, no secret build args                              |
| Task 9: Schema/migration blocker                            | Why `TYPEORM_SYNCHRONIZE=false` needs migrations or schema bootstrap                                    |
| Task 10: Keycloak public bootstrap                          | Public hostnames, TLS, proxy headers, env separation                                                    |
| Task 11: SePay production integration                       | HTTPS-only webhook requirement, public API base URL, secret-key verification, CI negative checks        |
| Task 12: Monitoring rewiring                                | Internal scrape targets, private observability stores, Grafana behind HTTPS/auth                        |
| Task 13-16: DigitalOcean deploy, smoke, backup, operations  | Droplet sizing, firewall, DNS, Docker Engine install, preflight, smoke tests, backup and rollback model |
| Task 17: CI/CD pipeline                                     | CI quality gate, image release workflow, production deploy approval, rollback workflow, audit trail     |
| Task 18: Canonical docs                                     | Why implementation must update phase docs, architecture docs, and doc-code anchors                      |

---

## 1. The Deployment Problem This Solves

### 1.1 The Root Problem: "It Works on My Machine"

QRTable has 8 NestJS services, 2 frontend apps, PostgreSQL, MongoDB, Redis, Kafka, Keycloak, and the full observability stack (Prometheus, Loki, Tempo, Grafana). On a dev machine, everything runs with `docker compose up` and works fine.

But when you need to deploy to a real server — a DigitalOcean Droplet running Ubuntu 24.04 — the problem changes entirely:

**Problem 1 — Reproducibility:** Code that runs on a developer's macOS Apple Silicon machine does not necessarily run on the Droplet's Ubuntu x86. Node.js versions differ, native modules compile differently, env vars may be missing.

**Problem 2 — "Works on my machine" vs production:** Development uses `TYPEORM_SYNCHRONIZE=true`; production cannot. Development Kafka advertises `localhost:9092`; production containers need `kafka:9092`. Development does not require HTTPS; production requires HTTPS for the SePay webhook.

**Problem 3 — Consistency across deploys:** The first deploy succeeds. A deploy three months later may fail because `bitnami/kafka:latest` changed, or `postgres:latest` has breaking changes. "Latest" is not immutable.

**Problem 4 — Safe deployment:** When there is a bug, how do you deploy a fix quickly without downtime? How do you roll back to the previous version if the fix causes new errors? How do you ensure only authorized people deploy to production?

Docker + Docker Compose + CI/CD solve all four problems systematically.

### 1.2 Why QRTable Does Not Use a Simpler PaaS

Many people ask: why not use Heroku, Railway, or DigitalOcean App Platform — PaaS that automatically handle containers, scaling, SSL, and deployment?

**Technical reason:** QRTable uses NestJS TCP microservices — services communicate over raw TCP ports (3201, 3203...), not HTTP. PaaS typically only exposes HTTP/HTTPS ports and does not support this internal TCP communication pattern.

**Academic reason:** For a thesis/graduation project, self-deploying on a VPS (Droplet) with Docker Compose demonstrates real system operations capability better than using a managed service that hides the entire infrastructure layer.

**Cost reason:** One 4 vCPU / 8 GiB Droplet ≈ $48/month holds the entire stack. DigitalOcean App Platform with 10 services costs much more. Managed Kafka on DigitalOcean is a high-priced multi-node cluster unsuitable for thesis/pilot.

---

## 2. Container Fundamentals — What Docker Is and Why

### 2.1 VM vs Container — The Foundational Difference

Before containers, deployment typically used Virtual Machines (VMs) or bare metal. Understanding the difference explains why Docker is so widely adopted.

**Virtual Machine:** Runs a complete operating system (guest OS) on top of the host OS through a hypervisor. Each VM has its own kernel, drivers, and full OS stack.

**Container:** Shares the host OS kernel, isolating only userspace (process, filesystem, network, user). A container is an _isolated process_, not a separate OS.

#### Diagram: VM vs Container — Architectural Difference

> Containers are lighter than VMs because they do not need a separate Guest OS. Many containers share the same host kernel. This explains why containers start in milliseconds instead of seconds like VMs.

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

**Practical implications for QRTable:**

- Containers `bff` and `order` run on the same Ubuntu kernel on the Droplet
- No separate OS per service → significant RAM savings
- Fast startup: from `docker compose up` to service ready takes seconds, not minutes

### 2.2 Docker Client, Docker Daemon, Registry — Who Does What?

When you type a Docker command, the terminal does not build or run a container by itself. Docker has three main components:

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
  store and distribute images
```

| Component      | Responsibility                                           | QRTable example                          |
| -------------- | -------------------------------------------------------- | ---------------------------------------- |
| Docker CLI     | Receives commands from a developer or CI                 | `docker compose up -d`                   |
| Docker daemon  | Executes builds and manages containers on the host       | Daemon on the DigitalOcean Droplet       |
| Image registry | Stores images so other machines can pull them            | DigitalOcean Container Registry          |
| Docker Compose | Reads YAML and calls Docker APIs for multiple containers | Starts app, infra, proxy, and monitoring |

Example:

```bash
docker pull registry.digitalocean.com/qrtable/bff:abc123
```

1. The CLI sends a pull request to the daemon.
2. The daemon checks the local image cache.
3. If the image is absent, the daemon downloads image layers from the registry.
4. The image is stored locally on the Droplet, but no container is running yet.

```bash
docker run registry.digitalocean.com/qrtable/bff:abc123
```

Only now does the daemon create a container from the image and start the process defined by `ENTRYPOINT`/`CMD`.

### 2.3 Namespaces, Cgroups, Filesystem Layers — What Isolates a Container?

Container isolation is not Docker magic. Docker uses Linux primitives:

| Primitive         | What it isolates or controls | Meaning                                                         |
| ----------------- | ---------------------------- | --------------------------------------------------------------- |
| PID namespace     | Process tree                 | A container only sees processes inside its namespace            |
| Network namespace | Interfaces, routes, ports    | Every container has its own network stack                       |
| Mount namespace   | Filesystem mounts            | A container sees its own filesystem view                        |
| User namespace    | User/group IDs               | Container users can be mapped more safely to host users         |
| Cgroups           | CPU, RAM, I/O                | Resource limits prevent one service from exhausting the Droplet |
| Capabilities      | Individual kernel privileges | Privileges can be dropped instead of granting full root power   |

An image consists of read-only layers. When a container runs, Docker adds a **writable container layer** on top:

```text
Writable container layer        <- temporary files/logs are written here
Application artifact layer
Production dependencies layer
Node.js base image layers
```

When the container is removed, its writable layer is lost. Database data must therefore live in named volumes, not in the container layer.

### 2.4 Container Lifecycle and PID 1

A container normally moves through these states:

```text
created -> running -> paused/restarting -> exited -> removed
```

Corresponding commands:

```bash
docker create IMAGE   # create without starting
docker start NAME     # start an existing container
docker stop NAME      # send SIGTERM, wait, then SIGKILL if necessary
docker restart NAME   # stop and start again
docker rm NAME        # remove a container, not its image
docker rmi IMAGE      # remove an image when no container depends on it
```

The process started by `ENTRYPOINT`/`CMD` becomes **PID 1** inside the container. PID 1 must:

- receive `SIGTERM` during deployment or shutdown;
- terminate gracefully and close HTTP servers, DB connections, and Kafka consumers;
- avoid spawning a child process that never receives the shutdown signal.

This is why exec form is preferred:

```dockerfile
CMD ["node", "main.js"]
```

Instead of shell form:

```dockerfile
CMD node main.js
```

Exec form runs `node` directly as PID 1. Shell form normally runs through `/bin/sh -c`, so the signal can reach the shell instead of the application process.

### 2.5 Image and Container — An Important Distinction

**Image** is a read-only template — the "blueprint" of a container. Contains: OS layer, runtime (Node.js), application code, dependencies.

**Container** is a running instance of an image — the "object" created from the "class". Multiple containers can run from the same image.

An image reference has this form:

```text
[registry/][namespace/]repository[:tag][@digest]
```

Examples:

```text
registry.digitalocean.com/qrtable/bff:abc123
registry.digitalocean.com/qrtable/bff@sha256:...
```

- The default registry is normally Docker Hub when omitted.
- A tag is a mutable name pointing to an image manifest.
- A digest is an exact content-addressed identifier.
- One tag can point to a multi-platform manifest for `linux/amd64`, `linux/arm64`, and others.

Apple Silicon is normally `arm64`, while DigitalOcean Droplets are commonly `amd64`. Buildx can build for the target platform:

```bash
docker buildx build --platform linux/amd64 -t qrtable-bff:abc123 .
```

or build multiple platforms when pushing to a registry:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  --push \
  -t registry.digitalocean.com/qrtable/bff:abc123 \
  .
```

```
docker build → Image (immutable, can be pushed to registry)
docker run   → Container (running, can be stopped/started/deleted)
```

In QRTable:

```
docker build -f docker/backend.Dockerfile --build-arg APP_NAME=bff -t qrtable-bff:abc123 .
→ Creates image qrtable-bff:abc123 (immutable, portable to any server)

docker compose -f docker-compose.app.yaml up -d
→ Creates bff container from image, starts process, attaches network
```

### 2.6 Layers and Caching — Why Subsequent Builds Are Faster

An image is built from multiple **layers**. Filesystem-changing instructions such as `RUN`, `COPY`, and `ADD` create filesystem layers; metadata instructions such as `ENV`, `CMD`, and `EXPOSE` update image configuration/history. Docker caching depends on the instruction, parent state, and relevant content:

```
Layer 1: FROM node:22.12-alpine3.20         → cached if base image unchanged
Layer 2: RUN corepack enable                → cached if instruction unchanged
Layer 3: COPY package.json pnpm-lock.yaml   → cache invalid if lockfile changed
Layer 4: RUN pnpm install                   → re-runs if Layer 3 invalid
Layer 5: COPY apps ./apps                   → cache invalid if source code changed
Layer 6: RUN pnpm nx build bff              → re-runs if Layer 5 invalid
```

**Important principle:** Place instructions that change rarely at the top (base image, corepack), and instructions that change often at the bottom (COPY source code). Otherwise → constant cache misses → slow builds every time.

### 2.7 BuildKit and Buildx — Modern Docker Build

**BuildKit** is Docker's modern build engine. It enables faster builds, cache mounts, secret mounts, multi-platform builds, and cache export for CI. **Buildx** is the CLI frontend commonly used to invoke BuildKit locally and in GitHub Actions.

In Phase 7, BuildKit matters because QRTable is a large Nx monorepo. Building every image from scratch — 8 backend services + 2 frontend apps — would be very slow. BuildKit allows caching the pnpm store and Docker layers:

```dockerfile
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile
```

Syntax breakdown:

| Part                 | Meaning                                                          |
| -------------------- | ---------------------------------------------------------------- |
| `RUN --mount=...`    | Create a mount that exists only while the build instruction runs |
| `type=cache`         | Let BuildKit manage reusable content across builds               |
| `id=pnpm-store`      | Stable cache name                                                |
| `target=/pnpm/store` | Path where the cache appears inside the build container          |
| `pnpm install ...`   | Actual command being executed                                    |

A cache mount does not become a runtime volume, and its entire content is not copied into the final image layer. It only accelerates builds.

Build-time secrets should use a secret mount instead of `ARG`:

```dockerfile
RUN --mount=type=secret,id=npmrc,target=/root/.npmrc \
  pnpm install --frozen-lockfile
```

```bash
docker build --secret id=npmrc,src="$HOME/.npmrc" .
```

The secret file exists only during that instruction and should not be committed into the image.

In GitHub Actions, Docker docs recommend the `setup-buildx-action` + `build-push-action` + cache pattern:

```yaml
- uses: docker/setup-buildx-action@v4
- uses: docker/build-push-action@v6
  with:
    push: true
    tags: registry.digitalocean.com/qrtable/bff:${{ github.sha }}
    cache-from: type=gha
    cache-to: type=gha,mode=max
```

**Mental model:** Docker layer cache answers "does this instruction need to run again?". BuildKit cache mount answers "when the instruction must re-run, can we reuse the package cache inside?". Both together make CI faster.

**Warning:** Cache speeds things up but must not make builds non-reproducible. Always keep `pnpm-lock.yaml`, use `--frozen-lockfile`, and do not rely on floating package versions.

### 2.8 Build Context and .dockerignore

When you run `docker build .`, Docker sends the entire `.` directory (build context) to the Docker daemon before building. A large build context → slow build, large image.

QRTable has hundreds of MB in `node_modules`, old `dist`, `.git`, docker data. `.dockerignore` excludes them:

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

| Pattern              | Meaning                                                       |
| -------------------- | ------------------------------------------------------------- |
| `node_modules`       | Ignore paths named `node_modules` according to matching rules |
| `**/node_modules`    | Ignore `node_modules` at any depth                            |
| `*.log`              | Ignore files ending in `.log`                                 |
| `docker/docker_data` | Ignore one specific path                                      |
| `!*.env.example`     | Re-include a file ignored by an earlier pattern               |
| `# comment`          | Comment                                                       |

Rules are evaluated in order; a later match can override an earlier one. Example:

```dockerignore
.env*
!*.env.example
```

ignores every `.env*` file but keeps the `*.env.example` template.

`.dockerignore` does not shrink an image after a file has already been copied. It prevents the file from entering the build context in the first place. This is both an optimization and a secret-leak control.

**Verify build context:**

```bash
docker buildx du --verbose .
```

There must be no `node_modules` or `docker/docker_data` in the context.

### 2.9 `docker run` Syntax and Basic Debug Commands

General structure:

```text
docker run [OPTIONS] IMAGE [COMMAND] [ARG...]
```

Example:

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

| Option                    | Meaning                                                                    |
| ------------------------- | -------------------------------------------------------------------------- |
| `--name qrtable-bff`      | Assign a container name                                                    |
| `-d`, `--detach`          | Run in the background and return the terminal                              |
| `--rm`                    | Remove the container automatically after exit; useful for one-off commands |
| `-it`                     | Interactive terminal, commonly used for debugging shells                   |
| `-e KEY=value`            | Inject one environment variable                                            |
| `--env-file FILE`         | Inject many runtime variables from a file                                  |
| `-p HOST:CONTAINER`       | Publish a port                                                             |
| `-v SOURCE:TARGET[:MODE]` | Mount a volume/bind path with short syntax                                 |
| `--mount ...`             | Longer mount syntax with explicit type/source/target                       |
| `--network NAME`          | Attach the container to a network                                          |
| `--restart POLICY`        | Select a restart policy                                                    |
| `--user UID:GID`          | Override the runtime user                                                  |
| `--read-only`             | Make the root filesystem read-only                                         |
| `--cap-drop ALL`          | Drop Linux capabilities for hardening                                      |

Anything after `IMAGE` overrides Dockerfile `CMD`:

```bash
docker run qrtable-bff:abc123 node --version
```

This container runs `node --version`, not the default `node main.js`.

`docker run` always **creates a new container and starts it**. `docker start` only starts an existing container.

Observation and debugging commands:

```bash
docker ps                         # running containers
docker ps -a                      # include exited containers
docker logs -f qrtable-bff        # follow stdout/stderr
docker inspect qrtable-bff        # low-level JSON configuration/state
docker exec -it qrtable-bff sh    # open a shell in a running container
docker stats                      # realtime CPU/RAM/network I/O
docker image ls                   # local images
docker network inspect qrtable-edge
docker volume inspect postgres_data
```

**Mental model:** `docker run` is an imperative command for one container. Compose is declarative desired state for many containers.

---

## 3. Dockerfile — Packaging the Application

### 3.1 What Is a Dockerfile and How Does Docker Read It?

A Dockerfile is a text file containing a sequence of **build instructions**. Docker reads it from top to bottom. Every instruction receives the result of the previous instruction as its input.

A common complete build command looks like this:

```bash
docker build \
  -f docker/backend.Dockerfile \
  --build-arg APP_NAME=bff \
  -t registry.digitalocean.com/qrtable/bff:abc123 \
  .
```

| Part                           | Meaning                                                     |
| ------------------------------ | ----------------------------------------------------------- |
| `docker build`                 | Ask the daemon to build an image                            |
| `-f docker/backend.Dockerfile` | Select a Dockerfile; default is `./Dockerfile`              |
| `--build-arg APP_NAME=bff`     | Pass a value to Dockerfile `ARG APP_NAME`                   |
| `-t repository/name:tag`       | Assign a repository name and tag to the image               |
| Final `.`                      | Build context; `COPY` can only read files from this context |

The first line:

```dockerfile
# syntax=docker/dockerfile:1.7
```

is not a normal comment. It is a **parser directive** selecting the Dockerfile frontend syntax for BuildKit. The syntax version determines whether features such as `RUN --mount=type=cache` are supported.

Normal comments begin with `#`:

```dockerfile
# This is only a comment
RUN corepack enable
```

### 3.2 Dockerfile Instruction Reference

| Instruction   | Basic syntax                                  | When                     | Meaning                                                                      |
| ------------- | --------------------------------------------- | ------------------------ | ---------------------------------------------------------------------------- |
| `FROM`        | `FROM image[:tag] AS stage`                   | Build                    | Select a base image and start a new build stage                              |
| `ARG`         | `ARG NAME=default`                            | Build                    | Declare a build-time variable                                                |
| `ENV`         | `ENV NAME=value`                              | Build + runtime          | Store an environment variable in the image/container                         |
| `WORKDIR`     | `WORKDIR /app`                                | Build metadata           | Set the working directory for following instructions                         |
| `COPY`        | `COPY src dest`                               | Build                    | Copy files from the build context into the image                             |
| `ADD`         | `ADD src dest`                                | Build                    | Similar to `COPY` with remote URL/tar behavior; usually unnecessary          |
| `RUN`         | `RUN command`                                 | Build                    | Execute a build command and save filesystem results in an image layer        |
| `USER`        | `USER qrtable`                                | Build metadata + runtime | Select the user for following `RUN` instructions and the runtime process     |
| `EXPOSE`      | `EXPOSE 3300`                                 | Image metadata           | Document the port the application listens on; does not publish it            |
| `VOLUME`      | `VOLUME ["/data"]`                            | Image metadata           | Declare a mount point; production Compose usually manages volumes explicitly |
| `HEALTHCHECK` | `HEALTHCHECK CMD ...`                         | Runtime metadata         | Define a command that checks container health                                |
| `ENTRYPOINT`  | `ENTRYPOINT ["node"]`                         | Runtime                  | Select the primary executable, which is harder to override                   |
| `CMD`         | `CMD ["node", "main.js"]`                     | Runtime                  | Select the default command or default arguments                              |
| `LABEL`       | `LABEL org.opencontainers.image.revision=...` | Image metadata           | Add metadata for audit and provenance                                        |

#### `FROM` and `AS`

```dockerfile
FROM node:22.12-alpine3.20 AS build
```

- `node` is the image repository.
- `22.12-alpine3.20` is the tag.
- `AS build` names the stage so later instructions can reference it.
- Every `FROM` starts a new filesystem based on the selected image.

Pinning a specific tag reduces unexpected build changes. A registry can still overwrite a tag; production can harden further with a digest:

```dockerfile
FROM node:22.12-alpine3.20@sha256:<digest>
```

#### `WORKDIR`

```dockerfile
WORKDIR /workspace
RUN pnpm install
COPY package.json ./
```

After `WORKDIR`, relative paths resolve from `/workspace`. Docker creates the directory if it does not exist.

Prefer `WORKDIR` over:

```dockerfile
RUN cd /workspace && pnpm install
```

because `cd` only exists inside one `RUN`; the next instruction starts a different process.

#### `COPY`, Build Context, `--from`, `--chown`

```dockerfile
COPY package.json pnpm-lock.yaml ./
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/bff /app
```

- The source of `COPY` normally lives inside the build context.
- The destination lives inside the image filesystem.
- `--from=build` changes the source from host context to the filesystem of the `build` stage.
- `--chown=user:group` sets ownership during copy and avoids an additional `RUN chown` layer.
- `.dockerignore` determines which files are not sent in the build context.

Prefer `COPY` over `ADD`. Use `ADD` only when you intentionally need extra behavior such as extracting a local tar archive.

#### `RUN` and Image Layers

```dockerfile
RUN corepack enable
RUN pnpm install --frozen-lockfile
```

`RUN` executes **during image build**, not every time a container starts. Files created or modified by the command become part of an image layer.

A new `RUN` does not retain shell state from the previous `RUN`:

```dockerfile
# Wrong: the exported shell variable does not exist in the next RUN
RUN export APP_MODE=production
RUN echo "$APP_MODE"
```

Use `ENV`, or keep dependent commands in the same instruction:

```dockerfile
RUN export APP_MODE=production && echo "$APP_MODE"
```

#### `USER`

```dockerfile
RUN addgroup -g 1001 -S qrtable \
  && adduser -S qrtable -u 1001 -G qrtable
USER qrtable
```

`USER` affects:

- `RUN` instructions that follow it;
- runtime `ENTRYPOINT`/`CMD`;
- file read/write permissions inside the container.

Package installation and user creation usually require root, so `USER qrtable` is placed near the end of the runtime stage.

#### `EXPOSE` Does Not Publish a Port

```dockerfile
EXPOSE 3300
```

`EXPOSE` is only metadata: "the application is expected to listen on port 3300". It does not open a firewall or map the port to the host.

To publish with `docker run`:

```bash
docker run -p 127.0.0.1:3300:3300 qrtable-bff:abc123
```

To publish with Compose:

```yaml
ports:
  - '127.0.0.1:3300:3300'
```

QRTable production does not publish BFF directly; Caddy calls `bff:3300` through a Docker network.

### 3.3 Shell Form, Exec Form, `CMD`, and `ENTRYPOINT`

Docker supports two command forms.

**Shell form:**

```dockerfile
RUN pnpm nx build bff
CMD node main.js
```

Docker runs this through the default shell, usually `/bin/sh -c`. Because a shell is present, it supports:

- `$NAME` variables;
- pipes `|`;
- redirects `>`;
- `&&`, `||`;
- wildcard expansion.

**Exec form:**

```dockerfile
RUN ["corepack", "enable"]
CMD ["node", "main.js"]
```

This is a JSON array. Docker invokes the executable directly, without opening a shell or expanding `$VARIABLE`.

| Instruction  | Build or runtime? | Recommendation                                                                                |
| ------------ | ----------------- | --------------------------------------------------------------------------------------------- |
| `RUN`        | Build             | Shell form is convenient for install/build commands; exec form when explicit arguments matter |
| `CMD`        | Runtime           | Prefer exec form so the app receives signals directly                                         |
| `ENTRYPOINT` | Runtime           | Prefer exec form                                                                              |

`CMD` and `ENTRYPOINT` combine like this:

```dockerfile
ENTRYPOINT ["node"]
CMD ["main.js"]
```

The container runs by default:

```text
node main.js
```

When you run:

```bash
docker run IMAGE worker.js
```

the CLI arguments replace `CMD`, resulting in:

```text
node worker.js
```

QRTable does not need a fixed entrypoint, so the simpler pattern is:

```dockerfile
CMD ["node", "main.js"]
```

Only the **last `CMD`** in a Dockerfile takes effect.

### 3.4 `ARG`, `ENV`, Variable Expansion, and Secret Scope

```dockerfile
ARG APP_NAME
ENV NODE_ENV=production
RUN pnpm nx build "$APP_NAME"
```

| Property                       | `ARG`                        | `ENV`                                                                      |
| ------------------------------ | ---------------------------- | -------------------------------------------------------------------------- |
| Available during build         | Yes                          | Yes                                                                        |
| Exists when the container runs | No, unless copied into `ENV` | Yes                                                                        |
| Supplied from CLI              | `--build-arg`                | `docker run -e` or Compose `environment`                                   |
| Suitable for secrets           | No                           | Runtime secrets can be injected, but must not be hardcoded in a Dockerfile |
| QRTable example                | `APP_NAME`, `VITE_BFF_URL`   | `NODE_ENV`, `PORT`                                                         |

An `ARG` declared before `FROM` can only parameterize `FROM`. To use it again inside the stage, redeclare it:

```dockerfile
ARG NODE_VERSION=22.12
FROM node:${NODE_VERSION}-alpine AS build
ARG NODE_VERSION
RUN echo "$NODE_VERSION"
```

Copying a build argument into the environment:

```dockerfile
ARG APP_NAME
ENV APP_NAME=$APP_NAME
```

makes the value persist in the image and runtime. Only do this for non-secret values.

Do not use:

```dockerfile
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=$DATABASE_PASSWORD
```

Build arguments and image history are not secret stores. Production secrets must be injected when the container starts.

### 3.5 Multi-Stage Build — The Most Important Pattern

Multi-stage build uses multiple `FROM` statements in one Dockerfile. Early stages build; the final stage copies only required artifacts. Result: a small final image without dev tools.

```
Stage 1: base        → Node.js + pnpm setup
Stage 2: deps        → install all dependencies
Stage 3: build       → nx build to produce dist/
Stage 4: runtime     → Node.js + copy dist/ only (no source, no dev node_modules)
```

**Why it matters:**

- Dev build image: ~2GB (source, node_modules, build tools)
- Production image (multi-stage): ~200–400MB (dist/ + prod dependencies only)
- Smaller image → faster pull, smaller attack surface

### 3.6 Backend Dockerfile — QRTable Pattern

QRTable uses a single Dockerfile for all 8 NestJS services, parameterized by `APP_NAME`:

```dockerfile
# syntax=docker/dockerfile:1.7

# Stage 1: Base environment with Node.js and pnpm
FROM node:22.12-alpine3.20 AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable          # enable pnpm without separate install
WORKDIR /workspace

# Stage 2: Install dependencies
# COPY package files before source → cache pnpm install when source changes
FROM base AS deps
COPY package.json pnpm-lock.yaml nx.json tsconfig.base.json ./
COPY apps ./apps
COPY libs ./libs
# Mount pnpm store cache → do not re-download packages across builds
RUN --mount=type=cache,id=pnpm-store,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 3: Build with Nx
FROM deps AS build
ARG APP_NAME
RUN test -n "$APP_NAME"      # fail early if APP_NAME is empty
RUN pnpm nx build "$APP_NAME" --configuration=production
# Install production dependencies only into dist/
RUN pnpm --dir "dist/apps/$APP_NAME" install --prod --frozen-lockfile

# Stage 4: Compact runtime image
FROM node:22.12-alpine3.20 AS runtime
ARG APP_NAME
ENV NODE_ENV=production
WORKDIR /app
# Non-root user for security principle of least privilege
RUN addgroup -g 1001 -S qrtable && adduser -S qrtable -u 1001 -G qrtable
# Copy only dist/ from build stage — no source, no dev dependencies
COPY --from=build --chown=qrtable:qrtable /workspace/dist/apps/${APP_NAME} ./
USER qrtable
CMD ["node", "main.js"]
```

**Explanation of decisions:**

`node:22.12-alpine3.20` — alpine is a minimal Linux distro (~5MB), not `node:22-alpine` (unpinned) or `node:22` (debian, ~900MB).

`--frozen-lockfile` — enforce exact versions in the lockfile, no silent updates.

`--mount=type=cache` — BuildKit cache for pnpm store, no re-downloading identical packages across different builds. BuildKit only, not legacy docker build.

Non-root user (`qrtable`, uid 1001) — principle of least privilege. Containers should not run as root because a security exploit would give the attacker root inside the container.

### 3.7 Next.js Standalone Build — Management App

Next.js has an `standalone` output mode that produces a self-contained `server.js` with all dependencies — no full `node_modules` required:

```typescript
// next.config.ts
const nextConfig: NextConfig = {
  output: 'standalone', // ← add this line
};
```

After `next build`:

```
.next/standalone/        → server.js + minimal node_modules
.next/static/            → JS/CSS assets
public/                  → static files
```

**Why it matters:** Without standalone mode, you must copy the entire `node_modules` (~500MB) into the image. Standalone mode → runtime image only ~150MB.

```dockerfile
# docker/management-app.Dockerfile

FROM node:22.12-alpine3.20 AS deps
# ... (similar to backend but copy management-app only)

FROM deps AS build
# Build-time public vars must be present at build time, cannot inject at runtime
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
# Copy EACH part — standalone, static, public
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/standalone ./
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/.next/static ./apps/management-app/.next/static
COPY --from=build --chown=qrtable:qrtable /workspace/apps/management-app/public ./apps/management-app/public
USER qrtable
EXPOSE 3000
CMD ["node", "apps/management-app/server.js"]
```

### 3.8 Vite PWA Build — Customer PWA

Customer PWA is a static site (Vite output = HTML + JS + CSS files). The runtime image uses Nginx to serve static files:

```dockerfile
# docker/customer-pwa.Dockerfile

FROM node:22.12-alpine3.20 AS build
# ... install deps + build
ARG VITE_BFF_URL        # build-time only
ENV VITE_BFF_URL=$VITE_BFF_URL
RUN pnpm nx build customer-pwa
# Result: apps/customer-pwa/dist/

FROM nginx:1.27-alpine AS runtime
COPY --from=build /workspace/apps/customer-pwa/dist /usr/share/nginx/html
COPY docker/nginx/customer-pwa.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
```

**SPA fallback configuration (important):** Vite PWA uses React Router — when a user navigates directly to `/scan?tenant=abc`, Nginx must serve `index.html` instead of returning 404:

```nginx
server {
  listen 80;
  root /usr/share/nginx/html;
  location / {
    try_files $uri $uri/ /index.html;  # SPA fallback
  }
}
```

### 3.9 Build-Time vs Runtime Environment — The Most Important Point

This is the most confusing point when working with Docker + frontend apps.

**Build-time variables (baked into the image):**

- `NEXT_PUBLIC_`\* — Next.js embeds into JS bundle at build time
- `VITE_*` — Vite embeds into JS bundle at build time
- Cannot be changed after the image is built

**Runtime variables (injected when container starts):**

- Backend env vars: `TYPEORM_HOST`, `REDIS_HOST`, `KAFKA_BROKERS`, ...
- Can be changed via `docker-compose.app.yaml` `environment:` section

```
# ❌ Anti-pattern: build image with localhost values, use in production
docker build --build-arg VITE_BFF_URL=http://localhost:3300 .
→ This image will fail in production because frontend tries to call localhost

# ✅ Correct: build image with production URL
docker build --build-arg VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 .
→ This image works in production
```

**Implication:** One Customer PWA image works with only one production URL. If the URL changes later, you must rebuild the image. This is the trade-off of Vite static builds.

---

## 4. Docker Compose — Orchestrating Multiple Services

### 4.1 YAML Syntax Fundamentals

A Compose file uses YAML. YAML represents objects through indentation and normally does not use JSON-style `{}` braces.

```yaml
services: # mapping key
  bff: # nested mapping key
    image: qrtable-bff:v1 # scalar string
    networks: # key with a sequence value
      - qrtable-edge # sequence item
      - qrtable-app
```

Structures to remember:

| YAML structure | Example                           | Conceptual equivalent   |
| -------------- | --------------------------------- | ----------------------- |
| Mapping        | `image: postgres:16`              | Object key-value        |
| Nested mapping | Multi-line `healthcheck: { ... }` | Object inside an object |
| Sequence       | `- qrtable-app`                   | Array/list              |
| Scalar         | `"3300:3300"`, `true`, `30s`      | One value               |
| Comment        | `# internal only`                 | Ignored by the parser   |

**Indentation is syntax.** Two spaces are the common convention. Do not use tabs.

```yaml
# Correct
services:
  bff:
    image: qrtable-bff:v1

# Wrong: image is not nested under bff
services:
  bff:
  image: qrtable-bff:v1
```

Quote values that YAML might interpret as another type:

```yaml
environment:
  KC_HTTP_ENABLED: 'true'
  PORT: '3300'
  PASSWORD_WITH_COLON: 'abc:def'
```

Environment variables inside a container are ultimately strings. Quoting avoids accidental YAML parsing of `true`, `false`, `yes`, numbers, or special characters.

### 4.2 Compose Object Model and Top-Level Keys

A Compose file describes **desired state**: which services must exist, which images they use, which networks they join, which volumes they mount, and which configuration starts them.

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

| Top-level key | Responsibility                                                        |
| ------------- | --------------------------------------------------------------------- |
| `name`        | Compose project name, used to prefix container/network/volume names   |
| `services`    | Container workloads that should run                                   |
| `networks`    | Virtual networks for service communication                            |
| `volumes`     | Persistent data stores managed by Docker                              |
| `secrets`     | Secret objects mounted into containers when supported by the platform |
| `configs`     | Non-secret configuration files                                        |

A Compose **service** is desired configuration, not a container. Compose can create or recreate containers from a service definition.

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

| Service key         | Meaning                                                                   |
| ------------------- | ------------------------------------------------------------------------- |
| `image`             | Image used to create the container                                        |
| `build`             | How to build an image from source; production should pull released images |
| `command`           | Override Dockerfile `CMD`                                                 |
| `entrypoint`        | Override Dockerfile `ENTRYPOINT`                                          |
| `environment`       | Inject or override runtime environment variables                          |
| `env_file`          | Load runtime environment variables from a file                            |
| `ports`             | Publish a container port to the host                                      |
| `expose`            | Document an internal port; does not publish it to the host                |
| `volumes`           | Mount a named volume or host path                                         |
| `networks`          | Attach a service to Docker networks                                       |
| `depends_on`        | Startup ordering and optional health conditions                           |
| `healthcheck`       | Command that determines `healthy`/`unhealthy`                             |
| `restart`           | Restart policy after process exit or daemon restart                       |
| `labels`            | Metadata for logging, discovery, and operations                           |
| `profiles`          | Enable a service only when a selected profile is active                   |
| `user`              | Override runtime UID/GID                                                  |
| `read_only`         | Make the root filesystem read-only                                        |
| `tmpfs`             | Provide a temporary memory-backed writable filesystem                     |
| `cap_drop`          | Drop unnecessary Linux capabilities                                       |
| `security_opt`      | Enable security options such as `no-new-privileges`                       |
| `init`              | Run a small init process to forward signals and reap child processes      |
| `stop_grace_period` | Graceful shutdown duration before force-kill                              |

#### `image` and `build`

```yaml
image: registry.digitalocean.com/qrtable/bff:abc123
```

Compose uses the local image if present or pulls it according to policy/command.

```yaml
build:
  context: .
  dockerfile: docker/backend.Dockerfile
  args:
    APP_NAME: bff
  target: runtime
```

- `context` is equivalent to the final `.` in `docker build`.
- `dockerfile` selects the file.
- `args` maps to Dockerfile `ARG`.
- `target` selects a multi-stage target.

Phase 7 builds images in CI and pushes them to a registry. The Droplet uses `image`, not source builds, for faster and more reproducible deployment.

#### `command` and `entrypoint`

Dockerfile:

```dockerfile
ENTRYPOINT ["node"]
CMD ["main.js"]
```

Compose:

```yaml
command: ['worker.js']
```

results in `node worker.js`.

```yaml
entrypoint: ['/bin/sh', '-c']
command: ['node main.js && echo done']
```

overrides the primary executable too. Only do this intentionally because an override can remove the image's expected signal handling or startup behavior.

#### `ports` and `expose`

Short syntax:

```yaml
ports:
  - '127.0.0.1:3300:3300'
```

Read left to right:

```text
HOST_IP : HOST_PORT : CONTAINER_PORT
127.0.0.1:   3300   :      3300
```

- Omitting `HOST_IP` normally binds on every interface.
- `"3300:3300"` can make a service public if the firewall allows it.
- A single `"3300"` asks Docker to choose a random host port, which is rarely suitable for production.

`expose`:

```yaml
expose:
  - '3300'
```

does not publish a port to the host. Containers on the same network can call `bff:3300` even without `expose`, so it primarily acts as documentation/metadata.

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

- `postgres_data` is a named volume.
- `./docker/postgres/init` is a bind mount from the host.
- `:ro` is read-only; the default is read-write.

A bind mount hides existing content at the container target. Mounting an empty host directory over `/app` can make application files in the image appear to disappear.

#### `restart` Policies

| Policy           | Behavior                                         |
| ---------------- | ------------------------------------------------ |
| `no`             | Do not restart automatically                     |
| `always`         | Always restart, including after daemon restart   |
| `on-failure`     | Restart when the exit code is non-zero           |
| `unless-stopped` | Restart unless an operator explicitly stopped it |

`restart` does not repair dependency failures. If an app restart-loops because its DB schema is missing, fix the root cause instead of relying on the restart loop.

#### Runtime Hardening and Graceful Shutdown

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

- `read_only: true` prevents arbitrary writes to the image filesystem. Writable paths must be volumes or `tmpfs`.
- `tmpfs` lives in memory and disappears when the container stops; it suits temporary files, not database data.
- `cap_drop: ALL` reduces kernel privileges; add a capability back only when the app truly needs it.
- `no-new-privileges` prevents processes from gaining privileges through setuid/setgid.
- `init: true` helps forward signals and reap zombie child processes.
- `stop_grace_period` gives NestJS time to close servers, consumers, and connections before Docker sends a kill signal.

Avoid hardcoding:

```yaml
container_name: bff
```

unless it is truly necessary. Compose creates names from the project/service automatically, while service discovery uses the service name `bff`. A fixed `container_name` creates collision risk and prevents straightforward replica scaling.

### 4.4 Variable Interpolation, `.env`, `env_file`, and Precedence

Compose interpolation happens while parsing YAML:

```yaml
image: ${REGISTRY}/bff:${TAG}
```

Common syntax:

```text
${TAG}              read TAG, empty when unset
${TAG:-phase7}      use phase7 when TAG is unset or empty
${TAG-phase7}       use phase7 when TAG is unset
${TAG:?TAG required} fail parsing with a message when TAG is missing/empty
$$                  escape to one literal $ character
```

Interpolation values normally come from the shell environment, project `.env`, or `docker compose --env-file FILE`.

**Important:** service `env_file` is different:

```yaml
services:
  bff:
    env_file:
      - /opt/qrtable/.env.production
```

This file injects variables **into the runtime container**. Do not assume it always supplies values for `${...}` parsing throughout the Compose file.

Within one service, `environment` overrides values from `env_file`:

```yaml
env_file:
  - /opt/qrtable/.env.production
environment:
  REDIS_HOST: redis
```

Image `ENV` is a lower-priority default; runtime Compose values override it.

Inspect the interpolated result:

```bash
TAG=abc123 REGISTRY=registry.digitalocean.com/qrtable \
  docker compose -f docker-compose.app.yaml config
```

### 4.5 Compose Command Lifecycle

| Command                               | What it does                                   | What it does not do                       |
| ------------------------------------- | ---------------------------------------------- | ----------------------------------------- |
| `docker compose pull`                 | Download images                                | Does not create/start containers          |
| `docker compose build`                | Build services with `build:`                   | Does not pull release images for you      |
| `docker compose create`               | Create containers                              | Does not start them                       |
| `docker compose start`                | Start existing containers                      | Does not apply new configuration          |
| `docker compose up -d`                | Reconcile desired state, create/recreate/start | Does not prove the app is healthy         |
| `docker compose stop`                 | Stop containers                                | Does not remove containers/networks       |
| `docker compose restart`              | Restart current containers                     | Does not apply image/config changes       |
| `docker compose down`                 | Stop and remove project containers/networks    | Does not remove named volumes by default  |
| `docker compose down -v`              | Down and remove named volumes                  | Can delete database data                  |
| `docker compose ps`                   | Display state/health                           | Does not test a business flow             |
| `docker compose logs -f SERVICE`      | Stream logs                                    | Does not open a shell                     |
| `docker compose exec SERVICE CMD`     | Run a command inside a running container       | Fails when the service is not running     |
| `docker compose run --rm SERVICE CMD` | Create a one-off container                     | Does not run inside the current container |
| `docker compose config`               | Render final configuration                     | Starts nothing                            |

Important deployment sequence:

```bash
TAG=abc123 docker compose -f docker-compose.app.yaml pull
TAG=abc123 docker compose -f docker-compose.app.yaml up -d
```

`pull` downloads the artifact first to reduce replacement time. `up -d` detects image/config changes and recreates the required containers.

Do not use:

```bash
docker compose restart
```

to apply a new image tag. `restart` only stops and starts the current container with its old configuration.

### 4.6 Why Docker Compose Is Needed

`docker run` starts only one container. QRTable has 18+ services that must start in the correct order, with the correct network, volumes, and env vars. Docker Compose declares all of that in YAML.

```yaml
services:
  bff:
    image: qrtable-bff:v1
    environment:
      REDIS_HOST: redis # service name → DNS name in Docker network
    depends_on:
      redis:
        condition: service_healthy # wait for redis healthy before start

  redis:
    image: redis:7.4.1-alpine
    healthcheck:
      test: ['CMD', 'redis-cli', 'ping']
```

Docker Compose provides:

- **Service discovery:** service name is automatically a DNS name — `redis:6379`, not an IP.
- **Dependency ordering:** `depends_on` with conditions.
- **Network isolation:** services see each other only through declared networks.
- **Volume management:** persistent storage separate from container lifecycle.
- **Health checks:** container restart policy depends on health status.

### 4.7 Networks — Isolation and Routing

Docker networks in QRTable Production have 3 tiers:

```yaml
networks:
  qrtable-edge: # Services reachable from the internet (BFF, Management App, Customer PWA)
    name: qrtable-edge
  qrtable-app: # Internal services — NestJS microservices communicate with each other
    name: qrtable-app
    internal: true # No internet access from containers in this network
  qrtable-infra: # Infrastructure — PostgreSQL, Redis, Kafka, MongoDB, Keycloak
    name: qrtable-infra
    internal: true
```

#### Diagram: QRTable Production Network Topology

> Three network tiers reflect the defense-in-depth principle. Internet reaches only Caddy (edge). Caddy forwards to services in qrtable-edge. Services in qrtable-app cannot connect to the internet. Databases in qrtable-infra are reachable only from qrtable-app.

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

    subgraph "qrtable-app network (internal)"
        ORDER["Order :3301"]
        CATALOG["Catalog :3305"]
        KITCHEN["Kitchen :3307"]
        PAYMENT["Payment :3308"]
        SAAS["SaaS :3306"]
        AUTH["Authorizer :3304"]
        UA["User-Access :3303"]
    end

    subgraph "qrtable-infra network (internal)"
        PG["PostgreSQL :5432"]
        MONGO["MongoDB :27017"]
        REDIS["Redis :6379"]
        KAFKA["Kafka :9092"]
        KC["Keycloak :8080"]
    end

    USER -->|"HTTPS 443"| CADDY
    CADDY --> BFF & MGMT & PWA & KC
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

**QRTable network rules:**

- **Only Caddy** joins `qrtable-edge` and exposes ports 80/443 to the host
- **BFF** joins `qrtable-edge`, `qrtable-app`, and `qrtable-infra` — it is the gateway
- **Microservices** join only `qrtable-app` and `qrtable-infra` — no direct internet access
- **Databases** join only `qrtable-infra` — reachable only from services in `qrtable-app`

Every container has its own loopback interface. Inside the BFF container:

```text
localhost:6379
```

means port 6379 of the BFF container itself, not Redis. Redis must be addressed through its DNS service name:

```text
redis:6379
```

Docker's embedded DNS only resolves service names when two containers share at least one network.

`internal: true` isolates a network from external connectivity. However, a container attached to both an internal network and an edge network can still have an external route through the other network. Network security must be evaluated across every network attached to a service.

### 4.8 Volumes — Persistent Storage

Container filesystem is ephemeral — when a container is deleted, data is lost. Volumes store data outside the container lifecycle:

```yaml
volumes:
  postgres_data: # PostgreSQL data files
  mongodb_data: # MongoDB data
  redis_data: # Redis AOF/RDB
  kafka_data: # Kafka KRaft data
  keycloak_data: # Keycloak themes and internal config
  caddy_data: # Let's Encrypt certificates (IMPORTANT — if lost, must request again)
  caddy_config: # Caddy runtime config

services:
  postgres:
    volumes:
      - postgres_data:/var/lib/postgresql/data # named volume
      - ./docker/postgres/init:/docker-entrypoint-initdb.d:ro # bind mount (read-only)
```

**Named volume** (`postgres_data:`) — managed by Docker, persists across container recreate.
**Bind mount** (`./docker/...:/container/path`) — maps host directory into container. Used for config files, init scripts.
**tmpfs mount** — data lives in RAM and disappears when the container stops. Use it for temporary files and writable paths with a read-only root filesystem.

Removing a container does not remove a named volume. `docker compose down` also keeps named volumes by default. Only `docker compose down -v` or `docker volume rm` removes them.

Linux permissions still apply to volume content. If a database image runs with a UID that does not own the volume files, the container can fail with `permission denied`. Do not solve this with `chmod 777`; align UID/GID or use the official image's initialization behavior.

**Special note for `caddy_data`:** Caddy stores Let's Encrypt certificates here. If the volume is deleted, Caddy must request a new cert from Let's Encrypt. Let's Encrypt rate limit is 5 cert requests/domain/week — losing the volume repeatedly will hit the limit.

### 4.9 Health Checks — Correct Dependency Ordering

```yaml
postgres:
  healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER} -d qrtable_bootstrap']
    interval: 10s # check every 10 seconds
    timeout: 5s # timeout after 5 seconds
    retries: 10 # fail after 10 failures
    start_period: 30s # grace period when container first starts

order:
  depends_on:
    postgres:
      condition: service_healthy # wait for postgres healthy
    redis:
      condition: service_healthy
    kafka:
      condition: service_started # kafka has no official health check
```

**Why is `service_healthy` more important than `service_started`?**
`service_started` only means the container process has started. PostgreSQL may still be initializing the database for 30 seconds after start — if Order service connects at that moment it will fail. `service_healthy` ensures PostgreSQL is ready to accept connections.

`healthcheck.test` has two forms:

```yaml
# Exec form: no shell expansion
test: ["CMD", "redis-cli", "ping"]

# Shell form: runs through /bin/sh -c and supports $VAR, &&, and pipes
test: ["CMD-SHELL", "pg_isready -U $${POSTGRES_USER} || exit 1"]
```

Inside a Compose string, `$$` escapes `$` so it reaches the container instead of being interpolated by Compose on the host.

Timing fields:

| Field          | Meaning                                                       |
| -------------- | ------------------------------------------------------------- |
| `interval`     | Time between checks                                           |
| `timeout`      | Maximum duration of one check                                 |
| `retries`      | Consecutive failures before becoming `unhealthy`              |
| `start_period` | Startup grace period; early failures are not counted normally |

Healthcheck exit code `0` means success. A non-zero exit code means failure.

**Important limitation:** `depends_on: condition: service_healthy` only coordinates startup. If PostgreSQL dies after Order has started, Compose does not understand the business dependency and does not automatically restart Order from the dependency graph. The application still needs retry/reconnect logic and monitoring.

### 4.10 Layered Compose — Separating Concerns

QRTable uses 4 separate compose files, each with a clear responsibility:

| File                                                      | Contains                                    | How to start                                        |
| --------------------------------------------------------- | ------------------------------------------- | --------------------------------------------------- |
| `docker-compose.infra.yaml`                               | PostgreSQL, MongoDB, Redis, Kafka, Keycloak | `docker compose -f docker-compose.infra.yaml up -d` |
| `docker-compose.app.yaml`                                 | 8 NestJS services + 2 frontend apps         | `docker compose -f docker-compose.app.yaml up -d`   |
| `docker-compose.proxy.yaml`                               | Caddy reverse proxy                         | `docker compose -f docker-compose.proxy.yaml up -d` |
| `docker-compose.monitoring.yaml` + `monitoring.prod.yaml` | Prometheus, Loki, Promtail, Tempo, Grafana  | `docker compose -f ...yaml -f ...prod.yaml up -d`   |

**Reasons for separation:**

- New deploy: only restart `docker-compose.app.yaml` — infra does not need restart
- Update proxy config: only restart `docker-compose.proxy.yaml` — apps stay up
- Monitoring optional: can disable monitoring layer to save RAM
- Compose override: `monitoring.prod.yaml` overrides production-specific parts of `monitoring.yaml`

**External networks:** Different compose files communicate through shared networks:

```yaml
# docker-compose.app.yaml
networks:
  qrtable-app:
    external: true # already created by docker-compose.infra.yaml
    name: qrtable-app
```

### 4.11 Compose Validation — Why `docker compose config` Is Mandatory Preflight

`docker compose config` reads the compose file, resolves environment variables, merges overrides, and prints the final configuration Docker will use. This is the cheapest command to catch errors before actually changing containers.

It catches errors such as:

- YAML wrong indentation or wrong type.
- Variables `${TAG}`, `${REGISTRY}`, `${POSTGRES_USER}` not set.
- External network does not exist or wrong name.
- Wrong service reference, e.g. app points to `postgresql` but actual service is `postgres`.
- Port or volume mapping syntax errors.

Phase 7 preflight should run all layers:

```bash
docker compose -f docker-compose.infra.yaml config > /dev/null
docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml config > /dev/null
docker compose -f docker-compose.app.yaml config > /dev/null
docker compose -f docker-compose.proxy.yaml config > /dev/null
```

**Mental model:** `docker compose config` does not prove services run. It only proves the deployment declaration can render validly. You still need `docker compose ps`, logs, health checks, and smoke tests.

---

## 5. QRTable Production 4-Layer Architecture

### 5.1 Start Order — Cannot Be Arbitrary

```
1. docker compose -f docker-compose.infra.yaml up -d
   → Postgres healthy → MongoDB healthy → Redis healthy → Kafka started → Keycloak started
   → Keycloak connects to Postgres to bootstrap database
   → Wait a few minutes for Keycloak init to complete

2. docker compose -f docker-compose.monitoring.yaml -f docker-compose.monitoring.prod.yaml up -d
   → Prometheus, Loki, Promtail, Tempo, Grafana start
   → Promtail begins collecting logs from containers (including infra layer)

3. docker compose -f docker-compose.app.yaml up -d
   → All NestJS services start with production env_file
   → BFF waits for all microservices TCP reachable

4. docker compose -f docker-compose.proxy.yaml up -d
   → Caddy starts, requests Let's Encrypt certs
   → HTTPS live for api, app, qr, auth, grafana subdomains
```

**Why monitoring before app?** Promtail needs to see Docker containers when they start to collect logs from the beginning. If monitoring starts after app, startup logs will be missed.

**Why proxy last?** Caddy requests Let's Encrypt certificates on start — DNS must already resolve to Droplet IP. If proxy starts before DNS propagates, cert request will fail.

### 5.2 Port Exposure Strategy — Only 80 and 443 Public

```
Droplet public ports:
  80/tcp  → Caddy (HTTP → HTTPS redirect)
  443/tcp → Caddy (HTTPS termination)
  22/tcp  → SSH (restrict to your IP only)

All ports below are NOT public (firewall deny):
  3300-3308    NestJS HTTP ports
  3201-3208    NestJS TCP ports
  5432         PostgreSQL
  6379         Redis
  27017        MongoDB
  9092         Kafka
  8080         Keycloak (via Caddy → auth.domain)
  3000         Grafana (via Caddy → grafana.domain)
  3100, 9090, 3200, 4318  Monitoring (not exposed externally)
```

**Principle:** Every service is internal. Only Caddy touches the internet. Caddy performs TLS termination and forwards to internal services over Docker network.

### 5.3 Monitoring Layer — Observable but Not Public

Production monitoring has two seemingly opposing goals:

1. The team must be able to view logs, metrics, and traces when the system fails.
2. External parties must not access observability data, because logs and traces may contain tenant id, route, error message, provider response, or payment metadata.

Therefore Phase 7 uses this policy:

| Component  | Public?                         | How to access                              |
| ---------- | ------------------------------- | ------------------------------------------ |
| Grafana    | Yes, but via HTTPS + basic auth | `grafana.qrtable.vodinhquan.dev` via Caddy |
| Prometheus | No                              | Internal Docker network only               |
| Loki       | No                              | Internal Docker network only               |
| Tempo      | No                              | Internal Docker network only               |
| Promtail   | No UI                           | Reads internal Docker logs                 |

Prometheus in production must scrape by service name, not `host.docker.internal`:

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

**Mental model:** Grafana is the window for observation. Prometheus/Loki/Tempo are internal data stores. Public Grafana is already a risk, so it must have HTTPS, auth, strong password, and optionally IP restriction after thesis.

---

## 6. Reverse Proxy and HTTPS

### 6.1 Why a Reverse Proxy Is Needed

Without a reverse proxy, serving HTTPS for 5 subdomains requires:

- Handling TLS certificates for each domain in each app
- Each app managing cert renewal itself
- Each app exposing its own port to the internet

With Caddy as reverse proxy:

- Single TLS termination point
- Automatic Let's Encrypt cert request and renewal
- All services internal, only Caddy public

### 6.2 Caddy vs Nginx — Why Caddy Was Chosen

**Nginx** is the most popular reverse proxy but has an important friction point: TLS/Let's Encrypt is not automatic. You need:

1. Install Certbot separately
2. Configure Nginx server block
3. Run `certbot --nginx`
4. Set up cron job for renewal
5. Check renewal logs periodically

**Caddy** automates the entire TLS process:

1. Write Caddyfile — only domain name and backend needed
2. Start Caddy
3. Caddy requests cert and renews automatically

```caddyfile
# Caddy automatic HTTPS — simple enough to feel like magic
api.qrtable.vodinhquan.dev {
  reverse_proxy bff:3300
}

app.qrtable.vodinhquan.dev {
  reverse_proxy management-app:3000
}
```

This is the equivalent Nginx config with manual TLS:

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

Caddy is the right choice for single-host pilot when the team lacks Nginx/cert rotation experience.

### 6.3 TLS and Let's Encrypt — How It Works

Let's Encrypt is a free Certificate Authority. Caddy uses the **ACME protocol** to automatically verify domain ownership and receive certificates:

```
1. Caddy requests cert for api.qrtable.vodinhquan.dev from Let's Encrypt
2. Let's Encrypt sends challenge: "Serve this file at http://domain/.well-known/acme-challenge/token"
3. Caddy serves the challenge file automatically
4. Let's Encrypt verifies → issues certificate (valid 90 days)
5. Caddy renews automatically 30 days before expiry
```

**Prerequisites:**

- DNS A record points correctly to Droplet IP
- Ports 80 and 443 open on Droplet firewall
- Domain has propagated (dig shows correct IP)

**Rate limit:** Let's Encrypt allows at most 5 cert requests/domain/week. If you test too many times while debugging, you may hit rate limit. Use Let's Encrypt staging environment when testing.

### 6.4 WebSocket Proxying — QRTable Specific

BFF uses Socket.IO — reverse proxy must support WebSocket upgrade. Caddy automatically handles WebSocket upgrade with the `reverse_proxy` directive — no extra config needed.

If using Nginx, you need explicit config:

```nginx
proxy_http_version 1.1;
proxy_set_header Upgrade $http_upgrade;
proxy_set_header Connection "upgrade";
```

---

## 7. Secrets and Environment Management

### 7.1 Three Types of Secrets in QRTable

Clear classification determines how secrets are handled:

**Type 1 — Build-time public vars (OK in image):**

```
NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
VITE_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1
```

Embedded into JS bundle. Anyone can view in browser DevTools. Contains no sensitive information.

**Type 2 — Runtime secrets (inject when container starts, NEVER commit):**

```
POSTGRES_PASSWORD=...
KEYCLOAK_ADMIN_PASSWORD=...
AUTH_SECRET=...
SEPAY_OAUTH_CLIENT_SECRET=...
PAYMENT_SECRETS_ENCRYPTION_KEY=...
```

Exist only on the server, in `/opt/qrtable/.env.production` with permission 0600.

**Type 3 — Provider values (from external services, cannot be generated):**

```
SEPAY_OAUTH_CLIENT_ID=...
CLOUDINARY_CLOUD_NAME=...
KEYCLOAK_CLIENT_SECRET=...  (after Keycloak bootstrap)
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

Recommended rules:

- Each line is `KEY=value`.
- Blank lines and lines beginning with `#` are ignored.
- Quote values containing spaces or characters that create parsing ambiguity.
- Final values are strings.
- Do not write command substitution such as `PASSWORD=$(openssl rand -hex 32)` and expect Compose to execute it. Generate the value first, then store it.
- Do not treat `.env.production` as encrypted; permission `0600` only restricts filesystem access.

Passwords containing `$` need care because Compose interpolation also uses `$`. Always run `docker compose config` without leaking rendered secrets into public CI logs.

### 7.3 Immutable Principle: Never Commit Secrets

```
# ❌ Anti-pattern — commit .env with real secrets
git add .env.production
git commit -m "add production env"
# → Secrets remain in git history forever, even if file deleted later

# ✅ Correct — commit only .env.example with placeholder values
docker/env/.env.production.example  ← commit this (template with keys, no values)
/opt/qrtable/.env.production        ← exists only on server, in .gitignore
```

**Docker ARG vs ENV with secrets:**

```dockerfile
# ❌ Wrong — secret in build arg stored in image history
ARG DATABASE_PASSWORD
ENV DATABASE_PASSWORD=$DATABASE_PASSWORD

# ✅ Correct — secret injected runtime only via env_file
# Nothing about secrets in Dockerfile
```

### 7.4 Practical Secret Management for QRTable

```bash
# Create on server (one time only)
# Copy template
install -m 600 docker/env/.env.production.example /opt/qrtable/.env.production

# Generate random secrets
openssl rand -hex 32  # → 64 chars for PAYMENT_SECRETS_ENCRYPTION_KEY
openssl rand -base64 32  # → 44 chars for passwords, AUTH_SECRET

# Fill in /opt/qrtable/.env.production with nano/vim
nano /opt/qrtable/.env.production

# Verify permissions
ls -la /opt/qrtable/.env.production
# -rw------- 1 user user ... .env.production (0600)
```

**In docker-compose.app.yaml:**

```yaml
services:
  bff:
    env_file: /opt/qrtable/.env.production # load file from server
    environment: # per-service overrides
      REDIS_HOST: redis
      ORDER_SERVICE_HOST: order
      # ... host/port values per-service, override values in env_file
```

`env_file` loads all vars from the file. `environment` overrides. This pattern allows one shared env file for the entire stack, with each service overriding what it needs (host names, ports).

---

## 8. DigitalOcean Deployment — Infrastructure and Provisioning

### 8.1 Droplet Sizing and Rationale

| Tier                | Config                        | Use case                               |
| ------------------- | ----------------------------- | -------------------------------------- |
| Budget smoke        | 2 vCPU / 4 GiB                | Demo windows, monitoring off           |
| Pilot (recommended) | 4 vCPU / 8 GiB                | Thesis demo, monitoring on, full stack |
| Hardening           | 4+ vCPU / 8+ GiB + managed DB | After thesis when data safety needed   |

**Why 4 vCPU / 8 GiB for pilot?** Keycloak alone uses ~512MB RAM, Kafka + ZK ~1GB, PostgreSQL ~256MB, monitoring stack ~1GB, 8 NestJS services ~64–128MB each. Total: 4–6 GiB. 8 GiB provides headroom.

**Region `sgp1` (Singapore):** Closest to Vietnam → lowest latency. Check availability because not every DO product is in every region.

### 8.2 Cloud Firewall — First Defense Layer

DigitalOcean Cloud Firewall is a network-level firewall that blocks traffic before it reaches the Droplet:

```
Inbound rules:
  TCP 22   → Source: Your IP only (SSH)
  TCP 80   → Source: All IPv4, All IPv6
  TCP 443  → Source: All IPv4, All IPv6

Deny everything else:
  TCP 3300-3308  (NestJS HTTP) → DENY
  TCP 3201-3208  (NestJS TCP)  → DENY
  TCP 5432       (PostgreSQL)  → DENY
  TCP 6379       (Redis)       → DENY
  TCP 27017      (MongoDB)     → DENY
  TCP 9092       (Kafka)       → DENY
  TCP 3000-3001  (Grafana)     → DENY
  TCP 9090       (Prometheus)  → DENY
```

**Why Cloud Firewall is better than relying on Docker network alone?** Defense in depth — two protection layers. If Docker network config is wrong (e.g. accidentally exposing PostgreSQL port), Cloud Firewall still blocks from the external network layer.

### 8.3 Docker Engine Installation — From Official Repository

Ubuntu package manager has `docker.io` (old Ubuntu version). Install from Docker official repo for the latest version:

```bash
# Add Docker official GPG key
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Add Docker repository
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
Modern Docker uses `docker compose` (space, no hyphen) — the built-in plugin. `docker-compose` is the older standalone binary. Phase 7 uses the plugin.

### 8.4 DNS Configuration

Before starting Caddy, DNS must resolve correctly:

```bash
# Create A records in DigitalOcean DNS (or domain registrar):
api.qrtable.vodinhquan.dev  → <Droplet IPv4>
app.qrtable.vodinhquan.dev  → <Droplet IPv4>
qr.qrtable.vodinhquan.dev   → <Droplet IPv4>
auth.qrtable.vodinhquan.dev → <Droplet IPv4>
grafana.qrtable.vodinhquan.dev → <Droplet IPv4>

# Verify propagation (may take 5-30 minutes)
dig +short api.qrtable.vodinhquan.dev
# Must return Droplet IP
```

**TTL recommendation:** When setting up for the first time, set low TTL (60–300 seconds) so if IP is wrong you can fix quickly. After stable, set higher TTL (3600 seconds).

### 8.5 Server Layout and Preflight Checks

Production server needs a stable layout so deploy scripts do not depend on user temp directories:

```text
/opt/qrtable/
  docker-compose.infra.yaml
  docker-compose.app.yaml
  docker-compose.proxy.yaml
  docker-compose.monitoring.yaml
  docker-compose.monitoring.prod.yaml
  docker/
  tools/deploy/
  releases/
    current
    history.log
  backups/

/opt/qrtable/.env.production     # private, permission 0600
```

Preflight is the check before changing production state. It should fail early if conditions are missing:

```bash
test -f /opt/qrtable/.env.production
test "$(stat -c %a /opt/qrtable/.env.production)" = "600"
test -n "${IMAGE_TAG:-}"
docker compose -f docker-compose.app.yaml config > /dev/null
docker login registry.digitalocean.com
docker pull "registry.digitalocean.com/qrtable/bff:${IMAGE_TAG}"
```

**Do not confuse preflight with smoke test:**

| Check type   | When to run                | Answers the question                       |
| ------------ | -------------------------- | ------------------------------------------ |
| Preflight    | Before deploy              | Are conditions sufficient for safe deploy? |
| Health check | During container lifecycle | Is the process ready to serve?             |
| Smoke test   | After deploy, from outside | Can users/providers reach the real system? |

---

## 9. Database and Migration Strategy

### 9.1 Critical Blocker — TypeORM Synchronize Off in Production

This is one of the largest Phase 7 blockers that must be resolved before deploy:

**Development:** `TYPEORM_SYNCHRONIZE=true` → TypeORM automatically creates/modifies tables from entity definitions. Convenient but dangerous in production because it can auto-drop columns when entities change.

**Production:** `TYPEORM_SYNCHRONIZE=false` → No code creates tables. Fresh database = empty = all services fail on boot.

Solution must choose one of two:

**Option A — SQL Schema Bootstrap:**

```bash
# Generate schema from TypeORM entities (development environment)
pnpm nx run order:schema:generate  # produces schema SQL

# Apply to production database before starting app
psql "postgresql://user:pass@postgres:5432/qrtable_order" -f tools/db/phase7-schema.sql
```

**Option B — TypeORM Migrations:**

```bash
# Generate migration files
pnpm nx run order:migration:generate -- --name=initial_schema

# Run migrations
pnpm nx run order:migration:run

# Migrations are audit trail of database changes — versioned, reversible
```

**Recommendation:** Use TypeORM migrations from the start. Migrations enable: rollback database state, audit history of schema changes, CI smoke test migrations on fresh DB.

### 9.2 Multi-Database Strategy

QRTable uses one PostgreSQL instance but multiple databases (not schemas):

```sql
-- docker/postgres/init/001-create-databases.sql
CREATE DATABASE qrtable_catalog;
CREATE DATABASE qrtable_order;
CREATE DATABASE qrtable_saas;
CREATE DATABASE qrtable_payment;
CREATE DATABASE qrtable_keycloak;
-- Keycloak manages its own database
```

**Why multiple databases instead of one?** Better isolation. When hardening after thesis, easier to move each service to separate managed PostgreSQL if needed.

### 9.3 Seed Data for Demo

Production has no data by default. Seed after migrations run:

```bash
pnpm dev:reseed -- --yes    # run dev-reseed.sh with production database URL
pnpm dev:verify-seed        # verify seed data is valid
```

Seed data matters for demo: one tenant with stable slug, categories, menu items, tables, and Keycloak users that can log in.

### 9.4 Backup and Data Rollback — Different from App Rollback

App rollback and data rollback are two different things.

**App rollback** changes the running container image:

```bash
TAG=previous-good docker compose -f docker-compose.app.yaml up -d
```

This is fast because it only changes process/app code. Named volumes for PostgreSQL, MongoDB, Redis, Kafka remain unchanged.

**Data rollback** restores database to an older state. This is riskier because it may lose orders, payments, subscriptions, webhook audit, or new tenant data created after backup.

Phase 7 needs both backup layers:

| Backup type                                | Used for                               | Trade-off                                            |
| ------------------------------------------ | -------------------------------------- | ---------------------------------------------------- |
| DigitalOcean Droplet backup/snapshot       | Host-level recovery when Droplet fails | Full machine restore, slower, coarse-grained         |
| Logical DB backup (`pg_dump`, `mongodump`) | Per-DB/service recovery                | More controllable, needs script and retention policy |

Data restore should run only when operator has confirmed:

- backup timestamp is correct;
- app layer has stopped to prevent further writes;
- impact on payment/subscription state is understood;
- after restore, smoke tests and audit logs will be checked.

**Rule:** rollback workflow defaults to app image rollback only. Do not auto-restore database unless there is separate input and explicit confirmation.

---

## 10. CI/CD Pipeline — Release, Deploy, Rollback

### 10.1 Why CI/CD Is a First-Class Citizen

CI/CD is not just automation convenience — it solves three core problems:

**Safety:** No one can deploy code that has not passed tests. No one can deploy code with lint errors. Automatic gates prevent easily avoidable mistakes.

**Immutability:** Each deploy uses a specific image tag (git SHA). You know exactly which code runs on production. Rollback = deploy the old tag again.

**Auditability:** Who deployed, when, which commit, whether smoke tests passed — all in GitHub Actions history.

**CI** answers: is the code quality sufficient to merge or release?

**CD** answers: which verified artifact can go to which environment, by what process, with whose approval?

In QRTable, these two questions are not merged into one large workflow. CI can run on every PR. Release Images only creates artifacts. Deploy production is a separate action with approval, backup, preflight, smoke, and audit.

### 10.2 GitHub Actions Building Blocks

| Concept       | Meaning                                 | How QRTable uses it                                                        |
| ------------- | --------------------------------------- | -------------------------------------------------------------------------- |
| `on`          | Trigger workflow                        | PR/push for CI, `workflow_dispatch` for release/deploy/rollback            |
| `jobs`        | Independent execution unit              | `quality-gate`, `release`, `deploy`, `rollback`                            |
| `needs`       | Job dependency                          | Deploy runs only after build/release when shared workflow needs dependency |
| `permissions` | `GITHUB_TOKEN` permissions              | Release only needs `contents: read`, registry permission/token separate    |
| `secrets`     | Sensitive values stored by GitHub       | DO token, SSH key, SSH host/user                                           |
| `environment` | Deployment target with protection rules | `production` requires required reviewers                                   |
| `concurrency` | Block multiple deploys at once          | Only one production deploy/rollback at a time                              |
| `inputs`      | Manual trigger parameters               | `image_tag`, `run_smoke`, `run_backup`, `rollback_tag`                     |

GitHub Actions environments have special meaning: when a job declares `environment: production`, the job starts only after protection rules pass, and environment secrets are granted to the job at that point. This is why the production deploy workflow must set `environment: production`, not just name the job deploy.

Production workflow should have concurrency:

```yaml
concurrency:
  group: qrtable-production
  cancel-in-progress: false
```

`cancel-in-progress: false` avoids a later deploy cancelling one in progress mid-run, leaving production in a half-old half-new state.

### 10.3 Pipeline Architecture — Three Separate Workflows

#### Diagram: QRTable CI/CD Pipeline — Three Workflows

> Three workflows separated by concern. CI is the quality gate for every PR. Release Images builds immutable artifacts. Deploy Production actually deploys with approval gate. Rollback is a separate process, not a step inside deploy.

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
        SMOKE["Smoke tests from GitHub runner"]
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

- `run-many`: runs all, safer when project boundaries are not yet stable
- `affected`: runs only projects affected by changes, faster but requires Nx configured correctly

Early Phase 7: use `run-many`. After pipeline is stable: switch to `affected`.

### 10.5 Workflow 2 — Release Images: Build Immutable Artifact

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

          # Management App — bake production URLs at build time
          docker build \
            -f docker/management-app.Dockerfile \
            --build-arg NEXT_PUBLIC_BFF_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
            --build-arg NEXT_PUBLIC_BFF_BASE_URL=https://api.qrtable.vodinhquan.dev/api/v1 \
            --build-arg NEXT_PUBLIC_CUSTOMER_PWA_URL=https://qr.qrtable.vodinhquan.dev \
            -t "$REGISTRY/qrtable-management-app:$TAG" .
          docker push "$REGISTRY/qrtable-management-app:$TAG"
```

Docker docs also provide a GitHub Actions pattern using Buildx action directly. When the workflow is stable, prefer this action because cache and digest summary are clearer than manual shell `docker build`:

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

| Option                                   | Advantages                                          | When to use                                             |
| ---------------------------------------- | --------------------------------------------------- | ------------------------------------------------------- |
| Shell loop `docker build && docker push` | Easy to read, easy to debug, matches local commands | First pilot, when team is still stabilizing Dockerfiles |
| `docker/build-push-action`               | Better cache, metadata/digest, more CI-standard     | When workflow is stable and faster builds are needed    |

**Secrets in GitHub Actions:**

```
Settings → Secrets → Actions secrets:
  DIGITALOCEAN_ACCESS_TOKEN   → API token to login DigitalOcean Registry
  PRODUCTION_SSH_HOST         → Droplet IP
  PRODUCTION_SSH_USER         → ubuntu (or user name)
  PRODUCTION_SSH_KEY          → Private SSH key to connect to Droplet
```

### 10.6 Workflow 3 — Deploy Production: Approval Gate and Remote Deploy

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
    environment: production # ← Required reviewer approval here

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

**Remote deploy script (`phase7-remote-deploy.sh`) must:**

```bash
#!/usr/bin/env bash
set -euo pipefail

# Fail early if prerequisites missing
[[ -z "${IMAGE_TAG:-}" ]] && echo "IMAGE_TAG required" && exit 1
[[ ! -f /opt/qrtable/.env.production ]] && echo ".env.production missing" && exit 1

# Check env file permissions (must not be world-readable)
perm=$(stat -c %a /opt/qrtable/.env.production)
[[ "$perm" != "600" ]] && echo "SECURITY: .env.production must be 0600" && exit 1

# Validate compose syntax first
docker compose -f docker-compose.app.yaml config > /dev/null

# Pull images first to reduce downtime
TAG="${IMAGE_TAG}" docker compose -f docker-compose.app.yaml pull

# Restart app layer
TAG="${IMAGE_TAG}" docker compose -f docker-compose.app.yaml up -d

# Record deployment audit
mkdir -p /opt/qrtable/releases
echo "${IMAGE_TAG}" > /opt/qrtable/releases/current
echo "$(date -u +%Y%m%dT%H%M%SZ) ${IMAGE_TAG} ${GITHUB_ACTOR:-manual}" \
  >> /opt/qrtable/releases/history.log
```

### 10.7 Workflow 4 — Rollback: Separate from Deploy Workflow

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
    environment: production # still requires approval
    steps:
      # Similar to deploy but with rollback_tag
      # App rollback and data rollback are SEPARATE
      # --restore_data=true is a separate manual process
```

**Why rollback is separate from deploy?** Rollback is an emergency action that needs fast execution but still has an approval gate. It should not be confused with "deploy old version" — rollback is explicit intent with its own audit.

### 10.8 GitHub Environments — Approval Gate

GitHub Environments provide protection rules for production deployments:

```
GitHub Repository → Settings → Environments → production

Protection rules:
  ✓ Required reviewers: [owner/maintainer GitHub usernames]
  ✓ Deployment branches: main only
  ✓ Wait timer: 0 minutes (optional delay)
```

When a workflow reaches `environment: production`, GitHub automatically:

1. Pauses workflow
2. Sends notification to required reviewers
3. Reviewer approves/rejects in GitHub UI
4. Workflow continues (if approved) or fails (if rejected)

**Why approval for production?** SePay webhooks affect real payment state. Keycloak production clients must not change randomly. Database schema changes must be reviewed before deploy.

### 10.9 Deployment Policy by Phase

| Phase              | Build images              | Deploy production                                           |
| ------------------ | ------------------------- | ----------------------------------------------------------- |
| First pilot        | Manual trigger            | Manual with approval                                        |
| Stable thesis demo | Push to main → auto build | Manual with approval                                        |
| Mature production  | Push to main → auto build | Auto deploy to staging, manual with approval for production |

**Do not auto-deploy production on merge** until migrations, backups, rollback, and smoke tests are all proven stable.

### 10.10 Quality Gates, Release Gates, Deploy Gates

A good pipeline has more than "tests pass". It has multiple checkpoints at the right time:

| Gate            | Runs where                    | Example                                                 | Catches what                                               |
| --------------- | ----------------------------- | ------------------------------------------------------- | ---------------------------------------------------------- |
| Quality gate    | GitHub runner                 | lint, unit tests, build, doc anchors                    | Code errors, type errors, wrong doc anchors                |
| Image gate      | GitHub runner + Docker Buildx | build image, run container smoke, push registry         | Dockerfile errors, missing build arg, image won't start    |
| Preflight gate  | Production server via SSH     | env exists, permission 0600, compose config, image pull | Server missing secret, YAML/env errors, registry auth fail |
| Migration gate  | Production DB or staging DB   | migrations applied, schema ready                        | Fresh DB has no tables                                     |
| Deployment gate | GitHub environment            | required reviewer approval                              | Unintended production deploy                               |
| Smoke gate      | Outside production            | `curl` public HTTPS endpoints                           | DNS, TLS, Caddy, CORS, app boot errors                     |
| Rollback gate   | Production server             | previous tag exists, backup state known                 | Rollback to non-existent tag or unclear data state         |

Smoke tests must run from GitHub runner or a machine outside the Droplet, because the goal is to verify the real user/provider path:

```bash
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/live
curl -fsS https://api.qrtable.vodinhquan.dev/api/v1/health/ready
curl -fsS https://app.qrtable.vodinhquan.dev
curl -fsS https://qr.qrtable.vodinhquan.dev
curl -fsS https://auth.qrtable.vodinhquan.dev/realms/qrtable
```

SePay smoke in CI/CD should only be a **negative check**:

```bash
curl -fsS -o /dev/null -w "%{http_code}" \
  -X POST https://api.qrtable.vodinhquan.dev/api/v1/payment/sepay/webhook/platform
```

Expected: request without secret is rejected. CI/CD must not create real transfers or mutate external payment state.

---

## 11. Container Registry and Image Tagging

### 11.1 Why a Container Registry Is Needed

A registry is the "storage warehouse" for Docker images. When deploying to production, the server pulls images from the registry instead of rebuilding from source.

```
Developer machine / CI:
  docker build → image
  docker push → registry.digitalocean.com/qrtable/bff:abc123

Droplet (production server):
  docker pull registry.digitalocean.com/qrtable/bff:abc123
  docker compose up → start container from pulled image
```

Without a registry, you must copy images via `docker save` / `docker load` or rebuild on the server — both are worse.

### 11.2 Immutable Tags — Never Use `latest` in Production

```
❌ Anti-pattern: use :latest tag in production
  docker pull qrtable-bff:latest
  → "latest" is a floating tag, may point to different image over time
  → Don't know exactly which code is running
  → Rollback = "deploy latest" = still the new code

✅ Correct: immutable tag (git SHA)
  docker pull registry.digitalocean.com/qrtable/bff:a1b2c3d4
  → Know exactly which commit
  → Rollback = deploy old tag, e.g. registry.../bff:9x8y7z6w
  → Reproducible, auditable
```

**Git SHA as image tag** is the most common best practice: each commit produces a separate image with tag = git commit SHA (7 or 40 chars). This tag never changes.

### 11.3 DigitalOcean Container Registry

DO Container Registry has a free tier but check storage limit before pushing 10 images.

```bash
# Login from GitHub Actions
echo "$DO_ACCESS_TOKEN" | docker login registry.digitalocean.com --username=... --password-stdin

# Push image
docker push registry.digitalocean.com/qrtable/qrtable-bff:${GITHUB_SHA}

# Pull on server
docker pull registry.digitalocean.com/qrtable/qrtable-bff:${GITHUB_SHA}
```

**Image cleanup:** Registry accumulates images. Set up garbage collection policy to automatically delete old images (e.g. keep 5 most recent tags per image).

---

### 11.4 Image Digest, Retention, and Audit Trail

A tag like `abc123` is a human-readable name for an image. Digest is the actual content hash of the image:

```text
registry.digitalocean.com/qrtable/bff:abc123
registry.digitalocean.com/qrtable/bff@sha256:...
```

If a tag is accidentally pushed again, the digest changes. Therefore the release workflow should record both tag and digest summary:

```text
image=bff
tag=abc123
digest=sha256:...
built_at=2026-06-06T10:15:00Z
git_sha=abc123...
```

Production deploy audit should write:

```text
/opt/qrtable/releases/current
/opt/qrtable/releases/history.log
```

`history.log` should at minimum include: `deployed_at`, `deployed_by`, `image_tag`, `previous_tag`, `compose_files`, `smoke_result`, `github_run_url`.

**Retention rule:** keep enough old images for rollback. E.g. keep 5-10 most recent successful tags per service, and do not delete the tag in `/opt/qrtable/releases/current`.

---

## 12. Phase 7 Coverage Checklist

Use this checklist to self-verify: if after reading the guide you still cannot explain a line in the plan, that section needs more detail.

### 12.1 Docker and Build Artifacts

- Can explain Docker CLI, daemon, registry, image, container, namespace, cgroup, writable layer, and PID 1.
- Can read `docker run [OPTIONS] IMAGE [COMMAND] [ARG...]` syntax.
- Can explain `FROM`, `ARG`, `ENV`, `WORKDIR`, `COPY`, `RUN`, `USER`, `EXPOSE`, `HEALTHCHECK`, `ENTRYPOINT`, and `CMD`.
- Can distinguish shell form from exec form and understand `CMD`/`ENTRYPOINT` overrides.
- `.dockerignore` excludes `.env`, `node_modules`, `dist`, `.nx/cache`, generated data, and local build output.
- Backend uses one parametric Dockerfile with `APP_NAME`.
- Management App uses Next.js standalone output.
- Customer PWA is a static build served via Nginx with SPA fallback.
- Public frontend env (`NEXT_PUBLIC_*`, `VITE_*`) are build-time values.
- Runtime secrets do not appear in Dockerfile, build args, image history, or git.
- Build uses frozen lockfile to ensure reproducibility.

### 12.2 Compose and Network

- Can read YAML mappings, sequences, scalars, indentation, and variable interpolation.
- Can distinguish `image`/`build`, `command`/`entrypoint`, `environment`/`env_file`, and `ports`/`expose`.
- Understands the lifecycle of `pull`, `build`, `create`, `start`, `up -d`, `restart`, `down`, `exec`, `run`, and `config`.
- Infra, app, proxy, monitoring are independent layers.
- Databases, Redis, Kafka, Prometheus, Loki, Tempo have no public port.
- Caddy is the only service exposing `80` and `443`.
- App containers call each other by service name (`order`, `catalog`, `postgres`, `redis`, `kafka`), not `localhost`.
- Named volumes hold database, Kafka, Redis, Keycloak, and Caddy certificate data.
- `docker compose config` passes for every layer before deploy.

### 12.3 Production Readiness

- DigitalOcean Cloud Firewall opens only SSH from trusted IP, `80`, and `443`.
- DNS A records for `api`, `app`, `qr`, `auth`, `grafana` resolve to Droplet IP before starting Caddy.
- `/opt/qrtable/.env.production` exists on server, permission `0600`, not committed.
- `TYPEORM_SYNCHRONIZE=false` has corresponding schema strategy: migrations or reviewed SQL bootstrap.
- Keycloak runs production `start`, not `start-dev`.
- Grafana goes through HTTPS and auth; observability stores are private.

### 12.4 CI/CD and Operations

- CI runs lint, tests, build, and `pnpm verify:doc-anchors`.
- Release workflow builds/pushes 10 immutable images with git SHA tag.
- Deploy workflow uses `workflow_dispatch`, `environment: production`, required approval, preflight, backup option, remote deploy, smoke tests, audit log.
- Rollback workflow is separate from deploy workflow and rolls back via previous image tag.
- Data restore does not run automatically in app rollback.
- Smoke tests run from outside Droplet to verify DNS, TLS, proxy, and public routes.
- SePay webhook CI check is a negative check, does not create real payment side effects.

---

## 13. Mental Model Summary

#### Diagram: Mental Model — Docker, Deployment and CI/CD in QRTable

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
      Build-arg vs ENV: secrets never as build-arg
    Docker Compose
      Services = containers
      Networks = isolation layers
      Volumes = persistent storage
      Health checks = dependency ordering
      Layered compose = separation of concerns
    4-Layer Architecture
      infra: PostgreSQL MongoDB Redis Kafka Keycloak
      app: 8 NestJS + 2 frontend
      proxy: Caddy HTTPS termination
      monitoring: PLG + Prometheus + Tempo
    Network Topology
      qrtable-edge: public-facing services
      qrtable-app: internal microservices
      qrtable-infra: databases (internal only)
      Only Caddy exposes port 80/443
    Secrets Management
      Build-time public: NEXT_PUBLIC VITE
      Runtime secrets: .env.production 0600
      Never commit secrets
      env_file + environment override pattern
    CI/CD Pipeline
      CI = quality gate: lint test build
      Release = build immutable images with git SHA tag
      Deploy = approval gate + remote SSH deploy
      Rollback = separate from deploy workflow
      Audit trail = releases/current + history.log
    DigitalOcean
      Droplet: 4 vCPU 8 GiB Ubuntu 24.04
      Cloud Firewall: only 22/80/443 public
      DNS: A records for 5 subdomains
      Caddy: automatic Let's Encrypt TLS
    Migration Blocker
      TYPEORM_SYNCHRONIZE=false in production
      Must choose: SQL schema or TypeORM migrations
      Migrations before starting app containers
```

After reading the entire document, this is the mental model to remember:

**About Docker:** Image is an immutable template, container is a running instance. Multi-stage build creates a compact runtime image. Layers are cached — rarely changing instructions at top, frequently changing at bottom. `NEXT_PUBLIC_`_ and `VITE\__` are build-time, baked into JS bundle — cannot change at runtime. Secrets must never be Docker build args.

**About Docker Compose:** Three network layers (edge, app, infra) reflect defense in depth. Only Caddy exposes ports to the internet. Health checks are prerequisite for `depends_on` to mean something. Layered compose files separate concerns: infra/app/proxy/monitoring restart independently.

**About deployment flow:** Order matters: infra healthy → monitoring → app containers → proxy (Caddy needs DNS resolved before requesting cert). Caddy data volume holds Let's Encrypt cert — do not delete. Secrets in `/opt/qrtable/.env.production` with permission 0600 — never world-readable.

**About CI/CD:** Three separate workflows: CI (quality gate), Release (build immutable images), Deploy (approval + remote SSH). Immutable tags with git SHA — never use `:latest` in production. Rollback = redeploy old image tag — not "deploy old code". Schema migration is a hard gate — cannot skip.

**About migration blocker:** `TYPEORM_SYNCHRONIZE=false` in production means fresh database is empty. Must run migrations before starting app containers. This is why Phase 7 plan has "Task 9: Resolve Schema Blocker" as a hard blocker before go-live.

**About immutability:** An image with tag `abc123` is immutable — never changes. Knowing which image tag is running = knowing exactly which code. Rollback is an operation you can perform anytime as long as the old image remains in the registry. This is the core strength of container-based deployment.
