import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type { StockMutationOperationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import { RpcException } from '@nestjs/microservices';
import { NEVER, of, throwError } from 'rxjs';
import { CatalogStockGatewayService } from '../services/catalog-stock-gateway.service';

describe('CatalogStockGatewayService', () => {
  let catalogClient: { send: jest.Mock };
  let service: CatalogStockGatewayService;

  beforeEach(() => {
    catalogClient = { send: jest.fn() };
    service = new CatalogStockGatewayService(catalogClient as unknown as TcpClient);
  });

  const deductPayload = {
    tenantId: 't1',
    orderId: 'o1',
    idempotencyKey: 'confirm-order:o1',
    items: [{ menuItemId: 'm1', quantity: 2 }],
  };

  const releasePayload = {
    tenantId: 't1',
    orderId: 'o1',
    idempotencyKey: 'confirm-order-compensation:o1:1',
    reservationVersion: 1 as number | null,
    items: [{ menuItemId: 'm1', quantity: 2 }],
  };

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

  it('sends stock deduct commands to Catalog with the tenant envelope', async () => {
    catalogClient.send.mockReturnValue(of({ statusCode: 200, data: operationResult }));

    const result = await service.deductForOrder(deductPayload);

    expect(result).toEqual(operationResult);
    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: deductPayload,
      }),
    );
  });

  it('sends stock release commands to Catalog with the tenant envelope', async () => {
    const releaseResult: StockMutationOperationResult = {
      ...operationResult,
      outcome: 'APPLIED',
      items: [{ ...operationResult.items[0], remainingStock: 10 }],
    };
    catalogClient.send.mockReturnValue(of({ statusCode: 200, data: releaseResult }));

    const result = await service.releaseForOrder(releasePayload);

    expect(result).toEqual(releaseResult);
    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: releasePayload,
      }),
    );
  });

  it('maps Catalog TCP business errors to BusinessException', async () => {
    catalogClient.send.mockReturnValue(
      throwError(
        () =>
          new RpcException({
            code: 409,
            message: 'Insufficient stock',
            errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
          }),
      ),
    );

    await expect(service.deductForOrder(deductPayload)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });
  });

  it('throws COMMON_INTERNAL_ERROR when response data is missing reservationVersion', async () => {
    catalogClient.send.mockReturnValue(of({ statusCode: 200, data: { items: [] } }));

    await expect(service.deductForOrder(deductPayload)).rejects.toMatchObject({
      errorCode: ErrorCode.COMMON_INTERNAL_ERROR,
    });
  });

  it('throws COMMON_INTERNAL_ERROR after the stock command first-response timeout', async () => {
    jest.useFakeTimers();
    catalogClient.send.mockReturnValue(NEVER);
    const onRejected = jest.fn();

    void service.deductForOrder(deductPayload).catch(onRejected);
    await jest.advanceTimersByTimeAsync(5_000);

    expect(onRejected).toHaveBeenCalledWith(expect.objectContaining({ errorCode: ErrorCode.COMMON_INTERNAL_ERROR }));
    jest.useRealTimers();
  });

  it('throws COMMON_INTERNAL_ERROR for a structurally invalid operation result', async () => {
    catalogClient.send.mockReturnValue(
      of({
        statusCode: 200,
        data: { reservationVersion: '1', outcome: 'UNKNOWN', items: {} },
      }),
    );

    await expect(service.deductForOrder(deductPayload)).rejects.toMatchObject({
      errorCode: ErrorCode.COMMON_INTERNAL_ERROR,
    });
  });

  it('maps CATALOG_STOCK_OPERATION_CONFLICT to BusinessException', async () => {
    catalogClient.send.mockReturnValue(
      throwError(
        () =>
          new RpcException({
            code: 409,
            message: 'Conflict',
            errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
          }),
      ),
    );

    await expect(service.deductForOrder(deductPayload)).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_OPERATION_CONFLICT,
    });
  });
});
