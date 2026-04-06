import { useState } from 'react';
import { Button } from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { Loader2 } from 'lucide-react';

type PaymentConfirmButtonProps = {
  totalAmount: number;
  disabled?: boolean;
  onConfirm: () => void;
};

export function PaymentConfirmButton({
  totalAmount,
  disabled = false,
  onConfirm,
}: PaymentConfirmButtonProps) {
  const [isLoading, setIsLoading] = useState(false);

  function handleClick(): void {
    if (isLoading || disabled) return;

    setIsLoading(true);
    setTimeout(() => {
      onConfirm();
      setIsLoading(false);
    }, 1000);
  }

  return (
    <Button
      className="w-full"
      size="lg"
      disabled={disabled || isLoading}
      onClick={handleClick}
    >
      {isLoading ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Đang xử lý...
        </>
      ) : (
        `Yêu cầu thanh toán — ${formatCurrency(totalAmount)}`
      )}
    </Button>
  );
}
