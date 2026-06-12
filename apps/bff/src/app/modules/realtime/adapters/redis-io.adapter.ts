import type { INestApplicationContext } from '@nestjs/common';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { createClient } from 'redis';
import type { ServerOptions } from 'socket.io';
import type { CorsOriginValidator } from '../../../../configuration/cors-origins';

type SocketIoServerOptions = Partial<ServerOptions> & {
  namespace?: string;
  server?: unknown;
};

export class RedisIoAdapter extends IoAdapter {
  private adapterConstructor?: ReturnType<typeof createAdapter>;

  constructor(
    appOrHttpServer: INestApplicationContext,
    private readonly corsOrigin: CorsOriginValidator,
  ) {
    super(appOrHttpServer);
  }

  async connectToRedis(url: string): Promise<void> {
    const pubClient = createClient({ url });
    const subClient = pubClient.duplicate();
    await Promise.all([pubClient.connect(), subClient.connect()]);
    this.adapterConstructor = createAdapter(pubClient, subClient);
  }

  override createIOServer(port: number, options: SocketIoServerOptions = {}): ReturnType<IoAdapter['createIOServer']> {
    const existingCors = options.cors && typeof options.cors === 'object' ? options.cors : {};
    const serverOptions: SocketIoServerOptions = {
      ...options,
      cors: {
        ...existingCors,
        origin: this.corsOrigin,
      },
    };
    const server = super.createIOServer(port, serverOptions);
    if (this.adapterConstructor) {
      server.adapter(this.adapterConstructor);
    }
    return server;
  }
}
