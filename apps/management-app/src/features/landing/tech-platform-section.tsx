'use client';

import { forwardRef, useRef, type ReactElement, type ReactNode } from 'react';
import {
  SiApachekafka,
  SiCloudinary,
  SiDocker,
  SiKeycloak,
  SiMongodb,
  SiNestjs,
  SiNextdotjs,
  SiNx,
  SiPostgresql,
  SiPrometheus,
  SiRedis,
  SiSocketdotio,
} from 'react-icons/si';
import { QrCode } from 'lucide-react';
import { AnimatedBeam } from '@/components/ui/animated-beam';
import { cn } from '@/lib/utils';
import { TechStackGrid } from '@/features/landing/tech-stack-grid';
import styles from './landing.module.css';

const Circle = forwardRef<
  HTMLDivElement,
  { className?: string; children?: ReactNode; label: string }
>(({ className, children, label }, ref) => (
  <div className="flex flex-col items-center gap-1.5">
    <div
      ref={ref}
      className={cn(
        'relative z-10 flex size-11 shrink-0 items-center justify-center rounded-full border border-zinc-700/90 bg-zinc-900/95 p-2 shadow-[0_0_24px_-12px_rgba(34,211,238,0.35)] sm:size-[3.25rem]',
        className,
      )}
    >
      {children}
    </div>
    <span className="max-w-[5.5rem] text-center font-mono text-[8px] font-semibold uppercase leading-tight tracking-wider text-zinc-500 sm:max-w-[6rem] sm:text-[9px]">
      {label}
    </span>
  </div>
));
Circle.displayName = 'TechPlatformCircle';

const Hub = forwardRef<HTMLDivElement, { className?: string; children?: ReactNode }>(
  ({ className, children }, ref) => (
    <div
      className="flex flex-col items-center gap-2"
      role="group"
      aria-labelledby="qrt-tech-platform-hub-label"
    >
      <div
        ref={ref}
        className={cn(
          'relative z-10 flex size-[4.25rem] shrink-0 flex-col items-center justify-center rounded-2xl border border-cyan-500/45 bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 p-3 shadow-[0_0_36px_-10px_rgba(34,211,238,0.5)] sm:size-20',
          className,
        )}
      >
        {children}
      </div>
      <span
        id="qrt-tech-platform-hub-label"
        className="font-mono text-[8px] font-semibold uppercase tracking-[0.22em] text-cyan-400/95 sm:text-[9px]"
      >
        NỀN TẢNG
      </span>
    </div>
  ),
);
Hub.displayName = 'TechPlatformHub';

/** Luồng sáng + bố cục “vệ tinh → trung tâm” — minh họa tích hợp lớp công nghệ (theo kiến trúc §4). */
export function TechPlatformSection(): ReactElement {
  const containerRef = useRef<HTMLDivElement>(null);
  const nextRef = useRef<HTMLDivElement>(null);
  const nestRef = useRef<HTMLDivElement>(null);
  const nxRef = useRef<HTMLDivElement>(null);
  const pgRef = useRef<HTMLDivElement>(null);
  const redisRef = useRef<HTMLDivElement>(null);
  const mongoRef = useRef<HTMLDivElement>(null);
  const hubRef = useRef<HTMLDivElement>(null);
  const kafkaRef = useRef<HTMLDivElement>(null);
  const keycloakRef = useRef<HTMLDivElement>(null);
  const dockerRef = useRef<HTMLDivElement>(null);
  const socketRef = useRef<HTMLDivElement>(null);
  const cloudinaryRef = useRef<HTMLDivElement>(null);
  const prometheusRef = useRef<HTMLDivElement>(null);

  return (
    <section
      id="tech-platform"
      className={`${styles.sectionShell} border-b border-zinc-800/90 bg-zinc-950 py-14 sm:py-20`}
      aria-labelledby="qrt-tech-platform-heading"
    >
      <div className={`${styles.bgAbs} ${styles.bgGridFine}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgRadialCyan}`} aria-hidden />
      <div className={`${styles.bgAbs} ${styles.bgVignette}`} aria-hidden />
      <div className="relative z-10 mx-auto max-w-7xl px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2
            id="qrt-tech-platform-heading"
            className="font-sans text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl"
          >
            Công nghệ hiện đại — sẵn sàng mở rộng cùng quán
          </h2>
          <p className="mt-3 font-sans text-sm leading-relaxed text-zinc-500 sm:text-base">
            QRTable được mô tả trong{' '}
            <strong className="font-medium text-zinc-300">§4 Ngăn xếp công nghệ</strong> như một nền tảng
            microservice trên <strong className="font-medium text-zinc-300">Nx</strong>, backend{' '}
            <strong className="font-medium text-zinc-300">NestJS</strong>,{' '}
            <strong className="font-medium text-zinc-300">PostgreSQL</strong> &amp;{' '}
            <strong className="font-medium text-zinc-300">MongoDB</strong>, cache{' '}
            <strong className="font-medium text-zinc-300">Redis</strong>, sự kiện{' '}
            <strong className="font-medium text-zinc-300">Kafka</strong>, IAM{' '}
            <strong className="font-medium text-zinc-300">Keycloak</strong>, real-time{' '}
            <strong className="font-medium text-zinc-300">Socket.io</strong>, media{' '}
            <strong className="font-medium text-zinc-300">Cloudinary</strong>, thanh toán{' '}
            <strong className="font-medium text-zinc-300">SePay / VietQR</strong>, quan sát{' '}
            <strong className="font-medium text-zinc-300">Grafana · Loki · Prometheus · Tempo · OpenTelemetry</strong>,
            frontend <strong className="font-medium text-zinc-300">React · Vite · Next.js</strong> cùng chuỗi công cụ
            UI/quality trong tài liệu — bảng đầy đủ và logo thương hiệu nằm ngay bên dưới.
          </p>
          <p className="mt-2 font-mono text-[10px] text-zinc-600 sm:text-[11px]">
            Mọi lớp công nghệ đều hội tụ về <span className="text-zinc-500">NỀN TẢNG</span> (QRTable) — minh họa,
            không phản ánh thời gian thực tế từng API.
          </p>
        </div>

        <div
          ref={containerRef}
          className="relative mx-auto mt-12 flex min-h-[min(520px,62svh)] w-full max-w-5xl flex-col items-center justify-center gap-10 overflow-hidden rounded-2xl border border-zinc-800/80 bg-zinc-950/40 px-4 py-10 sm:min-h-[460px] sm:px-8 lg:flex-row lg:items-center lg:justify-between lg:gap-4 lg:px-8"
        >
          <div className="flex flex-row flex-wrap items-center justify-center gap-x-5 gap-y-7 lg:flex-col lg:items-center lg:justify-center lg:gap-y-5">
            <Circle ref={nextRef} label="Next.js">
              <SiNextdotjs className="size-5 text-zinc-50 sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={nestRef} label="NestJS">
              <SiNestjs className="size-5 text-[#E0234E] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={nxRef} label="Nx">
              <SiNx className="size-5 text-white sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={pgRef} label="PostgreSQL">
              <SiPostgresql className="size-5 text-[#4169E1] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={redisRef} label="Redis">
              <SiRedis className="size-5 text-[#DC382D] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={mongoRef} label="MongoDB">
              <SiMongodb className="size-5 text-[#47A248] sm:size-[1.35rem]" aria-hidden />
            </Circle>
          </div>

          <Hub ref={hubRef}>
            <QrCode
              className="size-8 text-cyan-200 drop-shadow-[0_0_12px_rgba(34,211,238,0.35)] sm:size-9"
              aria-hidden
              strokeWidth={1.75}
            />
          </Hub>

          <div className="flex flex-row flex-wrap items-center justify-center gap-x-5 gap-y-7 lg:flex-col lg:items-center lg:justify-center lg:gap-y-5">
            <Circle ref={kafkaRef} label="Kafka">
              <SiApachekafka className="size-5 text-zinc-100 sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={keycloakRef} label="Keycloak">
              <SiKeycloak className="size-5 text-[#EDEDED] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={dockerRef} label="Docker">
              <SiDocker className="size-5 text-[#2496ED] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={socketRef} label="Socket.io">
              <SiSocketdotio className="size-5 text-zinc-100 sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={cloudinaryRef} label="Cloudinary">
              <SiCloudinary className="size-5 text-[#3448C5] sm:size-[1.35rem]" aria-hidden />
            </Circle>
            <Circle ref={prometheusRef} label="Prometheus">
              <SiPrometheus className="size-5 text-[#E6522C] sm:size-[1.35rem]" aria-hidden />
            </Circle>
          </div>

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nextRef}
            toRef={hubRef}
            curvature={60}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nestRef}
            toRef={hubRef}
            curvature={40}
            delay={0.1}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={nxRef}
            toRef={hubRef}
            curvature={18}
            delay={0.2}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={pgRef}
            toRef={hubRef}
            curvature={-6}
            delay={0.3}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={redisRef}
            toRef={hubRef}
            curvature={-28}
            delay={0.4}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={mongoRef}
            toRef={hubRef}
            curvature={-52}
            delay={0.5}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
          />

          <AnimatedBeam
            containerRef={containerRef}
            fromRef={kafkaRef}
            toRef={hubRef}
            curvature={-52}
            delay={0.55}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={keycloakRef}
            toRef={hubRef}
            curvature={-32}
            delay={0.62}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={dockerRef}
            toRef={hubRef}
            curvature={-10}
            delay={0.69}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={socketRef}
            toRef={hubRef}
            curvature={12}
            delay={0.76}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={cloudinaryRef}
            toRef={hubRef}
            curvature={34}
            delay={0.83}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
          <AnimatedBeam
            containerRef={containerRef}
            fromRef={prometheusRef}
            toRef={hubRef}
            curvature={54}
            delay={0.9}
            duration={4.2}
            pathColor="rgb(63 63 70)"
            pathOpacity={0.2}
            pathWidth={2}
            gradientStartColor="#22d3ee"
            gradientStopColor="#34d399"
            repeatDelay={0.35}
            reverse
          />
        </div>

        <TechStackGrid />
      </div>
    </section>
  );
}
