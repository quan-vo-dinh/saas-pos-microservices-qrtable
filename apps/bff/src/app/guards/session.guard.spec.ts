import { MetadataKey } from '@common/constants/common.constant';
import { REQUEST_HEADERS } from '@common/constants/request-context.constant';
import { SessionGuard } from '@common/guards/session.guard';

jest.mock('uuid', () => ({
  v4: jest.fn().mockReturnValue('mock-uuid'),
}));

jest.mock('crypto', () => ({
  randomUUID: jest.fn().mockReturnValue('00000000-0000-4000-8000-000000000001'),
}));

describe('SessionGuard', () => {
  const reflector = {
    get: jest.fn(),
    getAllAndOverride: jest.fn(),
  };

  const getContext = (request: Record<string, unknown>) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as any;

  beforeEach(() => {
    reflector.get.mockReset();
    reflector.getAllAndOverride.mockReset();
    reflector.get.mockReturnValue(undefined);
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('mints anonymous BFF sessions in a namespace that cannot collide with Order sessions', async () => {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    const request = {
      headers: {},
      [MetadataKey.TENANT_ID]: 'tenant-a',
      res: { setHeader: jest.fn() },
    };
    const guard = new SessionGuard(reflector as any, cacheManager as any);

    await expect(guard.canActivate(getContext(request))).resolves.toBe(true);

    expect(cacheManager.set).toHaveBeenCalledWith(
      'bff-session:tenant-a:sid_00000000-0000-4000-8000-000000000001',
      expect.objectContaining({ tenantId: 'tenant-a' }),
      expect.any(Number),
    );
    expect(request[MetadataKey.SESSION_ID]).toBe('sid_00000000-0000-4000-8000-000000000001');
    expect(request.res.setHeader).toHaveBeenCalledWith(
      REQUEST_HEADERS.SESSION_ID,
      'sid_00000000-0000-4000-8000-000000000001',
    );
  });
});
