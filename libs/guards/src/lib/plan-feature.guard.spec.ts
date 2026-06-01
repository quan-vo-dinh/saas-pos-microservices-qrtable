import { MetadataKey } from '@common/constants/common.constant';
import { PLAN_FEATURE_CODES, SubscriptionStatus } from '@common/constants/saas.constants';
import { BusinessException } from '@common/error-messages/business.exception';
import { ErrorCode } from '@common/error-messages/error-code.enum';
import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PlanFeatureGuard } from './plan-feature.guard';

describe('PlanFeatureGuard', () => {
  const reflector = new Reflector();
  const guard = new PlanFeatureGuard(reflector);

  const context = (request: Record<string, unknown>): ExecutionContext =>
    ({
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => () => undefined,
    }) as unknown as ExecutionContext;

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('allows routes without required plan feature', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(undefined);
    expect(guard.canActivate(context({}))).toBe(true);
  });

  it('allows when subscription includes analytics_basic', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(PLAN_FEATURE_CODES.ANALYTICS_BASIC);

    expect(
      guard.canActivate(
        context({
          subscription: {
            status: SubscriptionStatus.ACTIVE,
            planCode: 'BASIC',
            features: [PLAN_FEATURE_CODES.ANALYTICS_BASIC],
          },
          [MetadataKey.TENANT_ID]: 'tenant-1',
        }),
      ),
    ).toBe(true);
  });

  it('denies when subscription is missing', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(PLAN_FEATURE_CODES.ANALYTICS_BASIC);

    try {
      guard.canActivate(context({ [MetadataKey.TENANT_ID]: 'tenant-1' }));
      fail('expected BusinessException');
    } catch (error) {
      const ex = error as BusinessException;
      expect(ex.errorCode).toBe(ErrorCode.SAAS_PLAN_FEATURE_REQUIRED);
      expect(ex.getResponse()).toMatchObject({
        details: {
          requiredFeature: PLAN_FEATURE_CODES.ANALYTICS_BASIC,
          currentPlanCode: null,
          upgradeUrl: '/dashboard/subscription',
        },
      });
    }
  });

  it('denies when feature is not in plan', () => {
    jest.spyOn(reflector, 'get').mockReturnValue(PLAN_FEATURE_CODES.ANALYTICS_ADVANCED);

    expect(() =>
      guard.canActivate(
        context({
          subscription: {
            status: SubscriptionStatus.ACTIVE,
            planCode: 'BASIC',
            features: [PLAN_FEATURE_CODES.ANALYTICS_BASIC],
          },
        }),
      ),
    ).toThrow(BusinessException);
  });
});
