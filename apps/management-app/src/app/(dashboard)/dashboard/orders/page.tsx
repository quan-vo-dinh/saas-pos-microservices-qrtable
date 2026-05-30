import { PaymentHistorySection } from '@/features/payment/components/payment-history-section';

export default function DashboardOrdersPage() {
  return (
    <div className="flex flex-col gap-6 p-6">
      <PaymentHistorySection />
    </div>
  );
}
