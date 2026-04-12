import { Test, TestingModule } from '@nestjs/testing';
import { TableService } from '../services/table.service';
import { TableRepository } from '../repositories/table.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from '@common/entities/area.entity';
import { Table } from '@common/entities/table.entity';
import { ConfigService } from '@nestjs/config';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { createHmac } from 'crypto';

describe('TableService', () => {
  let service: TableService;
  let repository: jest.Mocked<TableRepository>;
  let areaRepo: { findOne: jest.Mock };

  const TEST_SECRET = 'test-secret';

  const mockTable = {
    id: 'table-1',
    tenantId: 'tenant-1',
    areaId: 'area-1',
    name: 'Table 1',
    capacity: 4,
    status: 'available',
    qrToken: 'some-token',
    sessionId: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as unknown as Table;

  const mockArea = {
    id: 'area-1',
    tenantId: 'tenant-1',
    name: 'Main Hall',
    sortOrder: 0,
  };

  beforeEach(async () => {
    const mockTableRepository = {
      create: jest.fn(),
      findAllByTenant: jest.fn(),
      findByIdAndTenant: jest.fn(),
      existsByName: jest.fn(),
      updateByIdAndTenant: jest.fn(),
      deleteByIdAndTenant: jest.fn(),
      findByQrToken: jest.fn(),
    };

    areaRepo = { findOne: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TableService,
        { provide: TableRepository, useValue: mockTableRepository },
        { provide: getRepositoryToken(Area), useValue: areaRepo },
        { provide: ConfigService, useValue: { get: jest.fn().mockReturnValue(TEST_SECRET) } },
      ],
    }).compile();

    service = module.get<TableService>(TableService);
    repository = module.get(TableRepository);
  });

  describe('create', () => {
    it('should create a table with auto-generated QR token', async () => {
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockTable);
      const updatedTable = { ...mockTable, qrToken: 'generated-token' } as unknown as Table;
      repository.updateByIdAndTenant.mockResolvedValue(updatedTable);

      const result = await service.create({
        tenantId: 'tenant-1',
        areaId: 'area-1',
        name: 'Table 1',
      });
      expect(result).toEqual(updatedTable);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.updateByIdAndTenant).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid area', async () => {
      areaRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ tenantId: 'tenant-1', areaId: 'area-invalid', name: 'Table 1' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw BadRequestException for duplicate name', async () => {
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create({ tenantId: 'tenant-1', areaId: 'area-1', name: 'Table 1' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('delete', () => {
    it('should delete an available table', async () => {
      const availableTable = { ...mockTable, status: 'available', sessionId: null } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);

      await service.delete({ id: 'table-1', tenantId: 'tenant-1' });
      expect(repository.deleteByIdAndTenant).toHaveBeenCalledWith('table-1', 'tenant-1');
    });

    it('should throw BadRequestException for occupied table', async () => {
      const occupiedTable = { ...mockTable, status: 'occupied', sessionId: 'session-1' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(occupiedTable);

      await expect(service.delete({ id: 'table-1', tenantId: 'tenant-1' })).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateStatus', () => {
    it('should transition available → occupied', async () => {
      const availableTable = { ...mockTable, status: 'available' } as unknown as Table;
      const occupiedTable = { ...mockTable, status: 'occupied' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);
      repository.updateByIdAndTenant.mockResolvedValue(occupiedTable);

      const result = await service.updateStatus({
        id: 'table-1',
        tenantId: 'tenant-1',
        status: 'occupied',
      });
      expect(result.status).toBe('occupied');
    });

    it('should transition occupied → billing', async () => {
      const occupiedTable = { ...mockTable, status: 'occupied' } as unknown as Table;
      const billingTable = { ...mockTable, status: 'billing' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(occupiedTable);
      repository.updateByIdAndTenant.mockResolvedValue(billingTable);

      const result = await service.updateStatus({
        id: 'table-1',
        tenantId: 'tenant-1',
        status: 'billing',
      });
      expect(result.status).toBe('billing');
    });

    it('should reject invalid transition available → cleaning', async () => {
      const availableTable = { ...mockTable, status: 'available' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);

      await expect(service.updateStatus({ id: 'table-1', tenantId: 'tenant-1', status: 'cleaning' })).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should reject invalid transition billing → available', async () => {
      const billingTable = { ...mockTable, status: 'billing' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(billingTable);

      await expect(service.updateStatus({ id: 'table-1', tenantId: 'tenant-1', status: 'available' })).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('validateQrToken', () => {
    it('should return table for correct token', async () => {
      const expectedToken = createHmac('sha256', TEST_SECRET).update('table-1tenant-1').digest('hex');
      repository.findByIdAndTenant.mockResolvedValue(mockTable);

      const result = await service.validateQrToken({
        tableId: 'table-1',
        tenantId: 'tenant-1',
        token: expectedToken,
      });
      expect(result).toEqual(mockTable);
    });

    it('should throw BadRequestException for wrong token', async () => {
      const wrongToken = createHmac('sha256', 'wrong-secret').update('table-1tenant-1').digest('hex');

      await expect(
        service.validateQrToken({
          tableId: 'table-1',
          tenantId: 'tenant-1',
          token: wrongToken,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
