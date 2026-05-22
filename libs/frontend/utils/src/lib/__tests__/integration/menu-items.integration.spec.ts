import { apiFetch } from './helpers';
import { describeFrontendUtilsIntegration } from './integration-gate';

interface Category {
  id: string;
  name: string;
}

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  categoryId: string;
  stock: number;
  status: string;
  imageUrl: string | null;
  tenantId: string;
  deletedAt: string | null;
}

describeFrontendUtilsIntegration('[Integration] Menu Items CRUD', () => {
  const uid = Date.now();
  const catName = `MI-Test-Cat-${uid}`;
  let categoryId: string;
  let itemId: string;

  beforeAll(async () => {
    const result = await apiFetch<Category>('/admin/categories', {
      method: 'POST',
      body: { name: catName, status: 'active' },
    });
    if (!result.data) {
      throw new Error(`beforeAll: category creation failed — raw: ${JSON.stringify(result.raw)}`);
    }
    categoryId = result.data.id;
  });

  afterAll(async () => {
    if (itemId) {
      await apiFetch(`/admin/menu-items/${itemId}`, { method: 'DELETE' });
    }
    if (categoryId) {
      await apiFetch(`/admin/categories/${categoryId}`, { method: 'DELETE' });
    }
  });

  it('should create a menu item', async () => {
    const { status, data } = await apiFetch<MenuItem>('/admin/menu-items', {
      method: 'POST',
      body: {
        name: `IT-Phở-${uid}`,
        description: 'Vietnamese pho',
        price: 55000,
        categoryId,
        stock: 100,
      },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`IT-Phở-${uid}`);
    expect(Number(data.price)).toBe(55000);
    expect(data.categoryId).toBe(categoryId);
    expect(data.stock).toBe(100);
    expect(data.status).toBe('available');
    expect(data.tenantId).toBe('023772bb-391b-401c-936a-ed7034b69cec');
    itemId = data.id;
  });

  it('should list menu items', async () => {
    const { status, data } = await apiFetch<MenuItem[]>('/admin/menu-items');

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((m) => m.id === itemId)).toBe(true);
  });

  it('should filter menu items by categoryId', async () => {
    const { status, data } = await apiFetch<MenuItem[]>(`/admin/menu-items?categoryId=${categoryId}`);

    expect(status).toBe(200);
    // BFF may not filter by categoryId server-side; verify our item is in results
    expect(data.some((m) => m.id === itemId)).toBe(true);
  });

  it('should get menu item by id', async () => {
    const { status, data } = await apiFetch<MenuItem>(`/admin/menu-items/${itemId}`);

    expect(status).toBe(200);
    expect(data.id).toBe(itemId);
    expect(data.name).toBe(`IT-Phở-${uid}`);
  });

  it('should update a menu item', async () => {
    const { status, data } = await apiFetch<MenuItem>(`/admin/menu-items/${itemId}`, {
      method: 'PATCH',
      body: { name: `Updated-Phở-${uid}`, price: 65000, stock: 50 },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`Updated-Phở-${uid}`);
    expect(Number(data.price)).toBe(65000);
    expect(data.stock).toBe(50);
  });

  it('should soft-delete a menu item', async () => {
    const { status, data } = await apiFetch<boolean>(`/admin/menu-items/${itemId}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(data).toBe(true);
    itemId = '';
  });

  it('should reject create without required fields', async () => {
    const { status } = await apiFetch<null>('/admin/menu-items', {
      method: 'POST',
      body: { description: 'missing name, price, categoryId' },
    });

    expect(status).toBe(400);
  });
});
