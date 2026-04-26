import type { ReactNode } from 'react';
import { PosAppShell } from '@/components/pos/pos-app-shell';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-surface="pos"
      className="min-h-0 flex-1 bg-background text-foreground dark:bg-(--bg) dark:text-(--ink)"
    >
      <PosAppShell>{children}</PosAppShell>
    </div>
  );
}
