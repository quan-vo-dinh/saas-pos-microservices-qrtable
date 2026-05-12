import type { LucideIcon } from 'lucide-react';

import type { AppRole } from '@einvoice/shared-constants';

export type NavLink = {
  title: string;
  url: string;
  icon?: LucideIcon;
  badge?: string;
  /** If set, at least one role must match (same semantics as route middleware). */
  roles?: readonly AppRole[];
  /** If set, user must have every listed permission (in addition to role match when roles are set). */
  permissions?: readonly string[];
};

export type NavCollapsible = {
  title: string;
  icon?: LucideIcon;
  badge?: string;
  items: NavLink[];
};

export type NavItem = NavLink | NavCollapsible;

export type NavGroup = {
  title: string;
  items: NavItem[];
};

export type SidebarData = {
  appName: string;
  appSubtitle: string;
  navGroups: NavGroup[];
};
