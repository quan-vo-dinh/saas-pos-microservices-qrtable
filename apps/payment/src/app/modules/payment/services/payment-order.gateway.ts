import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import type { RequestType } from '@common/interfaces/tcp/common/request.interface';
import type { TcpClient } from '@common/interfaces/tcp/common/tcp-client.interface';
import type {
  BillMarkPaidTcpRequest,
  BillPaymentSnapshotTcpRequest,
} from '@common/interfaces/tcp/order/order-request.interface';
import type {
  BillMarkedPaidTcpResponse,
  BillPaymentSnapshotTcpResponse,
} from '@common/interfaces/tcp/order/order-response.interface';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { firstValueFrom, map, timeout } from 'rxjs';
import { CONFIGURATION } from '../../../../configuration';

@Injectable()
export class PaymentOrderGateway {
  private readonly logger = new Logger(PaymentOrderGateway.name);

  constructor(@Inject(TCP_SERVICES.ORDER_SERVICE) private readonly orderClient: TcpClient) {}

  async getBillPaymentSnapshot(
    tenantId: string,
    billId: string,
    processId?: string,
  ): Promise<BillPaymentSnapshotTcpResponse> {
    const req: RequestType<BillPaymentSnapshotTcpRequest> = {
      tenantId,
      processId,
      data: { tenantId, billId },
    };
    const wrapped = await firstValueFrom(
      this.orderClient
        .send<
          BillPaymentSnapshotTcpResponse,
          BillPaymentSnapshotTcpRequest
        >(TCP_REQUEST_MESSAGE.ORDER.BILL_GET_PAYMENT_SNAPSHOT, req)
        .pipe(
          timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS }),
          map((r) => r),
        ),
    );
    if (!wrapped?.data) {
      throw new BusinessException(ErrorCode.PAYMENT_BILL_SNAPSHOT_UNAVAILABLE, HttpStatus.BAD_GATEWAY);
    }
    return wrapped.data;
  }

  async markBillPaid(params: BillMarkPaidTcpRequest): Promise<void> {
    const req: RequestType<BillMarkPaidTcpRequest> = {
      tenantId: params.tenantId,
      processId: params.processId,
      data: {
        tenantId: params.tenantId,
        billId: params.billId,
        paymentId: params.paymentId,
        method: params.method,
        paidAt: params.paidAt,
        processId: params.processId,
      },
    };
    try {
      await firstValueFrom(
        this.orderClient
          .send<BillMarkedPaidTcpResponse, BillMarkPaidTcpRequest>(TCP_REQUEST_MESSAGE.ORDER.BILL_MARK_PAID, req)
          .pipe(
            timeout({ first: CONFIGURATION.PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS }),
            map((r) => r),
          ),
      );
    } catch (error) {
      this.logger.warn(`BILL_MARK_PAID failed for bill ${params.billId}: ${(error as Error).message}`);
    }
  }
}
