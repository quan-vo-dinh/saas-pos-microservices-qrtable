import { CreateTenantRequestDto, UpdateTenantRequestDto } from '../../gateway/saas';

export type CreateTenantTcpRequest = CreateTenantRequestDto;

export type GetTenantByIdTcpRequest = {
  id: string;
};

export type UpdateTenantTcpRequest = UpdateTenantRequestDto & {
  id: string;
};

export type DeleteTenantTcpRequest = {
  id: string;
};
