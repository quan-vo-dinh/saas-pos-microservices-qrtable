import { KafkaConfiguration } from '@common/configuration/kafka.config';
import { readdirSync, readFileSync, statSync } from 'fs';
import { dirname, join, relative } from 'path';

function findWorkspaceRoot(start: string): string {
  let current = start;
  while (current !== dirname(current)) {
    try {
      const pkg = JSON.parse(readFileSync(join(current, 'package.json'), 'utf8')) as { name?: string };
      if (pkg.name === '@einvoice/source') {
        return current;
      }
    } catch {
      /* keep walking */
    }
    current = dirname(current);
  }
  return start;
}

const WORKSPACE_ROOT = findWorkspaceRoot(process.cwd());
const SOURCE_ROOTS = ['apps', 'libs'];
const SOURCE_EXTENSIONS = ['.ts', '.tsx', '.js', '.jsx'];

function walk(dir: string, files: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const rel = relative(WORKSPACE_ROOT, full);
    if (
      entry === 'node_modules' ||
      entry === 'dist' ||
      entry === 'coverage' ||
      entry === '.next' ||
      entry === 'playwright-report' ||
      rel.includes('/pnpm-lock.yaml')
    ) {
      continue;
    }
    const stat = statSync(full);
    if (stat.isDirectory()) {
      walk(full, files);
      continue;
    }
    if (SOURCE_EXTENSIONS.some((ext) => full.endsWith(ext))) {
      files.push(full);
    }
  }
  return files;
}

function sourceFiles(): string[] {
  return SOURCE_ROOTS.flatMap((root) => walk(join(WORKSPACE_ROOT, root)));
}

function productionSourceFiles(): string[] {
  return sourceFiles().filter((file) => {
    const rel = relative(WORKSPACE_ROOT, file);
    return (
      !rel.endsWith('.spec.ts') &&
      !rel.endsWith('.spec.tsx') &&
      !rel.includes('/tests/') &&
      !rel.includes('/__tests__/') &&
      !rel.includes('/mocks/')
    );
  });
}

function read(relOrAbs: string): string {
  return readFileSync(relOrAbs, 'utf8');
}

describe('Phase 5 architecture contracts', () => {
  it('keeps the canonical Kafka topic registry to approved domain topics only', () => {
    const config = new KafkaConfiguration({ BROKERS: ['localhost:29092'] });
    const topicEntries = Object.entries(config)
      .filter(([key]) => key.endsWith('_TOPIC'))
      .map(([, value]) => value)
      .sort();

    expect(topicEntries).toEqual(
      ['kitchen.sla_warning', 'order.confirmed', 'order.status_changed', 'payment.completed', 'tenant.created'].sort(),
    );

    const kafkaConfigSource = read(join(WORKSPACE_ROOT, 'libs/configuration/src/lib/kafka.config.ts'));
    for (const forbidden of [
      'KAFKA_MENU_UPDATED_TOPIC',
      'KAFKA_ORDER_CREATED_TOPIC',
      'KAFKA_CART_UPDATED_TOPIC',
      'KAFKA_TABLE_TRANSFERRED_TOPIC',
      'KAFKA_SERVICE_REQUESTED_TOPIC',
      'KAFKA_TENANT_SUSPENDED_TOPIC',
    ]) {
      expect(kafkaConfigSource).not.toContain(forbidden);
    }
  });

  it('does not define or use menu realtime contracts in application source', () => {
    const offenders = productionSourceFiles().flatMap((file) => {
      const body = read(file);
      const matches = [
        'menu.updated',
        'events.menuUpdated',
        'events.menu.updated',
        'menuUpdated',
        'MENU_UPDATED',
        'MenuUpdated',
      ].filter((token) => body.includes(token));
      return matches.map((token) => `${relative(WORKSPACE_ROOT, file)} -> ${token}`);
    });

    expect(offenders).toEqual([]);
  });

  it('keeps direct Redis access in approved projects only', () => {
    const redisMarkers = [
      '@nestjs/cache-manager',
      '@keyv/redis',
      "from 'redis'",
      'from "redis"',
      "from 'ioredis'",
      'from "ioredis"',
      '@common/providers/redis-client',
      'RedisProvider',
      'RedisClientModule',
      'RedisClientService',
      'createKeyv',
      'new Redis(',
    ];
    const allowedPrefixes = [
      'apps/bff/',
      'apps/order/',
      'apps/kitchen/',
      'apps/saas/',
      'apps/payment/',
      'libs/configuration/',
      'libs/guards/',
      'libs/providers/redis-client/',
    ];

    const offenders = productionSourceFiles().flatMap((file) => {
      const rel = relative(WORKSPACE_ROOT, file);
      const body = read(file);
      const usesRedis = redisMarkers.some((marker) => body.includes(marker));
      if (!usesRedis || allowedPrefixes.some((prefix) => rel.startsWith(prefix))) {
        return [];
      }
      return rel;
    });

    expect(offenders).toEqual([]);
  });
});
