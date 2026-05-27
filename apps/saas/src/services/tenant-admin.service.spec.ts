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
  const catalogClient = { send: jest.fn() };
  const orderClient = { send: jest.fn() };

  beforeEach(() => jest.resetAllMocks());

  function createService(): TenantAdminService {
    return new TenantAdminService(
      tenantRepository as never,
      subscriptionRepository as never,
      planRepository as never,
      userClient as never,
      catalogClient as never,
      orderClient as never,
    );
  }

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
    userClient.send.mockImplementation((pattern: string, payload: { data: string | { tenantId: string } }) => {
      if (pattern === TCP_REQUEST_MESSAGE.USER.FIND_OWNER_BY_TENANT) {
        const tenantId = typeof payload.data === 'object' ? payload.data.tenantId : '';
        if (tenantId === 'tenant-4') {
          return {
            toPromise: () =>
              Promise.resolve({
                data: { userId: 'owner-4', email: 'four@example.com', firstName: 'Four', lastName: 'Owner' },
              }),
          };
        }
        return { toPromise: () => Promise.resolve({ data: null }) };
      }

      const ownerId = typeof payload.data === 'string' ? payload.data : '';
      const owners: Record<string, { email: string; firstName: string; lastName: string }> = {
        'owner-1': { email: 'one@example.com', firstName: 'Owner', lastName: 'One' },
        'owner-2': { email: 'two@example.com', firstName: '', lastName: '' },
      };
      const user = owners[ownerId];
      return { toPromise: () => Promise.resolve({ data: user }) };
    });
    tenantRepository.updateProfile.mockResolvedValue({});

    const service = createService();

    const result = await service.list({});

    expect(userClient.send).toHaveBeenCalledTimes(3);
    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-1' });
    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-2' });
    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.FIND_OWNER_BY_TENANT, {
      data: { tenantId: 'tenant-4' },
    });
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
          ownerEmail: 'four@example.com',
          ownerName: 'Four Owner',
        }),
      ]),
    );
    expect(tenantRepository.updateProfile).toHaveBeenCalledWith('tenant-4', { ownerId: 'owner-4' });
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

    const service = createService();

    const result = await service.get('tenant-1');

    expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.GET_BY_USER_ID, { data: 'owner-1' });
    expect(result).toMatchObject({
      id: 'tenant-1',
      ownerId: 'owner-1',
      ownerEmail: 'owner@example.com',
      ownerName: 'Jane Doe',
    });
  });

  describe('usage()', () => {
    beforeEach(() => {
      tenantRepository.findById.mockResolvedValue({
        id: 'tenant-1',
        name: 'A',
        slug: 'a',
        status: TenantStatus.ACTIVE,
        type: 'RESTAURANT',
        ownerId: 'owner-1',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      });
      subscriptionRepository.findActiveByTenantId.mockResolvedValue({ planCodeSnapshot: 'PRO' });
      planRepository.findByCode.mockResolvedValue({
        maxTables: 12,
        maxStaff: 8,
        maxOrdersPerDay: 200,
      });
    });

    it('resolves real usage counts from Catalog, User-Access, and Order TCP services', async () => {
      catalogClient.send.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1', count: 5 } }),
      });
      userClient.send.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1', count: 3 } }),
      });
      orderClient.send.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1', count: 17 } }),
      });

      const result = await createService().usage('tenant-1');

      expect(result).toEqual({
        tablesUsed: 5,
        tablesMax: 12,
        staffUsed: 3,
        staffMax: 8,
        ordersToday: 17,
        ordersMaxPerDay: 200,
      });
      expect(catalogClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.CATALOG.COUNT_TABLES_BY_TENANT, {
        data: { tenantId: 'tenant-1' },
      });
      expect(userClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.USER.COUNT_BY_TENANT, {
        data: { tenantId: 'tenant-1' },
      });
      expect(orderClient.send).toHaveBeenCalledWith(TCP_REQUEST_MESSAGE.ORDER.COUNT_TODAY_BY_TENANT, {
        data: { tenantId: 'tenant-1' },
      });
    });

    it('falls back only the failed downstream usage count to 0', async () => {
      catalogClient.send.mockReturnValue({
        toPromise: () => Promise.reject(new Error('catalog unavailable')),
      });
      userClient.send.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1', count: 4 } }),
      });
      orderClient.send.mockReturnValue({
        toPromise: () => Promise.resolve({ data: { tenantId: 'tenant-1', count: 21 } }),
      });

      const result = await createService().usage('tenant-1');

      expect(result).toMatchObject({
        tablesUsed: 0,
        staffUsed: 4,
        ordersToday: 21,
      });
    });
  });
});
