describe('Payment configuration', () => {
  const originalPaymentPort = process.env.PAYMENT_PORT;
  const originalSepayQrAccount = process.env.PAYMENT_SEPAY_QR_ACCOUNT;
  const originalSepayQrBank = process.env.PAYMENT_SEPAY_QR_BANK;
  const originalOrderTcpTimeout = process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS;
  const originalNodeEnv = process.env.NODE_ENV;
  const originalPaymentTypeormDb = process.env.PAYMENT_TYPEORM_DATABASE;
  const originalTypeormDatabase = process.env.TYPEORM_DATABASE;

  afterEach(() => {
    jest.resetModules();
    if (originalPaymentPort === undefined) {
      delete process.env.PAYMENT_PORT;
    } else {
      process.env.PAYMENT_PORT = originalPaymentPort;
    }
    if (originalSepayQrAccount === undefined) {
      delete process.env.PAYMENT_SEPAY_QR_ACCOUNT;
    } else {
      process.env.PAYMENT_SEPAY_QR_ACCOUNT = originalSepayQrAccount;
    }
    if (originalSepayQrBank === undefined) {
      delete process.env.PAYMENT_SEPAY_QR_BANK;
    } else {
      process.env.PAYMENT_SEPAY_QR_BANK = originalSepayQrBank;
    }
    if (originalOrderTcpTimeout === undefined) {
      delete process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS;
    } else {
      process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS = originalOrderTcpTimeout;
    }
    if (originalNodeEnv === undefined) {
      delete process.env.NODE_ENV;
    } else {
      process.env.NODE_ENV = originalNodeEnv;
    }
    if (originalPaymentTypeormDb === undefined) {
      delete process.env.PAYMENT_TYPEORM_DATABASE;
    } else {
      process.env.PAYMENT_TYPEORM_DATABASE = originalPaymentTypeormDb;
    }
    if (originalTypeormDatabase === undefined) {
      delete process.env.TYPEORM_DATABASE;
    } else {
      process.env.TYPEORM_DATABASE = originalTypeormDatabase;
    }
  });

  it('uses a dedicated HTTP port by default', async () => {
    delete process.env.PAYMENT_PORT;
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.APP_CONFIG.PORT).toBe(3308);
  });

  it('does not fallback to demo SePay QR account and bank when env is missing', async () => {
    delete process.env.PAYMENT_SEPAY_QR_ACCOUNT;
    delete process.env.PAYMENT_SEPAY_QR_BANK;
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION).toHaveProperty('SEPAY_CONFIG.QR_ACCOUNT', undefined);
    expect(CONFIGURATION).toHaveProperty('SEPAY_CONFIG.QR_BANK', undefined);
  });

  it('loads SePay QR account and bank from canonical payment env', async () => {
    process.env.PAYMENT_SEPAY_QR_ACCOUNT = '1234567890';
    process.env.PAYMENT_SEPAY_QR_BANK = 'MBBank';
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION).toHaveProperty('SEPAY_CONFIG.QR_ACCOUNT', '1234567890');
    expect(CONFIGURATION).toHaveProperty('SEPAY_CONFIG.QR_BANK', 'MBBank');
  });

  it('uses a bounded timeout for Order TCP calls by default', async () => {
    delete process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS;
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION).toHaveProperty('PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS', 5000);
  });

  it('loads Order TCP timeout from payment-specific env', async () => {
    process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS = '2500';
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION).toHaveProperty('PAYMENT_INTEGRATION_CONFIG.ORDER_TCP_TIMEOUT_MS', 2500);
  });

  it('uses qrtable_payment by default in development', async () => {
    process.env.NODE_ENV = 'development';
    delete process.env.PAYMENT_TYPEORM_DATABASE;
    delete process.env.TYPEORM_DATABASE;
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.TYPEORM_CONFIG.DATABASE).toBe('qrtable_payment');
  });

  it('requires PAYMENT_TYPEORM_DATABASE in production', async () => {
    process.env.NODE_ENV = 'production';
    delete process.env.PAYMENT_TYPEORM_DATABASE;
    process.env.TYPEORM_DATABASE = 'qrtable';
    jest.resetModules();

    await expect(import('./index')).rejects.toThrow('PAYMENT_TYPEORM_DATABASE is required');
  });

  it('requires PAYMENT_TYPEORM_DATABASE in staging', async () => {
    process.env.NODE_ENV = 'staging';
    delete process.env.PAYMENT_TYPEORM_DATABASE;
    process.env.TYPEORM_DATABASE = 'qrtable';
    jest.resetModules();

    await expect(import('./index')).rejects.toThrow('PAYMENT_TYPEORM_DATABASE is required');
  });
});
