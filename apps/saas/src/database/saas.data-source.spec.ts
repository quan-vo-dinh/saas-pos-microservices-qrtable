describe('SaaS migration DataSource', () => {
  it('contains only SaaS entities and disables synchronize', async () => {
    process.env.NODE_ENV = 'test';
    process.env.SAAS_TYPEORM_DATABASE = 'qrtable_saas_test';
    jest.resetModules();

    const { default: dataSource } = await import('./saas.data-source');
    const entities = dataSource.options.entities;
    expect(Array.isArray(entities)).toBe(true);
    const entityNames = (entities as unknown[])
      .filter((entity): entity is { name: string } => typeof entity === 'function')
      .map((entity) => entity.name)
      .sort();

    expect(dataSource.options.database).toBe('qrtable_saas_test');
    expect(dataSource.options.synchronize).toBe(false);
    expect(entityNames).toEqual(['PricingPlan', 'SaasOutboxEvent', 'Subscription', 'SubscriptionInvoice', 'Tenant']);
  });
});
