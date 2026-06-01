const crypto = require('crypto');
const { DEV_TENANT, SUSPENDED_TENANT } = require('../constants');

/** Opaque QR token per catalog rule: exactly 64 hex chars (see TableService.validateQrToken). */
function devQrTokenHex(tenantId, tableKey) {
  return crypto.createHash('sha256').update(`${tenantId}:${tableKey}:qrtable-dev-qr`).digest('hex');
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
  {
    id: '55555555-cccc-4555-8555-555555555555',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[0].id,
    name: 'Phở tái nạm',
    description: 'Phở bò tái kèm nạm, nước dùng đậm vị.',
    price: '75000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 90,
    sortOrder: 5,
    status: 'available',
    station: 'KITCHEN',
  },
  {
    id: '66666666-cccc-4666-8666-666666666666',
    tenantId: DEV_TENANT.id,
    categoryId: CATEGORIES[2].id,
    name: 'Cà phê sữa đá',
    description: 'Cà phê phin sữa đá truyền thống.',
    price: '25000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 0,
    sortOrder: 6,
    status: 'out_of_stock',
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
    qrToken: devQrTokenHex(DEV_TENANT.id, 'A01'),
    sessionId: null,
  },
  {
    id: '22222222-dddd-4222-8222-222222222222',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[0].id,
    name: 'A02',
    capacity: 4,
    status: 'available',
    qrToken: devQrTokenHex(DEV_TENANT.id, 'A02'),
    sessionId: null,
  },
  {
    id: '33333333-dddd-4333-8333-333333333333',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[1].id,
    name: 'B01',
    capacity: 4,
    status: 'available',
    qrToken: devQrTokenHex(DEV_TENANT.id, 'B01'),
    sessionId: null,
  },
  {
    id: '44444444-dddd-4444-8444-444444444444',
    tenantId: DEV_TENANT.id,
    areaId: AREAS[2].id,
    name: 'C01',
    capacity: 6,
    status: 'available',
    qrToken: devQrTokenHex(DEV_TENANT.id, 'C01'),
    sessionId: null,
  },
];

const SUSPENDED_AREAS = [
  {
    id: '11111111-aaab-4111-8111-111111111111',
    tenantId: SUSPENDED_TENANT.id,
    name: 'Khu chính',
    sortOrder: 1,
  },
];

const SUSPENDED_CATEGORIES = [
  {
    id: '11111111-bbbc-4111-8111-111111111111',
    tenantId: SUSPENDED_TENANT.id,
    name: 'Menu đọc thử',
    sortOrder: 1,
    status: 'active',
  },
];

const SUSPENDED_MENU_ITEMS = [
  {
    id: '11111111-cccd-4111-8111-111111111111',
    tenantId: SUSPENDED_TENANT.id,
    categoryId: SUSPENDED_CATEGORIES[0].id,
    name: 'Phở bò tạm khóa',
    description: 'Món dùng cho fixture tenant suspended.',
    price: '65000.00',
    imageUrl: null,
    imagePublicId: null,
    stock: 10,
    sortOrder: 1,
    status: 'available',
    station: 'KITCHEN',
  },
];

const SUSPENDED_TABLES = [
  {
    id: '11111111-ddde-4111-8111-111111111111',
    tenantId: SUSPENDED_TENANT.id,
    areaId: SUSPENDED_AREAS[0].id,
    name: 'S01',
    capacity: 2,
    status: 'available',
    qrToken: devQrTokenHex(SUSPENDED_TENANT.id, 'S01'),
    sessionId: null,
  },
];

module.exports = {
  AREAS: [...AREAS, ...SUSPENDED_AREAS],
  CATEGORIES: [...CATEGORIES, ...SUSPENDED_CATEGORIES],
  MENU_ITEMS: [...MENU_ITEMS, ...SUSPENDED_MENU_ITEMS],
  TABLES: [...TABLES, ...SUSPENDED_TABLES],
};
