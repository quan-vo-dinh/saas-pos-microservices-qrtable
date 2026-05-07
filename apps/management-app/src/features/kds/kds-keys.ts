export const kdsKeys = {
  all: ['kds'] as const,
  queue: (tenantId: string, station: string) => [...kdsKeys.all, 'queue', tenantId, station] as const,
};
