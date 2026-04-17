import { z } from 'zod';
import type {
  CategoryStatus,
  MenuItemStatus,
  Category as CategoryType,
  MenuItem as MenuItemType,
} from '@einvoice/types';

// Re-export domain types for convenience
export type { CategoryStatus, MenuItemStatus, CategoryType, MenuItemType };

// ─── Enums ──────────────────────────────────────────
export const categoryStatusEnum = z.enum(['active', 'inactive']);

export const menuItemStatusEnum = z.enum(['available', 'out_of_stock']);

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
  name: z.string().min(1, 'Tên danh mục là bắt buộc').max(100),
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
  name: z.string().min(1, 'Tên món là bắt buộc').max(200),
  description: z.string().max(500).optional(),
  price: z.number().min(0, 'Giá phải lớn hơn hoặc bằng 0'),
  categoryId: z.string().min(1, 'Danh mục là bắt buộc'),
  stock: z.number().int().min(0, 'Số lượng tồn kho không được âm'),
  status: menuItemStatusEnum,
});

export type MenuItemMutateInput = z.infer<typeof menuItemMutateSchema>;
