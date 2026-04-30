import { useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ApiError } from '@einvoice/frontend-utils';
import { OrderStatus } from '@einvoice/types';
import { Button } from '@einvoice/frontend-ui';
import { toast } from 'sonner';
import { OrderTrackingStepper } from '@/components/order/order-tracking-stepper';
import { OrderJourneySheet } from '@/components/order/order-journey-sheet';
import { ROUTES } from '@/constants/routes';
import {
  useCancelCustomerOrderMutation,
  useOrderDetailQuery,
} from '@/features/order/hooks/use-order-query';
import { useSession } from '@/features/session/context/session-provider';
import { OPEN_SERVICE_REQUEST_EVENT } from './service-request-drawer';

export function OrderTrackingPage(): React.ReactElement {
  const { orderId } = useParams<{ orderId?: string }>();
  const navigate = useNavigate();
  const { isActive } = useSession();
  const { data: order, isLoading, isError, error, refetch } = useOrderDetailQuery(orderId);
  const cancelOrder = useCancelCustomerOrderMutation();
  const [journeyOpen, setJourneyOpen] = useState(false);

  const isNotFound = error instanceof ApiError && error.status === 404;
  const canCancelPending = order?.status === OrderStatus.PENDING;

  const handleCancelOrder = async (): Promise<void> => {
    if (!order) return;
    try {
      await cancelOrder.mutateAsync({ orderId: order.id });
      toast.success('Đã hủy đơn đang chờ xác nhận');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể hủy đơn. Vui lòng thử lại.');
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">Chưa có phiên đặt món</p>
        <Button onClick={() => navigate(ROUTES.MENU)}>Vào menu</Button>
        <Button variant="outline" onClick={() => navigate(ROUTES.LANDING)}>
          Quét mã QR để bắt đầu
        </Button>
      </div>
    );
  }

  if (!orderId) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">Chưa có đơn theo dõi — hãy đặt món từ menu.</p>
        <Button onClick={() => navigate(ROUTES.MENU)}>Vào menu</Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">Đang tải chi tiết đơn hàng…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">
          {isNotFound ? 'Không tìm thấy đơn hàng này hoặc bạn không có quyền xem.' : 'Không thể tải đơn hàng.'}
        </p>
        <Button onClick={() => void refetch()}>Thử lại</Button>
        <Button variant="outline" onClick={() => navigate(ROUTES.MENU)}>
          Về menu
        </Button>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">Không tìm thấy đơn hàng.</p>
        <Button onClick={() => navigate(ROUTES.MENU)}>Về menu</Button>
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
        <Button className="w-full" onClick={() => window.dispatchEvent(new Event(OPEN_SERVICE_REQUEST_EVENT))}>
          Gọi nhân viên
        </Button>
        <Button variant="secondary" className="w-full" onClick={() => navigate(ROUTES.REQUEST_PAYMENT)}>
          Yêu cầu thanh toán
        </Button>
        {canCancelPending ? (
          <Button
            variant="destructive"
            className="w-full"
            onClick={() => void handleCancelOrder()}
            disabled={cancelOrder.isPending}
          >
            {cancelOrder.isPending ? 'Đang hủy đơn…' : 'Hủy đơn'}
          </Button>
        ) : null}
      </div>
    </div>
  );
}
