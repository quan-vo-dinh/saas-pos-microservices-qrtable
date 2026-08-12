import Link from 'next/link';
import clsx from 'clsx';
import { Radio, Shield } from 'lucide-react';
import { Cover } from '@/components/ui/cover';
import styles from './landing.module.css';
import { HeroSaasQrEmblem } from './hero-saas-qr-emblem';

export function HeroSection(): React.ReactElement {
  return (
    <section
      className="relative flex min-h-[calc(100dvh-4rem)] w-full flex-col overflow-hidden border-b border-zinc-800/90 sm:min-h-[calc(100dvh-72px)]"
      aria-labelledby="qrt-hero-heading"
    >
      {/* Ambient: phủ kín vùng hero (viewport trừ header sticky) — desktop & mobile */}
      <div
        className="pointer-events-none absolute inset-0 z-0 h-full min-h-full w-full bg-zinc-950 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/landing-hero-ambient.png')" }}
        role="presentation"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 z-[1] h-full min-h-full w-full bg-gradient-to-b from-zinc-950/90 via-zinc-950/75 to-zinc-950/85 sm:bg-gradient-to-r sm:from-zinc-950 sm:via-zinc-950/88 sm:to-zinc-950/35"
        aria-hidden
      />
      <div
        className={clsx(
          'pointer-events-none absolute inset-0 z-[2] h-full min-h-full w-full opacity-40',
          styles.gridMesh,
        )}
        aria-hidden
      />
      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 flex-col justify-center px-4 pb-16 pt-10 sm:pb-20 sm:pt-14 lg:pb-24 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:items-center lg:gap-16">
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-500/35 bg-cyan-500/10 px-3 py-1 font-mono text-[11px] font-medium uppercase tracking-wider text-cyan-300">
                <Radio className="size-3.5" aria-hidden />
                Cập nhật tức thì
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-700 bg-zinc-900/80 px-3 py-1 font-mono text-[11px] uppercase tracking-wider text-zinc-400">
                <Shield className="size-3.5" aria-hidden />
                Dữ liệu từng quán riêng biệt
              </span>
            </div>

            <div>
              <h1 id="qrt-hero-heading" className="font-sans text-5xl font-semibold tracking-tight text-zinc-50 sm:text-6xl lg:text-7xl">
                Vận hành nhà hàng của bạn theo{' '}
                <Cover
                  containerClassName="border border-cyan-500/20 bg-zinc-950/70 hover:bg-zinc-900/85 dark:border-cyan-500/20 dark:bg-zinc-950/70 dark:hover:bg-zinc-900/85"
                  className="bg-gradient-to-r from-cyan-400 to-emerald-400 bg-clip-text text-transparent"
                >
                  dòng chảy số
                </Cover>
              </h1>
              <p className="mt-4 max-w-xl font-sans text-base leading-relaxed text-zinc-400 sm:text-lg">
                QRTable gom menu, đơn từ khách và màn hình nhân viên vào một luồng: ít nhầm bàn, bếp nhận đúng món, phục vụ
                nhanh hơn — phù hợp nhà hàng, quán cafe và F&amp;B tại Việt Nam.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="#pricing"
                className="inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-md bg-cyan-500 px-6 font-mono text-sm font-semibold text-zinc-950 shadow-[0_0_24px_-4px_rgba(34,211,238,0.55)] transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
              >
                Xem bảng giá
              </a>
              <Link
                href="/login"
                className="inline-flex h-12 min-h-[44px] cursor-pointer items-center justify-center rounded-md border border-zinc-600 bg-zinc-950/50 px-6 font-mono text-sm font-medium text-zinc-100 transition hover:border-zinc-400 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
              >
                Đăng nhập quản lý
              </Link>
            </div>

            <p className="font-sans text-xs text-zinc-500">
              Đăng ký mở quán do đội QRTable hỗ trợ — chúng tôi cấu hình gói, bàn và quy trình phù hợp từng mô hình.
            </p>
          </div>

          <div className="relative flex justify-center lg:justify-end">
            <HeroSaasQrEmblem />
          </div>
        </div>
      </div>
    </section>
  );
}
