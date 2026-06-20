import { StockReservation } from '@common/entities/stock-reservation.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { StockReservationState } from '@common/constants/enum/catalog.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, Repository } from 'typeorm';

@Injectable()
export class StockReservationRepository {
  constructor(@InjectRepository(StockReservation) private readonly repo: Repository<StockReservation>) {}

  /**
   * Insert a version-0 RELEASED claim row for a deduct operation (ON CONFLICT DO NOTHING),
   * then pessimistically lock and return the row for this (tenant, order).
   * Throws COMMON_INTERNAL_ERROR if the row cannot be reloaded after insert.
   */
  async claimDeductForUpdate(
    tenantId: string,
    orderId: string,
    reservationKey: string,
    requestHash: string,
    manager: EntityManager,
  ): Promise<StockReservation> {
    const txRepo = manager.getRepository(StockReservation);

    await txRepo
      .createQueryBuilder()
      .insert()
      .into(StockReservation)
      .values({
        tenantId,
        orderId,
        reservationKey,
        requestHash,
        version: 0,
        state: StockReservationState.Released,
        deductResult: null,
        releaseResult: null,
        lastReleaseKey: null,
        releasedAt: null,
      })
      .orIgnore()
      .execute();

    return this.lockByTenantOrder(tenantId, orderId, manager);
  }

  /**
   * Pessimistically lock the existing reservation by (tenant, order).
   * Returns null if no reservation exists yet.
   */
  async findByOrderForUpdate(
    tenantId: string,
    orderId: string,
    manager: EntityManager,
  ): Promise<StockReservation | null> {
    const rows = await manager
      .getRepository(StockReservation)
      .createQueryBuilder('r')
      .setLock('pessimistic_write')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.orderId = :orderId', { orderId })
      .getMany();

    return rows[0] ?? null;
  }

  /**
   * Insert a version-0 RELEASED claim row keyed by `legacy-release:{orderId}` (ON CONFLICT DO NOTHING),
   * then lock and return it. Used only for the null-version legacy release path.
   */
  async claimLegacyReleaseForUpdate(
    tenantId: string,
    orderId: string,
    requestHash: string,
    manager: EntityManager,
  ): Promise<StockReservation> {
    const txRepo = manager.getRepository(StockReservation);
    const legacyReservationKey = `legacy-release:${orderId}`;

    await txRepo
      .createQueryBuilder()
      .insert()
      .into(StockReservation)
      .values({
        tenantId,
        orderId,
        reservationKey: legacyReservationKey,
        requestHash,
        version: 0,
        state: StockReservationState.Released,
        deductResult: null,
        releaseResult: null,
        lastReleaseKey: null,
        releasedAt: null,
      })
      .orIgnore()
      .execute();

    return this.lockByTenantOrder(tenantId, orderId, manager);
  }

  private async lockByTenantOrder(
    tenantId: string,
    orderId: string,
    manager: EntityManager,
  ): Promise<StockReservation> {
    const rows = await manager
      .getRepository(StockReservation)
      .createQueryBuilder('r')
      .setLock('pessimistic_write')
      .where('r.tenantId = :tenantId', { tenantId })
      .andWhere('r.orderId = :orderId', { orderId })
      .getMany();

    if (!rows[0]) {
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.INTERNAL_SERVER_ERROR);
    }

    return rows[0];
  }
}
