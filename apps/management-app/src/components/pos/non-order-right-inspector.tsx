'use client';

import { usePathname, useSearchParams } from 'next/navigation';
import { BillStatus } from '@einvoice/types';
import { ROUTES } from '@/constants/routes';
import { usePosServiceRequestUiState } from '@/features/tables/hooks/use-pos-service-request-ui-state';
import { useBillsQuery } from '@/features/order/hooks/use-bill-query';
import { usePosTableUiState } from '@/features/tables/hooks/use-pos-table-ui-state';
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

export function NonOrderRightInspector() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const selectedTableId = usePosTableUiState((s) => s.selectedTableId);
  const selectedBillId = searchParams.get('billId');
  const selectedServiceRequestId = usePosServiceRequestUiState((s) => s.selectedServiceRequestId);
  const billsQuery = useBillsQuery({ status: BillStatus.PENDING_PAYMENT, limit: 100, offset: 0 });

  if (pathname.startsWith(ROUTES.POS_TABLES)) {
    if (!selectedTableId) {
      return <EmptyState message="Chọn một bàn từ lưới / bản đồ." />;
    }
    return <TableDetailPanel tableId={selectedTableId} />;
  }

  if (pathname.startsWith(ROUTES.POS_BILLS)) {
    if (billsQuery.isLoading) {
      return <EmptyState message="Đang tải hóa đơn PENDING." />;
    }
    if (billsQuery.isError) {
      return <EmptyState message="Không tải được hóa đơn PENDING." />;
    }
    if (!selectedBillId) {
      return <EmptyState message="Chọn hóa đơn PENDING ở danh sách bên trái." />;
    }
    const bill = (billsQuery.data ?? []).find((b) => b.id === selectedBillId);
    if (!bill) {
      return <EmptyState message="Hóa đơn đã được xử lý hoặc không còn trong danh sách PENDING." />;
    }
    return <CashBillPanel bill={bill} />;
  }

  if (pathname.startsWith(ROUTES.POS_SERVICE_REQUESTS)) {
    if (!selectedServiceRequestId) {
      return <EmptyState message="Chọn một dòng yêu cầu để xem chi tiết." />;
    }
    return <ServiceRequestDetailPanel requestId={selectedServiceRequestId} />;
  }

  return <EmptyState message="Chọn mục." />;
}
