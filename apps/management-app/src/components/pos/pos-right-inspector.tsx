'use client';

import { Suspense } from 'react';
import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { useOrderUiState } from '@/features/order/hooks/use-order-ui-state';
import { OrderDetailPanel } from '@/components/pos/order-detail-panel';
import { NonOrderRightInspector } from '@/components/pos/non-order-right-inspector';

function EmptyState({ message }: { message: string }) {
  return (
    <div
      className="flex h-full min-h-48 items-center justify-center rounded-lg border border-dashed border-border/60 p-4 text-center text-sm text-muted-foreground"
      data-slot="pos-right-empty"
    >
      {message}
    </div>
  );
}

export function PosRightInspector() {
  const pathname = usePathname();
  const selectedRowId = useOrderUiState((s) => s.selectedOrderId);

  if (pathname === ROUTES.POS || pathname === `${ROUTES.POS}/`) {
    if (!selectedRowId) {
      return <EmptyState message="Chọn một dòng Live Orders để xem chi tiết." />;
    }
    return <OrderDetailPanel orderId={selectedRowId} />;
  }

  return (
    <Suspense fallback={<EmptyState message="Đang tải chi tiết." />}>
      <NonOrderRightInspector />
    </Suspense>
  );
}
