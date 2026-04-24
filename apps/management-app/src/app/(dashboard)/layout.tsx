import type { ReactNode } from 'react';

import { ManagementWorkspaceLayout } from '@/components/layout/management-workspace-layout';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return <ManagementWorkspaceLayout showGlobalSearch>{children}</ManagementWorkspaceLayout>;
}

