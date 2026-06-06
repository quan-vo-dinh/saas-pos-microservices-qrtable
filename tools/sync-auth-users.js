const fs = require('fs');
const path = require('path');
const { MongoClient } = require('mongodb');

const defaultCatalogPath = path.resolve(__dirname, 'auth-bootstrap-users.json');

function readBootstrapUsers(catalogPath) {
  const absolutePath = path.resolve(catalogPath || defaultCatalogPath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(`Bootstrap users file not found: ${absolutePath}`);
  }

  const raw = fs.readFileSync(absolutePath, 'utf8');
  const data = JSON.parse(raw);

  if (!Array.isArray(data)) {
    throw new Error('Bootstrap users catalog must be an array');
  }

  return data;
}

async function getKeycloakAdminToken(config) {
  if (!config.host || !config.adminUser || !config.adminPassword) {
    return '';
  }

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: 'admin-cli',
    username: config.adminUser,
    password: config.adminPassword,
  });

  const response = await fetch(`${config.host}/realms/master/protocol/openid-connect/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  if (!response.ok) {
    return '';
  }

  const payload = await response.json();
  return payload?.access_token || '';
}

async function resolveKeycloakUserId(config, adminToken, username) {
  if (!adminToken || !config.host || !config.realm || !username) {
    return '';
  }

  const response = await fetch(
    `${config.host}/admin/realms/${config.realm}/users?username=${encodeURIComponent(username)}`,
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${adminToken}`,
      },
    },
  );

  if (!response.ok) {
    return '';
  }

  const users = await response.json();
  if (!Array.isArray(users) || users.length === 0) {
    return '';
  }

  return users[0]?.id || '';
}

async function bootstrap() {
  const catalogArg = process.argv[2];
  const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
  const mongoDbName =
    process.env.USER_ACCESS_MONGO_DB_NAME || process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'qrtable_auth';
  const users = readBootstrapUsers(catalogArg);

  const keycloakConfig = {
    host: process.env.KEYCLOAK_HOST || 'http://localhost:8180',
    realm: process.env.KEYCLOAK_REALM || 'qrtable',
    adminUser: process.env.KEYCLOAK_ADMIN_USER || 'admin',
    adminPassword: process.env.KEYCLOAK_ADMIN_PASSWORD || 'admin',
  };

  const adminToken = await getKeycloakAdminToken(keycloakConfig);

  const client = new MongoClient(mongoUri);

  try {
    await client.connect();

    const db = client.db(mongoDbName);
    const roleCollection = db.collection('role');
    const userCollection = db.collection('user');

    for (const user of users) {
      const roleDoc = await roleCollection.findOne({ name: user.role });
      const keycloakUserId = await resolveKeycloakUserId(keycloakConfig, adminToken, user.username);
      const userId = keycloakUserId || user.id;

      if (!roleDoc?._id) {
        console.warn(`Skipping ${user.email}: role ${user.role} not found in role collection`);
        continue;
      }

      await userCollection.updateOne(
        { email: user.email },
        {
          $set: {
            userId,
            email: user.email,
            firstName: user.firstName || '',
            lastName: user.lastName || '',
            roles: [roleDoc._id],
          },
        },
        { upsert: true },
      );

      console.log(`Synced internal user: ${user.email} -> ${user.role} (userId=${userId})`);
    }

    console.log('Auth bootstrap users synced to MongoDB successfully.');
  } finally {
    await client.close();
  }
}

bootstrap().catch((error) => {
  console.error('Failed to sync auth bootstrap users:', error.message);
  process.exit(1);
});
