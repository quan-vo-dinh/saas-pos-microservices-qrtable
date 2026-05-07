import { TcpProvider, TCP_SERVICES } from './tcp.config';

type TcpConnectionOptions = {
  options: {
    host?: string;
    port?: number;
  };
};

describe('TcpProvider', () => {
  it('uses the TCP-prefixed kitchen host when configured', async () => {
    const provider = TcpProvider(TCP_SERVICES.KITCHEN_SERVICE);
    if (!provider.useFactory) {
      throw new Error('TcpProvider must define a useFactory function');
    }

    const options = (await provider.useFactory({
      get: <T>(key: string, defaultValue?: T): T | string | undefined => {
        const values: Record<string, string | number> = {
          TCP_KITCHEN_SERVICE_HOST: 'kitchen.internal',
          TCP_KITCHEN_SERVICE_PORT: 3207,
          KITCHEN_SERVICE_HOST: 'legacy-kitchen.internal',
        };

        return (values[key] as T | undefined) ?? defaultValue;
      },
    })) as TcpConnectionOptions;

    expect(options.options.host).toBe('kitchen.internal');
    expect(options.options.port).toBe(3207);
  });

  it('falls back to the legacy kitchen service host for existing environments', async () => {
    const provider = TcpProvider(TCP_SERVICES.KITCHEN_SERVICE);
    if (!provider.useFactory) {
      throw new Error('TcpProvider must define a useFactory function');
    }

    const options = (await provider.useFactory({
      get: <T>(key: string, defaultValue?: T): T | string | undefined => {
        const values: Record<string, string | number> = {
          TCP_KITCHEN_SERVICE_PORT: 3207,
          KITCHEN_SERVICE_HOST: 'legacy-kitchen.internal',
        };

        return (values[key] as T | undefined) ?? defaultValue;
      },
    })) as TcpConnectionOptions;

    expect(options.options.host).toBe('legacy-kitchen.internal');
    expect(options.options.port).toBe(3207);
  });
});
