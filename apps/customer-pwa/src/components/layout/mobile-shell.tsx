import { Outlet } from 'react-router-dom';
import { MobileHeader } from '@/components/layout/mobile-header';

export function MobileShell() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileHeader />
      <main className="mx-auto w-full max-w-screen-sm px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>
    </div>
  );
}
