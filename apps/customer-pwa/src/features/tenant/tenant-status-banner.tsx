import { tenantLifecycleReasonVi } from '@einvoice/shared-constants';
import { AlertTriangle, Store } from 'lucide-react';
import { useTenantStatus } from '@/features/tenant/use-tenant-status';

export function TenantStatusBanner() {
  const { status, reason } = useTenantStatus();

  if (status === 'ACTIVE') {
    return null;
  }

  const isClosed = status === 'CLOSED';

  return (
    <div
      role="status"
      className="border-b border-amber-600/40 bg-amber-50 px-4 py-3 text-amber-950 dark:border-amber-500/35 dark:bg-amber-950/40 dark:text-amber-50"
    >
      <div className="mx-auto flex max-w-screen-sm gap-3">
        {isClosed ? (
          <Store className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
        ) : (
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-amber-800 dark:text-amber-200" aria-hidden />
        )}
        <div className="min-w-0 space-y-1 text-sm leading-snug">
          {isClosed ? (
            <>
              <p className="font-semibold">Cửa hàng không còn hoạt động trên QRTable</p>
              <p className="text-amber-900/90 dark:text-amber-100/90">
                Vui lòng liên hệ nhân viên tại quầy.
                {reason ? ` (${tenantLifecycleReasonVi(reason)})` : ''}
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold">Cửa hàng đang tạm khóa</p>
              <p className="text-amber-900/90 dark:text-amber-100/90">
                Nhà hàng hiện chưa nhận đơn qua QRTable. Vui lòng liên hệ nhân viên tại quầy.
                {reason ? ` (${tenantLifecycleReasonVi(reason)})` : ''}
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
