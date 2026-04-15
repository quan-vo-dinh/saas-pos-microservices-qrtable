/**
 * Unit tests for menuService
 * @see ../menu.service.ts
 */
import { uploadFile } from '@einvoice/frontend-utils';
import { API_CONFIG } from '@/constants/api';

// ─── Mocks ──────────────────────────────────────────────────────────────────

const mockAuthApiClient = jest.fn();

jest.mock('@/lib/api/authenticated-client', () => ({
  authApiClient: (...args: unknown[]) => mockAuthApiClient(...args),
}));

jest.mock('@/lib/auth/auth-store', () => ({
  useAuthStore: {
    getState: () => ({
      accessToken: 'test-access-token',
      profile: { tenantId: 'tenant_a' },
    }),
  },
}));

jest.mock('@einvoice/frontend-utils', () => ({
  uploadFile: jest.fn().mockResolvedValue({ imageUrl: 'http://cdn/img.png' }),
}));

// Import AFTER mocks are declared so module-level references are captured.
import { menuService } from '../menu.service';

// ─── Helpers ────────────────────────────────────────────────────────────────

const CATEGORIES = API_CONFIG.ENDPOINTS.CATEGORIES;
const CATEGORIES_REORDER = API_CONFIG.ENDPOINTS.CATEGORIES_REORDER;
const MENU_ITEMS = API_CONFIG.ENDPOINTS.MENU_ITEMS;

// ─── Tests ──────────────────────────────────────────────────────────────────

describe('menuService', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Categories
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getCategories', () => {
    it('should GET /admin/categories', async () => {
      const mockCategories = [{ id: '1', name: 'Drinks' }];
      mockAuthApiClient.mockResolvedValue(mockCategories);

      const result = await menuService.getCategories();

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(CATEGORIES);
      expect(result).toEqual(mockCategories);
    });
  });

  describe('getCategory', () => {
    it('should GET /admin/categories/:id', async () => {
      const mockCategory = { id: 'cat-1', name: 'Food' };
      mockAuthApiClient.mockResolvedValue(mockCategory);

      const result = await menuService.getCategory('cat-1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${CATEGORIES}/cat-1`);
      expect(result).toEqual(mockCategory);
    });

    it('should encode special characters in id', async () => {
      mockAuthApiClient.mockResolvedValue({});

      await menuService.getCategory('id/with spaces');

      expect(mockAuthApiClient).toHaveBeenCalledWith(`${CATEGORIES}/${encodeURIComponent('id/with spaces')}`);
    });
  });

  describe('createCategory', () => {
    it('should POST /admin/categories with body', async () => {
      const data = { name: 'Appetizers', status: 'active' };
      const created = { id: 'new-1', ...data };
      mockAuthApiClient.mockResolvedValue(created);

      const result = await menuService.createCategory(data);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(CATEGORIES, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(created);
    });

    it('should include optional timeStart and timeEnd', async () => {
      const data = {
        name: 'Lunch',
        timeStart: '11:00',
        timeEnd: '14:00',
        status: 'active',
      };
      mockAuthApiClient.mockResolvedValue({ id: '1', ...data });

      await menuService.createCategory(data);

      expect(mockAuthApiClient).toHaveBeenCalledWith(CATEGORIES, {
        method: 'POST',
        body: JSON.stringify(data),
      });
    });
  });

  describe('updateCategory', () => {
    it('should PATCH /admin/categories/:id with body', async () => {
      const data = { name: 'Updated', status: 'inactive' };
      const updated = { id: 'cat-1', ...data };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await menuService.updateCategory('cat-1', data);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${CATEGORIES}/cat-1`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteCategory', () => {
    it('should DELETE /admin/categories/:id', async () => {
      mockAuthApiClient.mockResolvedValue(undefined);

      await menuService.deleteCategory('cat-1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${CATEGORIES}/cat-1`, {
        method: 'DELETE',
      });
    });
  });

  describe('reorderCategories', () => {
    it('should PATCH /admin/categories/reorder with orderedIds', async () => {
      const orderedIds = ['cat-3', 'cat-1', 'cat-2'];
      mockAuthApiClient.mockResolvedValue(undefined);

      await menuService.reorderCategories(orderedIds);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(CATEGORIES_REORDER, {
        method: 'PATCH',
        body: JSON.stringify({ orderedIds }),
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Menu Items
  // ═══════════════════════════════════════════════════════════════════════════

  describe('getMenuItems', () => {
    it('should GET /admin/menu-items without query when no categoryId', async () => {
      const mockItems = [{ id: 'item-1', name: 'Burger' }];
      mockAuthApiClient.mockResolvedValue(mockItems);

      const result = await menuService.getMenuItems();

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(MENU_ITEMS);
      expect(result).toEqual(mockItems);
    });

    it('should GET /admin/menu-items?categoryId=x when categoryId is provided', async () => {
      const mockItems = [{ id: 'item-2', name: 'Salad' }];
      mockAuthApiClient.mockResolvedValue(mockItems);

      const result = await menuService.getMenuItems('cat-5');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${MENU_ITEMS}?categoryId=cat-5`);
      expect(result).toEqual(mockItems);
    });

    it('should encode categoryId with special characters', async () => {
      mockAuthApiClient.mockResolvedValue([]);

      await menuService.getMenuItems('cat id/special');

      expect(mockAuthApiClient).toHaveBeenCalledWith(
        `${MENU_ITEMS}?categoryId=${encodeURIComponent('cat id/special')}`,
      );
    });
  });

  describe('getMenuItem', () => {
    it('should GET /admin/menu-items/:id', async () => {
      const mockItem = { id: 'item-1', name: 'Burger', price: 10 };
      mockAuthApiClient.mockResolvedValue(mockItem);

      const result = await menuService.getMenuItem('item-1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${MENU_ITEMS}/item-1`);
      expect(result).toEqual(mockItem);
    });
  });

  describe('createMenuItem', () => {
    it('should POST /admin/menu-items with body', async () => {
      const data = {
        name: 'Burger',
        description: 'Juicy beef burger',
        price: 12.5,
        categoryId: 'cat-1',
        stock: 50,
        status: 'active',
      };
      const created = { id: 'item-new', ...data };
      mockAuthApiClient.mockResolvedValue(created);

      const result = await menuService.createMenuItem(data);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(MENU_ITEMS, {
        method: 'POST',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(created);
    });
  });

  describe('updateMenuItem', () => {
    it('should PATCH /admin/menu-items/:id with body', async () => {
      const data = {
        name: 'Updated Burger',
        price: 15,
        categoryId: 'cat-2',
        stock: 30,
        status: 'active',
      };
      const updated = { id: 'item-1', ...data };
      mockAuthApiClient.mockResolvedValue(updated);

      const result = await menuService.updateMenuItem('item-1', data);

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${MENU_ITEMS}/item-1`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      });
      expect(result).toEqual(updated);
    });
  });

  describe('deleteMenuItem', () => {
    it('should DELETE /admin/menu-items/:id', async () => {
      mockAuthApiClient.mockResolvedValue(undefined);

      await menuService.deleteMenuItem('item-1');

      expect(mockAuthApiClient).toHaveBeenCalledTimes(1);
      expect(mockAuthApiClient).toHaveBeenCalledWith(`${MENU_ITEMS}/item-1`, {
        method: 'DELETE',
      });
    });
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // Upload
  // ═══════════════════════════════════════════════════════════════════════════

  describe('uploadMenuItemImage', () => {
    const mockFile = new File(['image-data'], 'photo.png', {
      type: 'image/png',
    });

    it('should call uploadFile with correct url, file, and auth headers', async () => {
      const result = await menuService.uploadMenuItemImage('item-1', mockFile);

      expect(uploadFile).toHaveBeenCalledTimes(1);
      expect(uploadFile).toHaveBeenCalledWith({
        url: `${API_CONFIG.DEFAULT_BFF_URL}${MENU_ITEMS}/item-1/image`,
        file: mockFile,
        headers: {
          Authorization: 'Bearer test-access-token',
          'x-tenant-id': 'tenant_a',
        },
        onProgress: undefined,
      });
      expect(result).toEqual({ imageUrl: 'http://cdn/img.png' });
    });

    it('should forward onProgress callback to uploadFile', async () => {
      const onProgress = jest.fn();

      await menuService.uploadMenuItemImage('item-1', mockFile, onProgress);

      expect(uploadFile).toHaveBeenCalledWith(expect.objectContaining({ onProgress }));
    });

    it('should encode special characters in item id', async () => {
      await menuService.uploadMenuItemImage('id/special', mockFile);

      expect(uploadFile).toHaveBeenCalledWith(
        expect.objectContaining({
          url: `${API_CONFIG.DEFAULT_BFF_URL}${MENU_ITEMS}/${encodeURIComponent('id/special')}/image`,
        }),
      );
    });

    it('should NOT call authApiClient (uses uploadFile instead)', async () => {
      await menuService.uploadMenuItemImage('item-1', mockFile);

      expect(mockAuthApiClient).not.toHaveBeenCalled();
    });
  });
});
