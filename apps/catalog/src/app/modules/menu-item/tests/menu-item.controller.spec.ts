import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { StockMutationOperationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import { MenuItemController } from '../controllers/menu-item.controller';
import { MenuItemService } from '../services/menu-item.service';
import { StockReservationService } from '../services/stock-reservation.service';

describe('MenuItemController stock reservations', () => {
  const operationResult: StockMutationOperationResult = {
    reservationVersion: 1,
    outcome: 'APPLIED',
    items: [
      {
        menuItemId: 'm1',
        menuItemName: 'Pho',
        requestedQuantity: 2,
        remainingStock: 8,
        status: MENU_ITEM_STATUS.AVAILABLE,
      },
    ],
  };
  let controller: MenuItemController;
  let stockReservationService: {
    deductForOrder: jest.Mock;
    releaseForOrder: jest.Mock;
  };

  beforeEach(() => {
    stockReservationService = {
      deductForOrder: jest.fn(),
      releaseForOrder: jest.fn(),
    };
    controller = new MenuItemController(
      {} as MenuItemService,
      stockReservationService as unknown as StockReservationService,
    );
  });

  it('delegates deduct commands and returns the operation envelope', async () => {
    const request: StockDeductForOrderTcpRequest = {
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order:o1',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    };
    stockReservationService.deductForOrder.mockResolvedValue(operationResult);

    const response = await controller.deductForOrder(request);

    expect(stockReservationService.deductForOrder).toHaveBeenCalledWith(request);
    expect(response.data).toBe(operationResult);
  });

  it('delegates release commands and returns the operation envelope', async () => {
    const request: StockReleaseForOrderTcpRequest = {
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order-compensation:o1:1',
      reservationVersion: 1,
      items: [{ menuItemId: 'm1', quantity: 2 }],
    };
    stockReservationService.releaseForOrder.mockResolvedValue(operationResult);

    const response = await controller.releaseForOrder(request);

    expect(stockReservationService.releaseForOrder).toHaveBeenCalledWith(request);
    expect(response.data).toBe(operationResult);
  });
});
