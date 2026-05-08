function asRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined;
}

export function extractJwtTenantId(jwt: unknown): string | undefined {
  const payload = asRecord(jwt);
  const rawTenantId = payload?.['tenant_id'] ?? payload?.['tenantId'];

  return typeof rawTenantId === 'string' && rawTenantId.trim() ? rawTenantId : undefined;
}

export function extractJwtRealmRoles(jwt: unknown): string[] {
  const payload = asRecord(jwt);
  const realmAccess = asRecord(payload?.['realm_access'] ?? payload?.['realmAccess']);
  const roles = realmAccess?.['roles'];

  return Array.isArray(roles) ? roles.filter((role): role is string => typeof role === 'string') : [];
}
