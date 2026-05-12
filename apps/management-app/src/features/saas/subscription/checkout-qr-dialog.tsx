'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatVnd } from '@/features/saas/formatters';
import type { SubscriptionInvoice } from '@/features/saas/types';
import { InvoiceStatusPoller } from './invoice-status-poller';

type CheckoutQrDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  invoice: SubscriptionInvoice | null;
  onPaid: () => void;
};

export function CheckoutQrDialog({ open, onOpenChange, invoice, onPaid }: CheckoutQrDialogProps) {
  const [terminal, setTerminal] = useState<string | null>(null);
  const polling = Boolean(invoice?.id) && invoice?.status === 'PENDING' && open;

  const expiresMs = invoice?.qrExpiresAt ? new Date(invoice.qrExpiresAt).getTime() : null;

  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!open || expiresMs == null) {
      return;
    }
    const tick = () => setRemaining(Math.max(0, Math.floor((expiresMs - Date.now()) / 1000)));
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [open, expiresMs]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        onOpenChange(v);
        if (!v) {
          setTerminal(null);
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Thanh toán subscription</DialogTitle>
        </DialogHeader>
        {invoice ? (
          <div className="grid gap-3 text-sm">
            <p>
              Mã: <span className="font-mono">{invoice.billingReference}</span>
            </p>
            <p>Số tiền: {formatVnd(invoice.amountVnd)}</p>
            {remaining != null ? <p className="text-muted-foreground">Hết hạn sau: {remaining}s</p> : null}
            {invoice.qrUrl ? (
              <div className="flex justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={invoice.qrUrl} alt="VietQR" width={220} height={220} className="rounded-md border" />
              </div>
            ) : (
              <p className="text-muted-foreground text-center text-xs">Không có QR (kiểm tra cấu hình SePay).</p>
            )}
            {terminal ? <p className="text-destructive text-xs">Trạng thái: {terminal}</p> : null}
          </div>
        ) : null}
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
        {invoice?.id ? (
          <InvoiceStatusPoller
            invoiceId={invoice.id}
            enabled={polling}
            onPaid={() => {
              onPaid();
              onOpenChange(false);
            }}
            onTerminal={(s) => setTerminal(s)}
          />
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
