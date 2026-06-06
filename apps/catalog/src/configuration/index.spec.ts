describe('Catalog configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.GLOBAL_PREFIX = 'api/v1';
    delete process.env.CATALOG_TYPEORM_DATABASE;
    delete process.env.TYPEORM_DATABASE;
    delete process.env.DATABASE_SHARED_FALLBACK_ENABLED;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses qrtable_catalog by default in development', async () => {
    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('qrtable_catalog');
  });

  it('prefers CATALOG_TYPEORM_DATABASE over the transition fallback', async () => {
    process.env.CATALOG_TYPEORM_DATABASE = 'catalog_dedicated';
    process.env.TYPEORM_DATABASE = 'qrtable';

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('catalog_dedicated');
  });

  it('ignores the shared database unless transition fallback is explicitly enabled', async () => {
    process.env.TYPEORM_DATABASE = 'qrtable';

    let configuration = await import('./index');
    expect(configuration.CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('qrtable_catalog');

    process.env.DATABASE_SHARED_FALLBACK_ENABLED = 'true';
    jest.resetModules();
    configuration = await import('./index');
    expect(configuration.CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('qrtable');
  });

  it.each(['staging', 'production'])('requires CATALOG_TYPEORM_DATABASE in %s', async (nodeEnv) => {
    process.env.NODE_ENV = nodeEnv;
    process.env.TYPEORM_DATABASE = 'qrtable';

    await expect(import('./index')).rejects.toThrow('CATALOG_TYPEORM_DATABASE is required');
  });
});
