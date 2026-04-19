import type { Bill, CartItem, Category, MenuItem, Order, ServiceRequest, Session } from '@einvoice/types';
import { ServiceRequestStatus } from '@einvoice/types';
import { categories } from './categories';
import { menuItems } from './menu-items';
import { tables } from './tables';
import { orders } from './orders';
import { sessions, type MockSessionExtended } from './sessions';
import { bills } from './bills';
import { carts } from './carts';
import { serviceRequests } from './service-requests';

export type CategoryWithItems = Category & { items: MenuItem[] };

// ─── Existing helpers (kept) ────────────────────────

export function getMenuByCategory(): CategoryWithItems[] {
  return categories
    .filter((c) => c.status === 'active')
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((category) => ({
      ...category,
      items: menuItems.filter((item) => item.categoryId === category.id).sort((a, b) => a.sortOrder - b.sortOrder),
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

export function getSessionByQrToken(token: string): MockSessionExtended | undefined {
  return sessions.find((s) => s.qrToken === token);
}

export function getOrdersBySession(sessionId: string): Order[] {
  return orders.filter((o) => o.sessionId === sessionId);
}

export function getMockSession(tableId: string): MockSessionExtended | undefined {
  return sessions.find((s) => s.tableId === tableId);
}

// ─── NEW helpers (Step 2.3) ─────────────────────────

export function getBillBySession(sessionId: string): Bill | undefined {
  return bills.find((b) => b.sessionId === sessionId);
}

export function getCartBySession(sessionId: string): CartItem[] {
  const cart = carts.find((c) => c.sessionId === sessionId);
  return cart ? cart.items : [];
}

export function getActiveServiceRequests(tenantId: string): ServiceRequest[] {
  return serviceRequests.filter((sr) => sr.tenantId === tenantId && sr.status !== ServiceRequestStatus.RESOLVED);
}

export function getMockSessionById(sessionId: string): Session | undefined {
  return sessions.find((s) => s.id === sessionId);
}
