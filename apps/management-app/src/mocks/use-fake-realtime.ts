'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { faker } from '@faker-js/faker';
import type {
  Order,
  OrderCreatedEvent,
  OrderItem,
  OrderStatusChangedEvent,
  ServiceRequestedEvent,
} from '@einvoice/types';
import { OrderItemStatus, OrderStatus, ServiceRequestStatus, ServiceRequestType } from '@einvoice/types';
import { playBell, playTap } from './audio';
import { mockTenantId } from './seed';
import { useMockStore } from './store';

function randomBetween(min: number, max: number) {
  return faker.number.int({ min, max });
}

function buildSyntheticOrder(): Order {
  const ts = Date.now();
  const tableNum = randomBetween(1, 24);
  const tableId = `tbl-${String(tableNum).padStart(2, '0')}`;
  const orderId = `ord-${faker.string.alphanumeric(8).toLowerCase()}`;
  const item: OrderItem = {
    id: `oi-${orderId}-1`,
    orderId,
    menuItemId: 'mi-mock',
    menuItemName: 'Món mock realtime',
    quantity: 1,
    unitPrice: 55_000,
    status: OrderItemStatus.PROCESSING,
    createdAt: new Date(ts).toISOString(),
    updatedAt: new Date(ts).toISOString(),
  };
  return {
    id: orderId,
    tenantId: mockTenantId,
    tableId,
    tableName: `Bàn ${tableNum} — Tầng trệt`,
    sessionId: `sess-${tableId}`,
    items: [item],
    status: OrderStatus.PENDING,
    totalAmount: item.unitPrice * item.quantity,
    idempotencyKey: faker.string.uuid(),
    createdAt: new Date(ts).toISOString(),
    updatedAt: new Date(ts).toISOString(),
  };
}

export function useFakeRealtime() {
  const [lastEvent, setLastEvent] = useState<
    OrderCreatedEvent | OrderStatusChangedEvent | ServiceRequestedEvent | null
  >(null);
  const pausedRef = useRef(false);
  const [epoch, setEpoch] = useState(0);

  const pause = useCallback(() => {
    pausedRef.current = true;
    setEpoch((e) => e + 1);
  }, []);

  const resume = useCallback(() => {
    pausedRef.current = false;
    setEpoch((e) => e + 1);
  }, []);

  useEffect(() => {
    if (pausedRef.current) return;

    let cancelled = false;
    const timeouts: number[] = [];
    const isCancelled = () => cancelled || pausedRef.current;

    const pushTimer = (id: number) => {
      timeouts.push(id);
    };

    const scheduleNext = (msMin: number, msMax: number, run: () => void) => {
      const delay = randomBetween(msMin, msMax);
      const id = window.setTimeout(() => {
        if (!isCancelled()) {
          run();
        }
      }, delay);
      pushTimer(id);
    };

    const loopOrders = () => {
      if (isCancelled()) return;
      const order = buildSyntheticOrder();
      const ev: OrderCreatedEvent = {
        tenantId: mockTenantId,
        orderId: order.id,
        tableId: order.tableId,
        tableName: order.tableName,
        sessionId: order.sessionId,
        items: order.items,
        totalAmount: order.totalAmount,
        timestamp: new Date().toISOString(),
      };
      const _typecheck: OrderCreatedEvent = ev;
      void _typecheck;
      setLastEvent(ev);
      useMockStore.getState().appendLiveOrder(order);
      useMockStore.getState().pushNotification('order', `Đơn mới #${order.id.slice(-4)}`);
      playBell();
      scheduleNext(25_000, 40_000, loopOrders);
    };

    const loopService = () => {
      if (isCancelled()) return;
      const reqId = `sr-${faker.string.alphanumeric(8).toLowerCase()}`;
      const tableNum = randomBetween(1, 24);
      const tableId = `tbl-${String(tableNum).padStart(2, '0')}`;
      const ev: ServiceRequestedEvent = {
        tenantId: mockTenantId,
        requestId: reqId,
        tableId,
        tableName: `Bàn ${tableNum} — Tầng trệt`,
        sessionId: `sess-${tableId}`,
        type: faker.helpers.arrayElement([
          ServiceRequestType.CALL_STAFF,
          ServiceRequestType.REQUEST_BILL,
          ServiceRequestType.GENERAL_HELP,
        ]),
        note: faker.helpers.maybe(() => 'Khách cần hỗ trợ', { probability: 0.4 }),
        timestamp: new Date().toISOString(),
      };
      const _typecheck: ServiceRequestedEvent = ev;
      void _typecheck;
      setLastEvent(ev);
      useMockStore.getState().appendServiceRequest({
        id: reqId,
        tenantId: mockTenantId,
        tableId,
        sessionId: ev.sessionId,
        type: ev.type,
        status: ServiceRequestStatus.PENDING,
        note: ev.note,
        createdAt: ev.timestamp,
        updatedAt: ev.timestamp,
      });
      useMockStore.getState().pushNotification('service', 'Yêu cầu phục vụ mới');
      scheduleNext(50_000, 90_000, loopService);
    };

    const tickProcessing = () => {
      if (isCancelled()) return;
      const store = useMockStore.getState();
      const processing = store.liveOrders.filter((o) => o.status === OrderStatus.PROCESSING);
      for (const o of processing) {
        if (Math.random() < 0.25) {
          const ev: OrderStatusChangedEvent = {
            tenantId: mockTenantId,
            orderId: o.id,
            fromStatus: OrderStatus.PROCESSING,
            toStatus: OrderStatus.READY,
            changedByUserId: 'staff-chef-1',
            timestamp: new Date().toISOString(),
          };
          const _typecheck: OrderStatusChangedEvent = ev;
          void _typecheck;
          setLastEvent(ev);
          store.updateOrderStatus(o.id, OrderStatus.READY, 'staff-chef-1');
          playTap();
        }
      }
    };

    scheduleNext(25_000, 40_000, loopOrders);
    scheduleNext(50_000, 90_000, loopService);
    const intervalId = window.setInterval(tickProcessing, 10_000);

    return () => {
      cancelled = true;
      for (const id of timeouts) {
        window.clearTimeout(id);
      }
      window.clearInterval(intervalId);
    };
  }, [epoch]);

  return { lastEvent, pause, resume };
}
