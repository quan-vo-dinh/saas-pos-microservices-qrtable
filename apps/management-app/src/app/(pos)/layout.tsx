import type { ReactNode } from 'react';
import { PosAppShell } from '@/components/pos/pos-app-shell';

export default function PosLayout({ children }: { children: ReactNode }) {
  return (
    <div
      data-surface="pos"
      className="flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-background text-foreground dark:bg-(--bg) dark:text-(--ink)"
    >
      <PosAppShell>{children}</PosAppShell>
    </div>
  );
}
