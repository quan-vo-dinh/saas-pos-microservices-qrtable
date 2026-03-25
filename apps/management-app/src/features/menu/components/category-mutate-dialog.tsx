'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMenu } from './menu-provider';
import { categoryMutateSchema, type CategoryMutateInput } from '../data/schema';

export function CategoryMutateDialog() {
  const { open, setOpen, currentCategory } = useMenu();
  const isEdit = open === 'edit-category';
  const isOpen = open === 'add-category' || open === 'edit-category';

  const form = useForm<CategoryMutateInput>({
    resolver: zodResolver(categoryMutateSchema),
    defaultValues:
      isEdit && currentCategory
        ? {
            name: currentCategory.name,
            timeStart: currentCategory.timeStart ?? undefined,
            timeEnd: currentCategory.timeEnd ?? undefined,
            status: currentCategory.status,
          }
        : {
            name: '',
            status: 'active',
          },
  });

  function onSubmit(data: CategoryMutateInput) {
    // Mock: just log and close
    console.log(isEdit ? 'Update category:' : 'Create category:', data);
    setOpen(null);
    form.reset();
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
            <Button type="submit">{isEdit ? 'Save Changes' : 'Create Category'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
