const mockUseQuery = jest.fn();
const mockGetServiceRequests = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useQuery: (...args: unknown[]) => mockUseQuery(...args),
  useMutation: jest.fn(),
  useQueryClient: jest.fn(),
}));

jest.mock('@/lib/auth/use-auth-ready', () => ({
  useAuthReadyForBff: () => true,
}));

jest.mock('../../services/service-request.service', () => ({
  serviceRequestService: {
    getServiceRequests: (...args: unknown[]) => mockGetServiceRequests(...args),
  },
}));

import { ServiceRequestStatus } from '@einvoice/types';
import { serviceRequestKeys, useServiceRequestsQuery } from '../use-service-request-query';

describe('service request query polling', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQuery.mockReturnValue({});
  });

  it('uses stable list query keys', () => {
    expect(serviceRequestKeys.all).toEqual(['admin-service-requests']);
    expect(serviceRequestKeys.lists()).toEqual(['admin-service-requests', 'list']);
    expect(serviceRequestKeys.list({ status: ServiceRequestStatus.PENDING })).toEqual([
      'admin-service-requests',
      'list',
      { status: ServiceRequestStatus.PENDING },
    ]);
  });

  it('polls service request lists only when auth is ready', () => {
    const params = { status: ServiceRequestStatus.ACKNOWLEDGED, limit: 50, offset: 0 };

    useServiceRequestsQuery(params);

    const config = mockUseQuery.mock.calls[0][0];
    expect(config.queryKey).toEqual(serviceRequestKeys.list(params));
    expect(config.queryFn()).toBe(mockGetServiceRequests.mock.results[0].value);
    expect(mockGetServiceRequests).toHaveBeenCalledWith(params);
    expect(config.enabled).toBe(true);
    expect(config.refetchInterval).toBe(15_000);
  });
});
