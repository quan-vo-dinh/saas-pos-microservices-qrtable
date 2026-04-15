'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import {
  Button,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@einvoice/frontend-ui';
import { useTables } from './tables-provider';
import { useAreasQuery } from '../hooks/use-tables-query';
import { useCreateTableMutation, useUpdateTableMutation } from '../hooks/use-tables-mutations';
import { tableMutateSchema, type TableMutateInput } from '../data/schema';

export function TableMutateDialog() {
  const { open, setOpen, currentTable } = useTables();
  const isEdit = open === 'edit-table';
  const isOpen = open === 'add-table' || open === 'edit-table';

  const { data: areas } = useAreasQuery();
  const createMutation = useCreateTableMutation();
  const updateMutation = useUpdateTableMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const form = useForm<TableMutateInput>({
    resolver: zodResolver(tableMutateSchema),
    defaultValues: { name: '', areaId: '', capacity: 4 },
  });

  useEffect(() => {
    if (isEdit && currentTable) {
      form.reset({
        name: currentTable.name,
        areaId: currentTable.areaId,
        capacity: currentTable.capacity,
      });
    } else if (isOpen) {
      form.reset({ name: '', areaId: '', capacity: 4 });
    }
  }, [isEdit, isOpen, currentTable, form]);

  function onSubmit(data: TableMutateInput) {
    if (isEdit && currentTable) {
      updateMutation.mutate(
        { id: currentTable.id, data },
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
          <DialogTitle>{isEdit ? 'Edit Table' : 'Add Table'}</DialogTitle>
          <DialogDescription>
            {isEdit ? 'Update the table details.' : 'Add a new table to your restaurant.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tbl-name">Name</Label>
            <Input id="tbl-name" placeholder="e.g. T1, VIP2, SV3" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Area</Label>
            <Select defaultValue={form.getValues('areaId')} onValueChange={(v) => form.setValue('areaId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {(areas ?? []).map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.areaId && (
              <p className="text-sm text-destructive">{form.formState.errors.areaId.message}</p>
            )}
          </div>
          <div className="grid gap-2">
            <Label htmlFor="tbl-capacity">Capacity</Label>
            <Input
              id="tbl-capacity"
              type="number"
              min={1}
              max={50}
              {...form.register('capacity', { valueAsNumber: true })}
            />
            {form.formState.errors.capacity && (
              <p className="text-sm text-destructive">{form.formState.errors.capacity.message}</p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save' : 'Add Table'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
