'use client';

import { useMemo, useState } from 'react';
import { staffRoleVi } from '@einvoice/shared-constants';
import { ApiError } from '@einvoice/frontend-utils';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateStaffMutation } from '../hooks/use-staff-query';
import type { CreateStaffPayload, StaffRoleName } from '../types';

const OWNER_CREATE_ROLES: StaffRoleName[] = ['MANAGER', 'WAITER', 'CHEF', 'BARISTA'];
const MANAGER_CREATE_ROLES: StaffRoleName[] = ['WAITER', 'CHEF', 'BARISTA'];

type CreateStaffDialogProps = {
  currentRoles: string[];
};

function resolveCreatableRoles(currentRoles: string[]): StaffRoleName[] {
  const normalized = currentRoles.map((role) => role.toUpperCase());
  if (normalized.includes('OWNER')) {
    return OWNER_CREATE_ROLES;
  }
  if (normalized.includes('MANAGER')) {
    return MANAGER_CREATE_ROLES;
  }
  return [];
}

export function CreateStaffDialog({ currentRoles }: CreateStaffDialogProps) {
  const roleOptions = useMemo(() => resolveCreatableRoles(currentRoles), [currentRoles]);
  const createMutation = useCreateStaffMutation();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [roleName, setRoleName] = useState<StaffRoleName>('WAITER');
  const [password, setPassword] = useState('');
  const [requirePasswordUpdate, setRequirePasswordUpdate] = useState(true);

  const reset = () => {
    setEmail('');
    setFirstName('');
    setLastName('');
    setRoleName(roleOptions[0] ?? 'WAITER');
    setPassword('');
    setRequirePasswordUpdate(true);
  };

  const handleSubmit = async () => {
    const payload: CreateStaffPayload = {
      email: email.trim(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      roleName,
      password,
      requirePasswordUpdate,
    };

    try {
      await createMutation.mutateAsync(payload);
      toast.success('Đã tạo nhân viên');
      setOpen(false);
      reset();
    } catch (e) {
      toast.error(e instanceof ApiError ? e.serverMessage : 'Tạo nhân viên thất bại');
    }
  };

  if (!roleOptions.length) {
    return null;
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) {
          setRoleName(roleOptions[0] ?? 'WAITER');
        } else {
          reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button type="button">Thêm nhân viên</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Thêm nhân viên</DialogTitle>
          <DialogDescription>
            Hệ thống không gửi email trong luồng hiện tại. Hãy chuyển mật khẩu ban đầu cho nhân viên qua kênh nội bộ.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 py-2">
          <div className="grid gap-1.5">
            <Label htmlFor="staff-create-email">Email</Label>
            <Input
              id="staff-create-email"
              type="email"
              autoComplete="off"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="staff-create-first-name">Tên</Label>
              <Input
                id="staff-create-first-name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="staff-create-last-name">Họ</Label>
              <Input id="staff-create-last-name" value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="staff-create-role">Vai trò</Label>
            <Select value={roleName} onValueChange={(v) => setRoleName(v as StaffRoleName)}>
              <SelectTrigger id="staff-create-role">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {roleOptions.map((role) => (
                  <SelectItem key={role} value={role}>
                    {staffRoleVi(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="staff-create-password">Mật khẩu ban đầu</Label>
            <Input
              id="staff-create-password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox
              id="staff-create-require-password-update"
              checked={requirePasswordUpdate}
              onCheckedChange={(checked) => setRequirePasswordUpdate(checked === true)}
            />
            <Label htmlFor="staff-create-require-password-update" className="font-normal">
              Yêu cầu đổi mật khẩu khi đăng nhập lần đầu
            </Label>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            disabled={
              createMutation.isPending ||
              !email.trim() ||
              !firstName.trim() ||
              !lastName.trim() ||
              !password
            }
            onClick={() => void handleSubmit()}
          >
            {createMutation.isPending ? 'Đang tạo…' : 'Tạo nhân viên'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
