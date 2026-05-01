'use client';

import { useState } from 'react';
import { z } from 'zod';
import { OrderStatus } from '@einvoice/types';
import { AlertDialog, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCancelOrderMutation } from '@/features/order/hooks/use-order-query';
import { cn } from '@/lib/utils';

const reasons = [
  { value: 'Hết hàng', label: 'Hết hàng' },
  { value: 'Khách đổi ý', label: 'Khách đổi ý' },
  { value: 'Lỗi nhập', label: 'Lỗi nhập' },
  { value: 'Khác', label: 'Khác' },
] as const;

const formSchema = z
  .object({
    reason: z.enum([reasons[0].value, reasons[1].value, reasons[2].value, reasons[3].value]),
    detail: z.string().max(500).optional().default(''),
  })
  .refine(
    (d) => d.reason !== 'Khác' || (d.detail?.trim().length ?? 0) > 0,
    { message: 'Bắt buộc ghi lý do khi chọn "Khác"', path: ['detail'] },
  );

export function CancelOrderDialog({
  open,
  onOpenChange,
  orderId,
  orderStatus,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  orderId: string;
  orderStatus: OrderStatus;
}) {
  const cancelOrderMutation = useCancelOrderMutation();
  const [reason, setReason] = useState<string>(reasons[0].value);
  const [detail, setDetail] = useState('');
  const [err, setErr] = useState<string | null>(null);

  const onConfirm = () => {
    const parsed = formSchema.safeParse({ reason, detail });
    if (!parsed.success) {
      setErr(parsed.error.issues[0]?.message ?? 'Dữ liệu không hợp lệ');
      return;
    }
    const r = parsed.data;
    const full = r.reason === 'Khác' && r.detail ? r.detail : r.reason;
    cancelOrderMutation.mutate({
      orderId,
      status: orderStatus,
      reason: full,
    }, {
      onSuccess: () => {
        onOpenChange(false);
        setDetail('');
        setErr(null);
      },
    });
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Huỷ đơn hàng</AlertDialogTitle>
          <AlertDialogDescription>
            Cần lý do để lưu nhật ký nghiệp vụ. Với &quot;Khác&quot; phải nhập chi tiết.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="flex flex-col gap-3 py-1">
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-reason">Lý do</Label>
            <Select
              value={reason}
              onValueChange={(v) => {
                setReason(v);
                setErr(null);
              }}
            >
              <SelectTrigger id="cancel-reason" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {reasons.map((x) => (
                  <SelectItem key={x.value} value={x.value}>
                    {x.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="cancel-detail">Chi tiết (khi cần)</Label>
            <textarea
              id="cancel-detail"
              className={cn('min-h-20 w-full rounded-md border border-border bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring')}
              value={detail}
              onChange={(e) => {
                setDetail(e.target.value);
                setErr(null);
              }}
              maxLength={500}
            />
          </div>
          {err ? <p className="text-sm text-destructive">{err}</p> : null}
        </div>
        <AlertDialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={cancelOrderMutation.isPending}>
            Đóng
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={cancelOrderMutation.isPending}>
            {cancelOrderMutation.isPending ? 'Đang huỷ...' : 'Xác nhận huỷ'}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
