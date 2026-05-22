import { apiPublicFetch } from './helpers';
import { describeFrontendUtilsIntegration } from './integration-gate';

interface PublicMenuItem {
  id: string;
  name: string;
  price: number;
  status: string;
}

interface PublicMenuCategory {
  id: string;
  name: string;
  sortOrder: number;
  items: PublicMenuItem[];
}

interface PublicMenuResponse {
  categories: PublicMenuCategory[];
}

describeFrontendUtilsIntegration('[Integration] Public Menu', () => {
  it('should return public menu without authentication', async () => {
    const { status, data } = await apiPublicFetch<PublicMenuResponse>('/menu');

    expect(status).toBe(200);
    expect(data).toBeDefined();
    expect(data.categories).toBeDefined();
    expect(Array.isArray(data.categories)).toBe(true);
  });

  it('should return categories with items', async () => {
    const { data } = await apiPublicFetch<PublicMenuResponse>('/menu');

    expect(data.categories.length).toBeGreaterThan(0);

    for (const cat of data.categories) {
      expect(cat.id).toBeDefined();
      expect(cat.name).toBeDefined();
      expect(typeof cat.sortOrder).toBe('number');
      expect(Array.isArray(cat.items)).toBe(true);

      for (const item of cat.items) {
        expect(item.id).toBeDefined();
        expect(item.name).toBeDefined();
        expect(typeof item.price).toBe('number');
        expect(item.price).toBeGreaterThan(0);
      }
    }
  });

  it('should only return available items', async () => {
    const { data } = await apiPublicFetch<PublicMenuResponse>('/menu');

    for (const cat of data.categories) {
      for (const item of cat.items) {
        expect(item.status).toBe('available');
      }
    }
  });

  it('should return cached menu on second request (fast response)', async () => {
    // First request — may be cache miss
    await apiPublicFetch<PublicMenuResponse>('/menu');

    // Second request — should be cache hit
    const start = Date.now();
    const { status } = await apiPublicFetch<PublicMenuResponse>('/menu');
    const duration = Date.now() - start;

    expect(status).toBe(200);
    // Cache hit should be fast — allow 500ms for local network overhead
    expect(duration).toBeLessThan(500);
  });
});
