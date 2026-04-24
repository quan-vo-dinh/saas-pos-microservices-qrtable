import { Outlet } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { Button } from '@einvoice/frontend-ui';
import { MobileHeader } from '@/components/layout/mobile-header';
import { ServiceRequestDrawer } from '@/pages/service-request-drawer';
import { usePwaMockStore } from '@/mocks/store';
import { usePwaFakeRealtime } from '@/mocks/use-fake-realtime';

export function MobileShell(): React.ReactElement {
  usePwaFakeRealtime();
  const serviceOpen = usePwaMockStore((s) => s.serviceRequestOpen);
  const setServiceRequestOpen = usePwaMockStore((s) => s.setServiceRequestOpen);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <MobileHeader />
      <main className="relative mx-auto w-full max-w-screen-sm px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-4">
        <Outlet />
      </main>

      {!serviceOpen && (
        <Button
          type="button"
          size="icon"
          className="fixed bottom-[max(5.5rem,env(safe-area-inset-bottom))] right-4 z-40 size-14 rounded-full shadow-lg"
          onClick={() => setServiceRequestOpen(true)}
          aria-label="Mở yêu cầu hỗ trợ"
        >
          <Headphones className="size-6" />
        </Button>
      )}

      <ServiceRequestDrawer />
    </div>
  );
}
