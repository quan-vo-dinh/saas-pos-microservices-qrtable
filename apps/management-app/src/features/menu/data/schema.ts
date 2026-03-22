import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────
export const categoryStatusEnum = z.enum(['active', 'inactive']);
export type CategoryStatus = z.infer<typeof categoryStatusEnum>;

export const menuItemStatusEnum = z.enum(['available', 'out_of_stock']);
export type MenuItemStatus = z.infer<typeof menuItemStatusEnum>;

// ─── Category ───────────────────────────────────────
export const categorySchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  timeStart: z.string().nullable(),
  timeEnd: z.string().nullable(),
  status: categoryStatusEnum,
  itemCount: z.number(),
  createdAt: z.string(),
});

export type Category = z.infer<typeof categorySchema>;

export const categoryMutateSchema = z.object({
  name: z.string().min(1, 'Category name is required').max(100),
  timeStart: z.string().optional(),
  timeEnd: z.string().optional(),
  status: categoryStatusEnum,
});

export type CategoryMutateInput = z.infer<typeof categoryMutateSchema>;

// ─── Menu Item ──────────────────────────────────────
export const menuItemSchema = z.object({
  id: z.string(),
  categoryId: z.string(),
  categoryName: z.string(),
  name: z.string(),
  description: z.string().nullable(),
  price: z.number(),
  imageUrl: z.string().nullable(),
  stock: z.number(),
  sortOrder: z.number(),
  status: menuItemStatusEnum,
  createdAt: z.string(),
});

export type MenuItem = z.infer<typeof menuItemSchema>;

export const menuItemMutateSchema = z.object({
  name: z.string().min(1, 'Item name is required').max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Price must be positive'),
  categoryId: z.string().min(1, 'Category is required'),
  stock: z.number().int().min(0, 'Stock must be non-negative'),
  status: menuItemStatusEnum,
});

export type MenuItemMutateInput = z.infer<typeof menuItemMutateSchema>;
