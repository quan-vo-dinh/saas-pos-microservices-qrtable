import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { useSession } from '@/features/session/context/session-provider';
import { ROUTES } from '@/constants/routes';

export function QrLandingCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startSession } = useSession();

  const table = searchParams.get('table');
  const token = searchParams.get('token');

  const verifyMutation = useVerifyQrMutation();

  useEffect(() => {
    if (!table || !token) return;
    verifyMutation.mutate({ tableId: table, qrToken: token });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table, token]);

  const handleEnterMenu = (): void => {
    if (!verifyMutation.data) return;

    const tableData = verifyMutation.data;
    startSession({
      sessionId: tableData.sessionId ?? tableData.id,
      tableId: tableData.id,
      tableName: tableData.name,
      restaurantName: tableData.name,
    });

    navigate(ROUTES.MENU);
  };

  if (!table || !token) {
    return (
      <Card className="mx-auto max-w-sm shadow-md">
        <CardHeader className="text-center">
          <QrCode className="text-muted-foreground mx-auto mb-2 size-16" />
          <CardTitle>Quét mã QR</CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground">
            Quét mã QR tại bàn để bắt đầu đặt món
          </p>
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
          <p className="text-muted-foreground">
            Mã QR không hợp lệ hoặc đã hết hạn
          </p>
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
            <span className="font-medium">
              Bàn {tableData?.name}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              Sức chứa: {tableData?.capacity} người
            </span>
          </div>
        </div>
        <Button className="w-full" size="lg" onClick={handleEnterMenu}>
          Vào Menu
        </Button>
      </CardContent>
    </Card>
  );
}
