import { Table } from '@common/entities/table.entity';

export type TableTcpResponse = Table;

export interface CountTenantTablesResponse {
  tenantId: string;
  count: number;
}
