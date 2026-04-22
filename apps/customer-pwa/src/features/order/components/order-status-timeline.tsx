import { OrderStatus } from '@einvoice/types';
import {
  Clock,
  CheckCircle2,
  ChefHat,
  UtensilsCrossed,
  CircleCheck,
  XCircle,
  FilePenLine,
} from 'lucide-react';
import { cn } from '@einvoice/frontend-utils';

type TimelineStep = {
  key: OrderStatus;
  label: string;
  icon: React.ElementType;
};

/** Luồng chính theo phase-2a (PENDING → … → COMPLETED); DRAFT tách riêng */
const MAIN_STEPS: TimelineStep[] = [
  { key: OrderStatus.PENDING, label: 'Chờ xác nhận', icon: Clock },
  { key: OrderStatus.PROCESSING, label: 'Đang xử lý', icon: ChefHat },
  { key: OrderStatus.READY, label: 'Sẵn sàng phục vụ', icon: UtensilsCrossed },
  { key: OrderStatus.SERVED, label: 'Đã phục vụ', icon: CircleCheck },
  { key: OrderStatus.COMPLETED, label: 'Hoàn tất', icon: CheckCircle2 },
];

const STATUS_TO_MAIN_INDEX: Partial<Record<OrderStatus, number>> = {
  [OrderStatus.PENDING]: 0,
  [OrderStatus.PROCESSING]: 1,
  [OrderStatus.READY]: 2,
  [OrderStatus.SERVED]: 3,
  [OrderStatus.COMPLETED]: 4,
};

type OrderStatusTimelineProps = {
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
};

function getStepState(
  stepIndex: number,
  currentIndex: number,
): 'done' | 'active' | 'pending' {
  if (stepIndex < currentIndex) return 'done';
  if (stepIndex === currentIndex) return 'active';
  return 'pending';
}

export function OrderStatusTimeline({
  status,
  createdAt,
  updatedAt,
}: OrderStatusTimelineProps): React.ReactElement {
  if (status === OrderStatus.CANCELED) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-destructive/10">
          <XCircle className="h-5 w-5 text-destructive" />
        </div>
        <span className="text-sm font-medium text-destructive">Đã hủy</span>
        <span className="text-xs text-muted-foreground">
          {new Date(updatedAt).toLocaleTimeString('vi-VN')}
        </span>
      </div>
    );
  }

  if (status === OrderStatus.DRAFT) {
    return (
      <div className="flex flex-col items-center gap-2 py-4">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
          <FilePenLine className="h-5 w-5 text-muted-foreground" />
        </div>
        <span className="text-sm font-medium text-muted-foreground">Giỏ nháp — chưa gửi đơn</span>
        <span className="text-xs text-muted-foreground">
          {new Date(updatedAt).toLocaleTimeString('vi-VN')}
        </span>
      </div>
    );
  }

  const currentIndex = STATUS_TO_MAIN_INDEX[status] ?? -1;

  return (
    <div className="flex flex-col gap-0 py-2">
      {MAIN_STEPS.map((step, index) => {
        const state = getStepState(index, currentIndex);
        const Icon = step.icon;
        const isLast = index === MAIN_STEPS.length - 1;

        return (
          <div key={step.key} className="flex gap-3">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
                  state === 'done' && 'bg-green-500 text-white',
                  state === 'active' &&
                    'bg-primary text-primary-foreground ring-4 ring-primary/20',
                  state === 'pending' && 'bg-muted text-muted-foreground',
                )}
              >
                <Icon className="h-4 w-4" />
              </div>
              {!isLast && (
                <div
                  className={cn(
                    'w-0.5 flex-1 min-h-4',
                    state === 'done' || state === 'active'
                      ? 'bg-green-500'
                      : 'bg-muted',
                  )}
                />
              )}
            </div>

            <div className="flex flex-col pb-4">
              <span
                className={cn(
                  'text-sm leading-8',
                  state === 'done' && 'font-medium text-green-700',
                  state === 'active' && 'font-semibold text-primary',
                  state === 'pending' && 'text-muted-foreground',
                )}
              >
                {step.label}
              </span>
              {state === 'active' && (
                <span className="text-xs text-muted-foreground">
                  {new Date(updatedAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
              {index === 0 && state === 'done' && (
                <span className="text-xs text-muted-foreground">
                  {new Date(createdAt).toLocaleTimeString('vi-VN')}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
