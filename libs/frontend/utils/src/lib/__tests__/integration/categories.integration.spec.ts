import { apiFetch } from './helpers';
import { describeFrontendUtilsIntegration } from './integration-gate';

interface Category {
  id: string;
  name: string;
  tenantId: string;
  sortOrder: number;
  status: string;
  createdAt: string;
  updatedAt: string;
}

describeFrontendUtilsIntegration('[Integration] Categories CRUD', () => {
  const uid = Date.now();
  let createdId: string;

  afterAll(async () => {
    if (createdId) {
      await apiFetch(`/admin/categories/${createdId}`, { method: 'DELETE' });
    }
  });

  it('should create a category', async () => {
    const { status, data } = await apiFetch<Category>('/admin/categories', {
      method: 'POST',
      body: { name: `IT-Cat-${uid}`, status: 'active' },
    });

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.name).toBe(`IT-Cat-${uid}`);
    expect(data.status).toBe('active');
    expect(data.tenantId).toBe('023772bb-391b-401c-936a-ed7034b69cec');
    expect(data.id).toBeDefined();
    createdId = data.id;
  });

  it('should list categories including the created one', async () => {
    const { status, data } = await apiFetch<Category[]>('/admin/categories');

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((c) => c.id === createdId)).toBe(true);
  });

  it('should get category by id', async () => {
    const { status, data } = await apiFetch<Category>(`/admin/categories/${createdId}`);

    expect(status).toBe(200);
    expect(data.id).toBe(createdId);
    expect(data.name).toBe(`IT-Cat-${uid}`);
  });

  it('should update a category', async () => {
    const { status, data } = await apiFetch<Category>(`/admin/categories/${createdId}`, {
      method: 'PATCH',
      body: { name: `IT-Cat-${uid}-Updated`, status: 'inactive' },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`IT-Cat-${uid}-Updated`);
    expect(data.status).toBe('inactive');
  });

  it('should reorder categories', async () => {
    const { data: allCats } = await apiFetch<Category[]>('/admin/categories');
    const items = allCats.map((c, i) => ({
      id: c.id,
      sortOrder: allCats.length - 1 - i,
    }));

    const { status } = await apiFetch<Category[]>('/admin/categories/reorder', {
      method: 'PATCH',
      body: { items },
    });

    expect(status).toBe(200);
  });

  it('should delete a category', async () => {
    const { status, data } = await apiFetch<boolean>(`/admin/categories/${createdId}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(data).toBe(true);
    createdId = '';
  });

  it('should reject create with empty name (validation)', async () => {
    const { status, raw } = await apiFetch<null>('/admin/categories', {
      method: 'POST',
      body: { status: 'active' },
    });

    expect(status).toBe(400);
    expect(raw['message']).toBeDefined();
  });

  it('should return 401 without auth token', async () => {
    const res = await fetch('http://localhost:3300/api/v1/admin/categories', {
      headers: { 'x-tenant-id': '023772bb-391b-401c-936a-ed7034b69cec' },
    });

    expect(res.status).toBe(401);
  });
});
