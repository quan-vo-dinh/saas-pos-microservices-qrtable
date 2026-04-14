import { Test, TestingModule } from '@nestjs/testing';
import { CategoryService } from '../services/category.service';
import { CategoryRepository } from '../repositories/category.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { MenuItem } from '@common/entities/menu-item.entity';
import { CATEGORY_STATUS } from '@common/constants/enum/catalog.enum';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('CategoryService', () => {
  let service: CategoryService;
  let repository: jest.Mocked<CategoryRepository>;
  let menuItemRepo: { count: jest.Mock };

  const mockCategory = {
    id: 'cat-1',
    tenantId: 'tenant-1',
    name: 'Appetizers',
    sortOrder: 0,
    status: CATEGORY_STATUS.ACTIVE,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockCategoryRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
      existsByName: jest.fn(),
      updateByIdAndTenant: jest.fn(),
      deleteByIdAndTenant: jest.fn(),
      batchUpdateSortOrder: jest.fn(),
    };

    menuItemRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CategoryService,
        { provide: CategoryRepository, useValue: mockCategoryRepository },
        { provide: getRepositoryToken(MenuItem), useValue: menuItemRepo },
      ],
    }).compile();

    service = module.get<CategoryService>(CategoryService);
    repository = module.get(CategoryRepository);
  });

  describe('create', () => {
    it('should create a category successfully', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockCategory);

      const result = await service.create({ tenantId: 'tenant-1', name: 'Appetizers' });
      expect(result).toEqual(mockCategory);
      expect(repository.existsByName).toHaveBeenCalledWith('tenant-1', 'Appetizers');
    });

    it('should throw BadRequestException for duplicate name', async () => {
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create({ tenantId: 'tenant-1', name: 'Appetizers' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should return category when found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);

      const result = await service.getById({ id: 'cat-1', tenantId: 'tenant-1' });
      expect(result).toEqual(mockCategory);
    });

    it('should throw NotFoundException when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getById({ id: 'cat-999', tenantId: 'tenant-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should delete when no menu items exist', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);
      menuItemRepo.count.mockResolvedValue(0);

      await service.delete({ id: 'cat-1', tenantId: 'tenant-1' });
      expect(repository.deleteByIdAndTenant).toHaveBeenCalledWith('cat-1', 'tenant-1');
    });

    it('should throw BadRequestException when category has active menu items', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockCategory);
      menuItemRepo.count.mockResolvedValue(3);

      await expect(service.delete({ id: 'cat-1', tenantId: 'tenant-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should batch update sort orders and return updated list', async () => {
      const items = [
        { id: 'cat-1', sortOrder: 1 },
        { id: 'cat-2', sortOrder: 0 },
      ];
      repository.batchUpdateSortOrder.mockResolvedValue(undefined);
      repository.findAllByTenant.mockResolvedValue([mockCategory]);

      const result = await service.reorder({ tenantId: 'tenant-1', items });
      expect(repository.batchUpdateSortOrder).toHaveBeenCalledWith('tenant-1', items);
      expect(result).toEqual([mockCategory]);
    });
  });
});
