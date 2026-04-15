'use client';

import { useEffect } from 'react';
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
          <DialogTitle>{isEdit ? 'Edit Category' : 'Add Category'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the category details below.' : 'Fill in the details to create a new menu category.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="cat-name">Name</Label>
            <Input id="cat-name" placeholder="e.g. Món chính" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="cat-time-start">Time Start</Label>
              <Input id="cat-time-start" type="time" {...form.register('timeStart')} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cat-time-end">Time End</Label>
              <Input id="cat-time-end" type="time" {...form.register('timeEnd')} />
            </div>
          </div>
          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(v) => form.setValue('status', v as 'active' | 'inactive')}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Category'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
