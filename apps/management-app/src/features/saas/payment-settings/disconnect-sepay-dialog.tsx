'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saasApi } from '@/features/saas/api';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';

const PHRASE = 'NGAT KET NOI';

export function DisconnectSepayDialog({ onDisconnected }: { onDisconnected: () => void }) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setBusy(true);
    try {
      await saasApi.disconnectSepay();
      toast.success('Đã ngắt kết nối SePay');
      setOpen(false);
      setTyped('');
      onDisconnected();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Ngắt kết nối thất bại');
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button type="button" variant="destructive" onClick={() => setOpen(true)}>
        Ngắt kết nối SePay
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ngắt kết nối SePay</DialogTitle>
          </DialogHeader>
          <p className="text-muted-foreground text-sm">
            Nhập chính xác <span className="text-foreground font-mono">{PHRASE}</span> để xác nhận.
          </p>
          <div className="grid gap-1.5">
            <Label htmlFor="disc-phrase">Xác nhận</Label>
            <Input id="disc-phrase" value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="button" variant="destructive" disabled={typed.trim() !== PHRASE || busy} onClick={() => void submit()}>
              Xác nhận ngắt
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
