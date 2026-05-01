import { Test, TestingModule } from '@nestjs/testing';
import { TableService } from '../services/table.service';
import { TableRepository } from '../repositories/table.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from '@common/entities/area.entity';
import { Table } from '@common/entities/table.entity';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';

const SAMPLE_QR_TOKEN = 'a'.repeat(64);

describe('TableService', () => {
  let service: TableService;
  let repository: jest.Mocked<TableRepository>;
  let areaRepo: { findOne: jest.Mock };

  const mockTable = {
    id: 'table-1',
    tenantId: 'tenant-1',
    areaId: 'area-1',
    name: 'Table 1',
    capacity: 4,
    status: TABLE_STATUS.AVAILABLE,
    qrToken: SAMPLE_QR_TOKEN,
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
      ],
    }).compile();

    service = module.get<TableService>(TableService);
    repository = module.get(TableRepository);
  });

  describe('create', () => {
    it('should create a table with opaque QR token', async () => {
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockTable);
      const updatedTable = { ...mockTable, qrToken: SAMPLE_QR_TOKEN } as unknown as Table;
      repository.updateByIdAndTenant.mockResolvedValue(updatedTable);

      const result = await service.create({
        tenantId: 'tenant-1',
        areaId: 'area-1',
        name: 'Table 1',
      });
      expect(result).toEqual(updatedTable);
      expect(repository.create).toHaveBeenCalled();
      expect(repository.updateByIdAndTenant).toHaveBeenCalledWith(
        'table-1',
        'tenant-1',
        expect.objectContaining({
          qrToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });

    it('should throw BusinessException for invalid area', async () => {
      areaRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ tenantId: 'tenant-1', areaId: 'area-invalid', name: 'Table 1' })).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for duplicate name', async () => {
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(true);

      await expect(service.create({ tenantId: 'tenant-1', areaId: 'area-1', name: 'Table 1' })).rejects.toThrow(
        BusinessException,
      );
    });
  });

  describe('delete', () => {
    it('should delete an available table', async () => {
      const availableTable = { ...mockTable, status: TABLE_STATUS.AVAILABLE, sessionId: null } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);

      await service.delete({ id: 'table-1', tenantId: 'tenant-1' });
      expect(repository.deleteByIdAndTenant).toHaveBeenCalledWith('table-1', 'tenant-1');
    });

    it('should throw BusinessException for occupied table', async () => {
      const occupiedTable = { ...mockTable, status: TABLE_STATUS.OCCUPIED, sessionId: 'session-1' } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(occupiedTable);

      await expect(service.delete({ id: 'table-1', tenantId: 'tenant-1' })).rejects.toThrow(BusinessException);
    });
  });

  describe('updateStatus', () => {
    it('should transition available → occupied', async () => {
      const availableTable = { ...mockTable, status: TABLE_STATUS.AVAILABLE } as unknown as Table;
      const occupiedTable = { ...mockTable, status: TABLE_STATUS.OCCUPIED } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);
      repository.updateByIdAndTenant.mockResolvedValue(occupiedTable);

      const result = await service.updateStatus({
        id: 'table-1',
        tenantId: 'tenant-1',
        status: TABLE_STATUS.OCCUPIED,
      });
      expect(result.status).toBe(TABLE_STATUS.OCCUPIED);
    });

    it('should transition occupied → billing', async () => {
      const occupiedTable = { ...mockTable, status: TABLE_STATUS.OCCUPIED } as unknown as Table;
      const billingTable = { ...mockTable, status: TABLE_STATUS.BILLING } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(occupiedTable);
      repository.updateByIdAndTenant.mockResolvedValue(billingTable);

      const result = await service.updateStatus({
        id: 'table-1',
        tenantId: 'tenant-1',
        status: TABLE_STATUS.BILLING,
      });
      expect(result.status).toBe(TABLE_STATUS.BILLING);
    });

    it('should reject invalid transition available → cleaning', async () => {
      const availableTable = { ...mockTable, status: TABLE_STATUS.AVAILABLE } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(availableTable);

      await expect(
        service.updateStatus({ id: 'table-1', tenantId: 'tenant-1', status: TABLE_STATUS.CLEANING }),
      ).rejects.toThrow(BusinessException);
    });

    it('should reject invalid transition billing → available', async () => {
      const billingTable = { ...mockTable, status: TABLE_STATUS.BILLING } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(billingTable);

      await expect(
        service.updateStatus({ id: 'table-1', tenantId: 'tenant-1', status: TABLE_STATUS.AVAILABLE }),
      ).rejects.toThrow(BusinessException);
    });
  });

  describe('validateQrToken', () => {
    it('should return table when token matches stored qrToken', async () => {
      const tableWithToken = { ...mockTable, qrToken: SAMPLE_QR_TOKEN } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(tableWithToken);

      const result = await service.validateQrToken({
        tableId: 'table-1',
        tenantId: 'tenant-1',
        token: SAMPLE_QR_TOKEN,
      });
      expect(result).toEqual(tableWithToken);
    });

    it('should throw when token does not match stored value', async () => {
      const tableWithToken = { ...mockTable, qrToken: SAMPLE_QR_TOKEN } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(tableWithToken);
      const otherToken = 'b'.repeat(64);

      await expect(
        service.validateQrToken({
          tableId: 'table-1',
          tenantId: 'tenant-1',
          token: otherToken,
        }),
      ).rejects.toThrow(BusinessException);
    });

    it('should throw when token is not 64 hex chars', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockTable);

      await expect(
        service.validateQrToken({
          tableId: 'table-1',
          tenantId: 'tenant-1',
          token: 'short',
        }),
      ).rejects.toMatchObject({ errorCode: ErrorCode.CATALOG_TABLE_INVALID_QR_TOKEN });
    });
  });

  describe('regenerateQrToken', () => {
    it('should replace qrToken with a new opaque value', async () => {
      repository.findByIdAndTenant.mockResolvedValue(mockTable);
      const nextToken = 'c'.repeat(64);
      repository.updateByIdAndTenant.mockResolvedValue({ ...mockTable, qrToken: nextToken } as unknown as Table);

      const result = await service.regenerateQrToken({ id: 'table-1', tenantId: 'tenant-1' });

      expect(result.qrToken).toBe(nextToken);
      expect(repository.updateByIdAndTenant).toHaveBeenCalledWith(
        'table-1',
        'tenant-1',
        expect.objectContaining({
          qrToken: expect.stringMatching(/^[a-f0-9]{64}$/),
        }),
      );
    });
  });
});
