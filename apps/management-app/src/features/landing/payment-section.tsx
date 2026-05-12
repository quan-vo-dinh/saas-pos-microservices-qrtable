import { ShieldCheck } from 'lucide-react';

export function PaymentSection(): React.ReactElement {
  return (
    <section className="border-b border-border/80 bg-background py-16 md:py-20">
      <div className="mx-auto max-w-5xl px-4">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:gap-8">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="size-7" aria-hidden />
          </div>
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Thanh toán &amp; niềm tin</h2>
            <p className="mt-3 text-muted-foreground">
              Hai tầng tách bạch: (1) Khách thanh toán hóa đơn trực tiếp vào tài khoản nhà hàng qua VietQR Tier 1 với tiền tố tham
              chiếu bill; (2) Chủ quán thanh toán gói dịch vụ vào tài khoản nền tảng qua VietQR Tier 2 với tiền tố subscription.
            </p>
            <p className="mt-4 text-muted-foreground">
              SePay OAuth2 Connect cho phép mỗi nhà hàng ủy quyền ứng dụng QRTable truy cập có phạm vi hẹp để đồng bộ tài khoản ngân
              hàng và thiết lập webhook qua API —{' '}
              <span className="font-medium text-foreground">tích hợp qua luồng OAuth2/API của SePay</span>, không lưu Client Secret
              trên trình duyệt khách.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
