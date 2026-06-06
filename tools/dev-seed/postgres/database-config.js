const SERVICE_DATABASES = {
  catalog: {
    envName: 'CATALOG_TYPEORM_DATABASE',
    defaultDatabase: 'qrtable_catalog',
  },
  order: {
    envName: 'ORDER_TYPEORM_DATABASE',
    defaultDatabase: 'qrtable_order',
  },
  payment: {
    envName: 'PAYMENT_TYPEORM_DATABASE',
    defaultDatabase: 'qrtable_payment',
  },
  saas: {
    envName: 'SAAS_TYPEORM_DATABASE',
    defaultDatabase: 'qrtable_saas',
  },
};

function buildPostgresServiceConfigs(env = process.env) {
  const baseConfig = {
    host: env.TYPEORM_HOST || 'localhost',
    port: Number(env.TYPEORM_PORT || 5432),
    user: env.TYPEORM_USERNAME || 'postgres',
    password: env.TYPEORM_PASSWORD || 'postgres',
  };

  return Object.fromEntries(
    Object.entries(SERVICE_DATABASES).map(([service, definition]) => [
      service,
      {
        ...baseConfig,
        database: env[definition.envName] || definition.defaultDatabase,
      },
    ]),
  );
}

function assertSplitDatabaseTargets(configs) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    throw new Error(`Refusing to reseed PostgreSQL when NODE_ENV=${nodeEnv}`);
  }

  for (const config of Object.values(configs)) {
    if (!['localhost', '127.0.0.1'].includes(config.host)) {
      throw new Error(`Refusing to reseed non-local PostgreSQL host: ${config.host}`);
    }
  }

  const databases = Object.values(configs).map((config) => config.database);
  if (new Set(databases).size !== databases.length) {
    throw new Error('Each service must use distinct PostgreSQL databases during reseed');
  }
}

module.exports = {
  SERVICE_DATABASES,
  assertSplitDatabaseTargets,
  buildPostgresServiceConfigs,
};
