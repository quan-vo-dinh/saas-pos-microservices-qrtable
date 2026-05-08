import { useNavigate } from 'react-router-dom';
import { BillStatus } from '@einvoice/types';
import { toast } from 'sonner';
import { Button } from '@einvoice/frontend-ui';
import { useSession } from '@/features/session/context/session-provider';
import { ROUTES } from '@/constants/routes';
import { useCurrentBillQuery, useRequestBillMutation } from '@/features/order/hooks/use-order-query';

export function RequestPaymentPage() {
  const navigate = useNavigate();
  const { isActive } = useSession();
  const { data, isLoading, isError, refetch } = useCurrentBillQuery();
  const requestBill = useRequestBillMutation();

  const bill = data?.bill ?? null;
  const cart = data?.cart;
  const cartTotal = (cart?.items ?? []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = bill?.total ?? cartTotal;
  const billPending = bill?.status === BillStatus.PENDING_PAYMENT;
  const lockActive = cart?.status === 'LOCKED' || billPending;

  const onRequestBill = async (): Promise<void> => {
    if (billPending || requestBill.isPending) return;
    try {
      await requestBill.mutateAsync();
      toast.success('Đã gửi yêu cầu thanh toán');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi yêu cầu thanh toán.');
    }
  };

  if (!isActive) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Chưa có phiên đặt món</p>
        <Button onClick={() => navigate(ROUTES.LANDING)}>
          Quay về trang chủ
        </Button>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-muted-foreground">Đang tải thông tin hóa đơn…</p>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-20">
        <p className="text-center text-muted-foreground">Không thể tải thông tin hóa đơn hiện tại.</p>
        <Button onClick={() => void refetch()}>Thử lại</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Thanh toán</h1>
      <div className="rounded-lg border border-border/80 bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">Trạng thái bill</p>
        <p className="mt-1 text-base font-semibold">
          {billPending ? 'Đang chờ thanh toán' : bill ? bill.status : 'Chưa tạo bill'}
        </p>
        {billPending ? (
          <p className="mt-2 text-xs text-muted-foreground">
            VietQR / chuyển khoản: nhân viên tạo mã tại POS (thanh toán). Màn hình này chỉ hiển thị trạng thái bill.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">Tổng tạm tính</p>
        <p className="text-2xl font-bold tabular-nums">{new Intl.NumberFormat('vi-VN').format(total)} đ</p>
      </div>

      {lockActive ? (
        <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
          Bàn đang trong trạng thái chờ thanh toán. Tạm thời không thể đặt thêm món.
        </div>
      ) : null}

      <Button className="w-full" size="lg" onClick={() => void onRequestBill()} disabled={requestBill.isPending || billPending}>
        {billPending ? 'Đã gửi yêu cầu thanh toán' : requestBill.isPending ? 'Đang gửi yêu cầu…' : 'Yêu cầu thanh toán'}
      </Button>
      <Button variant="outline" onClick={() => navigate(ROUTES.MENU)}>
        Quay lại menu
      </Button>
    </div>
  );
}
