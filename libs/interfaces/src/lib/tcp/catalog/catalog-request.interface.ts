import { CreateCatalogRequestDto, UpdateCatalogRequestDto } from '../../gateway/catalog';

export type CreateCatalogTcpRequest = CreateCatalogRequestDto & {
  tenantId?: string;
};

export type GetCatalogByIdTcpRequest = {
  id: string;
  tenantId?: string;
};

export type UpdateCatalogTcpRequest = UpdateCatalogRequestDto & {
  id: string;
  tenantId?: string;
};

export type DeleteCatalogTcpRequest = {
  id: string;
  tenantId?: string;
};

export type GetCatalogListTcpRequest = {
  tenantId?: string;
};
