---
applyTo: 'apps/bff/**,apps/authorizer/**,apps/user-access/**,apps/product/**,apps/invoice/**,apps/catalog/**,apps/saas/**,libs/**'
---

# NestJS Microservices — Backend Conventions

## App Structure (per service)

```
src/
├── main.ts              # Hybrid app bootstrap (HTTP + TCP)
├── app.module.ts        # Root module
├── <feature>/
│   ├── <feature>.controller.ts   # HTTP endpoints only
│   ├── <feature>.service.ts      # Business logic
│   ├── <feature>.repository.ts   # DB queries
│   └── <feature>.module.ts
```

## Hybrid App Bootstrap Pattern

Every service's `main.ts` must:

1. Call `app.connectMicroservice()` with TCP transport
2. Call `await app.startAllMicroservices()` before `app.listen()`
3. TCP port from `libs/configuration/src/lib/tcp.config.ts`

## TCP Message Patterns

- Define constants in `libs/constants/src/lib/enum/tcp-request-message.ts`
- Use `@MessagePattern(CONSTANT)` decorator on service handlers
- BFF calls via `this.client.send(CONSTANT, payload).pipe(firstValueFrom())`

## Guards — Always Apply in Order

```typescript
@UseGuards(UserGuard, TenantGuard, PermissionGuard)
```

- `UserGuard` from `@common/guards` — validates JWT, injects `req.user`
- `TenantGuard` from `@common/guards` — injects `req.tenantId`
- `PermissionGuard` from `@common/guards` — checks RBAC

## Imports

- Shared entities: `@common/entities`
- Shared schemas: `@common/schemas`
- Guards: `@common/guards`
- Interceptors: `@common/interceptors`
- Config: `@common/configuration`
- Constants/enums: `@common/constants`
- Decorators: `@common/decorators`

## TypeORM Repository Pattern

```typescript
// Always include tenant_id in queries
async findAll(tenantId: string): Promise<Entity[]> {
  return this.repo.find({ where: { tenant_id: tenantId } });
}
```

## Response Format

Do NOT manually format responses. `ExceptionInterceptor` wraps automatically:

```json
{ "data": ..., "message": "Success", "statusCode": 200, "duration": "...", "processID": "..." }
```

## Testing

Use `@nestjs/testing` Test module. Never spin up real TCP/HTTP servers in unit tests.

```typescript
const module = await Test.createTestingModule({
  providers: [MyService, { provide: getRepositoryToken(Entity), useValue: mockRepo }],
}).compile();
```
