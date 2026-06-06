describe('Order migration DataSource', () => {
  it('contains only Order entities and disables synchronize', async () => {
    process.env.NODE_ENV = 'test';
    process.env.ORDER_TYPEORM_DATABASE = 'qrtable_order_test';
    jest.resetModules();

    const { default: dataSource } = await import('./order.data-source');
    const entities = dataSource.options.entities;
    expect(Array.isArray(entities)).toBe(true);
    const entityNames = (entities as unknown[])
      .filter((entity): entity is { name: string } => typeof entity === 'function')
      .map((entity) => entity.name)
      .sort();

    expect(dataSource.options.database).toBe('qrtable_order_test');
    expect(dataSource.options.synchronize).toBe(false);
    expect(entityNames).toEqual(['Bill', 'Order', 'OrderItem', 'OutboxEvent', 'ServiceRequest', 'Session']);
  });
});
