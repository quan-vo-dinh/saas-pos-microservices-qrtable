import type { ReactNode } from 'react';
import { AppShell } from '@/components/layout/app-shell';

export default function KdsLayout({ children }: { children: ReactNode }) {
  return (
    <div data-surface="kds" className="min-h-0 flex-1 bg-[var(--bg)] text-[var(--ink)]">
      <AppShell>{children}</AppShell>
    </div>
  );
}
