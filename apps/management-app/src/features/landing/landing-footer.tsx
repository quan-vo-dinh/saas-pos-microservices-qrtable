import Link from 'next/link';

export function LandingFooter({ productName }: { productName: string }): React.ReactElement {
  const year = new Date().getFullYear();
  return (
    <footer role="contentinfo" className="border-t border-border bg-muted/30 py-12 text-sm">
      <div className="mx-auto grid max-w-6xl gap-10 px-4 sm:px-6 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="text-base font-semibold text-foreground">{productName}</p>
          <p className="mt-2 max-w-md leading-relaxed text-muted-foreground">
            SaaS POS đa tenant cho F&amp;B Việt Nam: đặt món qua QR, vận hành bàn — bếp, đồng bộ menu theo thời gian thực và
            thanh toán VietQR / SePay theo mô hình hai tầng (bill khách + cước nền tảng).
          </p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Sản phẩm</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <a href="#tong-quan" className="hover:text-foreground">
                  Tổng quan nền tảng
                </a>
              </li>
              <li>
                <a href="#ban-va-qr" className="hover:text-foreground">
                  Bàn &amp; vòng đời
                </a>
              </li>
              <li>
                <a href="#so-sanh" className="hover:text-foreground">
                  So sánh vận hành
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-foreground">
                  Bảng giá
                </a>
              </li>
            </ul>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Quản trị</p>
            <ul className="mt-3 space-y-2 text-muted-foreground">
              <li>
                <Link href="/login" className="hover:text-foreground">
                  Đăng nhập quản trị
                </Link>
              </li>
              <li>
                <a href="#contact" className="hover:text-foreground">
                  Liên hệ triển khai
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>
      <p className="mx-auto mt-10 max-w-6xl px-4 text-center text-xs text-muted-foreground sm:px-6">
        © {year} {productName} — bản demo / luận văn. Giới hạn tính năng theo gói đăng ký và chính sách vận hành nền tảng.
      </p>
    </footer>
  );
}
