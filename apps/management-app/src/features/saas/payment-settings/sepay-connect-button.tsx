'use client';

import { Button } from '@/components/ui/button';
import { saasService } from '@/features/saas/services/saas.service';
import { toast } from 'sonner';
import { ApiError } from '@einvoice/frontend-utils';

import type { ComponentProps } from 'react';

type SepayConnectButtonProps = {
  label?: string;
} & Pick<ComponentProps<typeof Button>, 'variant' | 'className'>;

export function SepayConnectButton({
  label = 'Kết nối SePay',
  variant = 'default',
  className,
}: SepayConnectButtonProps) {
  return (
    <Button
      type="button"
      variant={variant}
      className={className}
      onClick={async () => {
        try {
          const { authorizeUrl } = await saasService.getSepayAuthorizeUrl();
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
