import type { PricingPlan } from '@/features/saas/types';
import clsx from 'clsx';
import styles from './landing.module.css';

function formatVnd(n: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(n)} đ`;
}

function formatBillingPeriod(period: string): string {
  if (period === 'YEARLY') return 'theo năm';
  return 'theo tháng';
}

type PricingSectionProps = {
  plans: PricingPlan[];
};

export function PricingSection({ plans }: PricingSectionProps): React.ReactElement {
  const sorted = [...plans].sort((a, b) => a.displayOrder - b.displayOrder);
  return (
    <section
      id="pricing"
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-950 py-14 sm:py-20`}
      aria-labelledby="qrt-price-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridFine}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgDotField}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialEmerald}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="qrt-price-heading" className="font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Bảng giá tham khảo
          </h2>
          <p className="mt-3 font-sans text-sm text-zinc-500">
            Giá VND / tháng. Gói thực tế có thể điều chỉnh theo quy mô — liên hệ để nhận tư vấn và bật quán, không cần tự
            cấu hình từ đầu.
          </p>
        </div>
        <div className="relative mt-12">
          <svg
            className="pointer-events-none absolute left-1/2 top-[5%] z-0 hidden h-[88%] w-[min(100%,72rem)] max-w-[calc(100%-1rem)] -translate-x-1/2 opacity-[0.34] md:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path className={styles.flowLoopPath} d="M 4 82 L 96 82 L 96 16 L 4 16 Z" />
          </svg>
          <ul className="relative z-10 grid gap-5 md:grid-cols-3">
          {sorted.map((plan) => {
            const emphasized = plan.code === 'BASIC';
            return (
              <li
                key={plan.id}
                className={clsx(
                  styles.cardFlowShimmer,
                  'relative flex flex-col rounded-2xl border p-6 transition',
                  emphasized
                    ? 'border-cyan-500/50 bg-gradient-to-b from-cyan-950/40 to-zinc-900/90 shadow-[0_0_0_1px_rgba(34,211,238,0.15)]'
                    : 'border-zinc-800 bg-zinc-900/50 hover:border-zinc-700',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-sans text-lg font-semibold text-zinc-100">{plan.name}</h3>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500">Mã gói: {plan.code}</p>
                  </div>
                  {emphasized ? (
                    <span className="rounded-full border border-cyan-500/40 bg-cyan-500/15 px-2.5 py-1 font-mono text-[10px] font-semibold uppercase tracking-wide text-cyan-300">
                      phổ biến
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 font-sans text-sm leading-relaxed text-zinc-500">{plan.description ?? `Gói ${plan.code}`}</p>
                <p className="mt-6 font-mono text-3xl font-semibold tabular-nums tracking-tight text-zinc-50">{formatVnd(plan.priceVnd)}</p>
                <p className="mt-1 font-mono text-xs text-zinc-500">/ tháng · thanh toán {formatBillingPeriod(plan.billingPeriod)}</p>
                <ul className="mt-5 flex flex-1 flex-col gap-2 border-t border-zinc-800/80 pt-5 font-mono text-xs text-zinc-400">
                  <li>
                    <span className="text-cyan-400/90">Số bàn</span> tối đa {plan.maxTables}
                  </li>
                  <li>
                    <span className="text-cyan-400/90">Tài khoản nhân viên</span> tối đa {plan.maxStaff}
                  </li>
                  <li>
                    <span className="text-cyan-400/90">Đơn mỗi ngày</span> tối đa {plan.maxOrdersPerDay}
                  </li>
                  {plan.features.slice(0, 6).map((f) => (
                    <li key={f} className="font-sans text-zinc-500">
                      <span className="text-zinc-600">·</span> {f}
                    </li>
                  ))}
                </ul>
                <a
                  href="#contact"
                  className="mt-6 inline-flex h-11 min-h-[44px] w-full cursor-pointer items-center justify-center rounded-md bg-cyan-500 font-mono text-sm font-semibold text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
                >
                  Liên hệ tư vấn
                </a>
              </li>
            );
          })}
          </ul>
        </div>
      </div>
    </section>
  );
}
