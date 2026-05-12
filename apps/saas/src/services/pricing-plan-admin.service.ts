import { PricingPlan } from '@common/entities/pricing-plan.entity';
import { Injectable } from '@nestjs/common';
import { PricingPlanRepository } from '../repositories/pricing-plan.repository';

@Injectable()
export class PricingPlanAdminService {
  constructor(private readonly planRepository: PricingPlanRepository) {}

  async listPublic(): Promise<Record<string, unknown>[]> {
    return (await this.planRepository.listActive()).map((plan) => this.toResponse(plan));
  }

  async list(query: { isActive?: string; billingPeriod?: string } = {}): Promise<Record<string, unknown>[]> {
    return (await this.planRepository.list(query)).map((plan) => this.toResponse(plan));
  }

  async create(input: Partial<PricingPlan>): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.createPlan(input));
  }

  async update(id: string, input: Partial<PricingPlan>): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.updatePlan(id, input));
  }

  async deactivate(id: string): Promise<Record<string, unknown>> {
    return this.toResponse(await this.planRepository.deactivate(id));
  }

  private toResponse(plan: PricingPlan): Record<string, unknown> {
    return {
      id: plan.id,
      code: plan.code,
      name: plan.name,
      description: plan.description ?? null,
      priceVnd: Number(plan.priceVnd),
      billingPeriod: plan.billingPeriod,
      maxTables: plan.maxTables,
      maxStaff: plan.maxStaff,
      maxOrdersPerDay: plan.maxOrdersPerDay,
      features: plan.features ?? [],
      isActive: plan.isActive,
      displayOrder: plan.displayOrder,
    };
  }
}
