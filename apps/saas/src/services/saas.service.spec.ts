import { Test, TestingModule } from '@nestjs/testing';
import { TenantStatus } from '@common/constants/saas.constants';
import { SaasService } from './saas.service';
import { SaasRepository } from '../repositories/saas.repository';
import { ErrorCode } from '@common/error-messages/error-code.enum';

describe('SaasService', () => {
  let service: SaasService;
  let repo: {
    findBySlug: jest.Mock;
    findById: jest.Mock;
    existsBySlug: jest.Mock;
    create: jest.Mock;
    findAll: jest.Mock;
    updateById: jest.Mock;
    deleteById: jest.Mock;
  };

  beforeEach(async () => {
    repo = {
      findBySlug: jest.fn(),
      findById: jest.fn(),
      existsBySlug: jest.fn(),
      create: jest.fn(),
      findAll: jest.fn(),
      updateById: jest.fn(),
      deleteById: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [SaasService, { provide: SaasRepository, useValue: repo }],
    }).compile();

    service = module.get(SaasService);
  });

  describe('getBySlug', () => {
    it('returns tenant when slug matches', async () => {
      repo.findBySlug.mockResolvedValue({
        id: 't1',
        slug: 'acme-diner',
        name: 'Acme',
        isActive: true,
      });

      const result = await service.getBySlug('Acme Diner');

      expect(result.slug).toBe('acme-diner');
      expect(repo.findBySlug).toHaveBeenCalledWith('acme-diner');
    });

    it('preserves legacy tenant keys when resolving by slug', async () => {
      repo.findBySlug.mockResolvedValue({
        id: 't1',
        slug: 'tenant_a',
        name: 'Tenant A',
        isActive: true,
      });

      const result = await service.getBySlug('tenant_a');

      expect(result.slug).toBe('tenant_a');
      expect(repo.findBySlug).toHaveBeenCalledWith('tenant_a');
    });

    it('throws SAAS_TENANT_NOT_FOUND when missing', async () => {
      repo.findBySlug.mockResolvedValue(null);

      await expect(service.getBySlug('unknown')).rejects.toMatchObject({
        errorCode: ErrorCode.SAAS_TENANT_NOT_FOUND,
      });
    });

    it('throws SAAS_TENANT_INACTIVE when tenant is CLOSED', async () => {
      repo.findBySlug.mockResolvedValue({
        id: 't1',
        slug: 'closed',
        name: 'Closed',
        isActive: false,
        status: TenantStatus.CLOSED,
      });

      await expect(service.getBySlug('closed')).rejects.toMatchObject({
        errorCode: ErrorCode.SAAS_TENANT_INACTIVE,
      });
    });

    it('returns tenant when suspended (QR customer resolve)', async () => {
      repo.findBySlug.mockResolvedValue({
        id: 't1',
        slug: 'suspended-cafe',
        name: 'Cafe',
        isActive: false,
        status: TenantStatus.SUSPENDED,
        suspendedReason: 'SUBSCRIPTION_EXPIRED',
        defaultCurrency: 'VND',
        defaultLocale: 'vi-VN',
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      const result = await service.getBySlug('suspended-cafe');

      expect(result.status).toBe(TenantStatus.SUSPENDED);
      expect(result.suspendedReason).toBe('SUBSCRIPTION_EXPIRED');
    });
  });
});
