import type {
  TableStatus,
  CategoryStatus,
  MenuItemStatus,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
} from '@einvoice/types';

export const TABLE_STATUSES: readonly TableStatus[] = ['available', 'occupied', 'billing', 'cleaning'];

export const CATEGORY_STATUSES: readonly CategoryStatus[] = ['active', 'inactive'];

export const MENU_ITEM_STATUSES: readonly MenuItemStatus[] = ['available', 'out_of_stock'];

export const ORDER_STATUSES: readonly OrderStatus[] = [
  'pending',
  'confirmed',
  'preparing',
  'ready',
  'served',
  'cancelled',
];

export const PAYMENT_METHODS: readonly PaymentMethod[] = ['cash', 'card', 'momo', 'zalopay', 'bank_transfer'];

export const PAYMENT_STATUSES: readonly PaymentStatus[] = ['unpaid', 'paid', 'refunded'];
