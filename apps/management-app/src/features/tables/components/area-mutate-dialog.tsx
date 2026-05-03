'use client';

import { useEffect } from 'react';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label } from '@einvoice/frontend-ui'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import { useTables } from './tables-provider';
import { areaMutateSchema, type AreaMutateInput } from '../data/schema';
import { useCreateAreaMutation, useUpdateAreaMutation } from '../hooks/use-tables-mutations';

export function AreaMutateDialog() {
  const { open, setOpen, currentArea } = useTables();
  const isEdit = open === 'edit-area';
  const isOpen = open === 'add-area' || open === 'edit-area';

  const createMutation = useCreateAreaMutation();
  const updateMutation = useUpdateAreaMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<AreaMutateInput>({
    resolver: zodResolver(areaMutateSchema),
    defaultValues: { name: '', sortOrder: 0 },
  });

  useEffect(() => {
    if (isEdit && currentArea) {
      form.reset({ name: currentArea.name, sortOrder: currentArea.sortOrder });
    } else if (isOpen) {
      form.reset({ name: '', sortOrder: 0 });
    }
  }, [isEdit, isOpen, currentArea, form]);

  function onSubmit(data: AreaMutateInput) {
    if (isEdit && currentArea) {
      updateMutation.mutate(
        { id: currentArea.id, data },
        { onSuccess: () => { setOpen(null); form.reset(); } },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => { setOpen(null); form.reset(); },
      });
    }
  }

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(null);
          form.reset();
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa khu vực' : 'Thêm khu vực'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin khu vực.' : 'Tạo khu vực ngồi mới trong nhà hàng.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="area-name">Tên khu</Label>
            <Input id="area-name" placeholder="e.g. Tầng trệt, Lầu 1, Sân vườn" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="area-order">Thứ tự hiển thị</Label>
            <Input id="area-order" type="number" min={0} {...form.register('sortOrder', { valueAsNumber: true })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Hủy
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu…' : isEdit ? 'Lưu' : 'Tạo khu vực'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
