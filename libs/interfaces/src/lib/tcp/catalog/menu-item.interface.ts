import { MenuItem } from '@common/entities/menu-item.entity';

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
  status?: string;
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

export type MenuItemTcpResponse = MenuItem;
