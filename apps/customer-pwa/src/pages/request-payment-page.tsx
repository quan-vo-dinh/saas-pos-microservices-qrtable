import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { billStatusVi } from '@einvoice/shared-constants';
import { BillStatus } from '@einvoice/types';
import { toast } from 'sonner';
import { Button } from '@einvoice/frontend-ui';
import { useSession } from '@/features/session/context/session-provider';
import { useTenantStatus } from '@/features/tenant/use-tenant-status';
import { ROUTES } from '@/constants/routes';
import { useCurrentBillQuery, useRequestBillMutation } from '@/features/order/hooks/use-bill-query';
import type { CustomerVietQrResponse } from '@/features/payment/services/payment.service';
import { useCreateVietQrMutation } from '@/features/payment/hooks/use-create-vietqr-mutation';

function formatVnd(amount: number): string {
  return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
}

async function copyText(label: string, value: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(value);
    toast.success(`Đã copy ${label}`);
  } catch {
    toast.error('Không thể copy — hãy chọn và copy thủ công.');
  }
}

export function RequestPaymentPage() {
  const navigate = useNavigate();
  const { isActive } = useSession();
  const { canOrder } = useTenantStatus();
  const { data, isLoading, isError, refetch } = useCurrentBillQuery();
  const requestBill = useRequestBillMutation();
  const createVietQr = useCreateVietQrMutation();
  const [vietQr, setVietQr] = useState<CustomerVietQrResponse | null>(null);

  const bill = data?.bill ?? null;
  const cart = data?.cart;
  const cartTotal = (cart?.items ?? []).reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
  const total = bill?.total ?? cartTotal;
  const billPending = bill?.status === BillStatus.PENDING_PAYMENT;
  const billPaid = bill?.status === BillStatus.PAID;
  const lockActive = cart?.status === 'LOCKED' || billPending;

  const onRequestBill = async (): Promise<void> => {
    if (!canOrder || billPending || requestBill.isPending) return;
    try {
      await requestBill.mutateAsync();
      toast.success('Đã gửi yêu cầu thanh toán');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi yêu cầu thanh toán.');
    }
  };

  const onCreateVietQr = async (): Promise<void> => {
    if (!billPending || createVietQr.isPending) return;
    try {
      const res = await createVietQr.mutateAsync();
      setVietQr(res);
      toast.success('Đã tạo mã VietQR');
    } catch (err) {
      toast.error((err as Error).message || 'Không thể tạo mã VietQR.');
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

  if (billPaid) {
    return (
      <div className="flex flex-col gap-6">
        <h1 className="text-xl font-semibold">Thanh toán</h1>
        <div className="rounded-lg border border-emerald-500/60 bg-emerald-500/10 p-4">
          <p className="text-sm font-medium text-emerald-700">Thanh toán thành công</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Hóa đơn đã được ghi nhận. Nhân viên sẽ dọn bàn và chuẩn bị cho lượt khách tiếp theo.
          </p>
          <p className="mt-3 text-sm text-muted-foreground">Tổng đã thanh toán</p>
          <p className="text-2xl font-bold tabular-nums">{formatVnd(total)}</p>
        </div>
        <Button variant="outline" onClick={() => navigate(ROUTES.LANDING)}>
          Kết thúc phiên
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-semibold">Thanh toán</h1>
      <div className="rounded-lg border border-border/80 bg-card/40 p-4">
        <p className="text-sm text-muted-foreground">Trạng thái bill</p>
        <p className="mt-1 text-base font-semibold">
          {billPending ? 'Đang chờ thanh toán' : bill ? billStatusVi(bill.status) : 'Chưa tạo bill'}
        </p>
        {billPending ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Quét VietQR hoặc chuyển khoản đúng số tiền và nội dung bên dưới. Trạng thái sẽ cập nhật khi thanh toán được ghi
            nhận.
          </p>
        ) : null}
        <p className="mt-3 text-sm text-muted-foreground">Tổng tạm tính</p>
        <p className="text-2xl font-bold tabular-nums">{formatVnd(total)}</p>
      </div>

      {lockActive ? (
        <div className="rounded-lg border border-amber-500/60 bg-amber-500/10 p-3 text-sm">
          Bàn đang trong trạng thái chờ thanh toán. Tạm thời không thể đặt thêm món.
        </div>
      ) : null}

      {billPending ? (
        <div className="flex flex-col gap-3">
          <Button
            className="w-full"
            variant="secondary"
            type="button"
            onClick={() => void onCreateVietQr()}
            disabled={createVietQr.isPending}
          >
            {createVietQr.isPending ? 'Đang tạo mã…' : vietQr ? 'Làm mới mã VietQR' : 'Thanh toán bằng VietQR'}
          </Button>
          {vietQr ? (
            <div className="rounded-lg border border-border/80 p-4">
              <p className="text-sm font-medium">Quét mã để chuyển khoản</p>
              <dl className="mt-3 grid gap-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Ngân hàng</dt>
                  <dd className="text-end font-medium">{vietQr.bankName}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Số tài khoản</dt>
                  <dd className="flex items-center gap-2 font-mono font-medium">
                    <span>{vietQr.bankAccount}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={() => void copyText('số tài khoản', vietQr.bankAccount)}
                    >
                      Copy
                    </Button>
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">Nội dung</dt>
                  <dd className="flex items-center gap-2 font-mono font-medium">
                    <span className="break-all text-end">{vietQr.billReference}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 shrink-0 px-2 text-xs"
                      onClick={() => void copyText('nội dung', vietQr.billReference)}
                    >
                      Copy
                    </Button>
                  </dd>
                </div>
              </dl>
              <p className="mt-2 font-mono text-xl font-semibold tabular-nums">{formatVnd(vietQr.roundedTotal)}</p>
              <img src={vietQr.qrUrl} alt="VietQR" className="mt-3 max-h-72 w-full object-contain" />
              <p className="mt-2 text-xs text-muted-foreground">
                Nếu app ngân hàng không quét được QR trên cùng điện thoại, hãy nhập/copy đúng số tiền và nội dung chuyển
                khoản ở trên.
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      <Button
        className="w-full"
        size="lg"
        onClick={() => void onRequestBill()}
        disabled={requestBill.isPending || billPending || !canOrder}
      >
        {billPending ? 'Đã gửi yêu cầu thanh toán' : requestBill.isPending ? 'Đang gửi yêu cầu…' : 'Yêu cầu thanh toán'}
      </Button>
      <Button variant="outline" onClick={() => navigate(ROUTES.MENU)}>
        Quay lại menu
      </Button>
    </div>
  );
}
