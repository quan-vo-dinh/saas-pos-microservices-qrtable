import { Card, CardContent, Button } from '@einvoice/frontend-ui';
import { formatCurrency } from '@einvoice/frontend-utils';
import { CircleCheck } from 'lucide-react';

type PaymentSuccessCardProps = {
  totalAmount: number;
  paymentMethod: string;
  onBackToMenu: () => void;
};

const scaleInStyle: React.CSSProperties = {
  animation: 'scale-in 0.5s ease-out forwards',
};

export function PaymentSuccessCard({
  totalAmount,
  paymentMethod,
  onBackToMenu,
}: PaymentSuccessCardProps) {
  return (
    <div className="flex flex-col items-center gap-6">
      <style>{`
        @keyframes scale-in {
          0% { transform: scale(0); opacity: 0; }
          50% { transform: scale(1.2); }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>

      <CircleCheck
        className="h-16 w-16 text-green-500"
        style={scaleInStyle}
      />

      <div className="space-y-1 text-center">
        <h2 className="text-xl font-semibold">
          Yêu cầu thanh toán đã được gửi!
        </h2>
        <p className="text-muted-foreground">Nhân viên sẽ đến trong giây lát</p>
      </div>

      <Card className="w-full">
        <CardContent className="space-y-2 pt-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Tổng tiền</span>
            <span className="font-semibold">{formatCurrency(totalAmount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Phương thức</span>
            <span className="font-semibold">{paymentMethod}</span>
          </div>
        </CardContent>
      </Card>

      <Button variant="outline" className="w-full" onClick={onBackToMenu}>
        Quay về Menu
      </Button>
    </div>
  );
}
