import Link from 'next/link';

const nav = [
  { href: '#tong-quan', label: 'Tổng quan' },
  { href: '#ban-va-qr', label: 'Bàn & QR' },
  { href: '#so-sanh', label: 'So sánh' },
  { href: '#pricing', label: 'Bảng giá' },
  { href: '#thanh-toan', label: 'Thanh toán' },
  { href: '#contact', label: 'Liên hệ' },
] as const;

export function LandingHeader({ productName }: { productName: string }): React.ReactElement {
  return (
    <header
      role="banner"
      className="sticky top-0 z-50 border-b border-border/80 bg-background/95 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/80"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-14 min-h-[3.5rem] items-center justify-between gap-4 sm:h-[4.25rem]">
          <Link
            href="/"
            className="text-base font-semibold tracking-tight text-foreground sm:text-lg"
            aria-label={`${productName} — về đầu trang`}
          >
            {productName}
          </Link>
          <nav aria-label="Điều hướng chính" className="hidden items-center gap-1 md:flex">
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="rounded-md px-3 py-2 text-sm font-medium text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex shrink-0 items-center gap-2">
            <a
              href="#pricing"
              className="hidden rounded-md border border-border bg-background px-3 py-2 text-sm font-medium text-foreground hover:bg-muted sm:inline-flex sm:h-11 sm:items-center"
            >
              Xem gói
            </a>
            <Link
              href="/login"
              className="inline-flex h-11 min-w-[2.75rem] items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
            >
              Đăng nhập
            </Link>
          </div>
        </div>
        <div className="border-t border-border/60 pb-2 md:hidden">
          <nav
            aria-label="Điều hướng nhanh"
            className="flex gap-1 overflow-x-auto py-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          >
            {nav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="shrink-0 rounded-full border border-border bg-muted/50 px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted"
              >
                {item.label}
              </a>
            ))}
          </nav>
        </div>
      </div>
    </header>
  );
}
