/** Aligned with `libs/constants` SAAS_EVENTS — customer PWA Socket.io listeners. */
export const TENANT_LIFECYCLE_SOCKET_EVENTS = {
  SUSPENDED: 'tenant.suspended',
  ACTIVATED: 'tenant.activated',
  CLOSED: 'tenant.closed',
} as const;
