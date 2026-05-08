import type { ReactNode } from 'react';

import { ManagementWorkspaceLayout } from '@/components/layout/management-workspace-layout';

export default function KdsLayout({ children }: { children: ReactNode }) {
  return <ManagementWorkspaceLayout>{children}</ManagementWorkspaceLayout>;
}
