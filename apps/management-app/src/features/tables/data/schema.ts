import { z } from 'zod';
import type { TableStatus, Area as AreaType, RestaurantTable as TableType } from '@einvoice/types';

// Re-export domain types for convenience
export type { TableStatus, AreaType, TableType };

// ─── Enums ──────────────────────────────────────────
export const tableStatusEnum = z.enum(['available', 'occupied', 'billing', 'cleaning']);

// ─── Area ───────────────────────────────────────────
export const areaSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  tableCount: z.number(),
});

export type Area = z.infer<typeof areaSchema>;

export const areaMutateSchema = z.object({
  name: z.string().min(1, 'Tên khu vực là bắt buộc').max(100),
  sortOrder: z.number().int().min(0).optional(),
});

export type AreaMutateInput = z.infer<typeof areaMutateSchema>;

// ─── Table ──────────────────────────────────────────
export const tableSchema = z.object({
  id: z.string(),
  areaId: z.string(),
  areaName: z.string(),
  name: z.string(),
  capacity: z.number(),
  status: tableStatusEnum,
  qrToken: z.string(),
  sessionId: z.string().nullable(),
});

export type RestaurantTable = z.infer<typeof tableSchema>;

export const tableMutateSchema = z.object({
  name: z.string().min(1, 'Tên bàn là bắt buộc').max(50),
  areaId: z.string().min(1, 'Khu vực là bắt buộc'),
  capacity: z.number().int().min(1, 'Sức chứa tối thiểu là 1').max(50),
});

export type TableMutateInput = z.infer<typeof tableMutateSchema>;
