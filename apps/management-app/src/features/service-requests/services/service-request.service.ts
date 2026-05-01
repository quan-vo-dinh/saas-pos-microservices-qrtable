import type { ServiceRequest, ServiceRequestStatus } from '@einvoice/types';
import { API_CONFIG } from '@/constants/api';
import { authApiClient } from '@/lib/api/authenticated-client';

export type ServiceRequestListParams = {
  status?: ServiceRequestStatus;
  limit?: number;
  offset?: number;
};

export type ServiceRequestActionResult = {
  request: ServiceRequest;
};

function buildServiceRequestsQuery(params?: ServiceRequestListParams): string {
  if (!params) {
    return '';
  }

  const searchParams = new URLSearchParams();

  if (params.status) {
    searchParams.set('status', params.status);
  }

  if (typeof params.limit === 'number') {
    searchParams.set('limit', String(params.limit));
  }

  if (typeof params.offset === 'number') {
    searchParams.set('offset', String(params.offset));
  }

  const query = searchParams.toString();
  return query ? `?${query}` : '';
}

export const serviceRequestService = {
  getServiceRequests: (params?: ServiceRequestListParams): Promise<ServiceRequest[]> =>
    authApiClient<ServiceRequest[]>(
      `${API_CONFIG.ENDPOINTS.ADMIN_SERVICE_REQUESTS}${buildServiceRequestsQuery(params)}`,
    ),

  acknowledgeServiceRequest: (id: string): Promise<ServiceRequestActionResult> =>
    authApiClient<ServiceRequestActionResult>(
      `${API_CONFIG.ENDPOINTS.ADMIN_SERVICE_REQUESTS}/${encodeURIComponent(id)}/acknowledge`,
      {
        method: 'POST',
      },
    ),

  resolveServiceRequest: (id: string): Promise<ServiceRequestActionResult> =>
    authApiClient<ServiceRequestActionResult>(
      `${API_CONFIG.ENDPOINTS.ADMIN_SERVICE_REQUESTS}/${encodeURIComponent(id)}/resolve`,
      {
        method: 'POST',
      },
    ),
};
