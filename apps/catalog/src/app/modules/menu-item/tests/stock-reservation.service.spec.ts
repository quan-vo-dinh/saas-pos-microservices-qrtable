import { StockReservationState } from '@common/constants/enum/catalog.enum';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import { StockReservation } from '@common/entities/stock-reservation.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import { DataSource, EntityManager } from 'typeorm';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { StockReservationRepository } from '../repositories/stock-reservation.repository';
import { StockReservationService } from '../services/stock-reservation.service';
import { hashStockItems } from '../utils/stock-mutation.util';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function makeMenuItem(overrides: Partial<MenuItem> = {}): MenuItem {
  return Object.assign(new MenuItem(), {
    id: 'item-1',
    name: 'Phở',
    stock: 10,
    status: MENU_ITEM_STATUS.AVAILABLE,
    tenantId: 't1',
    ...overrides,
  });
}

function makeReservation(overrides: Partial<StockReservation> = {}): StockReservation {
  return Object.assign(new StockReservation(), {
    id: 'res-1',
    tenantId: 't1',
    orderId: 'o1',
    reservationKey: 'confirm-order:o1',
    requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 2 }]),
    version: 0,
    state: StockReservationState.Released,
    deductResult: null,
    releaseResult: null,
    lastReleaseKey: null,
    releasedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  });
}

// ─── Test setup ───────────────────────────────────────────────────────────────

function buildMocks() {
  const mockManager = {
    save: jest.fn(),
    getRepository: jest.fn(),
    findOne: jest.fn(),
  } as unknown as EntityManager;

  const mockDataSource = {
    transaction: jest.fn((cb: (manager: EntityManager) => unknown) => cb(mockManager)),
  } as unknown as DataSource;

  const mockMenuItemRepo = {
    findByIdsForUpdate: jest.fn(),
  } as unknown as MenuItemRepository;

  const mockReservationRepo = {
    claimDeductForUpdate: jest.fn(),
    findByOrderForUpdate: jest.fn(),
    claimLegacyReleaseForUpdate: jest.fn(),
  } as unknown as StockReservationRepository;

  const service = new StockReservationService(mockDataSource, mockMenuItemRepo, mockReservationRepo);

  return { service, mockManager, mockDataSource, mockMenuItemRepo, mockReservationRepo };
}

const BASE_DEDUCT_REQUEST: StockDeductForOrderTcpRequest = {
  tenantId: 't1',
  orderId: 'o1',
  idempotencyKey: 'confirm-order:o1',
  items: [{ menuItemId: 'item-1', quantity: 2 }],
};

const BASE_RELEASE_REQUEST: StockReleaseForOrderTcpRequest = {
  tenantId: 't1',
  orderId: 'o1',
  idempotencyKey: 'confirm-order-compensation:o1:1',
  reservationVersion: 1,
  items: [{ menuItemId: 'item-1', quantity: 2 }],
};

// ─── deductForOrder ───────────────────────────────────────────────────────────

describe('StockReservationService.deductForOrder', () => {
  it('first deduct: applies stock and creates version 1 RESERVED', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const inventory = makeMenuItem({ stock: 10 });
    const reservation = makeReservation({ version: 0, state: StockReservationState.Released });

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);
    (mockMenuItemRepo.findByIdsForUpdate as jest.Mock).mockResolvedValue([inventory]);
    (mockManager.save as jest.Mock).mockResolvedValue(undefined);

    const result = await service.deductForOrder(BASE_DEDUCT_REQUEST);

    expect(result).toEqual({
      reservationVersion: 1,
      outcome: 'APPLIED',
      items: [expect.objectContaining({ menuItemId: 'item-1', remainingStock: 8 })],
    });
    // Stock was deducted on the in-memory item
    expect(inventory.stock).toBe(8);
    // Reservation was saved with new state
    expect(mockManager.save).toHaveBeenCalledWith(
      StockReservation,
      expect.objectContaining({ state: StockReservationState.Reserved, version: 1 }),
    );
  });

  it('active duplicate deduct returns REPLAYED without saving menu items', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const storedResult = [
      {
        menuItemId: 'item-1',
        menuItemName: 'Phở',
        requestedQuantity: 2,
        remainingStock: 8,
        status: MENU_ITEM_STATUS.AVAILABLE,
      },
    ];
    const reservation = makeReservation({
      version: 1,
      state: StockReservationState.Reserved,
      deductResult: storedResult,
    });

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);

    const result = await service.deductForOrder(BASE_DEDUCT_REQUEST);

    expect(result).toEqual({ reservationVersion: 1, outcome: 'REPLAYED', items: storedResult });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('payload mismatch returns CATALOG_STOCK_OPERATION_CONFLICT', async () => {
    const { service, mockReservationRepo } = buildMocks();
    const reservation = makeReservation({
      reservationKey: 'confirm-order:o1',
      requestHash: 'different-hash-value-123456789012345678901234567890123456789012',
    });

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);

    await expect(service.deductForOrder(BASE_DEDUCT_REQUEST)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
  });

  it('different idempotency key for same order returns CATALOG_STOCK_OPERATION_CONFLICT', async () => {
    const { service, mockReservationRepo } = buildMocks();
    const reservation = makeReservation({ reservationKey: 'different-key' });

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);

    await expect(service.deductForOrder(BASE_DEDUCT_REQUEST)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
  });

  it('insufficient stock does not save items or reservation', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const inventory = makeMenuItem({ stock: 1 }); // less than requested 2
    const reservation = makeReservation();

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);
    (mockMenuItemRepo.findByIdsForUpdate as jest.Mock).mockResolvedValue([inventory]);

    await expect(service.deductForOrder(BASE_DEDUCT_REQUEST)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('deduct after release (RELEASED state) creates next version', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const inventory = makeMenuItem({ stock: 10 });
    const reservation = makeReservation({
      version: 1,
      state: StockReservationState.Released,
      deductResult: null,
    });

    (mockReservationRepo.claimDeductForUpdate as jest.Mock).mockResolvedValue(reservation);
    (mockMenuItemRepo.findByIdsForUpdate as jest.Mock).mockResolvedValue([inventory]);
    (mockManager.save as jest.Mock).mockResolvedValue(undefined);

    const result = await service.deductForOrder(BASE_DEDUCT_REQUEST);

    expect(result.reservationVersion).toBe(2);
    expect(result.outcome).toBe('APPLIED');
    expect(mockManager.save).toHaveBeenCalledWith(
      StockReservation,
      expect.objectContaining({ version: 2, state: StockReservationState.Reserved }),
    );
  });
});

// ─── releaseForOrder ──────────────────────────────────────────────────────────

describe('StockReservationService.releaseForOrder', () => {
  it('matching release (RESERVED vN) applies stock restoration once', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const inventory = makeMenuItem({ stock: 8 });
    const reservation = makeReservation({
      version: 1,
      state: StockReservationState.Reserved,
      requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 2 }]),
    });

    (mockReservationRepo.findByOrderForUpdate as jest.Mock).mockResolvedValue(reservation);
    (mockMenuItemRepo.findByIdsForUpdate as jest.Mock).mockResolvedValue([inventory]);
    (mockManager.save as jest.Mock).mockResolvedValue(undefined);

    const result = await service.releaseForOrder(BASE_RELEASE_REQUEST);

    expect(result).toEqual({
      reservationVersion: 1,
      outcome: 'APPLIED',
      items: [expect.objectContaining({ menuItemId: 'item-1', remainingStock: 10 })],
    });
    expect(inventory.stock).toBe(10);
    expect(mockManager.save).toHaveBeenCalledWith(
      StockReservation,
      expect.objectContaining({ state: StockReservationState.Released }),
    );
  });

  it('duplicate matching release returns REPLAYED without saving menu items', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const storedReleaseResult = [
      {
        menuItemId: 'item-1',
        menuItemName: 'Phở',
        requestedQuantity: 2,
        remainingStock: 10,
        status: MENU_ITEM_STATUS.AVAILABLE,
      },
    ];
    const reservation = makeReservation({
      version: 1,
      state: StockReservationState.Released,
      requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 2 }]),
      releaseResult: storedReleaseResult,
    });

    (mockReservationRepo.findByOrderForUpdate as jest.Mock).mockResolvedValue(reservation);

    const result = await service.releaseForOrder(BASE_RELEASE_REQUEST);

    expect(result).toEqual({ reservationVersion: 1, outcome: 'REPLAYED', items: storedReleaseResult });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('stale release (version < current) returns STALE without saving', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const reservation = makeReservation({
      version: 2,
      state: StockReservationState.Reserved,
      requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 2 }]),
    });

    (mockReservationRepo.findByOrderForUpdate as jest.Mock).mockResolvedValue(reservation);

    const result = await service.releaseForOrder({ ...BASE_RELEASE_REQUEST, reservationVersion: 1 });

    expect(result).toEqual({ reservationVersion: 2, outcome: 'STALE', items: [] });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('future release version (version > current) returns CATALOG_STOCK_OPERATION_CONFLICT', async () => {
    const { service, mockReservationRepo } = buildMocks();
    const reservation = makeReservation({
      version: 1,
      state: StockReservationState.Reserved,
      requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 2 }]),
    });

    (mockReservationRepo.findByOrderForUpdate as jest.Mock).mockResolvedValue(reservation);

    await expect(service.releaseForOrder({ ...BASE_RELEASE_REQUEST, reservationVersion: 5 })).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
  });

  it('missing reservation for non-legacy release returns CATALOG_STOCK_OPERATION_CONFLICT', async () => {
    const { service, mockReservationRepo } = buildMocks();

    (mockReservationRepo.findByOrderForUpdate as jest.Mock).mockResolvedValue(null);

    await expect(service.releaseForOrder(BASE_RELEASE_REQUEST)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
  });
});

// ─── Legacy null-version release ──────────────────────────────────────────────

describe('StockReservationService.releaseForOrder (legacy null version)', () => {
  const LEGACY_RELEASE: StockReleaseForOrderTcpRequest = {
    tenantId: 't1',
    orderId: 'o1',
    idempotencyKey: 'cancel-processing:o1:legacy',
    reservationVersion: null,
    items: [{ menuItemId: 'item-1', quantity: 2 }],
  };

  it('legacy null-version release with no prior row applies once', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const inventory = makeMenuItem({ stock: 8 });
    const claimedReservation = makeReservation({
      reservationKey: 'legacy-release:o1',
      version: 0,
      state: StockReservationState.Released,
      releaseResult: null,
    });

    (mockReservationRepo.claimLegacyReleaseForUpdate as jest.Mock).mockResolvedValue(claimedReservation);
    (mockMenuItemRepo.findByIdsForUpdate as jest.Mock).mockResolvedValue([inventory]);
    (mockManager.save as jest.Mock).mockResolvedValue(undefined);

    const result = await service.releaseForOrder(LEGACY_RELEASE);

    expect(result).toEqual({
      reservationVersion: 1,
      outcome: 'APPLIED',
      items: [expect.objectContaining({ menuItemId: 'item-1', remainingStock: 10 })],
    });
    expect(mockManager.save).toHaveBeenCalledWith(
      StockReservation,
      expect.objectContaining({ version: 1, state: StockReservationState.Released }),
    );
  });

  it('duplicate legacy release returns REPLAYED', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const storedReleaseResult = [
      {
        menuItemId: 'item-1',
        menuItemName: 'Phở',
        requestedQuantity: 2,
        remainingStock: 10,
        status: MENU_ITEM_STATUS.AVAILABLE,
      },
    ];
    const claimedReservation = makeReservation({
      reservationKey: 'legacy-release:o1',
      version: 1,
      state: StockReservationState.Released,
      releaseResult: storedReleaseResult,
    });

    (mockReservationRepo.claimLegacyReleaseForUpdate as jest.Mock).mockResolvedValue(claimedReservation);

    const result = await service.releaseForOrder(LEGACY_RELEASE);

    expect(result).toEqual({ reservationVersion: 1, outcome: 'REPLAYED', items: storedReleaseResult });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('rejects a null-version release for a non-legacy reservation', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const currentReservation = makeReservation({
      version: 1,
      state: StockReservationState.Reserved,
    });

    (mockReservationRepo.claimLegacyReleaseForUpdate as jest.Mock).mockResolvedValue(currentReservation);

    await expect(service.releaseForOrder(LEGACY_RELEASE)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });

  it('rejects a legacy release replay when its payload hash differs', async () => {
    const { service, mockManager, mockMenuItemRepo, mockReservationRepo } = buildMocks();
    const legacyReservation = makeReservation({
      reservationKey: 'legacy-release:o1',
      requestHash: hashStockItems([{ menuItemId: 'item-1', quantity: 3 }]),
      version: 1,
      state: StockReservationState.Released,
    });

    (mockReservationRepo.claimLegacyReleaseForUpdate as jest.Mock).mockResolvedValue(legacyReservation);

    await expect(service.releaseForOrder(LEGACY_RELEASE)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
    expect(mockMenuItemRepo.findByIdsForUpdate).not.toHaveBeenCalled();
    expect(mockManager.save).not.toHaveBeenCalled();
  });
});
