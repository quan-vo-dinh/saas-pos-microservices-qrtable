describe('User-Access configuration', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    process.env.NODE_ENV = 'development';
    process.env.GLOBAL_PREFIX = 'api/v1';
    process.env.MONGODB_URI = 'mongodb://localhost:27017';
    delete process.env.USER_ACCESS_MONGO_DB_NAME;
    delete process.env.MONGO_DB_NAME;
    delete process.env.DATABASE_SHARED_FALLBACK_ENABLED;
    jest.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
    jest.resetModules();
  });

  it('uses qrtable_auth by default in development', async () => {
    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.MONGO_CONFIG.DB_NAME).toBe('qrtable_auth');
  });

  it('prefers USER_ACCESS_MONGO_DB_NAME over the transition fallback', async () => {
    process.env.USER_ACCESS_MONGO_DB_NAME = 'auth_dedicated';
    process.env.MONGO_DB_NAME = 'qrtable';

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.MONGO_CONFIG.DB_NAME).toBe('auth_dedicated');
  });

  it('ignores the shared Mongo database unless transition fallback is explicitly enabled', async () => {
    process.env.MONGO_DB_NAME = 'qrtable';

    let configuration = await import('./index');
    expect(configuration.CONFIGURATION.MONGO_CONFIG.DB_NAME).toBe('qrtable_auth');

    process.env.DATABASE_SHARED_FALLBACK_ENABLED = 'true';
    jest.resetModules();
    configuration = await import('./index');
    expect(configuration.CONFIGURATION.MONGO_CONFIG.DB_NAME).toBe('qrtable');
  });

  it.each(['staging', 'production'])('requires USER_ACCESS_MONGO_DB_NAME in %s', async (nodeEnv) => {
    process.env.NODE_ENV = nodeEnv;
    process.env.MONGO_DB_NAME = 'qrtable';

    await expect(import('./index')).rejects.toThrow('USER_ACCESS_MONGO_DB_NAME is required');
  });
});
