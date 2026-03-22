'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

type MainProps = {
  children: ReactNode;
  className?: string;
  fixed?: boolean;
};

export function Main({ children, className, fixed }: MainProps) {
  return (
    <main
      id="content"
      className={cn(
        'flex flex-1 flex-col p-4 md:p-6',
        fixed && 'overflow-hidden',
        className
      )}
      {...(fixed ? { 'data-layout': 'fixed' } : {})}
    >
      {children}
    </main>
  );
}
