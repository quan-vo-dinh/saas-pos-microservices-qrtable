describe('Payment migration DataSource', () => {
  it('contains only Payment entities and disables synchronize', async () => {
    process.env.NODE_ENV = 'test';
    process.env.PAYMENT_TYPEORM_DATABASE = 'qrtable_payment_test';
    jest.resetModules();

    const { default: dataSource } = await import('./payment.data-source');
    const entities = dataSource.options.entities;
    expect(Array.isArray(entities)).toBe(true);
    const entityNames = (entities as unknown[])
      .filter((entity): entity is { name: string } => typeof entity === 'function')
      .map((entity) => entity.name)
      .sort();

    expect(dataSource.options.database).toBe('qrtable_payment_test');
    expect(dataSource.options.synchronize).toBe(false);
    expect(entityNames).toEqual([
      'AuditPaymentEntity',
      'PaymentEntity',
      'PaymentOutboxEventEntity',
      'TenantPaymentSettingsEntity',
    ]);
  });
});
