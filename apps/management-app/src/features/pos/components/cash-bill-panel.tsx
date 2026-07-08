'use client';

import type { Bill } from '@einvoice/types';
import { BillSettlementPanel } from '@/features/payment/components/bill-settlement-panel';

export function CashBillPanel({ bill }: { bill: Bill }) {
  return <BillSettlementPanel bill={bill} />;
}
