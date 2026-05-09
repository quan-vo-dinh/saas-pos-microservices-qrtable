describe('Payment configuration', () => {
  const originalPaymentPort = process.env.PAYMENT_PORT;
  const originalSepayQrAccount = process.env.PAYMENT_SEPAY_QR_ACCOUNT;
  const originalSepayQrBank = process.env.PAYMENT_SEPAY_QR_BANK;
  const originalOrderTcpTimeout = process.env.PAYMENT_ORDER_TCP_TIMEOUT_MS;

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
  });

  it('uses a dedicated HTTP port by default', async () => {
    delete process.env.PAYMENT_PORT;
    jest.resetModules();

    const { CONFIGURATION } = await import('./index');

    expect(CONFIGURATION.APP_CONFIG.PORT).toBe(3304);
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
});
