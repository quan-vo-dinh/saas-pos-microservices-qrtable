import { PlanFeatureCode } from '@common/constants/saas.constants';
import { Reflector } from '@nestjs/core';

export const RequiresPlanFeature = Reflector.createDecorator<PlanFeatureCode>();
