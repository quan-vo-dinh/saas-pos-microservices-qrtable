import { useEffect, useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import type { MenuItem, OrderStatusChangedEvent } from '@einvoice/types';
import { OrderStatus } from '@einvoice/types';
import { playTap } from './audio';
import { usePwaMockStore } from './store';

/**
 * TODO(Step 2.5): align with BFF Direct WebSocket — not present in `realtime-events.types.ts` today.
 * Kept local-only for mock stock pushes.
 */
export type MenuItemStockChangedEvent = {
  menuItemId: string;
  status: MenuItem['status'];
  timestamp: string;
};

const STATUS_FLOW: Array<Exclude<(typeof OrderStatus)[keyof typeof OrderStatus], 'DRAFT' | 'COMPLETED' | 'CANCELED'>> =
  [OrderStatus.PENDING, OrderStatus.PROCESSING, OrderStatus.READY, OrderStatus.SERVED];

function nextOrderStatus(current: (typeof OrderStatus)[keyof typeof OrderStatus]) {
  const idx = STATUS_FLOW.indexOf(current as (typeof STATUS_FLOW)[number]);
  if (idx === -1 || idx >= STATUS_FLOW.length - 1) return null;
  return STATUS_FLOW[idx + 1];
}

export function usePwaFakeRealtime() {
  const [lastSharedEvent, setLastSharedEvent] = useState<OrderStatusChangedEvent | null>(null);
  const [lastLocalEvent, setLastLocalEvent] = useState<MenuItemStockChangedEvent | null>(null);
  const pausedRef = useRef(false);
  const [epoch, setEpoch] = useState(0);

  const pause = () => {
    pausedRef.current = true;
    setEpoch((e) => e + 1);
  };

  const resume = () => {
    pausedRef.current = false;
    setEpoch((e) => e + 1);
  };

  useEffect(() => {
    if (pausedRef.current) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const isCancelled = () => cancelled || pausedRef.current;

    const schedule = (msMin: number, msMax: number, fn: () => void) => {
      const id = window.setTimeout(
        () => {
          if (!isCancelled()) fn();
        },
        faker.number.int({ min: msMin, max: msMax }),
      );
      timeouts.push(id);
    };

    const loopOrder = () => {
      if (isCancelled()) return;
      const { order } = usePwaMockStore.getState();
      if (order && order.status !== OrderStatus.SERVED) {
        const next = nextOrderStatus(order.status);
        if (next) {
          const ev: OrderStatusChangedEvent = {
            tenantId: 't-phogomau',
            orderId: order.id,
            fromStatus: order.status,
            toStatus: next,
            timestamp: new Date().toISOString(),
          };
          const _check: OrderStatusChangedEvent = ev;
          void _check;
          setLastSharedEvent(ev);
          usePwaMockStore.getState().advanceOrderStatus(next);
          playTap();
        }
      }
      schedule(15_000, 30_000, loopOrder);
    };

    const loopStock = () => {
      if (isCancelled()) return;
      const { menu } = usePwaMockStore.getState();
      const candidates = menu.filter((m) => m.status === 'available' || m.status === 'out_of_stock');
      const pick = faker.helpers.arrayElement(candidates);
      const nextStatus: MenuItem['status'] = pick.status === 'available' ? 'out_of_stock' : 'available';
      const ev: MenuItemStockChangedEvent = {
        menuItemId: pick.id,
        status: nextStatus,
        timestamp: new Date().toISOString(),
      };
      setLastLocalEvent(ev);
      usePwaMockStore.getState().patchMenuItem(pick.id, {
        status: nextStatus,
        stock: nextStatus === 'out_of_stock' ? 0 : faker.number.int({ min: 5, max: 20 }),
      });
      schedule(30_000, 60_000, loopStock);
    };

    const loopPresence = () => {
      if (isCancelled()) return;
      usePwaMockStore.getState().pushActivity({
        who: faker.helpers.arrayElement(['Khách 1', 'Khách 2', 'Khách 3']),
        action: faker.helpers.arrayElement(['đang xem menu', 'đang chỉnh giỏ', 'đang gõ ghi chú']),
        itemName: faker.helpers.arrayElement(['Phở bò tái', 'Trà đào', 'Cơm tấm']),
        qty: 1,
        at: Date.now(),
      });
      schedule(45_000, 45_000, loopPresence);
    };

    schedule(15_000, 30_000, loopOrder);
    schedule(30_000, 60_000, loopStock);
    schedule(45_000, 45_000, loopPresence);

    return () => {
      cancelled = true;
      for (const t of timeouts) window.clearTimeout(t);
    };
  }, [epoch]);

  return { lastSharedEvent, lastLocalEvent, pause, resume };
}
