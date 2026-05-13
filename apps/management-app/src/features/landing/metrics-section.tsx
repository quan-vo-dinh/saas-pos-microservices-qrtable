import clsx from 'clsx';
import { Boxes, GitBranch, Timer, Webhook } from 'lucide-react';
import styles from './landing.module.css';

const metrics = [
  {
    label: 'Mỗi quán một không gian',
    value: 'Riêng tư',
    hint: 'Menu, đơn và lịch sử thanh toán tách biệt — không lẫn với quán bên cạnh.',
    icon: Boxes,
  },
  {
    label: 'Một menu, mọi màn hình',
    value: 'Đồng bộ',
    hint: 'Đổi món hoặc hết hàng: khách xem ngay trên điện thoại, nhân viên thấy cùng thông tin trên POS.',
    icon: GitBranch,
  },
  {
    label: 'Hai luồng tiền rõ ràng',
    value: 'Bill & gói',
    hint: 'Tiền khách trả bill về tài khoản quán; phí dùng QRTable được đối soát riêng — dễ kiểm kê cuối ngày.',
    icon: Webhook,
  },
  {
    label: 'Phiên theo bàn',
    value: 'QR an toàn',
    hint: 'Mỗi bàn một đường link riêng, hết giờ tự khóa — hạn chế đặt nhầm hoặc đơn “ma”.',
    icon: Timer,
  },
] as const;

export function MetricsSection(): React.ReactElement {
  return (
    <section
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-950 py-12 sm:py-16`}
      aria-labelledby="qrt-metrics-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridFine}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialCyan}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgVignette}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 id="qrt-metrics-heading" className="font-sans text-2xl font-semibold tracking-tight text-zinc-100 sm:text-3xl">
              Vì sao chủ quán chọn QRTable
            </h2>
            <p className="mt-2 max-w-2xl font-sans text-xs text-zinc-500 sm:text-sm">
              Tập trung vào trải nghiệm khách và kiểm soát tiền — không cần hiểu sâu về phần mềm để thấy lợi ích hằng ngày.
            </p>
          </div>
          <a
            href="#pricing"
            className="mt-2 hidden cursor-pointer font-mono text-xs text-cyan-400 underline-offset-4 hover:underline sm:mt-0 sm:inline"
          >
            Xem bảng giá →
          </a>
        </div>
        <div className="relative mt-10">
          <svg
            className="pointer-events-none absolute left-1/2 top-[8%] z-0 hidden h-[78%] w-[min(100%,72rem)] max-w-[calc(100%-1rem)] -translate-x-1/2 opacity-[0.42] lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path className={styles.flowLoopPath} d="M 5 80 L 95 80 L 95 20 L 5 20 Z" />
          </svg>
          <ul className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map((m) => (
              <li
                key={m.label}
                className={clsx(
                  styles.cardFlowShimmer,
                  'flex flex-col rounded-xl border border-zinc-800 bg-zinc-900/55 p-4 shadow-inner backdrop-blur-[2px]',
                  'transition hover:border-cyan-500/35 hover:shadow-[0_0_0_1px_rgba(34,211,238,0.12)]',
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <m.icon className="size-5 shrink-0 text-cyan-500/90" aria-hidden />
                  <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-500">ưu điểm</span>
                </div>
                <p className="mt-4 font-mono text-2xl font-semibold tabular-nums tracking-tight text-zinc-50">{m.value}</p>
                <p className="mt-1 font-sans text-sm font-medium text-zinc-200">{m.label}</p>
                <p className="mt-2 font-sans text-xs leading-relaxed text-zinc-500">{m.hint}</p>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
