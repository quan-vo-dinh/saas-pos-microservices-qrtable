import type { Category, MenuItem, Order } from '@einvoice/types';
import { categories } from './categories';
import { menuItems } from './menu-items';
import { tables } from './tables';
import { orders } from './orders';
import { sessions, type MockSession } from './sessions';

export type CategoryWithItems = Category & { items: MenuItem[] };

export function getMenuByCategory(): CategoryWithItems[] {
  return categories
    .filter((c) => c.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      ...category,
      items: menuItems
        .filter((item) => item.categoryId === category.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

export function getAllMenuItems(): MenuItem[] {
  return menuItems
    .filter((item) => item.status === 'available' || item.status === 'out_of_stock')
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getTableByQrToken(token: string) {
  return tables.find((t) => t.qrToken === token);
}

export function getSessionByQrToken(token: string): MockSession | undefined {
  return sessions.find((s) => s.qrToken === token);
}

export function getOrdersBySession(sessionId: string): Order[] {
  return orders.filter((o) => o.sessionId === sessionId);
}

export function getMockSession(tableId: string): MockSession | undefined {
  return sessions.find((s) => s.tableId === tableId);
}
