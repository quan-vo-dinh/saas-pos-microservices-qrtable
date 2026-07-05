import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCurrency } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Popover,
  PopoverContent,
  PopoverTrigger,
  ScrollArea,
  Separator,
  Textarea,
} from '@einvoice/frontend-ui';
import { ROUTES } from '@/constants/routes';
import {
  useCartMutations,
  useCustomerCartQuery,
  useSubmitOrderMutation,
} from '@/features/order/hooks/use-order-query';
import { createAndPersistIdempotencyKey } from '@/lib/idempotency';
import { useTenantStatus } from '@/features/tenant/use-tenant-status';

const NOTE_CHIPS = ['Không cay', 'Ít muối', 'Không hành'] as const;

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartDrawer({ open, onOpenChange }: CartDrawerProps): React.ReactElement {
  const navigate = useNavigate();
  const { data: cart, isLoading } = useCustomerCartQuery();
  const { setQuantity, updateNote, removeLine, clearCart, isUpdating } = useCartMutations();
  const submitOrder = useSubmitOrderMutation();
  const { canOrder } = useTenantStatus();
  const orderBlocked = !canOrder;

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const submitInFlightRef = useRef(false);

  const items = cart?.items ?? [];
  const totalAmount = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalItems = items.reduce((s, l) => s + l.quantity, 0);
  const isSubmittingOrder = submitOrder.isPending;

  const handleSubmitOrder = async (): Promise<void> => {
    if (orderBlocked || items.length === 0 || submitInFlightRef.current || isSubmittingOrder) {
      return;
    }

    submitInFlightRef.current = true;
    try {
      const data = await submitOrder.mutateAsync({
        idempotencyKey: createAndPersistIdempotencyKey(),
      });
      onOpenChange(false);
      toast.success('Đơn đã được gửi');
      navigate(ROUTES.ORDER_TRACKING_DETAIL(data.order.id));
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi đơn. Vui lòng thử lại.');
    } finally {
      submitInFlightRef.current = false;
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh] bg-background">
          <DrawerHeader className="text-left">
            <DrawerTitle>Giỏ hàng</DrawerTitle>
            <DrawerDescription>
              {orderBlocked
                ? 'Cửa hàng tạm không nhận đơn mới — bạn vẫn xem được giỏ đã chọn.'
                : isLoading
                  ? 'Đang tải…'
                  : `${totalItems} món · ${formatCurrency(totalAmount)}`}
            </DrawerDescription>
          </DrawerHeader>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <ShoppingBag className="size-12 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Đang đồng bộ giỏ hàng…</p>
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <ShoppingBag className="size-12 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Giỏ hàng trống</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[48vh] px-4">
                <ul className="flex flex-col gap-3 pb-2">
                  {items.map((line) => (
                    <li key={line.cartLineId} className="relative overflow-hidden rounded-lg border border-border/80">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground">
                        <Trash2 className="size-5" aria-hidden />
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -88, right: 0 }}
                        dragElastic={0.06}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -80 && !isUpdating && !orderBlocked) removeLine(line.cartLineId);
                        }}
                        className="relative bg-card"
                      >
                        <div
                          role="button"
                          tabIndex={0}
                          className="flex w-full flex-col gap-2 p-3 text-left"
                          onClick={() => setExpandedId((id) => (id === line.cartLineId ? null : line.cartLineId))}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter' || e.key === ' ') {
                              e.preventDefault();
                              setExpandedId((id) => (id === line.cartLineId ? null : line.cartLineId));
                            }
                          }}
                        >
                          <div className="flex items-center gap-3">
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{line.menuItemName}</p>
                              <p className="text-xs text-muted-foreground">{formatCurrency(line.unitPrice)}</p>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8"
                                disabled={isUpdating || orderBlocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuantity(line.cartLineId, line.quantity - 1);
                                }}
                              >
                                <Minus className="size-3.5" />
                              </Button>
                              <span className="w-6 text-center text-sm font-medium tabular-nums">{line.quantity}</span>
                              <Button
                                type="button"
                                variant="outline"
                                size="icon"
                                className="size-8"
                                disabled={isUpdating || orderBlocked}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setQuantity(line.cartLineId, line.quantity + 1);
                                }}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                            <span className="w-24 text-right text-sm font-semibold tabular-nums">
                              {formatCurrency(line.unitPrice * line.quantity)}
                            </span>
                          </div>
                          {expandedId === line.cartLineId && (
                            <div className="flex flex-col gap-2 border-t border-border pt-2">
                              <p className="text-xs text-muted-foreground">
                                Ghi chú: {line.note?.trim() ? line.note : '—'}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {NOTE_CHIPS.map((c) => (
                                  <Button
                                    key={c}
                                    type="button"
                                    size="sm"
                                    variant="secondary"
                                    className="h-7 text-xs"
                                    disabled={isUpdating || orderBlocked}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const base = line.note?.trim() ?? '';
                                      const next = base.includes(c) ? base : `${base} ${c}`.trim();
                                      updateNote(line.cartLineId, next);
                                    }}
                                  >
                                    {c}
                                  </Button>
                                ))}
                              </div>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    className="w-fit"
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    Sửa ghi chú
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-72" align="start" onClick={(e) => e.stopPropagation()}>
                                  <label className="text-xs font-medium" htmlFor={`note-${line.cartLineId}`}>
                                    Ghi chú cho món
                                  </label>
                                  <Textarea
                                    id={`note-${line.cartLineId}`}
                                    key={`${line.cartLineId}-${line.lineVersion}`}
                                    className="mt-2 min-h-[72px]"
                                    defaultValue={line.note ?? ''}
                                    disabled={isUpdating || orderBlocked}
                                    onBlur={(e) => {
                                      const v = e.target.value;
                                      if (v !== (line.note ?? '')) {
                                        updateNote(line.cartLineId, v);
                                      }
                                    }}
                                  />
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                      </motion.div>
                    </li>
                  ))}
                </ul>
              </ScrollArea>
              <Separator />
              <DrawerFooter className="flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Tổng cộng</span>
                  <span className="text-lg font-bold tabular-nums">{formatCurrency(totalAmount)}</span>
                </div>
                <Button
                  className="h-12 w-full text-base"
                  disabled={items.length === 0 || isUpdating || isSubmittingOrder || orderBlocked}
                  onClick={() => void handleSubmitOrder()}
                >
                  {isSubmittingOrder ? 'Đang gửi đơn…' : 'Đặt món'}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isUpdating || isSubmittingOrder || items.length === 0 || orderBlocked}
                  onClick={() => {
                    if (items.length === 0) return;
                    clearCart();
                  }}
                >
                  Xóa giỏ
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Vuốt trái trên dòng món để xóa nhanh</p>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
    </Drawer>
  );
}
