import { StockReservationState } from '@common/constants/enum/catalog.enum';
import type { StockMutationResult } from '@einvoice/types';
import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from './base.entity';

@Entity({ name: 'stock_reservations' })
@Index('uq_stock_reservations_tenant_order', ['tenantId', 'orderId'], { unique: true })
@Index('uq_stock_reservations_tenant_key', ['tenantId', 'reservationKey'], { unique: true })
export class StockReservation extends BaseEntity {
  @Column({ name: 'tenant_id', type: 'varchar', length: 64 })
  tenantId: string;

  @Column({ name: 'order_id', type: 'uuid' })
  orderId: string;

  @Column({ name: 'reservation_key', type: 'varchar', length: 128 })
  reservationKey: string;

  @Column({ name: 'request_hash', type: 'char', length: 64 })
  requestHash: string;

  @Column({ type: 'int', default: 0 })
  version: number;

  @Column({ type: 'varchar', length: 20, default: StockReservationState.Released })
  state: StockReservationState;

  @Column({ name: 'deduct_result', type: 'jsonb', nullable: true })
  deductResult: StockMutationResult[] | null;

  @Column({ name: 'release_result', type: 'jsonb', nullable: true })
  releaseResult: StockMutationResult[] | null;

  @Column({ name: 'last_release_key', type: 'varchar', length: 128, nullable: true })
  lastReleaseKey: string | null;

  @Column({ name: 'released_at', type: 'timestamp', nullable: true })
  releasedAt: Date | null;
}
