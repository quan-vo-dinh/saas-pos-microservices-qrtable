import Link from 'next/link';
import clsx from 'clsx';
import { Mail } from 'lucide-react';
import styles from './landing.module.css';

type ContactSectionProps = {
  contactEmail: string;
};

export function ContactSection({ contactEmail }: ContactSectionProps): React.ReactElement {
  const mail = `mailto:${contactEmail}?subject=${encodeURIComponent('QRTable — Tư vấn mở quán')}`;
  return (
    <section
      id="contact"
      className={`${styles.sectionShell} bg-zinc-950 py-16 sm:py-24`}
      aria-labelledby="qrt-contact-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridFine}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgDiagonal}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialCyan}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-5xl px-4">
        <div
          className={clsx(
            styles.cardFlowShimmer,
            'overflow-hidden rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 via-zinc-950 to-zinc-950',
            'shadow-[0_0_0_1px_rgba(39,39,42,0.8),0_32px_64px_-32px_rgba(0,0,0,0.75)]',
          )}
        >
          <div className="relative z-10 grid gap-8 p-8 md:grid-cols-[1fr_auto] md:items-center md:gap-12 md:p-12">
            <div>
              <div className="inline-flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/80 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
                <Mail className="size-3.5" aria-hidden />
                Liên hệ trực tiếp
              </div>
              <h2 id="qrt-contact-heading" className="mt-4 font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
                Muốn thử QRTable tại quán?
              </h2>
              <p className="mt-3 max-w-xl font-sans text-sm leading-relaxed text-zinc-500 sm:text-base">
                Gửi email giới thiệu quy mô (số bàn, chi nhánh, giờ cao điểm). Đội QRTable sẽ đề xuất gói, demo luồng khách
                và hướng dẫn kết nối VietQR/SePay phù hợp mô hình của bạn.
              </p>
              <p className="mt-4 font-mono text-sm text-zinc-400">
                <a href={mail} className="inline-flex items-center gap-2 text-cyan-400 underline-offset-4 hover:underline">
                  <Mail className="size-4 shrink-0" aria-hidden />
                  {contactEmail}
                </a>
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row md:flex-col">
              <a
                href={mail}
                className="inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-md bg-cyan-500 px-8 font-mono text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Tư vấn &amp; mở quán
              </a>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-md border border-zinc-700 bg-zinc-900/50 px-8 font-mono text-sm font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
              >
                Đăng nhập quản lý
              </Link>
            </div>
          </div>
        </div>
        <p className="mt-10 text-center font-sans text-[11px] text-zinc-600">
          © {new Date().getFullYear()} QRTable — đặt món bằng QR, POS và thanh toán cho nhà hàng Việt Nam.
        </p>
      </div>
    </section>
  );
}
