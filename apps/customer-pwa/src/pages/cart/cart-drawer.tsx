import { useCallback, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Trash2 } from 'lucide-react';
import { formatCurrency } from '@einvoice/frontend-utils';
import type { Order, OrderItem } from '@einvoice/types';
import { OrderItemStatus, OrderStatus } from '@einvoice/types';
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
import { ROUTES } from '@/constants/routes';
import { useSession } from '@/features/session/context/session-provider';
import { createAndPersistIdempotencyKey } from '@/lib/idempotency';
import { usePwaMockStore } from '@/mocks/store';

const NOTE_CHIPS = ['Không cay', 'Ít muối', 'Không hành'] as const;

type CartDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function buildOrderFromCart(): Order | null {
  const { cart, session } = usePwaMockStore.getState();
  if (cart.items.length === 0) return null;
  const now = new Date().toISOString();
  const id = `ord-${crypto.randomUUID().replace(/-/g, '').slice(0, 10)}`;
  const idempotencyKey = createAndPersistIdempotencyKey();
  const items: OrderItem[] = cart.items.map((line) => ({
    id: `oi-${line.lineId}`,
    orderId: id,
    menuItemId: line.menuItemId,
    menuItemName: line.menuItemName,
    quantity: line.quantity,
    unitPrice: line.unitPrice,
    note: line.note,
    status: OrderItemStatus.PROCESSING,
    createdAt: now,
    updatedAt: now,
  }));
  const totalAmount = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  return {
    id,
    tenantId: 't-phogomau',
    tableId: session.tableId,
    tableName: session.tableName,
    sessionId: session.sessionId,
    items,
    status: OrderStatus.PENDING,
    totalAmount,
    idempotencyKey,
    createdAt: now,
    updatedAt: now,
  };
}

export function CartDrawer({ open, onOpenChange }: CartDrawerProps): React.ReactElement {
  const navigate = useNavigate();
  const { startSession, isActive } = useSession();
  const cart = usePwaMockStore((s) => s.cart);
  const presence = usePwaMockStore((s) => s.presence);
  const activityFeed = usePwaMockStore((s) => s.activityFeed);
  const session = usePwaMockStore((s) => s.session);
  const incQty = usePwaMockStore((s) => s.incQty);
  const decQty = usePwaMockStore((s) => s.decQty);
  const removeItem = usePwaMockStore((s) => s.removeItem);
  const setNote = usePwaMockStore((s) => s.setNote);
  const clearCart = usePwaMockStore((s) => s.clearCart);
  const setOrder = usePwaMockStore((s) => s.setOrder);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const totalAmount = cart.items.reduce((s, l) => s + l.unitPrice * l.quantity, 0);
  const totalItems = cart.items.reduce((s, l) => s + l.quantity, 0);

  const handleSubmit = useCallback(async () => {
    if (cart.items.length === 0) return;
    setSubmitting(true);
    const order = buildOrderFromCart();
    if (!order) {
      setSubmitting(false);
      return;
    }
    await new Promise((r) => setTimeout(r, 1200));
    if (!isActive) {
      startSession({
        sessionId: session.sessionId,
        tableId: session.tableId,
        tableName: session.tableName,
        restaurantName: 'Phở Gõ Mẫu (mock)',
      });
    }
    setOrder(order);
    clearCart();
    setShowConfetti(true);
    setSubmitting(false);
    await new Promise((r) => setTimeout(r, 900));
    setShowConfetti(false);
    onOpenChange(false);
    navigate(ROUTES.ORDER_TRACKING);
  }, [cart.items.length, clearCart, isActive, navigate, onOpenChange, session, setOrder, startSession]);

  return (
    <>
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="max-h-[88vh] bg-background">
          <DrawerHeader className="flex flex-col gap-3 text-left">
            <div className="flex items-start justify-between gap-2">
              <div>
                <DrawerTitle>Giỏ hàng</DrawerTitle>
                <DrawerDescription>
                  {totalItems} món · {formatCurrency(totalAmount)}
                </DrawerDescription>
              </div>
              <PresenceAvatars presence={presence} activity={activityFeed} />
            </div>
          </DrawerHeader>

          {cart.items.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 py-12">
              <ShoppingBag className="size-12 text-muted-foreground" aria-hidden />
              <p className="text-sm text-muted-foreground">Giỏ hàng trống</p>
            </div>
          ) : (
            <>
              <ScrollArea className="max-h-[48vh] px-4">
                <ul className="flex flex-col gap-3 pb-2">
                  {cart.items.map((line) => (
                    <li key={line.lineId} className="relative overflow-hidden rounded-lg border border-border/80">
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex w-20 items-center justify-center bg-destructive text-destructive-foreground">
                        <Trash2 className="size-5" aria-hidden />
                      </div>
                      <motion.div
                        drag="x"
                        dragConstraints={{ left: -88, right: 0 }}
                        dragElastic={0.06}
                        onDragEnd={(_, info) => {
                          if (info.offset.x < -80) removeItem(line.lineId);
                        }}
                        className="relative bg-card"
                      >
                        <button
                          type="button"
                          className="flex w-full flex-col gap-2 p-3 text-left"
                          onClick={() => setExpandedId((id) => (id === line.lineId ? null : line.lineId))}
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  decQty(line.lineId);
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
                                onClick={(e) => {
                                  e.stopPropagation();
                                  incQty(line.lineId);
                                }}
                              >
                                <Plus className="size-3.5" />
                              </Button>
                            </div>
                            <span className="w-24 text-right text-sm font-semibold tabular-nums">
                              {formatCurrency(line.unitPrice * line.quantity)}
                            </span>
                          </div>
                          {expandedId === line.lineId && (
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
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const next = line.note?.includes(c) ? line.note : `${line.note ?? ''} ${c}`.trim();
                                      setNote(line.lineId, next);
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
                                  <label className="text-xs font-medium" htmlFor={`note-${line.lineId}`}>
                                    Ghi chú cho món
                                  </label>
                                  <Textarea
                                    id={`note-${line.lineId}`}
                                    className="mt-2 min-h-[72px]"
                                    value={line.note ?? ''}
                                    onChange={(e) => setNote(line.lineId, e.target.value)}
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
                <Button className="h-12 w-full text-base" disabled={submitting} onClick={() => void handleSubmit()}>
                  {submitting ? 'Đang gửi…' : 'Đặt món'}
                </Button>
                <p className="text-center text-[11px] text-muted-foreground">Vuốt trái trên dòng món để xóa nhanh</p>
              </DrawerFooter>
            </>
          )}
        </DrawerContent>
      </Drawer>

      <AnimatePresence>
        {showConfetti && (
          <motion.div
            className="pointer-events-none fixed inset-0 z-[100] flex items-end justify-center pb-40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {Array.from({ length: 12 }, (_, i) => (
              <motion.span
                key={i}
                className="absolute size-3 rounded-sm shadow-sm"
                style={{
                  backgroundColor: i % 2 === 0 ? 'var(--accent, #e89b2f)' : 'var(--accent-alt, #5b6e3a)',
                  left: `calc(50% + ${(i - 6) * 18}px)`,
                }}
                initial={{ y: 0, opacity: 1, rotate: 0 }}
                animate={{
                  y: -160 - (i % 5) * 18,
                  x: ((i % 9) - 4) * 16,
                  opacity: 0,
                  rotate: (i * 47) % 360,
                }}
                transition={{ duration: 0.9, ease: [0.32, 0.72, 0, 1] }}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
