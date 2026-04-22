import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { OrderStatus, PaymentMethod } from '@einvoice/types';
import { getOrdersBySession } from '@einvoice/mock-data';
import { useSession } from '@/features/session/context/session-provider';
import { ROUTES } from '@/constants/routes';
import { PaymentSummaryCard } from '@/features/payment/components/payment-summary-card';
import { PaymentMethodSelector } from '@/features/payment/components/payment-method-selector';
import { PaymentConfirmButton } from '@/features/payment/components/payment-confirm-button';
import { PaymentSuccessCard } from '@/features/payment/components/payment-success-card';

const METHOD_LABELS: Record<PaymentMethod, string> = {
  [PaymentMethod.CASH]: 'Tiền mặt',
};

export function RequestPaymentPage() {
  const navigate = useNavigate();
  const { session, isActive } = useSession();
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [isSuccess, setIsSuccess] = useState(false);

  const sessionId = session?.sessionId ?? 'session-001';
  const orders = getOrdersBySession(sessionId);
  /** Mock: chưa có Bill API (Step 2.4+) — coi đơn chưa COMPLETED/CANCELED là còn phải thanh toán */
  const unpaidOrders = orders.filter(
    (o) => o.status !== OrderStatus.COMPLETED && o.status !== OrderStatus.CANCELED,
  );
  const totalAmount = unpaidOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  if (!isActive && !session) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Chưa có phiên đặt món</p>
        <button onClick={() => navigate(ROUTES.LANDING)}>
          Quay về trang chủ
        </button>
      </div>
    );
  }

  if (isSuccess) {
    return (
      <div className="flex flex-col gap-6 py-8">
        <PaymentSuccessCard
          totalAmount={totalAmount}
          paymentMethod={METHOD_LABELS[paymentMethod]}
          onBackToMenu={() => navigate(ROUTES.MENU)}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Thanh toán</h1>
      <PaymentSummaryCard orders={unpaidOrders} />
      <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
      <PaymentConfirmButton
        totalAmount={totalAmount}
        disabled={unpaidOrders.length === 0}
        onConfirm={() => setIsSuccess(true)}
      />
    </div>
  );
}
