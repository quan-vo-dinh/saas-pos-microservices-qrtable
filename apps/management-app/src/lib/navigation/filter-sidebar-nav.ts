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

function filterNavItem(item: NavItem, userRoles: AppRole[]): NavItem | null {
  if (isCollapsible(item)) {
    const nextItems = item.items
      .map((child) => filterNavItem(child, userRoles))
      .filter((child): child is NavLink => child !== null);
    if (!nextItems.length) {
      return null;
    }
    return { ...item, items: nextItems };
  }

  return userMatchesRoles(userRoles, item.roles) ? item : null;
}

/** Filters sidebar nav to entries the user is allowed to see (aligned with middleware route access). */
export function filterSidebarNavByRoles(navGroups: NavGroup[], userRoles: AppRole[]): NavGroup[] {
  if (!userRoles.length) {
    return [];
  }

  return navGroups
    .map((group) => ({
      ...group,
      items: group.items.map((item) => filterNavItem(item, userRoles)).filter((item): item is NavItem => item !== null),
    }))
    .filter((group) => group.items.length > 0);
}
