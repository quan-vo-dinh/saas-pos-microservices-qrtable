describe('Catalog migration DataSource', () => {
  it('contains only Catalog entities and disables synchronize', async () => {
    process.env.NODE_ENV = 'test';
    process.env.CATALOG_TYPEORM_DATABASE = 'qrtable_catalog_test';
    jest.resetModules();

    const { default: dataSource } = await import('./catalog.data-source');
    const entities = dataSource.options.entities;
    expect(Array.isArray(entities)).toBe(true);
    const entityNames = (entities as unknown[])
      .filter((entity): entity is { name: string } => typeof entity === 'function')
      .map((entity) => entity.name)
      .sort();

    expect(dataSource.options.database).toBe('qrtable_catalog_test');
    expect(dataSource.options.synchronize).toBe(false);
    expect(entityNames).toEqual(['Area', 'Category', 'MenuItem', 'Table']);
  });
});
