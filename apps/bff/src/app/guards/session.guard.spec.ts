import { ExecutionContext } from '@nestjs/common';
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
    getAllAndOverride: jest.fn(),
  };

  const getContext = (request: Record<string, unknown>) =>
    ({
      getHandler: () => ({}),
      getClass: () => ({}),
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    }) as unknown as ExecutionContext;

  beforeEach(() => {
    reflector.getAllAndOverride.mockReset();
    reflector.getAllAndOverride.mockReturnValue(false);
  });

  it('bypasses anonymous session minting for class-level secured controllers', async () => {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    reflector.getAllAndOverride.mockImplementation((key: unknown) =>
      key === MetadataKey.SECURED ? { secured: true } : false,
    );
    const request = {
      headers: {},
      [MetadataKey.TENANT_ID]: 'tenant-a',
      res: { setHeader: jest.fn() },
    };
    const guard = new SessionGuard(reflector as never, cacheManager as never);

    await expect(guard.canActivate(getContext(request))).resolves.toBe(true);

    expect(reflector.getAllAndOverride).toHaveBeenCalledWith(MetadataKey.SECURED, [{}, {}]);
    expect(cacheManager.set).not.toHaveBeenCalled();
    expect(request[MetadataKey.SESSION_ID]).toBeUndefined();
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
    const guard = new SessionGuard(reflector as never, cacheManager as never);

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

  it('does not mint BFF sid when SKIP_BFF_SESSION_MINT is true (e.g. customer session join)', async () => {
    const cacheManager = {
      get: jest.fn(),
      set: jest.fn(),
      del: jest.fn(),
    };
    reflector.getAllAndOverride.mockImplementation((key: unknown) => key === MetadataKey.SKIP_BFF_SESSION_MINT);

    const request = {
      headers: {},
      [MetadataKey.TENANT_ID]: 'tenant-a',
      res: { setHeader: jest.fn() },
    };
    const guard = new SessionGuard(reflector as never, cacheManager as never);

    await expect(guard.canActivate(getContext(request))).resolves.toBe(true);

    expect(cacheManager.set).not.toHaveBeenCalled();
    expect(request[MetadataKey.SESSION_ID]).toBeUndefined();
    expect(request.res.setHeader).not.toHaveBeenCalled();
  });
});
