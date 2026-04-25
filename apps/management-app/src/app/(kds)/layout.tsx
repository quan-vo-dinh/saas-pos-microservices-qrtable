import type { ReactNode } from 'react';
import { DM_Sans, JetBrains_Mono } from 'next/font/google';

const kdsSans = DM_Sans({
  subsets: ['latin', 'latin-ext'],
  weight: ['500', '600', '700'],
  variable: '--font-kds-body',
  display: 'swap',
});

const kdsMono = JetBrains_Mono({
  subsets: ['latin', 'latin-ext'],
  variable: '--font-kds-mono',
  display: 'swap',
});

/** Full-bleed KDS shell (no management sidebar) — navigate via KDS header links. */
export default function KdsLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-surface="kds"
      className={`${kdsSans.variable} ${kdsMono.variable} min-h-screen bg-[var(--bg)] font-[family-name:var(--font-kds-body)] text-[var(--ink)] antialiased`}
    >
      {children}
    </div>
  );
}
