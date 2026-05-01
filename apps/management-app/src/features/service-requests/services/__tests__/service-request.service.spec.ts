const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

import { API_CONFIG } from '@/constants/api';
import { ServiceRequestStatus } from '@einvoice/types';
import { serviceRequestService } from '../service-request.service';

const { ADMIN_SERVICE_REQUESTS } = API_CONFIG.ENDPOINTS;

describe('serviceRequestService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('lists service requests with encoded query params', async () => {
    mockAuthApiClient.mockResolvedValue([]);

    await serviceRequestService.getServiceRequests({
      status: ServiceRequestStatus.PENDING,
      limit: 25,
      offset: 50,
    });

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${ADMIN_SERVICE_REQUESTS}?status=${encodeURIComponent(ServiceRequestStatus.PENDING)}&limit=25&offset=50`,
    );
  });

  it('posts acknowledge to the request-specific endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'request-1' });

    await serviceRequestService.acknowledgeServiceRequest('request/1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${ADMIN_SERVICE_REQUESTS}/${encodeURIComponent('request/1')}/acknowledge`,
      {
        method: 'POST',
      },
    );
  });

  it('posts resolve to the request-specific endpoint', async () => {
    mockAuthApiClient.mockResolvedValue({ id: 'request-1' });

    await serviceRequestService.resolveServiceRequest('request/1');

    expect(mockAuthApiClient).toHaveBeenCalledWith(
      `${ADMIN_SERVICE_REQUESTS}/${encodeURIComponent('request/1')}/resolve`,
      {
        method: 'POST',
      },
    );
  });
});
