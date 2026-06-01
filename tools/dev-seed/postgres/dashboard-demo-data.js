/**
 * Fixed dashboard demo fixtures for Nhà hàng Phở Việt (tenant pho-viet).
 * Dates anchor to "today" in Asia/Ho_Chi_Minh so default 7-day report ranges always chart.
 */
const { DEV_TENANT } = require('../constants');
const { MENU_ITEMS, TABLES } = require('./data');

const DEMO_ID_PREFIX = 'd4d0';
const REPORT_DAYS = 14;
const BILLS_PER_DAY = 2;

/** @type {Record<string, { id: string; name: string; unitPrice: number; station: string }>} */
const MENU_BY_KEY = {
  pho: {
    id: MENU_ITEMS[0].id,
    name: MENU_ITEMS[0].name,
    unitPrice: 65000,
    station: 'KITCHEN',
  },
  bun: {
    id: MENU_ITEMS[1].id,
    name: MENU_ITEMS[1].name,
    unitPrice: 70000,
    station: 'KITCHEN',
  },
  goi: {
    id: MENU_ITEMS[2].id,
    name: MENU_ITEMS[2].name,
    unitPrice: 45000,
    station: 'KITCHEN',
  },
  tra: {
    id: MENU_ITEMS[3].id,
    name: MENU_ITEMS[3].name,
    unitPrice: 5000,
    station: 'BAR',
  },
  phoNac: {
    id: MENU_ITEMS[4].id,
    name: MENU_ITEMS[4].name,
    unitPrice: 75000,
    station: 'KITCHEN',
  },
  cafe: {
    id: MENU_ITEMS[5].id,
    name: MENU_ITEMS[5].name,
    unitPrice: 25000,
    station: 'BAR',
  },
};

const TABLE_BY_KEY = {
  a01: TABLES[0],
  a02: TABLES[1],
  b01: TABLES[2],
  c01: TABLES[3],
};

/** Lunch/dinner line mix — phở dominates for realistic pho-restaurant charts. */
const DAY_PROFILES = [
  { lunch: { pho: 4, tra: 3 }, dinner: { pho: 3, bun: 1, goi: 1 }, methods: ['CASH', 'VIETQR'] },
  { lunch: { pho: 3, goi: 2 }, dinner: { phoNac: 2, tra: 2, cafe: 1 }, methods: ['VIETQR', 'CASH'] },
  { lunch: { pho: 5, tra: 2 }, dinner: { bun: 2, pho: 2 }, methods: ['CASH', 'CASH'] },
  { lunch: { phoNac: 2, pho: 2 }, dinner: { pho: 4, tra: 4 }, methods: ['VIETQR', 'VIETQR'] },
  { lunch: { pho: 3, bun: 1 }, dinner: { pho: 2, goi: 2, cafe: 2 }, methods: ['CASH', 'VIETQR'] },
  { lunch: { pho: 6, tra: 3 }, dinner: { phoNac: 3, tra: 2 }, methods: ['CASH', 'CASH'] },
  { lunch: { pho: 4, goi: 1 }, dinner: { pho: 3, bun: 2 }, methods: ['VIETQR', 'CASH'] },
  { lunch: { phoNac: 2, pho: 3, tra: 2 }, dinner: { pho: 5, cafe: 2 }, methods: ['CASH', 'VIETQR'] },
  { lunch: { pho: 3, tra: 4 }, dinner: { bun: 1, pho: 3, goi: 2 }, methods: ['VIETQR', 'VIETQR'] },
  { lunch: { pho: 4, cafe: 2 }, dinner: { phoNac: 2, pho: 2, tra: 3 }, methods: ['CASH', 'CASH'] },
  { lunch: { pho: 5, goi: 2 }, dinner: { pho: 4, bun: 1 }, methods: ['CASH', 'VIETQR'] },
  { lunch: { phoNac: 3, tra: 2 }, dinner: { pho: 3, goi: 1, cafe: 2 }, methods: ['VIETQR', 'CASH'] },
  { lunch: { pho: 4, bun: 2 }, dinner: { pho: 6, tra: 2 }, methods: ['CASH', 'VIETQR'] },
  { lunch: { pho: 2, goi: 2, tra: 2 }, dinner: { phoNac: 2, pho: 3 }, methods: ['VIETQR', 'CASH'] },
];

const TABLE_ROTATION = ['a01', 'a02', 'b01', 'c01', 'a01', 'a02', 'b01', 'c01'];

function roundVnd(amount) {
  return Math.ceil(amount / 1000) * 1000;
}

function demoUuid(series, seq) {
  const n = String(seq).padStart(4, '0');
  return `${DEMO_ID_PREFIX}${series}-${n}-4111-8111-111111111111`;
}

/**
 * Noon or 19:00 in Asia/Ho_Chi_Minh for a calendar day `daysAgo` before anchor (local date).
 */
function atVnTime(daysAgo, hour, minute, anchor) {
  const anchorLocal = new Date(anchor.getTime() + 7 * 60 * 60 * 1000);
  const y = anchorLocal.getUTCFullYear();
  const m = anchorLocal.getUTCMonth();
  const d = anchorLocal.getUTCDate() - daysAgo;
  const utcMs = Date.UTC(y, m, d, hour - 7, minute, 0, 0);
  return new Date(utcMs);
}

function expandLines(lineMap) {
  const lines = [];
  for (const [key, qty] of Object.entries(lineMap)) {
    if (!qty || !MENU_BY_KEY[key]) {
      continue;
    }
    lines.push({ key, quantity: qty });
  }
  return lines;
}

function computeTotals(lines) {
  let raw = 0;
  const items = lines.map((line, index) => {
    const menu = MENU_BY_KEY[line.key];
    const lineRaw = menu.unitPrice * line.quantity;
    raw += lineRaw;
    return {
      menuItemId: menu.id,
      menuItemName: menu.name,
      quantity: line.quantity,
      unitPrice: menu.unitPrice,
      station: menu.station,
      index,
    };
  });
  const total = roundVnd(raw);
  const roundingAmount = total - raw;
  return { items, subtotal: raw, total, roundingAmount };
}

/**
 * @param {{ anchorDate?: Date }} [opts]
 */
function buildPhoVietDashboardFixtures(opts = {}) {
  const anchorDate = opts.anchorDate ?? new Date();
  const tenantId = DEV_TENANT.id;
  const sessions = [];
  const orders = [];
  const orderItems = [];
  const bills = [];
  const payments = [];
  const tablePatches = [];

  let seq = 1;

  for (let dayIndex = 0; dayIndex < REPORT_DAYS; dayIndex += 1) {
    const daysAgo = REPORT_DAYS - 1 - dayIndex;
    const profile = DAY_PROFILES[dayIndex % DAY_PROFILES.length];
    const slots = [
      { lines: profile.lunch, hour: 11, minute: 45, method: profile.methods[0] },
      { lines: profile.dinner, hour: 19, minute: 15, method: profile.methods[1] },
    ];

    for (let slotIndex = 0; slotIndex < BILLS_PER_DAY; slotIndex += 1) {
      const slot = slots[slotIndex];
      const paidAt = atVnTime(daysAgo, slot.hour, slot.minute, anchorDate);
      const tableKey = TABLE_ROTATION[(dayIndex * BILLS_PER_DAY + slotIndex) % TABLE_ROTATION.length];
      const table = TABLE_BY_KEY[tableKey];
      const sessionId = demoUuid('1000', seq);
      const orderId = demoUuid('2000', seq);
      const billId = demoUuid('3000', seq);
      const paymentId = demoUuid('4000', seq);
      const { items, subtotal, total, roundingAmount } = computeTotals(expandLines(slot.lines));

      sessions.push({
        id: sessionId,
        tenantId,
        tableId: table.id,
        tableName: table.name,
        status: 'CLOSED',
        startedAt: new Date(paidAt.getTime() - 45 * 60 * 1000),
        lastActivity: paidAt,
        closedAt: paidAt,
        orderCount: 1,
        currentBillId: billId,
        createdAt: paidAt,
        updatedAt: paidAt,
      });

      orders.push({
        id: orderId,
        tenantId,
        tableId: table.id,
        tableName: table.name,
        sessionId,
        status: 'COMPLETED',
        totalAmount: total,
        idempotencyKey: `demo-order-${seq}`,
        notes: null,
        confirmedAt: new Date(paidAt.getTime() - 30 * 60 * 1000),
        confirmedByUserId: '8ec2f6e3-0000-0000-0000-000000000004',
        cancelledAt: null,
        cancelledByUserId: null,
        cancelReason: null,
        createdAt: new Date(paidAt.getTime() - 40 * 60 * 1000),
        updatedAt: paidAt,
      });

      for (const item of items) {
        orderItems.push({
          id: demoUuid('5000', seq * 10 + item.index),
          tenantId,
          orderId,
          menuItemId: item.menuItemId,
          menuItemName: item.menuItemName,
          menuItemImageUrl: null,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          note: null,
          status: 'SERVED',
          station: item.station,
          createdAt: orders[orders.length - 1].createdAt,
          updatedAt: paidAt,
        });
      }

      bills.push({
        id: billId,
        tenantId,
        sessionId,
        orderIds: orderId,
        subtotal,
        total,
        roundingAmount,
        paymentMethod: slot.method,
        status: 'PAID',
        closedAt: paidAt,
        paidAt,
        paymentId,
        createdAt: new Date(paidAt.getTime() - 20 * 60 * 1000),
        updatedAt: paidAt,
      });

      payments.push({
        id: paymentId,
        tenantId,
        billId,
        billReference: `PV${String(seq).padStart(6, '0')}`,
        method: slot.method,
        status: 'PAID',
        rawTotal: subtotal,
        roundedTotal: total,
        roundingDelta: roundingAmount,
        paidAmount: total,
        amountReceived: slot.method === 'CASH' ? total : null,
        changeAmount: null,
        paidAt,
        createdAt: paidAt,
        updatedAt: paidAt,
      });

      seq += 1;
    }
  }

  // Today's open bill — pending payment (not in revenue charts)
  const pendingSeq = seq;
  const pendingPaidAt = atVnTime(0, 12, 0, anchorDate);
  const pendingSessionId = demoUuid('1000', pendingSeq);
  const pendingOrderId = demoUuid('2000', pendingSeq);
  const pendingBillId = demoUuid('3000', pendingSeq);
  const pendingTable = TABLE_BY_KEY.a01;
  const pendingLines = expandLines({ pho: 2, goi: 1, tra: 2 });
  const pendingTotals = computeTotals(pendingLines);

  sessions.push({
    id: pendingSessionId,
    tenantId,
    tableId: pendingTable.id,
    tableName: pendingTable.name,
    status: 'ACTIVE',
    startedAt: new Date(pendingPaidAt.getTime() - 25 * 60 * 1000),
    lastActivity: pendingPaidAt,
    closedAt: null,
    orderCount: 1,
    currentBillId: pendingBillId,
    createdAt: pendingPaidAt,
    updatedAt: pendingPaidAt,
  });

  orders.push({
    id: pendingOrderId,
    tenantId,
    tableId: pendingTable.id,
    tableName: pendingTable.name,
    sessionId: pendingSessionId,
    status: 'SERVED',
    totalAmount: pendingTotals.total,
    idempotencyKey: `demo-order-${pendingSeq}`,
    notes: 'Ít hành',
    confirmedAt: pendingPaidAt,
    confirmedByUserId: '8ec2f6e3-0000-0000-0000-000000000004',
    cancelledAt: null,
    cancelledByUserId: null,
    cancelReason: null,
    createdAt: pendingPaidAt,
    updatedAt: pendingPaidAt,
  });

  for (const item of pendingTotals.items) {
    orderItems.push({
      id: demoUuid('5000', pendingSeq * 10 + item.index),
      tenantId,
      orderId: pendingOrderId,
      menuItemId: item.menuItemId,
      menuItemName: item.menuItemName,
      menuItemImageUrl: null,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      note: null,
      status: 'SERVED',
      station: item.station,
      createdAt: pendingPaidAt,
      updatedAt: pendingPaidAt,
    });
  }

  bills.push({
    id: pendingBillId,
    tenantId,
    sessionId: pendingSessionId,
    orderIds: pendingOrderId,
    subtotal: pendingTotals.subtotal,
    total: pendingTotals.total,
    roundingAmount: pendingTotals.roundingAmount,
    paymentMethod: null,
    status: 'PENDING_PAYMENT',
    closedAt: pendingPaidAt,
    paidAt: null,
    paymentId: null,
    createdAt: pendingPaidAt,
    updatedAt: pendingPaidAt,
  });

  tablePatches.push(
    { kind: 'table', id: TABLE_BY_KEY.a01.id, status: 'occupied', sessionId: pendingSessionId },
    { kind: 'table', id: TABLE_BY_KEY.b01.id, status: 'billing', sessionId: null },
    { kind: 'table', id: TABLE_BY_KEY.c01.id, status: 'cleaning', sessionId: null },
    { kind: 'menu', id: MENU_ITEMS[5].id, status: 'out_of_stock' },
  );

  // One cancelled order in range (excluded from top-items revenue logic for cancelled status)
  const cancelSeq = pendingSeq + 1;
  const cancelAt = atVnTime(2, 14, 0, anchorDate);
  const cancelSessionId = demoUuid('1000', cancelSeq);
  const cancelOrderId = demoUuid('2000', cancelSeq);

  sessions.push({
    id: cancelSessionId,
    tenantId,
    tableId: TABLE_BY_KEY.a02.id,
    tableName: TABLE_BY_KEY.a02.name,
    status: 'CLOSED',
    startedAt: cancelAt,
    lastActivity: cancelAt,
    closedAt: cancelAt,
    orderCount: 1,
    currentBillId: null,
    createdAt: cancelAt,
    updatedAt: cancelAt,
  });

  orders.push({
    id: cancelOrderId,
    tenantId,
    tableId: TABLE_BY_KEY.a02.id,
    tableName: TABLE_BY_KEY.a02.name,
    sessionId: cancelSessionId,
    status: 'CANCELED',
    totalAmount: 65000,
    idempotencyKey: `demo-order-${cancelSeq}`,
    notes: null,
    confirmedAt: null,
    confirmedByUserId: null,
    cancelledAt: cancelAt,
    cancelledByUserId: '8ec2f6e3-0000-0000-0000-000000000004',
    cancelReason: 'Khách đổi bàn',
    createdAt: cancelAt,
    updatedAt: cancelAt,
  });

  orderItems.push({
    id: demoUuid('5000', cancelSeq * 10),
    tenantId,
    orderId: cancelOrderId,
    menuItemId: MENU_BY_KEY.pho.id,
    menuItemName: MENU_BY_KEY.pho.name,
    menuItemImageUrl: null,
    quantity: 1,
    unitPrice: MENU_BY_KEY.pho.unitPrice,
    note: null,
    status: 'PROCESSING',
    station: 'KITCHEN',
    createdAt: cancelAt,
    updatedAt: cancelAt,
  });

  return {
    tenantId,
    sessions,
    orders,
    orderItems,
    bills,
    payments,
    tablePatches,
    expected: {
      paidBillCount: REPORT_DAYS * BILLS_PER_DAY,
      pendingBillCount: 1,
      sessionCount: sessions.length,
    },
  };
}

/** Platform subscription invoices (SaaS admin analytics). */
function buildPlatformInvoiceFixtures(anchorDate = new Date()) {
  const rows = [];
  let seq = 1;
  for (let daysAgo = 27; daysAgo >= 0; daysAgo -= 3) {
    const paidAt = atVnTime(daysAgo, 9, 0, anchorDate);
    const periodStart = atVnTime(daysAgo + 30, 0, 0, anchorDate);
    const periodEnd = atVnTime(daysAgo, 0, 0, anchorDate);
    const amountVnd = seq % 3 === 0 ? 999000 : 299000;
    const planCode = seq % 3 === 0 ? 'PREMIUM' : 'BASIC';
    rows.push({
      id: demoUuid('6000', seq),
      tenantId: DEV_TENANT.id,
      planCode,
      amountVnd,
      billingPeriod: 'MONTHLY',
      periodStartsAt: periodStart,
      periodEndsAt: periodEnd,
      billingReference: `PLAT${String(seq).padStart(6, '0')}`,
      status: 'PAID',
      qrExpiresAt: new Date(paidAt.getTime() + 15 * 60 * 1000),
      paidAt,
      paidAmountVnd: amountVnd,
      requestedByUserId: '8ec2f6e3-0000-0000-0000-000000000001',
      createdAt: paidAt,
      updatedAt: paidAt,
    });
    seq += 1;
  }
  return rows;
}

module.exports = {
  DEMO_ID_PREFIX,
  buildPhoVietDashboardFixtures,
  buildPlatformInvoiceFixtures,
  roundVnd,
};
