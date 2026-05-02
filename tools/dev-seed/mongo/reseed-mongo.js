const fs = require('fs');
const path = require('path');
const { MongoClient, ObjectId } = require('mongodb');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to reseed MongoDB without --yes');
  }
}

function assertDevTarget(uri) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    throw new Error(`Refusing to reseed MongoDB when NODE_ENV=${nodeEnv}`);
  }

  const hosts = parseMongoHosts(uri);
  const nonLocalHost = hosts.find((host) => !['localhost', '127.0.0.1', '::1'].includes(host));
  if (nonLocalHost) {
    throw new Error(`Refusing to reseed non-local MongoDB host: ${nonLocalHost}`);
  }
}

function parseMongoHosts(uri) {
  const match = uri.match(/^mongodb(?:\+srv)?:\/\/([^/?#]+)/);
  if (!match) {
    throw new Error(`Invalid MongoDB uri: ${uri}`);
  }

  const authority = match[1].includes('@') ? match[1].slice(match[1].lastIndexOf('@') + 1) : match[1];
  const endpoints = splitMongoHostList(authority);

  return endpoints.map((endpoint) => {
    if (endpoint.startsWith('[')) {
      const closingBracket = endpoint.indexOf(']');
      if (closingBracket === -1) {
        throw new Error(`Invalid MongoDB host: ${endpoint}`);
      }
      return endpoint.slice(1, closingBracket);
    }

    return endpoint.split(':')[0];
  });
}

function splitMongoHostList(hostList) {
  const hosts = [];
  let current = '';
  let bracketDepth = 0;

  for (const char of hostList) {
    if (char === '[') bracketDepth += 1;
    if (char === ']') bracketDepth -= 1;

    if (char === ',' && bracketDepth === 0) {
      hosts.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  hosts.push(current);
  return hosts.filter(Boolean);
}

function mapValue(value) {
  if (value && typeof value === 'object' && value.$oid) {
    return new ObjectId(value.$oid);
  }
  if (value && typeof value === 'object' && value.$date) {
    return new Date(value.$date);
  }
  return value;
}

function mapDoc(doc) {
  return Object.fromEntries(Object.entries(doc).map(([key, value]) => [key, mapValue(value)]));
}

async function main() {
  requireYes();
  const mongoUri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017';
  const mongoDbName = process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'qrtable';
  assertDevTarget(mongoUri);

  const roleSeedPath = path.resolve('apps/user-access/src/seeder/role.json');
  const roleSeed = JSON.parse(fs.readFileSync(roleSeedPath, 'utf8'));
  const roles = roleSeed.data.map(mapDoc);

  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const db = client.db(mongoDbName);
    await db.collection('role').deleteMany({});
    await db.collection('user').deleteMany({});
    if (roles.length > 0) {
      await db.collection('role').insertMany(roles);
    }
    console.log(`MongoDB reseeded roles=${roles.length}; users cleared`);
  } finally {
    await client.close();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
