import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

type PaymentRequestPayload = {
  sessionId: string;
  paymentMethod: string;
};

type PaymentRequestResponse = {
  id: string;
  status: string;
  totalAmount: number;
};

export const paymentService = {
  requestBill: (data: PaymentRequestPayload) =>
    customerApi<PaymentRequestResponse>(API_CONFIG.ENDPOINTS.PAYMENT_REQUEST, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
