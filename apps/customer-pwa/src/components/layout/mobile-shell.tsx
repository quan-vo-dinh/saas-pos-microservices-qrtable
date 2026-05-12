import { useEffect, useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Headphones } from 'lucide-react';
import { Button } from '@einvoice/frontend-ui';
import { MobileHeader } from '@/components/layout/mobile-header';
import { RealtimeStatusPill } from '@/components/realtime/realtime-status-pill';
import { TenantStatusBanner } from '@/features/tenant/tenant-status-banner';
import { useCustomerOrderRealtime } from '@/features/order/hooks/use-customer-order-realtime';
import { OPEN_SERVICE_REQUEST_EVENT, ServiceRequestDrawer } from '@/pages/service-request-drawer';

export function MobileShell(): React.ReactElement {
  const [serviceOpen, setServiceRequestOpen] = useState(false);
  const realtimeStatus = useCustomerOrderRealtime();

  useEffect(() => {
    const onOpen = () => setServiceRequestOpen(true);
    window.addEventListener(OPEN_SERVICE_REQUEST_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SERVICE_REQUEST_EVENT, onOpen);
  }, []);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <RealtimeStatusPill status={realtimeStatus} />
      <MobileHeader />
      <TenantStatusBanner />
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

      <ServiceRequestDrawer open={serviceOpen} onOpenChange={setServiceRequestOpen} />
    </div>
  );
}
