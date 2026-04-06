import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { QrCode, CheckCircle2, XCircle, MapPin, Users } from 'lucide-react';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Skeleton,
} from '@einvoice/frontend-ui';
import { getSessionByQrToken, type MockSession } from '@einvoice/mock-data';
import { useSession } from '@/features/session/context/session-provider';
import { ROUTES } from '@/constants/routes';

type ScanState = 'idle' | 'scanning' | 'confirmed' | 'error';

const SCAN_DELAY_MS = 1500;

export function QrLandingCard() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { startSession } = useSession();

  const table = searchParams.get('table');
  const token = searchParams.get('token');

  const [state, setState] = useState<ScanState>(
    table && token ? 'scanning' : 'idle',
  );
  const [sessionData, setSessionData] = useState<MockSession | null>(null);

  useEffect(() => {
    if (!table || !token) return;

    const timer = setTimeout(() => {
      const result = getSessionByQrToken(token);
      if (result) {
        setSessionData(result);
        setState('confirmed');
      } else {
        setState('error');
      }
    }, SCAN_DELAY_MS);

    return () => clearTimeout(timer);
  }, [table, token]);

  const handleEnterMenu = (): void => {
    if (!sessionData) return;

    startSession({
      sessionId: sessionData.sessionId,
      tableId: sessionData.tableId,
      tableName: sessionData.tableName,
      restaurantName: sessionData.restaurantName,
    });

    navigate(ROUTES.MENU);
  };

  if (state === 'idle') {
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

  if (state === 'scanning') {
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

  if (state === 'error') {
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

  // state === 'confirmed'
  return (
    <Card className="mx-auto max-w-sm shadow-md">
      <CardHeader className="text-center">
        <CheckCircle2 className="mx-auto mb-2 size-12 text-green-600" />
        <CardTitle>{sessionData?.restaurantName}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="bg-muted/50 space-y-2 rounded-lg p-4">
          <div className="flex items-center gap-2">
            <QrCode className="text-muted-foreground size-4" />
            <span className="font-medium">
              Bàn {sessionData?.tableName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              {sessionData?.areaName}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Users className="text-muted-foreground size-4" />
            <span className="text-muted-foreground text-sm">
              Sức chứa: {sessionData?.capacity} người
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
