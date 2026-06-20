import { MENU_ITEM_STATUS, StockReservationState } from '@common/constants/enum/catalog.enum';
import { MenuItem } from '@common/entities/menu-item.entity';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type {
  StockMutationOperationResult,
  StockMutationResult,
} from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import { HttpStatus, Injectable } from '@nestjs/common';
import { DataSource, EntityManager } from 'typeorm';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { StockReservationRepository } from '../repositories/stock-reservation.repository';
import { hashStockItems, normalizeStockItems } from '../utils/stock-mutation.util';

@Injectable()
export class StockReservationService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly menuItemRepository: MenuItemRepository,
    private readonly stockReservationRepository: StockReservationRepository,
  ) {}

  async deductForOrder(data: StockDeductForOrderTcpRequest): Promise<StockMutationOperationResult> {
    const normalizedItems = normalizeStockItems(data.items);
    const requestHash = hashStockItems(data.items);
    const sortedIds = normalizedItems.map((item) => item.menuItemId);

    return this.dataSource.transaction(async (manager) => {
      const reservation = await this.stockReservationRepository.claimDeductForUpdate(
        data.tenantId,
        data.orderId,
        data.idempotencyKey,
        requestHash,
        manager,
      );

      if (reservation.reservationKey !== data.idempotencyKey || reservation.requestHash !== requestHash) {
        throw new BusinessException(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, HttpStatus.CONFLICT);
      }

      if (reservation.state === StockReservationState.Reserved) {
        return {
          reservationVersion: reservation.version,
          outcome: 'REPLAYED',
          items: reservation.deductResult ?? [],
        } satisfies StockMutationOperationResult;
      }

      const locked = await this.menuItemRepository.findByIdsForUpdate(data.tenantId, sortedIds, manager);
      if (locked.length !== sortedIds.length) {
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const byId = new Map(locked.map((row) => [row.id, row]));
      const results: StockMutationResult[] = [];

      for (const { menuItemId, quantity } of normalizedItems) {
        const item = byId.get(menuItemId) as MenuItem;
        if (item.stock < quantity) {
          throw new BusinessException(ErrorCode.CATALOG_STOCK_INSUFFICIENT, HttpStatus.CONFLICT, { menuItemId });
        }
      }

      for (const { menuItemId, quantity } of normalizedItems) {
        const item = byId.get(menuItemId) as MenuItem;
        item.stock -= quantity;
        item.status = item.stock === 0 ? MENU_ITEM_STATUS.OUT_OF_STOCK : MENU_ITEM_STATUS.AVAILABLE;
        await manager.save(MenuItem, item);
        results.push({
          menuItemId: item.id,
          menuItemName: item.name,
          requestedQuantity: quantity,
          remainingStock: item.stock,
          status: item.status,
        });
      }

      const newVersion = reservation.version + 1;
      reservation.version = newVersion;
      reservation.state = StockReservationState.Reserved;
      reservation.deductResult = results;
      reservation.releaseResult = null;
      reservation.lastReleaseKey = null;
      reservation.releasedAt = null;
      await manager.save(StockReservation, reservation);

      return {
        reservationVersion: newVersion,
        outcome: 'APPLIED',
        items: results,
      } satisfies StockMutationOperationResult;
    });
  }

  async releaseForOrder(data: StockReleaseForOrderTcpRequest): Promise<StockMutationOperationResult> {
    const normalizedItems = normalizeStockItems(data.items);
    const requestHash = hashStockItems(data.items);
    const sortedIds = normalizedItems.map((item) => item.menuItemId);

    return this.dataSource.transaction(async (manager) => {
      if (data.reservationVersion === null) {
        return this.handleLegacyRelease(data, requestHash, normalizedItems, sortedIds, manager);
      }

      const reservation = await this.stockReservationRepository.findByOrderForUpdate(
        data.tenantId,
        data.orderId,
        manager,
      );

      if (!reservation) {
        throw new BusinessException(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, HttpStatus.CONFLICT);
      }

      if (reservation.requestHash !== requestHash) {
        throw new BusinessException(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, HttpStatus.CONFLICT);
      }

      const currentVersion = reservation.version;
      const requestedVersion = data.reservationVersion;

      if (requestedVersion < currentVersion) {
        return {
          reservationVersion: currentVersion,
          outcome: 'STALE',
          items: [],
        } satisfies StockMutationOperationResult;
      }

      if (requestedVersion > currentVersion) {
        throw new BusinessException(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, HttpStatus.CONFLICT);
      }

      if (reservation.state === StockReservationState.Released) {
        return {
          reservationVersion: currentVersion,
          outcome: 'REPLAYED',
          items: reservation.releaseResult ?? [],
        } satisfies StockMutationOperationResult;
      }

      const locked = await this.menuItemRepository.findByIdsForUpdate(data.tenantId, sortedIds, manager);
      if (locked.length !== sortedIds.length) {
        throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
      }

      const byId = new Map(locked.map((row) => [row.id, row]));
      const results: StockMutationResult[] = [];

      for (const { menuItemId, quantity } of normalizedItems) {
        const item = byId.get(menuItemId) as MenuItem;
        item.stock += quantity;
        if (item.stock > 0) {
          item.status = MENU_ITEM_STATUS.AVAILABLE;
        }
        await manager.save(MenuItem, item);
        results.push({
          menuItemId: item.id,
          menuItemName: item.name,
          requestedQuantity: quantity,
          remainingStock: item.stock,
          status: item.status,
        });
      }

      const now = new Date();
      reservation.state = StockReservationState.Released;
      reservation.releaseResult = results;
      reservation.lastReleaseKey = data.idempotencyKey;
      reservation.releasedAt = now;
      await manager.save(StockReservation, reservation);

      return {
        reservationVersion: currentVersion,
        outcome: 'APPLIED',
        items: results,
      } satisfies StockMutationOperationResult;
    });
  }

  private async handleLegacyRelease(
    data: StockReleaseForOrderTcpRequest,
    requestHash: string,
    normalizedItems: Array<{ menuItemId: string; quantity: number }>,
    sortedIds: string[],
    manager: EntityManager,
  ): Promise<StockMutationOperationResult> {
    const reservation = await this.stockReservationRepository.claimLegacyReleaseForUpdate(
      data.tenantId,
      data.orderId,
      requestHash,
      manager,
    );

    const legacyReservationKey = `legacy-release:${data.orderId}`;
    if (reservation.reservationKey !== legacyReservationKey || reservation.requestHash !== requestHash) {
      throw new BusinessException(ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT, HttpStatus.CONFLICT);
    }

    if (reservation.state === StockReservationState.Released && reservation.version > 0) {
      return {
        reservationVersion: reservation.version,
        outcome: 'REPLAYED',
        items: reservation.releaseResult ?? [],
      } satisfies StockMutationOperationResult;
    }

    const locked = await this.menuItemRepository.findByIdsForUpdate(data.tenantId, sortedIds, manager);
    if (locked.length !== sortedIds.length) {
      throw new BusinessException(ErrorCode.CATALOG_MENU_ITEM_NOT_FOUND, HttpStatus.NOT_FOUND);
    }

    const byId = new Map(locked.map((row) => [row.id, row]));
    const results: StockMutationResult[] = [];

    for (const { menuItemId, quantity } of normalizedItems) {
      const item = byId.get(menuItemId) as MenuItem;
      item.stock += quantity;
      if (item.stock > 0) {
        item.status = MENU_ITEM_STATUS.AVAILABLE;
      }
      await manager.save(MenuItem, item);
      results.push({
        menuItemId: item.id,
        menuItemName: item.name,
        requestedQuantity: quantity,
        remainingStock: item.stock,
        status: item.status,
      });
    }

    const now = new Date();
    reservation.version = 1;
    reservation.state = StockReservationState.Released;
    reservation.releaseResult = results;
    reservation.lastReleaseKey = data.idempotencyKey;
    reservation.releasedAt = now;
    await manager.save(StockReservation, reservation);

    return {
      reservationVersion: 1,
      outcome: 'APPLIED',
      items: results,
    } satisfies StockMutationOperationResult;
  }
}
