import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';

export type CreateMenuItemTcpRequest = {
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  sortOrder?: number;
  station?: PREPARATION_STATION;
};

export type GetMenuItemListTcpRequest = {
  tenantId: string;
  categoryId?: string;
};

export type GetMenuItemByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateMenuItemTcpRequest = {
  id: string;
  tenantId: string;
  categoryId?: string;
  name?: string;
  description?: string;
  price?: number;
  stock?: number;
  sortOrder?: number;
  status?: MENU_ITEM_STATUS;
  station?: PREPARATION_STATION;
};

export type SoftDeleteMenuItemTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateMenuItemImageTcpRequest = {
  id: string;
  tenantId: string;
  imageUrl: string;
  imagePublicId: string;
};

export type ValidateOrderableItemInput = {
  menuItemId: string;
  quantity: number;
};

export type ValidateOrderableTcpRequest = {
  tenantId: string;
  items: ValidateOrderableItemInput[];
};

export type StockDeductForOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  items: ValidateOrderableItemInput[];
};

export type StockReleaseForOrderTcpRequest = {
  tenantId: string;
  orderId: string;
  idempotencyKey: string;
  items: ValidateOrderableItemInput[];
};
