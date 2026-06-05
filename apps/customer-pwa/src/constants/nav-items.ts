import type { LucideIcon } from 'lucide-react';
import { QrCode, ReceiptText, Soup, WalletCards } from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export type NavItem = {
  readonly to: string;
  readonly label: string;
  readonly icon: LucideIcon;
};

export const NAV_ITEMS: readonly NavItem[] = [
  { to: ROUTES.LANDING, label: 'Trang chủ', icon: QrCode },
  { to: ROUTES.MENU, label: 'Thực đơn', icon: Soup },
  { to: ROUTES.ORDER_TRACKING, label: 'Theo dõi đơn', icon: ReceiptText },
  { to: ROUTES.REQUEST_PAYMENT, label: 'Thanh toán', icon: WalletCards },
] as const;
