export const tenantKeys = {
  all: ['tenant'] as const,
  current: () => [...tenantKeys.all, 'current'] as const,
};
