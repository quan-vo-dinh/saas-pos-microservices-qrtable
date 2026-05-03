'use client';

import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@/lib/form/zod-resolver';
import { Upload, X } from 'lucide-react';
import {
  Button,
  Input,
  Label,
  Textarea,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@einvoice/frontend-ui';
import { Sheet, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMenu } from './menu-provider';
import { useCategoriesQuery } from '../hooks/use-menu-query';
import {
  useClearMenuItemImageMutation,
  useCreateMenuItemMutation,
  useUpdateMenuItemMutation,
  useUploadMenuItemImageMutation,
} from '../hooks/use-menu-mutations';
import { menuItemMutateSchema, type MenuItemMutateInput } from '../data/schema';

export function MenuItemMutateDrawer() {
  const { open, setOpen, currentItem } = useMenu();
  const isEdit = open === 'edit-item';
  const isOpen = open === 'add-item' || open === 'edit-item';

  const { data: categories } = useCategoriesQuery();
  const createMutation = useCreateMenuItemMutation();
  const updateMutation = useUpdateMenuItemMutation();
  const uploadMutation = useUploadMenuItemImageMutation();
  const clearImageMutation = useClearMenuItemImageMutation();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  /** User removed the existing server image in the UI (persist on Save). */
  const [stripServerImage, setStripServerImage] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const form = useForm<MenuItemMutateInput>({
    resolver: zodResolver(menuItemMutateSchema),
    defaultValues: {
      name: '',
      description: '',
      price: 0,
      categoryId: '',
      stock: 0,
      status: 'available',
    },
  });

  useEffect(() => {
    if (isEdit && currentItem) {
      form.reset({
        name: currentItem.name,
        description: currentItem.description ?? '',
        price: currentItem.price,
        categoryId: currentItem.categoryId,
        stock: currentItem.stock,
        status: currentItem.status,
      });
    } else if (isOpen) {
      form.reset({ name: '', description: '', price: 0, categoryId: '', stock: 0, status: 'available' });
    }
  }, [isEdit, isOpen, currentItem, form]);

  const derivedImagePreview =
    imageFile && imagePreview
      ? imagePreview
      : !stripServerImage && isEdit && currentItem?.imageUrl
        ? currentItem.imageUrl
        : null;

  function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setStripServerImage(false);
    setImageFile(file);
    setImagePreview((prev) => {
      if (prev?.startsWith('blob:')) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
  }

  function clearImage() {
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
    if (imageFile) {
      setImageFile(null);
      setImagePreview(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }
    if (isEdit && currentItem?.imageUrl) setStripServerImage(true);
  }

  function onSubmit(data: MenuItemMutateInput) {
    if (isEdit && currentItem) {
      updateMutation.mutate(
        { id: currentItem.id, data },
        {
          onSuccess: () => {
            if (imageFile) {
              uploadMutation.mutate(
                { id: currentItem.id, file: imageFile, onProgress: setUploadProgress },
                { onSettled: () => { setOpen(null); form.reset(); setStripServerImage(false); } },
              );
            } else if (stripServerImage) {
              clearImageMutation.mutate(currentItem.id, {
                onSettled: () => {
                  setOpen(null);
                  form.reset();
                  setStripServerImage(false);
                },
              });
            } else {
              setOpen(null);
              form.reset();
            }
          },
        },
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: (createdItem) => {
          if (imageFile && createdItem?.id) {
            uploadMutation.mutate(
              { id: createdItem.id, file: imageFile, onProgress: setUploadProgress },
              { onSettled: () => { setOpen(null); form.reset(); } },
            );
          } else {
            setOpen(null);
            form.reset();
          }
        },
      });
    }
  }

  const activeCategories = (categories ?? []).filter((c) => c.status === 'active');

  return (
    <Sheet
      open={isOpen}
      onOpenChange={(v) => {
        if (!v) {
          setOpen(null);
          form.reset();
          setStripServerImage(false);
          if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
          setImageFile(null);
          setImagePreview(null);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      }}
    >
      <SheetContent className="sm:max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? 'Edit Menu Item' : 'Add Menu Item'}</SheetTitle>
          <SheetDescription>
            {isEdit ? 'Update the menu item details.' : 'Fill in the details to add a new menu item.'}
          </SheetDescription>
        </SheetHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4 p-4 overflow-y-auto">
          <div className="grid gap-2">
            <Label htmlFor="item-name">Name *</Label>
            <Input id="item-name" placeholder="e.g. Phở bò tái" {...form.register('name')} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
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
                <p className="text-sm text-destructive">{form.formState.errors.price.message}</p>
              )}
            </div>
            <div className="grid gap-2">
              <Label htmlFor="item-stock">Stock *</Label>
              <Input id="item-stock" type="number" min={0} {...form.register('stock', { valueAsNumber: true })} />
              {form.formState.errors.stock && (
                <p className="text-sm text-destructive">{form.formState.errors.stock.message}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label>Category *</Label>
            <Select defaultValue={form.getValues('categoryId')} onValueChange={(v) => form.setValue('categoryId', v)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {activeCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {form.formState.errors.categoryId && (
              <p className="text-sm text-destructive">{form.formState.errors.categoryId.message}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label>Status</Label>
            <Select
              defaultValue={form.getValues('status')}
              onValueChange={(v) => form.setValue('status', v as 'available' | 'out_of_stock')}
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
            {derivedImagePreview ? (
              <div className="grid gap-2">
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="group relative block h-32 w-full overflow-hidden rounded-md border p-0 text-left ring-offset-background transition hover:border-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <img
                      src={derivedImagePreview}
                      alt="Preview"
                      className="h-full w-full object-cover"
                    />
                    <span className="absolute inset-x-0 bottom-0 bg-black/55 py-1.5 text-center text-xs font-medium text-white">
                      Click to replace image
                    </span>
                  </button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="icon"
                    className="absolute top-1 right-1 z-10 size-6"
                    onClick={(e) => {
                      e.stopPropagation();
                      clearImage();
                    }}
                    title="Remove image"
                  >
                    <X className="size-3" />
                  </Button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 items-center justify-center gap-2 rounded-md border border-dashed text-sm text-muted-foreground hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Upload className="size-4" />
                Click to upload image
              </button>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
            {uploadMutation.isPending && (
              <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            )}
          </div>

          <SheetFooter className="mt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending || uploadMutation.isPending || clearImageMutation.isPending}>
              {isPending ? 'Saving...' : isEdit ? 'Save Changes' : 'Add Item'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
