'use client';

import { useMemo } from 'react';
import { formatVnd } from '@/lib/format-vnd';
import { usePaymentHistoryQuery } from '@/features/payment/hooks/use-payment';
import type { StaffPaymentRecord } from '@/features/payment/services/payment.service';

const STATUS_LABEL: Record<string, string> = {
  PENDING: 'Chờ thanh toán',
  PAID: 'Đã thanh toán',
  FAILED: 'Thất bại',
};

export function PaymentHistorySection() {
  const historyQuery = usePaymentHistoryQuery(undefined);
  const rows = useMemo(
    () => [...(historyQuery.data ?? [])].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 50),
    [historyQuery.data],
  );

  return (
    <div className="flex flex-col gap-4" data-slot="payment-history-section">
      <div>
        <h2 className="text-lg font-semibold">Lịch sử thanh toán</h2>
        <p className="text-sm text-muted-foreground">
          Danh sách giao dịch thanh toán gần đây của tenant (cash và VietQR). Chỉ xem — không chỉnh sửa tại đây.
        </p>
      </div>
      {historyQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải...</p> : null}
      {historyQuery.isError ? <p className="text-sm text-destructive">Không tải được lịch sử thanh toán.</p> : null}
      {!historyQuery.isLoading && rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">Chưa có giao dịch thanh toán.</p>
      ) : null}
      <ul className="flex flex-col gap-2">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border/80 px-3 py-2"
          >
            <PaymentHistoryRow payment={row} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PaymentHistoryRow({ payment }: { payment: StaffPaymentRecord }) {
  const paidLabel = payment.paidAt ? new Date(payment.paidAt).toLocaleString('vi-VN') : '—';
  const methodLabel = payment.method ?? '—';
  const statusLabel = STATUS_LABEL[payment.status] ?? payment.status;

  return (
    <>
      <div className="min-w-0 flex-1">
        <p className="truncate font-mono text-xs">{payment.id}</p>
        <p className="text-xs text-muted-foreground">
          Bill: {payment.billReference || payment.billId} · {methodLabel} · {statusLabel}
        </p>
        <p className="text-xs text-muted-foreground">Thanh toán: {paidLabel}</p>
      </div>
      <p className="font-mono text-sm tabular-nums">{formatVnd(payment.paidAmount ?? payment.roundedTotal)}</p>
    </>
  );
}
