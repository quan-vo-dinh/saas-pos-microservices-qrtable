import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';

const EP = API_CONFIG.ENDPOINTS;

/** Mirrors PaymentTcpResponse from the Payment microservice (BFF unwraps `data`). */
export type StaffPaymentRecord = {
  id: string;
  tenantId: string;
  billId: string;
  billReference: string;
  method: string | null;
  status: 'PENDING' | 'PAID' | 'REFUND_PENDING' | 'REFUNDED' | 'FAILED';
  rawTotal: number;
  roundedTotal: number;
  roundingDelta: number;
  paidAmount?: number;
  amountReceived?: number;
  changeAmount?: number;
  paidAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type CreateVietQrResponse = StaffPaymentRecord & { qrUrl: string };

export type RefundRequestInput = {
  paymentId: string;
  reason: string;
  customerBankAccount?: string;
  customerBankName?: string;
  customerAccountName?: string;
};

export type RefundRecord = {
  id: string;
  tenantId: string;
  paymentId: string;
  amount: number;
  reason: string;
  status: 'PENDING_STAFF_ACTION' | 'CONFIRMED' | 'CANCELED';
  requestedByUserId: string;
  requestedAt: string;
  confirmedByUserId?: string;
  confirmedAt?: string;
};

export const paymentService = {
  createVietQr: (billId: string): Promise<CreateVietQrResponse> =>
    authApiClient<CreateVietQrResponse>(EP.PAYMENT_CREATE_VIETQR, {
      method: 'POST',
      body: JSON.stringify({ billId }),
    }),

  confirmCash: (billId: string, amountReceived: number): Promise<StaffPaymentRecord> =>
    authApiClient<StaffPaymentRecord>(EP.PAYMENT_CONFIRM_CASH, {
      method: 'POST',
      body: JSON.stringify({ billId, amountReceived }),
    }),

  requestRefund: (input: RefundRequestInput): Promise<RefundRecord> =>
    authApiClient<RefundRecord>(EP.PAYMENT_REFUND_REQUEST, {
      method: 'POST',
      body: JSON.stringify(input),
    }),

  confirmRefund: (refundId: string): Promise<RefundRecord> =>
    authApiClient<RefundRecord>(EP.PAYMENT_REFUND_CONFIRM, {
      method: 'POST',
      body: JSON.stringify({ refundId }),
    }),

  history: (billId?: string): Promise<StaffPaymentRecord[]> => {
    const qs = billId ? `?billId=${encodeURIComponent(billId)}` : '';
    return authApiClient<StaffPaymentRecord[]>(`${EP.PAYMENT_HISTORY}${qs}`);
  },
};
