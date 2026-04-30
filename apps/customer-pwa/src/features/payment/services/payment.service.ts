import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

/** Step 2.4 — staff/session bill lock uses Redis cart + orders; customer triggers via BFF POST /customer/bill/request (headers only). */
export const paymentService = {
  requestBill: () =>
    customerApi<unknown>(API_CONFIG.ENDPOINTS.BILL_REQUEST, {
      method: 'POST',
    }),
};
