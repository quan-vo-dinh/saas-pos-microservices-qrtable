# Kế hoạch triển khai: Reseed dev sạch với tenant chuẩn

> **Cho agent:** BẮT BUỘC dùng superpowers:subagent-driven-development (khuyến nghị) hoặc superpowers:executing-plans để thực hiện kế hoạch từng bước. Các bước dùng cú pháp checkbox (`- [ ]`) để theo dõi.

**Mục tiêu:** Xây quy trình reseed chỉ dùng cho dev, lặp lại được, reset Keycloak, MongoDB, PostgreSQL và Redis xoay quanh một tenant UUID chuẩn và loại bỏ mặc định `tenant_a` tùy ý.

**Kiến trúc:** Giữ PostgreSQL local dùng chung hiện tại, nhưng tổ chức module seed theo ownership service (`saas`, `catalog`, `order`) để sau này tách Database-per-Service chỉ đổi mục tiêu kết nối. Keycloak và Mongo được reset bằng script rõ ràng; PostgreSQL reset bằng module seed xác định thuộc từng service. Luồng có tính phá hủy theo thiết kế nhưng được chặn bởi kiểm tra local/dev và cờ `--yes` rõ ràng.

**Công nghệ:** Bash, script Node.js CommonJS, PostgreSQL `pg`, driver MongoDB, Keycloak Admin REST qua `curl`/`jq`, Redis qua `ioredis`, workspace Nx/NestJS/Next/Vite hiện có.

---

## Hằng số chuẩn

Dùng nhất quán các giá trị sau:

```txt
TENANT_ID=023772bb-391b-401c-936a-ed7034b69cec
TENANT_SLUG=pho-viet
TENANT_NAME=Nhà hàng Phở Việt
```

`SUPER_ADMIN` giữ `tenantId = platform`.

Không đưa tách vật lý DB-per-service vào kế hoạch này. Bố cục seed phải sẵn sàng cho bước sau.

Không commit sau mỗi task. Luồng repo hiện tại là làm trực tiếp trên `main`; người dùng sẽ review và commit trạng thái cuối.

---

## Task 1: Thêm hằng số seed dev và tài liệu

**File:**

- Tạo: `tools/dev-seed/constants.js`
- Tạo: `tools/dev-seed/README.md`
- Đọc: `docs/superpowers/specs/2026-05-02-dev-clean-reseed-canonical-tenant-design.md`

- [ ] **Bước 1: Tạo khung thư mục seed**

Chạy:

```bash
mkdir -p tools/dev-seed/keycloak tools/dev-seed/mongo tools/dev-seed/postgres/saas tools/dev-seed/postgres/catalog tools/dev-seed/postgres/order tools/dev-seed/verify
```

Kỳ vọng: các thư mục tồn tại.

- [ ] **Bước 2: Thêm hằng số chuẩn**

Tạo `tools/dev-seed/constants.js`:

```js
const DEV_TENANT = {
  id: '023772bb-391b-401c-936a-ed7034b69cec',
  slug: 'pho-viet',
  name: 'Nhà hàng Phở Việt',
};

const PLATFORM_TENANT_ID = 'platform';

module.exports = {
  DEV_TENANT,
  PLATFORM_TENANT_ID,
};
```

- [ ] **Bước 3: Thêm README**

Tạo `tools/dev-seed/README.md`:

```md
# QRTable — Seed dev

Thư mục này chứa script reseed môi trường dev cục bộ (có tính phá hủy).

Tenant dev chuẩn:

| Trường           | Giá trị                                |
| ---------------- | -------------------------------------- |
| Id tenant nội bộ | `023772bb-391b-401c-936a-ed7034b69cec` |
| Slug công khai   | `pho-viet`                             |
| Tên hiển thị     | `Nhà hàng Phở Việt`                    |

Quy tắc:

- Claim JWT `tenant_id` dùng UUID nội bộ.
- Header BFF `x-tenant-id` dùng UUID nội bộ.
- Dòng PostgreSQL theo tenant dùng UUID nội bộ trong cột `tenant_id`.
- URL QR/PWA công khai dùng `tenant=pho-viet`.
- `tenant_a` chỉ là legacy; không được xuất hiện trong mặc định seed dev mới.

Ownership seed:

- `postgres/saas`: dòng PostgreSQL thuộc SaaS.
- `postgres/catalog`: dòng PostgreSQL thuộc Catalog.
- `postgres/order`: dọn dẹp PostgreSQL thuộc Order.
- `mongo`: role/user User-Access.
- `keycloak`: realm, clients, roles, mappers, users.

Runtime dev hiện vẫn dùng một database PostgreSQL `qrtable`.
Bố cục thư mục cố ý sẵn sàng cho tách Database-per-Service sau này.
```

- [ ] **Bước 4: Kiểm tra file**

Chạy:

```bash
test -f tools/dev-seed/constants.js && test -f tools/dev-seed/README.md
```

Kỳ vọng: mã thoát `0`.

---

## Task 2: Cập nhật user bootstrap auth sang tenant UUID

**File:**

- Sửa: `tools/auth-bootstrap-users.json`
- Tham chiếu: bootstrap Keycloak ở Task 5

- [ ] **Bước 1: Thay id tenant cho staff**

Cập nhật `tools/auth-bootstrap-users.json` để mọi user không phải `SUPER_ADMIN` có:

```json
"tenantId": "023772bb-391b-401c-936a-ed7034b69cec"
```

Giữ:

```json
"tenantId": "platform"
```

cho `SUPER_ADMIN`.

Đồng thời đổi `lastName` của staff từ `tenant_a` sang giá trị ít gây hiểu nhầm hơn:

```json
"lastName": "pho-viet"
```

- [ ] **Bước 2: Xác minh không còn tenant legacy trong seed auth**

Chạy:

```bash
rg -n '"tenantId": "tenant_a"|"lastName": "tenant_a"' tools/auth-bootstrap-users.json
```

Kỳ vọng: không khớp và mã thoát `1`.

- [ ] **Bước 3: Xác minh JSON parse được**

Chạy:

```bash
node -e "JSON.parse(require('fs').readFileSync('tools/auth-bootstrap-users.json','utf8')); console.log('auth users json ok')"
```

Kỳ vọng: in `auth users json ok`.

---

## Task 3: Thêm module reseed PostgreSQL

**File:**

- Tạo: `tools/dev-seed/postgres/data.js`
- Tạo: `tools/dev-seed/postgres/reseed-postgres.js`
- Dùng: `tools/dev-seed/constants.js`

- [ ] **Bước 1: Thêm dữ liệu seed xác định**

Tạo `tools/dev-seed/postgres/data.js`:

```js
const { DEV_TENANT } = require('../constants');

const AREAS = [
  { id: '11111111-aaaa-4111-8111-111111111111', tenantId: DEV_TENANT.id, name: 'Tầng trệt', sortOrder: 1 },
  { id: '22222222-aaaa-4222-8222-222222222222', tenantId: DEV_TENANT.id, name: 'Lầu 1', sortOrder: 2 },
  { id: '33333333-aaaa-4333-8333-333333333333', tenantId: DEV_TENANT.id, name: 'Ngoài trời', sortOrder: 3 },
];

const CATEGORIES = [
  {
    id: '11111111-bbbb-4111-8111-111111111111',
    tenantId: DEV_TENANT.id,
    name: 'Phở & Bún',
    sortOrder: 1,
    status: 'active',
  },
  {
    id: '22222222-bbbb-4222-8222-222222222222',
    tenantId: DEV_TENANT.id,
    name: 'Món ăn kèm',
    sortOrder: 2,
    status: 'active',
  },
  {
    id: '33333333-bbbb-4333-8333-333333333333',
    tenantId: DEV_TENANT.id,
    name: 'Nước uống',
    sortOrder: 3,
    status: 'active',
  },
];

const MENU_ITEMS = [
  {
    id: '11111111-cccc-4111-8111-111111111111',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[0].id,
    name: 'Phở bò tái',
    description: 'Phở bò tái nước dùng trong, ăn kèm rau thơm.',
    price: '65000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 100,
    sortOrder: 1,
    status: 'available',
    station: 'KITCHEN',
  },
  {
    id: '22222222-cccc-4222-8222-222222222222',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[0].id,
    name: 'Bún bò Huế',
    description: 'Bún bò cay nhẹ, chả cua, rau sống.',
    price: '70000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 80,
    sortOrder: 2,
    status: 'available',
    station: 'KITCHEN',
  },
  {
    id: '33333333-cccc-4333-8333-333333333333',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[1].id,
    name: 'Gỏi cuốn tôm thịt',
    description: 'Cuốn tươi ăn kèm nước chấm đậu phộng.',
    price: '45000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 120,
    sortOrder: 3,
    status: 'available',
    station: 'KITCHEN',
  },
  {
    id: '44444444-cccc-4444-8444-444444444444',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[2].id,
    name: 'Trà đá',
    description: 'Trà đá phục vụ tại bàn.',
    price: '5000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 500,
    sortOrder: 4,
    status: 'available',
    station: 'BAR',
  },
];

const TABLES = [
  {
    id: '11111111-dddd-4111-8111-111111111111',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[0].id,
    name: 'A01',
    capacity: 2,
    status: 'available',
    qrToken: 'dev-qr-token-a01-20260502',
    sessionId: null,
  },
  {
    id: '22222222-dddd-4222-8222-222222222222',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[0].id,
    name: 'A02',
    capacity: 4,
    status: 'available',
    qrToken: 'dev-qr-token-a02-20260502',
    sessionId: null,
  },
  {
    id: '33333333-dddd-4333-8333-333333333333',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[1].id,
    name: 'B01',
    capacity: 4,
    status: 'available',
    qrToken: 'dev-qr-token-b01-20260502',
    sessionId: null,
  },
  {
    id: '44444444-dddd-4444-8444-444444444444',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[2].id,
    name: 'C01',
    capacity: 6,
    status: 'available',
    qrToken: 'dev-qr-token-c01-20260502',
    sessionId: null,
  },
];

module.exports = {
  AREAS,
  CATEGORIES,
  MENU_ITEMS,
  TABLES,
};
```

- [ ] **Bước 2: Thêm script reseed PostgreSQL**

Tạo `tools/dev-seed/postgres/reseed-postgres.js`:

```js
const { Client } = require('pg');
const { DEV_TENANT } = require('../constants');
const { AREAS, CATEGORIES, MENU_ITEMS, TABLES } = require('./data');

function requireYes() {
  if (!process.argv.includes('--yes')) {
    throw new Error('Refusing to reseed PostgreSQL without --yes');
  }
}

function assertDevTarget(config) {
  const nodeEnv = process.env.NODE_ENV || 'development';
  if (nodeEnv !== 'development') {
    throw new Error(`Refusing to reseed PostgreSQL when NODE_ENV=${nodeEnv}`);
  }
  if (!['localhost', '127.0.0.1'].includes(config.host)) {
    throw new Error(`Refusing to reseed non-local PostgreSQL host: ${config.host}`);
  }
}

function pgConfig() {
  return {
    host: process.env.TYPEORM_HOST || 'localhost',
    port: Number(process.env.TYPEORM_PORT || 5432),
    user: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'postgres',
    database: process.env.TYPEORM_DATABASE || 'qrtable',
  };
}

async function truncateTables(client) {
  await client.query(`
    truncate table
      order_items,
      orders,
      bills,
      service_requests,
      sessions,
      outbox_events,
      menu_items,
      tables,
      categories,
      areas,
      tenants
    restart identity cascade
  `);
}

async function seedTenant(client) {
  await client.query(
    `insert into tenants (id, name, slug, is_active, created_at, updated_at)
     values ($1, $2, $3, true, now(), now())`,
    [DEV_TENANT.id, DEV_TENANT.name, DEV_TENANT.slug],
  );
}

async function seedAreas(client) {
  for (const area of AREAS) {
    await client.query(
      `insert into areas (id, tenant_id, name, sort_order, created_at, updated_at)
       values ($1, $2, $3, $4, now(), now())`,
      [area.id, area.tenantId, area.name, area.sortOrder],
    );
  }
}

async function seedCategories(client) {
  for (const category of CATEGORIES) {
    await client.query(
      `insert into categories (id, tenant_id, name, sort_order, status, created_at, updated_at)
       values ($1, $2, $3, $4, $5, now(), now())`,
      [category.id, category.tenantId, category.name, category.sortOrder, category.status],
    );
  }
}

async function seedMenuItems(client) {
  for (const item of MENU_ITEMS) {
    await client.query(
      `insert into menu_items
        (id, tenant_id, category_id, name, description, price, image_url, image_public_id, stock, sort_order, status, station, deleted_at, created_at, updated_at)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, null, now(), now())`,
      [
        item.id,
        item.tenantId,
        item.categoryId,
        item.name,
        item.description,
        item.price,
        item.imageUrl,
        item.imagePublicId,
        item.stock,
        item.sortOrder,
        item.status,
        item.station,
      ],
    );
  }
}

async function seedTables(client) {
  for (const table of TABLES) {
    await client.query(
      `insert into tables
        (id, tenant_id, area_id, name, capacity, status, qr_token, session_id, created_at, updated_at)
       values
        ($1, $2, $3, $4, $5, $6, $7, $8, now(), now())`,
      [
        table.id,
        table.tenantId,
        table.areaId,
        table.name,
        table.capacity,
        table.status,
        table.qrToken,
        table.sessionId,
      ],
    );
  }
}

async function main() {
  requireYes();
  const config = pgConfig();
  assertDevTarget(config);
  const client = new Client(config);

  await client.connect();
  try {
    await client.query('begin');
    await truncateTables(client);
    await seedTenant(client);
    await seedAreas(client);
    await seedCategories(client);
    await seedMenuItems(client);
    await seedTables(client);
    await client.query('commit');
    console.log(`PostgreSQL reseeded for tenant ${DEV_TENANT.id} (${DEV_TENANT.slug})`);
  } catch (error) {
    await client.query('rollback');
    throw error;
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Bước 3: Chạy script reseed PostgreSQL trên DB local**

Chạy:

```bash
node tools/dev-seed/postgres/reseed-postgres.js --yes
```

Kỳ vọng: in `PostgreSQL reseeded for tenant 023772bb-391b-401c-936a-ed7034b69cec (pho-viet)`.

- [ ] **Bước 4: Kiểm tra trực tiếp seed PostgreSQL**

Chạy:

```bash
node -e "const {Client}=require('pg');(async()=>{const c=new Client({host:'localhost',port:5432,user:'postgres',password:'postgres',database:'qrtable'});await c.connect();const t=await c.query('select id, slug, name, is_active from tenants');const counts=await c.query(\"select 'areas' table_name,count(*)::int from areas union all select 'categories',count(*)::int from categories union all select 'menu_items',count(*)::int from menu_items union all select 'tables',count(*)::int from tables union all select 'orders',count(*)::int from orders\");console.table(t.rows);console.table(counts.rows);await c.end();})().catch(e=>{console.error(e);process.exit(1);});"
```

Kỳ vọng:

- một tenant có `id = 023772bb-391b-401c-936a-ed7034b69cec`
- một tenant có `slug = pho-viet`
- số đếm khác 0 cho `areas`, `categories`, `menu_items`, `tables`
- số đếm `orders` là `0`

---

## Task 4: Thêm script reseed Mongo

**File:**

- Tạo: `tools/dev-seed/mongo/reseed-mongo.js`
- Dùng: `apps/user-access/src/seeder/role.json`

- [ ] **Bước 1: Thêm script reseed Mongo**

Tạo `tools/dev-seed/mongo/reseed-mongo.js`:

```js
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
  if (!uri.includes('localhost') && !uri.includes('127.0.0.1')) {
    throw new Error(`Refusing to reseed non-local MongoDB uri: ${uri}`);
  }
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
```

- [ ] **Bước 2: Chạy reseed Mongo**

Chạy:

```bash
node tools/dev-seed/mongo/reseed-mongo.js --yes
```

Kỳ vọng: in `MongoDB reseeded roles=6; users cleared`.

- [ ] **Bước 3: Xác minh role Mongo**

Chạy:

```bash
node -e "const {MongoClient}=require('mongodb');(async()=>{const c=new MongoClient(process.env.MONGODB_URI||'mongodb://root:password@localhost:27017');await c.connect();const db=c.db(process.env.MONGO_DB_NAME||'qrtable');console.log(await db.collection('role').countDocuments());console.log(await db.collection('user').countDocuments());await c.close();})().catch(e=>{console.error(e);process.exit(1);});"
```

Kỳ vọng:

```txt
6
0
```

---

## Task 5: Làm rõ bootstrap Keycloak sạch (clean realm)

**File:**

- Sửa: `tools/keycloak-bootstrap.sh`
- Đọc: `apps/management-app/.env`

- [ ] **Bước 1: Thêm tùy chọn xóa realm sạch**

Gần đầu file `tools/keycloak-bootstrap.sh`, thêm:

```bash
KEYCLOAK_CLEAN_REALM="${KEYCLOAK_CLEAN_REALM:-false}"
MANAGEMENT_APP_CLIENT_ID="${MANAGEMENT_APP_CLIENT_ID:-management-app}"
MANAGEMENT_APP_CLIENT_SECRET="${MANAGEMENT_APP_CLIENT_SECRET:-RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B}"
```

- [ ] **Bước 2: Xóa realm khi bật chế độ sạch**

Sau khi định nghĩa `auth_header` và `json_header`, thêm:

```bash
if [[ "${KEYCLOAK_CLEAN_REALM}" == "true" ]]; then
  clean_code="$(curl -sS -o /dev/null -w '%{http_code}' "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}")"
  if [[ "${clean_code}" != "404" ]]; then
    echo "Deleting realm for clean bootstrap: ${KEYCLOAK_REALM}"
    curl -sS -X DELETE "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}" "${auth_header[@]}" >/dev/null
  fi
fi
```

- [ ] **Bước 3: Tách helper tạo client**

Trước logic tạo client BFF hiện tại, thêm:

```bash
ensure_oidc_client() {
  local client_id="$1"
  local client_secret="$2"
  local public_client="$3"

  local internal_id
  internal_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" "${auth_header[@]}" | jq -r '.[0].id // empty')"

  if [[ -z "${internal_id}" ]]; then
    echo "Creating client: ${client_id}" >&2
    curl -sS -X POST "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients" \
      "${auth_header[@]}" "${json_header[@]}" \
      -d "{\"clientId\":\"${client_id}\",\"enabled\":true,\"publicClient\":${public_client},\"protocol\":\"openid-connect\",\"serviceAccountsEnabled\":true,\"directAccessGrantsEnabled\":true,\"standardFlowEnabled\":true,\"secret\":\"${client_secret}\",\"redirectUris\":[\"http://localhost:3000/*\"],\"webOrigins\":[\"http://localhost:3000\"]}" >/dev/null

    internal_id="$(curl -sS "${KEYCLOAK_HOST}/admin/realms/${KEYCLOAK_REALM}/clients?clientId=${client_id}" "${auth_header[@]}" | jq -r '.[0].id // empty')"
  fi

  echo "${internal_id}"
}
```

- [ ] **Bước 4: Dùng helper cho cả client BFF và Management App**

Thay khối tạo single-client hiện có bằng:

```bash
client_id_internal="$(ensure_oidc_client "${KEYCLOAK_CLIENT_ID}" "${KEYCLOAK_CLIENT_SECRET}" "false")"
mgmt_client_internal="$(ensure_oidc_client "${MANAGEMENT_APP_CLIENT_ID}" "${MANAGEMENT_APP_CLIENT_SECRET}" "false")"
```

Giữ kiểm tra hiện có:

```bash
if [[ -z "${client_id_internal}" ]]; then
  echo "Unable to resolve Keycloak internal client id"
  exit 1
fi
```

Thêm kiểm tra cho Management App:

```bash
if [[ -z "${mgmt_client_internal}" ]]; then
  echo "Unable to resolve Management App internal client id"
  exit 1
fi
```

- [ ] **Bước 5: Luôn thêm mapper cho Management App**

Thay khối mapper `management-app` có điều kiện cũ bằng:

```bash
saved_client_id="${client_id_internal}"
client_id_internal="${mgmt_client_internal}"
ensure_user_attribute_mapper "tenant_id-claim" "tenant_id" "tenant_id"
ensure_user_attribute_mapper "sub_role-claim" "sub_role" "sub_role"
client_id_internal="${saved_client_id}"
```

- [ ] **Bước 6: Chạy bootstrap Keycloak sạch**

Chạy:

```bash
KEYCLOAK_CLEAN_REALM=true MONGODB_URI=mongodb://root:password@localhost:27017 MONGO_DB_NAME=qrtable bash tools/keycloak-bootstrap.sh
```

Kỳ vọng:

- realm `qrtable` được tạo lại
- clients `qrtable-bff` và `management-app` được tạo
- sáu role được tạo
- sáu user được tạo
- user Mongo đồng bộ sau khi role tồn tại

---

## Task 6: Thêm script flush Redis (dev)

**File:**

- Tạo: `tools/dev-seed/flush-redis.js`

- [ ] **Bước 1: Thêm script flush Redis**

Tạo `tools/dev-seed/flush-redis.js`:

```js
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
```

- [ ] **Bước 2: Chạy flush Redis**

Chạy:

```bash
node tools/dev-seed/flush-redis.js --yes
```

Kỳ vọng: in `Redis DB flushed at localhost:6379`.

---

## Task 7: Thêm lệnh điều phối (orchestrator)

**File:**

- Tạo: `tools/dev-reseed.sh`
- Sửa: `package.json`

- [ ] **Bước 1: Thêm orchestrator**

Tạo `tools/dev-reseed.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

if [[ "${1:-}" != "--yes" ]]; then
  echo "Usage: pnpm dev:reseed -- --yes"
  exit 1
fi

export NODE_ENV="${NODE_ENV:-development}"
export MONGODB_URI="${MONGODB_URI:-mongodb://root:password@localhost:27017}"
export MONGO_DB_NAME="${MONGO_DB_NAME:-qrtable}"
export TYPEORM_HOST="${TYPEORM_HOST:-localhost}"
export TYPEORM_PORT="${TYPEORM_PORT:-5432}"
export TYPEORM_USERNAME="${TYPEORM_USERNAME:-postgres}"
export TYPEORM_PASSWORD="${TYPEORM_PASSWORD:-postgres}"
export TYPEORM_DATABASE="${TYPEORM_DATABASE:-qrtable}"
export KEYCLOAK_HOST="${KEYCLOAK_HOST:-http://localhost:8180}"
export KEYCLOAK_REALM="${KEYCLOAK_REALM:-qrtable}"
export KEYCLOAK_CLIENT_ID="${KEYCLOAK_CLIENT_ID:-qrtable-bff}"
export KEYCLOAK_CLIENT_SECRET="${KEYCLOAK_CLIENT_SECRET:-9UikCZhjajo9syeVe9yvjLjY7l52tWFh}"
export MANAGEMENT_APP_CLIENT_ID="${MANAGEMENT_APP_CLIENT_ID:-management-app}"
export MANAGEMENT_APP_CLIENT_SECRET="${MANAGEMENT_APP_CLIENT_SECRET:-RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B}"
export KEYCLOAK_CLEAN_REALM=true

echo "Dev reseed targets:"
echo "  PostgreSQL: ${TYPEORM_USERNAME}@${TYPEORM_HOST}:${TYPEORM_PORT}/${TYPEORM_DATABASE}"
echo "  MongoDB: ${MONGODB_URI}/${MONGO_DB_NAME}"
echo "  Keycloak: ${KEYCLOAK_HOST}/realms/${KEYCLOAK_REALM}"
echo "  Redis: ${REDIS_HOST:-localhost}:${REDIS_PORT:-6379}"

node tools/dev-seed/postgres/reseed-postgres.js --yes
node tools/dev-seed/mongo/reseed-mongo.js --yes
bash tools/keycloak-bootstrap.sh
node tools/dev-seed/flush-redis.js --yes
node tools/dev-seed/verify/verify-dev-seed.js
```

- [ ] **Bước 2: Cho phép thực thi orchestrator**

Chạy:

```bash
chmod +x tools/dev-reseed.sh
```

- [ ] **Bước 3: Thêm script trong package.json**

Sửa mục `scripts` trong `package.json`:

```json
"dev:reseed": "bash tools/dev-reseed.sh",
"dev:verify-seed": "node tools/dev-seed/verify/verify-dev-seed.js"
```

Giữ nguyên các script hiện có.

---

## Task 8: Thêm bước xác minh seed dev

**File:**

- Tạo: `tools/dev-seed/verify/verify-dev-seed.js`

- [ ] **Bước 1: Thêm script xác minh**

Tạo `tools/dev-seed/verify/verify-dev-seed.js`:

```js
const { Client } = require('pg');
const { MongoClient } = require('mongodb');
const Redis = require('ioredis');
const { DEV_TENANT } = require('../constants');

async function verifyPostgres() {
  const client = new Client({
    host: process.env.TYPEORM_HOST || 'localhost',
    port: Number(process.env.TYPEORM_PORT || 5432),
    user: process.env.TYPEORM_USERNAME || 'postgres',
    password: process.env.TYPEORM_PASSWORD || 'postgres',
    database: process.env.TYPEORM_DATABASE || 'qrtable',
  });
  await client.connect();
  try {
    const tenant = await client.query('select id, slug, name, is_active from tenants where id = $1', [DEV_TENANT.id]);
    if (tenant.rowCount !== 1 || tenant.rows[0].slug !== DEV_TENANT.slug || tenant.rows[0].is_active !== true) {
      throw new Error('PostgreSQL tenant seed mismatch');
    }

    for (const table of ['areas', 'categories', 'menu_items', 'tables']) {
      const bad = await client.query(`select count(*)::int as count from ${table} where tenant_id <> $1`, [
        DEV_TENANT.id,
      ]);
      if (bad.rows[0].count !== 0) {
        throw new Error(`PostgreSQL ${table} has rows outside canonical tenant`);
      }
    }

    for (const table of ['orders', 'order_items', 'bills', 'service_requests', 'sessions', 'outbox_events']) {
      const count = await client.query(`select count(*)::int as count from ${table}`);
      if (count.rows[0].count !== 0) {
        throw new Error(`PostgreSQL runtime table ${table} is not empty`);
      }
    }
  } finally {
    await client.end();
  }
}

async function verifyMongo() {
  const mongoUri = process.env.MONGODB_URI || 'mongodb://root:password@localhost:27017';
  const mongoDbName = process.env.MONGODB_DB_NAME || process.env.MONGO_DB_NAME || 'qrtable';
  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const db = client.db(mongoDbName);
    const roleCount = await db.collection('role').countDocuments();
    const userCount = await db.collection('user').countDocuments();
    if (roleCount !== 6) {
      throw new Error(`Mongo role count mismatch: ${roleCount}`);
    }
    if (userCount !== 6) {
      throw new Error(`Mongo user count mismatch: ${userCount}`);
    }
  } finally {
    await client.close();
  }
}

async function verifyRedis() {
  const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: Number(process.env.REDIS_PORT || 6379),
  });
  try {
    const legacyKeys = await redis.keys('*tenant_a*');
    if (legacyKeys.length > 0) {
      throw new Error(`Redis still has legacy tenant_a keys: ${legacyKeys.join(', ')}`);
    }
  } finally {
    await redis.quit();
  }
}

async function verifyKeycloakPasswordGrant() {
  const host = process.env.KEYCLOAK_HOST || 'http://localhost:8180';
  const realm = process.env.KEYCLOAK_REALM || 'qrtable';
  const clientId = process.env.MANAGEMENT_APP_CLIENT_ID || 'management-app';
  const clientSecret = process.env.MANAGEMENT_APP_CLIENT_SECRET || 'RHRjKOPDywQxSG7qjcGM1XsfmE6ikR8B';

  const body = new URLSearchParams({
    grant_type: 'password',
    client_id: clientId,
    client_secret: clientSecret,
    username: 'owner.1700000002@gmail.com',
    password: 'owner123',
  });

  const response = await fetch(`${host}/realms/${realm}/protocol/openid-connect/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });

  if (!response.ok) {
    throw new Error(`Keycloak password grant failed: ${response.status}`);
  }

  const token = await response.json();
  const payload = JSON.parse(Buffer.from(token.access_token.split('.')[1], 'base64url').toString('utf8'));
  if (payload.tenant_id !== DEV_TENANT.id) {
    throw new Error(`Keycloak tenant_id mismatch: ${payload.tenant_id}`);
  }
}

async function main() {
  await verifyPostgres();
  await verifyMongo();
  await verifyRedis();
  await verifyKeycloakPasswordGrant();
  console.log('Dev seed verification passed');
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
```

- [ ] **Bước 2: Chạy xác minh**

Chạy:

```bash
node tools/dev-seed/verify/verify-dev-seed.js
```

Kỳ vọng: in `Dev seed verification passed`.

---

## Task 9: Gỡ `tenant_a` khỏi mặc định dev và test

**File:**

- Sửa: `apps/customer-pwa/src/constants/api.ts`
- Sửa: các test đang assert `tenant_a`
- Sửa: tài liệu do Step 2.5 Batch 6 tạo/cập nhật nếu coi `tenant_a` là yêu cầu seed dev

- [ ] **Bước 1: Cập nhật fallback tenant ID trên Customer PWA**

Sửa `apps/customer-pwa/src/constants/api.ts`:

```ts
/** Cấu hình API BFF phía khách. */
export const API_CONFIG = {
  DEFAULT_BASE_URL: import.meta.env.VITE_BFF_URL ?? 'http://localhost:3300/api/v1',
  TENANT_ID: import.meta.env.VITE_TENANT_ID ?? '023772bb-391b-401c-936a-ed7034b69cec',
  ENDPOINTS: {
    MENU: '/menu',
    VALIDATE_QR: '/menu/validate-qr',
    SESSION_JOIN: '/customer/sessions/join',
    PUBLIC_TENANT: (slug: string) => `/public/tenants/${encodeURIComponent(slug)}`,
    CART: '/customer/cart',
    ORDERS: '/customer/orders',
    ORDER_BY_ID: (id: string) => `/customer/orders/${encodeURIComponent(id)}`,
    SERVICE_REQUESTS: '/customer/service-requests',
    BILL_REQUEST: '/customer/bill/request',
    BILL_CURRENT: '/customer/bill/current',
  },
} as const;

/** Phiên Order đã lưu (sau POST /customer/sessions/join thành công). */
export const PWA_SESSION_STORAGE_KEY = 'qrtable:pwa:order-session';
```

- [ ] **Bước 2: Cập nhật test cố ý dùng tenant mặc định**

Chạy:

```bash
rg -n "tenant_a" apps/customer-pwa apps/management-app libs/frontend docs/superpowers/handoffs docs/superpowers/plans docs/superpowers/specs
```

Với test assert tenant nội bộ mặc định hiện tại, thay giá trị kỳ vọng bằng:

```txt
023772bb-391b-401c-936a-ed7034b69cec
```

Với test QR/URL công khai, dùng:

```txt
pho-viet
```

Với test tương thích legacy, chỉ giữ `tenant_a` nếu tên test nói rõ là legacy.

- [ ] **Bước 3: Cập nhật tài liệu Batch 6**

Thay cách diễn đạt cho rằng seed dev bắt buộc có `slug = tenant_a` bằng:

```md
Seed dev sạch hiện dùng id tenant nội bộ `023772bb-391b-401c-936a-ed7034b69cec`
và slug công khai `pho-viet`. Backend có thể giữ phủ resolver legacy `tenant_a`
chỉ để tương thích, không coi là đường seed chuẩn.
```

- [ ] **Bước 4: Xác minh tham chiếu legacy còn lại là có chủ đích**

Chạy:

```bash
rg -n "tenant_a" .
```

Kỳ vọng: kết quả khớp chỉ còn trong tài liệu phân tích legacy hoặc test có tên
nêu rõ tương thích legacy.

---

## Task 10: Chạy reseed đầy đủ và xác minh có trọng tâm

**File:**

- Dùng toàn bộ file ở trên

- [ ] **Bước 1: Chạy reseed có điều phối**

Chạy:

```bash
pnpm dev:reseed -- --yes
```

Kỳ vọng:

- reseed PostgreSQL in tenant chuẩn.
- reseed Mongo in sáu role và user đã xóa.
- bootstrap Keycloak hoàn tất.
- flush Redis hoàn tất.
- bước xác minh in `Dev seed verification passed`.

- [ ] **Bước 2: Khởi động lại backend**

Dừng tiến trình dev cũ và khởi động lại các service cần cho Step 2.5:

```bash
pnpm dev --projects=bff,authorizer,user-access,saas,catalog,order
```

Kỳ vọng: mọi service build và chạy không lỗi cấu hình.

- [ ] **Bước 3: Kiểm tra thủ công endpoint tenant hiện tại (protected)**

Đăng nhập bằng tài khoản owner qua Management App hoặc lấy token qua
Keycloak password grant, rồi gọi:

```bash
curl -sS http://localhost:3300/api/v1/admin/tenant/current \
  -H "Authorization: Bearer <owner_access_token>" \
  -H "x-tenant-id: 023772bb-391b-401c-936a-ed7034b69cec"
```

Kỳ vọng dữ liệu phản hồi:

```json
{
  "id": "023772bb-391b-401c-936a-ed7034b69cec",
  "slug": "pho-viet",
  "name": "Nhà hàng Phở Việt",
  "isActive": true
}
```

- [ ] **Bước 4: Kiểm tra endpoint tenant công khai**

Chạy:

```bash
curl -sS http://localhost:3300/api/v1/public/tenants/pho-viet
```

Kỳ vọng dữ liệu phản hồi có:

```json
{
  "id": "023772bb-391b-401c-936a-ed7034b69cec",
  "slug": "pho-viet"
}
```

- [ ] **Bước 5: Chạy test tự động có trọng tâm**

Chạy các test trọng tâm phủ hành vi seed/mặc định đã sửa:

```bash
npx jest --config apps/bff/jest.config.cts apps/bff/src/app/modules/saas/controllers/current-tenant.controller.spec.ts --runInBand
npx jest --config apps/saas/jest.config.cts apps/saas/src/services/saas.service.spec.ts --runInBand
npx tsc --noEmit -p apps/bff/tsconfig.app.json
npx tsc --noEmit -p apps/saas/tsconfig.app.json
```

Kỳ vọng: tất cả pass.

- [ ] **Bước 6: Báo cáo trạng thái reseed cuối**

Báo cáo:

- id tenant chuẩn và slug
- user Keycloak đã tạo lại
- số đếm role/user Mongo
- số đếm tenant/catalog/order PostgreSQL
- kết quả flush Redis
- tham chiếu `tenant_a` còn lại có chủ đích
- lệnh nào không chạy được vì provider local chưa bật

---

## Checklist tự rà soát

- Phủ spec: kế hoạch này gồm định danh tenant chuẩn, Keycloak, MongoDB,
  PostgreSQL, Redis, mặc định frontend, tài liệu và xác minh.
- Ranh giới phạm vi: không triển khai tách vật lý Database-per-Service.
- An toàn: lệnh phá hủy cần kiểm tra local/dev và `--yes`.
- Sẵn sàng DB-per-service sau này: file seed tách theo ownership service.
- Không commit từng task: phù hợp luồng repo hiện tại.
