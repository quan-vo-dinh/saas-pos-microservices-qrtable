'use client';

import type { ReactNode } from 'react';

type Props = {
  enabled: boolean;
  locked: ReactNode;
  children: ReactNode;
};

/** Renders children when enabled; otherwise shows locked placeholder without mounting children. */
export function ReportFeatureGate({ enabled, locked, children }: Props) {
  if (!enabled) {
    return <>{locked}</>;
  }
  return <>{children}</>;
}
