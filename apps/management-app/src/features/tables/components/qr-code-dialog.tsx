'use client';

import { useCallback, useRef } from 'react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Separator,
} from '@einvoice/frontend-ui';
import { Copy, Download, Printer } from 'lucide-react';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { toast } from 'sonner';
import { useTables } from './tables-provider';
import { API_CONFIG } from '@/constants/api';
import { buildCustomerQrUrl } from '../lib/qr-url';
import { useCurrentTenantQuery } from '@/features/tenant/hooks/use-current-tenant-query';
import { useRegenerateQrMutation } from '../hooks/use-tables-mutations';

export function QrCodeDialog() {
  const { open, setOpen, currentTable } = useTables();
  const isOpen = open === 'view-qr';
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const tenantQuery = useCurrentTenantQuery();
  const regenerateMutation = useRegenerateQrMutation();

  const tenantSlug = tenantQuery.data?.slug;
  const baseUrl = API_CONFIG.CUSTOMER_PWA_ORIGIN;

  const qrUrl =
    currentTable && tenantSlug && currentTable.qrToken && currentTable.qrToken !== 'temp'
      ? buildCustomerQrUrl({
          baseUrl,
          tenantSlug,
          tableId: currentTable.id,
          qrToken: currentTable.qrToken,
        })
      : '';

  const canShowQr = Boolean(qrUrl);
  const busy = regenerateMutation.isPending || tenantQuery.isPending;

  const copyUrl = () => {
    if (!qrUrl) return;
    void navigator.clipboard?.writeText(qrUrl).then(
      () => toast.success('Đã copy URL'),
      () => toast.error('Không thể copy'),
    );
  };

  const openPwa = () => {
    if (!qrUrl) return;
    window.open(qrUrl, '_blank', 'noopener,noreferrer');
  };

  const downloadPng = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const pngUrl = canvas.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = pngUrl;
    a.download = `qr-${currentTable?.name ?? 'table'}.png`;
    a.click();
  }, [currentTable?.name]);

  const handleRegenerate = () => {
    if (!currentTable) return;
    regenerateMutation.mutate(currentTable.id);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(v) => !v && setOpen(null)}>
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Mã QR — {currentTable?.name}</DialogTitle>
          <DialogDescription>
            Quét mã QR để khách vào thực đơn đặt món tại bàn này.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-4 py-4">
          {tenantQuery.isPending ? (
            <p className="text-muted-foreground text-sm">Đang tải thông tin nhà hàng…</p>
          ) : tenantQuery.isError ? (
            <p className="text-destructive text-center text-sm">
              Không tải được mã định danh nhà hàng. Kiểm tra quyền truy cập hoặc cấu hình BFF.
            </p>
          ) : !canShowQr ? (
            <p className="text-muted-foreground text-center text-sm">
              Thiếu mã QR hoặc mã chưa được tạo. Thử tạo lại mã QR.
            </p>
          ) : (
            <>
              <div className="print:flex print:justify-center" id="qrtable-print-qr">
                <QRCodeSVG value={qrUrl} size={192} level="M" includeMargin />
              </div>
              <QRCodeCanvas
                className="hidden"
                ref={canvasRef}
                value={qrUrl}
                size={512}
                level="M"
                includeMargin
              />

              <div className="w-full space-y-2">
                <p className="text-muted-foreground text-xs font-medium">Liên kết bàn</p>
                <div className="flex items-center gap-2">
                  <code className="bg-muted flex-1 rounded-md px-3 py-2 font-mono text-xs break-all">
                    {qrUrl}
                  </code>
                  <Button
                    variant="outline"
                    size="icon"
                    className="size-8 shrink-0"
                    disabled={busy}
                    onClick={() => void copyUrl()}
                  >
                    <Copy className="size-3.5" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </div>

        <Separator />

        <DialogFooter className="gap-5">
          <Button variant="outline" type="button" disabled={!canShowQr || busy} onClick={() => openPwa()}>
            Mở PWA
          </Button>
          <Button variant="outline" type="button" disabled={busy || !canShowQr} onClick={() => downloadPng()}>
            <Download className="mr-2 size-4" />
            Tải ảnh
          </Button>
          <Button
            type="button"
            disabled={!currentTable || busy}
            onClick={() => handleRegenerate()}
          >
            Tạo lại mã QR
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
