'use client';

import { useMemo } from 'react';
import { OrderStatus, ServiceRequestStatus } from '@einvoice/types';
import { useOrdersQuery } from '@/features/order/hooks/use-order-query';
import { useServiceRequestsQuery } from '@/features/service-requests/hooks/use-service-request-query';
import { useTablesQuery } from '@/features/tables/hooks/use-tables-query';

export type PosNotificationItem = {
  id: string;
  kind: 'order' | 'service';
  createdAt: number;
  preview: string;
};

export function usePosNotifications(): PosNotificationItem[] {
  const ordersQuery = useOrdersQuery();
  const tablesQuery = useTablesQuery();
  const serviceQuery = useServiceRequestsQuery({
    status: ServiceRequestStatus.PENDING,
    limit: 30,
    offset: 0,
  });

  return useMemo(() => {
    const tableName = (tableId: string) =>
      tablesQuery.data?.find((t) => t.id === tableId)?.name ?? `Bàn ${tableId.slice(-4)}`;
    const items: PosNotificationItem[] = [];

    for (const order of ordersQuery.data ?? []) {
      if (order.status !== OrderStatus.PENDING && order.status !== OrderStatus.PROCESSING) {
        continue;
      }
      const label =
        order.status === OrderStatus.PENDING
          ? `Đơn #${order.id.slice(-6)} · chờ xác nhận`
          : `Đơn #${order.id.slice(-6)} · đang chế biến`;
      items.push({
        id: `order-${order.id}`,
        kind: 'order',
        createdAt: new Date(order.createdAt).getTime(),
        preview: label,
      });
    }

    for (const request of serviceQuery.data ?? []) {
      items.push({
        id: `service-${request.id}`,
        kind: 'service',
        createdAt: new Date(request.createdAt).getTime(),
        preview: `Yêu cầu phục vụ · ${tableName(request.tableId)}`,
      });
    }

    return items.sort((a, b) => b.createdAt - a.createdAt).slice(0, 40);
  }, [ordersQuery.data, serviceQuery.data, tablesQuery.data]);
}
