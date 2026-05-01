import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import { ApiError } from '@einvoice/frontend-utils';
import { QrCode, CheckCircle2, XCircle, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@einvoice/frontend-ui';
import { useVerifyQrMutation } from '@/features/landing/hooks/use-verify-qr';
import { sessionEntityToInfo, useSession } from '@/features/session/context/session-provider';
import { sessionService } from '@/features/landing/services/session.service';
import { ROUTES } from '@/constants/routes';
import { useResolveTenantQuery } from '@/features/landing/hooks/use-resolve-tenant';
import { setCustomerTenantId } from '@/lib/api-client';

function joinBlockedMessage(err: unknown): string {
  const code = err instanceof ApiError ? err.errorCode : undefined;
  if (code === 'ORDER_JOIN_TABLE_BILLING') {
    return 'Bàn đang thanh toán. Vui lòng nhờ nhân viên hỗ trợ.';
  }
  if (code === 'ORDER_JOIN_TABLE_CLEANING') {
    return 'Bàn đang được dọn. Vui lòng chờ nhân viên mở lại.';
  }
  if (code === 'ORDER_SESSION_MISSING_FOR_OCCUPIED_TABLE') {
    return 'Phiên bàn không khớp. Vui lòng nhờ nhân viên làm mới trạng thái bàn.';
  }
  return 'Không thể tham gia phiên đặt món. Vui lòng thử lại.';
}

export function QrLandingCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startSession } = useSession();

  const tenantSlug = searchParams.get('tenant');
  const table = searchParams.get('table');
  const token = searchParams.get('token');

  const tenantQuery = useResolveTenantQuery(tenantSlug);
  const verifyMutation = useVerifyQrMutation();
  const verifyOnceRef = useRef(false);

  useEffect(() => {
    verifyOnceRef.current = false;
  }, [table, token, tenantSlug]);

  useEffect(() => {
    if (!table || !token || verifyOnceRef.current) return;

    if (tenantSlug?.trim()) {
      if (tenantQuery.isPending) return;
      if (tenantQuery.isError || !tenantQuery.data?.isActive) return;
      setCustomerTenantId(tenantQuery.data.id);
    }

    verifyOnceRef.current = true;
    verifyMutation.mutate({ tableId: table, qrToken: token });
  }, [
    table,
    token,
    tenantSlug,
    tenantQuery.isPending,
    tenantQuery.isError,
    tenantQuery.data,
    verifyMutation,
  ]);

  const joinMutation = useMutation({
    mutationFn: () => sessionService.joinSession({ tableId: table!, qrToken: token! }),
  });

  const handleEnterMenu = (): void => {
    if (!table || !token) return;
    joinMutation.mutate(undefined, {
      onSuccess: (sess) => {
        const tableLabel = verifyMutation.data?.name ?? sess.tableName;
        startSession(sessionEntityToInfo(sess, tableLabel));
        navigate(ROUTES.MENU);
      },
    });
  };

  if (!table || !token) {
    return (
      <Card className="mx-auto max-w-sm shadow-md">
        <CardHeader className="text-center">
          <QrCode className="text-muted-foreground mx-auto mb-2 size-16" />
          <CardTitle>Quét mã QR</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Quét mã QR tại bàn để bắt đầu đặt món</p>
        </CardContent>
      </Card>
    );
  }

  if (tenantSlug?.trim() && tenantQuery.isPending) {
    return (
      <Card className="mx-auto max-w-sm shadow-md">
        <CardHeader className="text-center">
          <CardTitle>Đang xác định nhà hàng…</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </CardContent>
      </Card>
    );
  }

  if (tenantSlug?.trim() && tenantQuery.isError) {
    return (
      <Card className="mx-auto max-w-sm border-destructive/50 shadow-md">
        <CardHeader className="text-center">
          <XCircle className="text-destructive mx-auto mb-2 size-12" />
          <CardTitle className="text-destructive">Liên kết không hợp lệ</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Không tìm thấy nhà hàng hoặc nhà hàng đã tạm ngưng.</p>
        </CardContent>
      </Card>
    );
  }

  if (verifyMutation.isPending) {
    return (
      <Card className="mx-auto max-w-sm shadow-md">
        <CardHeader className="text-center">
          <CardTitle>Đang xác thực...</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-10 w-full" />
        </CardContent>
      </Card>
    );
  }

  if (verifyMutation.isError) {
    return (
      <Card className="mx-auto max-w-sm border-destructive/50 shadow-md">
        <CardHeader className="text-center">
          <XCircle className="text-destructive mx-auto mb-2 size-12" />
          <CardTitle className="text-destructive">Lỗi xác thực</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">Mã QR không hợp lệ hoặc đã hết hạn</p>
        </CardContent>
      </Card>
    );
  }

  const tableData = verifyMutation.data;

  return (
    <Card className="mx-auto max-w-sm shadow-md">
      <CardHeader className="text-center">
        <CheckCircle2 className="mx-auto mb-2 size-12 text-green-600" />
        <CardTitle>Xác thực thành công</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 space-y-2 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <QrCode className="text-muted-foreground size-4" />
            <span className="font-medium">Bàn {tableData?.name}</span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">Sức chứa: {tableData?.capacity} người</span>
          </div>
        </div>
        {joinMutation.isError ? (
          <p className="text-center text-sm text-destructive">{joinBlockedMessage(joinMutation.error)}</p>
        ) : null}
        <Button className="w-full" size="lg" disabled={joinMutation.isPending} onClick={() => handleEnterMenu()}>
          {joinMutation.isPending ? 'Đang vào phiên…' : 'Vào Menu'}
        </Button>
      </CardContent>
    </Card>
  );
}
