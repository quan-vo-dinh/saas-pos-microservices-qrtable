import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import { BillStatus, OrderStatus, PaymentMethod, ServiceRequestStatus } from '@einvoice/types';
import type { Bill, Order, OrderItem, RestaurantTable, ServiceRequest } from '@einvoice/types';
import type { ColumnStatus, KDSTicketMock } from './kds-ticket';
import { buildSeed, type MockStaffUser, type TablePresence } from './seed';

export type NotificationKind = 'order' | 'service' | 'system';

export type MockNotification = {
  id: string;
  kind: NotificationKind;
  createdAt: number;
  preview: string;
};

export type RecallEntry = {
  id: string;
  createdAt: number;
  ticketId: string;
  userId: string;
  userName: string;
  reason: string;
  resolved: boolean;
};

export type PosViewFilter = 'all' | 'PENDING' | 'PROCESSING' | 'READY' | 'OVERDUE' | 'OCCUPIED_TABLE';

type MockState = {
  liveOrders: Order[];
  bills: Bill[];
  tables: RestaurantTable[];
  serviceRequests: ServiceRequest[];
  kdsTickets: KDSTicketMock[];
  selectedRowId: string | null;
  /** Right pane: Tables tab */
  selectedTableId: string | null;
  /** Cash bills tab */
  selectedBillId: string | null;
  /** Service requests tab — syncs with right inspector */
  selectedServiceRequestId: string | null;
  /** Mock tenant label (UI only) */
  activeMockTenantName: string;
  /** UI-only flag for staff "ưu tiên" — Order entity has no field until Step 2.4 */
  orderPriority: Record<string, boolean>;
  posViewFilter: PosViewFilter;
  notifications: MockNotification[];
  recallLog: RecallEntry[];
  /** KDS: keyboard shortcut target */
  kdsSelectedTicketId: string | null;
  mockPresence: TablePresence[];
  mockUsers: MockStaffUser[];
};

type MockActions = {
  selectRow: (id: string | null) => void;
  selectTable: (id: string | null) => void;
  selectBill: (id: string | null) => void;
  selectServiceRequest: (id: string | null) => void;
  setActiveMockTenantName: (name: string) => void;
  confirmOrder: (id: string, userId: string) => void;
  cancelOrder: (id: string, reason: string, userId: string) => void;
  acknowledgeRequest: (id: string, userId: string) => void;
  resolveRequest: (id: string, userId: string) => void;
  transferTable: (fromId: string, toId: string) => void;
  markTableClean: (id: string) => void;
  setTableStatus: (id: string, status: RestaurantTable['status']) => void;
  advanceTicket: (id: string) => void;
  setKdsTicketColumn: (ticketId: string, columnStatus: ColumnStatus) => void;
  updateKdsTicketItemStatus: (ticketId: string, itemId: string, status: OrderItem['status']) => void;
  recallTicket: (id: string, reason: string, userId: string, userName: string) => void;
  payCash: (billId: string, received: number) => void;
  pushNotification: (kind: NotificationKind, preview: string) => void;
  appendLiveOrder: (order: Order) => void;
  appendServiceRequest: (req: ServiceRequest) => void;
  updateOrderStatus: (orderId: string, toStatus: Order['status'], changedByUserId?: string) => void;
  updateOrderItemStatus: (orderId: string, itemId: string, status: Order['items'][number]['status']) => void;
  toggleOrderPriority: (orderId: string) => void;
  setPosViewFilter: (f: PosViewFilter) => void;
  selectKdsTicket: (ticketId: string | null) => void;
  markRecallResolved: (entryId: string) => void;
};

export type MockStore = MockState & MockActions;

const initialSeed = buildSeed();

const nextColumn = (c: ColumnStatus): ColumnStatus => {
  if (c === 'WAITING') return 'IN_PROGRESS';
  if (c === 'IN_PROGRESS') return 'DONE';
  return 'DONE';
};

function findTable(tables: RestaurantTable[], id: string) {
  return tables.find((t) => t.id === id);
}

export const useMockStore = create<MockStore>()(
  devtools(
    (set, get) => ({
      liveOrders: initialSeed.mockLiveOrders,
      bills: initialSeed.mockBills,
      tables: initialSeed.mockTables,
      serviceRequests: initialSeed.mockServiceRequests,
      kdsTickets: initialSeed.mockKDSTickets,
      selectedRowId: null,
      selectedTableId: null,
      selectedBillId: null,
      selectedServiceRequestId: null,
      activeMockTenantName: 'Phở Tầm Anh',
      orderPriority: {},
      posViewFilter: 'all',
      notifications: [],
      recallLog: [],
      kdsSelectedTicketId: null,
      mockPresence: initialSeed.mockPresence,
      mockUsers: initialSeed.mockUsers,

      selectRow: (id) => set({ selectedRowId: id }),
      selectTable: (id) => set({ selectedTableId: id }),
      selectBill: (id) => set({ selectedBillId: id }),
      selectServiceRequest: (id) => set({ selectedServiceRequestId: id }),
      setActiveMockTenantName: (name) => set({ activeMockTenantName: name }),

      confirmOrder: (id, userId) => {
        const ts = Date.now();
        set((s) => ({
          liveOrders: s.liveOrders.map((o) =>
            o.id === id && o.status === OrderStatus.PENDING
              ? {
                  ...o,
                  status: OrderStatus.PROCESSING,
                  confirmedAt: new Date(ts).toISOString(),
                  confirmedByUserId: userId,
                  updatedAt: new Date(ts).toISOString(),
                }
              : o,
          ),
        }));
      },

      cancelOrder: (id, reason, userId) => {
        const ts = Date.now();
        set((s) => ({
          liveOrders: s.liveOrders.map((o) =>
            o.id === id
              ? {
                  ...o,
                  status: OrderStatus.CANCELED,
                  cancelReason: reason,
                  cancelledAt: new Date(ts).toISOString(),
                  cancelledByUserId: userId,
                  updatedAt: new Date(ts).toISOString(),
                }
              : o,
          ),
        }));
      },

      acknowledgeRequest: (id, userId) => {
        const ts = Date.now();
        set((s) => ({
          serviceRequests: s.serviceRequests.map((r) =>
            r.id === id && r.status === ServiceRequestStatus.PENDING
              ? {
                  ...r,
                  status: ServiceRequestStatus.ACKNOWLEDGED,
                  acknowledgedAt: new Date(ts).toISOString(),
                  acknowledgedByUserId: userId,
                  updatedAt: new Date(ts).toISOString(),
                }
              : r,
          ),
        }));
      },

      resolveRequest: (id, userId) => {
        const ts = Date.now();
        set((s) => ({
          serviceRequests: s.serviceRequests.map((r) =>
            r.id === id && r.status === ServiceRequestStatus.ACKNOWLEDGED
              ? {
                  ...r,
                  status: ServiceRequestStatus.RESOLVED,
                  resolvedAt: new Date(ts).toISOString(),
                  updatedAt: new Date(ts).toISOString(),
                }
              : r,
          ),
        }));
        void userId;
      },

      transferTable: (fromId, toId) => {
        const ts = Date.now();
        const { tables, liveOrders } = get();
        const from = findTable(tables, fromId);
        const to = findTable(tables, toId);
        if (!from || !to || to.status !== 'available') return;
        const sessionId = from.sessionId;
        if (!sessionId) return;
        set({
          tables: tables.map((t) => {
            if (t.id === fromId) {
              return {
                ...t,
                status: 'available' as const,
                sessionId: null,
              };
            }
            if (t.id === toId) {
              return {
                ...t,
                status: 'occupied' as const,
                sessionId,
              };
            }
            return t;
          }),
          liveOrders: liveOrders.map((o) =>
            o.tableId === fromId
              ? {
                  ...o,
                  tableId: toId,
                  tableName: `${to.name} — ${to.areaName}`,
                  updatedAt: new Date(ts).toISOString(),
                }
              : o,
          ),
        });
      },

      markTableClean: (id) => {
        set((s) => ({
          tables: s.tables.map((t) => (t.id === id ? { ...t, status: 'available' as const, sessionId: null } : t)),
        }));
      },

      setTableStatus: (id, status) => {
        set((s) => ({
          tables: s.tables.map((t) =>
            t.id === id
              ? {
                  ...t,
                  status,
                  sessionId: status === 'available' || status === 'cleaning' ? null : t.sessionId,
                }
              : t,
          ),
        }));
      },

      advanceTicket: (id) => {
        set((s) => ({
          kdsTickets: s.kdsTickets.map((t) =>
            t.ticketId === id ? { ...t, columnStatus: nextColumn(t.columnStatus) } : t,
          ),
        }));
      },

      setKdsTicketColumn: (ticketId, columnStatus) => {
        set((s) => ({
          kdsTickets: s.kdsTickets.map((t) => (t.ticketId === ticketId ? { ...t, columnStatus } : t)),
        }));
      },

      updateKdsTicketItemStatus: (ticketId, itemId, status) => {
        const ts = Date.now();
        set((s) => {
          const target = s.kdsTickets.find((k) => k.ticketId === ticketId);
          const orderId = target?.orderId;
          return {
            kdsTickets: s.kdsTickets.map((t) => {
              if (t.ticketId !== ticketId) return t;
              return {
                ...t,
                items: t.items.map((it) =>
                  it.id === itemId ? { ...it, status, updatedAt: new Date(ts).toISOString() } : it,
                ),
              };
            }),
            liveOrders: orderId
              ? s.liveOrders.map((o) =>
                  o.id === orderId
                    ? {
                        ...o,
                        items: o.items.map((it) =>
                          it.id === itemId ? { ...it, status, updatedAt: new Date(ts).toISOString() } : it,
                        ),
                        updatedAt: new Date(ts).toISOString(),
                      }
                    : o,
                )
              : s.liveOrders,
          };
        });
      },

      recallTicket: (id, reason, userId, userName) => {
        const ts = Date.now();
        const entry: RecallEntry = {
          id: `rc-${ts}`,
          createdAt: ts,
          ticketId: id,
          userId,
          userName,
          reason,
          resolved: false,
        };
        set((s) => ({
          recallLog: [entry, ...s.recallLog].slice(0, 200),
          kdsTickets: s.kdsTickets.map((t) => (t.ticketId === id ? { ...t, columnStatus: 'IN_PROGRESS' as const } : t)),
        }));
      },

      payCash: (billId, received) => {
        const ts = Date.now();
        const bill = get().bills.find((b) => b.id === billId);
        if (!bill || received < bill.total) return;
        set((s) => ({
          bills: s.bills.map((b) =>
            b.id === billId
              ? {
                  ...b,
                  status: BillStatus.PAID,
                  paymentMethod: PaymentMethod.CASH,
                  paidAt: new Date(ts).toISOString(),
                  updatedAt: new Date(ts).toISOString(),
                }
              : b,
          ),
          tables: s.tables.map((t) =>
            t.sessionId === bill.sessionId ? { ...t, status: 'cleaning' as const, sessionId: null } : t,
          ),
        }));
      },

      pushNotification: (kind, preview) => {
        const ts = Date.now();
        set((s) => ({
          notifications: [
            { id: `ntf-${ts}-${s.notifications.length}`, kind, createdAt: ts, preview },
            ...s.notifications,
          ].slice(0, 100),
        }));
      },

      appendLiveOrder: (order) => {
        set((s) => ({ liveOrders: [order, ...s.liveOrders] }));
      },

      appendServiceRequest: (req) => {
        set((s) => ({ serviceRequests: [req, ...s.serviceRequests] }));
      },

      updateOrderStatus: (orderId, toStatus, changedByUserId) => {
        const ts = Date.now();
        set((s) => ({
          liveOrders: s.liveOrders.map((o) =>
            o.id === orderId
              ? {
                  ...o,
                  status: toStatus,
                  updatedAt: new Date(ts).toISOString(),
                  confirmedByUserId: o.confirmedByUserId ?? changedByUserId,
                }
              : o,
          ),
        }));
      },

      updateOrderItemStatus: (orderId, itemId, status) => {
        const ts = Date.now();
        set((s) => ({
          liveOrders: s.liveOrders.map((o) => {
            if (o.id !== orderId) return o;
            const nextItems = o.items.map((it) =>
              it.id === itemId ? { ...it, status, updatedAt: new Date(ts).toISOString() } : it,
            );
            return { ...o, items: nextItems, updatedAt: new Date(ts).toISOString() };
          }),
        }));
      },

      toggleOrderPriority: (orderId) => {
        set((s) => ({
          orderPriority: { ...s.orderPriority, [orderId]: !s.orderPriority[orderId] },
        }));
      },

      setPosViewFilter: (f) => set({ posViewFilter: f }),

      selectKdsTicket: (ticketId) => set({ kdsSelectedTicketId: ticketId }),

      markRecallResolved: (entryId) => {
        set((s) => ({
          recallLog: s.recallLog.map((e) => (e.id === entryId ? { ...e, resolved: true } : e)),
        }));
      },
    }),
    { name: 'qrtable-mock-pos' },
  ),
);
