import { Suspense } from 'react';
import Link from 'next/link';
import { TableMapGrid } from '@/components/pos/table-map-grid';
import { ROUTES } from '@/constants/routes';

export default function PosTablesPage() {
  return (
    <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden sm:gap-4">
      <div className="shrink-0">
        <div>
          <p className="text-sm text-muted-foreground">
            Sơ đồ phục vụ — chọn bàn để xem chi tiết đơn bên phải.{' '}
            <Link
              href={ROUTES.TABLES}
              className="font-medium text-primary underline-offset-4 hover:underline"
            >
              Cấu hình khu vực, bàn và QR
            </Link>{' '}
            (trang quản trị).
          </p>
        </div>
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="text-sm text-muted-foreground" data-slot="pos-tables-fallback">
              Đang tải sơ đồ bàn…
            </div>
          }
        >
          <TableMapGrid />
        </Suspense>
      </div>
    </div>
  );
}
