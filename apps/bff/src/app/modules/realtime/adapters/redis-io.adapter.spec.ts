import { RedisIoAdapter } from './redis-io.adapter';
import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import type { ServerOptions } from 'socket.io';
import { createCorsOriginValidator } from '../../../../configuration/cors-origins';

describe('RedisIoAdapter', () => {
  let mockAppContext: jest.Mocked<INestApplicationContext>;
  let createIoServerSpy: jest.SpyInstance;

  beforeEach(() => {
    mockAppContext = {
      get: jest.fn(),
    } as unknown as jest.Mocked<INestApplicationContext>;
    createIoServerSpy = jest.spyOn(IoAdapter.prototype, 'createIOServer').mockReturnValue({});
  });

  afterEach(() => {
    createIoServerSpy.mockRestore();
  });

  it('should receive allowlist through constructor and configure Socket.IO options correctly', () => {
    const allowedOrigins = ['https://app.example.com', 'https://qr.example.com'];
    const corsOrigin = createCorsOriginValidator(allowedOrigins);
    const adapter = new RedisIoAdapter(mockAppContext, corsOrigin);

    const options: Partial<ServerOptions> = {
      path: '/socket.io',
    };

    adapter.createIOServer(3000, options);

    expect(createIoServerSpy).toHaveBeenCalledWith(
      3000,
      expect.objectContaining({
        cors: expect.objectContaining({ origin: corsOrigin }),
      }),
    );
  });

  it('should handle undefined options and still configure Socket.IO CORS correctly', () => {
    const allowedOrigins = ['https://app.example.com', 'https://qr.example.com'];
    const corsOrigin = createCorsOriginValidator(allowedOrigins);
    const adapter = new RedisIoAdapter(mockAppContext, corsOrigin);

    adapter.createIOServer(3000);

    expect(createIoServerSpy).toHaveBeenCalledWith(3000, {
      cors: { origin: corsOrigin },
    });
  });
});
