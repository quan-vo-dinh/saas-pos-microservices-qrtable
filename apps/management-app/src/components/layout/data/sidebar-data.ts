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
        },
        {
          title: 'Menu',
          url: ROUTES.MENU,
          icon: Store,
        },
        {
          title: 'Tables',
          url: ROUTES.TABLES,
          icon: Table,
        },
        {
          title: 'Staff',
          url: ROUTES.STAFF,
          icon: Users,
        },
        {
          title: 'Orders',
          url: ROUTES.ORDERS,
          icon: ClipboardList,
        },
        {
          title: 'Subscription',
          url: ROUTES.SUBSCRIPTION,
          icon: Building2,
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
            },
            {
              title: 'POS Tables',
              url: ROUTES.POS_TABLES,
            },
            {
              title: 'POS Payment',
              url: ROUTES.POS_PAYMENT,
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
            },
            {
              title: 'Bar Board',
              url: ROUTES.KDS_BAR,
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
            },
            {
              title: 'Tenants',
              url: ROUTES.ADMIN_TENANTS,
            },
            {
              title: 'Plans',
              url: ROUTES.ADMIN_PLANS,
            },
            {
              title: 'Analytics',
              url: ROUTES.ADMIN_ANALYTICS,
            },
          ],
        },
      ],
    },
  ],
};
