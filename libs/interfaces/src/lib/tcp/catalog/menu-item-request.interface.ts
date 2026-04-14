import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';

export type CreateMenuItemTcpRequest = {
  tenantId: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  stock?: number;
  sortOrder?: number;
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
