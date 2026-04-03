---
applyTo: 'libs/**'
---

# Shared Libraries — @common/\* Conventions

## Path Aliases

Backend shared libs use `@common/*`:

```typescript
import { UserGuard, TenantGuard } from '@common/guards';
import { ExceptionInterceptor } from '@common/interceptors';
import { ProductEntity } from '@common/entities';
import { UserSchema } from '@common/schemas';
import { TCP_PATTERNS } from '@common/constants';
import { CurrentUser } from '@common/decorators';
import { databaseConfig } from '@common/configuration';
```

Frontend shared libs use `@einvoice/*`:

```typescript
import { FeaturePlaceholder } from '@einvoice/frontend-ui';
```

## Available Libs

| Import                  | Location           | Contents                                   |
| ----------------------- | ------------------ | ------------------------------------------ |
| `@common/guards`        | libs/guards        | UserGuard, TenantGuard, PermissionGuard    |
| `@common/interceptors`  | libs/interceptors  | ExceptionInterceptor (response wrapper)    |
| `@common/entities`      | libs/entities      | TypeORM entities for all PostgreSQL tables |
| `@common/schemas`       | libs/schemas       | Mongoose schemas for MongoDB               |
| `@common/constants`     | libs/constants     | TCP patterns, RBAC enums, app constants    |
| `@common/decorators`    | libs/decorators    | @CurrentUser, @Tenant, custom decorators   |
| `@common/configuration` | libs/configuration | TCP ports, DB config, service config       |
| `@common/middlewares`   | libs/middlewares   | TenantMiddleware                           |
| `@common/interfaces`    | libs/interfaces    | Shared TypeScript interfaces               |
| `@common/utils`         | libs/utils         | Shared utility functions                   |
| `@common/shared`        | libs/shared        | General shared code                        |

## Adding a New Shared Library

```bash
npx nx g @nx/node:lib <name>
# Then add to tsconfig.base.json:
# "@common/<name>/*": ["libs/<name>/src/lib/*"]
```

## Rules

- Libs must NOT import from apps — only apps import from libs
- Circular dependencies between libs are forbidden
- Every lib must export through `libs/<name>/src/index.ts`
- Add new TCP message constants to `libs/constants/src/lib/enum/tcp-request-message.ts`
