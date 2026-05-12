import Link from 'next/link';

type ContactSectionProps = {
  contactEmail: string;
};

export function ContactSection({ contactEmail }: ContactSectionProps): React.ReactElement {
  const mail = `mailto:${contactEmail}?subject=${encodeURIComponent('QRTable — Liên hệ triển khai')}`;
  return (
    <section id="contact" className="bg-muted/25 py-16 md:py-20">
      <div className="mx-auto max-w-3xl px-4 text-center">
        <h2 className="text-3xl font-bold tracking-tight">Liên hệ triển khai</h2>
        <p className="mt-3 text-muted-foreground">
          Phase 4B không bật đăng ký tenant tự phục vụ. Để demo luồng onboarding, subscription và SePay Connect, hãy liên hệ đội
          vận hành QRTable.
        </p>
        <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <a
            href={mail}
            className="inline-flex h-11 min-w-[200px] items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
          >
            Liên hệ triển khai
          </a>
          <Link
            href="/login"
            className="inline-flex h-11 min-w-[200px] items-center justify-center rounded-md border border-border bg-background px-6 text-sm font-medium transition hover:bg-muted"
          >
            Đăng nhập quản trị
          </Link>
        </div>
        <p className="mt-6 text-sm text-muted-foreground">
          Email:{' '}
          <a className="font-medium text-foreground underline-offset-4 hover:underline" href={mail}>
            {contactEmail}
          </a>
        </p>
        <p className="mt-8 text-xs text-muted-foreground">
          Phiên bản demo học thuật cho nền tảng SaaS F&amp;B tại Việt Nam.
        </p>
      </div>
    </section>
  );
}
