import type { PreparationStation } from '@einvoice/types';

export const DEDUPE_TTL_SECONDS = 14 * 24 * 60 * 60;
export const DEAD_LETTER_TTL_SECONDS = 7 * 24 * 60 * 60;
export const COMMAND_TTL_SECONDS = 24 * 60 * 60;

export function stationSlug(station: PreparationStation): string {
  return station.toLowerCase();
}

export function ticketKey(tenantId: string, ticketId: string): string {
  return `kds:${tenantId}:ticket:${ticketId}`;
}

export function ticketItemsKey(tenantId: string, ticketId: string): string {
  return `kds:${tenantId}:ticket:${ticketId}:items`;
}

export function ticketItemKey(tenantId: string, ticketItemId: string): string {
  return `kds:${tenantId}:ticket-item:${ticketItemId}`;
}

export function orderTicketsKey(tenantId: string, orderId: string): string {
  return `kds:${tenantId}:order:${orderId}:tickets`;
}

/** Session → active ticket ids (optimizes PATCH_TABLE_SNAPSHOT). */
export function sessionTicketsKey(tenantId: string, sessionId: string): string {
  return `kds:${tenantId}:session:${sessionId}:tickets`;
}

export function activeQueueKey(tenantId: string, station: PreparationStation): string {
  return `kds:${tenantId}:${stationSlug(station)}`;
}

export function readyQueueKey(tenantId: string, station: PreparationStation): string {
  return `kds:${tenantId}:station:${station}:READY`;
}

export function tenantRevisionKey(tenantId: string): string {
  return `kds:${tenantId}:revision`;
}

export function revisionKey(tenantId: string, station: PreparationStation): string {
  return `kds:${tenantId}:station:${station}:revision`;
}

export function dedupeEventKey(tenantId: string, eventId: string): string {
  return `kds:${tenantId}:dedupe:event:${eventId}`;
}

export function dedupeTicketKey(tenantId: string, orderId: string, station: PreparationStation): string {
  return `kds:${tenantId}:dedupe:order:${orderId}:${station}`;
}

export function sourceEventTicketsKey(tenantId: string, eventId: string): string {
  return `kds:${tenantId}:source-event:${eventId}:tickets`;
}

export function commandDedupeKey(tenantId: string, requestId: string): string {
  return `kds:${tenantId}:cmd:${requestId}`;
}

export function ticketSlaKey(tenantId: string, ticketId: string): string {
  return `kds:${tenantId}:ticket:${ticketId}:sla`;
}

export function globalSlaDueKey(): string {
  return 'kds:sla:due';
}

export function slaDueMember(
  tenantId: string,
  station: PreparationStation,
  ticketId: string,
  level: 'WARNING' | 'BREACH',
): string {
  return `${tenantId}|${station}|${ticketId}|${level}`;
}

export function deadLetterOrderConfirmedKey(tenantId: string): string {
  return `kds:${tenantId}:dead-letter:order-confirmed`;
}

export function cleanupDueKey(): string {
  return 'kds:cleanup:due';
}

export function slaDedupeKey(tenantId: string, ticketId: string, level: 'WARNING' | 'BREACH', bucket: string): string {
  return `kds:${tenantId}:dedupe:sla:${ticketId}:${level}:${bucket}`;
}

export function slaClaimKey(member: string): string {
  return `kds:sla:claim:${member}`;
}

export function rebuildLockKey(tenantId: string): string {
  return `lock:kds:rebuild:${tenantId}`;
}
