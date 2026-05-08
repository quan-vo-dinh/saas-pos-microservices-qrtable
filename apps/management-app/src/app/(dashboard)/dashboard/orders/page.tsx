import { OrdersRefundSection } from '@/features/payment/components/orders-refund-section';

export default function DashboardOrdersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <OrdersRefundSection />
    </div>
  );
}
