'use client';

import { useState } from 'react';
import { MacbookScroll } from '@/components/ui/macbook-scroll';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { QrCode } from 'lucide-react';
import styles from './landing.module.css';

const DASHBOARD_SCREENSHOT = '/landing-dashboard-pos-live-orders.png';

export function DashboardMacbookSection(): React.ReactElement {
  const [previewOpen, setPreviewOpen] = useState(false);

  return (
    <section
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-950`}
      aria-labelledby="qrt-dashboard-macbook-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridFine} opacity-[0.22]`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialCyan}`} aria-hidden />
      <p id="qrt-dashboard-macbook-heading" className="sr-only">
        Bản xem trước màn hình quản lý đơn và bàn trên QRTable — có thể mở ảnh phóng to
      </p>
      <div className="relative z-10 w-full overflow-hidden bg-zinc-950">
        <MacbookScroll
          title={
            <span className="font-sans">
              Màn hình nhân viên: đơn trực tiếp &amp; chi tiết từng bàn
              <br />
              <span className="text-xl font-normal text-neutral-500 dark:text-zinc-400">
                Cuộn để “mở” laptop — xem cách xác nhận món, theo dõi bếp và chốt thanh toán trong một chỗ. Chạm vào màn hình
                để xem ảnh lớn.
              </span>
            </span>
          }
          badge={
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-500/35 bg-zinc-950/95 text-cyan-400 shadow-[0_8px_30px_-8px_rgba(0,0,0,0.85)]"
              aria-hidden
            >
              <QrCode className="size-5" />
            </div>
          }
          src={DASHBOARD_SCREENSHOT}
          imageAlt="QRTable — màn hình quản lý đơn và bàn (minh họa)"
          onScreenImageClick={() => setPreviewOpen(true)}
          screenImageClickLabel="Mở xem ảnh dashboard POS toàn màn hình"
          showGradient={false}
        />
      </div>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent
          showCloseButton
          className="max-h-[min(92vh,900px)] max-w-[min(96vw,1200px)] gap-3 border-zinc-800 bg-zinc-950 p-3 sm:p-4 sm:max-w-[min(96vw,1200px)]"
        >
          <DialogTitle className="sr-only">Ảnh màn hình quản lý đơn và bàn QRTable</DialogTitle>
          <DialogDescription className="sr-only">
            Đóng bằng nút đóng hoặc phím Escape để quay lại trang.
          </DialogDescription>
          <img
            src={DASHBOARD_SCREENSHOT}
            alt="QRTable — màn hình quản lý đơn và bàn (xem phóng to)"
            className="mx-auto max-h-[min(85vh,820px)] w-auto max-w-full rounded-md object-contain"
          />
          <p className="text-center font-mono text-[11px] text-zinc-500">Đóng bằng nút X hoặc phím Escape.</p>
        </DialogContent>
      </Dialog>
    </section>
  );
}
