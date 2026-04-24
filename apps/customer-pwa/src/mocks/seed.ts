import { faker } from '@faker-js/faker';
import type { MenuItem } from '@einvoice/types';

faker.seed(42);

const iso = (ms: number) => new Date(ms).toISOString();

const CATEGORIES = [
  { id: 'cat-kv', name: 'Khai vị' },
  { id: 'cat-mc', name: 'Món chính' },
  { id: 'cat-du', name: 'Đồ uống' },
  { id: 'cat-tm', name: 'Tráng miệng' },
  { id: 'cat-cb', name: 'Combo' },
] as const;

const MENU_NAMES: Record<string, string[]> = {
  'cat-kv': ['Gỏi cuốn tôm thịt', 'Chả giò', 'Salad rong biển', 'Nem nướng'],
  'cat-mc': ['Phở bò tái', 'Bún chả', 'Cơm tấm sườn', 'Mì Quảng', 'Bánh xèo'],
  'cat-du': ['Trà đào cam sả', 'Cà phê sữa đá', 'Nước ép cam', 'Trà sữa trân châu'],
  'cat-tm': ['Chè khúc bạch', 'Bánh flan', 'Kem dừa'],
  'cat-cb': ['Combo gia đình', 'Combo văn phòng'],
};

function buildMenu(): MenuItem[] {
  const items: MenuItem[] = [];
  let sort = 0;
  for (const cat of CATEGORIES) {
    const names = MENU_NAMES[cat.id] ?? ['Món đặc biệt'];
    for (const name of names) {
      const id = `mi-${cat.id}-${sort}`;
      const out = sort === 3 || sort === 11;
      items.push({
        id,
        categoryId: cat.id,
        categoryName: cat.name,
        name,
        description: `${name} — món mock seed 42.`,
        price: faker.number.int({ min: 25_000, max: 120_000 }),
        imageUrl: null,
        stock: out ? 0 : faker.number.int({ min: 5, max: 40 }),
        sortOrder: sort++,
        status: out ? 'out_of_stock' : 'available',
        createdAt: iso(Date.now() - 86400_000),
      });
    }
  }
  return items;
}

export type MockSession = {
  sessionId: string;
  tableId: string;
  tableName: string;
  startedAt: number;
};

export type MockPresenceGuest = {
  name: string;
  color: string;
};

export type CartActivityEvent = {
  who: string;
  action: string;
  itemName: string;
  qty: number;
  at: number;
};

export const mockSession: MockSession = {
  sessionId: 's-001',
  tableId: 't-12',
  tableName: 'Bàn 12 — Tầng trệt',
  startedAt: Date.now() - 24 * 60 * 1000,
};

export const mockPresence: MockPresenceGuest[] = [
  { name: 'Khách 1', color: '#E89B2F' },
  { name: 'Khách 2', color: '#5B6E3A' },
  { name: 'Khách 3', color: '#D4496A' },
];

export function buildMockCartActivity(): CartActivityEvent[] {
  const now = Date.now();
  return [
    { who: 'Khách 1', action: 'đã thêm', itemName: 'Phở bò tái', qty: 1, at: now - 5 * 60_000 },
    { who: 'Khách 2', action: 'đã thêm', itemName: 'Trà đào', qty: 2, at: now - 8 * 60_000 },
    { who: 'Khách 1', action: 'đã sửa ghi chú', itemName: 'Phở bò tái', qty: 1, at: now - 9 * 60_000 },
    { who: 'Khách 3', action: 'đã thêm', itemName: 'Chè khúc bạch', qty: 1, at: now - 12 * 60_000 },
    { who: 'Khách 2', action: 'đã xoá', itemName: 'Gỏi cuốn', qty: 1, at: now - 15 * 60_000 },
  ];
}

export const mockMenu = buildMenu();
export const mockCartActivity = buildMockCartActivity();
