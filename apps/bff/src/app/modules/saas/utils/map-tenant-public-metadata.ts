import type { PublicTenantMetadataDto } from '@common/interfaces/gateway/saas';
import type { TenantTcpResponse } from '@common/interfaces/tcp/saas';

export function mapTcpTenantToPublicMetadata(t: TenantTcpResponse): PublicTenantMetadataDto {
  return {
    id: t.id,
    slug: t.slug,
    name: t.name,
    isActive: t.isActive,
    status: t.status,
    suspendedReason: t.suspendedReason ?? null,
  };
}
