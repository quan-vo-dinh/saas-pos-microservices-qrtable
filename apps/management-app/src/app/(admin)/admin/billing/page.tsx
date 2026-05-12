import { Suspense } from 'react';
import { AdminBillingClient } from '@/features/saas/admin-billing/invoices-table';

export default function AdminBillingPage() {
  return (
    <div className="flex flex-col gap-6 p-4 md:p-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">Billing — Subscription invoices</h1>
        <p className="text-muted-foreground text-sm">Đối soát thanh toán Tier 2 cho nền tảng.</p>
      </div>
      <Suspense fallback={<p className="text-muted-foreground text-sm">Đang tải…</p>}>
        <AdminBillingClient />
      </Suspense>
    </div>
  );
}
