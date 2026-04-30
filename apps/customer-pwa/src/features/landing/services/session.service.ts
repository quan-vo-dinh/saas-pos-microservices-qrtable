import type { ValidateQrRequest, ValidateQrResponse } from '@einvoice/types';
import type { Session } from '@einvoice/types';
import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

export const sessionService = {
  validateQr: (data: ValidateQrRequest): Promise<ValidateQrResponse> =>
    customerApi<ValidateQrResponse>(API_CONFIG.ENDPOINTS.VALIDATE_QR, {
      method: 'POST',
      body: JSON.stringify(data),
      omitSessionHeader: true,
    }),

  joinSession: (data: { tableId: string; qrToken: string }): Promise<Session> =>
    customerApi<Session>(API_CONFIG.ENDPOINTS.SESSION_JOIN, {
      method: 'POST',
      body: JSON.stringify(data),
      omitSessionHeader: true,
    }),
};
