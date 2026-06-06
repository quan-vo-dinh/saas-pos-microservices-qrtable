const { Client } = require('pg');

const SERVICE_POSTGRES_DATABASES = ['qrtable_catalog', 'qrtable_order', 'qrtable_payment', 'qrtable_saas'];

function assertSafeDatabaseName(databaseName) {
  if (!/^[a-z][a-z0-9_]*$/.test(databaseName)) {
    throw new Error(`Invalid database name: ${databaseName}`);
  }
}

function buildCreateDatabaseSql(databaseName) {
  assertSafeDatabaseName(databaseName);
  return `CREATE DATABASE "${databaseName}"`;
}

function buildDropDatabaseSql(databaseName) {
  assertSafeDatabaseName(databaseName);
  return `DROP DATABASE IF EXISTS "${databaseName}"`;
}

function postgresAdminConfig() {
  return {
    host: process.env.TYPEORM_HOST || 'localhost',
    port: Number(process.env.TYPEORM_PORT || 5432),
    user: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'postgres',
    database: process.env.POSTGRES_ADMIN_DATABASE || 'postgres',
  };
}

function assertLocalTarget(config) {
  if (!['localhost', '127.0.0.1'].includes(config.host)) {
    throw new Error(`Refusing to provision non-local PostgreSQL host: ${config.host}`);
  }
}

async function provisionServiceDatabases() {
  const config = postgresAdminConfig();
  assertLocalTarget(config);

  const client = new Client(config);
  await client.connect();

  try {
    for (const databaseName of SERVICE_POSTGRES_DATABASES) {
      const existing = await client.query('select 1 from pg_database where datname = $1', [databaseName]);
      if (existing.rowCount) {
        console.log(`Database exists: ${databaseName}`);
        continue;
      }

      await client.query(buildCreateDatabaseSql(databaseName));
      console.log(`Database created: ${databaseName}`);
    }
  } finally {
    await client.end();
  }
}

async function resetServiceDatabases() {
  const config = postgresAdminConfig();
  assertLocalTarget(config);
  if ((process.env.NODE_ENV || 'development') !== 'development') {
    throw new Error(`Refusing to reset service databases when NODE_ENV=${process.env.NODE_ENV}`);
  }

  const client = new Client(config);
  await client.connect();

  try {
    for (const databaseName of SERVICE_POSTGRES_DATABASES) {
      await client.query(
        `select pg_terminate_backend(pid)
         from pg_stat_activity
         where datname = $1 and pid <> pg_backend_pid()`,
        [databaseName],
      );
      await client.query(buildDropDatabaseSql(databaseName));
      await client.query(buildCreateDatabaseSql(databaseName));
      console.log(`Database reset: ${databaseName}`);
    }
  } finally {
    await client.end();
  }
}

if (require.main === module) {
  if (!process.argv.includes('--yes')) {
    console.error('Usage: node tools/database/provision-service-databases.js [--reset] --yes');
    process.exitCode = 1;
  } else {
    const action = process.argv.includes('--reset') ? resetServiceDatabases : provisionServiceDatabases;
    action().catch((error) => {
      console.error(error instanceof Error ? error.stack : error);
      process.exitCode = 1;
    });
  }
}

module.exports = {
  SERVICE_POSTGRES_DATABASES,
  buildCreateDatabaseSql,
  buildDropDatabaseSql,
  provisionServiceDatabases,
  resetServiceDatabases,
};
