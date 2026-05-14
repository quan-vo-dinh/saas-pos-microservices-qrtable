import type { ReactElement } from 'react';
import type { IconType } from 'react-icons';
import {
  SiApachekafka,
  SiChartdotjs,
  SiCloudinary,
  SiCommitlint,
  SiContactlesspayment,
  SiDocker,
  SiEslint,
  SiFramer,
  SiGrafana,
  SiGit,
  SiKeycloak,
  SiLucide,
  SiMongodb,
  SiMongoose,
  SiNestjs,
  SiNextdotjs,
  SiNx,
  SiOpentelemetry,
  SiPostgresql,
  SiPrettier,
  SiPrometheus,
  SiPwa,
  SiRadixui,
  SiReact,
  SiReacthookform,
  SiReactquery,
  SiRedis,
  SiShadcnui,
  SiSocketdotio,
  SiTailwindcss,
  SiTypeorm,
  SiTypescript,
  SiVite,
  SiZod,
} from 'react-icons/si';
import { cn } from '@/lib/utils';

type StackRow = {
  label: string;
  hint?: string;
  Icon: IconType | 'zustand-mark';
};

const ZustandMark = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden fill="currentColor">
    <circle cx="8.5" cy="9.5" r="2.2" />
    <circle cx="15.5" cy="9.5" r="2.2" />
    <ellipse cx="12" cy="14.5" rx="7" ry="5.5" />
  </svg>
);

const GROUPS: { title: string; rows: StackRow[] }[] = [
  {
    title: 'Monorepo & backend (§4.1)',
    rows: [
      { label: 'NestJS', Icon: SiNestjs, hint: 'Framework microservices' },
      { label: 'TypeScript', Icon: SiTypescript },
      { label: 'Nx', Icon: SiNx, hint: 'Monorepo, affected, pipeline' },
      { label: 'TypeORM', Icon: SiTypeorm, hint: 'PostgreSQL ORM' },
    ],
  },
  {
    title: 'Cơ sở dữ liệu & cache',
    rows: [
      { label: 'PostgreSQL', Icon: SiPostgresql },
      { label: 'MongoDB', Icon: SiMongodb, hint: 'Audit / analytics' },
      { label: 'Mongoose', Icon: SiMongoose },
      { label: 'Redis', Icon: SiRedis, hint: 'Cache, session, rate limit' },
    ],
  },
  {
    title: 'Luồng sự kiện & thời gian thực',
    rows: [
      { label: 'Apache Kafka', Icon: SiApachekafka },
      { label: 'Socket.io', Icon: SiSocketdotio, hint: 'WebSocket gateway' },
    ],
  },
  {
    title: 'Nhận dạng & thanh toán',
    rows: [
      { label: 'Keycloak', Icon: SiKeycloak, hint: 'OAuth 2.0 / OIDC' },
      {
        label: 'SePay · VietQR',
        Icon: SiContactlesspayment,
        hint: 'Chuyển khoản QR — tích hợp VietQR (không có logo Simple Icons riêng)',
      },
    ],
  },
  {
    title: 'Lưu trữ & triển khai',
    rows: [
      { label: 'Cloudinary', Icon: SiCloudinary, hint: 'Ảnh menu, QR export' },
      { label: 'Docker · Compose', Icon: SiDocker },
    ],
  },
  {
    title: 'Quan sát (Grafana stack + OTel)',
    rows: [
      {
        label: 'Grafana · Loki · Promtail',
        Icon: SiGrafana,
        hint: 'Dashboard, log tập trung, thu thập log Docker',
      },
      { label: 'Prometheus', Icon: SiPrometheus },
      {
        label: 'Grafana Tempo',
        Icon: SiGrafana,
        hint: 'Distributed tracing (cùng hệ Grafana; không có SiTempo trong react-icons 5.6)',
      },
      { label: 'OpenTelemetry', Icon: SiOpentelemetry },
    ],
  },
  {
    title: 'Frontend — Customer PWA (§4.3)',
    rows: [
      { label: 'React', Icon: SiReact },
      { label: 'Vite', Icon: SiVite },
      { label: 'Service Worker', Icon: SiPwa, hint: 'Offline-first' },
      { label: 'TanStack Query', Icon: SiReactquery },
      { label: 'Zustand', Icon: 'zustand-mark', hint: 'State cục bộ (mascot đơn giản — chưa có SiZustand trong react-icons 5.6)' },
      { label: 'React Hook Form', Icon: SiReacthookform },
      { label: 'Zod', Icon: SiZod },
    ],
  },
  {
    title: 'Frontend — Management App (§4.3 + codebase)',
    rows: [
      { label: 'Next.js', Icon: SiNextdotjs, hint: 'App Router' },
      { label: 'Tailwind CSS', Icon: SiTailwindcss },
      { label: 'shadcn/ui', Icon: SiShadcnui },
      { label: 'Radix UI', Icon: SiRadixui },
      { label: 'Lucide', Icon: SiLucide },
      { label: 'Framer Motion', Icon: SiFramer, hint: 'Motion / animation' },
      {
        label: 'Chart.js · Recharts',
        Icon: SiChartdotjs,
        hint: 'Tài liệu §4.3: Chart.js; management-app: Recharts',
      },
    ],
  },
  {
    title: 'Chất lượng mã & commit',
    rows: [
      { label: 'ESLint', Icon: SiEslint },
      { label: 'Prettier', Icon: SiPrettier },
      { label: 'Husky', Icon: SiGit, hint: 'Git hooks (không có SiHusky — dùng biểu tượng Git hooks)' },
      { label: 'Commitlint', Icon: SiCommitlint },
    ],
  },
];

function RowIcon({ row, className }: { row: StackRow; className?: string }) {
  if (row.Icon === 'zustand-mark') {
    return <ZustandMark className={className} />;
  }
  const I = row.Icon;
  return <I className={className} aria-hidden />;
}

export function TechStackGrid(): ReactElement {
  return (
    <div className="mx-auto mt-12 max-w-6xl">
      <h3 className="text-center font-sans text-lg font-medium tracking-tight text-zinc-200 sm:text-xl">
        Toàn bộ ngăn xếp theo tài liệu kiến trúc §4
      </h3>
      <p className="mx-auto mt-2 max-w-2xl text-center font-sans text-xs text-zinc-500 sm:text-sm">
        Cùng một luồng sản phẩm: các lớp công nghệ phục vụ chung <span className="text-zinc-400">NỀN TẢNG</span> QRTable
        (đặt món qua QR). Logo thương hiệu từ{' '}
        <span className="text-zinc-400">Simple Icons</span> (react-icons/si). Một vài mục không có icon chính thức
        trong bộ — dùng biểu tượng gần nhất và ghi chú trong tooltip.
      </p>
      <div className="mt-8 grid gap-8 sm:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((g) => (
          <div
            key={g.title}
            className="rounded-xl border border-zinc-800/90 bg-zinc-950/50 p-4 shadow-inner shadow-black/20"
          >
            <h4 className="border-b border-zinc-800/80 pb-2 font-mono text-[10px] font-semibold uppercase tracking-wider text-cyan-500/90 sm:text-[11px]">
              {g.title}
            </h4>
            <ul className="mt-3 flex flex-col gap-2">
              {g.rows.map((row) => (
                <li key={row.label}>
                  <div
                    title={row.hint}
                    className={cn(
                      'flex items-center gap-2.5 rounded-lg border border-zinc-800/60 bg-zinc-900/40 px-2.5 py-2 text-zinc-200',
                      row.hint && 'cursor-help',
                    )}
                  >
                    <span className="flex size-9 shrink-0 items-center justify-center rounded-md border border-zinc-700/80 bg-zinc-950 text-[1.15rem] text-zinc-100 [&>svg]:size-[1.15rem]">
                      <RowIcon row={row} className="size-[1.15rem]" />
                    </span>
                    <span className="font-sans text-sm font-medium leading-snug">{row.label}</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
