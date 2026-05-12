import Link from 'next/link';
import { ChefHat, QrCode, Receipt, ShieldCheck } from 'lucide-react';

export function HeroSection({ productName }: { productName: string }): React.ReactElement {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden border-b border-border/80 bg-gradient-to-b from-muted/40 via-background to-background"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-primary/25 to-transparent" />
      <div className="mx-auto grid max-w-6xl gap-12 px-4 py-16 sm:px-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-14 lg:py-20">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            POS · QR đặt món · Đa tenant · Việt Nam
          </p>
          <h1 id="hero-heading" className="text-4xl font-bold tracking-tight text-foreground md:text-5xl lg:text-[3.25rem] lg:leading-[1.1]">
            Vận hành nhà hàng theo bàn — từ QR tới bếp và thanh toán
          </h1>
          <p className="max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
            <span className="font-semibold text-foreground">{productName}</span> là nền tảng SaaS cho F&amp;B: khách quét QR
            theo bàn, thực đơn điện tử đồng bộ realtime, nhân viên quản lý bàn — đơn trên POS và luồng bếp; thanh toán
            VietQR kết hợp SePay (OAuth) với tách luồng tiền bill khách và cước gói dịch vụ.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#pricing"
              className="inline-flex h-12 min-h-[44px] items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm hover:bg-primary/90"
            >
              Xem bảng giá
            </a>
            <Link
              href="/login"
              className="inline-flex h-12 min-h-[44px] items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
            >
              Đăng nhập quản trị
            </Link>
          </div>
          <ul className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
            <li className="flex items-center gap-2">
              <ShieldCheck className="size-4 shrink-0 text-primary" aria-hidden />
              Token QR theo bàn
            </li>
            <li className="flex items-center gap-2">
              <QrCode className="size-4 shrink-0 text-primary" aria-hidden />
              Phiên khách rõ ràng
            </li>
            <li className="flex items-center gap-2">
              <ChefHat className="size-4 shrink-0 text-primary" aria-hidden />
              Đồng bộ bếp / KDS
            </li>
          </ul>
        </div>

        <div className="relative" aria-label="Minh họa luồng vận hành">
          <div className="rounded-2xl border border-border bg-card p-1 shadow-lg ring-1 ring-border/60">
            <div className="rounded-xl bg-muted/30 p-4 md:p-5">
              <div className="flex items-center justify-between gap-2 border-b border-border/80 pb-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Luồng trong một ca</p>
                <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[11px] font-semibold uppercase text-emerald-800 dark:text-emerald-300">
                  Realtime
                </span>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <QrCode className="size-4" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-wide">Khách</p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">Quét QR bàn</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Mở phiên, xem menu, đặt món. Giá = đơn giá × số lượng (theo rule nghiệp vụ).
                  </p>
                </div>
                <div className="rounded-lg border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-primary">
                    <Receipt className="size-4" aria-hidden />
                    <p className="text-xs font-semibold uppercase tracking-wide">POS</p>
                  </div>
                  <p className="mt-2 text-sm font-medium text-foreground">Bill &amp; chuyển bàn</p>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
                    Gom đơn theo bàn, chuyển bàn có kiểm tra trạng thái; khóa đặt khi chờ thanh toán theo cấu hình.
                  </p>
                </div>
                <div className="rounded-lg border border-dashed border-primary/35 bg-primary/5 p-4 sm:col-span-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">Thanh toán</p>
                    <p className="text-[11px] font-medium text-muted-foreground">VietQR · SePay Connect</p>
                  </div>
                  <p className="mt-2 text-sm text-foreground">
                    Tier 1: bill khách → tài khoản nhà hàng. Tier 2: gói dịch vụ → tài khoản nền tảng.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
