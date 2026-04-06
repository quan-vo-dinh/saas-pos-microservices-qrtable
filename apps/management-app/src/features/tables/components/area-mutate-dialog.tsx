'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import {
  Button,
  Input,
  Label,
} from '@einvoice/frontend-ui';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@einvoice/frontend-ui';
import { useTables } from './tables-provider';
import { areaMutateSchema, type AreaMutateInput } from '../data/schema';

export function AreaMutateDialog() {
  const { open, setOpen, currentArea } = useTables();
  const isEdit = open === 'edit-area';
  const isOpen = open === 'add-area' || open === 'edit-area';

  const form = useForm<AreaMutateInput>({
    resolver: zodResolver(areaMutateSchema),
    defaultValues:
      isEdit && currentArea ? { name: currentArea.name, sortOrder: currentArea.sortOrder } : { name: '', sortOrder: 0 },
  });

  function onSubmit(data: AreaMutateInput) {
    console.log(isEdit ? 'Update area:' : 'Create area:', data);
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
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Area' : 'Add Area'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the area details.' : 'Create a new seating area for your restaurant.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="area-name">Name</Label>
            <Input id="area-name" placeholder="e.g. Tầng trệt, Lầu 1, Sân vườn" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="area-order">Sort Order</Label>
            <Input id="area-order" type="number" min={0} {...form.register('sortOrder', { valueAsNumber: true })} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save' : 'Create Area'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
