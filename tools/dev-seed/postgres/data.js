const crypto = require('crypto');
const { DEV_TENANT } = require('../constants');

/** Opaque QR token per catalog rule: exactly 64 hex chars (see TableService.validateQrToken). */
function devQrTokenHex(tableKey) {
  return crypto.createHash('sha256').update(`${DEV_TENANT.id}:${tableKey}:qrtable-dev-qr`).digest('hex');
}

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
    qrToken: devQrTokenHex('A01'),
    sessionId: null,
  },
  {
    id: '22222222-dddd-4222-8222-222222222222',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[0].id,
    name: 'A02',
    capacity: 4,
    status: 'available',
    qrToken: devQrTokenHex('A02'),
    sessionId: null,
  },
  {
    id: '33333333-dddd-4333-8333-333333333333',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[1].id,
    name: 'B01',
    capacity: 4,
    status: 'available',
    qrToken: devQrTokenHex('B01'),
    sessionId: null,
  },
  {
    id: '44444444-dddd-4444-8444-444444444444',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[2].id,
    name: 'C01',
    capacity: 6,
    status: 'available',
    qrToken: devQrTokenHex('C01'),
    sessionId: null,
  },
];

module.exports = {
  AREAS,
  CATEGORIES,
  MENU_ITEMS,
  TABLES,
};
