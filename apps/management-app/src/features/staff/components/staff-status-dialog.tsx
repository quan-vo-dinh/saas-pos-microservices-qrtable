'use client';

import { useState } from 'react';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { Textarea } from '@einvoice/frontend-ui';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { useSetStaffStatusMutation } from '../hooks/use-staff-query';
import type { StaffProfile } from '../types';

type StaffStatusDialogProps = {
  staff: StaffProfile | null;
  action: 'enable' | 'disable';
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function StaffStatusDialog({ staff, action, open, onOpenChange }: StaffStatusDialogProps) {
  const enabled = action === 'enable';
  const statusMutation = useSetStaffStatusMutation(enabled);
  const [reason, setReason] = useState('');

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setReason('');
    }
    onOpenChange(next);
  };

  const handleSubmit = async () => {
    if (!staff) {
      return;
    }
    const trimmed = reason.trim();
    if (!trimmed) {
      return;
    }
    try {
      await statusMutation.mutateAsync({ userId: staff.userId, reason: trimmed });
      toast.success(enabled ? 'Đã kích hoạt nhân viên' : 'Đã vô hiệu hóa nhân viên');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Cập nhật trạng thái thất bại');
    }
  };

  const title = enabled ? 'Kích hoạt nhân viên' : 'Vô hiệu hóa nhân viên';

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        {staff ? (
          <p className="text-muted-foreground text-sm">
            Nhân viên: <span className="text-foreground font-medium">{staff.displayName}</span>
          </p>
        ) : null}
        <div className="grid gap-1.5 py-2">
          <Label htmlFor="staff-status-reason">Lý do</Label>
          <Textarea
            id="staff-status-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder={enabled ? 'Ví dụ: quay lại làm việc' : 'Ví dụ: nghỉ việc'}
          />
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            variant={enabled ? 'default' : 'destructive'}
            disabled={statusMutation.isPending || !staff || !reason.trim()}
            onClick={() => void handleSubmit()}
          >
            {statusMutation.isPending ? 'Đang lưu…' : enabled ? 'Kích hoạt' : 'Vô hiệu hóa'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
