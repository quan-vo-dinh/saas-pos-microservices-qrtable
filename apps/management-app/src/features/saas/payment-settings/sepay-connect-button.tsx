'use client';

import { Button } from '@/components/ui/button';
import { saasApi } from '@/features/saas/api';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';

export function SepayConnectButton({ label = 'Kết nối SePay' }: { label?: string }) {
  return (
    <Button
      type="button"
      onClick={async () => {
        try {
          const { authorizeUrl } = await saasApi.getSepayAuthorizeUrl();
          window.location.href = authorizeUrl;
        } catch (e) {
          toast.error(e instanceof ApiError ? e.serverMessage : 'Không lấy được URL SePay');
        }
      }}
    >
      {label}
    </Button>
  );
}
