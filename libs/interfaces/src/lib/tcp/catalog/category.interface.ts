import { Category } from '@common/entities/category.entity';

export type CreateCategoryTcpRequest = {
  tenantId: string;
  name: string;
  sortOrder?: number;
  status?: string;
};

export type GetCategoryListTcpRequest = {
  tenantId: string;
};

export type GetCategoryByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateCategoryTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  sortOrder?: number;
  status?: string;
};

export type DeleteCategoryTcpRequest = {
  id: string;
  tenantId: string;
};

export type ReorderCategoryTcpRequest = {
  tenantId: string;
  items: Array<{ id: string; sortOrder: number }>;
};

export type CategoryTcpResponse = Category;
