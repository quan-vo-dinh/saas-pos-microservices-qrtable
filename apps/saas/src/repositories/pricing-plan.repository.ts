import { normalizePlanCode } from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

@Injectable()
export class PricingPlanRepository {
  constructor(@InjectRepository(PricingPlan) private readonly repo: Repository<PricingPlan>) {}

  findActiveByCode(code: string): Promise<PricingPlan | null> {
    return this.repo.findOne({ where: { code: normalizePlanCode(code), isActive: true } });
  }

  findByCode(code: string): Promise<PricingPlan | null> {
    return this.repo.findOne({ where: { code: normalizePlanCode(code) } });
  }

  listActive(): Promise<PricingPlan[]> {
    return this.repo.find({ where: { isActive: true }, order: { displayOrder: 'ASC', priceVnd: 'ASC' } });
  }

  list(query: { isActive?: boolean | string; billingPeriod?: string } = {}): Promise<PricingPlan[]> {
    const qb = this.repo.createQueryBuilder('plan');

    if (query.isActive !== undefined && query.isActive !== '') {
      const active = query.isActive === true || query.isActive === 'true';
      qb.andWhere('plan.isActive = :active', { active });
    }

    if (query.billingPeriod) {
      qb.andWhere('plan.billingPeriod = :billingPeriod', { billingPeriod: query.billingPeriod });
    }

    return qb.orderBy('plan.displayOrder', 'ASC').addOrderBy('plan.priceVnd', 'ASC').getMany();
  }

  createPlan(data: Partial<PricingPlan>): Promise<PricingPlan> {
    return this.repo.save(
      this.repo.create({
        ...data,
        code: data.code ? normalizePlanCode(data.code) : data.code,
        isActive: data.isActive ?? true,
        features: data.features ?? [],
      }),
    );
  }

  async updatePlan(id: string, patch: Partial<PricingPlan>): Promise<PricingPlan> {
    const update = {
      ...patch,
      code: patch.code ? normalizePlanCode(patch.code) : patch.code,
      updatedAt: new Date(),
    };
    await this.repo.update({ id }, update);
    const updated = await this.repo.findOne({ where: { id } });
    if (!updated) {
      throw new NotFoundException('PLAN_NOT_FOUND');
    }
    return updated;
  }

  deactivate(id: string): Promise<PricingPlan> {
    return this.updatePlan(id, { isActive: false });
  }
}
