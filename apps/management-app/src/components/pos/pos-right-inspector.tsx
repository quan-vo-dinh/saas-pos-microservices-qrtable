'use client';

import { usePathname } from 'next/navigation';
import { ROUTES } from '@/constants/routes';
import { useMockStore } from '@/mocks/store';
import { OrderDetailPanel } from '@/components/pos/order-detail-panel';
import { TableDetailPanel } from '@/components/pos/table-detail-panel';
import { CashBillPanel } from '@/components/pos/cash-bill-panel';
import { ServiceRequestDetailPanel } from '@/components/pos/service-request-detail-panel';

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
  const selectedRowId = useMockStore((s) => s.selectedRowId);
  const selectedTableId = useMockStore((s) => s.selectedTableId);
  const selectedBillId = useMockStore((s) => s.selectedBillId);
  const selectedServiceRequestId = useMockStore((s) => s.selectedServiceRequestId);

  if (pathname === ROUTES.POS || pathname === `${ROUTES.POS}/`) {
    if (!selectedRowId) {
      return <EmptyState message="Chọn một dòng Live Orders để xem chi tiết." />;
    }
    return <OrderDetailPanel orderId={selectedRowId} />;
  }

  if (pathname.startsWith(ROUTES.POS_TABLES)) {
    if (!selectedTableId) {
      return <EmptyState message="Chọn một bàn từ lưới / bản đồ." />;
    }
    return <TableDetailPanel tableId={selectedTableId} />;
  }

  if (pathname.startsWith(ROUTES.POS_BILLS)) {
    if (!selectedBillId) {
      return <EmptyState message="Chọn hóa đơn PENDING ở danh sách bên trái." />;
    }
    return <CashBillPanel billId={selectedBillId} />;
  }

  if (pathname.startsWith(ROUTES.POS_SERVICE_REQUESTS)) {
    if (!selectedServiceRequestId) {
      return <EmptyState message="Chọn một dòng yêu cầu để xem chi tiết và sparkline mật độ." />;
    }
    return <ServiceRequestDetailPanel requestId={selectedServiceRequestId} />;
  }

  return <EmptyState message="Chọn mục." />;
}
