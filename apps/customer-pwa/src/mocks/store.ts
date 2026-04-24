import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import type { CartItem, MenuItem, Order } from '@einvoice/types';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';
import {
  mockCartActivity,
  mockMenu,
  mockPresence,
  mockSession,
  type CartActivityEvent,
  type MockPresenceGuest,
  type MockSession,
} from './seed';

export type CartLine = CartItem & { lineId: string };

export type PwaCart = {
  items: CartLine[];
  version: number;
};

type PwaState = {
  menu: MenuItem[];
  cart: PwaCart;
  session: MockSession;
  presence: MockPresenceGuest[];
  activityFeed: CartActivityEvent[];
  order: Order | null;
  billLockActive: boolean;
  serviceRequestOpen: boolean;
};

type PwaActions = {
  addItem: (input: {
    menuItemId: string;
    menuItemName: string;
    unitPrice: number;
    quantity?: number;
    note?: string;
  }) => void;
  incQty: (lineId: string) => void;
  decQty: (lineId: string) => void;
  removeItem: (lineId: string) => void;
  setNote: (lineId: string, note: string) => void;
  bumpVersion: () => void;
  clearCart: () => void;
  setOrder: (order: Order | null) => void;
  advanceOrderStatus: (next: Order['status']) => void;
  setBillLockActive: (v: boolean) => void;
  toggleBillLock: () => void;
  pushActivity: (entry: CartActivityEvent) => void;
  patchMenuItem: (menuItemId: string, patch: Partial<Pick<MenuItem, 'status' | 'stock'>>) => void;
  setServiceRequestOpen: (open: boolean) => void;
};

export type PwaMockStore = PwaState & PwaActions;

const newLineId = () =>
  `line-${typeof globalThis !== 'undefined' && globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `${Date.now()}-${Math.random()}`}`;

export const usePwaMockStore = create<PwaMockStore>()(
  devtools(
    (set, get) => ({
      menu: mockMenu,
      cart: { items: [], version: 1 },
      session: mockSession,
      presence: mockPresence,
      activityFeed: [...mockCartActivity].slice(0, 10),
      order: null,
      billLockActive: false,
      serviceRequestOpen: false,

      addItem: (input) => {
        const lineId = newLineId();
        const version = 1;
        const { menuItemId, menuItemName, quantity, unitPrice, note } = input;
        set((s) => {
          const nextItems = [...s.cart.items];
          const idx = nextItems.findIndex((l) => l.menuItemId === menuItemId && (l.note ?? '') === (note ?? ''));
          if (idx >= 0) {
            nextItems[idx] = {
              ...nextItems[idx],
              quantity: nextItems[idx].quantity + (quantity ?? 1),
              version: nextItems[idx].version + 1,
            };
          } else {
            nextItems.push({
              lineId,
              menuItemId,
              menuItemName,
              quantity: quantity ?? 1,
              unitPrice,
              note,
              version,
            });
          }
          return {
            cart: { items: nextItems, version: s.cart.version + 1 },
            activityFeed: [
              {
                who: 'Bạn',
                action: 'đã thêm',
                itemName: menuItemName,
                qty: quantity ?? 1,
                at: Date.now(),
              },
              ...s.activityFeed,
            ].slice(0, 10),
          };
        });
      },

      incQty: (lineId) => {
        set((s) => ({
          cart: {
            version: s.cart.version + 1,
            items: s.cart.items.map((l) =>
              l.lineId === lineId ? { ...l, quantity: l.quantity + 1, version: l.version + 1 } : l,
            ),
          },
        }));
      },

      decQty: (lineId) => {
        set((s) => ({
          cart: {
            version: s.cart.version + 1,
            items: s.cart.items
              .map((l) =>
                l.lineId === lineId ? { ...l, quantity: Math.max(0, l.quantity - 1), version: l.version + 1 } : l,
              )
              .filter((l) => l.quantity > 0),
          },
        }));
      },

      removeItem: (lineId) => {
        set((s) => ({
          cart: {
            version: s.cart.version + 1,
            items: s.cart.items.filter((l) => l.lineId !== lineId),
          },
        }));
      },

      setNote: (lineId, note) => {
        set((s) => ({
          cart: {
            version: s.cart.version + 1,
            items: s.cart.items.map((l) => (l.lineId === lineId ? { ...l, note, version: l.version + 1 } : l)),
          },
        }));
      },

      bumpVersion: () => {
        set((s) => ({ cart: { ...s.cart, version: s.cart.version + 1 } }));
      },

      clearCart: () => {
        set({ cart: { items: [], version: get().cart.version + 1 } });
      },

      setOrder: (order) => set({ order }),

      advanceOrderStatus: (next) => {
        const ts = new Date().toISOString();
        set((s) => {
          if (!s.order) return {};
          const nextItemStatus =
            next === OrderStatus.PROCESSING
              ? OrderItemStatus.PROCESSING
              : next === OrderStatus.READY
                ? OrderItemStatus.READY
                : next === OrderStatus.SERVED
                  ? OrderItemStatus.SERVED
                  : OrderItemStatus.PROCESSING;
          let confirmedAt = s.order.confirmedAt;
          let confirmedByUserId = s.order.confirmedByUserId;
          if (next === OrderStatus.PROCESSING && !confirmedAt) {
            confirmedAt = ts;
            confirmedByUserId = 'waiter-mock';
          }
          return {
            order: {
              ...s.order,
              status: next,
              updatedAt: ts,
              confirmedAt,
              confirmedByUserId,
              items: s.order.items.map((it) => ({
                ...it,
                updatedAt: ts,
                status: next === OrderStatus.PENDING ? it.status : nextItemStatus,
              })),
            },
          };
        });
      },

      setBillLockActive: (v) => set({ billLockActive: v }),

      toggleBillLock: () => set((s) => ({ billLockActive: !s.billLockActive })),

      pushActivity: (entry) => {
        set((s) => ({ activityFeed: [entry, ...s.activityFeed].slice(0, 10) }));
      },

      patchMenuItem: (menuItemId, patch) => {
        set((s) => ({
          menu: s.menu.map((m) => (m.id === menuItemId ? { ...m, ...patch } : m)),
        }));
      },

      setServiceRequestOpen: (open) => set({ serviceRequestOpen: open }),
    }),
    { name: 'qrtable-mock-pwa' },
  ),
);

if (typeof window !== 'undefined') {
  (window as unknown as { __mock__?: { toggleBillLock: () => void } }).__mock__ = {
    toggleBillLock: () => usePwaMockStore.getState().toggleBillLock(),
  };
}
