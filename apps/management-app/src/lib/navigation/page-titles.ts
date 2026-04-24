import { ROUTES } from '@/constants/routes';

const EXACT: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Overview',
  [ROUTES.MENU]: 'Menu',
  [ROUTES.TABLES]: 'Tables',
  [ROUTES.STAFF]: 'Staff',
  [ROUTES.ORDERS]: 'Orders',
  [ROUTES.SUBSCRIPTION]: 'Subscription',
  [ROUTES.POS]: 'Live orders',
  [ROUTES.POS_TABLES]: 'POS tables',
  [ROUTES.POS_SERVICE_REQUESTS]: 'Service requests',
  [ROUTES.POS_BILLS]: 'Bills',
  [ROUTES.POS_PAYMENT]: 'Payments',
  [ROUTES.KDS_KITCHEN]: 'Kitchen board',
  [ROUTES.KDS_BAR]: 'Bar board',
  [ROUTES.ADMIN]: 'Platform admin',
  [ROUTES.ADMIN_TENANTS]: 'Tenants',
  [ROUTES.ADMIN_PLANS]: 'Plans',
  [ROUTES.ADMIN_ANALYTICS]: 'Analytics',
};

/**
 * Short page title for the sticky top bar (breadcrumb still shows full path).
 */
export function getManagementPageTitle(pathname: string): string {
  if (EXACT[pathname]) {
    return EXACT[pathname];
  }

  const prefixes = Object.entries(EXACT).sort((a, b) => b[0].length - a[0].length);
  for (const [prefix, label] of prefixes) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) {
      return label;
    }
  }

  return 'Workspace';
}
