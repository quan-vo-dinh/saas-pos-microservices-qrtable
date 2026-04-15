import { apiFetch, BFF_URL } from './helpers';

interface Category {
  id: string;
  tenantId: string;
}

describe('[Integration] Multi-Tenant Isolation', () => {
  it('should reject request without tenant header', async () => {
    const res = await fetch(`${BFF_URL}/menu`);
    expect([400, 403].includes(res.status)).toBe(true);
  });

  it('should scope all category data to tenant_a', async () => {
    const { data } = await apiFetch<Category[]>('/admin/categories');

    for (const cat of data) {
      expect(cat.tenantId).toBe('tenant_a');
    }
  });

  it('should not expose data from other tenants in public menu', async () => {
    const res = await fetch(`${BFF_URL}/menu`, {
      headers: { 'x-tenant-id': 'nonexistent_tenant' },
    });

    const raw = (await res.json()) as {
      data: { categories: unknown[] } | null;
    };

    if (res.status === 200 && raw.data) {
      expect(raw.data.categories).toHaveLength(0);
    }
  });
});
