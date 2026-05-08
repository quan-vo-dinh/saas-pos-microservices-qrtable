'use client';

import { BillSettlementPanel } from '@/features/payment/components/bill-settlement-panel';

export function CashBillPanel({ billId }: { billId: string }) {
  return <BillSettlementPanel billId={billId} />;
}
