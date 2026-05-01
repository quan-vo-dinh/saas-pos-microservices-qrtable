import { useQuery } from '@tanstack/react-query';
import { tenantService } from '../services/tenant.service';

export const tenantResolveKeys = {
  all: ['tenant-resolve'] as const,
  slug: (slug: string) => [...tenantResolveKeys.all, slug] as const,
};

export function useResolveTenantQuery(slug: string | null) {
  const trimmed = slug?.trim() ?? '';
  return useQuery({
    queryKey: tenantResolveKeys.slug(trimmed || '_'),
    queryFn: () => tenantService.getBySlug(trimmed),
    enabled: trimmed.length > 0,
  });
}
