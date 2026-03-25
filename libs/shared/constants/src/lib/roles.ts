export const APP_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'CHEF', 'BARISTA'] as const;

export type AppRole = (typeof APP_ROLES)[number];

export const ROLE_PRIORITY: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'CHEF', 'BARISTA'];
