import type { KdsQueueSnapshot, KdsTicketDto, PreparationStation } from '@einvoice/types';

export type KdsQueueTcpResponse = KdsQueueSnapshot;
export type KdsTicketTcpResponse = KdsTicketDto;

export type KdsMutationTcpResponse = {
  ticket: KdsTicketDto;
  revision: number;
};

export type KdsRebuildTenantTcpResponse = {
  tenantId: string;
  station?: PreparationStation;
  rebuiltTickets: number;
  revision: number;
};
