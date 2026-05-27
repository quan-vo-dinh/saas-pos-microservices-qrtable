'use client';

import type { ReactNode } from 'react';
import { booleanEnabledVi } from '@einvoice/shared-constants';
import { PaymentConnectionStatusBadge } from '@/features/saas/components/badges';
import { maskAccountNumber } from '@/features/saas/formatters';
import type { PaymentSettings as Ps } from '@/features/saas/types';

export function PaymentSettingsSummary({ s }: { s: Ps }) {
  return (
    <div className="grid max-w-xl gap-3 rounded-md border p-4 text-sm">
      <Row label="Tiền mặt" value={booleanEnabledVi(s.cashEnabled)} />
      <Row label="VietQR" value={booleanEnabledVi(s.vietqrEnabled)} />
      <Row label="Kết nối SePay" value={<PaymentConnectionStatusBadge status={s.connectionStatus} />} />
      <Row label="Ngân hàng" value={s.bankShortName ?? s.bankName ?? '—'} />
      <Row label="Số TK (che)" value={maskAccountNumber(s.accountNumberMasked ?? undefined)} />
      <Row label="Chủ TK" value={s.accountHolder ?? '—'} />
      {s.connectionStatus === 'ERROR' && s.lastError ? (
        <div className="rounded-md bg-destructive/10 p-2 text-destructive text-xs">{s.lastError}</div>
      ) : null}
    </div>
  );
}

function Row({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex justify-between gap-4 border-b py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-end font-medium">{value}</span>
    </div>
  );
}
