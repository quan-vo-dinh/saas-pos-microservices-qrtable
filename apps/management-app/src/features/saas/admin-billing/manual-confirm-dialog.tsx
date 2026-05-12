'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@einvoice/frontend-ui';
import { formatVnd } from '@/features/saas/formatters';
import type { SubscriptionInvoice } from '@/features/saas/types';

type ManualConfirmDialogProps = {
  invoice: SubscriptionInvoice | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onConfirm: (note: string) => Promise<void>;
};

export function ManualConfirmDialog({ invoice, open, onOpenChange, onConfirm }: ManualConfirmDialogProps) {
  const [note, setNote] = useState('');
  const [checked, setChecked] = useState(false);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setNote('');
    setChecked(false);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          reset();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Xác nhận thủ công hóa đơn</DialogTitle>
        </DialogHeader>
        {invoice ? (
          <div className="grid gap-3 text-sm">
            <p>
              Mã: <span className="font-mono">{invoice.billingReference}</span>
            </p>
            <p>Tenant: {invoice.tenantId}</p>
            <p>Số tiền: {formatVnd(invoice.amountVnd)}</p>
            <p className="text-destructive text-xs">
              Thao tác này bỏ qua khớp tự động SePay. Chỉ dùng khi đã đối soát chuyển khoản thủ công.
            </p>
            <div className="grid gap-1.5">
              <Label>Ghi chú</Label>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            <label className="flex items-start gap-2 text-sm">
              <Checkbox checked={checked} onCheckedChange={(v) => setChecked(v === true)} className="mt-0.5" />
              Tôi đã đối soát giao dịch ngân hàng.
            </label>
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={!invoice || !checked || busy}
            onClick={async () => {
              if (!invoice) {
                return;
              }
              setBusy(true);
              try {
                await onConfirm(note.trim());
                onOpenChange(false);
                reset();
              } finally {
                setBusy(false);
              }
            }}
          >
            Xác nhận đã thanh toán
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
