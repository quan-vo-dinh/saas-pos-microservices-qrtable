'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { ArrowLeft } from 'lucide-react';
import { Iphone } from '@/components/ui/iphone';
import { Button } from '@/components/ui/button';
import { QrScanCalloutBubble } from '@/features/landing/qr-scan-callout';
import styles from './landing.module.css';

/** Demo URL only — quét thật có thể mở domain marketing (không chứa secret). */
const BASE_URL = 'https://qrtable.io/scan?utm_source=landing';

const PWA_SCREENSHOT = '/landing-pwa-customer-menu.png';

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

export function HeroSaasQrEmblem(): React.ReactElement {
  const [frame, setFrame] = useState(0);
  const [showPwa, setShowPwa] = useState(false);
  const reduceMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    getReducedMotionServerSnapshot,
  );

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (mq.matches) return;

    const id = window.setInterval(() => {
      setFrame((n) => (n + 1) % 6);
    }, 4200);
    return () => window.clearInterval(id);
  }, []);

  const value = `${BASE_URL}&frame=${frame}`;

  const easeOut = [0.22, 1, 0.36, 1] as const;
  const easeInOut = [0.45, 0, 0.2, 1] as const;
  const none = reduceMotion;

  const qrVariants = {
    initial: none
      ? { opacity: 1, scale: 1, y: 0, filter: 'blur(0px)' }
      : { opacity: 0, scale: 0.94, y: 18, filter: 'blur(8px)' },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: none ? { duration: 0 } : { duration: 0.4, ease: easeInOut },
    },
    exit: {
      opacity: 0,
      scale: 0.9,
      y: -14,
      filter: none ? 'blur(0px)' : 'blur(6px)',
      transition: none ? { duration: 0 } : { duration: 0.28, ease: easeOut },
    },
  };

  const pwaVariants = {
    initial: none
      ? { opacity: 1, scale: 1, y: 0, rotateX: 0, filter: 'blur(0px)' }
      : { opacity: 0, scale: 0.86, y: 28, rotateX: 10, filter: 'blur(10px)' },
    animate: {
      opacity: 1,
      scale: 1,
      y: 0,
      rotateX: 0,
      filter: 'blur(0px)',
      transition: none ? { duration: 0 } : { duration: 0.46, ease: easeInOut },
    },
    exit: {
      opacity: 0,
      scale: 0.92,
      y: 16,
      rotateX: 6,
      filter: none ? 'blur(0px)' : 'blur(6px)',
      transition: none ? { duration: 0 } : { duration: 0.3, ease: easeOut },
    },
  };

  return (
    <div className="relative mx-auto w-full max-w-[min(100%,360px)] min-h-[min(380px,52svh)] py-1 sm:min-h-[400px]">
      <AnimatePresence mode="wait" initial={false}>
        {showPwa ? (
          <motion.div
            key="pwa"
            className="mx-auto flex w-full max-w-[min(100%,320px)] flex-col items-center gap-3 sm:max-w-[min(100%,360px)]"
            style={{ transformStyle: 'preserve-3d', perspective: 1000 }}
            variants={pwaVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowPwa(false)}
              className="font-mono text-xs text-zinc-400 hover:text-zinc-100"
            >
              <ArrowLeft className="size-3.5" aria-hidden />
              Quay lại mã QR
            </Button>
            <Iphone
              src={PWA_SCREENSHOT}
              imageAlt="QRTable — thực đơn và đặt món trên điện thoại (minh họa)"
              imageFit="contain"
              className="w-full max-w-[min(100%,320px)] drop-shadow-[0_24px_48px_-16px_rgba(0,0,0,0.75)]"
            />
          </motion.div>
        ) : (
          <motion.div
            key="qr"
            className={`${styles.qrTiltHost} mx-auto w-full`}
            variants={qrVariants}
            initial="initial"
            animate="animate"
            exit="exit"
          >
            <div className="relative mx-auto w-full max-w-[min(100%,320px)] sm:max-w-[340px]">
              <div className="mb-3 flex justify-center sm:absolute sm:right-full sm:top-1/2 sm:z-10 sm:mb-0 sm:mr-3 sm:flex sm:-translate-y-1/2 sm:justify-end">
                <QrScanCalloutBubble />
              </div>
              <div
                className={`${styles.qrTiltInner} ${styles.qrEmblemGlow} relative flex w-full flex-col items-center gap-5 rounded-2xl border border-cyan-500/20 bg-zinc-950/65 p-6 backdrop-blur-md supports-[backdrop-filter]:bg-zinc-950/45`}
              >
                <div className="flex w-full items-center justify-between gap-3 border-b border-zinc-800/80 pb-4">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400/95">QRTable</span>
                    <span className="rounded border border-zinc-700 bg-zinc-900/90 px-2 py-0.5 font-mono text-[9px] text-zinc-500">Tại bàn</span>
                  </div>
                  <span className="font-mono text-[9px] text-zinc-500">đặt món</span>
                </div>

                <div className="flex w-full justify-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowPwa(true)}
                    aria-label="Xem thử giao diện đặt món trên điện thoại — như khách quét QR tại bàn"
                    className="relative shrink-0 cursor-pointer rounded-xl border-0 bg-white p-3 text-left shadow-inner ring-1 ring-zinc-200/80 outline-none transition-[box-shadow,transform] hover:ring-cyan-500/40 focus-visible:ring-2 focus-visible:ring-cyan-500 focus-visible:ring-offset-2 focus-visible:ring-offset-zinc-950 active:scale-[0.99]"
                  >
                    <QRCodeSVG
                      value={value}
                      size={208}
                      level="M"
                      includeMargin
                      bgColor="#ffffff"
                      fgColor="#09090b"
                      aria-hidden
                    />
                    <div className={styles.qrScanOverlay}>
                      <div className={styles.qrScanLine} aria-hidden />
                    </div>
                  </button>
                </div>

                <div className="text-center">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-cyan-500/90">Trải nghiệm khách</p>
                  <p className="mt-1.5 font-sans text-sm font-medium leading-snug text-zinc-200">QR tại bàn · mở thực đơn trên điện thoại</p>
                  <p className="mt-2 font-mono text-[10px] leading-relaxed text-zinc-500">
                    Thử chạm mã bên cạnh để xem giao diện đặt món như khách ngồi tại quán.
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
