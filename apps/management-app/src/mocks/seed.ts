import { faker } from '@faker-js/faker';
import {
  BillStatus,
  OrderItemStatus,
  OrderStatus,
  PaymentMethod,
  ServiceRequestStatus,
  ServiceRequestType,
} from '@einvoice/types';
import type { Bill, Order, OrderItem, RestaurantTable, ServiceRequest } from '@einvoice/types';
import type { KDSTicketMock } from './kds-ticket';

faker.seed(42);

export const mockTenantId = 't-phogomau';

const iso = (ms: number) => new Date(ms).toISOString();
const now = () => Date.now();

const AREAS = [
  { id: 'area-ground', name: 'Tầng trệt' },
  { id: 'area-roof', name: 'Sân thượng' },
  { id: 'area-vip', name: 'VIP' },
] as const;

function buildTables(): RestaurantTable[] {
  const perArea = 8;
  const tables: RestaurantTable[] = [];
  const statusCycle: Array<RestaurantTable['status']> = [
    'available',
    'occupied',
    'occupied',
    'billing',
    'available',
    'cleaning',
    'occupied',
    'available',
  ];
  for (const area of AREAS) {
    for (let i = 1; i <= perArea; i++) {
      const num = (AREAS.indexOf(area) as number) * perArea + i;
      const id = `tbl-${String(num).padStart(2, '0')}`;
      const status = statusCycle[(num - 1) % statusCycle.length];
      const hasSession = status === 'occupied' || status === 'billing';
      tables.push({
        id,
        areaId: area.id,
        areaName: area.name,
        name: `Bàn ${num}`,
        capacity: faker.helpers.arrayElement([2, 4, 6, 8]),
        status,
        qrToken: `qr-${id}`,
        sessionId: hasSession ? `sess-${id}` : null,
      });
    }
  }
  return tables;
}

function makeOrderItem(
  partial: Pick<OrderItem, 'orderId' | 'menuItemId' | 'menuItemName' | 'quantity' | 'unitPrice'> &
    Partial<Pick<OrderItem, 'note' | 'status'>> & { lineKey: string },
): OrderItem {
  const t = now();
  return {
    id: `oi-${partial.orderId}-${partial.lineKey}`,
    orderId: partial.orderId,
    menuItemId: partial.menuItemId,
    menuItemName: partial.menuItemName,
    quantity: partial.quantity,
    unitPrice: partial.unitPrice,
    note: partial.note,
    status: partial.status ?? OrderItemStatus.PROCESSING,
    createdAt: iso(t - faker.number.int({ min: 5, max: 120 }) * 60_000),
    updatedAt: iso(t),
  };
}

function buildLiveOrders(tables: RestaurantTable[]): Order[] {
  const occupied = tables.filter((t) => t.status === 'occupied' || t.status === 'billing');
  const pick = (i: number) => occupied[i % occupied.length];

  const specs: Array<{ id: string; status: Order['status']; idx: number }> = [
    { id: 'ord-001', status: OrderStatus.PENDING, idx: 0 },
    { id: 'ord-002', status: OrderStatus.PENDING, idx: 1 },
    { id: 'ord-003', status: OrderStatus.PENDING, idx: 2 },
    { id: 'ord-004', status: OrderStatus.PROCESSING, idx: 0 },
    { id: 'ord-005', status: OrderStatus.PROCESSING, idx: 1 },
    { id: 'ord-006', status: OrderStatus.PROCESSING, idx: 2 },
    { id: 'ord-007', status: OrderStatus.READY, idx: 3 },
  ];

  const menuPool = [
    { id: 'mi-pho', name: 'Phở bò tái', price: 75_000 },
    { id: 'mi-bun', name: 'Bún chả Hà Nội', price: 65_000 },
    { id: 'mi-com', name: 'Cơm tấm sườn', price: 55_000 },
    { id: 'mi-tra', name: 'Trà đào', price: 35_000 },
    { id: 'mi-nuoc', name: 'Nước suối', price: 15_000 },
  ];

  return specs.map((s) => {
    const tbl = pick(s.idx);
    const itemCount = faker.number.int({ min: 2, max: 5 });
    const items: OrderItem[] = [];
    let total = 0;
    for (let i = 0; i < itemCount; i++) {
      const m = menuPool[(i + s.idx) % menuPool.length];
      const qty = faker.number.int({ min: 1, max: 3 });
      const lineTotal = m.price * qty;
      total += lineTotal;
      const itemStatus =
        s.status === OrderStatus.READY || s.status === OrderStatus.PROCESSING
          ? faker.helpers.arrayElement([OrderItemStatus.PROCESSING, OrderItemStatus.READY])
          : OrderItemStatus.PROCESSING;
      items.push(
        makeOrderItem({
          orderId: s.id,
          lineKey: `${i}-${m.id}`,
          menuItemId: m.id,
          menuItemName: m.name,
          quantity: qty,
          unitPrice: m.price,
          note: i === 0 ? 'Ít hành' : undefined,
          status: itemStatus,
        }),
      );
    }
    const t = now();
    return {
      id: s.id,
      tenantId: mockTenantId,
      tableId: tbl.id,
      tableName: `${tbl.name} — ${tbl.areaName}`,
      sessionId: tbl.sessionId ?? `sess-${tbl.id}`,
      items,
      status: s.status,
      totalAmount: total,
      idempotencyKey: faker.string.uuid(),
      notes: 'Ghi chú khách (mock)',
      createdAt: iso(t - faker.number.int({ min: 10, max: 90 }) * 60_000),
      updatedAt: iso(t),
      confirmedAt:
        s.status !== OrderStatus.PENDING ? iso(t - faker.number.int({ min: 5, max: 30 }) * 60_000) : undefined,
      confirmedByUserId: s.status !== OrderStatus.PENDING ? 'staff-waiter-1' : undefined,
    } satisfies Order;
  });
}

function buildBills(tables: RestaurantTable[], orders: Order[]): Bill[] {
  const bills: Bill[] = [];
  const t = now();
  for (let i = 0; i < 18; i++) {
    const subtotal = faker.number.int({ min: 120_000, max: 890_000 });
    const rounding = 0;
    bills.push({
      id: `bill-paid-${i + 1}`,
      tenantId: mockTenantId,
      sessionId: `sess-closed-${i + 1}`,
      orderIds: [`ord-hist-${i + 1}`],
      subtotal,
      total: subtotal + rounding,
      roundingAmount: rounding,
      paymentMethod: PaymentMethod.CASH,
      paymentId: faker.string.uuid(),
      status: BillStatus.PAID,
      closedAt: iso(t - (i + 1) * 20 * 60_000),
      paidAt: iso(t - (i + 1) * 18 * 60_000),
      createdAt: iso(t - (i + 2) * 60 * 60_000),
      updatedAt: iso(t - (i + 1) * 18 * 60_000),
    });
  }
  const billingTables = tables.filter((tb) => tb.status === 'billing').slice(0, 3);
  const pendingBillIds = [
    '66666666-6666-4666-a666-666666666661',
    '66666666-6666-4666-a666-666666666662',
    '66666666-6666-4666-a666-666666666663',
  ] as const;
  for (let j = 0; j < 3; j++) {
    const tbl = billingTables[j] ?? tables[0];
    const relatedOrders = orders.filter((o) => o.tableId === tbl.id).map((o) => o.id);
    const subtotal = orders.filter((o) => o.tableId === tbl.id).reduce((s, o) => s + o.totalAmount, 184_000);
    bills.push({
      id: pendingBillIds[j] ?? pendingBillIds[0],
      tenantId: mockTenantId,
      sessionId: tbl.sessionId ?? `sess-${tbl.id}`,
      orderIds: relatedOrders.length ? relatedOrders : ['ord-001'],
      subtotal,
      total: subtotal,
      roundingAmount: 0,
      status: BillStatus.PENDING_PAYMENT,
      closedAt: iso(t - 10 * 60_000),
      createdAt: iso(t - 60 * 60_000),
      updatedAt: iso(t),
    });
  }
  return bills;
}

function buildServiceRequests(tables: RestaurantTable[]): ServiceRequest[] {
  const occ = tables.filter((t) => t.status === 'occupied');
  const t0 = occ[0];
  const t1 = occ[1] ?? occ[0];
  const t2 = occ[2] ?? occ[0];
  const ts = now();
  return [
    {
      id: 'sr-001',
      tenantId: mockTenantId,
      tableId: t0.id,
      sessionId: t0.sessionId ?? 'sess-x',
      type: ServiceRequestType.CALL_STAFF,
      status: ServiceRequestStatus.PENDING,
      note: 'Gọi nhân viên',
      createdAt: iso(ts - 8 * 60_000),
      updatedAt: iso(ts - 8 * 60_000),
    },
    {
      id: 'sr-002',
      tenantId: mockTenantId,
      tableId: t1.id,
      sessionId: t1.sessionId ?? 'sess-y',
      type: ServiceRequestType.REQUEST_BILL,
      status: ServiceRequestStatus.PENDING,
      createdAt: iso(ts - 20 * 60_000),
      updatedAt: iso(ts - 20 * 60_000),
    },
    {
      id: 'sr-003',
      tenantId: mockTenantId,
      tableId: t2.id,
      sessionId: t2.sessionId ?? 'sess-z',
      type: ServiceRequestType.GENERAL_HELP,
      status: ServiceRequestStatus.ACKNOWLEDGED,
      note: 'Hỏi wifi',
      acknowledgedAt: iso(ts - 5 * 60_000),
      acknowledgedByUserId: 'staff-waiter-1',
      createdAt: iso(ts - 25 * 60_000),
      updatedAt: iso(ts - 5 * 60_000),
    },
  ];
}

function buildKDSTickets(orders: Order[]): KDSTicketMock[] {
  const processing = orders.filter((o) => o.status === OrderStatus.PROCESSING);
  const stations: Array<'KITCHEN' | 'BAR'> = ['KITCHEN', 'BAR'];
  return processing.map((o, i) => ({
    ticketId: `kds-${o.id}`,
    tenantId: mockTenantId,
    orderId: o.id,
    tableId: o.tableId,
    tableName: o.tableName,
    items: o.items,
    priority: faker.number.int({ min: 0, max: 1 }) === 1,
    createdAt: o.createdAt,
    slaSeconds: faker.number.int({ min: 300, max: 900 }),
    station: stations[i % 2],
    columnStatus: 'WAITING',
  }));
}

export type MockPresenceGuest = { name: string; color: string };

export type TablePresence = {
  tableId: string;
  guests: MockPresenceGuest[];
};

export type MockStaffUser = {
  id: string;
  name: string;
  role: 'Waiter' | 'Chef' | 'Barista';
  avatarUrl: string | null;
};

function buildPresence(tables: RestaurantTable[]): TablePresence[] {
  return tables
    .filter((t) => t.status === 'occupied' || t.status === 'billing')
    .map((t) => ({
      tableId: t.id,
      guests: Array.from({ length: faker.number.int({ min: 2, max: 4 }) }, (_, i) => ({
        name: `Khách ${i + 1}`,
        color: faker.color.rgb({ format: 'hex', casing: 'lower' }),
      })),
    }));
}

function buildMockUsers(): MockStaffUser[] {
  return [
    { id: 'staff-waiter-1', name: 'Anh Tuấn', role: 'Waiter', avatarUrl: null },
    { id: 'staff-chef-1', name: 'Chị Lan', role: 'Chef', avatarUrl: null },
    { id: 'staff-bar-1', name: 'Minh', role: 'Barista', avatarUrl: null },
  ];
}

export type MockSeed = {
  mockTenantId: string;
  mockTables: RestaurantTable[];
  mockLiveOrders: Order[];
  mockBills: Bill[];
  mockServiceRequests: ServiceRequest[];
  mockKDSTickets: KDSTicketMock[];
  mockPresence: TablePresence[];
  mockUsers: MockStaffUser[];
};

export function buildSeed(): MockSeed {
  const mockTables = buildTables();
  const mockLiveOrders = buildLiveOrders(mockTables);
  const mockBills = buildBills(mockTables, mockLiveOrders);
  const mockServiceRequests = buildServiceRequests(mockTables);
  const mockKDSTickets = buildKDSTickets(mockLiveOrders);
  const mockPresence = buildPresence(mockTables);
  const mockUsers = buildMockUsers();
  return {
    mockTenantId,
    mockTables,
    mockLiveOrders,
    mockBills,
    mockServiceRequests,
    mockKDSTickets,
    mockPresence,
    mockUsers,
  };
}
