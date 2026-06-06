const assert = require('node:assert/strict');
const test = require('node:test');
const {
  SERVICE_POSTGRES_DATABASES,
  buildCreateDatabaseSql,
  buildDropDatabaseSql,
} = require('./provision-service-databases');

test('declares every PostgreSQL service database', () => {
  assert.deepEqual(SERVICE_POSTGRES_DATABASES, ['qrtable_catalog', 'qrtable_order', 'qrtable_payment', 'qrtable_saas']);
});

test('quotes known-safe database identifiers', () => {
  assert.equal(buildCreateDatabaseSql('qrtable_order'), 'CREATE DATABASE "qrtable_order"');
});

test('rejects unsafe database identifiers', () => {
  assert.throws(() => buildCreateDatabaseSql('qrtable_order; drop database postgres'), /Invalid database name/);
});

test('builds a guarded drop statement for local reset', () => {
  assert.equal(buildDropDatabaseSql('qrtable_order'), 'DROP DATABASE IF EXISTS "qrtable_order"');
  assert.throws(() => buildDropDatabaseSql('postgres; --'), /Invalid database name/);
});
