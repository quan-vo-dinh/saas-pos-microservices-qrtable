'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ROUTES } from '@/constants/routes';
import { saasApi } from '@/features/saas/api';
import { SepayBankPicker } from '@/features/saas/payment-settings/sepay-bank-picker';

function SepayCallbackInner() {
  const router = useRouter();
  const sp = useSearchParams();
  const code = sp.get('code') ?? '';
  const state = sp.get('state') ?? '';

  const q = useQuery({
    queryKey: ['sepay-oauth-callback', code, state],
    queryFn: () => saasApi.handleSepayCallback({ code, state }),
    enabled: Boolean(code && state),
    retry: false,
  });

  if (!code || !state) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-destructive text-sm">Thiếu tham số callback.</p>
        <Button asChild variant="outline">
          <Link href={ROUTES.DASHBOARD_PAYMENT_SETTINGS}>Về cài đặt thanh toán</Link>
        </Button>
      </div>
    );
  }

  if (q.isError) {
    return (
      <div className="space-y-4 p-6">
        <p className="text-destructive text-sm">{(q.error as Error).message}</p>
        <Button asChild variant="outline">
          <Link href={ROUTES.DASHBOARD_PAYMENT_SETTINGS}>Về cài đặt thanh toán</Link>
        </Button>
      </div>
    );
  }

  if (q.isLoading || !q.data) {
    return <p className="text-muted-foreground p-6 text-sm">Đang xử lý callback SePay…</p>;
  }

  if (q.data.banks?.length) {
    return (
      <div className="p-6">
        <SepayBankPicker banks={q.data.banks} onDone={() => router.push(ROUTES.DASHBOARD_PAYMENT_SETTINGS)} />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-6">
      <p className="text-sm">Kết nối SePay hoàn tất.</p>
      <Button asChild>
        <Link href={ROUTES.DASHBOARD_PAYMENT_SETTINGS}>Về cài đặt thanh toán</Link>
      </Button>
    </div>
  );
}

export default function SepayCallbackPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground p-6 text-sm">Đang tải…</p>}>
      <SepayCallbackInner />
    </Suspense>
  );
}
