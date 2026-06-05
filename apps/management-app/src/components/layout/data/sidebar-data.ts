import {
  Building2,
  ChefHat,
  ClipboardList,
  CreditCard,
  Landmark,
  LayoutDashboard,
  Package,
  Receipt,
  Shield,
  Store,
  Table,
  Users,
} from 'lucide-react';

import type { SidebarData } from '@/components/layout/types';
import { ROUTES } from '@/constants/routes';
import { phase4bPermissions } from '@/features/saas/permissions';

const OM = ['OWNER', 'MANAGER'] as const;
const POS_STAFF = ['OWNER', 'MANAGER', 'WAITER'] as const;
const KITCHEN_BOARD = ['OWNER', 'MANAGER', 'CHEF'] as const;
const BAR_BOARD = ['OWNER', 'MANAGER', 'BARISTA'] as const;
const SUPER = ['SUPER_ADMIN'] as const;

export const sidebarData: SidebarData = {
  appName: 'QRTable Management',
  appSubtitle: 'Trung tâm điều hành POS SaaS',
  navGroups: [
    {
      title: 'Bảng điều khiển',
      items: [
        {
          title: 'Tổng quan',
          url: ROUTES.DASHBOARD,
          icon: LayoutDashboard,
          roles: OM,
        },
        {
          title: 'Thực đơn',
          url: ROUTES.MENU,
          icon: Store,
          roles: OM,
        },
        {
          title: 'Bàn',
          url: ROUTES.TABLES,
          icon: Table,
          roles: OM,
        },
        {
          title: 'Nhân sự',
          url: ROUTES.STAFF,
          icon: Users,
          roles: OM,
        },
        {
          title: 'Lịch sử thanh toán',
          url: ROUTES.ORDERS,
          icon: ClipboardList,
          roles: OM,
        },
        {
          title: 'Gói đăng ký',
          url: ROUTES.SUBSCRIPTION,
          icon: CreditCard,
          roles: OM,
          permissions: [phase4bPermissions.subscriptionReadOwn],
        },
        {
          title: 'Cài đặt thanh toán',
          url: ROUTES.DASHBOARD_PAYMENT_SETTINGS,
          icon: Landmark,
          roles: OM,
          permissions: [phase4bPermissions.paymentSettingsReadOwn],
        },
      ],
    },
    {
      title: 'Vận hành',
      items: [
        {
          title: 'POS',
          icon: CreditCard,
          items: [
            {
              title: 'Đơn trực tiếp',
              url: ROUTES.POS,
              roles: POS_STAFF,
            },
            {
              title: 'Sơ đồ bàn POS',
              url: ROUTES.POS_TABLES,
              roles: POS_STAFF,
            },
            {
              title: 'Yêu cầu phục vụ',
              url: ROUTES.POS_SERVICE_REQUESTS,
              roles: POS_STAFF,
            },
            {
              title: 'Hóa đơn',
              url: ROUTES.POS_BILLS,
              roles: POS_STAFF,
            },
          ],
        },
        {
          title: 'Màn hình bếp (KDS)',
          icon: ChefHat,
          items: [
            {
              title: 'Bảng bếp',
              url: ROUTES.KDS_KITCHEN,
              roles: KITCHEN_BOARD,
            },
            {
              title: 'Bảng bar',
              url: ROUTES.KDS_BAR,
              roles: BAR_BOARD,
            },
          ],
        },
      ],
    },
    {
      title: 'Nền tảng',
      items: [
        {
          title: 'Quản trị',
          icon: Shield,
          items: [
            {
              title: 'Trang quản trị',
              url: ROUTES.ADMIN,
              roles: SUPER,
            },
            {
              title: 'Đơn vị thuê bao',
              url: ROUTES.ADMIN_TENANTS,
              icon: Building2,
              roles: SUPER,
              permissions: [phase4bPermissions.tenantListAll],
            },
            {
              title: 'Gói cước',
              url: ROUTES.ADMIN_PLANS,
              icon: Package,
              roles: SUPER,
              permissions: [phase4bPermissions.planRead],
            },
            {
              title: 'Hóa đơn gói',
              url: ROUTES.ADMIN_BILLING,
              icon: Receipt,
              roles: SUPER,
              permissions: [phase4bPermissions.subscriptionListAny],
            },
            {
              title: 'Phân tích nền tảng',
              url: ROUTES.ADMIN_ANALYTICS,
              roles: SUPER,
            },
          ],
        },
      ],
    },
  ],
};
