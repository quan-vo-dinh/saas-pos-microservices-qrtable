import type { ValidateQrRequest, ValidateQrResponse } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export const sessionService = {
  validateQr: (data: ValidateQrRequest): Promise<ValidateQrResponse> =>
    customerApi<ValidateQrResponse>(API_CONFIG.ENDPOINTS.VALIDATE_QR, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
};
