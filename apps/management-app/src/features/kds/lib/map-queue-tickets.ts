import type { KdsTicketDto, KdsTicketStatus } from '@einvoice/types';
import { OrderItemStatus, type OrderItem } from '@einvoice/types';
import type { ColumnStatus, KDSStation, KDSTicketMock } from '@/mocks/kds-ticket';

function ticketStatusToColumn(status: KdsTicketStatus): ColumnStatus | null {
  if (status === 'PENDING') return 'WAITING';
  if (status === 'PROCESSING') return 'IN_PROGRESS';
  if (status === 'READY') return 'DONE';
  return null;
}

function mapItemStatus(st: string): OrderItemStatus {
  if (st === 'PENDING' || st === 'PROCESSING') return OrderItemStatus.PROCESSING;
  if (st === 'READY') return OrderItemStatus.READY;
  if (st === 'CANCELED') return OrderItemStatus.CANCELED;
  return OrderItemStatus.PROCESSING;
}

export function mapKdsTicketDtoToBoardTicket(dto: KdsTicketDto, station: KDSStation): KDSTicketMock | null {
  const columnStatus = ticketStatusToColumn(dto.status);
  if (!columnStatus) {
    return null;
  }

  const items: OrderItem[] = dto.items.map((it) => ({
    id: it.orderItemId,
    orderId: dto.orderId,
    menuItemId: it.menuItemId,
    menuItemName: it.menuItemName,
    quantity: it.quantity,
    unitPrice: it.unitPrice,
    note: it.note,
    status: mapItemStatus(it.status),
    station: dto.station,
    createdAt: dto.createdAt,
    updatedAt: dto.readyAt ?? dto.startedAt ?? dto.createdAt,
  }));

  return {
    ticketId: dto.ticketId,
    tenantId: dto.tenantId,
    orderId: dto.orderId,
    tableId: dto.tableId,
    tableName: dto.tableName,
    items,
    priority: dto.priority,
    createdAt: dto.createdAt,
    slaSeconds: dto.slaSeconds,
    station,
    columnStatus,
  };
}

export function mapSnapshotToBoardTickets(dtos: KdsTicketDto[], station: KDSStation): KDSTicketMock[] {
  const out: KDSTicketMock[] = [];
  for (const dto of dtos) {
    const mapped = mapKdsTicketDtoToBoardTicket(dto, station);
    if (mapped) {
      out.push(mapped);
    }
  }
  return out;
}
