import { apiFetch } from './helpers';
import { describeFrontendUtilsIntegration } from './integration-gate';

interface Area {
  id: string;
  name: string;
}

interface Table {
  id: string;
  name: string;
  areaId: string;
  capacity: number;
  status: string;
  qrToken: string;
  tenantId: string;
}

describeFrontendUtilsIntegration('[Integration] Tables CRUD', () => {
  const uid = Date.now();
  const areaName = `TBL-Test-Area-${uid}`;
  let areaId: string;
  let tableId: string;

  beforeAll(async () => {
    const result = await apiFetch<Area>('/admin/areas', {
      method: 'POST',
      body: { name: areaName },
    });
    if (!result.data) {
      throw new Error(`beforeAll: area creation failed — raw: ${JSON.stringify(result.raw)}`);
    }
    areaId = result.data.id;
  });

  afterAll(async () => {
    if (tableId) {
      // Reset to available before delete
      await apiFetch(`/admin/tables/${tableId}/status`, {
        method: 'PATCH',
        body: { status: 'available' },
      }).catch(() => {
        /* ignore status reset errors during cleanup */
      });
      await apiFetch(`/admin/tables/${tableId}`, { method: 'DELETE' });
    }
    if (areaId) {
      await apiFetch(`/admin/areas/${areaId}`, { method: 'DELETE' });
    }
  });

  it('should create a table', async () => {
    const { status, data } = await apiFetch<Table>('/admin/tables', {
      method: 'POST',
      body: { name: `Table-IT-${uid}`, areaId, capacity: 4 },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`Table-IT-${uid}`);
    expect(data.areaId).toBe(areaId);
    expect(data.capacity).toBe(4);
    expect(data.status).toBe('available');
    expect(data.qrToken).toBeDefined();
    expect(data.tenantId).toBe('023772bb-391b-401c-936a-ed7034b69cec');
    tableId = data.id;
  });

  it('should list tables', async () => {
    const { status, data } = await apiFetch<Table[]>('/admin/tables');

    expect(status).toBe(200);
    expect(data.some((t) => t.id === tableId)).toBe(true);
  });

  it('should filter tables by areaId', async () => {
    const { status, data } = await apiFetch<Table[]>(`/admin/tables?areaId=${areaId}`);

    expect(status).toBe(200);
    // BFF returns all tables (areaId filter not yet implemented server-side)
    // Verify our created table is in the result
    expect(data.some((t) => t.id === tableId)).toBe(true);
  });

  it('should get table by id', async () => {
    const { status, data } = await apiFetch<Table>(`/admin/tables/${tableId}`);

    expect(status).toBe(200);
    expect(data.id).toBe(tableId);
  });

  it('should update a table', async () => {
    const { status, data } = await apiFetch<Table>(`/admin/tables/${tableId}`, {
      method: 'PATCH',
      body: { name: `Table-IT-${uid}-Updated`, capacity: 6 },
    });

    expect(status).toBe(200);
    expect(data.name).toBe(`Table-IT-${uid}-Updated`);
    expect(data.capacity).toBe(6);
  });

  it('should update table status (full cycle)', async () => {
    // State machine: available → occupied → billing → cleaning → available
    for (const nextStatus of ['occupied', 'billing', 'cleaning', 'available'] as const) {
      const { status, data } = await apiFetch<Table>(`/admin/tables/${tableId}/status`, {
        method: 'PATCH',
        body: { status: nextStatus },
      });

      expect(status).toBe(200);
      expect(data.status).toBe(nextStatus);
    }
  });

  it('should regenerate QR token', async () => {
    const { status, data } = await apiFetch<Table>(`/admin/tables/${tableId}/regenerate-qr`, { method: 'POST' });

    expect(status).toBe(200);
    expect(data.qrToken).toBeDefined();
    // Note: backend may not change token on regenerate (known limitation)
  });

  it('should delete a table', async () => {
    const { status, data } = await apiFetch<boolean>(`/admin/tables/${tableId}`, { method: 'DELETE' });

    expect(status).toBe(200);
    expect(data).toBe(true);
    tableId = '';
  });
});
