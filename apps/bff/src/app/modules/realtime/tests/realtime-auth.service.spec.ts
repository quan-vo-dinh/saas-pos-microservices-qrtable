jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { GRPC_SERVICES } from '@common/configuration/grpc.config';
import { ROLE } from '@common/constants/enum/role.enum';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getSessionCacheKey } from '@common/utils/request.util';
import { of } from 'rxjs';
import type { Socket } from 'socket.io';
import { RealtimeAuthService } from '../services/realtime-auth.service';

describe('RealtimeAuthService', () => {
  let service: RealtimeAuthService;
  let cache: { get: jest.Mock; set: jest.Mock };
  let authorizer: { verifyUserToken: jest.Mock };

  beforeEach(async () => {
    cache = {
      get: jest.fn().mockResolvedValue(undefined),
      set: jest.fn().mockResolvedValue(undefined),
    };
    authorizer = {
      verifyUserToken: jest.fn().mockReturnValue(
        of({
          data: {
            valid: true,
            metadata: {
              userId: 'u1',
              jwt: {
                tenant_id: 't1',
                realm_access: { roles: [ROLE.CHEF] },
              },
            },
          },
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RealtimeAuthService,
        { provide: CACHE_MANAGER, useValue: cache },
        {
          provide: GRPC_SERVICES.AUTHORIZER_SERVICE,
          useValue: {
            getService: () => authorizer,
          },
        },
      ],
    }).compile();

    service = module.get(RealtimeAuthService);
    service.onModuleInit();
  });

  it('staff JWT resolves CHEF to kitchen KDS room + staff room', async () => {
    const socket = {
      handshake: {
        auth: { token: 'tok' },
        headers: {},
      },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
    } as unknown as Socket;

    const rooms = await service.resolveConnectionRooms(socket);

    expect(rooms).toEqual(expect.arrayContaining(['tenant:t1:staff', 'tenant:t1:kds:kitchen']));
    expect(rooms.length).toBe(2);
  });

  it('staff JWT resolves camelCase proto JWT roles to KDS room', async () => {
    authorizer.verifyUserToken.mockReturnValue(
      of({
        data: {
          valid: true,
          metadata: {
            userId: 'u1',
            jwt: {
              tenantId: 't1',
              realmAccess: { roles: [ROLE.BARISTA] },
            },
          },
        },
      }),
    );

    const socket = {
      handshake: {
        auth: { token: 'tok' },
        headers: {},
      },
      data: {},
      join: jest.fn().mockResolvedValue(undefined),
    } as unknown as Socket;

    const rooms = await service.resolveConnectionRooms(socket);

    expect(rooms).toEqual(expect.arrayContaining(['tenant:t1:staff', 'tenant:t1:kds:bar']));
    expect(rooms.length).toBe(2);
  });

  it('customer auth payload resolves to customer session room', async () => {
    cache.get.mockImplementation(async (key: string) => {
      if (key === getSessionCacheKey('sid_1', 't1')) {
        return { tenantId: 't1', createdAt: Date.now(), lastActivityAt: Date.now() };
      }
      return undefined;
    });

    const socket = {
      handshake: {
        auth: { tenantId: 't1', sessionId: 'sid_1' },
        headers: {},
      },
      data: {},
    } as unknown as Socket;

    const rooms = await service.resolveConnectionRooms(socket);
    expect(rooms).toEqual(['session:sid_1:customer']);
  });

  it('customer prefers handshake.auth tenant/session over conflicting headers', async () => {
    cache.get.mockImplementation(async (key: string) => {
      if (key === getSessionCacheKey('sid_auth', 't_auth')) {
        return { tenantId: 't_auth', createdAt: Date.now(), lastActivityAt: Date.now() };
      }
      return undefined;
    });

    const socket = {
      handshake: {
        auth: { tenantId: 't_auth', sessionId: 'sid_auth' },
        headers: { 'x-tenant-id': 't_header', 'x-session-id': 'sid_header' },
      },
      data: {},
    } as unknown as Socket;

    const rooms = await service.resolveConnectionRooms(socket);
    expect(rooms).toEqual(['session:sid_auth:customer']);
    expect(cache.get).toHaveBeenCalledWith(getSessionCacheKey('sid_auth', 't_auth'));
  });

  it('customer requires existing BFF session cache entry', async () => {
    cache.get.mockImplementation(async (key: string) => {
      if (key === getSessionCacheKey('sid_1', 't1')) {
        return { tenantId: 't1', createdAt: Date.now(), lastActivityAt: Date.now() };
      }
      return undefined;
    });

    const socket = {
      handshake: { auth: {}, headers: { 'x-tenant-id': 't1', 'x-session-id': 'sid_1' } },
      data: {},
    } as unknown as Socket;

    const rooms = await service.resolveConnectionRooms(socket);
    expect(rooms).toEqual(['session:sid_1:customer']);
  });

  it('rejects customer when session cache misses', async () => {
    const socket = {
      handshake: { auth: {}, headers: { 'x-tenant-id': 't1', 'x-session-id': 'sid_x' } },
    } as unknown as Socket;

    await expect(service.resolveConnectionRooms(socket)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
