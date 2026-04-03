---
name: keycloak-auth
description: Keycloak authentication and JWT validation patterns for QRTable. Use when working with auth flows, Keycloak configuration, JWT validation, Keycloakify theme, or multi-tenant auth.
---

# Keycloak Auth — QRTable

## Auth Architecture (4 Layers)

```
Frontend → BFF (UserGuard) → Authorizer (gRPC) → Keycloak
                ↓
           Redis Cache (30min TTL)
```

1. **Frontend** sends `Authorization: Bearer <jwt>` in header
2. **BFF UserGuard** extracts token, calls Authorizer via gRPC
3. **Authorizer** checks Redis cache → if miss, validates with Keycloak
4. **Authorizer** returns user payload → BFF attaches to `req.user`

## Keycloak Setup (Dev)

- URL: http://localhost:8180
- Admin: admin / admin (dev only)
- Realm: `qrtable`
- Bootstrap: `pnpm auth:bootstrap:all`

## JWT Structure (Keycloak tokens)

```typescript
interface TokenPayload {
  sub: string; // Keycloak user ID
  email: string;
  preferred_username: string;
  realm_access: { roles: string[] };
  resource_access: { [client: string]: { roles: string[] } };
  tenant_id: string; // custom claim
}
```

## Working with Auth in Code

### Protect HTTP Route

```typescript
@UseGuards(UserGuard, TenantGuard)
@Get('profile')
getProfile(@CurrentUser() user: JwtUser) {
  return user;
}
```

### Protect TCP Handler

```typescript
// TCP handlers don't go through HTTP guards
// Validate payload manually or trust BFF has already validated
@MessagePattern(UserTcpMessage.GET_USER)
async getUser(@Payload() data: { userId: string; tenantId: string }) {
  // tenantId comes from BFF which already validated via TenantGuard
  return this.userService.findById(data.userId, data.tenantId);
}
```

### Public Routes

```typescript
@Public()  // from @common/decorators — skips UserGuard
@Get('menu/:slug')
getPublicMenu(@Param('slug') slug: string) { }
```

## Keycloak Theme (Keycloakify)

```bash
pnpm theme:dev    # Dev server at localhost:3000 preview
pnpm theme:build  # Outputs JAR for Keycloak deployment
```

Theme source: `apps/keycloak-theme/`

## Common Auth Issues

- **401 on valid token**: Check Authorizer service is running (gRPC 5100)
- **Token not in cache**: Redis may be down — check `docker ps`
- **Wrong tenant**: Verify `X-Tenant-ID` header is sent by frontend
- **Role check failing**: Check `realm_access.roles` in decoded JWT
