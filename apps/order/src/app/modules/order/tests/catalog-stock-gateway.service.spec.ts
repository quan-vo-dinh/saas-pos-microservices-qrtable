import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import { RpcException } from '@nestjs/microservices';
import { of, throwError } from 'rxjs';
import { CatalogStockGatewayService } from '../services/catalog-stock-gateway.service';

describe('CatalogStockGatewayService', () => {
  let catalogClient: { send: jest.Mock };
  let service: CatalogStockGatewayService;

  beforeEach(() => {
    catalogClient = { send: jest.fn() };
    service = new CatalogStockGatewayService(catalogClient as unknown as TcpClient);
  });

  it('sends stock deduct commands to Catalog with the tenant envelope', async () => {
    const payload = {
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order:o1',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    };
    const stockResult = [{ menuItemId: 'm1', menuItemName: 'Pho', requestedQuantity: 2, remainingStock: 8 }];
    catalogClient.send.mockReturnValue(of({ statusCode: 200, data: stockResult }));

    await expect(service.deductForOrder(payload)).resolves.toBe(stockResult);

    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: payload,
      }),
    );
  });

  it('sends stock release commands to Catalog with the tenant envelope', async () => {
    const payload = {
      tenantId: 't1',
      orderId: 'o1',
      idempotencyKey: 'confirm-order-compensation:o1',
      items: [{ menuItemId: 'm1', quantity: 2 }],
    };
    const stockResult = [{ menuItemId: 'm1', menuItemName: 'Pho', requestedQuantity: 2, remainingStock: 10 }];
    catalogClient.send.mockReturnValue(of({ statusCode: 200, data: stockResult }));

    await expect(service.releaseForOrder(payload)).resolves.toBe(stockResult);

    expect(catalogClient.send).toHaveBeenCalledWith(
      TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER,
      expect.objectContaining({
        tenantId: 't1',
        data: payload,
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

    await expect(
      service.deductForOrder({
        tenantId: 't1',
        orderId: 'o1',
        idempotencyKey: 'confirm-order:o1',
        items: [{ menuItemId: 'm1', quantity: 2 }],
      }),
    ).rejects.toMatchObject({
      errorCode: ErrorCode.CATALOG_STOCK_INSUFFICIENT,
    });
  });
});
