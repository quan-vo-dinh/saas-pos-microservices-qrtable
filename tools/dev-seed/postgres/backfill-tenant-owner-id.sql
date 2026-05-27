-- Backfill tenants.owner_id for legacy/demo rows (idempotent).
-- Run: docker exec -i qrtable-provider-postgres-1 psql -U postgres -d qrtable < tools/dev-seed/postgres/backfill-tenant-owner-id.sql

-- nhà hàng 3 — onboard owner in Mongo (tenantId set)
UPDATE tenants
SET owner_id = '772ca1e4-654e-4486-ad85-41fb62a44f43',
    updated_at = now()
WHERE slug = 'nha-hang-3'
  AND owner_id IS NULL;

-- Phở Việt — dev seed owner (Keycloak userId; Mongo profile without tenantId)
UPDATE tenants
SET owner_id = '322f6721-5f2b-41bf-ab80-124a336f9274',
    updated_at = now()
WHERE slug = 'pho-viet'
  AND owner_id IS NULL;
