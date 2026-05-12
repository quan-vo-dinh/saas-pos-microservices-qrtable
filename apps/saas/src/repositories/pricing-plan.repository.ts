import { normalizePlanCode } from '@common/constants/saas.constants';
import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Injectable } from '@nestjs/common';
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
}
