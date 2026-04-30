import { useState } from 'react';
import { toast } from 'sonner';
import { CircleHelp, Receipt, UserRound } from 'lucide-react';
import {
  Button,
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  Textarea,
} from '@einvoice/frontend-ui';
import { useCreateServiceRequestMutation } from '@/features/order/hooks/use-order-query';

type RequestType = 'CALL_STAFF' | 'REQUEST_BILL' | 'GENERAL_HELP';
export const OPEN_SERVICE_REQUEST_EVENT = 'customer:open-service-request-drawer';

const ACTIONS: {
  type: RequestType;
  label: string;
  description: string;
  icon: typeof UserRound;
}[] = [
  { type: 'CALL_STAFF', label: 'Gọi nhân viên', description: 'Hỗ trợ tại bàn', icon: UserRound },
  { type: 'REQUEST_BILL', label: 'Xin thanh toán', description: 'Mang bill / POS', icon: Receipt },
  { type: 'GENERAL_HELP', label: 'Trợ giúp', description: 'Câu hỏi chung', icon: CircleHelp },
];

type ServiceRequestDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function ServiceRequestDrawer({ open, onOpenChange }: ServiceRequestDrawerProps): React.ReactElement {
  const [type, setType] = useState<RequestType>('CALL_STAFF');
  const [note, setNote] = useState('');
  const createRequest = useCreateServiceRequestMutation();
  const submitting = createRequest.isPending;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    if (note.length > 200) {
      toast.error('Ghi chú tối đa 200 ký tự');
      return;
    }
    try {
      await createRequest.mutateAsync({
        type,
        note: note.trim() || undefined,
      });
      toast.success('Đã gửi yêu cầu hỗ trợ', {
        description: `${type}${note.trim() ? ` · ${note.trim()}` : ''}`,
      });
      setNote('');
      setType('CALL_STAFF');
      onOpenChange(false);
    } catch (err) {
      toast.error((err as Error).message || 'Không thể gửi yêu cầu. Vui lòng thử lại.');
    }
  };

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <DrawerContent>
        <DrawerHeader className="text-left">
          <DrawerTitle>Cần hỗ trợ?</DrawerTitle>
          <DrawerDescription>Chọn loại yêu cầu và gửi ghi chú tùy chọn.</DrawerDescription>
        </DrawerHeader>
        <form onSubmit={(ev) => void handleSubmit(ev)} className="flex flex-col gap-4 px-4 pb-6">
          <div className="grid grid-cols-1 gap-3">
            {ACTIONS.map((a) => {
              const Icon = a.icon;
              const active = type === a.type;
              return (
                <Button
                  key={a.type}
                  type="button"
                  variant={active ? 'default' : 'outline'}
                  className="h-auto min-h-[80px] justify-start gap-4 px-4 py-4 text-left"
                  onClick={() => setType(a.type)}
                >
                  <Icon className="size-7 shrink-0" aria-hidden />
                  <span className="flex flex-col items-start gap-0.5">
                    <span className="text-base font-semibold">{a.label}</span>
                    <span className="text-xs font-normal text-muted-foreground">{a.description}</span>
                  </span>
                </Button>
              );
            })}
          </div>
          <div className="flex flex-col gap-2">
            <label htmlFor="sr-note" className="text-sm font-medium">
              Ghi chú (tuỳ chọn)
            </label>
            <Textarea
              id="sr-note"
              rows={3}
              placeholder="Ví dụ: thêm đũa, ít đá…"
              value={note}
              maxLength={200}
              onChange={(e) => setNote(e.target.value)}
            />
            <p className="text-right text-[11px] text-muted-foreground">{note.length}/200</p>
          </div>
          <DrawerFooter className="px-0 pb-0">
            <Button type="submit" className="h-12 w-full" disabled={submitting}>
              {submitting ? 'Đang gửi yêu cầu…' : 'Gửi yêu cầu'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
