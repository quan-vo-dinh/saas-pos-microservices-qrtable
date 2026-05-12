import { Building2, Landmark, Lock, ShieldCheck } from 'lucide-react';

export function PaymentSection(): React.ReactElement {
  return (
    <section id="thanh-toan" aria-labelledby="payment-heading" className="qrt-landing__band-muted border-b border-border/60 py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="max-w-3xl">
          <h2 id="payment-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
            Thanh toán &amp; niềm tin vận hành
          </h2>
          <p className="mt-3 text-base leading-relaxed text-muted-foreground md:text-lg">
            QRTable tách rõ hai luồng tiền: khách trả bill vào tài khoản nhà hàng; chủ quán trả cước SaaS vào tài khoản
            nền tảng. Kết nối SePay dùng OAuth theo từng tenant — client secret và khóa mã hóa chỉ tồn tại phía server.
          </p>
        </div>

        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <article className="qrt-glass flex flex-col rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-primary">
              <Building2 className="size-6" aria-hidden />
              <h3 className="text-lg font-semibold text-foreground">Tier 1 — Bill khách (QRTBL…)</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              VietQR + webhook khớp mã tham chiếu bill: tiền về tài khoản đã kết nối của đúng nhà hàng. Phù hợp thanh toán
              tại bàn sau khi chốt đơn.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <Landmark className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                Định danh giao dịch theo prefix tham chiếu bill (ví dụ QRTBL + phần đầu UUID).
              </li>
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                Webhook xác thực secret; không hiển thị thông tin nhạy cảm trên PWA khách.
              </li>
            </ul>
          </article>

          <article className="qrt-glass flex flex-col rounded-2xl p-6 shadow-sm">
            <div className="flex items-center gap-3 text-primary">
              <Lock className="size-6" aria-hidden />
              <h3 className="text-lg font-semibold text-foreground">Tier 2 — Cước SaaS (QRSUB…)</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
              Hóa đơn subscription / gia hạn gói: tiền về tài khoản nền tảng, kích hoạt hoặc gia hạn quyền vận hành tenant
              sau khi đối soát webhook.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                Tách routing webhook platform vs theo slug tenant để tránh nhầm luồng.
              </li>
              <li className="flex gap-2">
                <Lock className="mt-0.5 size-4 shrink-0 text-foreground" aria-hidden />
                OAuth state và token refresh được xử lý server-side; trình duyệt không giữ client secret.
              </li>
            </ul>
          </article>
        </div>
      </div>
    </section>
  );
}
