import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MENU_ITEM_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { Request } from '@common/interfaces/tcp/common/request.interface';
import type { ResponseType } from '@common/interfaces/tcp/common/response.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  StockDeductForOrderTcpRequest,
  StockReleaseForOrderTcpRequest,
} from '@common/interfaces/tcp/catalog/menu-item-request.interface';
import type { StockMutationOperationResult } from '@common/interfaces/tcp/catalog/menu-item-response.interface';
import { HttpStatus, Inject, Injectable } from '@nestjs/common';
import { RpcException } from '@nestjs/microservices';
import { firstValueFrom, timeout } from 'rxjs';

type StockMutationPayload = StockDeductForOrderTcpRequest | StockReleaseForOrderTcpRequest;
type TcpBusinessErrorPayload = { code?: number; errorCode?: ErrorCode; message?: string };

const STOCK_MUTATION_TCP_TIMEOUT_MS = 5_000;
const STOCK_MUTATION_OUTCOMES = new Set(['APPLIED', 'REPLAYED', 'STALE']);

@Injectable()
export class CatalogStockGatewayService {
  constructor(@Inject(TCP_SERVICES.CATALOG_SERVICE) private readonly catalogClient: TcpClient) {}

  deductForOrder(payload: StockDeductForOrderTcpRequest): Promise<StockMutationOperationResult> {
    return this.sendStockMutation(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_DEDUCT_FOR_ORDER, payload);
  }

  releaseForOrder(payload: StockReleaseForOrderTcpRequest): Promise<StockMutationOperationResult> {
    return this.sendStockMutation(TCP_REQUEST_MESSAGE.MENU_ITEM.STOCK_RELEASE_FOR_ORDER, payload);
  }

  private async sendStockMutation(
    message: string,
    payload: StockMutationPayload,
  ): Promise<StockMutationOperationResult> {
    try {
      const response = await firstValueFrom(
        this.catalogClient
          .send<ResponseType<StockMutationOperationResult>, StockMutationPayload>(
            message,
            new Request<StockMutationPayload>({ tenantId: payload.tenantId, data: payload }),
          )
          .pipe(timeout({ first: STOCK_MUTATION_TCP_TIMEOUT_MS })),
      );
      if (response.statusCode >= 400) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, response.statusCode as HttpStatus);
      }
      const data = response.data;
      if (!this.isStockMutationOperationResult(data)) {
        throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
      }
      return data;
    } catch (error) {
      if (error instanceof BusinessException) {
        throw error;
      }
      const tcpError = this.getTcpBusinessError(error);
      if (tcpError?.errorCode) {
        throw new BusinessException(tcpError.errorCode, (tcpError.code as HttpStatus) ?? HttpStatus.BAD_GATEWAY);
      }
      throw new BusinessException(ErrorCode.COMMON_INTERNAL_ERROR, HttpStatus.BAD_GATEWAY);
    }
  }

  private getTcpBusinessError(error: unknown): TcpBusinessErrorPayload | null {
    const payload = error instanceof RpcException ? error.getError() : error;
    if (!payload || typeof payload !== 'object') {
      return null;
    }
    const candidate = payload as TcpBusinessErrorPayload & { error?: TcpBusinessErrorPayload };
    return candidate.errorCode ? candidate : (candidate.error ?? null);
  }

  private isStockMutationOperationResult(value: unknown): value is StockMutationOperationResult {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      Number.isInteger(candidate.reservationVersion) &&
      (candidate.reservationVersion as number) >= 0 &&
      typeof candidate.outcome === 'string' &&
      STOCK_MUTATION_OUTCOMES.has(candidate.outcome) &&
      Array.isArray(candidate.items) &&
      candidate.items.every((item) => this.isStockMutationResult(item))
    );
  }

  private isStockMutationResult(value: unknown): boolean {
    if (!value || typeof value !== 'object') {
      return false;
    }

    const candidate = value as Record<string, unknown>;
    return (
      typeof candidate.menuItemId === 'string' &&
      typeof candidate.menuItemName === 'string' &&
      typeof candidate.requestedQuantity === 'number' &&
      typeof candidate.remainingStock === 'number' &&
      (candidate.status === MENU_ITEM_STATUS.AVAILABLE || candidate.status === MENU_ITEM_STATUS.OUT_OF_STOCK)
    );
  }
}
