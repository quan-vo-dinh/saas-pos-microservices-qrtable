import { APP_ROLES, ROLE_PRIORITY, type AppRole } from '@einvoice/shared-constants';
import { ROUTES } from '@/constants/routes';

export type { AppRole };
export { APP_ROLES };

const ROLE_HOME_ROUTE: Record<AppRole, string> = {
  SUPER_ADMIN: ROUTES.ADMIN,
  OWNER: ROUTES.DASHBOARD,
  MANAGER: ROUTES.DASHBOARD,
  WAITER: ROUTES.POS,
  CHEF: ROUTES.KDS_KITCHEN,
  BARISTA: ROUTES.KDS_BAR,
};

const ROUTE_ACCESS: Array<{ prefix: string; roles: AppRole[] }> = [
  {
    prefix: ROUTES.ADMIN,
    roles: ['SUPER_ADMIN'],
  },
  {
    prefix: ROUTES.DASHBOARD,
    roles: ['OWNER', 'MANAGER'],
  },
  {
    prefix: ROUTES.POS,
    roles: ['OWNER', 'MANAGER', 'WAITER'],
  },
  {
    prefix: ROUTES.KDS_KITCHEN,
    roles: ['OWNER', 'MANAGER', 'CHEF'],
  },
  {
    prefix: ROUTES.KDS_BAR,
    roles: ['OWNER', 'MANAGER', 'BARISTA'],
  },
  {
    prefix: '/kds',
    roles: ['OWNER', 'MANAGER', 'CHEF', 'BARISTA'],
  },
];

const _ROLE_PRIORITY = ROLE_PRIORITY;

function normalizeRole(rawRole: string): AppRole | null {
  const normalized = rawRole.trim().toUpperCase();
  if ((APP_ROLES as readonly string[]).includes(normalized)) {
    return normalized as AppRole;
  }
  return null;
}

export function parseRoles(rawRoles?: unknown): AppRole[] {
  if (!rawRoles) {
    return [];
  }

  if (Array.isArray(rawRoles)) {
    return rawRoles
      .map((role) => (typeof role === 'string' ? normalizeRole(role) : null))
      .filter((role): role is AppRole => role !== null);
  }

  if (typeof rawRoles === 'string') {
    return rawRoles
      .split(',')
      .map((role) => normalizeRole(role))
      .filter((role): role is AppRole => role !== null);
  }

  return [];
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
        return parseRoles(parsed);
      }
    } catch {
      return [];
    }
  }

  return parseRoles(trimmed);
}

export function getRoleHomeRoute(roles: AppRole[]): string {
  for (const role of _ROLE_PRIORITY) {
    if (roles.includes(role)) {
      return ROLE_HOME_ROUTE[role];
    }
  }

  return ROUTES.LOGIN;
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
