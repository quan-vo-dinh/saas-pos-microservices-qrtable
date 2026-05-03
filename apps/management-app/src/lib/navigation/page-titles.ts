import { ROUTES } from '@/constants/routes';

const EXACT: Record<string, string> = {
  [ROUTES.DASHBOARD]: 'Tổng quan',
  [ROUTES.MENU]: 'Thực đơn',
  [ROUTES.TABLES]: 'Quản lý bàn',
  [ROUTES.STAFF]: 'Nhân sự',
  [ROUTES.ORDERS]: 'Đơn hàng',
  [ROUTES.SUBSCRIPTION]: 'Đăng ký gói',
  [ROUTES.POS]: 'Đơn trực tiếp',
  [ROUTES.POS_TABLES]: 'Quản lý bàn',
  [ROUTES.POS_SERVICE_REQUESTS]: 'Yêu cầu phục vụ',
  [ROUTES.POS_BILLS]: 'Hóa đơn',
  [ROUTES.POS_PAYMENT]: 'Thanh toán',
  [ROUTES.KDS_KITCHEN]: 'Bếp',
  [ROUTES.KDS_BAR]: 'Quầy bar',
  [ROUTES.ADMIN]: 'Quản trị nền tảng',
  [ROUTES.ADMIN_TENANTS]: 'Thuê bao',
  [ROUTES.ADMIN_PLANS]: 'Gói dịch vụ',
  [ROUTES.ADMIN_ANALYTICS]: 'Thống kê',
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

  return 'Làm việc';
}
