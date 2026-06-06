describe('Order configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.GLOBAL_PREFIX = 'api/v1';
    delete process.env.ORDER_TYPEORM_DATABASE;
    delete process.env.TYPEORM_DATABASE;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses qrtable_order by default in development', async () => {
    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('qrtable_order');
  });

  it('prefers ORDER_TYPEORM_DATABASE over the transition fallback', async () => {
    process.env.ORDER_TYPEORM_DATABASE = 'order_dedicated';
    process.env.TYPEORM_DATABASE = 'qrtable';

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('order_dedicated');
  });

  it.each(['staging', 'production'])('requires ORDER_TYPEORM_DATABASE in %s', async (nodeEnv) => {
    process.env.NODE_ENV = nodeEnv;
    process.env.TYPEORM_DATABASE = 'qrtable';

    await expect(import('./index')).rejects.toThrow('ORDER_TYPEORM_DATABASE is required');
  });
});
