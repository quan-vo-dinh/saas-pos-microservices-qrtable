const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const test = require('node:test');
const { spawnSync } = require('node:child_process');

const scriptPath = path.resolve('tools/deploy/phase7-preflight.sh');
const buildScript = fs.readFileSync(path.resolve('tools/deploy/phase7-build-images.sh'), 'utf8');
const composeFiles = [
  'docker-compose.infra.yaml',
  'docker-compose.app.yaml',
  'docker-compose.monitoring.yaml',
  'docker-compose.proxy.yaml',
];

const validEnv = `IMAGE_TAG=abcdef1
NODE_ENV=production
TYPEORM_SYNCHRONIZE=false
DATABASE_SHARED_FALLBACK_ENABLED=false
CORS_ORIGINS=https://app.example.com,https://qr.example.com
POSTGRES_PASSWORD=postgres-secret
TYPEORM_PASSWORD=postgres-secret
MANAGEMENT_APP_CLIENT_SECRET=management-secret
AUTH_KEYCLOAK_SECRET=management-secret
PAYMENT_SECRETS_ENCRYPTION_KEY=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
GRAFANA_BASIC_AUTH_HASH='$2a$14$example'
`;

function createFixture({ env = validEnv, mode = 0o600, swapKib = 2097152 } = {}) {
  const rootDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qrtable-preflight-'));
  const binDir = path.join(rootDir, 'bin');
  const envFile = path.join(rootDir, '.env.production');
  const meminfoFile = path.join(rootDir, 'meminfo');

  fs.mkdirSync(binDir);
  for (const composeFile of composeFiles) {
    fs.writeFileSync(path.join(rootDir, composeFile), '');
  }

  fs.writeFileSync(envFile, env);
  fs.chmodSync(envFile, mode);
  fs.writeFileSync(meminfoFile, `MemTotal:       4194304 kB\nSwapTotal:      ${swapKib} kB\n`);

  const dockerMock = path.join(binDir, 'docker');
  fs.writeFileSync(dockerMock, '#!/usr/bin/env bash\nexit 0\n');
  fs.chmodSync(dockerMock, 0o755);

  const gitMock = path.join(binDir, 'git');
  fs.writeFileSync(gitMock, '#!/usr/bin/env bash\necho abcdef1234567890\n');
  fs.chmodSync(gitMock, 0o755);

  return { binDir, envFile, meminfoFile, rootDir };
}

function runPreflight(options) {
  const fixture = createFixture(options);
  const result = spawnSync('bash', [scriptPath], {
    encoding: 'utf8',
    env: {
      ...process.env,
      ENV_FILE: fixture.envFile,
      MIN_DISK_KIB: '1',
      PATH: `${fixture.binDir}:${process.env.PATH}`,
      PREFLIGHT_ALLOW_ROOT: 'true',
      PROC_MEMINFO: fixture.meminfoFile,
      QRTABLE_ROOT_DIR: fixture.rootDir,
    },
  });

  fs.rmSync(fixture.rootDir, { force: true, recursive: true });
  return result;
}

test('passes with protected env, immutable tag, 4 GB RAM, and 2 GB swap', () => {
  const result = runPreflight();

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /preflight passed/i);
});

test('rejects an environment file that is not mode 0600', () => {
  const result = runPreflight({ mode: 0o644 });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /mode 0600/i);
});

test('rejects the 4 GB profile when swap is below 2 GB', () => {
  const result = runPreflight({ swapKib: 1048576 });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /at least 2 GiB swap/i);
});

test('rejects unresolved production placeholders', () => {
  const result = runPreflight({
    env: validEnv.replace('postgres-secret', 'generate_on_server'),
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /replace every placeholder/i);
});

test('rejects an image tag that does not match the checked-out commit', () => {
  const result = runPreflight({
    env: validEnv.replace('IMAGE_TAG=abcdef1', 'IMAGE_TAG=1234567'),
  });

  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /must match the checked-out Git commit/i);
});

test('build script defaults image tags to the current Git SHA', () => {
  assert.match(buildScript, /IMAGE_TAG=.*git rev-parse HEAD/);
  assert.doesNotMatch(buildScript, /IMAGE_TAG=.*phase7/);
});
