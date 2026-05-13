import Link from 'next/link';
import clsx from 'clsx';

type LandingHeaderProps = {
  productName: string;
};

const nav = [
  { href: '#flow', label: 'Khách đến thanh toán' },
  { href: '#automation', label: 'Cách triển khai' },
  { href: '#pricing', label: 'Bảng giá' },
  { href: '#payment', label: 'Thu tiền an toàn' },
  { href: '#contact', label: 'Liên hệ' },
] as const;

export function LandingHeader({ productName }: LandingHeaderProps): React.ReactElement {
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800/80 bg-zinc-950/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-[72px]">
        <Link
          href="/"
          className="font-sans text-sm font-semibold tracking-tight text-zinc-100 transition hover:text-cyan-300 sm:text-base"
        >
          {productName}
          <span className="ml-2 hidden font-mono text-[10px] font-normal text-zinc-500 sm:inline">QR · POS</span>
        </Link>
        <nav className="hidden items-center gap-1 md:flex" aria-label="Điều hướng landing">
          {nav.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className={clsx(
                'cursor-pointer rounded-md px-3 py-2 font-mono text-xs text-zinc-400 transition',
                'hover:bg-zinc-900 hover:text-cyan-300 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500',
              )}
            >
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          <a
            href="#pricing"
            className="cursor-pointer rounded-md bg-cyan-500 px-3 py-2 font-mono text-xs font-medium text-zinc-950 transition hover:bg-cyan-400 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-300"
          >
            Bảng giá
          </a>
          <Link
            href="/login"
            className="cursor-pointer rounded-md border border-zinc-700 px-3 py-2 font-mono text-xs font-medium text-zinc-200 transition hover:border-zinc-500 hover:bg-zinc-900 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-cyan-500"
          >
            Đăng nhập
          </Link>
        </div>
      </div>
    </header>
  );
}
