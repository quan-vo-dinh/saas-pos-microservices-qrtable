const Redis = require('ioredis');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to flush Redis without --yes');
  }
}

async function main() {
  requireYes();
  const host = process.env.REDIS_HOST || 'localhost';
  const port = Number(process.env.REDIS_PORT || 6379);
  const nodeEnv = process.env.NODE_ENV || 'development';

  if (nodeEnv !== 'development') {
    throw new Error(`Refusing to flush Redis when NODE_ENV=${nodeEnv}`);
  }
  if (!['localhost', '127.0.0.1'].includes(host)) {
    throw new Error(`Refusing to flush non-local Redis host: ${host}`);
  }

  const redis = new Redis({ host, port });
  await redis.flushdb();
  await redis.quit();
  console.log(`Redis DB flushed at ${host}:${port}`);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
