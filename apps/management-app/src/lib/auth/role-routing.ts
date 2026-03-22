export const APP_ROLES = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'CHEF', 'BARISTA'] as const;

export type AppRole = (typeof APP_ROLES)[number];

const ROLE_HOME_ROUTE: Record<AppRole, string> = {
  SUPER_ADMIN: '/admin',
  OWNER: '/dashboard',
  MANAGER: '/dashboard',
  WAITER: '/pos',
  CHEF: '/kds/kitchen',
  BARISTA: '/kds/bar',
};

const ROUTE_ACCESS: Array<{ prefix: string; roles: AppRole[] }> = [
  {
    prefix: '/admin',
    roles: ['SUPER_ADMIN'],
  },
  {
    prefix: '/dashboard',
    roles: ['OWNER', 'MANAGER'],
  },
  {
    prefix: '/pos',
    roles: ['OWNER', 'MANAGER', 'WAITER'],
  },
  {
    prefix: '/kds/kitchen',
    roles: ['OWNER', 'MANAGER', 'CHEF'],
  },
  {
    prefix: '/kds/bar',
    roles: ['OWNER', 'MANAGER', 'BARISTA'],
  },
  {
    prefix: '/kds',
    roles: ['OWNER', 'MANAGER', 'CHEF', 'BARISTA'],
  },
];

const ROLE_PRIORITY: AppRole[] = ['SUPER_ADMIN', 'OWNER', 'MANAGER', 'WAITER', 'CHEF', 'BARISTA'];

function normalizeRole(rawRole: string): AppRole | null {
  const normalized = rawRole.trim().toUpperCase();
  if ((APP_ROLES as readonly string[]).includes(normalized)) {
    return normalized as AppRole;
  }
  return null;
}

export function parseRolesFromCookie(rawValue?: string): AppRole[] {
  if (!rawValue) {
    return [];
  }

  const trimmed = rawValue.trim();

  if (trimmed.startsWith('[')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return parsed
          .map((item) => (typeof item === 'string' ? normalizeRole(item) : null))
          .filter((item): item is AppRole => item !== null);
      }
    } catch {
      return [];
    }
  }

  return trimmed
    .split(',')
    .map((role) => normalizeRole(role))
    .filter((role): role is AppRole => role !== null);
}

export function getRoleHomeRoute(roles: AppRole[]): string {
  for (const role of ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return ROLE_HOME_ROUTE[role];
    }
  }

  return '/login';
}

export function hasAccessToPath(pathname: string, roles: AppRole[]): boolean {
  if (!roles.length) {
    return false;
  }

  const match = ROUTE_ACCESS.find((route) => pathname === route.prefix || pathname.startsWith(`${route.prefix}/`));
  if (!match) {
    return true;
  }

  return roles.some((role) => match.roles.includes(role));
}
