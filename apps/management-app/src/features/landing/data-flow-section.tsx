import clsx from 'clsx';
import { QrCode, Radio, ShoppingCart, UtensilsCrossed } from 'lucide-react';
import styles from './landing.module.css';

const nodes = [
  { title: 'Khách quét QR tại bàn', body: 'Mở thực đơn đúng quán, đúng bàn — không xếp hàng chờ order.', icon: QrCode },
  { title: 'Gọi món trên điện thoại', body: 'Giỏ hàng theo bàn, giới hạn thời gian phù hợp giờ phục vụ.', icon: ShoppingCart },
  { title: 'Bếp & nhân viên cùng nhịp', body: 'Đơn vào POS, trạng thái món và tiến độ phục vụ thống nhất.', icon: UtensilsCrossed },
  { title: 'Theo dõi theo thời gian thực', body: 'Mọi thay đổi được cập nhật nhanh để quán xử lý đúng lúc.', icon: Radio },
] as const;

export function DataFlowSection(): React.ReactElement {
  return (
    <section
      id="flow"
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-950 py-14 sm:py-20`}
      aria-labelledby="qrt-flow-heading"
    >
      <div className={styles.flowSectionPhoto} aria-hidden />
      <div className={styles.flowSectionOverlay} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="max-w-3xl">
          <h2 id="qrt-flow-heading" className="font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">
            Từ lúc khách ngồi xuống đến lúc món được phục vụ
          </h2>
        </div>

        <div className="relative mt-10 sm:mt-12">
          <svg
            className="pointer-events-none absolute left-1/2 top-[6%] z-0 hidden h-[82%] w-[min(100%,72rem)] max-w-[calc(100%-1rem)] -translate-x-1/2 opacity-[0.38] lg:block"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden
          >
            <path className={styles.flowLoopPath} d="M 4 78 L 96 78 L 96 22 L 4 22 Z" />
          </svg>
          <ul className="relative z-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {nodes.map((n, i) => (
              <li key={n.title} className="relative">
                {i > 0 ? (
                  <div
                    className="pointer-events-none absolute -left-2 top-1/2 z-0 hidden h-px w-4 -translate-y-1/2 bg-zinc-800 lg:block"
                    aria-hidden
                  />
                ) : null}
                <article
                  className={clsx(
                    styles.cardFlowShimmer,
                    'relative z-10 flex h-full flex-col rounded-xl border border-zinc-800 bg-zinc-900/55 p-4 backdrop-blur-[2px] sm:p-5',
                    'shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)] transition hover:border-cyan-500/30',
                  )}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-wider text-zinc-500">
                      bước {String(i + 1).padStart(2, '0')}
                    </span>
                    <div className="flex size-9 items-center justify-center rounded-lg border border-cyan-500/25 bg-cyan-500/10 text-cyan-400">
                      <n.icon className="size-4" aria-hidden />
                    </div>
                  </div>
                  <h3 className="mt-4 font-sans text-base font-semibold text-zinc-100">{n.title}</h3>
                  <p className="mt-2 flex-1 font-sans text-sm leading-relaxed text-zinc-500">{n.body}</p>
                  {i < nodes.length - 1 ? (
                    <svg className="mt-4 h-6 w-full text-zinc-600 lg:hidden" viewBox="0 0 120 24" fill="none" aria-hidden>
                      <path
                        className={styles.flowEdge}
                        d="M8 12h88"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                      <path d="M96 6l10 6-10 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  ) : null}
                </article>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
