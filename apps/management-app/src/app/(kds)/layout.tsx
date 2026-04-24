import type { ReactNode } from 'react';

/** Full-bleed KDS shell (no management sidebar) — navigate via KDS header links. */
export default function KdsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="kds" className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      {children}
    </div>
  );
}
