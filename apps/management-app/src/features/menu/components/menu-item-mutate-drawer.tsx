'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useMenu } from './menu-provider';
import { categories } from '../data/categories';
import { menuItemMutateSchema, type MenuItemMutateInput } from '../data/schema';

export function MenuItemMutateDrawer() {
  const { open, setOpen, currentItem } = useMenu();
  const isEdit = open === 'edit-item';
  const isOpen = open === 'add-item' || open === 'edit-item';

  const form = useForm<MenuItemMutateInput>({
    resolver: zodResolver(menuItemMutateSchema),
    defaultValues: isEdit && currentItem
      ? {
          name: currentItem.name,
          description: currentItem.description ?? '',
          price: currentItem.price,
          categoryId: currentItem.categoryId,
          stock: currentItem.stock,
          status: currentItem.status,
        }
      : {
          name: '',
          description: '',
          price: 0,
          categoryId: '',
          stock: 0,
          status: 'available',
        },
  });

  function onSubmit(data: MenuItemMutateInput) {
    console.log(isEdit ? 'Update item:' : 'Create item:', data);
    setOpen(null);
    form.reset();
  }

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(null);
          form.reset();
        }
      }}
    >
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</SheetTitle>
          <SheetDescription>
            {isEdit
              ? 'Update the menu item details.'
              : 'Fill in the details to add a new menu item.'}
          </SheetDescription>
        </SheetHeader>
        <form
          onSubmit={form.handleSubmit(onSubmit)}
          className="flex flex-col gap-4 p-4 overflow-y-auto"
        >
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name *</Label>
            <Input
              id="item-name"
              placeholder="e.g. Phở bò tái"
              {...form.register('name')}
            />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">
                {form.formState.errors.name.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="item-desc">Description</Label>
            <Textarea
              id="item-desc"
              placeholder="Brief description of the dish..."
              rows={3}
              {...form.register('description')}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="item-price">Price (VND) *</Label>
              <Input
                id="item-price"
                type="number"
                min={0}
                step={1000}
                {...form.register('price', { valueAsNumber: true })}
              />
              {form.formState.errors.price && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.price.message}
                </p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-stock">Stock *</Label>
              <Input
                id="item-stock"
                type="number"
                min={0}
                {...form.register('stock', { valueAsNumber: true })}
              />
              {form.formState.errors.stock && (
                <p className="text-sm text-destructive">
                  {form.formState.errors.stock.message}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category *</Label>
            <Select
              defaultValue={form.getValues('categoryId')}
              onValueChange={(v) => form.setValue('categoryId', v)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {categories
                  .filter((c) => c.status === 'active')
                  .map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">
                {form.formState.errors.categoryId.message}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(v) =>
                form.setValue('status', v as 'available' | 'out_of_stock')
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="out_of_stock">Out of stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Image</Label>
            <div className="flex h-32 items-center justify-center rounded-md border border-dashed text-sm text-muted-foreground">
              Image upload placeholder
            </div>
          </div>

          <SheetFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit">
              {isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
