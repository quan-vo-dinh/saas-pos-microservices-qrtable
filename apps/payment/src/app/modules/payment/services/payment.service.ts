import type {
  ConfirmCashTcpRequest,
  CreateVietQrTcpRequest,
  HandleSepayWebhookTcpRequest,
  PaymentByIdTcpRequest,
  PaymentHistoryTcpRequest,
} from '@common/interfaces/tcp/payment';
import type {
  CreateVietQrTcpResponse,
  PaymentHistoryTcpResponse,
  PaymentTcpResponse,
  SepayWebhookTcpResponse,
} from '@common/interfaces/tcp/payment';
import { Injectable } from '@nestjs/common';
import { PaymentQueryService } from './payment-query.service';
import { PaymentSettlementService } from './payment-settlement.service';
import { SepayWebhookService } from './sepay-webhook.service';

@Injectable()
export class PaymentService {
  constructor(
    private readonly settlement: PaymentSettlementService,
    private readonly sepayWebhook: SepayWebhookService,
    private readonly query: PaymentQueryService,
  ) {}

  createVietQr(dto: CreateVietQrTcpRequest): Promise<CreateVietQrTcpResponse> {
    return this.settlement.createVietQr(dto);
  }

  confirmCash(dto: ConfirmCashTcpRequest): Promise<PaymentTcpResponse> {
    return this.settlement.confirmCash(dto);
  }

  handleSepayWebhook(dto: HandleSepayWebhookTcpRequest): Promise<SepayWebhookTcpResponse> {
    return this.sepayWebhook.handleSepayWebhook(dto);
  }

  getHistory(dto: PaymentHistoryTcpRequest): Promise<PaymentHistoryTcpResponse> {
    return this.query.getHistory(dto);
  }

  getStatus(dto: PaymentByIdTcpRequest): Promise<PaymentTcpResponse> {
    return this.query.getStatus(dto);
  }
}
