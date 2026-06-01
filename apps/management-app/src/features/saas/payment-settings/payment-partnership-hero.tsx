'use client';

import Image from 'next/image';
import { QrCode } from 'lucide-react';

const SEPAY_LOGO = '/brands/logo-sepay-color-in-white.svg';

export function PaymentPartnershipHero() {
  return (
    <header className="flex w-full flex-col gap-4 border-b pb-6">
      <div className="flex flex-wrap items-center gap-4 overflow-visible">
        <div className="flex items-center gap-3">
          <span className="flex size-14 items-center justify-center rounded-xl border bg-muted/50">
            <QrCode className="size-8 text-foreground" aria-hidden />
          </span>
          <span className="text-2xl font-semibold tracking-tight sm:text-3xl">QRTable</span>
        </div>

        <span className="text-muted-foreground text-2xl font-light" aria-hidden>
          ×
        </span>

        <div className="flex shrink-0 items-center overflow-visible py-0.5">
          <Image
            src={SEPAY_LOGO}
            alt="SePay"
            width={280}
            height={60}
            unoptimized
            className="h-7 w-auto max-w-none overflow-visible sm:h-8 md:h-9"
            priority
          />
        </div>
      </div>

      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Cài đặt thanh toán VietQR</h1>
        <p className="text-muted-foreground mt-2 max-w-lg text-sm leading-relaxed">
          Kết nối tài khoản SePay qua OAuth — tiền khách về ngân hàng quán, thông tin nhạy cảm chỉ lưu trên máy chủ.
        </p>
      </div>
    </header>
  );
}
