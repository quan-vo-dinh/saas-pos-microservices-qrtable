import { Test, TestingModule } from '@nestjs/testing';
import { TableService } from '../services/table.service';
import { TableRepository } from '../repositories/table.repository';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Area } from '@common/entities/area.entity';
import { Table } from '@common/entities/table.entity';
import { TABLE_STATUS } from '@common/constants/enum/catalog.enum';
import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { SubscriptionStatus, TenantStatus } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import type { SubscriptionDashboardTcpResponse } from '@common/interfaces/tcp/saas';
import { of, throwError } from 'rxjs';

const SAMPLE_QR_TOKEN = 'a'.repeat(64);

describe('TableService', () => {
  let service: TableService;
  let repository: jest.Mocked<TableRepository>;
  let areaRepo: { findOne: jest.Mock };
  let saasClient: { send: jest.Mock };

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

  const subscriptionDashboard = (maxTables: number): SubscriptionDashboardTcpResponse => ({
    tenant: { id: 'tenant-1', name: 'Tenant 1', slug: 'tenant-1', status: TenantStatus.ACTIVE },
    current: {
      planCode: 'PRO',
      planName: 'Pro',
      status: SubscriptionStatus.ACTIVE,
      expiresAt: null,
      billingPeriod: 'MONTHLY',
      features: [],
      maxTables,
      maxStaff: 10,
      maxOrdersPerDay: 100,
    },
    usage: {},
    plans: [],
    history: [],
  });

  const allowTableCreation = (maxTables = 10, current = 1) => {
    saasClient.send.mockReturnValue(of({ statusCode: 200, data: subscriptionDashboard(maxTables) }));
    repository.countByTenant.mockResolvedValue(current);
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
      countByTenant: jest.fn(),
    };

    areaRepo = { findOne: jest.fn() };
    saasClient = { send: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TableService,
        { provide: TableRepository, useValue: mockTableRepository },
        { provide: getRepositoryToken(Area), useValue: areaRepo },
        { provide: TCP_SERVICES.SAAS_SERVICE, useValue: saasClient },
      ],
    }).compile();

    service = module.get<TableService>(TableService);
    repository = module.get(TableRepository);
  });

  describe('create', () => {
    it('should create a table with opaque QR token', async () => {
      allowTableCreation();
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

    it('should allow create when max_tables is unlimited', async () => {
      allowTableCreation(-1, 25);
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);
      repository.create.mockResolvedValue(mockTable);
      repository.updateByIdAndTenant.mockResolvedValue(mockTable);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          areaId: 'area-1',
          name: 'Table 1',
        }),
      ).resolves.toEqual(mockTable);

      expect(repository.create).toHaveBeenCalled();
    });

    it('should block create before persistence when current table count reaches max_tables', async () => {
      allowTableCreation(2, 2);
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          areaId: 'area-1',
          name: 'Table 1',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
        response: {
          details: {
            limitType: 'max_tables',
            limit: 2,
            current: 2,
            upgradeUrl: '/dashboard/subscription',
          },
        },
      });

      expect(repository.create).not.toHaveBeenCalled();
      expect(repository.updateByIdAndTenant).not.toHaveBeenCalled();
    });

    it('should block create when current subscription is missing', async () => {
      saasClient.send.mockReturnValue(of({ statusCode: 200, data: { ...subscriptionDashboard(5), current: null } }));
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          areaId: 'area-1',
          name: 'Table 1',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should block create when SaaS subscription lookup is unavailable', async () => {
      saasClient.send.mockReturnValue(throwError(() => new Error('unavailable')));
      areaRepo.findOne.mockResolvedValue(mockArea);
      repository.existsByName.mockResolvedValue(false);

      await expect(
        service.create({
          tenantId: 'tenant-1',
          areaId: 'area-1',
          name: 'Table 1',
        }),
      ).rejects.toMatchObject({
        errorCode: ErrorCode.TENANT_PLAN_LIMIT_EXCEEDED,
      });

      expect(repository.create).not.toHaveBeenCalled();
    });

    it('should throw BusinessException for invalid area', async () => {
      allowTableCreation();
      areaRepo.findOne.mockResolvedValue(null);

      await expect(service.create({ tenantId: 'tenant-1', areaId: 'area-invalid', name: 'Table 1' })).rejects.toThrow(
        BusinessException,
      );
    });

    it('should throw BusinessException for duplicate name', async () => {
      allowTableCreation();
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

    it.each([TABLE_STATUS.OCCUPIED, TABLE_STATUS.BILLING])(
      'should release %s table when transfer passes matching session id',
      async (sourceStatus) => {
        const occupiedTable = {
          ...mockTable,
          status: sourceStatus,
          sessionId: 'session-1',
        } as unknown as Table;
        const availableTable = {
          ...mockTable,
          status: TABLE_STATUS.AVAILABLE,
          sessionId: null,
        } as unknown as Table;
        repository.findByIdAndTenant.mockResolvedValue(occupiedTable);
        repository.updateByIdAndTenant.mockResolvedValue(availableTable);

        const result = await service.updateStatus({
          id: 'table-1',
          tenantId: 'tenant-1',
          status: TABLE_STATUS.AVAILABLE,
          sessionId: 'session-1',
        });

        expect(repository.updateByIdAndTenant).toHaveBeenCalledWith('table-1', 'tenant-1', {
          status: TABLE_STATUS.AVAILABLE,
          sessionId: null,
        });
        expect(result.status).toBe(TABLE_STATUS.AVAILABLE);
      },
    );

    it('should reject occupied → available without matching transfer session id', async () => {
      const occupiedTable = {
        ...mockTable,
        status: TABLE_STATUS.OCCUPIED,
        sessionId: 'session-1',
      } as unknown as Table;
      repository.findByIdAndTenant.mockResolvedValue(occupiedTable);

      await expect(
        service.updateStatus({
          id: 'table-1',
          tenantId: 'tenant-1',
          status: TABLE_STATUS.AVAILABLE,
        }),
      ).rejects.toThrow(BusinessException);

      await expect(
        service.updateStatus({
          id: 'table-1',
          tenantId: 'tenant-1',
          status: TABLE_STATUS.AVAILABLE,
          sessionId: 'session-other',
        }),
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

  describe('countTablesByTenant', () => {
    it('returns tenant table count', async () => {
      repository.countByTenant.mockResolvedValue(2);

      await expect(service.countTablesByTenant({ tenantId: 'tenant-1' })).resolves.toEqual({
        tenantId: 'tenant-1',
        count: 2,
      });
      expect(repository.countByTenant).toHaveBeenCalledWith({ tenantId: 'tenant-1', activeOnly: true });
    });
  });
});
