import { Test, TestingModule } from '@nestjs/testing';
import { MenuItemService } from './menu-item.service';
import { MenuItemRepository } from './menu-item.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('MenuItemService', () => {
  let service: MenuItemService;
  let repository: jest.Mocked<MenuItemRepository>;
  let categoryRepo: { findOne: jest.Mock };

  const mockMenuItem = {
    id: 'item-1',
    tenantId: 'tenant-1',
    categoryId: 'cat-1',
    name: 'Spring Rolls',
    description: 'Crispy spring rolls',
    price: 5.99,
    imageUrl: null as string | null,
    imagePublicId: null as string | null,
    stock: 10,
    sortOrder: 0,
    status: 'available' as const,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as MenuItem;

  const mockMenuItemPlain = mockMenuItem;

  const mockCategory = {
    id: 'cat-1',
    tenantId: 'tenant-1',
    name: 'Appetizers',
    sortOrder: 0,
    status: 'active',
  };

  beforeEach(async () => {
    const mockMenuItemRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
      updateByIdAndTenant: jest.fn(),
      softDelete: jest.fn(),
    };

    categoryRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MenuItemService,
        { provide: MenuItemRepository, useValue: mockMenuItemRepository },
        { provide: getRepositoryToken(Category), useValue: categoryRepo },
      ],
    }).compile();

    service = module.get<MenuItemService>(MenuItemService);
    repository = module.get(MenuItemRepository);
  });

  describe('create', () => {
    it('should create a menu item successfully', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      repository.create.mockResolvedValue(mockMenuItem);

      const result = await service.create({
        tenantId: 'tenant-1',
        categoryId: 'cat-1',
        name: 'Spring Rolls',
        price: 5.99,
      });
      expect(result).toEqual(mockMenuItem);
      expect(categoryRepo.findOne).toHaveBeenCalledWith({
        where: { id: 'cat-1', tenantId: 'tenant-1' },
      });
    });

    it('should throw BadRequestException for invalid category', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          categoryId: 'cat-invalid',
          name: 'Spring Rolls',
          price: 5.99,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getList', () => {
    it('should return items for tenant', async () => {
      repository.findAllByTenant.mockResolvedValue([mockMenuItem]);

      const result = await service.getList({ tenantId: 'tenant-1' });
      expect(result).toEqual([mockMenuItem]);
      expect(repository.findAllByTenant).toHaveBeenCalledWith('tenant-1', undefined);
    });
  });

  describe('getById', () => {
    it('should throw NotFoundException when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getById({ id: 'item-999', tenantId: 'tenant-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('should update a menu item successfully', async () => {
      const updatedItem = { ...mockMenuItem, name: 'Updated Rolls' } as unknown as MenuItem;
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      repository.updateByIdAndTenant.mockResolvedValue(updatedItem);

      const result = await service.update({
        id: 'item-1',
        tenantId: 'tenant-1',
        name: 'Updated Rolls',
      });
      expect(result).toEqual(updatedItem);
    });

    it('should throw BadRequestException for invalid categoryId on update', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update({
          id: 'item-1',
          tenantId: 'tenant-1',
          categoryId: 'cat-invalid',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a menu item', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      repository.softDelete.mockResolvedValue(undefined);

      await service.softDelete({ id: 'item-1', tenantId: 'tenant-1' });
      expect(repository.softDelete).toHaveBeenCalledWith('item-1', 'tenant-1');
    });
  });

  describe('updateImage', () => {
    it('should update image url and public id', async () => {
      const updatedItem = {
        ...mockMenuItem,
        imageUrl: 'https://cdn.example.com/img.jpg',
        imagePublicId: 'img-pub-123',
      } as unknown as MenuItem;
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      repository.updateByIdAndTenant.mockResolvedValue(updatedItem);

      const result = await service.updateImage({
        id: 'item-1',
        tenantId: 'tenant-1',
        imageUrl: 'https://cdn.example.com/img.jpg',
        imagePublicId: 'img-pub-123',
      });
      expect(result).toEqual(updatedItem);
      expect(repository.updateByIdAndTenant).toHaveBeenCalledWith('item-1', 'tenant-1', {
        imageUrl: 'https://cdn.example.com/img.jpg',
        imagePublicId: 'img-pub-123',
      });
    });
  });
});
