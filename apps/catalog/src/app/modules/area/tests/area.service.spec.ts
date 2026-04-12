import { Test, TestingModule } from '@nestjs/testing';
import { AreaService } from '../services/area.service';
import { AreaRepository } from '../repositories/area.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Table } from '@common/entities/table.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('AreaService', () => {
  let service: AreaService;
  let repository: jest.Mocked<AreaRepository>;
  let tableRepo: { count: jest.Mock };

  const mockArea = {
    id: 'area-1',
    tenantId: 'tenant-1',
    name: 'Main Hall',
    sortOrder: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(async () => {
    const mockAreaRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
      existsByName: jest.fn(),
      updateByIdAndTenant: jest.fn(),
      deleteByIdAndTenant: jest.fn(),
      batchUpdateSortOrder: jest.fn(),
    };

    tableRepo = { count: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AreaService,
        { provide: AreaRepository, useValue: mockAreaRepository },
        { provide: getRepositoryToken(Table), useValue: tableRepo },
      ],
    }).compile();

    service = module.get<AreaService>(AreaService);
    repository = module.get(AreaRepository);
  });

  describe('create', () => {
    it('should create an area successfully', async () => {
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockArea);

      const result = await service.create({ tenantId: 'tenant-1', name: 'Main Hall' });
      expect(result).toEqual(mockArea);
      expect(repository.existsByName).toHaveBeenCalledWith('tenant-1', 'Main Hall');
    });

    it('should throw BadRequestException for duplicate name', async () => {
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create({ tenantId: 'tenant-1', name: 'Main Hall' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('getById', () => {
    it('should throw NotFoundException when not found', async () => {
      repository.findByIdAndTenant.mockResolvedValue(null);

      await expect(service.getById({ id: 'area-999', tenantId: 'tenant-1' })).rejects.toThrow(NotFoundException);
    });
  });

  describe('delete', () => {
    it('should throw BadRequestException when area has tables', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockArea);
      tableRepo.count.mockResolvedValue(5);

      await expect(service.delete({ id: 'area-1', tenantId: 'tenant-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('reorder', () => {
    it('should batch update sort orders and return updated list', async () => {
      const items = [
        { id: 'area-1', sortOrder: 1 },
        { id: 'area-2', sortOrder: 0 },
      ];
      repository.batchUpdateSortOrder.mockResolvedValue(undefined);
      repository.findAllByTenant.mockResolvedValue([mockArea]);

      const result = await service.reorder({ tenantId: 'tenant-1', items });
      expect(repository.batchUpdateSortOrder).toHaveBeenCalledWith('tenant-1', items);
      expect(result).toEqual([mockArea]);
    });
  });
});
