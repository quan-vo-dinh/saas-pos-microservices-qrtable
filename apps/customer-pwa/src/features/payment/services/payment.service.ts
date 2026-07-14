import type { PaymentStatusValue } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

/** Unwrapped BFF body for POST VIETQR_CREATE — mirrors payment + VietQR presentation fields. */
export type CustomerVietQrResponse = {
  id: string;
  tenantId: string;
  billId: string;
  billReference: string;
  qrUrl: string;
  bankAccount: string;
  bankName: string;
  roundedTotal: number;
  rawTotal: number;
  roundingDelta: number;
  status: PaymentStatusValue;
  createdAt: string;
  updatedAt: string;
};

/** Step 2.4 — staff/session bill lock uses Redis cart + orders; customer triggers via BFF POST /customer/bill/request (headers only). */
export const paymentService = {
  createVietQrForCurrentBill: (): Promise<CustomerVietQrResponse> =>
    customerApi<CustomerVietQrResponse>(API_CONFIG.ENDPOINTS.VIETQR_CREATE, {
      method: 'POST',
    }),
};
