import {
  Building2,
  ChefHat,
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  Shield,
  Store,
  Table,
  Users,
} from 'lucide-react';

import type { SidebarData } from '@/components/layout/types';
import { ROUTES } from '@/constants/routes';

const OM = ['OWNER', 'MANAGER'] as const;
const POS_STAFF = ['OWNER', 'MANAGER', 'WAITER'] as const;
const KITCHEN_BOARD = ['OWNER', 'MANAGER', 'CHEF'] as const;
const BAR_BOARD = ['OWNER', 'MANAGER', 'BARISTA'] as const;
const SUPER = ['SUPER_ADMIN'] as const;

export const sidebarData: SidebarData = {
  appName: 'QRTable Management',
  appSubtitle: 'SaaS POS Control Center',
  navGroups: [
    {
      title: 'Dashboard',
      items: [
        {
          title: 'Overview',
          url: ROUTES.DASHBOARD,
          icon: LayoutDashboard,
          roles: OM,
        },
        {
          title: 'Menu',
          url: ROUTES.MENU,
          icon: Store,
          roles: OM,
        },
        {
          title: 'Tables',
          url: ROUTES.TABLES,
          icon: Table,
          roles: OM,
        },
        {
          title: 'Staff',
          url: ROUTES.STAFF,
          icon: Users,
          roles: OM,
        },
        {
          title: 'Orders',
          url: ROUTES.ORDERS,
          icon: ClipboardList,
          roles: OM,
        },
        {
          title: 'Subscription',
          url: ROUTES.SUBSCRIPTION,
          icon: Building2,
          roles: OM,
        },
      ],
    },
    {
      title: 'Operations',
      items: [
        {
          title: 'POS',
          icon: CreditCard,
          items: [
            {
              title: 'Live Orders',
              url: ROUTES.POS,
              roles: POS_STAFF,
            },
            {
              title: 'POS Tables',
              url: ROUTES.POS_TABLES,
              roles: POS_STAFF,
            },
            {
              title: 'Service Requests',
              url: ROUTES.POS_SERVICE_REQUESTS,
              roles: POS_STAFF,
            },
            {
              title: 'Bills',
              url: ROUTES.POS_BILLS,
              roles: POS_STAFF,
            },
            {
              title: 'Payments',
              url: ROUTES.POS_PAYMENT,
              roles: POS_STAFF,
            },
          ],
        },
        {
          title: 'Kitchen Display',
          icon: ChefHat,
          items: [
            {
              title: 'Kitchen Board',
              url: ROUTES.KDS_KITCHEN,
              roles: KITCHEN_BOARD,
            },
            {
              title: 'Bar Board',
              url: ROUTES.KDS_BAR,
              roles: BAR_BOARD,
            },
          ],
        },
      ],
    },
    {
      title: 'Platform',
      items: [
        {
          title: 'Admin',
          icon: Shield,
          items: [
            {
              title: 'Admin Home',
              url: ROUTES.ADMIN,
              roles: SUPER,
            },
            {
              title: 'Tenants',
              url: ROUTES.ADMIN_TENANTS,
              roles: SUPER,
            },
            {
              title: 'Plans',
              url: ROUTES.ADMIN_PLANS,
              roles: SUPER,
            },
            {
              title: 'Analytics',
              url: ROUTES.ADMIN_ANALYTICS,
              roles: SUPER,
            },
          ],
        },
      ],
    },
  ],
};
