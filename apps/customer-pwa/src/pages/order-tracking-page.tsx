import { useNavigate } from 'react-router-dom';
import { Button } from '@einvoice/frontend-ui';
import { getOrdersBySession } from '@einvoice/mock-data';
import { useSession } from '@/features/session/context/session-provider';
import { OrderSummaryCard } from '@/features/order/components/order-summary-card';
import { ROUTES } from '@/constants/routes';

export function OrderTrackingPage(): React.ReactElement {
  const { session, isActive } = useSession();
  const navigate = useNavigate();

  if (!isActive || !session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 px-4 py-16">
        <p className="text-center text-muted-foreground">
          Chưa có phiên đặt món
        </p>
        <Button onClick={() => navigate(ROUTES.LANDING)}>
          Quét mã QR để bắt đầu
        </Button>
      </div>
    );
  }

  let orders = getOrdersBySession(session.sessionId);
  if (orders.length === 0) {
    orders = getOrdersBySession('session-001');
  }

  return (
    <div className="flex flex-col gap-4 px-4 py-4">
      <h1 className="text-lg font-semibold">Theo dõi đơn hàng</h1>

      {orders.length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Chưa có đơn hàng nào
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          {orders.map((order) => (
            <OrderSummaryCard key={order.id} order={order} />
          ))}
        </div>
      )}

      <div className="flex flex-col gap-2 pt-2">
        <Button
          variant="outline"
          className="w-full"
          onClick={() => navigate(ROUTES.MENU)}
        >
          Thêm món
        </Button>
        <Button
          className="w-full"
          onClick={() => navigate(ROUTES.REQUEST_PAYMENT)}
        >
          Yêu cầu thanh toán
        </Button>
      </div>
    </div>
  );
}
