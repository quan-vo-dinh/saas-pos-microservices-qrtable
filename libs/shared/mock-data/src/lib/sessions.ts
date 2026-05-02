import type { Session } from '@einvoice/types';
import { SessionStatus } from '@einvoice/types';

const CANONICAL_TENANT_ID = '023772bb-391b-401c-936a-ed7034b69cec';

/**
 * Mock-only extension to Session type — adds fields needed for mock UI rendering
 * (areaName, restaurantName) and QR validation mocking (qrToken).
 *
 * In production, qrToken validation thuộc Catalog/Tenant module; restaurantName
 * lookup from Tenant entity. Mock data inlines for convenience.
 */
export type MockSessionExtended = Session & {
  areaName: string;
  capacity: number;
  restaurantName: string;
  qrToken: string;
};

export const sessions: MockSessionExtended[] = [
  {
    id: 'session-001',
    tenantId: CANONICAL_TENANT_ID,
    tableId: 'tbl-001',
    tableName: 'T1',
    status: SessionStatus.ACTIVE,
    startedAt: '2026-04-06T10:00:00Z',
    lastActivity: '2026-04-06T11:00:00Z',
    orderCount: 2,
    areaName: 'Tầng trệt',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t1_abc123',
  },
  {
    id: 'session-002',
    tenantId: CANONICAL_TENANT_ID,
    tableId: 'tbl-005',
    tableName: 'T5',
    status: SessionStatus.ACTIVE,
    startedAt: '2026-04-06T11:00:00Z',
    lastActivity: '2026-04-06T11:30:00Z',
    orderCount: 1,
    areaName: 'Tầng trệt',
    capacity: 6,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_t5_def456',
  },
  {
    id: 'session-003',
    tenantId: CANONICAL_TENANT_ID,
    tableId: 'tbl-008',
    tableName: 'L3',
    status: SessionStatus.CLOSED,
    startedAt: '2026-04-06T08:30:00Z',
    lastActivity: '2026-04-06T09:45:00Z',
    closedAt: '2026-04-06T09:50:00Z',
    orderCount: 1,
    areaName: 'Lầu 1',
    capacity: 4,
    restaurantName: 'Nhà hàng QR Table Demo',
    qrToken: 'hmac_l3_ghi789',
  },
];
