import { useState } from 'react';
import { motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCurrency } from '@einvoice/frontend-utils';
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
import { PresenceAvatars } from '@/components/session/presence-avatars';
import { useCustomerCartQuery, useCartMutations } from '@/features/order/hooks/use-order-query';
import { usePwaMockStore } from '@/mocks/store';

const NOTE_CHIPS = ['Không cay', 'Ít muối', 'Không hành'] as const;

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CartDrawer({ open, onOpenChange }: CartDrawerProps): React.ReactElement {
  const { data: cart, isLoading } = useCustomerCartQuery();
  const { setQuantity, updateNote, removeLine, clearCart, isUpdating } = useCartMutations();

  const presence = usePwaMockStore((s) => s.presence);
  const activityFeed = usePwaMockStore((s) => s.activityFeed);

  const [expandedId, setExpandedId] = useState<string | null>(null);

  const items = cart?.items ?? [];
  const totalAmount = items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalItems = items.reduce((s, l) => s + l.quantity, 0);

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh] bg-background">
          <DrawerHeader className="flex flex-col gap-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DrawerTitle>Giỏ hàng</DrawerTitle>
                <DrawerDescription>
                  {isLoading ? 'Đang tải…' : `${totalItems} món · ${formatCurrency(totalAmount)}`}
                </DrawerDescription>
              </div>
              <PresenceAvatars presence={presence} activity={activityFeed} />
            </div>
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
                          if (info.offset.x < -80 && !isUpdating) removeLine(line.cartLineId);
                        }}
                        className="relative bg-card"
                      >
                        <button
                          type="button"
                          className="flex w-full flex-col gap-2 p-3 text-left"
                          onClick={() =>
                            setExpandedId((id) => (id === line.cartLineId ? null : line.cartLineId))
                          }
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
                                disabled={isUpdating}
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
                                disabled={isUpdating}
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
                                    disabled={isUpdating}
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
                                    disabled={isUpdating}
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
                        </button>
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
                  disabled
                  title="Gửi đơn sẽ được bật ở bước tích hợp tiếp theo"
                >
                  Đặt món (sắp có)
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full"
                  disabled={isUpdating || items.length === 0}
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
