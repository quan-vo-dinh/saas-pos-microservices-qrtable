'use client';

import { Copy, Download, Printer, QrCode } from 'lucide-react';
import {
  Button,
  Separator,
} from '@einvoice/frontend-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@einvoice/frontend-ui';
import { useTables } from './tables-provider';

export function QrCodeDialog() {
  const { open, setOpen, currentTable } = useTables();
  const isOpen = open === 'view-qr';

  const qrUrl = currentTable
    ? `https://demo.qrtable.io?table=${currentTable.id}&token=${currentTable.qrToken}`
    : '';

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>QR Code — {currentTable?.name}</DialogTitle>
          <DialogDescription>
            Scan this QR code to access the ordering menu for this table.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {/* Mock QR Code Placeholder */}
          <div className="flex size-48 items-center justify-center rounded-xl border-2 border-dashed bg-muted/50">
            <QrCode className="size-24 text-muted-foreground/50" />
          </div>

          <div className="w-full space-y-2">
            <p className="text-xs font-medium text-muted-foreground">
              Table URL
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 rounded-md bg-muted px-3 py-2 text-xs break-all">
                {qrUrl}
              </code>
              <Button
                variant="outline"
                size="icon"
                className="shrink-0 size-8"
                onClick={() => navigator.clipboard?.writeText(qrUrl)}
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => setOpen(null)}>
            Close
          </Button>
          <Button variant="outline" onClick={() => window.print()}>
            <Printer className="mr-2 size-4" />
            Print
          </Button>
          <Button onClick={() => console.log('Download QR')}>
            <Download className="mr-2 size-4" />
            Download
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
