import { OrderItemStatus, OrderStatus } from '@einvoice/types';
import { cn } from '@/lib/utils';

/**
 * Màu chip trạng thái đơn — tách light/dark vì các token pastel + chữ sáng
 * (text-amber-100) trước đây gần như vô hình trên nền sáng.
 */
export function orderStatusChipClass(status: OrderStatus): string {
  switch (status) {
    case OrderStatus.DRAFT:
      return 'bg-muted text-muted-foreground';
    case OrderStatus.PENDING:
      return cn('bg-amber-500/15 text-amber-950 dark:bg-amber-500/20 dark:text-amber-100');
    case OrderStatus.PROCESSING:
      return cn('bg-cyan-500/15 text-cyan-950 dark:bg-cyan-500/20 dark:text-cyan-100');
    case OrderStatus.READY:
      return cn('bg-violet-500/15 text-violet-950 dark:bg-violet-500/20 dark:text-violet-100');
    case OrderStatus.SERVED:
      return cn('bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/20 dark:text-emerald-100');
    case OrderStatus.COMPLETED:
      return cn('bg-slate-500/12 text-slate-900 dark:bg-slate-500/20 dark:text-slate-100');
    case OrderStatus.CANCELED:
      return 'bg-destructive/15 text-destructive dark:bg-destructive/20';
  }
}

/** Chip nhỏ cho dòng món / hover — cùng palette, font mono nhỏ. */
export function orderItemStatusChipClass(status: OrderItemStatus): string {
  switch (status) {
    case OrderItemStatus.PROCESSING:
      return cn('border-transparent bg-cyan-500/15 text-cyan-950 dark:bg-cyan-500/25 dark:text-cyan-100');
    case OrderItemStatus.READY:
      return cn('border-transparent bg-violet-500/15 text-violet-950 dark:bg-violet-500/25 dark:text-violet-100');
    case OrderItemStatus.SERVED:
      return cn('border-transparent bg-emerald-500/15 text-emerald-950 dark:bg-emerald-500/25 dark:text-emerald-100');
    case OrderItemStatus.CANCELED:
      return 'border-transparent bg-destructive/15 text-destructive dark:bg-destructive/20';
  }
}
