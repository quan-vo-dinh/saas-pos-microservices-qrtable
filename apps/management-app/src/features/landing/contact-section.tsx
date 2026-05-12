import Link from 'next/link';
import { Mail, MessageCircle } from 'lucide-react';

type ContactSectionProps = {
  contactEmail: string;
};

export function ContactSection({ contactEmail }: ContactSectionProps): React.ReactElement {
  const mail = `mailto:${contactEmail}?subject=${encodeURIComponent('QRTable — Liên hệ triển khai')}`;

  return (
    <section id="contact" aria-labelledby="contact-heading" className="qrt-landing__band py-16 md:py-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <h2 id="contact-heading" className="text-3xl font-bold tracking-tight text-foreground md:text-4xl">
              Liên hệ triển khai
            </h2>
            <p className="mt-3 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg">
              Để bật demo đầy đủ: tenant, gói cước, SePay Connect và VietQR hai tầng — hãy liên hệ đội vận hành. Chúng tôi
              phối hợp checklist kỹ thuật và hạn mức quota theo từng nhà hàng.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href={mail}
                className="inline-flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground hover:bg-primary/90 motion-safe:transition-transform motion-safe:duration-200 motion-safe:hover:scale-[1.02]"
              >
                <Mail className="size-4" aria-hidden />
                Gửi email
              </a>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-[44px] items-center justify-center gap-2 rounded-md border border-border bg-background px-6 text-sm font-medium text-foreground hover:bg-muted"
              >
                Đã có tài khoản — đăng nhập
              </Link>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">
              Địa chỉ liên hệ:{' '}
              <a className="font-medium text-foreground underline-offset-4 hover:underline" href={mail}>
                {contactEmail}
              </a>
            </p>
          </div>

          <aside
            aria-label="Gợi ý nội dung khi liên hệ"
            className="qrt-glass rounded-2xl p-6 shadow-sm"
          >
            <div className="flex items-center gap-2 text-foreground">
              <MessageCircle className="size-5 text-primary" aria-hidden />
              <p className="text-sm font-semibold">Trong email, nên ghi rõ</p>
            </div>
            <ul className="mt-4 space-y-3 text-sm leading-relaxed text-muted-foreground">
              <li>· Tên nhà hàng / chuỗi và địa điểm triển khai dự kiến</li>
              <li>· Số bàn, ca hoạt động và nhu cầu POS / bếp (KDS)</li>
              <li>· Ngân hàng dự kiến dùng với SePay (nếu đã có)</li>
              <li>· Thời gian mong muốn cho buổi demo kỹ thuật</li>
            </ul>
          </aside>
        </div>
      </div>
    </section>
  );
}
