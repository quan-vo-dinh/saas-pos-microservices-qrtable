import type { CartItem } from '@einvoice/types';

/**
 * Mock cart structure — wraps CartItem array per session.
 *
 * In production, cart lưu Redis Hash key `cart:{tenantId}:{sessionId}`
 * với optimistic version. Mock data simulate this shape.
 */
export type MockCart = {
  sessionId: string;
  items: CartItem[];
};

export const carts: MockCart[] = [
  // Session 001 — đã submit hết, cart trống
  {
    sessionId: 'session-001',
    items: [],
  },
  // Session 002 — đang gom thêm món (version 2 sau optimistic update)
  {
    sessionId: 'session-002',
    items: [
      {
        menuItemId: 'item-014',
        menuItemName: 'Sinh tố bơ',
        quantity: 1,
        unitPrice: 45000,
        version: 2,
      },
    ],
  },
  // Session 003 — đã COMPLETED, cart trống (session closed)
  {
    sessionId: 'session-003',
    items: [],
  },
];
