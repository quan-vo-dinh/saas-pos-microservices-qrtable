import { TCP_REQUEST_MESSAGE } from '@common/constants/enum/tcp-request-message';
import { TenantStatus } from '@common/constants/saas.constants';
import { TenantAdminService } from './tenant-admin.service';

describe('TenantAdminService', () => {
  const tenantRepository = {
    list: jest.fn(),
    findById: jest.fn(),
    updateProfile: jest.fn(),
    countByStatus: jest.fn(),
  };
  const subscriptionRepository = {
    findActiveByTenantIds: jest.fn(),
    findActiveByTenantId: jest.fn(),
  };
  const planRepository = { listActive: jest.fn(), findByCode: jest.fn() };
  const userClient = { send: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  it('resolves unique owners in list()', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    tenantRepository.list.mockResolvedValue({
      items: [
        {
          id: 'tenant-1',
          name: 'A',
          slug: 'a',
          status: TenantStatus.ACTIVE,
          type: 'RESTAURANT',
          ownerId: 'owner-1',
          createdAt,
        },
        {
          id: 'tenant-2',
          name: 'B',
          slug: 'b',
          status: TenantStatus.ACTIVE,
          type: 'RESTAURANT',
          ownerId: 'owner-2',
          createdAt,
        },
        {
          id: 'tenant-3',
          name: 'C',
          slug: 'c',
          status: TenantStatus.ACTIVE,
          type: 'RESTAURANT',
          ownerId: 'owner-1',
          createdAt,
        },
        {
          id: 'tenant-4',
          name: 'D',
          slug: 'd',
          status: TenantStatus.ACTIVE,
          type: 'RESTAURANT',
          ownerId: null,
          createdAt,
        },
      ],
      page: 1,
      limit: 20,
      total: 4,
    });
    subscriptionRepository.findActiveByTenantIds.mockResolvedValue([]);
    userClient.send.mockImplementation((_pattern: string, payload: { data: string }) => {
      const owners: Record<string, { email: string; firstName: string; lastName: string }> = {
        'owner-1': { email: 'one@example.com', firstName: 'Owner', lastName: 'One' },
        'owner-2': { email: 'two@example.com', firstName: '', lastName: '' },
      };
      const user = owners[payload.data];
      return { toPromise: () => Promise.resolve({ data: user }) };
    });

    const service = new TenantAdminService(
      tenantRepository as never,
      subscriptionRepository as never,
      planRepository as never,
      userClient as never,
    );

    const result = await service.list({});

    expect(userClient.send).toHaveBeenCalledTimes(2);
    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-1' });
    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-2' });
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'tenant-1',
          ownerEmail: 'one@example.com',
          ownerName: 'Owner One',
        }),
        expect.objectContaining({
          id: 'tenant-2',
          ownerEmail: 'two@example.com',
          ownerName: 'two@example.com',
        }),
        expect.objectContaining({
          id: 'tenant-4',
          ownerEmail: null,
          ownerName: null,
        }),
      ]),
    );
  });

  it('resolves owner in get()', async () => {
    const createdAt = new Date('2026-01-01T00:00:00.000Z');
    tenantRepository.findById.mockResolvedValue({
      id: 'tenant-1',
      name: 'A',
      slug: 'a',
      status: TenantStatus.ACTIVE,
      type: 'RESTAURANT',
      ownerId: 'owner-1',
      createdAt,
      defaultCurrency: 'VND',
      defaultLocale: 'vi-VN',
      operatingModes: [],
    });
    subscriptionRepository.findActiveByTenantId.mockResolvedValue(null);
    userClient.send.mockReturnValue({
      toPromise: () =>
        Promise.resolve({
          data: { email: 'owner@example.com', firstName: 'Jane', lastName: 'Doe' },
        }),
    });

    const service = new TenantAdminService(
      tenantRepository as never,
      subscriptionRepository as never,
      planRepository as never,
      userClient as never,
    );

    const result = await service.get('tenant-1');

    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-1' });
    expect(result).toMatchObject({
      id: 'tenant-1',
      ownerId: 'owner-1',
      ownerEmail: 'owner@example.com',
      ownerName: 'Jane Doe',
    });
  });
});
