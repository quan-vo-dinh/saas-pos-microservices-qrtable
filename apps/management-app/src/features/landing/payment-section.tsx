import clsx from 'clsx';
import { Lock, ShieldCheck } from 'lucide-react';
import styles from './landing.module.css';

export function PaymentSection(): React.ReactElement {
  return (
    <section
      id="payment"
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-900 py-14 sm:py-20`}
      aria-labelledby="qrt-pay-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridLarge}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialCyan}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgVignette}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)] lg:items-start lg:gap-16">
          <div>
            <div className="flex size-12 items-center justify-center rounded-xl border border-emerald-500/30 bg-emerald-950/30 text-emerald-400">
              <ShieldCheck className="size-7" aria-hidden />
            </div>
            <h2 id="qrt-pay-heading" className="mt-6 font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
              Tiền khách và phí nền tảng — tách bạch, dễ kiểm
            </h2>
            <p className="mt-4 font-sans text-sm leading-relaxed text-zinc-500 sm:text-base">
              Khách thanh toán VietQR cho bill: tiền về tài khoản ngân hàng của quán. Phí dùng QRTable được quyết toán riêng
              qua kênh SePay — hai luồng không lẫn nhau khi đối soát cuối ngày.
            </p>
            <p className="mt-4 flex items-start gap-2 font-sans text-sm text-zinc-500">
              <Lock className="mt-0.5 size-4 shrink-0 text-zinc-600" aria-hidden />
              <span>
                Kết nối SePay theo chuẩn bảo mật: thông tin nhạy cảm chỉ lưu trên máy chủ, không để lộ trên trình duyệt
                khách hay nhân viên.
              </span>
            </p>
          </div>

          <div className="relative grid gap-4 sm:grid-cols-2">
            <svg
              className="pointer-events-none absolute left-[6%] right-[6%] top-1/2 z-0 hidden h-6 -translate-y-1/2 opacity-[0.45] sm:block"
              viewBox="0 0 100 24"
              preserveAspectRatio="none"
              aria-hidden
            >
              <path className={styles.flowLoopPathH} d="M 4 12 L 96 12" />
            </svg>
            <article
              className={clsx(
                styles.cardFlowShimmer,
                'relative z-10 rounded-xl border border-emerald-500/25 bg-zinc-950/60 p-5',
                'shadow-[inset_0_0_0_1px_rgba(16,185,129,0.08)]',
              )}
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-emerald-400">Luồng 1</p>
              <h3 className="mt-2 font-sans text-lg font-semibold text-zinc-100">Bill khách</h3>
              <p className="mt-2 font-sans text-sm text-zinc-500">VietQR khớp đúng bill; tiền về tài khoản quán đã kết nối.</p>
              <p className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-sans text-xs leading-snug text-zinc-300">
                Hệ thống đối chiếu nội dung chuyển khoản với bill đang mở — thu ngân ít gõ tay hơn.
              </p>
            </article>
            <article
              className={clsx(
                styles.cardFlowShimmer,
                'relative z-10 rounded-xl border border-cyan-500/25 bg-zinc-950/60 p-5',
                'shadow-[inset_0_0_0_1px_rgba(34,211,238,0.08)]',
              )}
            >
              <p className="font-mono text-[10px] font-semibold uppercase tracking-widest text-cyan-400">Luồng 2</p>
              <h3 className="mt-2 font-sans text-lg font-semibold text-zinc-100">Phí dùng QRTable</h3>
              <p className="mt-2 font-sans text-sm text-zinc-500">Thanh toán gói dịch vụ; gia hạn quyền sử dụng theo chu kỳ.</p>
              <p className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/80 px-3 py-2 font-sans text-xs leading-snug text-zinc-300">
                Phí gói QRTable tách khỏi bill khách — báo cáo cuối ngày nhất quán với sổ quản lý.
              </p>
            </article>
          </div>
        </div>
      </div>
    </section>
  );
}
