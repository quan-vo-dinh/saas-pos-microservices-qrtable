'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useTables } from './tables-provider';
import { areas } from '../data/areas';
import { tableMutateSchema, type TableMutateInput } from '../data/schema';

export function TableMutateDialog() {
  const { open, setOpen, currentTable } = useTables();
  const isEdit = open === 'edit-table';
  const isOpen = open === 'add-table' || open === 'edit-table';

  const form = useForm<TableMutateInput>({
    resolver: zodResolver(tableMutateSchema),
    defaultValues: isEdit && currentTable
      ? {
          name: currentTable.name,
          areaId: currentTable.areaId,
          capacity: currentTable.capacity,
        }
      : { name: '', areaId: '', capacity: 4 },
  });

  function onSubmit(data: TableMutateInput) {
    console.log(isEdit ? 'Update table:' : 'Create table:', data);
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
          <DialogTitle>{isEdit ? 'Edit Table' : 'Add Table'}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? 'Update the table details.'
              : 'Add a new table to your restaurant.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="tbl-name">Name</Label>
            <Input
              id="tbl-name"
              placeholder="e.g. T1, VIP2, SV3"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>
          <div className="grid gap-2">
            <Label>Area</Label>
            <Select
              defaultValue={form.getValues('areaId')}
              onValueChange={(v) => form.setValue('areaId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select area" />
              </SelectTrigger>
              <SelectContent>
                {areas.map((area) => (
                  <SelectItem key={area.id} value={area.id}>
                    {area.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.areaId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.areaId.message}
              </p>
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
              <p className="text-sm text-destructive">
                {form.formState.errors.capacity.message}
              </p>
            )}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit">{isEdit ? 'Save' : 'Add Table'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
