import { customerApi } from '@/lib/api-client';
import { API_CONFIG } from '@/constants/api';

type VerifySessionResponse = {
  sessionId: string;
  tableId: string;
  tableName: string;
  restaurantName: string;
};

export const sessionService = {
  verify: (qrToken: string) =>
    customerApi<VerifySessionResponse>(API_CONFIG.ENDPOINTS.SESSION_VERIFY, {
      method: 'POST',
      body: JSON.stringify({ qrToken }),
    }),
};
