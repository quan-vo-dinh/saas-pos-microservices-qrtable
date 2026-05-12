import type { AppRole } from '@einvoice/shared-constants';

import type { NavCollapsible, NavGroup, NavItem, NavLink } from '@/components/layout/types';

function isCollapsible(item: NavItem): item is NavCollapsible {
  return 'items' in item && Array.isArray(item.items);
}

function userMatchesRoles(userRoles: AppRole[], required?: readonly AppRole[]): boolean {
  if (!required?.length) {
    return true;
  }
  return userRoles.some((r) => required.includes(r));
}

function userMatchesPermissions(userPermissions: string[], required?: readonly string[]): boolean {
  if (!required?.length) {
    return true;
  }
  return required.every((p) => userPermissions.includes(p));
}

function filterNavItem(item: NavItem, userRoles: AppRole[], userPermissions: string[]): NavItem | null {
  if (isCollapsible(item)) {
    const nextItems = item.items
      .map((child) => filterNavItem(child, userRoles, userPermissions))
      .filter((child): child is NavLink => child !== null);
    if (!nextItems.length) {
      return null;
    }
    return { ...item, items: nextItems };
  }

  if (!userMatchesRoles(userRoles, item.roles)) {
    return null;
  }
  if (!userMatchesPermissions(userPermissions, item.permissions)) {
    return null;
  }
  return item;
}

/** Filters sidebar nav to entries the user is allowed to see (roles + Phase 4B permission gates). */
export function filterSidebarNavByRoles(
  navGroups: NavGroup[],
  userRoles: AppRole[],
  userPermissions: string[] = [],
): NavGroup[] {
  if (!userRoles.length) {
    return [];
  }

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items
        .map((item) => filterNavItem(item, userRoles, userPermissions))
        .filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
