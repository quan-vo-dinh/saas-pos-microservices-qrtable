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

export const sidebarData: SidebarData = {
  appName: 'QRTable Management',
  appSubtitle: 'SaaS POS Control Center',
  navGroups: [
    {
      title: 'Dashboard',
      items: [
        {
          title: 'Overview',
          url: '/dashboard',
          icon: LayoutDashboard,
        },
        {
          title: 'Menu',
          url: '/dashboard/menu',
          icon: Store,
        },
        {
          title: 'Tables',
          url: '/dashboard/tables',
          icon: Table,
        },
        {
          title: 'Staff',
          url: '/dashboard/staff',
          icon: Users,
        },
        {
          title: 'Orders',
          url: '/dashboard/orders',
          icon: ClipboardList,
        },
        {
          title: 'Subscription',
          url: '/dashboard/subscription',
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
              url: '/pos',
            },
            {
              title: 'POS Tables',
              url: '/pos/tables',
            },
            {
              title: 'POS Payment',
              url: '/pos/payment',
            },
          ],
        },
        {
          title: 'Kitchen Display',
          icon: ChefHat,
          items: [
            {
              title: 'Kitchen Board',
              url: '/kds/kitchen',
            },
            {
              title: 'Bar Board',
              url: '/kds/bar',
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
              url: '/admin',
            },
            {
              title: 'Tenants',
              url: '/admin/tenants',
            },
            {
              title: 'Plans',
              url: '/admin/plans',
            },
            {
              title: 'Analytics',
              url: '/admin/analytics',
            },
          ],
        },
      ],
    },
  ],
};
