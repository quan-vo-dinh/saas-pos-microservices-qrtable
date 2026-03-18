import { CreateCatalogRequestDto, UpdateCatalogRequestDto } from '../../gateway/catalog';

export type CreateCatalogTcpRequest = CreateCatalogRequestDto;

export type GetCatalogByIdTcpRequest = {
  id: string;
};

export type UpdateCatalogTcpRequest = UpdateCatalogRequestDto & {
  id: string;
};

export type DeleteCatalogTcpRequest = {
  id: string;
};
