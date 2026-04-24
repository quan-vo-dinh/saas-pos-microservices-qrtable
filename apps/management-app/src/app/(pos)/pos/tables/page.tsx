import { Suspense } from 'react';
import { TableMapGrid } from '@/components/pos/table-map-grid';

export default function PosTablesPage() {
  return (
    <Suspense
      fallback={
        <div className="text-sm text-muted-foreground" data-slot="pos-tables-fallback">
          Đang tải sơ đồ bàn…
        </div>
      }
    >
      <TableMapGrid />
    </Suspense>
  );
}
