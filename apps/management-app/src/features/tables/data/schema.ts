import { z } from 'zod';

// ─── Enums ──────────────────────────────────────────
export const tableStatusEnum = z.enum(['available', 'occupied', 'billing', 'cleaning']);
export type TableStatus = z.infer<typeof tableStatusEnum>;

// ─── Area ───────────────────────────────────────────
export const areaSchema = z.object({
  id: z.string(),
  name: z.string(),
  sortOrder: z.number(),
  tableCount: z.number(),
});

export type Area = z.infer<typeof areaSchema>;

export const areaMutateSchema = z.object({
  name: z.string().min(1, 'Area name is required').max(100),
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
  name: z.string().min(1, 'Table name is required').max(50),
  areaId: z.string().min(1, 'Area is required'),
  capacity: z.number().int().min(1, 'Capacity must be at least 1').max(50),
});

export type TableMutateInput = z.infer<typeof tableMutateSchema>;
