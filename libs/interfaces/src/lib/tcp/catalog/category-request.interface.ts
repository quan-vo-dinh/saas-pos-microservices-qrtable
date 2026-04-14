import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';

export type CreateCategoryTcpRequest = {
  tenantId: string;
  name: string;
  sortOrder?: number;
  status?: CATEGORY_STATUS;
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
  status?: CATEGORY_STATUS;
};

export type DeleteCategoryTcpRequest = {
  id: string;
  tenantId: string;
};

export type ReorderCategoryTcpRequest = {
  tenantId: string;
  items: Array<{ id: string; sortOrder: number }>;
};
