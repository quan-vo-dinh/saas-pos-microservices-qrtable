import { apiFetch } from './helpers';

interface Area {
  id: string;
  name: string;
  tenantId: string;
  sortOrder: number;
}

describe('[Integration] Areas CRUD', () => {
  const uid = Date.now();
  let createdId: string;

  afterAll(async () => {
    if (createdId) {
      await apiFetch(`/admin/areas/${createdId}`, { method: 'DELETE' });
    }
  });

  it('should create an area', async () => {
    const { status, data } = await apiFetch<Area>('/admin/areas', {
      method: 'POST',
      body: { name: `IT-Area-${uid}` },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`IT-Area-${uid}`);
    expect(data.tenantId).toBe('023772bb-391b-401c-936a-ed7034b69cec');
    createdId = data.id;
  });

  it('should list areas', async () => {
    const { status, data } = await apiFetch<Area[]>('/admin/areas');

    expect(status).toBe(200);
    expect(Array.isArray(data)).toBe(true);
    expect(data.some((a) => a.id === createdId)).toBe(true);
  });

  it('should get area by id', async () => {
    const { status, data } = await apiFetch<Area>(`/admin/areas/${createdId}`);

    expect(status).toBe(200);
    expect(data.id).toBe(createdId);
  });

  it('should update an area', async () => {
    const { status, data } = await apiFetch<Area>(`/admin/areas/${createdId}`, {
      method: 'PATCH',
      body: { name: `IT-Area-${uid}-Updated` },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`IT-Area-${uid}-Updated`);
  });

  it('should reorder areas', async () => {
    const { data: allAreas } = await apiFetch<Area[]>('/admin/areas');
    const items = allAreas.map((a, i) => ({
      id: a.id,
      sortOrder: allAreas.length - 1 - i,
    }));

    const { status } = await apiFetch<Area[]>('/admin/areas/reorder', {
      method: 'PATCH',
      body: { items },
    });

    expect(status).toBe(200);
  });

  it('should delete an area', async () => {
    const { status, data } = await apiFetch<boolean>(`/admin/areas/${createdId}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(data).toBe(true);
    createdId = '';
  });
});
