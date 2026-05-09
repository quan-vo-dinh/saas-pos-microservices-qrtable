import { Suspense } from 'react';
import { PosBillsClient } from './pos-bills-client';

export default function PosBillsPage() {
  return (
    <Suspense fallback={<p className="text-xs text-muted-foreground">Đang tải hóa đơn...</p>}>
      <PosBillsClient />
    </Suspense>
  );
}
