import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@einvoice/frontend-ui';
import { OrderTrackingStepper } from '@/components/order/order-tracking-stepper';
import { OrderJourneySheet } from '@/components/order/order-journey-sheet';
import { ROUTES } from '@/constants/routes';
import { useSession } from '@/features/session/context/session-provider';
import { usePwaMockStore } from '@/mocks/store';
export function OrderTrackingPage(): React.ReactElement {
  const navigate = useNavigate();
  const { isActive } = useSession();
  const order = usePwaMockStore((s) => s.order);
  const setServiceRequestOpen = usePwaMockStore((s) => s.setServiceRequestOpen);
  const [journeyOpen, setJourneyOpen] = useState(false);

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">
          {!isActive ? 'Chưa có phiên đặt món' : 'Chưa có đơn theo dõi — hãy đặt món từ menu (mock).'}
        </p>
        <Button onClick={() => navigate(ROUTES.MENU)}>Vào menu</Button>
        {!isActive ? (
          <Button variant="outline" onClick={() => navigate(ROUTES.LANDING)}>
            Quét mã QR để bắt đầu
          </Button>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 px-1 py-2">
      <h1 className="text-lg font-semibold tracking-tight">Theo dõi đơn hàng</h1>
      <OrderTrackingStepper order={order} onOpenJourney={() => setJourneyOpen(true)} />
      <OrderJourneySheet order={order} open={journeyOpen} onOpenChange={setJourneyOpen} />

      <div className="rounded-lg border border-border/80 bg-card/40 p-3">
        <p className="text-sm font-medium">Món trong đơn</p>
        <ul className="mt-2 flex flex-col gap-2">
          {order.items.map((it) => (
            <li key={it.id} className="flex justify-between gap-2 text-sm">
              <span className="min-w-0 truncate">
                {it.menuItemName} ×{it.quantity}
              </span>
              <span className="shrink-0 text-muted-foreground">{it.status}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 pt-2">
        <Button variant="outline" className="w-full" onClick={() => navigate(ROUTES.MENU)}>
          Thêm món
        </Button>
        <Button className="w-full" onClick={() => setServiceRequestOpen(true)}>
          Gọi nhân viên
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate(ROUTES.REQUEST_PAYMENT)}>
          Yêu cầu thanh toán
        </Button>
      </div>
    </div>
  );
}
