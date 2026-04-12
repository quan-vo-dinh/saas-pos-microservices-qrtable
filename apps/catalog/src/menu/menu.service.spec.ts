import { Test, TestingModule } from '@nestjs/testing';
import { MenuService } from './menu.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';

describe('MenuService', () => {
  let service: MenuService;
  let categoryRepo: { find: jest.Mock };
  let menuItemRepo: { find: jest.Mock };

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
    categoryRepo = { find: jest.fn() };
    menuItemRepo = { find: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuService,
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
        { provide: getRepositoryToken(MenuItem), useValue: menuItemRepo },
      ],
    }).compile();

    service = module.get<MenuService>(MenuService);
  });

  describe('getPublicMenu', () => {
    it('should return categories with available items', async () => {
      categoryRepo.find.mockResolvedValue([mockCategory]);
      menuItemRepo.find.mockResolvedValue([mockMenuItem]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(result.categories).toHaveLength(1);
      expect(result.categories[0].id).toBe('cat-1');
      expect(result.categories[0].name).toBe('Appetizers');
      expect(result.categories[0].items).toHaveLength(1);
      expect(result.categories[0].items[0].name).toBe('Spring Rolls');
    });

    it('should return empty categories when no active categories', async () => {
      categoryRepo.find.mockResolvedValue([]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(result.categories).toEqual([]);
      expect(menuItemRepo.find).not.toHaveBeenCalled();
    });

    it('should filter only active categories and available non-deleted items', async () => {
      categoryRepo.find.mockResolvedValue([mockCategory]);
      menuItemRepo.find.mockResolvedValue([]);

      const result = await service.getPublicMenu({ tenantId: 'tenant-1' });

      expect(categoryRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { tenantId: 'tenant-1', status: 'active' },
        }),
      );
      expect(menuItemRepo.find).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: 'tenant-1',
            categoryId: 'cat-1',
            status: 'available',
          }),
        }),
      );
      expect(result.categories[0].items).toEqual([]);
    });
  });
});
