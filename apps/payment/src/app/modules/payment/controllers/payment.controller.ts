import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { Controller } from '@nestjs/common';
import { MessagePattern } from '@nestjs/microservices';

@Controller()
export class PaymentController {
  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.CREATE_VIETQR)
  createVietQr(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.CONFIRM_CASH)
  confirmCash(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.HANDLE_SEPAY_WEBHOOK)
  handleSepayWebhook(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_REQUEST)
  refundRequest(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.REFUND_CONFIRM)
  refundConfirm(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_HISTORY)
  getHistory(): never {
    throw new Error('Not implemented');
  }

  @MessagePattern(TCP_REQUEST_MESSAGE.PAYMENT.GET_STATUS)
  getStatus(): never {
    throw new Error('Not implemented');
  }
}
