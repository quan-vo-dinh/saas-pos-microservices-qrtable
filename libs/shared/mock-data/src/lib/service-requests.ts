import type { ServiceRequest } from '@einvoice/types';
import { ServiceRequestType, ServiceRequestStatus } from '@einvoice/types';

const TENANT_A = 'tenant_a';
const WAITER_USER_ID = '8ec2f6e3-0000-0000-0000-000000000004';

export const serviceRequests: ServiceRequest[] = [
  // Request 1 — Customer call staff, PENDING
  {
    id: 'sr-001',
    tenantId: TENANT_A,
    tableId: 'tbl-001',
    sessionId: 'session-001',
    type: ServiceRequestType.CALL_STAFF,
    status: ServiceRequestStatus.PENDING,
    createdAt: '2026-04-06T10:50:00Z',
    updatedAt: '2026-04-06T10:50:00Z',
  },
  // Request 2 — Customer request bill, ACKNOWLEDGED by waiter
  {
    id: 'sr-002',
    tenantId: TENANT_A,
    tableId: 'tbl-005',
    sessionId: 'session-002',
    type: ServiceRequestType.REQUEST_BILL,
    status: ServiceRequestStatus.ACKNOWLEDGED,
    acknowledgedAt: '2026-04-06T11:31:00Z',
    acknowledgedByUserId: WAITER_USER_ID,
    createdAt: '2026-04-06T11:30:00Z',
    updatedAt: '2026-04-06T11:31:00Z',
  },
  // Request 3 — General help, RESOLVED
  {
    id: 'sr-003',
    tenantId: TENANT_A,
    tableId: 'tbl-008',
    sessionId: 'session-003',
    type: ServiceRequestType.GENERAL_HELP,
    status: ServiceRequestStatus.RESOLVED,
    note: 'Hỏi wifi',
    acknowledgedAt: '2026-04-06T09:15:00Z',
    acknowledgedByUserId: WAITER_USER_ID,
    resolvedAt: '2026-04-06T09:18:00Z',
    createdAt: '2026-04-06T09:14:00Z',
    updatedAt: '2026-04-06T09:18:00Z',
  },
];
