import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';
import type { KdsQueueSnapshot, KdsTicketDto, PreparationStation } from '@einvoice/types';

export type KdsTicketMutationData = {
  ticket: KdsTicketDto;
  revision: number;
};

function stationQs(station: PreparationStation): string {
  return `station=${encodeURIComponent(station)}`;
}

export async function fetchKdsQueue(station: PreparationStation): Promise<KdsQueueSnapshot> {
  return authApiClient<KdsQueueSnapshot>(`${API_CONFIG.ENDPOINTS.KDS_QUEUE}?${stationQs(station)}`, {
    method: 'GET',
  });
}

export async function startKdsTicket(
  station: PreparationStation,
  ticketId: string,
  requestId: string,
): Promise<KdsTicketMutationData> {
  const path = `${API_CONFIG.ENDPOINTS.KDS_TICKET_START(ticketId)}?${stationQs(station)}`;
  return authApiClient<KdsTicketMutationData>(path, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}

export async function markKdsTicketDone(
  station: PreparationStation,
  ticketId: string,
  requestId: string,
): Promise<KdsTicketMutationData> {
  const path = `${API_CONFIG.ENDPOINTS.KDS_TICKET_DONE(ticketId)}?${stationQs(station)}`;
  return authApiClient<KdsTicketMutationData>(path, {
    method: 'POST',
    body: JSON.stringify({ requestId }),
  });
}

export async function recallKdsTicket(
  station: PreparationStation,
  ticketId: string,
  requestId: string,
  reason?: string,
): Promise<KdsTicketMutationData> {
  const path = `${API_CONFIG.ENDPOINTS.KDS_TICKET_RECALL(ticketId)}?${stationQs(station)}`;
  return authApiClient<KdsTicketMutationData>(path, {
    method: 'POST',
    body: JSON.stringify({ requestId, reason }),
  });
}

export async function setKdsTicketPriority(
  station: PreparationStation,
  ticketId: string,
  requestId: string,
  priority: boolean,
): Promise<KdsTicketMutationData> {
  const path = `${API_CONFIG.ENDPOINTS.KDS_TICKET_PRIORITY(ticketId)}?${stationQs(station)}`;
  return authApiClient<KdsTicketMutationData>(path, {
    method: 'POST',
    body: JSON.stringify({ requestId, priority }),
  });
}
