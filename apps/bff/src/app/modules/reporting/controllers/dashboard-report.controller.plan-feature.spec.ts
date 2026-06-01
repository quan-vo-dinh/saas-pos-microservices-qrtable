jest.mock('uuid', () => ({
  v4: jest.fn(() => '00000000-0000-4000-8000-000000000001'),
}));

import { TCP_SERVICES } from '@common/configuration/tcp.config';
import { MetadataKey } from '@common/constants/common.constant';
import { PLAN_FEATURE_CODES, SubscriptionStatus } from '@common/constants/saas.constants';
import { PERMISSION } from '@common/constants/enum/role.enum';
import { RequiresPlanFeature } from '@common/decorators/requires-plan-feature.decorator';
import { BusinessException } from '@common/error-messages/business.exception';
import { PlanFeatureGuard } from '@common/guards/plan-feature.guard';
import { Reflector } from '@nestjs/core';
import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext } from '@nestjs/common';
import { TenantSubscriptionContextGuard } from '../guards/tenant-subscription-context.guard';
import { TenantSubscriptionResolver } from '../services/tenant-subscription-resolver.service';
import { DashboardReportController } from './dashboard-report.controller';

describe('Dashboard report plan feature gating', () => {
  let planFeatureGuard: PlanFeatureGuard;
  let subscriptionResolver: { resolve: jest.Mock };

  const buildContext = (subscription?: { status: string; planCode: string | null; features: string[] }) => {
    const handler = DashboardReportController.prototype.getRevenue;
    RequiresPlanFeature(PLAN_FEATURE_CODES.ANALYTICS_BASIC)(
      handler,
      'getRevenue',
      Object.getOwnPropertyDescriptor(DashboardReportController.prototype, 'getRevenue')!,
    );

    const request = {
      [MetadataKey.TENANT_ID]: 'tenant-1',
      [MetadataKey.USER_DATA]: { metadata: { userId: 'u1', permissions: [PERMISSION.REPORT_READ_OWN] } },
      subscription,
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => handler,
    } as unknown as ExecutionContext;
  };

  beforeEach(async () => {
    subscriptionResolver = { resolve: jest.fn() };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        Reflector,
        PlanFeatureGuard,
        TenantSubscriptionContextGuard,
        { provide: TenantSubscriptionResolver, useValue: subscriptionResolver },
        { provide: TCP_SERVICES.PAYMENT_SERVICE, useValue: { send: jest.fn() } },
        { provide: TCP_SERVICES.ORDER_SERVICE, useValue: { send: jest.fn() } },
        { provide: TCP_SERVICES.CATALOG_SERVICE, useValue: { send: jest.fn() } },
        DashboardReportController,
      ],
    }).compile();

    planFeatureGuard = module.get(PlanFeatureGuard);
  });

  it('blocks when subscription lacks analytics_basic before TCP would run', () => {
    expect(() =>
      planFeatureGuard.canActivate(
        buildContext({
          status: SubscriptionStatus.ACTIVE,
          planCode: 'FREE',
          features: [PLAN_FEATURE_CODES.BASIC_POS],
        }),
      ),
    ).toThrow(BusinessException);
  });

  it('allows when subscription includes analytics_basic', () => {
    expect(
      planFeatureGuard.canActivate(
        buildContext({
          status: SubscriptionStatus.ACTIVE,
          planCode: 'BASIC',
          features: [PLAN_FEATURE_CODES.ANALYTICS_BASIC],
        }),
      ),
    ).toBe(true);
  });
});
