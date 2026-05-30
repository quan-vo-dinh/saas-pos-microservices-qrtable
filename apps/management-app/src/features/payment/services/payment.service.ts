import { authApiClient } from '@/lib/api/authenticated-client';
import { API_CONFIG } from '@/constants/api';
import type { PaymentStatusValue } from '@einvoice/types';

const EP = API_CONFIG.ENDPOINTS;

/** Mirrors PaymentTcpResponse from the Payment microservice (BFF unwraps `data`). */
export type StaffPaymentRecord = {
  id: string;
  tenantId: string;
  billId: string;
  billReference: string;
  method: string | null;
  status: PaymentStatusValue;
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

  history: (billId?: string): Promise<StaffPaymentRecord[]> => {
    const qs = billId ? `?billId=${encodeURIComponent(billId)}` : '';
    return authApiClient<StaffPaymentRecord[]>(`${EP.PAYMENT_HISTORY}${qs}`);
  },
};
