'use client';

import { useSyncExternalStore } from 'react';
import { motion } from 'motion/react';

function subscribeReducedMotion(onStoreChange: () => void): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', onStoreChange);
  return () => mq.removeEventListener('change', onStoreChange);
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') {
    return false;
  }
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getReducedMotionServerSnapshot(): boolean {
  return false;
}

/**
 * Gợi ý cạnh mã QR (trái nút), lặp theo chu kỳ.
 * Không bắt đầu keyframe opacity toàn 0 + không dùng initial=false để tránh “mất” sau reload.
 * @see https://motion.dev/docs/react-animation
 */
export function QrScanCalloutBubble(): React.ReactElement {
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  if (reduceMotion) {
    return (
      <p className="pointer-events-none max-w-[10.5rem] shrink rounded-lg border border-cyan-500/35 bg-zinc-950/95 px-2.5 py-2 text-left font-sans text-[11px] leading-snug text-zinc-200 shadow-md sm:max-w-[12rem]">
        Nhấn hoặc chạm mã QR để xem thử thực đơn trên điện thoại.
      </p>
    );
  }

  return (
    <motion.div
      aria-hidden
      className="pointer-events-none relative flex max-w-[10.5rem] shrink-0 flex-col sm:max-w-[12.5rem]"
      initial={{ opacity: 1, x: 0, scale: 1 }}
      animate={{
        opacity: [1, 1, 0.35, 1, 1, 1],
        x: [0, -4, 2, -3, 0, 0],
        scale: [1, 1.03, 0.98, 1.02, 1, 1],
      }}
      transition={{
        duration: 4.8,
        repeat: Infinity,
        repeatDelay: 0.9,
        ease: 'easeInOut',
        times: [0, 0.15, 0.28, 0.42, 0.75, 1],
      }}
    >
      <div className="relative rounded-xl border border-cyan-500/45 bg-zinc-950/95 px-3 py-2 pr-3.5 shadow-[0_8px_32px_-8px_rgba(0,0,0,0.65),0_0_0_1px_rgba(34,211,238,0.12)] backdrop-blur-sm">
        <p className="text-left font-mono text-[9px] font-semibold uppercase tracking-[0.18em] text-cyan-300/95">Quét QR</p>
        <p className="mt-1 text-left font-sans text-[11px] font-medium leading-snug text-zinc-50">
          Chạm mã để xem thực đơn như khách
        </p>
        <span
          className="absolute top-1/2 right-0.5 size-0 translate-x-full -translate-y-1/2 border-y-[6px] border-l-[7px] border-y-transparent border-l-zinc-900"
          aria-hidden
        />
      </div>
    </motion.div>
  );
}
