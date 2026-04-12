import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from '../services/menu.service';
import { MenuRepository } from '../repositories/menu.repository';

describe('MenuService', () => {
  let service: MenuService;
  let repository: jest.Mocked<MenuRepository>;

  const mockCategory = {
    id: 'cat-1',
    tenantId: 'tenant-1',
    name: 'Appetizers',
    sortOrder: 0,
    status: 'active',
  };

  const mockMenuItem = {
    id: 'item-1',
    tenantId: 'tenant-1',
    categoryId: 'cat-1',
    name: 'Spring Rolls',
    description: 'Crispy spring rolls',
    price: 5.99,
    imageUrl: null,
    stock: 10,
    sortOrder: 0,
    status: 'available',
    deletedAt: null,
  };

  beforeEach(async () => {
    const mockMenuRepository = {
      findActiveCategories: jest.fn(),
      findAvailableItemsByCategory: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [MenuService, { provide: MenuRepository, useValue: mockMenuRepository }],
    }).compile();

    service = module.get<MenuService>(MenuService);
    repository = module.get(MenuRepository);
  });

  describe('getPublicMenu', () => {
    it('should return categories with available items', async () => {
      repository.findActiveCategories.mockResolvedValue([mockCategory as never]);
      repository.findAvailableItemsByCategory.mockResolvedValue([mockMenuItem as never]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe('cat-1');
      expect(result.categories[0].name).toBe('Appetizers');
      expect(result.categories[0].items).toHaveLength(1);
      expect(result.categories[0].items[0].name).toBe('Spring Rolls');
    });

    it('should return empty categories when no active categories', async () => {
      repository.findActiveCategories.mockResolvedValue([]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(result.categories).toEqual([]);
      expect(repository.findAvailableItemsByCategory).not.toHaveBeenCalled();
    });

    it('should filter only active categories and available non-deleted items', async () => {
      repository.findActiveCategories.mockResolvedValue([mockCategory as never]);
      repository.findAvailableItemsByCategory.mockResolvedValue([]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(repository.findActiveCategories).toHaveBeenCalledWith('tenant-1');
      expect(repository.findAvailableItemsByCategory).toHaveBeenCalledWith('tenant-1', 'cat-1');
      expect(result.categories[0].items).toEqual([]);
    });
  });
});
