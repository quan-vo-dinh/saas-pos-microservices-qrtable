import type { PreparationStation } from '@einvoice/types';

function kdsStationSlug(station: PreparationStation): 'kitchen' | 'bar' {
  return station === 'KITCHEN' ? 'kitchen' : 'bar';
}

export const WsRoom = {
  staff: (tenantId: string) => `tenant:${tenantId}:staff`,
  management: (tenantId: string) => `tenant:${tenantId}:management`,
  customers: (tenantId: string) => `tenant:${tenantId}:customers`,
  tenantSlugCustomers: (tenantSlug: string) => `tenant-slug:${tenantSlug}:customers`,
  customer: (sessionId: string) => `session:${sessionId}:customer`,
  kds: (tenantId: string, station: PreparationStation) => `tenant:${tenantId}:kds:${kdsStationSlug(station)}`,
} as const;
