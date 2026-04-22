import { PaymentMethod } from '@einvoice/types';
import type { LucideIcon } from 'lucide-react';
import { Banknote } from 'lucide-react';
import { cn } from '@einvoice/frontend-utils';

type PaymentMethodSelectorProps = {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
};

/** Phase 2A: chỉ CASH — Phase 3 mở rộng theo `bill.types.ts` */
const METHODS: { value: PaymentMethod; label: string; icon: LucideIcon }[] = [
  { value: PaymentMethod.CASH, label: 'Tiền mặt', icon: Banknote },
];

export function PaymentMethodSelector({
  value,
  onChange,
}: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <h2 className="text-base font-semibold">Phương thức thanh toán</h2>
      <div className="flex flex-col gap-2">
        {METHODS.map((method) => {
          const isSelected = value === method.value;
          const Icon = method.icon;

          return (
            <button
              key={method.value}
              type="button"
              onClick={() => onChange(method.value)}
              className={cn(
                'flex items-center gap-3 rounded-lg border p-3 text-left transition-colors',
                isSelected
                  ? 'border-primary bg-primary/5 text-primary ring-1 ring-primary'
                  : 'border-muted hover:bg-muted/50',
              )}
            >
              <Icon className="h-5 w-5 shrink-0" />
              <span className="flex-1 text-sm font-medium">{method.label}</span>
              <div
                className={cn(
                  'flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2',
                  isSelected ? 'border-primary' : 'border-muted-foreground/30',
                )}
              >
                {isSelected && (
                  <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
