import { Test, TestingModule } from '@nestjs/testing';
import { MenuItemService } from '../services/menu-item.service';
import { MenuItemRepository } from '../repositories/menu-item.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Category } from '@common/entities/category.entity';
import { MenuItem } from '@common/entities/menu-item.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { MENU_ITEM_STATUS, PREPARATION_STATION } from '@common/constants/enum/catalog.enum';

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
    status: MENU_ITEM_STATUS.AVAILABLE,
    station: PREPARATION_STATION.KITCHEN,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as MenuItem;

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
      findManyByIdsAndTenant: jest.fn(),
      findByIdsForUpdate: jest.fn(),
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

    it('should persist station when creating a menu item', async () => {
      categoryRepo.findOne.mockResolvedValue(mockCategory);
      repository.create.mockResolvedValue({ ...mockMenuItem, station: PREPARATION_STATION.BAR } as MenuItem);

      await service.create({
        tenantId: 'tenant-1',
        categoryId: 'cat-1',
        name: 'Iced Tea',
        price: 25000,
        station: PREPARATION_STATION.BAR,
      });

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tenantId: 'tenant-1',
          station: PREPARATION_STATION.BAR,
        }),
      );
    });

    it('should throw BusinessException for invalid category', async () => {
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          categoryId: 'cat-invalid',
          name: 'Spring Rolls',
          price: 5.99,
        }),
      ).rejects.toThrow(BusinessException);
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
    it('should throw BusinessException when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getById({ id: 'item-999', tenantId: 'tenant-1' })).rejects.toThrow(BusinessException);
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

    it('should throw BusinessException for invalid categoryId on update', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      categoryRepo.findOne.mockResolvedValue(null);

      await expect(
        service.update({
          id: 'item-1',
          tenantId: 'tenant-1',
          categoryId: 'cat-invalid',
        }),
      ).rejects.toThrow(BusinessException);
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

  describe('clearImage', () => {
    it('should clear image url and public id', async () => {
      const cleared = {
        ...mockMenuItem,
        imageUrl: null,
        imagePublicId: null,
      } as unknown as MenuItem;
      repository.findByIdAndTenant.mockResolvedValue(mockMenuItem);
      repository.updateByIdAndTenant.mockResolvedValue(cleared);

      const result = await service.clearImage({
        id: 'item-1',
        tenantId: 'tenant-1',
      });
      expect(result).toEqual(cleared);
      expect(repository.updateByIdAndTenant).toHaveBeenCalledWith('item-1', 'tenant-1', {
        imageUrl: null,
        imagePublicId: null,
      });
    });
  });

  describe('validateOrderable', () => {
    it('returns snapshots with station', async () => {
      repository.findManyByIdsAndTenant.mockResolvedValue([
        { ...mockMenuItem, imageUrl: 'https://cdn.example.com/spring-rolls.jpg' } as MenuItem,
      ]);

      const result = await service.validateOrderable({
        tenantId: 'tenant-1',
        items: [{ menuItemId: 'item-1', quantity: 2 }],
      });

      expect(result[0]).toEqual(
        expect.objectContaining({
          menuItemId: 'item-1',
          menuItemName: 'Spring Rolls',
          menuItemImageUrl: 'https://cdn.example.com/spring-rolls.jpg',
          station: PREPARATION_STATION.KITCHEN,
        }),
      );
    });

    it('throws when item is not available', async () => {
      repository.findManyByIdsAndTenant.mockResolvedValue([
        { ...mockMenuItem, status: MENU_ITEM_STATUS.OUT_OF_STOCK } as MenuItem,
      ]);

      await expect(
        service.validateOrderable({
          tenantId: 'tenant-1',
          items: [{ menuItemId: 'item-1', quantity: 1 }],
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.CATALOG_MENU_ITEM_NOT_ORDERABLE });
    });
  });
});
