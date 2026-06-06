---
applyTo: 'libs/**'
---

# Shared Libraries — @common/\* Conventions

## Path Aliases

Backend shared libs use `@common/*`:

```typescript
import { UserGuard, TenantGuard } from '@common/guards';
import { ExceptionInterceptor } from '@common/interceptors/exception.interceptor';
import { MenuItem } from '@common/entities/menu-item.entity';
import { UserSchema } from '@common/schemas';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';
import { CurrentUser } from '@common/decorators';
import { TcpConfiguration } from '@common/configuration/tcp.config';
```

Frontend shared libs use `@einvoice/*`:

```typescript
import { FeaturePlaceholder } from '@einvoice/frontend-ui';
```

## Available Libs

| Import                  | Location           | Contents                                                             |
| ----------------------- | ------------------ | -------------------------------------------------------------------- |
| `@common/guards`        | libs/guards        | UserGuard, TenantGuard, PermissionGuard                              |
| `@common/interceptors`  | libs/interceptors  | ExceptionInterceptor (response wrapper)                              |
| `@common/entities`      | libs/entities      | TypeORM entities (deep path: `@common/entities/menu-item.entity`)    |
| `@common/schemas`       | libs/schemas       | Mongoose schemas for MongoDB                                         |
| `@common/constants`     | libs/constants     | TCP patterns, RBAC enums, status enums, app constants                |
| `@common/decorators`    | libs/decorators    | @CurrentUser, @Tenant, custom decorators                             |
| `@common/configuration` | libs/configuration | TCP ports, DB config (deep path: `@common/configuration/tcp.config`) |
| `@common/middlewares`   | libs/middlewares   | TenantMiddleware                                                     |
| `@common/interfaces`    | libs/interfaces    | TCP interfaces & gateway DTOs (deep path imports)                    |
| `@common/utils`         | libs/utils         | Shared utility functions                                             |
| `@common/shared`        | libs/shared        | General shared code                                                  |

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
- **Import paths:** Use deep path imports (e.g., `@common/entities/menu-item.entity`), NOT barrel imports

## File Naming Conventions

### Gateway DTOs (`libs/interfaces/src/lib/gateway/<service>/`)

```
<domain>-request.dto.ts    # Request DTOs (CreateXxxDto, UpdateXxxDto, etc.)
<domain>-response.dto.ts   # Response DTOs (XxxResponseDto, etc.)
index.ts                   # Re-exports all from request + response files
```

### TCP Interfaces (`libs/interfaces/src/lib/tcp/<service>/`)

```
<domain>-request.interface.ts    # Request types (CreateXxxTcpRequest, etc.)
<domain>-response.interface.ts   # Response types (XxxTcpResponse)
index.ts                         # Re-exports all from request + response files
```

### Status Enums (`libs/constants/src/lib/enum/`)

```
<service>.enum.ts    # Status enums per service (CATEGORY_STATUS, TABLE_STATUS, etc.)
```

Use `SCREAMING_SNAKE` for enum names with lowercase string values:

```typescript
export enum CATEGORY_STATUS {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
}
```
