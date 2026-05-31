'use client';

import { useState } from 'react';
import { staffRoleVi } from '@einvoice/shared-constants';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useChangeStaffRoleMutation } from '../hooks/use-staff-query';
import type { StaffProfile, StaffRoleName } from '../types';

const OWNER_ROLE_OPTIONS: StaffRoleName[] = ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'];

type ChangeStaffRoleDialogProps = {
  staff: StaffProfile | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function ChangeStaffRoleDialogBody({
  staff,
  onOpenChange,
}: {
  staff: StaffProfile;
  onOpenChange: (open: boolean) => void;
}) {
  const changeMutation = useChangeStaffRoleMutation();
  const [roleName, setRoleName] = useState<StaffRoleName>(staff.roleName);

  const handleSubmit = async () => {
    try {
      await changeMutation.mutateAsync({ userId: staff.userId, roleName });
      toast.success('Đã cập nhật vai trò');
      onOpenChange(false);
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Đổi vai trò thất bại');
    }
  };

  return (
    <>
        <DialogHeader>
          <DialogTitle>Đổi vai trò</DialogTitle>
        </DialogHeader>
        <p className="text-muted-foreground text-sm">
          Nhân viên: <span className="text-foreground font-medium">{staff.displayName}</span>
        </p>
        <div className="grid gap-1.5 py-2">
          <Label htmlFor="staff-change-role">Vai trò mới</Label>
          <Select value={roleName} onValueChange={(v) => setRoleName(v as StaffRoleName)}>
            <SelectTrigger id="staff-change-role">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {OWNER_ROLE_OPTIONS.map((role) => (
                <SelectItem key={role} value={role}>
                  {staffRoleVi(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={changeMutation.isPending || roleName === staff.roleName}
            onClick={() => void handleSubmit()}
          >
            {changeMutation.isPending ? 'Đang lưu…' : 'Lưu vai trò'}
          </Button>
        </DialogFooter>
    </>
  );
}

export function ChangeStaffRoleDialog({ staff, open, onOpenChange }: ChangeStaffRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        {staff ? <ChangeStaffRoleDialogBody key={staff.userId} staff={staff} onOpenChange={onOpenChange} /> : null}
      </DialogContent>
    </Dialog>
  );
}
