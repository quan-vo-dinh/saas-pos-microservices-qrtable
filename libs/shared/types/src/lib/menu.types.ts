export type CategoryStatus = 'active' | 'inactive';

export type MenuItemStatus = 'available' | 'out_of_stock';

export type StockMutationResult = {
  menuItemId: string;
  menuItemName: string;
  requestedQuantity: number;
  remainingStock: number;
  status: MenuItemStatus;
};

/** KDS routing — Catalog canonical (Step 2.4 Q11-A) */
export const PreparationStation = {
  KITCHEN: 'KITCHEN',
  BAR: 'BAR',
} as const;
export type PreparationStation = (typeof PreparationStation)[keyof typeof PreparationStation];

export type Category = {
  id: string;
  name: string;
  sortOrder: number;
  /** Khung giờ bán (catalog); `null` nếu không giới hạn — neo Phase 1 Step 1.2 */
  timeStart: string | null;
  timeEnd: string | null;
  status: CategoryStatus;
  itemCount: number;
  createdAt: string;
};

export type MenuItem = {
  id: string;
  categoryId: string;
  categoryName: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  stock: number;
  sortOrder: number;
  status: MenuItemStatus;
  /** Required for orderable items once Catalog migration completes; optional for transitional reads */
  station?: PreparationStation;
  createdAt: string;
};
