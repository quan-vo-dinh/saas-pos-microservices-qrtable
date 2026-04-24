import { motion } from 'framer-motion';
import { OrderStatus, type Order } from '@einvoice/types';
import { Badge } from '@einvoice/frontend-ui';
import { cn } from '@/lib/utils';

const STEPS: { status: (typeof OrderStatus)[keyof typeof OrderStatus]; label: string }[] = [
  { status: OrderStatus.DRAFT, label: 'Nháp' },
  { status: OrderStatus.PENDING, label: 'Chờ xác nhận' },
  { status: OrderStatus.PROCESSING, label: 'Đang làm' },
  { status: OrderStatus.READY, label: 'Sẵn sàng' },
  { status: OrderStatus.SERVED, label: 'Đã phục vụ' },
];

function stepIndex(order: Order): number {
  const idx = STEPS.findIndex((s) => s.status === order.status);
  if (idx >= 0) return idx;
  if (order.status === OrderStatus.COMPLETED) return STEPS.length - 1;
  if (order.status === OrderStatus.CANCELED) return 1;
  return 0;
}

function formatTs(iso?: string): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' });
}

type OrderTrackingStepperProps = {
  order: Order;
  onOpenJourney: () => void;
};

export function OrderTrackingStepper({ order, onOpenJourney }: OrderTrackingStepperProps): React.ReactElement {
  const active = stepIndex(order);

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        className="flex w-full flex-col items-start gap-1 rounded-lg border border-border/80 bg-card/60 p-3 text-left transition-colors hover:bg-accent/40"
        onClick={onOpenJourney}
      >
        <span className="text-xs font-medium text-muted-foreground">Trạng thái đơn (chạm để xem hành trình)</span>
        <Badge variant="secondary" className="mt-1">
          {STEPS[Math.min(active, STEPS.length - 1)]?.label ?? order.status}
        </Badge>
      </button>

      <div className="relative flex justify-between gap-1 px-1">
        <div className="absolute left-3 right-3 top-4 h-px bg-border" aria-hidden />
        {STEPS.map((step, i) => {
          const done = i < active;
          const current = i === active;
          const ts =
            i === 0
              ? order.createdAt
              : i === 1
                ? order.status === OrderStatus.PENDING
                  ? order.updatedAt
                  : order.createdAt
                : i === 2
                  ? order.confirmedAt ?? order.updatedAt
                  : order.updatedAt;
          return (
            <div key={step.status} className="relative z-[1] flex min-w-0 flex-1 flex-col items-center gap-2 text-center">
              <motion.div
                layout
                className={cn(
                  'flex size-8 items-center justify-center rounded-full border-2 text-xs font-semibold',
                  done && 'border-primary bg-primary text-primary-foreground',
                  current && 'border-primary bg-background text-primary ring-4 ring-primary/25',
                  !done && !current && 'border-muted bg-muted text-muted-foreground',
                )}
                animate={current ? { scale: [1, 1.06, 1] } : { scale: 1 }}
                transition={current ? { repeat: Infinity, duration: 2.2, ease: 'easeInOut' } : undefined}
              >
                {i + 1}
              </motion.div>
              <span className="line-clamp-2 text-[10px] font-medium leading-tight text-muted-foreground">{step.label}</span>
              <span className="text-[9px] tabular-nums text-muted-foreground">{formatTs(ts)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
