import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';

export type CreateTableTcpRequest = {
  tenantId: string;
  areaId: string;
  name: string;
  capacity?: number;
};

export type GetTableListTcpRequest = {
  tenantId: string;
  areaId?: string;
  status?: TABLE_STATUS;
};

export type GetTableByIdTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateTableTcpRequest = {
  id: string;
  tenantId: string;
  name?: string;
  capacity?: number;
  areaId?: string;
};

export type DeleteTableTcpRequest = {
  id: string;
  tenantId: string;
};

export type UpdateTableStatusTcpRequest = {
  id: string;
  tenantId: string;
  status: TABLE_STATUS;
  sessionId?: string;
};

export type ValidateQrTokenTcpRequest = {
  tableId: string;
  token: string;
  tenantId: string;
};

export type RegenerateQrTokenTcpRequest = {
  id: string;
  tenantId: string;
};
