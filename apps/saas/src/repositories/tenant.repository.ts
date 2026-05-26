import { SubscriptionStatus, TenantStatus, normalizePlanCode } from '@common/constants/saas.constants';
import { Tenant } from '@common/entities/tenant.entity';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { HttpStatus, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';

@Injectable()
export class TenantRepository {
  constructor(@InjectRepository(Tenant) private readonly repo: Repository<Tenant>) {}

  create(data: Partial<Tenant>): Promise<Tenant> {
    const tenant = this.repo.create(data);
    return this.repo.save(tenant);
  }

  findById(id: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { id } });
  }

  findByIds(ids: string[]): Promise<Tenant[]> {
    if (!ids.length) {
      return Promise.resolve([]);
    }
    return this.repo.find({ where: { id: In(ids) } });
  }

  findBySlug(slug: string): Promise<Tenant | null> {
    return this.repo.findOne({ where: { slug } });
  }

  async list(query: {
    search?: string;
    status?: TenantStatus | string;
    planCode?: string;
    page?: number | string;
    limit?: number | string;
  }): Promise<{ items: Tenant[]; page: number; limit: number; total: number }> {
    const page = Math.max(1, Number(query.page ?? 1) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit ?? 20) || 20));
    const qb = this.repo.createQueryBuilder('tenant');

    if (query.search?.trim()) {
      qb.andWhere('(tenant.name ILIKE :search OR tenant.slug ILIKE :search)', {
        search: `%${query.search.trim()}%`,
      });
    }

    if (query.status) {
      qb.andWhere('tenant.status = :status', { status: query.status });
    }

    if (query.planCode?.trim()) {
      qb.andWhere(
        `EXISTS (
          SELECT 1
          FROM subscriptions subscription
          WHERE subscription.tenant_id = tenant.id
            AND subscription.status = :subscriptionStatus
            AND subscription.plan_code_snapshot = :planCode
        )`,
        {
          subscriptionStatus: SubscriptionStatus.ACTIVE,
          planCode: normalizePlanCode(query.planCode),
        },
      );
    }

    const [items, total] = await qb
      .orderBy('tenant.createdAt', 'DESC')
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return { items, page, limit, total };
  }

  async updateStatus(id: string, patch: Partial<Tenant> & { status: TenantStatus }): Promise<void> {
    await this.repo.update({ id }, patch);
  }

  async updateProfile(id: string, patch: Partial<Tenant>): Promise<Tenant> {
    await this.repo.update({ id }, { ...patch, updatedAt: new Date() });
    const updated = await this.findById(id);
    if (!updated) {
      throw new BusinessException(ErrorCode.SAAS_TENANT_NOT_FOUND, HttpStatus.NOT_FOUND);
    }
    return updated;
  }

  countByStatus(status: TenantStatus): Promise<number> {
    return this.repo.count({ where: { status } });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete(id);
  }
}
