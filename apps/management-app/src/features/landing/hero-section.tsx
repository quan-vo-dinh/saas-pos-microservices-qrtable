import Link from 'next/link';

export function HeroSection(): React.ReactElement {
  return (
    <section className="min-h-[calc(100vh-72px)] border-b border-border/80 bg-background">
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-10 px-4 py-12 lg:grid-cols-[1fr_0.95fr] lg:items-center lg:gap-12 lg:py-16">
        <div className="flex flex-col gap-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">SaaS POS · Đa tenant · Việt Nam</p>
          <h1 className="text-4xl font-bold tracking-tight text-foreground md:text-5xl">QRTable</h1>
          <p className="max-w-xl text-lg leading-relaxed text-muted-foreground">
            Nền tảng đặt món qua QR, vận hành bếp/KDS, gói đăng ký theo nhà hàng và kết nối thanh toán SePay (OAuth2) + VietQR cho
            cả tiền khách trả chủ quán và cước gói dịch vụ — thiết kế cho F&B Việt Nam.
          </p>
          <div className="flex flex-wrap gap-3">
            <a
              href="#pricing"
              className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow-sm transition hover:bg-primary/90"
            >
              Xem gói
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium transition hover:bg-muted"
            >
              Đăng nhập quản trị
            </Link>
          </div>
          <p className="text-sm text-muted-foreground">
            Tiếp theo: bảng giá công khai và luồng triển khai — không cần cuộn xa để hiểu sản phẩm.
          </p>
        </div>

        <div className="relative">
          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-sm ring-1 ring-border/60">
            <div className="flex items-center justify-between border-b border-border bg-muted/40 px-3 py-2 text-xs font-medium text-muted-foreground">
              <span>Dashboard · Demo</span>
              <span className="rounded bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-emerald-700">
                Live
              </span>
            </div>
            <div className="grid grid-cols-[88px_1fr] gap-0 text-[11px] leading-tight md:text-xs">
              <aside className="border-r border-border bg-muted/25 p-2 text-muted-foreground">
                <div className="mb-2 rounded bg-background px-2 py-1 font-medium text-foreground">Tổng quan</div>
                <div className="px-2 py-1">Đơn hàng</div>
                <div className="px-2 py-1">Menu</div>
                <div className="mt-2 rounded bg-primary/10 px-2 py-1 font-medium text-primary">Gói cước</div>
                <div className="px-2 py-1">Thanh toán</div>
              </aside>
              <div className="space-y-2 p-3">
                <div className="rounded-md border border-border bg-background p-2">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">Subscription</p>
                  <p className="mt-1 font-semibold text-foreground">Basic · Hoạt động</p>
                  <p className="text-muted-foreground">Gia hạn qua VietQR (QRSUB…)</p>
                </div>
                <div className="rounded-md border border-border bg-background p-2">
                  <p className="text-[10px] font-semibold uppercase text-muted-foreground">SePay Connect</p>
                  <p className="mt-1 font-semibold text-emerald-700">Đã kết nối</p>
                  <p className="text-muted-foreground">OAuth2 · Webhook Tier 1</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-md border border-dashed border-border p-2 text-center text-muted-foreground">
                    QR đặt món
                  </div>
                  <div className="rounded-md border border-dashed border-border p-2 text-center text-muted-foreground">
                    VietQR bill
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
