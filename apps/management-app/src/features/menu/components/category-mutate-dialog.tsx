'use client';

import { useEffect } from 'react';
import { categoryStatusVi } from '@einvoice/shared-constants';
import { Button, Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@einvoice/frontend-ui'
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import { useMenu } from './menu-provider';
import { categoryMutateSchema, type CategoryMutateInput } from '../data/schema';
import { useCreateCategoryMutation, useUpdateCategoryMutation } from '../hooks/use-menu-mutations';

export function CategoryMutateDialog() {
  const { open, setOpen, currentCategory } = useMenu();
  const isEdit = open === 'edit-category';
  const isOpen = open === 'add-category' || open === 'edit-category';

  const createMutation = useCreateCategoryMutation();
  const updateMutation = useUpdateCategoryMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<CategoryMutateInput>({
    resolver: zodResolver(categoryMutateSchema),
    defaultValues: {
      name: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (isEdit && currentCategory) {
      form.reset({
        name: currentCategory.name,
        timeStart: currentCategory.timeStart ?? undefined,
        timeEnd: currentCategory.timeEnd ?? undefined,
        status: currentCategory.status,
      });
    } else if (isOpen) {
      form.reset({ name: '', status: 'active' });
    }
  }, [isEdit, isOpen, currentCategory, form]);

  function onSubmit(data: CategoryMutateInput) {
    if (isEdit && currentCategory) {
      updateMutation.mutate(
        { id: currentCategory.id, data },
        {
          onSuccess: () => {
            setOpen(null);
            form.reset();
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setOpen(null);
          form.reset();
        },
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
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Sửa danh mục' : 'Thêm danh mục'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Cập nhật thông tin danh mục bên dưới.' : 'Điền thông tin để tạo danh mục mới.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Tên</Label>
            <Input id="cat-name" placeholder="vd. Món chính" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-time-start">Giờ bắt đầu</Label>
              <Input id="cat-time-start" type="time" {...form.register('timeStart')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-time-end">Giờ kết thúc</Label>
              <Input id="cat-time-end" type="time" {...form.register('timeEnd')} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Trạng thái</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(v) => form.setValue('status', v as 'active' | 'inactive')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">{categoryStatusVi('active')}</SelectItem>
                <SelectItem value="inactive">{categoryStatusVi('inactive')}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Huỷ
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Đang lưu…' : isEdit ? 'Lưu thay đổi' : 'Tạo danh mục'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
