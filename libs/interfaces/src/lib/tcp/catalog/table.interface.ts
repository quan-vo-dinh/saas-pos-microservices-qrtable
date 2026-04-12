import { Table } from '@common/entities/table.entity';

export type CreateTableTcpRequest = {
  tenantId: string;
  areaId: string;
  name: string;
  capacity?: number;
};

export type GetTableListTcpRequest = {
  tenantId: string;
  areaId?: string;
  status?: string;
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
  status: string;
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

export type TableTcpResponse = Table;
