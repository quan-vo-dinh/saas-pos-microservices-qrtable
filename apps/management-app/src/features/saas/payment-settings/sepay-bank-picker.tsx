'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { saasApi } from '@/features/saas/api';
import type { SepayBankAccountOption } from '@/features/saas/types';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';
import { maskAccountNumber } from '@/features/saas/formatters';

export function SepayBankPicker({
  banks,
  onDone,
}: {
  banks: SepayBankAccountOption[];
  onDone: () => void;
}) {
  const [selected, setSelected] = useState<string | null>(banks[0]?.uuid ?? null);
  const [busy, setBusy] = useState(false);

  const bank = banks.find((b) => b.uuid === selected);

  const submit = async () => {
    if (!bank) {
      return;
    }
    setBusy(true);
    try {
      await saasApi.selectSepayBank({
        bankAccountUuid: bank.uuid,
        accountNumber: bank.accountNumber,
        accountHolder: bank.accountHolder,
        bankName: bank.bankShortName,
        bankShortName: bank.bankShortName,
      });
      toast.success('Đã chọn tài khoản');
      onDone();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Chọn ngân hàng thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid max-w-lg gap-3">
      <p className="text-sm">Chọn tài khoản SePay để nhận thanh toán VietQR:</p>
      <div className="grid gap-2">
        {banks.map((b) => (
          <button
            key={b.uuid}
            type="button"
            onClick={() => setSelected(b.uuid)}
            className={`rounded-md border p-3 text-start text-sm transition-colors ${
              selected === b.uuid ? 'border-primary ring-1 ring-primary' : 'hover:bg-muted/60'
            }`}
          >
            <div className="font-medium">{b.bankShortName}</div>
            <div className="text-muted-foreground text-xs">{maskAccountNumber(b.accountNumber)}</div>
            <div className="text-xs">{b.accountHolder}</div>
          </button>
        ))}
      </div>
      <Button type="button" disabled={!bank || busy} onClick={() => void submit()}>
        {busy ? 'Đang lưu…' : 'Xác nhận'}
      </Button>
    </div>
  );
}
