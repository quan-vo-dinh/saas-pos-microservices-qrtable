/* ── Mock modules that use import.meta.env before any import ── */
jest.mock('@/constants/api', () => ({
  API_CONFIG: {
    DEFAULT_BASE_URL: 'http://localhost:3300/api/v1',
    TENANT_ID: '023772bb-391b-401c-936a-ed7034b69cec',
    ENDPOINTS: { MENU: '/menu' },
  },
}));

jest.mock('../../services/menu.service', () => ({
  menuService: { getFullMenu: jest.fn() },
}));

import type { PublicMenuCategory, PublicMenuItem } from '@einvoice/types';
import { customerMenuKeys, extractCategories, extractItems } from '../use-menu-query';

// ─── Fixtures ────────────────────────────────────────────

const makeItem = (overrides: Partial<PublicMenuItem> = {}): PublicMenuItem => ({
  id: 'item-1',
  name: 'Burger',
  description: 'Tasty burger',
  price: 9.99,
  imageUrl: null,
  status: 'available',
  ...overrides,
});

const MENU: PublicMenuCategory[] = [
  {
    id: 'cat-drinks',
    name: 'Drinks',
    sortOrder: 1,
    items: [
      makeItem({ id: 'item-cola', name: 'Cola', price: 2.5 }),
      makeItem({ id: 'item-water', name: 'Water', price: 1.0 }),
    ],
  },
  {
    id: 'cat-food',
    name: 'Food',
    sortOrder: 2,
    items: [makeItem({ id: 'item-burger', name: 'Burger', price: 9.99 })],
  },
  {
    id: 'cat-desserts',
    name: 'Desserts',
    sortOrder: 3,
    items: [],
  },
];

// ─── extractCategories ──────────────────────────────────

describe('extractCategories', () => {
  it('returns simplified category list with correct itemCount', () => {
    const result = extractCategories(MENU);

    expect(result).toEqual([
      { id: 'cat-drinks', name: 'Drinks', sortOrder: 1, itemCount: 2 },
      { id: 'cat-food', name: 'Food', sortOrder: 2, itemCount: 1 },
      { id: 'cat-desserts', name: 'Desserts', sortOrder: 3, itemCount: 0 },
    ]);
  });

  it('returns empty array for empty menu', () => {
    expect(extractCategories([])).toEqual([]);
  });
});

describe('customerMenuKeys', () => {
  it('scopes full menu cache by tenant id', () => {
    expect(customerMenuKeys.fullMenu('tenant-a')).toEqual(['customer-menu', 'tenant-a', 'full']);
  });
});

// ─── extractItems ───────────────────────────────────────

describe('extractItems', () => {
  it('returns all items when no categoryId is provided', () => {
    const result = extractItems(MENU);

    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(['item-cola', 'item-water', 'item-burger']);
  });

  it('returns all items when categoryId is null', () => {
    const result = extractItems(MENU, null);

    expect(result).toHaveLength(3);
    expect(result.map((i) => i.id)).toEqual(['item-cola', 'item-water', 'item-burger']);
  });

  it('filters items by categoryId', () => {
    const result = extractItems(MENU, 'cat-drinks');

    expect(result).toHaveLength(2);
    expect(result.map((i) => i.id)).toEqual(['item-cola', 'item-water']);
  });

  it('returns empty array for unknown categoryId', () => {
    expect(extractItems(MENU, 'cat-nonexistent')).toEqual([]);
  });

  it('returns empty array for category with no items', () => {
    expect(extractItems(MENU, 'cat-desserts')).toEqual([]);
  });
});
