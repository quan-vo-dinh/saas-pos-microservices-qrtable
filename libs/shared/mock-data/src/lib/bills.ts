import type { Bill } from '@einvoice/types';
import { BillStatus, PaymentMethod } from '@einvoice/types';

const TENANT_A = 'tenant_a';

export const bills: Bill[] = [
  // Bill cho session-001 (active, đang accumulate orders)
  {
    id: 'bill-001',
    tenantId: TENANT_A,
    sessionId: 'session-001',
    orderIds: ['order-001', 'order-002'],
    subtotal: 255000, // 195000 + 60000
    total: 255000,
    roundingAmount: 0,
    status: BillStatus.OPEN,
    createdAt: '2026-04-06T10:00:00Z',
    updatedAt: '2026-04-06T11:00:00Z',
  },
  // Bill cho session-002 (customer requested bill, awaiting staff)
  {
    id: 'bill-002',
    tenantId: TENANT_A,
    sessionId: 'session-002',
    orderIds: ['order-003'],
    subtotal: 228000,
    total: 228000,
    roundingAmount: 0,
    status: BillStatus.PENDING_PAYMENT,
    closedAt: '2026-04-06T11:30:00Z',
    createdAt: '2026-04-06T11:15:00Z',
    updatedAt: '2026-04-06T11:30:00Z',
  },
  // Bill cho session-003 (paid + closed — historical)
  {
    id: 'bill-003',
    tenantId: TENANT_A,
    sessionId: 'session-003',
    orderIds: ['order-004'],
    subtotal: 305000,
    total: 305000,
    roundingAmount: 0,
    paymentMethod: PaymentMethod.CASH,
    status: BillStatus.PAID,
    closedAt: '2026-04-06T09:40:00Z',
    paidAt: '2026-04-06T09:45:00Z',
    createdAt: '2026-04-06T09:00:00Z',
    updatedAt: '2026-04-06T09:45:00Z',
  },
];
