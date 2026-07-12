# QRTable

QRTable is a multi-tenant SaaS POS platform for food and beverage businesses. It supports QR-based table ordering, kitchen operations, payments, and restaurant management through an event-driven microservices architecture in an Nx monorepo.

## Product Overview

The platform combines NestJS services, a management application, and a customer-facing PWA. PostgreSQL, MongoDB, Redis, Kafka, Keycloak, and Socket.IO support its domain services, real-time workflows, identity, and operational state.

## Workspace Topology

| Path                                  | Purpose                                                                                           |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `apps/`                               | Backend services and frontend applications.                                                       |
| `libs/`                               | Shared TypeScript code, schemas, entities, interfaces, configuration, and frontend packages.      |
| `docs/`                               | Canonical product, architecture, status, phase, and operational documentation.                    |
| `docker/` and `docker-compose.*.yaml` | Container images, environment examples, Compose definitions, monitoring, and proxy configuration. |
| `tools/`                              | Database, Kafka, deployment, seed, verification, and test tooling.                                |

## Applications and Services

| Area                     | Projects                                                                             |
| ------------------------ | ------------------------------------------------------------------------------------ |
| API and backend services | `bff`, `authorizer`, `catalog`, `order`, `kitchen`, `payment`, `saas`, `user-access` |
| Frontend applications    | `management-app`, `customer-pwa`                                                     |
| Identity presentation    | `keycloak-theme`                                                                     |

The BFF is the client entry point. Each backend service owns its domain data and communicates with other services through the defined synchronous transport contracts or Kafka events.

## Local Prerequisites

- Node.js and pnpm.
- Docker Engine with the Docker Compose plugin for local dependencies and container workflows.
- A local configuration based on the repository environment examples; keep credentials out of version control.

Install workspace dependencies with:

```sh
pnpm install
```

Discover the available Nx projects and their targets before running a project task:

```sh
pnpm nx show projects
pnpm nx show project <name>
```

## Common Validation Commands

```sh
pnpm verify:doc-anchors
pnpm db:verify:ownership
pnpm db:test
pnpm e2e:demo
pnpm scale-test
pnpm theme:build
```

Run only the commands appropriate to your local dependencies and change scope. Use the Nx discovery commands above for project-specific tasks.

## Documentation Map

- [Documentation index](docs/README.md)
- [Project status](docs/project-status.md)
- [Business logic](docs/business-logic.md)
- [Technical architecture](docs/technical-architecture.md)

## Deployment Status

Docker, Compose, and Caddy deployment artifacts are present. Phase 7 public deployment remains pending: the repository does not record the public-environment evidence required to claim that the full platform is deployed.
